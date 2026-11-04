import { createHmac } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Sql } from "@/server/db";

// A rota usa getSql() (banco do app) e after() (rodar depois da resposta). Aqui: o banco de teste e um "after" que podemos esperar.
const ref = vi.hoisted(() => ({ sql: null as unknown as Sql, depois: [] as Promise<unknown>[] }));
vi.mock("@/server/db", async (original) => ({ ...(await original<typeof import("@/server/db")>()), getSql: () => ref.sql }));
vi.mock("next/server", async (original) => ({ ...(await original<typeof import("next/server")>()), after: (fn: () => unknown) => { ref.depois.push(Promise.resolve(fn())); } }));

import * as cron from "@/app/api/cron/mensagens/route";
import * as webhook from "@/app/api/whatsapp/webhook/route";
import { asTenant, createOrg, freshDatabase, futureDate } from "../support/db";
import { createAppointment } from "@/server/modules/appointments";
import { dispatchDueMessages, type OutgoingMessage } from "@/server/modules/messaging";
import { dispatchSoon } from "@/server/dispatch-soon";

/**
 * Os dois pontos de entrada das automações: a rotina que despacha a fila (cron) e o webhook por onde o WhatsApp
 * entrega as respostas. Cobre segurança (segredo/assinatura), o que cada rota faz e o caminho completo
 * resposta da cliente → conversa → mensagem de volta pela API da Meta (simulada).
 */

let A: Awaited<ReturnType<typeof createOrg>>;
const SEGREDO_CRON = "cron-segredo-bem-longo-123";
const APP_SECRET = "app-secret-da-meta";
const VERIFY = "token-de-verificacao";
const META = { WHATSAPP_TOKEN: "tok", WHATSAPP_PHONE_NUMBER_ID: "999", WHATSAPP_APP_SECRET: APP_SECRET, WHATSAPP_VERIFY_TOKEN: VERIFY } as const;

const esperarDepois = async () => { await Promise.all(ref.depois.splice(0)); };
const assina = (raw: string, segredo = APP_SECRET) => "sha256=" + createHmac("sha256", segredo).update(raw).digest("hex");
const post = (corpo: unknown, opts: { assinatura?: string | null; bruto?: string } = {}) => {
  const raw = opts.bruto ?? JSON.stringify(corpo);
  const headers: Record<string, string> = {};
  const sig = opts.assinatura === undefined ? assina(raw) : opts.assinatura;
  if (sig) headers["x-hub-signature-256"] = sig;
  return webhook.POST(new Request("http://localhost/api/whatsapp/webhook", { method: "POST", headers, body: raw }));
};
const entrega = (from: string, id: string, text: string) => ({ entry: [{ changes: [{ value: { messages: [{ id, from, type: "text", text: { body: text } }] } }] }] });

/** API da Meta de mentira: guarda cada chamada de envio. */
const chamadas: { to: string; body: Record<string, unknown> }[] = [];
function stubMeta() {
  vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    chamadas.push({ to: body.to, body });
    return { ok: true, status: 200, json: async () => ({ messages: [{ id: `wamid.meta${chamadas.length}` }] }) };
  }));
}
function ligarMeta() { for (const [k, v] of Object.entries(META)) vi.stubEnv(k, v); }

let n = 0;
/** Marca um horário e abre a conversa (lembrete enviado por um provedor de mentira, sem passar pela Meta). */
async function conversaAberta() {
  n++;
  const phone = `5511955${String(200000 + n)}`;
  const [c] = await ref.sql<{ id: string }[]>`insert into app.clients (organization_id, full_name, phone, phone_normalized) values (${A.orgId}, ${`Rota${n}k Teste`}, ${phone}, ${phone}) returning id`;
  const a = await asTenant(ref.sql, A.ownerId, A.orgId, (tx) => createAppointment(tx, { userId: A.ownerId, organizationId: A.orgId }, {
    professionalId: A.professionalId, clientId: c!.id, serviceIds: [A.serviceId], date: futureDate(40 + n), time: "10:00", squeezeIn: false, status: "confirmed" }));
  await ref.sql`update app.message_jobs set scheduled_for = now() where appointment_id = ${a.id}`;
  const lixo: OutgoingMessage[] = [];
  await dispatchDueMessages(ref.sql, [{ channel: "whatsapp", send: async (m) => { lixo.push(m); return { providerMessageId: "x" }; } }]);
  return { phone, apptId: a.id, first: `Rota${n}k` };
}

beforeAll(async () => {
  ref.sql = await freshDatabase();
  A = await createOrg(ref.sql, "Studio Rotas");
});
afterAll(() => ref.sql.end());
beforeEach(() => { chamadas.length = 0; });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("rotina de envio (/api/cron/mensagens)", () => {
  const chama = (autorizacao?: string) => cron.GET(new Request("http://localhost/api/cron/mensagens", { headers: autorizacao ? { authorization: autorizacao } : {} }));

  it("só responde a GET (nenhum outro método fica exposto)", () => {
    expect(Object.keys(cron).filter((k) => ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(k))).toEqual(["GET"]);
  });

  it("sem segredo configurado no servidor, ninguém entra (nem com cabeçalho vazio)", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await chama()).status).toBe(401);
    expect((await chama("Bearer ")).status).toBe(401);
    expect((await chama("Bearer qualquer")).status).toBe(401);
  });

  it("recusa sem cabeçalho, com segredo errado do mesmo tamanho e com segredo de tamanho diferente", async () => {
    vi.stubEnv("CRON_SECRET", SEGREDO_CRON);
    expect((await chama()).status).toBe(401);
    expect((await chama("Bearer " + "x".repeat(SEGREDO_CRON.length))).status).toBe(401);
    expect((await chama("Bearer curto")).status).toBe(401);
    expect((await chama(SEGREDO_CRON)).status).toBe(200); // o prefixo "Bearer " é opcional; o segredo é o que vale
  });

  it("com o segredo certo, despacha a fila; sem WhatsApp conectado marca “canal não conectado” (nunca “enviado”)", async () => {
    vi.stubEnv("CRON_SECRET", SEGREDO_CRON);
    for (const k of Object.keys(META)) vi.stubEnv(k, "");
    const c = await conversaAberta(); // o lembrete já saiu; agora um horário novo com confirmação pendente
    await ref.sql`update app.message_jobs set status = 'pending', scheduled_for = now() - interval '1 minute' where appointment_id = ${c.apptId} and template = 'appointment_confirmation'`;
    const r = await chama("Bearer " + SEGREDO_CRON);
    expect(r.status).toBe(200);
    const corpo = await r.json();
    expect(corpo).toMatchObject({ sent: 0, failed: 0 });
    expect(corpo.skipped).toBeGreaterThanOrEqual(1);
    const [job] = await ref.sql`select status, last_error from app.message_jobs where appointment_id = ${c.apptId} and template = 'appointment_confirmation'`;
    expect(job).toMatchObject({ status: "skipped", last_error: "Canal não conectado" });
  });

  it("com WhatsApp conectado, envia pela API da Meta e responde com o resumo", async () => {
    vi.stubEnv("CRON_SECRET", SEGREDO_CRON); ligarMeta(); stubMeta();
    const c = await conversaAberta();
    await ref.sql`update app.message_jobs set status = 'pending', scheduled_for = now() - interval '1 minute', attempts = 0 where appointment_id = ${c.apptId} and template = 'appointment_confirmation'`;
    const corpo = await (await chama("Bearer " + SEGREDO_CRON)).json();
    expect(corpo.sent).toBeGreaterThanOrEqual(1);
    expect(chamadas.some((x) => x.to === c.phone && (x.body.template as { name: string })?.name === "ge_confirmacao")).toBe(true);
  });
});

describe("webhook do WhatsApp — verificação do endereço (GET)", () => {
  const verifica = (q: string) => webhook.GET(new Request("http://localhost/api/whatsapp/webhook?" + q));

  it("devolve o desafio da Meta só com o modo e o token certos", async () => {
    vi.stubEnv("WHATSAPP_VERIFY_TOKEN", VERIFY);
    const ok = await verifica(`hub.mode=subscribe&hub.verify_token=${VERIFY}&hub.challenge=12345`);
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe("12345");
  });
  it("recusa token errado, modo errado e ausência de token (403)", async () => {
    vi.stubEnv("WHATSAPP_VERIFY_TOKEN", VERIFY);
    expect((await verifica(`hub.mode=subscribe&hub.verify_token=outro&hub.challenge=1`)).status).toBe(403);
    expect((await verifica(`hub.mode=subscribe&hub.verify_token=${"x".repeat(VERIFY.length)}&hub.challenge=1`)).status).toBe(403);
    expect((await verifica(`hub.mode=unsubscribe&hub.verify_token=${VERIFY}&hub.challenge=1`)).status).toBe(403);
    expect((await verifica(`hub.challenge=1`)).status).toBe(403);
  });
  it("sem token configurado no servidor, nunca verifica (mesmo com token vazio no pedido)", async () => {
    vi.stubEnv("WHATSAPP_VERIFY_TOKEN", "");
    expect((await verifica(`hub.mode=subscribe&hub.verify_token=&hub.challenge=1`)).status).toBe(403);
  });
});

describe("webhook do WhatsApp — mensagens recebidas (POST)", () => {
  it("recusa mensagem sem assinatura, com assinatura de outro segredo ou sem segredo configurado (401)", async () => {
    ligarMeta();
    const corpo = entrega("5511900000000", "w1", "oi");
    expect((await post(corpo, { assinatura: null })).status).toBe(401);
    expect((await post(corpo, { assinatura: assina(JSON.stringify(corpo), "segredo-errado") })).status).toBe(401);
    expect((await post(corpo, { assinatura: "sha256=" })).status).toBe(401);
    vi.stubEnv("WHATSAPP_APP_SECRET", "");
    expect((await post(corpo)).status).toBe(401);
  });

  it("assinatura de um corpo diferente não vale (corpo adulterado)", async () => {
    ligarMeta();
    const original = JSON.stringify(entrega("5511900000000", "w2", "Confirmo"));
    const adulterado = JSON.stringify(entrega("5511900000000", "w2", "Cancelar tudo"));
    expect((await post(null, { bruto: adulterado, assinatura: assina(original) })).status).toBe(401);
  });

  it("assinatura certa com corpo que não é JSON: 400", async () => {
    ligarMeta();
    const bruto = "isto não é json";
    expect((await post(null, { bruto, assinatura: assina(bruto) })).status).toBe(400);
  });

  it("avisos de status e formatos estranhos (sem mensagens) respondem 200 e não fazem nada", async () => {
    ligarMeta(); stubMeta();
    expect((await post({ entry: [{ changes: [{ value: { statuses: [{ id: "x", status: "delivered" }] } }] }] })).status).toBe(200);
    expect((await post({ entry: "texto" })).status).toBe(200);
    expect((await post({})).status).toBe(200);
    expect((await post([])).status).toBe(200);
    await esperarDepois();
    expect(chamadas).toHaveLength(0);
  });

  it("resposta de quem não tem conversa aberta: 200, fica registrada e ninguém recebe nada", async () => {
    ligarMeta(); stubMeta();
    expect((await post(entrega("5521911110000", "wamid.sem-conversa", "oi"))).status).toBe(200);
    await esperarDepois();
    const [row] = await ref.sql`select outcome from app.whatsapp_inbound where provider_message_id = 'wamid.sem-conversa'`;
    expect(row).toMatchObject({ outcome: "no_thread" });
    expect(chamadas).toHaveLength(0);
  });

  it("caminho completo: “Confirmo” da cliente → confirma presença, equipe avisada, oferta enviada pela API da Meta com botões", async () => {
    ligarMeta(); stubMeta();
    // Serviço extra possível: outro serviço da mesma categoria que a profissional faz.
    const [cat] = await ref.sql<{ id: string }[]>`insert into app.service_categories (organization_id, name) values (${A.orgId}, 'Cat Rotas') returning id`;
    await ref.sql`update app.services set category_id = ${cat!.id} where id = ${A.serviceId}`;
    const [extra] = await ref.sql<{ id: string }[]>`insert into app.services (organization_id, name, price_cents, duration_minutes, category_id) values (${A.orgId}, 'Hidratação de mãos', 3000, 20, ${cat!.id}) returning id`;
    await ref.sql`insert into app.professional_services (organization_id, professional_id, service_id) values (${A.orgId}, ${A.professionalId}, ${extra!.id})`;

    const c = await conversaAberta();
    const r = await post(entrega(c.phone, `wamid.${c.apptId}`, "Confirmo"));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
    await esperarDepois();

    const [ag] = await ref.sql`select client_confirmed_at from app.appointments where id = ${c.apptId}`;
    expect(ag!.client_confirmed_at).toBeInstanceOf(Date);
    const resposta = chamadas.find((x) => x.to === c.phone);
    expect(resposta, "a resposta automática não foi enviada pela API").toBeDefined();
    expect(resposta!.body.type).toBe("interactive");
    const botoes = (resposta!.body as { interactive: { body: { text: string }; action: { buttons: { reply: { id: string } }[] } } }).interactive;
    expect(botoes.action.buttons.map((b) => b.reply.id)).toEqual(["offer_yes", "offer_no"]);
    expect(botoes.body.text).toMatch(/hidratação de mãos/i);
    const [job] = await ref.sql`select status from app.message_jobs where appointment_id = ${c.apptId} and template = 'upsell_offer'`;
    expect(job!.status).toBe("sent");

    // “Quero sim” (botão): o extra entra no atendimento e a confirmação final sai pela API.
    chamadas.length = 0;
    const sim = { entry: [{ changes: [{ value: { messages: [{ id: `wamid.sim.${c.apptId}`, from: c.phone, type: "interactive", interactive: { button_reply: { id: "offer_yes", title: "Quero sim" } } }] } }] }] };
    expect((await post(sim)).status).toBe(200);
    await esperarDepois();
    expect((await ref.sql`select count(*)::int as n from app.appointment_services where appointment_id = ${c.apptId}`)[0]!.n).toBe(2);
    const final = chamadas.find((x) => x.to === c.phone);
    expect((final!.body as { text: { body: string } }).text.body).toMatch(/^Prontinho!/);
  });

  it("a mesma entrega repetida pela Meta é processada uma vez só", async () => {
    ligarMeta(); stubMeta();
    const c = await conversaAberta();
    await ref.sql`update app.services set offer_as_extra = false where organization_id = ${A.orgId}`;
    const corpo = entrega(c.phone, `wamid.dup.${c.apptId}`, "Confirmo");
    await Promise.all([post(corpo), post(corpo), post(corpo)]);
    await esperarDepois();
    await ref.sql`update app.services set offer_as_extra = true where organization_id = ${A.orgId}`;
    expect(chamadas.filter((x) => x.to === c.phone)).toHaveLength(1);
    expect((await ref.sql`select count(*)::int as n from app.appointment_events where appointment_id = ${c.apptId} and type = 'client_confirmed'`)[0]!.n).toBe(1);
  });

  it("quando a Meta recusa o envio da resposta, a mensagem não se perde: fica na fila para nova tentativa", async () => {
    ligarMeta();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503, json: async () => ({ error: { message: "indisponível" } }) })));
    const c = await conversaAberta();
    expect((await post(entrega(c.phone, `wamid.falha.${c.apptId}`, "Preciso remarcar"))).status).toBe(200);
    await esperarDepois();
    const [job] = await ref.sql`select status, attempts, last_error, next_attempt_at from app.message_jobs where appointment_id = ${c.apptId} and template = 'reply_reschedule'`;
    expect(job).toMatchObject({ status: "pending", attempts: 1, last_error: "WhatsApp 503: indisponível" });
    expect(job!.next_attempt_at).toBeInstanceOf(Date);
  });
});

describe("envio imediato ao marcar (dispatchSoon)", () => {
  async function marcarSemDespachar() {
    n++;
    const phone = `5511944${String(300000 + n)}`;
    const [c] = await ref.sql<{ id: string }[]>`insert into app.clients (organization_id, full_name, phone, phone_normalized) values (${A.orgId}, ${`Soon${n}k Teste`}, ${phone}, ${phone}) returning id`;
    const a = await asTenant(ref.sql, A.ownerId, A.orgId, (tx) => createAppointment(tx, { userId: A.ownerId, organizationId: A.orgId }, {
      professionalId: A.professionalId, clientId: c!.id, serviceIds: [A.serviceId], date: futureDate(80 + n), time: "09:00", squeezeIn: false, status: "confirmed" }));
    return { phone, apptId: a.id };
  }

  it("sem WhatsApp conectado não faz nada (a confirmação espera a rotina e fica “não enviada”)", async () => {
    for (const k of Object.keys(META)) vi.stubEnv(k, "");
    const m = await marcarSemDespachar();
    dispatchSoon();
    await esperarDepois();
    expect(ref.depois).toHaveLength(0);
    const [job] = await ref.sql`select status from app.message_jobs where appointment_id = ${m.apptId} and template = 'appointment_confirmation'`;
    expect(job!.status).toBe("pending");
  });

  it("com WhatsApp conectado, a confirmação do horário recém-marcado sai logo, sem esperar a rotina", async () => {
    ligarMeta(); stubMeta();
    const m = await marcarSemDespachar();
    dispatchSoon();
    await esperarDepois();
    const enviada = chamadas.find((x) => x.to === m.phone);
    expect((enviada?.body.template as { name: string } | undefined)?.name).toBe("ge_confirmacao");
    const [job] = await ref.sql`select status from app.message_jobs where appointment_id = ${m.apptId} and template = 'appointment_confirmation'`;
    expect(job!.status).toBe("sent");
  });

  it("falha na entrega imediata não quebra quem marcou o horário (a fila tenta de novo depois)", async () => {
    ligarMeta();
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));
    const m = await marcarSemDespachar();
    dispatchSoon();
    await expect(esperarDepois()).resolves.toBeUndefined();
    const [job] = await ref.sql`select status, last_error from app.message_jobs where appointment_id = ${m.apptId} and template = 'appointment_confirmation'`;
    expect(job).toMatchObject({ status: "pending", last_error: "fetch failed" });
  });
});
