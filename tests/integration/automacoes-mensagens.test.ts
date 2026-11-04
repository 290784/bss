import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Sql } from "@/server/db";
import { addMember, asTenant, createOrg, freshDatabase, futureDate } from "../support/db";
import { changeStatus, createAppointment } from "@/server/modules/appointments";
import {
  dispatchDueMessages, enqueueAppointmentMessages, hasAutomations, type MessageProvider, type OutgoingMessage,
} from "@/server/modules/messaging";
import { META_TEMPLATES } from "@/server/modules/whatsapp-meta";
import { zonedDateTime } from "@/lib/time";

/**
 * Automações de mensagens (a fila de envio): o que é criado ao marcar, remarcar e cancelar, quando e por qual canal sai,
 * o que é enviado ao provedor e como as falhas são tratadas. Provedor de mentira; nada sai de verdade.
 */

let sql: Sql;
let A: Awaited<ReturnType<typeof createOrg>>;
let B: Awaited<ReturnType<typeof createOrg>>;
const TZ = "America/Sao_Paulo";
let n = 0;

const actor = (o = A) => ({ userId: o.ownerId, organizationId: o.orgId });

async function client(o: typeof A, over: Partial<{ name: string; phone: string | null; email: string | null; pref: string }> = {}) {
  n++;
  const phone = over.phone === undefined ? `55119${String(10000000 + n)}` : over.phone;
  const [c] = await sql<{ id: string }[]>`
    insert into app.clients (organization_id, full_name, phone, phone_normalized, email, contact_preference)
    values (${o.orgId}, ${over.name ?? `Cliente ${n}`}, ${phone}, ${phone}, ${over.email ?? null}, ${over.pref ?? "whatsapp"}) returning id`;
  return c!.id;
}

/** Marca um horário (dia futuro distinto a cada chamada, para não colidir na agenda). */
let day = 20;
async function book(o: typeof A, clientId: string, opts: { time?: string; now?: Date; date?: string } = {}) {
  const date = opts.date ?? futureDate(day++);
  const time = opts.time ?? "10:00";
  const a = await asTenant(sql, o.ownerId, o.orgId, (tx) =>
    createAppointment(tx, actor(o), { professionalId: o.professionalId, clientId, serviceIds: [o.serviceId], date, time, squeezeIn: false, status: "confirmed" }, { now: opts.now }));
  return { id: a.id, date, time, startsAt: a.starts_at };
}
const jobs = (apptId: string) => sql<{ template: string; channel: string; status: string; scheduled_for: Date; attempts: number; last_error: string | null; idempotency_key: string; next_attempt_at: Date | null }[]>`
  select template, channel, status, scheduled_for, attempts, last_error, idempotency_key, next_attempt_at from app.message_jobs where appointment_id = ${apptId} order by template`;

const sentLog: OutgoingMessage[] = [];
const okProvider: MessageProvider = { channel: "whatsapp", send: async (m) => { sentLog.push(m); return { providerMessageId: `wamid.${sentLog.length}` }; } };
/** Dispara tudo que está vencido, só para os agendamentos dados (não mexe nos de outros testes). */
async function flush(ids: string[], providers: MessageProvider[] = [okProvider]) {
  await sql`update app.message_jobs set scheduled_for = now() - interval '1 minute' where appointment_id in ${sql(ids)} and status = 'pending' and next_attempt_at is null`;
  const before = sentLog.length;
  const r = await dispatchDueMessages(sql, providers);
  // O despacho leva tudo que está vencido (inclusive sobras de outros testes): aqui só olhamos o que é destes horários.
  return { ...r, msgs: sentLog.slice(before).filter((m) => ids.some((id) => m.idempotencyKey.includes(id))) };
}
const setSubscription = (o: typeof A, plan: string, status: string, trialEnds: string | null, grace: string | null = null) =>
  sql`update app.subscriptions set plan = ${plan}, status = ${status}, trial_ends_at = ${trialEnds}, grace_until = ${grace} where organization_id = ${o.orgId}`;

beforeAll(async () => {
  sql = await freshDatabase();
  A = await createOrg(sql, "Studio Mensagens");
  B = await createOrg(sql, "Studio Outro");
  // Plano ativo (não depende do fim do teste grátis, pois os testes simulam datas distantes).
  await setSubscription(A, "studio", "active", null);
});
afterAll(() => sql.end());

describe("o que é criado ao marcar um horário", () => {
  it("plano com automações: confirmação na hora e lembrete na véspera às 9h (horário do negócio)", async () => {
    const a = await book(A, await client(A), { time: "14:00" });
    const j = await jobs(a.id);
    expect(j.map((x) => x.template)).toEqual(["appointment_confirmation", "appointment_reminder"]);
    expect(j.every((x) => x.channel === "whatsapp" && x.status === "pending")).toBe(true);
    const lembrete = j.find((x) => x.template === "appointment_reminder")!;
    const vespera = new Date(a.startsAt.getTime() - 86_400_000);
    const dia = vespera.toLocaleDateString("sv-SE", { timeZone: TZ });
    expect(lembrete.scheduled_for.getTime()).toBe(zonedDateTime(dia, "09:00", TZ).getTime());
    expect(j.find((x) => x.template === "appointment_confirmation")!.scheduled_for.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it("plano Solo (sem automações): só a confirmação, nada de lembrete", async () => {
    await setSubscription(B, "solo", "active", null);
    const a = await book(B, await client(B));
    expect((await jobs(a.id)).map((x) => x.template)).toEqual(["appointment_confirmation"]);
    await setSubscription(B, "studio", "trialing", new Date(Date.now() + 5 * 86_400_000).toISOString());
  });

  it("lembrete desligado pelo salão: só a confirmação", async () => {
    await sql`update app.organizations set whatsapp_reminder_enabled = false where id = ${A.orgId}`;
    const a = await book(A, await client(A));
    expect((await jobs(a.id)).map((x) => x.template)).toEqual(["appointment_confirmation"]);
    await sql`update app.organizations set whatsapp_reminder_enabled = true where id = ${A.orgId}`;
  });

  it("marcado em cima da hora (menos de 2 h do horário): só a confirmação", async () => {
    const date = futureDate(day++);
    const start = zonedDateTime(date, "15:00", TZ);
    const a = await book(A, await client(A), { date, time: "15:00", now: new Date(start.getTime() - 90 * 60_000) });
    expect((await jobs(a.id)).map((x) => x.template)).toEqual(["appointment_confirmation"]);
  });

  it("marcado no próprio dia, com mais de 2 h de folga: o lembrete sai na hora", async () => {
    const date = futureDate(day++);
    const start = zonedDateTime(date, "18:00", TZ);
    const now = new Date(start.getTime() - 5 * 3_600_000);
    const a = await book(A, await client(A), { date, time: "18:00", now });
    const lembrete = (await jobs(a.id)).find((x) => x.template === "appointment_reminder");
    expect(lembrete?.scheduled_for.getTime()).toBe(now.getTime());
  });

  it("cliente que prefere e-mail: a confirmação vai pelo canal e-mail e não há lembrete de WhatsApp", async () => {
    const a = await book(A, await client(A, { pref: "email", email: "ana@exemplo.com" }));
    const j = await jobs(a.id);
    expect(j.map((x) => [x.template, x.channel])).toEqual([["appointment_confirmation", "email"]]);
  });

  it("cliente que não quer contato, ou sem telefone nem e-mail: nenhuma mensagem", async () => {
    const naoQuer = await book(A, await client(A, { pref: "none" }));
    const semContato = await book(A, await client(A, { phone: null }));
    expect(await jobs(naoQuer.id)).toHaveLength(0);
    expect(await jobs(semContato.id)).toHaveLength(0);
  });

  it("repetir a criação das mensagens do mesmo horário não duplica (idempotência)", async () => {
    const a = await book(A, await client(A));
    const antes = await jobs(a.id);
    await asTenant(sql, A.ownerId, A.orgId, async (tx) => {
      const [row] = await tx<{ id: string; organization_id: string; client_id: string; starts_at: Date; status: string }[]>`
        select id, organization_id, client_id, starts_at, status from app.appointments where id = ${a.id}`;
      await enqueueAppointmentMessages(tx, row!);
      await enqueueAppointmentMessages(tx, row!);
    });
    expect((await jobs(a.id)).map((x) => x.idempotency_key).sort()).toEqual(antes.map((x) => x.idempotency_key).sort());
  });
});

describe("plano e automações (hasAutomations)", () => {
  const dia = (d: number): string => new Date(Date.now() + d * 86_400_000).toISOString();
  type Quando = () => string | null;
  it.each<[string, string, string, Quando, Quando | null, boolean]>([
    ["teste grátis em andamento", "studio", "trialing", () => dia(3), null, true],
    ["teste grátis vencido", "studio", "trialing", () => dia(-1), null, false],
    ["plano Solo ativo", "solo", "active", () => null, null, false],
    ["plano Pro ativo", "pro", "active", () => null, null, true],
    ["inadimplente dentro da tolerância", "pro", "past_due", () => null, () => dia(2), true],
    ["inadimplente com a tolerância vencida", "pro", "past_due", () => null, () => dia(-2), false],
    ["cancelado", "business", "canceled", () => null, null, false],
  ])("%s → %s", async (_nome, plano, status, trial, grace, esperado) => {
    await setSubscription(B, plano, status, trial(), grace ? grace() : null);
    expect(await asTenant(sql, B.ownerId, B.orgId, (tx) => hasAutomations(tx, B.orgId))).toBe(esperado);
    await setSubscription(B, "studio", "trialing", dia(5));
  });
});

describe("cancelamento, falta e remarcação", () => {
  it("cancelar um horário futuro cancela o que estava pendente e avisa a cliente uma única vez", async () => {
    const a = await book(A, await client(A));
    await asTenant(sql, A.ownerId, A.orgId, (tx) => changeStatus(tx, actor(), a.id, "cancelled", "Imprevisto"));
    const j = await jobs(a.id);
    expect(j.filter((x) => x.template === "appointment_reminder")[0]!.status).toBe("cancelled");
    expect(j.filter((x) => x.template === "appointment_confirmation")[0]!.status).toBe("cancelled");
    const avisos = j.filter((x) => x.template === "appointment_cancelled");
    expect(avisos).toHaveLength(1);
    expect(avisos[0]!.status).toBe("pending");
    // Cancelar de novo (cliquei duas vezes) não cria outro aviso nem erro.
    await asTenant(sql, A.ownerId, A.orgId, (tx) => changeStatus(tx, actor(), a.id, "cancelled"));
    expect((await jobs(a.id)).filter((x) => x.template === "appointment_cancelled")).toHaveLength(1);
  });

  it("o aviso de cancelamento chega com os dados certos e a confirmação cancelada nunca sai", async () => {
    const cid = await client(A, { name: "Marina Souza" });
    const a = await book(A, cid, { time: "11:30" });
    await asTenant(sql, A.ownerId, A.orgId, (tx) => changeStatus(tx, actor(), a.id, "cancelled"));
    const r = await flush([a.id]);
    expect(r.msgs.map((m) => m.template)).toEqual(["appointment_cancelled"]);
    expect(r.msgs[0]!.variables).toMatchObject({ cliente: "Marina", negocio: "Studio Mensagens", servicos: "Manicure" });
    expect(r.msgs[0]!.variables.quando).toMatch(/11h30/);
  });

  it("cancelar um atendimento que já passou não avisa a cliente", async () => {
    const a = await book(A, await client(A));
    await sql`update app.appointments set starts_at = starts_at - interval '40 days', ends_at = ends_at - interval '40 days', blocked_until = blocked_until - interval '40 days' where id = ${a.id}`;
    await asTenant(sql, A.ownerId, A.orgId, (tx) => changeStatus(tx, actor(), a.id, "cancelled"));
    expect((await jobs(a.id)).some((x) => x.template === "appointment_cancelled")).toBe(false);
  });

  it("falta (no-show) cancela o que estava pendente e não manda aviso", async () => {
    const a = await book(A, await client(A));
    await asTenant(sql, A.ownerId, A.orgId, (tx) => changeStatus(tx, actor(), a.id, "no_show"));
    const j = await jobs(a.id);
    expect(j.every((x) => x.status === "cancelled")).toBe(true);
    expect(j.some((x) => x.template === "appointment_cancelled")).toBe(false);
  });

  it("cancelar sem lembrete já enviado: o que já saiu continua como enviado", async () => {
    const a = await book(A, await client(A));
    await flush([a.id]); // confirmação e lembrete saem
    await asTenant(sql, A.ownerId, A.orgId, (tx) => changeStatus(tx, actor(), a.id, "cancelled"));
    const j = await jobs(a.id);
    expect(j.filter((x) => x.template !== "appointment_cancelled").every((x) => x.status === "sent")).toBe(true);
  });
});

describe("o que é enviado ao provedor", () => {
  it("confirmação e lembrete levam texto pronto, link do comprovante e os botões do lembrete", async () => {
    const a = await book(A, await client(A, { name: "Luiza Prado" }), { time: "09:00" });
    const r = await flush([a.id]);
    const conf = r.msgs.find((m) => m.template === "appointment_confirmation")!;
    const lem = r.msgs.find((m) => m.template === "appointment_reminder")!;
    expect(conf.variables.mensagem).toMatch(/^Oi, Luiza!/);
    expect(conf.variables.link).toMatch(/^https?:\/\/.+\/b\/.+\/agendamento\/[a-f0-9]{64}$/);
    expect(lem.variables.mensagem).toMatch(/^Oi, Luiza!.*Posso confirmar\?$/s);
    expect(lem.buttons).toEqual([{ id: "confirm", title: "Confirmo" }, { id: "reschedule", title: "Preciso remarcar" }]);
    expect(conf.buttons).toBeUndefined();
  });

  it("todo parâmetro do modelo aprovado na Meta existe e tem valor nas variáveis enviadas (senão a cliente recebe “-”)", async () => {
    const a = await book(A, await client(A, { name: "Paula Nunes" }));
    await asTenant(sql, A.ownerId, A.orgId, (tx) => changeStatus(tx, actor(), a.id, "cancelled"));
    const r = await flush([a.id]);
    // Cancelamento sai do mesmo agendamento; confirmação e lembrete de outro, para ter os três.
    const b = await book(A, await client(A, { name: "Paula Nunes" }));
    const r2 = await flush([b.id]);
    const todos = [...r.msgs, ...r2.msgs];
    for (const t of ["appointment_confirmation", "appointment_reminder", "appointment_cancelled"] as const) {
      const msg = todos.find((m) => m.template === t);
      expect(msg, `modelo ${t} não foi enviado`).toBeDefined();
      for (const p of META_TEMPLATES[t]!.params) expect(msg!.variables[p], `${t}: parâmetro “${p}” vazio`).toBeTruthy();
    }
  });

  it("cada empresa envia com o próprio nome", async () => {
    const a = await book(A, await client(A));
    const b = await book(B, await client(B), { time: "13:00" });
    const r = await flush([a.id, b.id]);
    const negocios = new Set(r.msgs.map((m) => m.variables.negocio));
    expect(negocios).toEqual(new Set(["Studio Mensagens", "Studio Outro"]));
    for (const m of r.msgs) expect(m.to).toMatch(/^55119\d+$/);
  });

  it("o telefone usado é o do cadastro da cliente na hora do envio", async () => {
    const cid = await client(A, { phone: "5511911112222" });
    const a = await book(A, cid);
    await sql`update app.clients set phone = '5511933334444', phone_normalized = '5511933334444' where id = ${cid}`;
    const r = await flush([a.id]);
    expect(new Set(r.msgs.map((m) => m.to))).toEqual(new Set(["5511933334444"]));
  });
});

describe("falhas, tentativas e recuperação", () => {
  const falha = (msg = "provedor fora do ar"): MessageProvider => ({ channel: "whatsapp", send: async () => { throw new Error(msg); } });

  it("falha do provedor: tenta de novo com espera de 1, 2, 4 e 8 minutos e, na quinta, marca como falhou", async () => {
    const a = await book(A, await client(A));
    await sql`update app.message_jobs set status = 'cancelled' where appointment_id = ${a.id} and template = 'appointment_reminder'`;
    const esperas: number[] = [];
    for (let tentativa = 1; tentativa <= 5; tentativa++) {
      await sql`update app.message_jobs set scheduled_for = now() - interval '1 minute', next_attempt_at = null where appointment_id = ${a.id} and status = 'pending'`;
      const r = await dispatchDueMessages(sql, [falha("erro " + tentativa)]);
      expect(r.failed).toBeGreaterThanOrEqual(1);
      const [job] = await sql<{ status: string; attempts: number; last_error: string; mins: number | null }[]>`
        select status, attempts, last_error, extract(epoch from (next_attempt_at - now()))::float / 60 as mins
        from app.message_jobs where appointment_id = ${a.id} and template = 'appointment_confirmation'`;
      expect(job!.attempts).toBe(tentativa);
      expect(job!.last_error).toBe("erro " + tentativa);
      if (tentativa < 5) { expect(job!.status).toBe("pending"); esperas.push(Math.round(job!.mins!)); }
      else expect(job!.status).toBe("failed");
    }
    expect(esperas).toEqual([1, 2, 4, 8]);
  });

  it("não tenta de novo antes da hora da próxima tentativa", async () => {
    const a = await book(A, await client(A));
    await sql`update app.message_jobs set status = 'cancelled' where appointment_id = ${a.id} and template = 'appointment_reminder'`;
    await sql`update app.message_jobs set scheduled_for = now() - interval '1 minute' where appointment_id = ${a.id}`;
    await dispatchDueMessages(sql, [falha()]);
    const antes = sentLog.length;
    const r = await dispatchDueMessages(sql, [okProvider]);
    expect(sentLog.length).toBe(antes);
    expect(r.sent).toBe(0);
    await sql`update app.message_jobs set next_attempt_at = now() - interval '1 second' where appointment_id = ${a.id}`;
    expect((await dispatchDueMessages(sql, [okProvider])).sent).toBe(1);
  });

  it("a mensagem de erro guardada é cortada em 300 caracteres", async () => {
    const a = await book(A, await client(A));
    await sql`update app.message_jobs set scheduled_for = now() - interval '1 minute' where appointment_id = ${a.id}`;
    await dispatchDueMessages(sql, [falha("x".repeat(900))]);
    const rows = await sql<{ n: number }[]>`select max(length(last_error))::int as n from app.message_jobs where appointment_id = ${a.id}`;
    expect(rows[0]!.n).toBe(300);
  });

  it("um envio que travou no meio (servidor reiniciou) é retomado depois de um tempo, sem ficar parado para sempre", async () => {
    const a = await book(A, await client(A));
    await sql`update app.message_jobs set status = 'cancelled' where appointment_id = ${a.id} and template = 'appointment_reminder'`;
    // Simula: o despachante reivindicou (processing) e o processo morreu antes de enviar.
    await sql`update app.message_jobs set status = 'processing', attempts = 1, scheduled_for = now() - interval '2 hours', updated_at = now() - interval '2 hours'
              where appointment_id = ${a.id} and template = 'appointment_confirmation'`;
    const r = await dispatchDueMessages(sql, [okProvider]);
    expect(r.sent).toBeGreaterThanOrEqual(1);
    const [job] = await sql`select status, attempts from app.message_jobs where appointment_id = ${a.id} and template = 'appointment_confirmation'`;
    expect(job).toMatchObject({ status: "sent", attempts: 2 });
  });

  it("um envio travado que já gastou todas as tentativas vira “falhou” (não volta à fila)", async () => {
    const a = await book(A, await client(A));
    await sql`update app.message_jobs set status = 'cancelled' where appointment_id = ${a.id} and template = 'appointment_reminder'`;
    await sql`update app.message_jobs set status = 'processing', attempts = 5, scheduled_for = now() - interval '3 hours', updated_at = now() - interval '3 hours'
              where appointment_id = ${a.id} and template = 'appointment_confirmation'`;
    const antes = sentLog.length;
    await dispatchDueMessages(sql, [okProvider]);
    expect(sentLog.length).toBe(antes);
    expect((await jobs(a.id)).find((x) => x.template === "appointment_confirmation")).toMatchObject({ status: "failed" });
  });

  it("um envio em andamento há poucos minutos NÃO é retomado (evita mandar duas vezes)", async () => {
    const a = await book(A, await client(A));
    await sql`update app.message_jobs set status = 'cancelled' where appointment_id = ${a.id} and template = 'appointment_reminder'`;
    await sql`update app.message_jobs set status = 'processing', attempts = 1, scheduled_for = now() - interval '1 minute', updated_at = now() - interval '2 minutes'
              where appointment_id = ${a.id} and template = 'appointment_confirmation'`;
    const antes = sentLog.length;
    await dispatchDueMessages(sql, [okProvider]);
    expect(sentLog.filter((m) => m.idempotencyKey.includes(a.id)).length).toBe(0);
    expect(sentLog.length).toBe(antes);
    expect((await jobs(a.id)).find((x) => x.template === "appointment_confirmation")!.status).toBe("processing");
  });

  it("cliente que ficou sem telefone antes do envio: a mensagem é marcada como não enviada, com o motivo", async () => {
    const cid = await client(A);
    const a = await book(A, cid);
    await sql`update app.clients set phone = null, phone_normalized = null where id = ${cid}`;
    const r = await flush([a.id]);
    expect(r.sent).toBe(0);
    const j = await jobs(a.id);
    expect(j.every((x) => x.status === "skipped" && x.last_error === "Cliente sem contato para este canal")).toBe(true);
  });

  it("e-mail sem provedor conectado é marcado como não enviado, e o WhatsApp da mesma rodada sai normalmente", async () => {
    const porEmail = await book(A, await client(A, { pref: "email", email: "bia@exemplo.com" }));
    const porZap = await book(A, await client(A));
    const r = await flush([porEmail.id, porZap.id]);
    expect((await jobs(porEmail.id))[0]).toMatchObject({ status: "skipped", last_error: "Canal não conectado" });
    expect(r.msgs.filter((m) => m.idempotencyKey.includes(porZap.id)).length).toBeGreaterThan(0);
    expect(r.msgs.some((m) => m.idempotencyKey.includes(porEmail.id))).toBe(false);
  });

  it("o lote respeita o limite: o resto fica para a próxima rodada", async () => {
    const ids = [];
    for (let i = 0; i < 3; i++) ids.push((await book(A, await client(A))).id);
    await sql`update app.message_jobs set status = 'cancelled' where appointment_id in ${sql(ids)} and template = 'appointment_reminder'`;
    await sql`update app.message_jobs set scheduled_for = now() - interval '1 minute' where appointment_id in ${sql(ids)}`;
    const um = await dispatchDueMessages(sql, [okProvider], 2);
    expect(um.sent).toBe(2);
    const dois = await dispatchDueMessages(sql, [okProvider], 2);
    expect(dois.sent).toBe(1);
  });

  it("o lembrete só abre a conversa de WhatsApp se o horário ainda estiver ativo", async () => {
    const ativo = await book(A, await client(A));
    const concluido = await book(A, await client(A));
    await sql`update app.appointments set status = 'completed' where id = ${concluido.id}`;
    await flush([ativo.id, concluido.id]);
    const threads = await sql`select appointment_id from app.whatsapp_threads where appointment_id in ${sql([ativo.id, concluido.id])}`;
    expect(threads.map((t) => t.appointment_id)).toEqual([ativo.id]);
  });

  it("uma funcionária com acesso só à própria agenda não enxerga a fila de mensagens da empresa", async () => {
    const prof = await addMember(sql, A.orgId, "professional", A.professionalId);
    const visiveis = await asTenant(sql, prof, A.orgId, (tx) => tx`select count(*)::int as n from app.message_jobs`);
    const total = await sql`select count(*)::int as n from app.message_jobs where organization_id = ${A.orgId}`;
    expect(visiveis[0]!.n).toBeLessThanOrEqual(total[0]!.n);
    // Outra empresa nunca aparece.
    const dasOutras = await asTenant(sql, A.ownerId, A.orgId, (tx) => tx`select count(*)::int as n from app.message_jobs where organization_id <> ${A.orgId}`);
    expect(dasOutras[0]!.n).toBe(0);
  });
});

describe("quem pode ligar e desligar as automações", () => {
  it("dona e gerente alteram; recepcionista e profissional não (o banco ignora a tentativa)", async () => {
    const quem: [string, string, number][] = [
      ["dona", A.ownerId, 1],
      ["gerente", await addMember(sql, A.orgId, "manager"), 1],
      ["recepcionista", await addMember(sql, A.orgId, "receptionist"), 0],
      ["profissional", await addMember(sql, A.orgId, "professional", A.professionalId), 0],
    ];
    for (const [papel, userId, esperado] of quem) {
      const linhas = await asTenant(sql, userId, A.orgId, (tx) => tx`update app.organizations set whatsapp_reminder_enabled = false, whatsapp_upsell_enabled = false where id = ${A.orgId} returning id`);
      expect(linhas.length, `${papel}`).toBe(esperado);
      await sql`update app.organizations set whatsapp_reminder_enabled = true, whatsapp_upsell_enabled = true where id = ${A.orgId}`;
    }
  });

  it("uma empresa não consegue ligar ou desligar as automações de outra", async () => {
    const linhas = await asTenant(sql, B.ownerId, B.orgId, (tx) => tx`update app.organizations set whatsapp_reminder_enabled = false where id = ${A.orgId} returning id`);
    expect(linhas).toHaveLength(0);
    const [org] = await sql`select whatsapp_reminder_enabled from app.organizations where id = ${A.orgId}`;
    expect(org!.whatsapp_reminder_enabled).toBe(true);
  });
});
