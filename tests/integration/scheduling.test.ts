import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Sql } from "@/server/db";
import { withSystem } from "@/server/db";
import { asTenant, createOrg, freshDatabase, futureDate } from "../support/db";
import { addServiceToAppointment, changeStatus, createAppointment, rescheduleAppointment } from "@/server/modules/appointments";
import { addDaysToKey, localDateKey } from "@/lib/time";
import { appointmentBalance, recordPayment, refundPayment } from "@/server/modules/payments";
import { dispatchDueMessages, type MessageProvider, type OutgoingMessage } from "@/server/modules/messaging";
import { addTimeOff } from "@/server/modules/team";
import { bookOnline, getPublicBusiness, publicSlots } from "@/server/modules/public-booking";
import { loadDashboard, loadForecast, loadInsights, loadTrends } from "@/server/modules/dashboard";
import { DomainError } from "@/server/errors";

let sql: Sql;
let A: Awaited<ReturnType<typeof createOrg>>;
const actor = () => ({ userId: A.ownerId, organizationId: A.orgId });
const base = () => ({ professionalId: A.professionalId, clientId: A.clientId, serviceIds: [A.serviceId], squeezeIn: false, status: "confirmed" as const });

beforeAll(async () => {
  sql = await freshDatabase();
  A = await createOrg(sql, "Studio Gama");
});
afterAll(() => sql.end());

describe("conflitos de agenda", () => {
  it("duas reservas simultâneas do mesmo horário: apenas uma é aceita", async () => {
    const date = futureDate(5);
    const attempts = await Promise.allSettled(
      Array.from({ length: 6 }, () =>
        asTenant(sql, A.ownerId, A.orgId, (tx) => createAppointment(tx, actor(), { ...base(), date, time: "09:00" })),
      ),
    );
    expect(attempts.filter((a) => a.status === "fulfilled")).toHaveLength(1);
    for (const r of attempts.filter((a) => a.status === "rejected"))
      expect((r as PromiseRejectedResult).reason).toBeInstanceOf(DomainError);
  });

  it("o tempo de limpeza impede início imediatamente após outro atendimento", async () => {
    const date = futureDate(5);
    // 09:00–10:00 + 15 min de limpeza → 10:00 está ocupado
    await expect(
      asTenant(sql, A.ownerId, A.orgId, (tx) => createAppointment(tx, actor(), { ...base(), date, time: "10:00" })),
    ).rejects.toThrow(/ocupado/);
    await asTenant(sql, A.ownerId, A.orgId, (tx) => createAppointment(tx, actor(), { ...base(), date, time: "10:15" }));
  });

  it("encaixe explícito pode sobrepor", async () => {
    const date = futureDate(5);
    const appt = await asTenant(sql, A.ownerId, A.orgId, (tx) => createAppointment(tx, actor(), { ...base(), date, time: "09:30", squeezeIn: true }));
    expect(appt.id).toBeTruthy();
  });

  it("fora do expediente é rejeitado", async () => {
    await expect(
      asTenant(sql, A.ownerId, A.orgId, (tx) => createAppointment(tx, actor(), { ...base(), date: futureDate(5), time: "19:30" })),
    ).rejects.toThrow(/expediente/);
  });

  it("bloqueio de agenda impede agendamento", async () => {
    const date = futureDate(6);
    await asTenant(sql, A.ownerId, A.orgId, (tx) =>
      addTimeOff(tx, actor(), "America/Sao_Paulo", { professionalId: A.professionalId, startDate: date, startTime: "12:00", endDate: date, endTime: "14:00", reason: "Curso" }),
    );
    await expect(
      asTenant(sql, A.ownerId, A.orgId, (tx) => createAppointment(tx, actor(), { ...base(), date, time: "12:30" })),
    ).rejects.toThrow(/ocupado/);
  });
});

describe("reagendamento e mensagens", () => {
  it("reagendar move o horário, cancela lembretes antigos e cria novos", async () => {
    const date = futureDate(8);
    const appt = await asTenant(sql, A.ownerId, A.orgId, (tx) => createAppointment(tx, actor(), { ...base(), date, time: "14:00" }));
    const before = await sql`select template, status, idempotency_key from app.message_jobs where appointment_id = ${appt.id} order by created_at`;
    expect(before.map((j) => j.template).sort()).toEqual(["appointment_confirmation", "appointment_reminder"]);

    const newDate = futureDate(9);
    await asTenant(sql, A.ownerId, A.orgId, (tx) =>
      rescheduleAppointment(tx, actor(), { appointmentId: appt.id, professionalId: A.professionalId, date: newDate, time: "15:00", squeezeIn: false }),
    );
    const [row] = await sql`select starts_at, version from app.appointments where id = ${appt.id}`;
    expect(row!.version).toBe(2);
    const jobs = await sql<{ template: string; status: string; scheduled_for: Date }[]>`
      select template, status, scheduled_for from app.message_jobs where appointment_id = ${appt.id}`;
    const pendingReminders = jobs.filter((j) => j.template === "appointment_reminder" && j.status === "pending");
    expect(pendingReminders).toHaveLength(1);
    expect(pendingReminders[0]!.scheduled_for.getTime()).toBe(row!.starts_at.getTime() - 24 * 3_600_000);
    expect(jobs.filter((j) => j.status === "cancelled").length).toBeGreaterThanOrEqual(1);
    const events = await sql`select type from app.appointment_events where appointment_id = ${appt.id}`;
    expect(events.map((e) => e.type)).toContain("rescheduled");
  });

  it("reagendamento com versão desatualizada é recusado", async () => {
    const appt = await asTenant(sql, A.ownerId, A.orgId, (tx) => createAppointment(tx, actor(), { ...base(), date: futureDate(10), time: "09:00" }));
    await expect(
      asTenant(sql, A.ownerId, A.orgId, (tx) =>
        rescheduleAppointment(tx, actor(), { appointmentId: appt.id, professionalId: A.professionalId, date: futureDate(10), time: "11:00", squeezeIn: false, expectedVersion: 99 }),
      ),
    ).rejects.toThrow(/mexeu nesse agendamento/);
  });

  it("uma mensagem não é enviada duas vezes, mesmo com despachantes concorrentes e retentativas", async () => {
    const sent: OutgoingMessage[] = [];
    let failOnce = true;
    const provider: MessageProvider = {
      channel: "whatsapp",
      async send(msg) {
        if (failOnce) { failOnce = false; throw new Error("timeout do provedor"); }
        sent.push(msg);
        return { providerMessageId: `wamid.${sent.length}` };
      },
    };
    await sql`update app.message_jobs set scheduled_for = now() - interval '1 minute' where status = 'pending'`;
    const due = await sql`select count(*)::int as n from app.message_jobs where status = 'pending'`;
    await Promise.all([dispatchDueMessages(sql, [provider]), dispatchDueMessages(sql, [provider]), dispatchDueMessages(sql, [provider])]);
    // Retentativa do job que falhou
    await sql`update app.message_jobs set next_attempt_at = now() - interval '1 second' where status = 'pending'`;
    await dispatchDueMessages(sql, [provider]);
    await dispatchDueMessages(sql, [provider]);
    const keys = sent.map((m) => m.idempotencyKey);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.length).toBe(due[0]!.n);
    const statuses = await sql`select status, count(*)::int as n from app.message_jobs group by status`;
    expect(statuses.find((s) => s.status === "pending")).toBeUndefined();
  });

  it("sem provedor configurado, a mensagem é marcada como não enviada (nunca como enviada)", async () => {
    const appt = await asTenant(sql, A.ownerId, A.orgId, (tx) => createAppointment(tx, actor(), { ...base(), date: futureDate(11), time: "09:00" }));
    await dispatchDueMessages(sql, []);
    const [job] = await sql`select status, last_error from app.message_jobs where appointment_id = ${appt.id} and template = 'appointment_confirmation'`;
    expect(job).toMatchObject({ status: "skipped", last_error: "Canal não conectado" });
  });
});

describe("financeiro", () => {
  it("cancelamento preserva o histórico financeiro e estornos são auditáveis", async () => {
    const appt = await asTenant(sql, A.ownerId, A.orgId, (tx) => createAppointment(tx, actor(), { ...base(), date: futureDate(12), time: "09:00" }));
    const pay = await asTenant(sql, A.ownerId, A.orgId, (tx) =>
      recordPayment(tx, actor(), { appointmentId: appt.id, amountCents: 2000, method: "pix", isDeposit: true }),
    );
    await expect(
      asTenant(sql, A.ownerId, A.orgId, (tx) => recordPayment(tx, actor(), { appointmentId: appt.id, amountCents: 4000, method: "pix", isDeposit: false })),
    ).rejects.toThrow(/falta receber/);

    await asTenant(sql, A.ownerId, A.orgId, (tx) => changeStatus(tx, actor(), appt.id, "cancelled", "Cliente desistiu"));
    const payments = await sql`select kind, amount_cents from app.payments where appointment_id = ${appt.id}`;
    expect(payments).toHaveLength(1);

    await asTenant(sql, A.ownerId, A.orgId, (tx) => refundPayment(tx, actor(), { paymentId: pay.id, amountCents: 1500, reason: "Devolução parcial do sinal" }));
    await expect(
      asTenant(sql, A.ownerId, A.orgId, (tx) => refundPayment(tx, actor(), { paymentId: pay.id, amountCents: 1000, reason: "Mais estorno" })),
    ).rejects.toThrow(/passa do valor/);
    const bal = await asTenant(sql, A.ownerId, A.orgId, (tx) => appointmentBalance(tx, A.orgId, appt.id));
    expect(bal.paid).toBe(500);
    const audit = await sql`select action from app.audit_log where organization_id = ${A.orgId}`;
    expect(audit.map((a) => a.action)).toEqual(expect.arrayContaining(["appointment.cancelled", "payment.recorded", "payment.refunded"]));
    // Cancelado é estado final
    await expect(asTenant(sql, A.ownerId, A.orgId, (tx) => changeStatus(tx, actor(), appt.id, "confirmed"))).rejects.toThrow();
  });

  it("o painel separa valor recebido de valor agendado", async () => {
    const now = new Date();
    const d = await asTenant(sql, A.ownerId, A.orgId, (tx) => loadDashboard(tx, A.orgId, "America/Sao_Paulo", "30d", { includeFinance: true }, now));
    expect(d.revenue!.value).toBe(2000 - 1500); // pagamentos − estornos
    // O sinal foi recebido hoje, mas o atendimento é futuro: entra em recebido, não em agendado do período.
    expect(d.scheduledValue.value).toBe(0);
  });
});

describe("agendamento online", () => {
  it("cria solicitação pendente, deduplica cliente pelo telefone e notifica a equipe", async () => {
    const biz = (await withSystem((tx) => getPublicBusiness(tx, A.slug), sql))!;
    expect(biz.services.map((s) => s.name)).toContain("Manicure");
    const date = futureDate(15);
    const slots = await withSystem((tx) => publicSlots(tx, biz, A.serviceId, null, date), sql);
    expect(slots.length).toBeGreaterThan(0);
    const first = slots[0]!;
    const res = await withSystem((tx) => bookOnline(tx, biz, {
      serviceId: A.serviceId, professionalId: null, date, time: first.time,
      fullName: "Cliente Gama", phone: "(11) 99999-0000", email: "", acceptPolicy: true, marketingConsent: false,
    }), sql);
    expect(res.status).toBe("pending");
    const [appt] = await sql`select client_id, source, status from app.appointments where id = ${res.appointmentId}`;
    expect(appt).toMatchObject({ client_id: A.clientId, source: "online", status: "pending" });
    const notes = await sql`select title from app.notifications where organization_id = ${A.orgId}`;
    expect(notes.length).toBeGreaterThan(0);

    // O mesmo horário não aparece mais e uma segunda reserva é recusada.
    const after = await withSystem((tx) => publicSlots(tx, biz, A.serviceId, null, date), sql);
    expect(after.find((s) => s.time === first.time)).toBeUndefined();
    await expect(withSystem((tx) => bookOnline(tx, biz, {
      serviceId: A.serviceId, professionalId: null, date, time: first.time,
      fullName: "Outra Pessoa", phone: "(11) 98888-0000", email: "", acceptPolicy: true, marketingConsent: false,
    }), sql)).rejects.toThrow(/acabou de sair/);
  });

  it("negócio com agendamento online desativado não aparece", async () => {
    await sql`update app.organizations set online_booking_enabled = false where id = ${A.orgId}`;
    expect(await withSystem((tx) => getPublicBusiness(tx, A.slug), sql)).toBeNull();
    await sql`update app.organizations set online_booking_enabled = true where id = ${A.orgId}`;
  });
});

describe("painel: detalhamento por serviço", () => {
  it("separa por serviço e categoria, conta vendas adicionais e a origem", async () => {
    const B = await createOrg(sql, "Studio Detalhe");
    const act = { userId: B.ownerId, organizationId: B.orgId };
    const [ped] = await sql<{ id: string }[]>`
      insert into app.services (organization_id, name, price_cents, duration_minutes) values (${B.orgId}, 'Pedicure', 4000, 45) returning id`;
    await sql`insert into app.professional_services (organization_id, professional_id, service_id) values (${B.orgId}, ${B.professionalId}, ${ped!.id})`;
    const ontem = addDaysToKey(localDateKey(new Date(), "America/Sao_Paulo"), -1);
    const novo = (time: string) => asTenant(sql, B.ownerId, B.orgId, (tx) =>
      createAppointment(tx, act, { professionalId: B.professionalId, clientId: B.clientId, serviceIds: [B.serviceId], date: ontem, time, squeezeIn: true, status: "confirmed" }));
    const a1 = await novo("09:00");
    await asTenant(sql, B.ownerId, B.orgId, (tx) => addServiceToAppointment(tx, act, { appointmentId: a1.id, serviceId: ped!.id }));
    const a2 = await novo("13:00");
    const a3 = await novo("16:00");
    for (const a of [a1, a2]) await asTenant(sql, B.ownerId, B.orgId, (tx) => changeStatus(tx, act, a.id, "completed"));
    await asTenant(sql, B.ownerId, B.orgId, (tx) => changeStatus(tx, act, a3.id, "cancelled"));
    await sql`update app.appointments set source = 'online' where id = ${a2.id}`;

    const ins = await asTenant(sql, B.ownerId, B.orgId, (tx) => loadInsights(tx, B.orgId, "America/Sao_Paulo", "30d"));
    expect(ins.byService.map((s) => [s.name, s.count, s.value])).toEqual([["Manicure", 2, 10000], ["Pedicure", 1, 4000]]);
    expect(ins.byCategory).toEqual([expect.objectContaining({ name: "Sem categoria", count: 3, value: 14000 })]);
    expect(ins.upsell).toMatchObject({ completed: 2, withExtra: 1, extraValue: 4000, rate: 0.5 });
    expect(ins.origin).toMatchObject({ online: 1, staff: 1 }); // o cancelado não conta
    expect(ins.months).toHaveLength(6);
    expect(ins.months.at(-1)!.current).toBe(true);
  });
});

describe("painel: tendências, pontos de atenção e projeção", () => {
  it("avisa serviço em queda e só projeta com dias suficientes", async () => {
    const C = await createOrg(sql, "Studio Tendencia");
    const act = { userId: C.ownerId, organizationId: C.orgId };
    const hoje = localDateKey(new Date(), "America/Sao_Paulo");
    const feito = async (diasAtras: number, time: string) => {
      const a = await asTenant(sql, C.ownerId, C.orgId, (tx) => createAppointment(tx, act,
        { professionalId: C.professionalId, clientId: C.clientId, serviceIds: [C.serviceId], date: addDaysToKey(hoje, -diasAtras), time, squeezeIn: true, status: "confirmed" }));
      await asTenant(sql, C.ownerId, C.orgId, (tx) => changeStatus(tx, act, a.id, "completed"));
    };
    for (let i = 0; i < 8; i++) await feito(100 + i, "10:00"); // 90 dias anteriores: 8 manicures
    for (let i = 0; i < 2; i++) await feito(10 + i, "10:00"); // últimos 90 dias: 2

    const t = await asTenant(sql, C.ownerId, C.orgId, (tx) => loadTrends(tx, C.orgId, "America/Sao_Paulo"));
    const m = t.trends.find((x) => x.name === "Manicure")!;
    expect([m.last90Count, m.prev90Count, Math.round(m.growth!)]).toEqual([2, 8, -75]);
    expect(t.alerts[0]).toMatchObject({ kind: "queda", title: "Manicure caiu 75%" });
    expect(m.monthly).toHaveLength(6);

    // Projeção: no 1º e 2º dia do mês ainda não há base; depois, ritmo × dias de atendimento.
    const cedo = await asTenant(sql, C.ownerId, C.orgId, (tx) => loadForecast(tx, C.orgId, "America/Sao_Paulo", new Date(`${hoje.slice(0, 8)}02T12:00:00-03:00`)));
    expect(cedo.ready).toBe(false);
  });
});
