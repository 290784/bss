import { createHmac } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Sql } from "@/server/db";

const ref = vi.hoisted(() => ({ sql: null as unknown as Sql, depois: [] as Promise<unknown>[] }));
vi.mock("@/server/db", async (original) => ({ ...(await original<typeof import("@/server/db")>()), getSql: () => ref.sql }));
vi.mock("next/server", async (original) => ({ ...(await original<typeof import("next/server")>()), after: (fn: () => unknown) => { ref.depois.push(Promise.resolve(fn())); } }));

import * as webhook from "@/app/api/whatsapp/webhook/route";
import { asTenant, createOrg, freshDatabase, futureDate } from "../support/db";
import { createAppointment } from "@/server/modules/appointments";
import { dispatchDueMessages, type OutgoingMessage } from "@/server/modules/messaging";
import { isPlatformAdmin } from "@/server/admin";
import { connectWhatsApp, disconnectWhatsApp, loadConnection, requestWhatsApp } from "@/server/modules/whatsapp-connection";
import { decryptSecret, encryptSecret } from "@/server/secrets";
import { DomainError } from "@/server/errors";

/**
 * Cada estabelecimento conecta o próprio WhatsApp: guarda o token criptografado, envia pelo número dele e recebe
 * as respostas só nele. A API da Meta é simulada.
 */

let A: Awaited<ReturnType<typeof createOrg>>, B: Awaited<ReturnType<typeof createOrg>>;
let n = 0;
const KEY = "chave-de-teste-bem-longa-123456";
const chamadas: { url: string; method: string; auth: string | null; body: Record<string, unknown> | null }[] = [];

/** Meta de mentira: números/tokens válidos em `validos` (id → token); modelos novos entram como PENDING. */
function stubMeta(validos: Record<string, string>, jaExistem: string[] = []) {
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit = {}) => {
    const headers = (init.headers ?? {}) as Record<string, string>;
    const auth = headers.authorization ?? null;
    const body = init.body ? JSON.parse(String(init.body)) : null;
    chamadas.push({ url, method: init.method ?? "GET", auth, body });
    const id = /graph\.facebook\.com\/v[\d.]+\/(\d+)/.exec(url)?.[1] ?? "";
    const token = auth?.replace("Bearer ", "");
    // Modelos são criados na conta (WABA), que não tem o mesmo id do número: vale qualquer token conhecido.
    const ok = url.endsWith("/message_templates") ? Object.values(validos).includes(token ?? "") : validos[id] === token;
    if (!ok) return { ok: false, status: 401, json: async () => ({ error: { message: "Invalid OAuth access token" } }) };
    if (url.endsWith("/message_templates"))
      return jaExistem.includes(body.name) ? { ok: false, status: 400, json: async () => ({ error: { error_subcode: 2388023 } }) } : { ok: true, status: 200, json: async () => ({ status: "PENDING" }) };
    if (url.endsWith("/messages")) return { ok: true, status: 200, json: async () => ({ messages: [{ id: `wamid.${chamadas.length}` }] }) };
    return { ok: true, status: 200, json: async () => ({ display_phone_number: "+55 11 90000-0001", verified_name: "Studio de Teste" }) };
  }));
}

async function horario(org: typeof A, phone: string, dias: number) {
  n++;
  const [c] = await ref.sql<{ id: string }[]>`insert into app.clients (organization_id, full_name, phone, phone_normalized) values (${org.orgId}, ${`Cli${n} Teste`}, ${phone}, ${phone}) returning id`;
  const a = await asTenant(ref.sql, org.ownerId, org.orgId, (tx) => createAppointment(tx, { userId: org.ownerId, organizationId: org.orgId }, {
    professionalId: org.professionalId, clientId: c!.id, serviceIds: [org.serviceId], date: futureDate(dias), time: "10:00", squeezeIn: false, status: "confirmed" }));
  await ref.sql`update app.message_jobs set scheduled_for = now() where appointment_id = ${a.id}`;
  return a.id;
}

beforeAll(async () => {
  ref.sql = await freshDatabase();
  A = await createOrg(ref.sql, "Studio A");
  B = await createOrg(ref.sql, "Studio B");
});
afterAll(async () => { await Promise.allSettled(ref.depois.splice(0)); await ref.sql.end(); });
beforeEach(() => { chamadas.length = 0; vi.stubEnv("WHATSAPP_ENCRYPTION_KEY", KEY); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("segredos criptografados", () => {
  it("ida e volta; cada cifra é diferente; adulterar ou trocar a chave falha", () => {
    vi.stubEnv("WHATSAPP_ENCRYPTION_KEY", KEY);
    const a = encryptSecret("token-secreto"), b = encryptSecret("token-secreto");
    expect(a).not.toContain("token-secreto");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe("token-secreto");
    expect(() => decryptSecret(a.slice(0, -4) + "AAAA")).toThrow();
    vi.stubEnv("WHATSAPP_ENCRYPTION_KEY", "outra-chave-bem-longa-9999999");
    expect(() => decryptSecret(a)).toThrow();
  });
  it("sem chave configurada não guarda nada", () => {
    vi.stubEnv("WHATSAPP_ENCRYPTION_KEY", "");
    expect(() => encryptSecret("x")).toThrow(/WHATSAPP_ENCRYPTION_KEY/);
  });
});

describe("conectar o WhatsApp do estabelecimento", () => {
  it("confere com a Meta, guarda o token cifrado e cria os 3 modelos", async () => {
    stubMeta({ "1001": "token-a-bem-longo-123456" });
    const r = await connectWhatsApp(ref.sql, A.orgId, { phoneNumberId: "1001", wabaId: "5001", token: "token-a-bem-longo-123456" });
    expect(r).toMatchObject({ displayPhone: "+55 11 90000-0001", verifiedName: "Studio de Teste" });
    expect(r.templates).toEqual({ ge_confirmacao: "PENDING", ge_lembrete: "PENDING", ge_cancelamento: "PENDING" });
    const [row] = await ref.sql`select token_enc, phone_number_id from app.whatsapp_connections where organization_id = ${A.orgId}`;
    expect(row!.token_enc).not.toContain("token-a-bem-longo");
    expect((await loadConnection(ref.sql, A.orgId))!.token).toBe("token-a-bem-longo-123456");
    const modelos = chamadas.filter((c) => c.url.endsWith("/5001/message_templates")).map((c) => c.body as { name: string; category: string; language: string });
    expect(modelos.map((m) => m.name).sort()).toEqual(["ge_cancelamento", "ge_confirmacao", "ge_lembrete"]);
    expect(modelos.every((m) => m.category === "UTILITY" && m.language === "pt_BR")).toBe(true);
  });

  it("modelo que já existe na conta não é erro", async () => {
    stubMeta({ "1002": "token-tt-bem-longo-123456" }, ["ge_lembrete"]);
    const r = await connectWhatsApp(ref.sql, B.orgId, { phoneNumberId: "1002", wabaId: "5002", token: "token-tt-bem-longo-123456" });
    expect(r.templates.ge_lembrete).toBe("EXISTS");
    await disconnectWhatsApp(ref.sql, B.orgId);
    expect(await loadConnection(ref.sql, B.orgId)).toBeNull();
  });

  it("token ou número que a Meta recusa: mensagem clara e nada é guardado", async () => {
    stubMeta({ "1003": "certo" });
    await expect(connectWhatsApp(ref.sql, B.orgId, { phoneNumberId: "1003", token: "errado-errado-errado-errado" })).rejects.toThrow(/Invalid OAuth/);
    await expect(connectWhatsApp(ref.sql, B.orgId, { phoneNumberId: "1003", token: "errado-errado-errado-errado" })).rejects.toBeInstanceOf(DomainError);
    expect(await loadConnection(ref.sql, B.orgId)).toBeNull();
  });

  it("o mesmo número não pode estar em dois estabelecimentos", async () => {
    stubMeta({ "1001": "token-a-bem-longo-123456" });
    await expect(connectWhatsApp(ref.sql, B.orgId, { phoneNumberId: "1001", token: "token-a-bem-longo-123456" })).rejects.toThrow(/outro estabelecimento/);
  });

  it("sem chave de criptografia no servidor, recusa com aviso", async () => {
    vi.stubEnv("WHATSAPP_ENCRYPTION_KEY", "");
    await expect(connectWhatsApp(ref.sql, B.orgId, { phoneNumberId: "1009", token: "x".repeat(30) })).rejects.toThrow(/habilitada/);
  });

  it("o papel do aplicativo vê o número mas nunca o token", async () => {
    const visivel = await asTenant(ref.sql, A.ownerId, A.orgId, (tx) => tx`select display_phone, verify_token from app.whatsapp_connections`);
    expect(visivel).toHaveLength(1);
    await expect(asTenant(ref.sql, A.ownerId, A.orgId, (tx) => tx`select token_enc from app.whatsapp_connections`)).rejects.toThrow(/permission denied/);
    // e um estabelecimento não enxerga a conexão do outro
    await expect(asTenant(ref.sql, B.ownerId, B.orgId, (tx) => tx`select display_phone from app.whatsapp_connections`)).resolves.toHaveLength(0);
  });
});

describe("pedido de conexão e acesso da equipe da Gê", () => {
  it("o salão pede com um toque; pedir de novo só atualiza; um salão não vê o pedido do outro", async () => {
    const C = await createOrg(ref.sql, "Studio Pedido");
    await asTenant(ref.sql, C.ownerId, C.orgId, (tx) => requestWhatsApp(tx, C.orgId, C.ownerId, "(11) 91111-2222"));
    await asTenant(ref.sql, C.ownerId, C.orgId, (tx) => requestWhatsApp(tx, C.orgId, C.ownerId, "(11) 93333-4444"));
    const meu = await asTenant(ref.sql, C.ownerId, C.orgId, (tx) => tx`select phone from app.whatsapp_requests`);
    expect(meu).toEqual([{ phone: "(11) 93333-4444" }]);
    expect(await asTenant(ref.sql, A.ownerId, A.orgId, (tx) => tx`select phone from app.whatsapp_requests`)).toHaveLength(0);
    // não dá para pedir em nome de outro estabelecimento
    await expect(asTenant(ref.sql, A.ownerId, A.orgId, (tx) => requestWhatsApp(tx, C.orgId, A.ownerId, "1"))).rejects.toThrow();
  });

  it("quando a equipe conecta, o pedido some", async () => {
    const C = (await ref.sql<{ id: string }[]>`select organization_id as id from app.whatsapp_requests limit 1`)[0]!;
    stubMeta({ "1500": "token-c-bem-longo-123456" });
    await connectWhatsApp(ref.sql, C.id, { phoneNumberId: "1500", token: "token-c-bem-longo-123456" });
    expect(await ref.sql`select 1 from app.whatsapp_requests where organization_id = ${C.id}`).toHaveLength(0);
  });

  it("só e-mails de PLATFORM_ADMIN_EMAILS são equipe (sem a variável, ninguém)", () => {
    expect(isPlatformAdmin("a@x.com", {})).toBe(false);
    expect(isPlatformAdmin("a@x.com", { PLATFORM_ADMIN_EMAILS: "" })).toBe(false);
    expect(isPlatformAdmin(" A@X.com ", { PLATFORM_ADMIN_EMAILS: "b@x.com, a@x.com" })).toBe(true);
    expect(isPlatformAdmin("c@x.com", { PLATFORM_ADMIN_EMAILS: "b@x.com, a@x.com" })).toBe(false);
  });
});

describe("envio pelo número de cada estabelecimento", () => {
  it("cada um sai pelo próprio número e token; sem conexão própria e sem número da plataforma, não envia", async () => {
    stubMeta({ "1001": "token-a-bem-longo-123456", "1002": "token-b-bem-longo-123456" });
    await connectWhatsApp(ref.sql, B.orgId, { phoneNumberId: "1002", token: "token-b-bem-longo-123456" });
    const C = await createOrg(ref.sql, "Studio C");
    const [ja, jb, jc] = [await horario(A, "5511911110001", 50), await horario(B, "5511911110002", 50), await horario(C, "5511911110003", 50)];
    chamadas.length = 0;
    const r = await dispatchDueMessages(ref.sql, []);
    const envios = chamadas.filter((c) => c.url.endsWith("/messages"));
    expect(envios.find((e) => e.body?.to === "5511911110001")).toMatchObject({ url: expect.stringContaining("/1001/messages"), auth: "Bearer token-a-bem-longo-123456" });
    expect(envios.find((e) => e.body?.to === "5511911110002")).toMatchObject({ url: expect.stringContaining("/1002/messages"), auth: "Bearer token-b-bem-longo-123456" });
    expect(envios.some((e) => e.body?.to === "5511911110003")).toBe(false);
    const status = async (id: string) => (await ref.sql`select status, last_error from app.message_jobs where appointment_id = ${id} and template = 'appointment_confirmation'`)[0]!;
    expect(await status(ja)).toMatchObject({ status: "sent" });
    expect(await status(jb)).toMatchObject({ status: "sent" });
    expect(await status(jc)).toMatchObject({ status: "skipped", last_error: "Canal não conectado" });
    expect(r.sent).toBeGreaterThanOrEqual(2);
  });

  it("estabelecimento sem conexão própria usa o número da plataforma, se houver", async () => {
    const D = await createOrg(ref.sql, "Studio D");
    const id = await horario(D, "5511911110004", 51);
    const usados: OutgoingMessage[] = [];
    await dispatchDueMessages(ref.sql, [{ channel: "whatsapp", send: async (m) => { usados.push(m); return { providerMessageId: "plat" }; } }]);
    expect(usados.some((m) => m.to === "5511911110004")).toBe(true);
    expect((await ref.sql`select status from app.message_jobs where appointment_id = ${id} and template = 'appointment_confirmation'`)[0]).toMatchObject({ status: "sent" });
  });

  it("conexão ilegível (chave trocada) falha só daquele estabelecimento e tenta de novo depois", async () => {
    stubMeta({ "1001": "token-a-bem-longo-123456" });
    const id = await horario(A, "5511911110005", 52);
    vi.stubEnv("WHATSAPP_ENCRYPTION_KEY", "chave-trocada-bem-longa-0000000");
    await dispatchDueMessages(ref.sql, []);
    const [job] = await ref.sql`select status, last_error, attempts from app.message_jobs where appointment_id = ${id} and template = 'appointment_confirmation'`;
    expect(job).toMatchObject({ status: "pending", attempts: 1 });
    expect(job!.last_error).toMatch(/WhatsApp deste estabelecimento/);
  });
});

describe("webhook: respostas chegam só no estabelecimento do número", () => {
  const SEG_PLAT = "segredo-da-plataforma";
  const assina = (raw: string, segredo: string) => "sha256=" + createHmac("sha256", segredo).update(raw).digest("hex");
  const entrega = (phoneId: string, from: string, id: string, text: string) => ({ entry: [{ changes: [{ value: { metadata: { phone_number_id: phoneId }, messages: [{ id, from, type: "text", text: { body: text } }] } }] }] });
  const post = (corpo: unknown, segredo: string) => {
    const raw = JSON.stringify(corpo);
    return webhook.POST(new Request("http://localhost/api/whatsapp/webhook", { method: "POST", headers: { "x-hub-signature-256": assina(raw, segredo) }, body: raw }));
  };
  let ids: { a: string; b: string };
  const MESMA = "5511966660001";

  beforeAll(async () => {
    // A mesma cliente (mesmo celular) tem horário nos dois estabelecimentos; as conversas abrem pelo lembrete.
    vi.stubEnv("WHATSAPP_ENCRYPTION_KEY", KEY);
    await disconnectWhatsApp(ref.sql, A.orgId); await disconnectWhatsApp(ref.sql, B.orgId);
    ids = { a: await horario(A, MESMA, 60), b: await horario(B, MESMA, 60) };
    await ref.sql`update app.message_jobs set status = 'pending', scheduled_for = now() where appointment_id in ${ref.sql([ids.a, ids.b])} and template = 'appointment_reminder'`;
    const sends: OutgoingMessage[] = [];
    await dispatchDueMessages(ref.sql, [{ channel: "whatsapp", send: async (m) => { sends.push(m); return { providerMessageId: `p${sends.length}` }; } }]);
    vi.unstubAllEnvs();
  });
  beforeEach(() => { vi.stubEnv("WHATSAPP_APP_SECRET", SEG_PLAT); vi.stubEnv("WHATSAPP_VERIFY_TOKEN", "verif-plat"); });

  it("a conversa certa recebe a resposta, e a do outro estabelecimento não muda", async () => {
    stubMeta({ "1001": "token-a-bem-longo-123456", "1002": "token-b-bem-longo-123456" });
    await connectWhatsApp(ref.sql, A.orgId, { phoneNumberId: "1001", token: "token-a-bem-longo-123456", appSecret: "segredo-do-app-a" });
    await connectWhatsApp(ref.sql, B.orgId, { phoneNumberId: "1002", token: "token-b-bem-longo-123456" });
    const threads = await ref.sql`select organization_id, stage from app.whatsapp_threads where appointment_id in ${ref.sql([ids.a, ids.b])}`;
    expect(threads).toHaveLength(2);
    const r = await post(entrega("1002", MESMA, "wamid.b1", "Confirmo"), SEG_PLAT); // B usa o app da plataforma
    expect(r.status).toBe(200);
    const [tb] = await ref.sql`select stage from app.whatsapp_threads where appointment_id = ${ids.b}`;
    const [ta] = await ref.sql`select stage from app.whatsapp_threads where appointment_id = ${ids.a}`;
    expect(tb!.stage).not.toBe("awaiting_confirmation");
    expect(ta!.stage).toBe("awaiting_confirmation");
  });

  it("o número com app próprio exige a assinatura do segredo dele (a da plataforma não vale, nem o contrário)", async () => {
    const corpo = entrega("1001", MESMA, "wamid.a1", "Confirmo");
    expect((await post(corpo, SEG_PLAT)).status).toBe(401);
    expect((await post(corpo, "segredo-do-app-a")).status).toBe(200);
    // segredo do estabelecimento A não autoriza falar pelo número do B
    expect((await post(entrega("1002", MESMA, "wamid.b2", "Confirmo"), "segredo-do-app-a")).status).toBe(401);
  });

  it("a verificação do endereço aceita o texto da plataforma ou o de qualquer estabelecimento, e só esses", async () => {
    const { verify_token } = (await ref.sql<{ verify_token: string }[]>`select verify_token from app.whatsapp_connections where organization_id = ${A.orgId}`)[0]!;
    const v = (t: string) => webhook.GET(new Request(`http://localhost/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${t}&hub.challenge=ok123`));
    expect((await v(verify_token)).status).toBe(200);
    expect(await (await v("verif-plat")).text()).toBe("ok123");
    expect((await v("qualquer-coisa")).status).toBe(403);
    expect((await v("")).status).toBe(403);
  });

  it("recibo de entrega (sem mensagens) do número com app próprio também é aceito", async () => {
    const corpo = { entry: [{ changes: [{ value: { metadata: { phone_number_id: "1001" }, statuses: [{ id: "x", status: "delivered" }] } }] }] };
    expect((await post(corpo, "segredo-do-app-a")).status).toBe(200);
    expect((await post(corpo, "segredo-errado")).status).toBe(401);
  });
});
