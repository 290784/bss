import { z } from "zod";
import type { Tx } from "@/server/db";
import { pgErrorCode, PG_EXCLUSION_VIOLATION } from "@/server/db";
import { DomainError } from "@/server/errors";
import { canReschedule, canTransition, STATUS_LABEL, type AppointmentStatus } from "@/domain/appointment-status";
import { localDateKey, zonedDateTime, isDateKey } from "@/lib/time";
import { assertSlotBookable, loadPolicy, loadServices, professionalCanDo, totals } from "@/server/modules/scheduling";
import { cancelPendingMessages, enqueueAppointmentMessages, enqueueCancellationNotice } from "@/server/modules/messaging";
import { audit } from "@/server/modules/audit";

export type Actor = { userId: string | null; organizationId: string };

const MIN = 60_000;

export const createAppointmentSchema = z.object({
  professionalId: z.uuid("Escolha a profissional."),
  clientId: z.uuid("Escolha a cliente."),
  date: z.string().refine(isDateKey, "Data inválida."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido."),
  serviceIds: z.array(z.uuid()).min(1, "Escolha pelo menos um serviço.").max(8),
  squeezeIn: z.boolean().default(false),
  status: z.enum(["pending", "confirmed"]).default("confirmed"),
  internalNotes: z.string().max(2000).optional(),
});
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

function translateConflict(err: unknown): never {
  if (pgErrorCode(err) === PG_EXCLUSION_VIOLATION)
    throw new DomainError("Este horário acabou de ser ocupado. Escolha outro horário.", "conflict");
  throw err;
}

export async function createAppointment(
  tx: Tx,
  actor: Actor,
  input: CreateAppointmentInput,
  opts: { source?: "staff" | "online"; clientNotes?: string; now?: Date } = {},
) {
  const orgId = actor.organizationId;
  const policy = await loadPolicy(tx, orgId);
  const services = await loadServices(tx, orgId, input.serviceIds, { onlineOnly: opts.source === "online" });
  if (!(await professionalCanDo(tx, orgId, input.professionalId, input.serviceIds)))
    throw new DomainError("A profissional escolhida não realiza todos os serviços selecionados.");
  const t = totals(services);
  const start = zonedDateTime(input.date, input.time, policy.timezone);
  const end = new Date(start.getTime() + t.minutes * MIN);
  const blockedUntil = new Date(end.getTime() + t.bufferAfter * MIN);
  const now = opts.now ?? new Date();

  if (opts.source === "online") {
    if (start.getTime() < now.getTime() + policy.minAdvanceMinutes * MIN)
      throw new DomainError("Este horário não respeita a antecedência mínima do estabelecimento.");
    if (start.getTime() > now.getTime() + (policy.maxAdvanceDays + 1) * 86_400_000)
      throw new DomainError("Data além do período aberto para agendamento.");
  }

  await assertSlotBookable(tx, orgId, input.professionalId, input.date, { start, end }, blockedUntil, policy, {
    squeezeIn: input.squeezeIn,
  });

  const [client] = await tx<{ id: string; archived_at: Date | null }[]>`
    select id, archived_at from app.clients where organization_id = ${orgId} and id = ${input.clientId}`;
  if (!client) throw new DomainError("Cliente não encontrada.");

  let appt: { id: string; organization_id: string; client_id: string; starts_at: Date; status: string; public_token: string };
  try {
    [appt] = (await tx`
      insert into app.appointments (organization_id, professional_id, client_id, starts_at, ends_at, blocked_until,
        status, source, allow_overlap, price_cents, internal_notes, client_notes, created_by)
      values (${orgId}, ${input.professionalId}, ${input.clientId}, ${start}, ${end}, ${blockedUntil},
        ${input.status}, ${opts.source ?? "staff"}, ${input.squeezeIn}, ${t.priceCents}, ${input.internalNotes ?? null},
        ${opts.clientNotes ?? null}, ${actor.userId})
      returning id, organization_id, client_id, starts_at, status, public_token`) as unknown as [typeof appt];
  } catch (err) {
    translateConflict(err);
  }
  for (const [i, s] of services.entries()) {
    await tx`insert into app.appointment_services (organization_id, appointment_id, service_id, service_name, price_cents, duration_minutes, position)
             values (${orgId}, ${appt.id}, ${s.id}, ${s.name}, ${s.price_cents}, ${s.duration_minutes}, ${i})`;
  }
  await logEvent(tx, actor, appt.id, "created", {
    source: opts.source ?? "staff", status: input.status, squeezeIn: input.squeezeIn,
    startsAt: start.toISOString(), services: services.map((s) => s.name),
  });
  await enqueueAppointmentMessages(tx, appt, now);
  return appt;
}

export const rescheduleSchema = z.object({
  appointmentId: z.uuid(),
  professionalId: z.uuid(),
  date: z.string().refine(isDateKey, "Data inválida."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido."),
  squeezeIn: z.boolean().default(false),
  expectedVersion: z.number().int().optional(),
});

export async function rescheduleAppointment(tx: Tx, actor: Actor, input: z.infer<typeof rescheduleSchema>) {
  const orgId = actor.organizationId;
  const policy = await loadPolicy(tx, orgId);
  const [cur] = await tx<{ id: string; status: AppointmentStatus; starts_at: Date; ends_at: Date; blocked_until: Date; professional_id: string; version: number; client_id: string }[]>`
    select id, status, starts_at, ends_at, blocked_until, professional_id, version, client_id
    from app.appointments where organization_id = ${orgId} and id = ${input.appointmentId} for update`;
  if (!cur) throw new DomainError("Agendamento não encontrado.");
  if (!canReschedule(cur.status)) throw new DomainError(`Não é possível reagendar um atendimento "${STATUS_LABEL[cur.status].toLowerCase()}".`);
  if (input.expectedVersion !== undefined && input.expectedVersion !== cur.version)
    throw new DomainError("Este agendamento foi alterado por outra pessoa. Atualize a página.", "stale");

  const serviceIds = (await tx<{ service_id: string | null }[]>`
    select service_id from app.appointment_services where appointment_id = ${cur.id} order by position`).map((r) => r.service_id);
  if (input.professionalId !== cur.professional_id) {
    const valid = serviceIds.filter((x): x is string => x !== null);
    if (valid.length !== serviceIds.length || !(await professionalCanDo(tx, orgId, input.professionalId, valid)))
      throw new DomainError("A nova profissional não realiza todos os serviços deste agendamento.");
  }

  const durationMs = cur.ends_at.getTime() - cur.starts_at.getTime();
  const bufferMs = cur.blocked_until.getTime() - cur.ends_at.getTime();
  const start = zonedDateTime(input.date, input.time, policy.timezone);
  const end = new Date(start.getTime() + durationMs);
  const blockedUntil = new Date(end.getTime() + bufferMs);

  await assertSlotBookable(tx, orgId, input.professionalId, input.date, { start, end }, blockedUntil, policy, {
    excludeAppointmentId: cur.id, squeezeIn: input.squeezeIn,
  });
  let updated: { id: string; organization_id: string; client_id: string; starts_at: Date; status: string };
  try {
    [updated] = (await tx`
      update app.appointments set starts_at = ${start}, ends_at = ${end}, blocked_until = ${blockedUntil},
        professional_id = ${input.professionalId}, allow_overlap = ${input.squeezeIn},
        updated_at = now(), version = version + 1
      where id = ${cur.id}
      returning id, organization_id, client_id, starts_at, status`) as unknown as [typeof updated];
  } catch (err) {
    translateConflict(err);
  }
  await logEvent(tx, actor, cur.id, "rescheduled", {
    from: cur.starts_at.toISOString(), to: start.toISOString(),
    fromProfessional: cur.professional_id, toProfessional: input.professionalId,
  });
  // Lembretes antigos perdem validade; novos são criados com a nova data.
  await cancelPendingMessages(tx, orgId, cur.id);
  await enqueueAppointmentMessages(tx, updated);
  return updated;
}

export async function changeStatus(
  tx: Tx, actor: Actor, appointmentId: string, to: AppointmentStatus, reason?: string,
) {
  const orgId = actor.organizationId;
  const [cur] = await tx<{ id: string; status: AppointmentStatus; organization_id: string; client_id: string; starts_at: Date }[]>`
    select id, status, organization_id, client_id, starts_at from app.appointments
    where organization_id = ${orgId} and id = ${appointmentId} for update`;
  if (!cur) throw new DomainError("Agendamento não encontrado.");
  if (cur.status === to) return cur;
  if (!canTransition(cur.status, to))
    throw new DomainError(`Não é possível mudar de "${STATUS_LABEL[cur.status]}" para "${STATUS_LABEL[to]}".`);
  try {
    await tx`
      update app.appointments set status = ${to}, updated_at = now(), version = version + 1,
        cancelled_at = ${to === "cancelled" ? new Date() : null},
        cancel_reason = ${to === "cancelled" ? reason ?? null : null}
      where id = ${cur.id}`;
  } catch (err) {
    // Voltar uma falta para confirmado pode colidir com um encaixe feito depois.
    translateConflict(err);
  }
  await logEvent(tx, actor, cur.id, "status_changed", { from: cur.status, to, reason: reason ?? null });
  if (to === "cancelled") {
    await cancelPendingMessages(tx, orgId, cur.id);
    if (cur.starts_at > new Date()) await enqueueCancellationNotice(tx, cur);
    await audit(tx, actor, "appointment.cancelled", "appointment", cur.id, { reason: reason ?? null });
  }
  if (to === "no_show") await cancelPendingMessages(tx, orgId, cur.id);
  return { ...cur, status: to };
}

export const addServiceSchema = z.object({ appointmentId: z.uuid(), serviceId: z.uuid() });

/**
 * Acrescenta um serviço ao fim do atendimento (venda adicional). O fim do horário se estende;
 * a mesma validação de expediente/conflito da criação vale aqui, e a restrição do banco
 * continua impedindo sobreposição.
 */
export async function addServiceToAppointment(tx: Tx, actor: Actor, input: z.infer<typeof addServiceSchema>) {
  const orgId = actor.organizationId;
  const policy = await loadPolicy(tx, orgId);
  const [cur] = await tx<{ id: string; status: AppointmentStatus; starts_at: Date; ends_at: Date; professional_id: string; allow_overlap: boolean }[]>`
    select id, status, starts_at, ends_at, professional_id, allow_overlap
    from app.appointments where organization_id = ${orgId} and id = ${input.appointmentId} for update`;
  if (!cur) throw new DomainError("Agendamento não encontrado.");
  if (cur.status !== "pending" && cur.status !== "confirmed")
    throw new DomainError("Só dá para acrescentar serviços a agendamentos aguardando ou confirmados.");
  const [svc] = await loadServices(tx, orgId, [input.serviceId]);
  const already = await tx`select 1 from app.appointment_services where appointment_id = ${cur.id} and service_id = ${svc!.id}`;
  if (already.length) throw new DomainError("Este serviço já está no agendamento.");
  if (!(await professionalCanDo(tx, orgId, cur.professional_id, [svc!.id])))
    throw new DomainError("A profissional deste horário não realiza este serviço.");

  const end = new Date(cur.ends_at.getTime() + svc!.duration_minutes * MIN);
  const blockedUntil = new Date(end.getTime() + svc!.buffer_after_minutes * MIN);
  await assertSlotBookable(tx, orgId, cur.professional_id, localDateKey(cur.starts_at, policy.timezone),
    { start: cur.starts_at, end }, blockedUntil, policy, { excludeAppointmentId: cur.id, squeezeIn: cur.allow_overlap });
  try {
    await tx`update app.appointments set ends_at = ${end}, blocked_until = ${blockedUntil},
               price_cents = price_cents + ${svc!.price_cents}, updated_at = now(), version = version + 1
             where id = ${cur.id}`;
  } catch (err) {
    translateConflict(err);
  }
  await tx`insert into app.appointment_services (organization_id, appointment_id, service_id, service_name, price_cents, duration_minutes, position)
           select ${orgId}, ${cur.id}, ${svc!.id}, ${svc!.name}, ${svc!.price_cents}, ${svc!.duration_minutes}, coalesce(max(position) + 1, 0)
           from app.appointment_services where appointment_id = ${cur.id}`;
  await logEvent(tx, actor, cur.id, "service_added", { name: svc!.name, priceCents: svc!.price_cents, minutes: svc!.duration_minutes });
  return { name: svc!.name, priceCents: svc!.price_cents };
}

async function logEvent(tx: Tx, actor: Actor, appointmentId: string, type: string, data: Record<string, unknown>) {
  await tx`insert into app.appointment_events (organization_id, appointment_id, actor_user_id, type, data)
           values (${actor.organizationId}, ${appointmentId}, ${actor.userId}, ${type}, ${tx.json(data as never)})`;
}

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

export type AgendaItem = {
  id: string;
  professional_id: string;
  client_id: string;
  client_name: string;
  client_phone: string | null;
  starts_at: Date;
  ends_at: Date;
  blocked_until: Date;
  status: AppointmentStatus;
  source: "staff" | "online";
  allow_overlap: boolean;
  price_cents: number;
  discount_cents: number;
  services: string;
  paid_cents: number;
  version: number;
};

export async function listAgenda(tx: Tx, orgId: string, from: Date, to: Date, professionalId?: string | null): Promise<AgendaItem[]> {
  return tx<AgendaItem[]>`
    select a.id, a.professional_id, a.client_id, c.full_name as client_name, c.phone_normalized as client_phone,
      a.starts_at, a.ends_at, a.blocked_until, a.status, a.source, a.allow_overlap, a.price_cents, a.discount_cents, a.version,
      coalesce((select string_agg(s.service_name, ' + ' order by s.position) from app.appointment_services s where s.appointment_id = a.id), '') as services,
      coalesce((select sum(case when p.kind = 'payment' then p.amount_cents else -p.amount_cents end)
                from app.payments p where p.appointment_id = a.id), 0)::int as paid_cents
    from app.appointments a join app.clients c on c.id = a.client_id
    where a.organization_id = ${orgId} and a.starts_at < ${to} and a.ends_at > ${from}
      and (${professionalId ?? null}::uuid is null or a.professional_id = ${professionalId ?? null}::uuid)
    order by a.starts_at`;
}

export async function getAppointmentDetail(tx: Tx, orgId: string, id: string, opts: { withPayments: boolean }) {
  const [a] = await tx<(AgendaItem & { internal_notes: string | null; client_notes: string | null; cancel_reason: string | null; professional_name: string; created_at: Date; public_token: string; client_confirmed_at: Date | null })[]>`
    select a.*, c.full_name as client_name, c.phone_normalized as client_phone, p.display_name as professional_name, '' as services, 0 as paid_cents
    from app.appointments a join app.clients c on c.id = a.client_id join app.professionals p on p.id = a.professional_id
    where a.organization_id = ${orgId} and a.id = ${id}`;
  if (!a) return null;
  const [services, events, messages] = await Promise.all([
    tx<{ service_name: string; price_cents: number; duration_minutes: number; service_id: string | null }[]>`
      select service_name, price_cents, duration_minutes, service_id from app.appointment_services where appointment_id = ${id} order by position`,
    tx<{ type: string; data: Record<string, unknown>; created_at: Date }[]>`
      select type, data, created_at from app.appointment_events where appointment_id = ${id} order by created_at desc, id desc`,
    tx<{ template: string; channel: string; status: string; scheduled_for: Date; last_error: string | null }[]>`
      select template, channel, status, scheduled_for, last_error from app.message_jobs where appointment_id = ${id} order by scheduled_for`,
  ]);
  const payments = opts.withPayments
    ? await tx<{ id: string; kind: "payment" | "refund"; amount_cents: number; method: string; is_deposit: boolean; paid_at: Date; refund_of: string | null }[]>`
        select id, kind, amount_cents, method, is_deposit, paid_at, refund_of from app.payments
        where organization_id = ${orgId} and appointment_id = ${id} order by paid_at`
    : [];
  return { ...a, serviceItems: services, events, messages, payments };
}

export function dayKeyOf(instant: Date, timeZone: string) {
  return localDateKey(instant, timeZone);
}
