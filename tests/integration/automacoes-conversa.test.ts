import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Sql } from "@/server/db";
import { asTenant, createOrg, freshDatabase, futureDate } from "../support/db";
import { changeStatus, createAppointment } from "@/server/modules/appointments";
import { dispatchDueMessages, type OutgoingMessage } from "@/server/modules/messaging";
import { handleInbound } from "@/server/modules/whatsapp";

/**
 * A conversa automática do WhatsApp nos casos que fogem do caminho feliz: resposta atrasada, cliente com dois horários
 * ou em duas empresas, mensagem repetida pela Meta, resposta depois de cancelar, oferta que não cabe, e quem assume a conversa.
 */

let sql: Sql;
let A: Awaited<ReturnType<typeof createOrg>>;
let B: Awaited<ReturnType<typeof createOrg>>;
let gel = "";
let n = 0;
let day = 30;
const actor = (o: typeof A) => ({ userId: o.ownerId, organizationId: o.orgId });

const sent: OutgoingMessage[] = [];
const fake = [{ channel: "whatsapp" as const, send: async (m: OutgoingMessage) => { sent.push(m); return { providerMessageId: `out.${sent.length}` }; } }];
/** Entrega o que está vencido e devolve só o que foi para esse telefone. */
const flushTo = async (phone: string) => { const before = sent.length; await dispatchDueMessages(sql, fake); return sent.slice(before).filter((m) => m.to === phone); };

async function newClient(o: typeof A, name: string, phone: string) {
  const [c] = await sql<{ id: string }[]>`insert into app.clients (organization_id, full_name, phone, phone_normalized) values (${o.orgId}, ${name}, ${phone}, ${phone}) returning id`;
  return c!.id;
}
/** Cada cena tem nome e telefone próprios (não se misturam com as outras). */
function cena(o = A) {
  n++;
  // Os avisos da equipe usam só o primeiro nome: ele precisa ser único em cada cena (o "k" evita que Cli1k case com Cli10k).
  return { name: `Cli${n}k Cena`, first: `Cli${n}k`, phone: `5511977${String(100000 + n)}`, o };
}
async function agenda(s: ReturnType<typeof cena>, opts: { time?: string; date?: string; services?: string[] } = {}) {
  const clientId = await newClient(s.o, s.name, s.phone);
  const date = opts.date ?? futureDate(day++);
  const a = await asTenant(sql, s.o.ownerId, s.o.orgId, (tx) => createAppointment(tx, actor(s.o), {
    professionalId: s.o.professionalId, clientId, serviceIds: opts.services ?? [s.o.serviceId], date, time: opts.time ?? "10:00", squeezeIn: false, status: "confirmed",
  }));
  return { id: a.id, clientId, date };
}
/** Marca e já dispara o lembrete (como se fosse a véspera às 9h): abre a conversa. */
async function lembrete(s: ReturnType<typeof cena>, opts: { time?: string; date?: string } = {}) {
  const a = await agenda(s, opts);
  await sql`update app.message_jobs set scheduled_for = now() where appointment_id = ${a.id}`;
  await flushTo(s.phone);
  return a;
}
let seq = 0;
const responde = (phone: string, text: string, buttonId?: string, id = `wamid.c${++seq}`) => handleInbound(sql, { providerMessageId: id, from: phone, text, buttonId });
const avisos = (o: typeof A, primeiroNome: string) => sql<{ type: string; title: string }[]>`
  select distinct type, title from app.notifications where organization_id = ${o.orgId} and title like ${"%" + primeiroNome + "%"} order by type`;
const etapa = async (apptId: string) => ((await sql`select stage from app.whatsapp_threads where appointment_id = ${apptId}`)[0] as { stage: string } | undefined)?.stage;
const eventos = async (apptId: string, type: string) => (await sql`select count(*)::int as n from app.appointment_events where appointment_id = ${apptId} and type = ${type}`)[0]!.n as number;

beforeAll(async () => {
  sql = await freshDatabase();
  A = await createOrg(sql, "Studio Conversa");
  B = await createOrg(sql, "Studio Paralelo");
  const [cat] = await sql<{ id: string }[]>`insert into app.service_categories (organization_id, name) values (${A.orgId}, 'Unhas') returning id`;
  await sql`update app.services set category_id = ${cat!.id} where id = ${A.serviceId}`;
  const [g] = await sql<{ id: string }[]>`insert into app.services (organization_id, name, price_cents, duration_minutes, category_id)
    values (${A.orgId}, 'Esmaltação em gel', 2500, 30, ${cat!.id}) returning id`;
  gel = g!.id;
  await sql`insert into app.professional_services (organization_id, professional_id, service_id) values (${A.orgId}, ${A.professionalId}, ${gel})`;
});
afterAll(() => sql.end());

describe("quando a resposta não encontra uma conversa", () => {
  it("resposta depois do horário do atendimento (conversa expirada): ninguém é incomodado nem recebe resposta", async () => {
    const s = cena(); const a = await lembrete(s);
    await sql`update app.whatsapp_threads set expires_at = now() - interval '1 minute' where appointment_id = ${a.id}`;
    expect(await responde(s.phone, "Confirmo")).toBe("no_thread");
    expect(await avisos(A, s.first)).toHaveLength(0);
    expect(await flushTo(s.phone)).toHaveLength(0);
    expect(await etapa(a.id)).toBe("awaiting_confirmation");
  });

  it("número que nunca recebeu lembrete: nada acontece, mas a mensagem fica registrada", async () => {
    expect(await responde("5521988880000", "oi, tudo bem?", undefined, "wamid.desconhecido")).toBe("no_thread");
    const [row] = await sql`select outcome, organization_id from app.whatsapp_inbound where provider_message_id = 'wamid.desconhecido'`;
    expect(row).toMatchObject({ outcome: "no_thread", organization_id: null });
  });
});

describe("mensagem repetida e mensagens ao mesmo tempo", () => {
  it("a Meta reenviou a mesma mensagem 5 vezes ao mesmo tempo: só uma é processada e a equipe é avisada uma vez", async () => {
    const s = cena(); const a = await lembrete(s);
    await sql`update app.services set offer_as_extra = false where id = ${gel}`; // sem oferta: só confirma
    const r = await Promise.all(Array.from({ length: 5 }, () => responde(s.phone, "Confirmo", undefined, `wamid.rep-${a.id}`)));
    await sql`update app.services set offer_as_extra = true where id = ${gel}`;
    expect(r.filter((x) => x === "duplicate")).toHaveLength(4);
    expect(r.filter((x) => x !== "duplicate")).toEqual(["confirmed"]);
    expect(await eventos(a.id, "client_confirmed")).toBe(1);
    expect((await avisos(A, s.first)).filter((x) => x.type === "client_confirmed")).toHaveLength(1);
    expect(await flushTo(s.phone)).toHaveLength(1);
  });

  it("a conversa fica registrada com o resultado e o horário a que se refere", async () => {
    const s = cena(); const a = await lembrete(s);
    await responde(s.phone, "Preciso remarcar", undefined, "wamid.registro");
    const [row] = await sql`select outcome, appointment_id, organization_id, text from app.whatsapp_inbound where provider_message_id = 'wamid.registro'`;
    expect(row).toMatchObject({ outcome: "reschedule", appointment_id: a.id, organization_id: A.orgId, text: "Preciso remarcar" });
  });
});

describe("a profissional assume a conversa", () => {
  it("“Preciso remarcar”: avisa a equipe, responde uma vez e a automação para de falar", async () => {
    const s = cena(); const a = await lembrete(s);
    expect(await responde(s.phone, "Preciso remarcar")).toBe("reschedule");
    expect((await avisos(A, s.first)).map((x) => x.type)).toEqual(["whatsapp_reschedule"]);
    expect((await flushTo(s.phone)).map((m) => m.template)).toEqual(["reply_reschedule"]);
    expect(await etapa(a.id)).toBe("handoff");
    // Depois disso, a profissional conversa sozinha: novas mensagens não geram resposta nem novos avisos.
    expect(await responde(s.phone, "pode ser sexta?")).toBe("ignored");
    expect(await responde(s.phone, "??")).toBe("ignored");
    expect(await flushTo(s.phone)).toHaveLength(0);
    expect((await avisos(A, s.first)).map((x) => x.type)).toEqual(["whatsapp_reschedule"]);
  });

  it("“não” logo no lembrete (sem dizer remarcar): vai para a profissional com uma resposta de “já te respondo”", async () => {
    const s = cena(); const a = await lembrete(s);
    expect(await responde(s.phone, "não")).toBe("handoff");
    expect((await flushTo(s.phone)).map((m) => m.template)).toEqual(["reply_handoff"]);
    expect(await etapa(a.id)).toBe("handoff");
  });

  it("áudio, foto ou figurinha (sem texto): vai para a profissional", async () => {
    const s = cena(); await lembrete(s);
    expect(await responde(s.phone, "")).toBe("handoff");
  });

  it("texto remarcando na hora da oferta também vai para a profissional (e não adiciona nada)", async () => {
    const s = cena(); const a = await lembrete(s);
    expect(await responde(s.phone, "Confirmo")).toBe("offered");
    expect(await responde(s.phone, "melhor remarcar, surgiu um compromisso")).toBe("handoff");
    expect((await sql`select count(*)::int as n from app.appointment_services where appointment_id = ${a.id}`)[0]!.n).toBe(1);
  });
});

describe("depois que a conversa termina", () => {
  it("recusou a oferta e se arrependeu: o “sim” de depois NÃO adiciona nada, só avisa a profissional", async () => {
    const s = cena(); const a = await lembrete(s);
    expect(await responde(s.phone, "Confirmo")).toBe("offered");
    expect(await responde(s.phone, "agora não")).toBe("declined");
    expect(await responde(s.phone, "sim")).toBe("ignored");
    expect((await sql`select count(*)::int as n from app.appointment_services where appointment_id = ${a.id}`)[0]!.n).toBe(1);
    expect((await avisos(A, s.first)).map((x) => x.type)).toContain("whatsapp_handoff");
  });

  it("aceitou o extra e mandou “sim” de novo: o serviço não é adicionado duas vezes", async () => {
    const s = cena(); const a = await lembrete(s);
    await responde(s.phone, "Confirmo");
    expect(await responde(s.phone, "", "offer_yes")).toBe("upsell_added");
    expect(await responde(s.phone, "sim")).toBe("ignored");
    expect(await responde(s.phone, "", "offer_yes")).toBe("ignored");
    expect((await sql`select count(*)::int as n from app.appointment_services where appointment_id = ${a.id}`)[0]!.n).toBe(2);
    expect(await eventos(a.id, "upsell_accepted")).toBe(1);
  });

  it("confirmou uma vez e confirma de novo: o evento de confirmação não se repete", async () => {
    const s = cena(); const a = await lembrete(s);
    await sql`update app.services set offer_as_extra = false where id = ${gel}`;
    await responde(s.phone, "Confirmo");
    await responde(s.phone, "confirmo de novo");
    await sql`update app.services set offer_as_extra = true where id = ${gel}`;
    expect(await eventos(a.id, "client_confirmed")).toBe(1);
  });

  it("já tinha confirmado na agenda (pela profissional): responder “Confirmo” não cria confirmação duplicada", async () => {
    const s = cena(); const a = await lembrete(s);
    await sql`update app.appointments set client_confirmed_at = now() where id = ${a.id}`;
    await sql`update app.services set offer_as_extra = false where id = ${gel}`;
    expect(await responde(s.phone, "Confirmo")).toBe("confirmed");
    await sql`update app.services set offer_as_extra = true where id = ${gel}`;
    expect(await eventos(a.id, "client_confirmed")).toBe(0);
  });
});

describe("o horário mudou depois do lembrete", () => {
  it("cliente responde “Confirmo” a um horário que já foi cancelado: não confirma nada, avisa a profissional", async () => {
    const s = cena(); const a = await lembrete(s);
    await asTenant(sql, A.ownerId, A.orgId, (tx) => changeStatus(tx, actor(A), a.id, "cancelled"));
    expect(await responde(s.phone, "Confirmo")).toBe("handoff");
    const [row] = await sql`select status, client_confirmed_at from app.appointments where id = ${a.id}`;
    expect(row).toMatchObject({ status: "cancelled", client_confirmed_at: null });
    expect(await eventos(a.id, "client_confirmed")).toBe(0);
    expect((await flushTo(s.phone)).some((m) => m.template === "reply_handoff")).toBe(true);
  });

  it("quem já foi atendida e responde tarde: não confirma, avisa a profissional", async () => {
    const s = cena(); const a = await lembrete(s);
    await sql`update app.appointments set status = 'completed' where id = ${a.id}`;
    expect(await responde(s.phone, "ok")).toBe("handoff");
  });
});

describe("a oferta de serviço extra só aparece quando faz sentido", () => {
  it("serviço que a profissional não libera como extra não é oferecido: só confirma", async () => {
    const s = cena(); await lembrete(s);
    await sql`update app.services set offer_as_extra = false where id = ${gel}`;
    expect(await responde(s.phone, "Confirmo")).toBe("confirmed");
    await sql`update app.services set offer_as_extra = true where id = ${gel}`;
    expect((await flushTo(s.phone)).map((m) => m.template)).toEqual(["reply_confirmed"]);
  });

  it("salão desligou a oferta: só confirma", async () => {
    const s = cena(); await lembrete(s);
    await sql`update app.organizations set whatsapp_upsell_enabled = false where id = ${A.orgId}`;
    expect(await responde(s.phone, "Confirmo")).toBe("confirmed");
    await sql`update app.organizations set whatsapp_upsell_enabled = true where id = ${A.orgId}`;
  });

  it("não cabe logo depois (há outro atendimento emendado): não oferece, só confirma", async () => {
    const date = futureDate(day++);
    const s = cena(); await lembrete(s, { date, time: "10:00" });
    // Manicure de 60 min + 15 de preparo: termina 11:15. Outro atendimento às 11:15 fecha a janela do extra.
    const outra = cena(); const id = await newClient(A, outra.name, outra.phone);
    await asTenant(sql, A.ownerId, A.orgId, (tx) => createAppointment(tx, actor(A), {
      professionalId: A.professionalId, clientId: id, serviceIds: [A.serviceId], date, time: "11:15", squeezeIn: false, status: "confirmed" }));
    expect(await responde(s.phone, "Confirmo")).toBe("confirmed");
  });

  it("a oferta leva os botões e o texto pronto; “SIM” soma o valor ao atendimento", async () => {
    const s = cena(); const a = await lembrete(s);
    await responde(s.phone, "Confirmo");
    const oferta = (await flushTo(s.phone)).find((m) => m.template === "upsell_offer")!;
    expect(oferta.buttons?.map((b) => b.id)).toEqual(["offer_yes", "offer_no"]);
    expect(oferta.body).toMatch(/esmaltação em gel/i);
    const [antes] = await sql`select price_cents from app.appointments where id = ${a.id}`;
    await responde(s.phone, "", "offer_yes");
    const [depois] = await sql`select price_cents from app.appointments where id = ${a.id}`;
    expect(depois!.price_cents - antes!.price_cents).toBe(2500);
  });
});

describe("a mesma pessoa em mais de uma conversa", () => {
  it("cliente com dois horários lembrados: a resposta vale para o lembrete mais recente; o outro continua esperando", async () => {
    const s = cena();
    const clientId = await newClient(A, s.name, s.phone);
    const marcar = async (time: string) => (await asTenant(sql, A.ownerId, A.orgId, (tx) => createAppointment(tx, actor(A), {
      professionalId: A.professionalId, clientId, serviceIds: [A.serviceId], date: futureDate(day++), time, squeezeIn: false, status: "confirmed" }))).id;
    const primeiro = await marcar("09:00"); const segundo = await marcar("09:00");
    await sql`update app.message_jobs set scheduled_for = now() where appointment_id = ${primeiro} and template = 'appointment_reminder'`;
    await flushTo(s.phone);
    await new Promise((r) => setTimeout(r, 15));
    await sql`update app.message_jobs set scheduled_for = now() where appointment_id = ${segundo} and template = 'appointment_reminder'`;
    await flushTo(s.phone);
    await sql`update app.services set offer_as_extra = false where id = ${gel}`;
    expect(await responde(s.phone, "Confirmo")).toBe("confirmed");
    await sql`update app.services set offer_as_extra = true where id = ${gel}`;
    expect(await etapa(segundo)).toBe("closed");
    expect(await etapa(primeiro)).toBe("awaiting_confirmation");
  });

  it("o mesmo celular em duas empresas: a resposta vai só para a empresa do lembrete mais recente", async () => {
    const phone = "5511966660001";
    const sa = { name: "Dupla9k Cena", first: "Dupla9k", phone, o: A };
    const sb = { name: "Dupla9k Cena", first: "Dupla9k", phone, o: B };
    const a = await lembrete(sa);
    await new Promise((r) => setTimeout(r, 15));
    const b = await lembrete(sb);
    expect(await responde(phone, "Preciso remarcar")).toBe("reschedule");
    expect(await etapa(b.id)).toBe("handoff");
    expect(await etapa(a.id)).toBe("awaiting_confirmation");
    expect(await avisos(A, "Dupla9k")).toHaveLength(0);
    expect((await avisos(B, "Dupla9k")).map((x) => x.type)).toEqual(["whatsapp_reschedule"]);
  });

  it("celular cadastrado sem o 9 e respondendo com o 9 (e o contrário) acha a mesma conversa", async () => {
    const s = { name: "SemNove9k Cena", first: "SemNove9k", phone: "551181112345", o: A };
    await lembrete(s);
    expect(await responde("5511981112345", "Preciso remarcar")).toBe("reschedule");
    const s2 = { name: "ComNove9k Cena", first: "ComNove9k", phone: "5511981119999", o: A };
    await lembrete(s2);
    expect(await responde("551181119999", "Preciso remarcar")).toBe("reschedule");
  });
});

describe("isolamento", () => {
  it("avisos da conversa só aparecem para a equipe da empresa certa", async () => {
    const s = cena(B); await lembrete(s);
    await responde(s.phone, "Preciso remarcar");
    const dasOutras = await asTenant(sql, A.ownerId, A.orgId, (tx) => tx`select title from app.notifications where title like ${"%" + s.first + "%"}`);
    expect(dasOutras).toHaveLength(0);
    const dela = await asTenant(sql, B.ownerId, B.orgId, (tx) => tx`select title from app.notifications where title like ${"%" + s.first + "%"}`);
    expect(dela.length).toBeGreaterThan(0);
  });
});
