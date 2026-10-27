import type { Tx } from "@/server/db";
import { availableSlots, fitsWorkingHours, type TimeRange, type WorkingWindow } from "@/domain/availability";
import { addDaysToKey, zonedDateTime } from "@/lib/time";
import { DomainError } from "@/server/errors";

/**
 * Funções de agenda compartilhadas entre o painel (contexto de tenant/RLS) e a página
 * pública (contexto de sistema). Todas filtram organization_id explicitamente.
 */

export type BookingPolicy = {
  timezone: string;
  minAdvanceMinutes: number;
  maxAdvanceDays: number;
  slotIntervalMinutes: number;
  onlineRequiresApproval: boolean;
  onlineBookingEnabled: boolean;
  cancellationNoticeHours: number;
};

export async function loadPolicy(tx: Tx, orgId: string): Promise<BookingPolicy> {
  const [o] = await tx<{
    timezone: string; min_advance_minutes: number; max_advance_days: number; slot_interval_minutes: number;
    online_requires_approval: boolean; online_booking_enabled: boolean; cancellation_notice_hours: number;
  }[]>`select timezone, min_advance_minutes, max_advance_days, slot_interval_minutes, online_requires_approval,
              online_booking_enabled, cancellation_notice_hours
       from app.organizations where id = ${orgId}`;
  if (!o) throw new DomainError("Organização não encontrada.");
  return {
    timezone: o.timezone,
    minAdvanceMinutes: o.min_advance_minutes,
    maxAdvanceDays: o.max_advance_days,
    slotIntervalMinutes: o.slot_interval_minutes,
    onlineRequiresApproval: o.online_requires_approval,
    onlineBookingEnabled: o.online_booking_enabled,
    cancellationNoticeHours: o.cancellation_notice_hours,
  };
}

export type ServicePick = { id: string; name: string; price_cents: number; duration_minutes: number; buffer_after_minutes: number };

/** Carrega serviços ativos na ordem informada. */
export async function loadServices(tx: Tx, orgId: string, ids: string[], opts: { onlineOnly?: boolean } = {}): Promise<ServicePick[]> {
  if (ids.length === 0) throw new DomainError("Escolha pelo menos um serviço.");
  if (new Set(ids).size !== ids.length) throw new DomainError("Serviço repetido no agendamento.");
  const rows = await tx<(ServicePick & { online_bookable: boolean })[]>`
    select id, name, price_cents, duration_minutes, buffer_after_minutes, online_bookable
    from app.services where organization_id = ${orgId} and is_active and id in ${tx(ids)}`;
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => {
    const s = byId.get(id);
    if (!s || (opts.onlineOnly && !s.online_bookable)) throw new DomainError("Serviço indisponível.");
    return s;
  });
}

export function totals(services: ServicePick[]) {
  return {
    minutes: services.reduce((a, s) => a + s.duration_minutes, 0),
    bufferAfter: services.at(-1)?.buffer_after_minutes ?? 0,
    priceCents: services.reduce((a, s) => a + s.price_cents, 0),
  };
}

export async function professionalCanDo(tx: Tx, orgId: string, professionalId: string, serviceIds: string[]): Promise<boolean> {
  const [r] = await tx<{ n: number }[]>`
    select count(*)::int as n from app.professional_services
    where organization_id = ${orgId} and professional_id = ${professionalId} and service_id in ${tx(serviceIds)}`;
  return r?.n === serviceIds.length;
}

export async function loadWorkingHours(tx: Tx, orgId: string, professionalId: string): Promise<WorkingWindow[]> {
  const rows = await tx<{ weekday: number; start_time: string; end_time: string }[]>`
    select weekday, to_char(start_time, 'HH24:MI') as start_time, to_char(end_time, 'HH24:MI') as end_time
    from app.working_hours where organization_id = ${orgId} and professional_id = ${professionalId}`;
  return rows.map((r) => ({ weekday: r.weekday, start: r.start_time, end: r.end_time }));
}

/** Compromissos que ocupam a agenda (agendamentos ativos + bloqueios) em um intervalo. */
export async function loadBusy(
  tx: Tx, orgId: string, professionalId: string, from: Date, to: Date, excludeAppointmentId?: string,
): Promise<TimeRange[]> {
  const rows = await tx<{ s: Date; e: Date }[]>`
    select starts_at as s, blocked_until as e from app.appointments
    where organization_id = ${orgId} and professional_id = ${professionalId}
      and status in ('pending', 'confirmed', 'completed') and not allow_overlap
      and starts_at < ${to} and blocked_until > ${from}
      and (${excludeAppointmentId ?? null}::uuid is null or id <> ${excludeAppointmentId ?? null}::uuid)
    union all
    select starts_at, ends_at from app.time_off
    where organization_id = ${orgId} and (professional_id = ${professionalId} or professional_id is null)
      and starts_at < ${to} and ends_at > ${from}`;
  return rows.map((r) => ({ start: r.s, end: r.e }));
}

export async function slotsForProfessional(
  tx: Tx,
  orgId: string,
  professionalId: string,
  date: string,
  policy: BookingPolicy,
  minutes: number,
  bufferAfter: number,
  now = new Date(),
  opts: { ignoreAdvanceRules?: boolean } = {},
): Promise<Date[]> {
  const dayStart = zonedDateTime(date, "00:00", policy.timezone);
  const dayEnd = zonedDateTime(addDaysToKey(date, 1), "00:00", policy.timezone);
  const [hours, busy] = await Promise.all([
    loadWorkingHours(tx, orgId, professionalId),
    loadBusy(tx, orgId, professionalId, dayStart, new Date(dayEnd.getTime() + 12 * 3_600_000)),
  ]);
  return availableSlots({
    date,
    timeZone: policy.timezone,
    workingHours: hours,
    busy,
    serviceMinutes: minutes,
    bufferAfterMinutes: bufferAfter,
    slotIntervalMinutes: policy.slotIntervalMinutes,
    now,
    minAdvanceMinutes: opts.ignoreAdvanceRules ? 0 : policy.minAdvanceMinutes,
    maxAdvanceDays: opts.ignoreAdvanceRules ? 3650 : policy.maxAdvanceDays,
  });
}

/**
 * Validação de gravação: trava a linha da profissional (serializa reservas concorrentes
 * da mesma agenda) e confere expediente e bloqueios. A restrição de exclusão no banco
 * continua sendo a garantia final contra sobreposição.
 */
export async function assertSlotBookable(
  tx: Tx,
  orgId: string,
  professionalId: string,
  date: string,
  range: TimeRange,
  blockedUntil: Date,
  policy: BookingPolicy,
  opts: { excludeAppointmentId?: string; squeezeIn?: boolean } = {}, // encaixe: ignora expediente e conflitos
) {
  const [prof] = await tx<{ id: string; is_active: boolean }[]>`
    select id, is_active from app.professionals where organization_id = ${orgId} and id = ${professionalId} for update`;
  if (!prof) throw new DomainError("Profissional não encontrada.");
  if (!prof.is_active) throw new DomainError("Esta profissional está inativa.");
  if (!opts.squeezeIn) {
    const hours = await loadWorkingHours(tx, orgId, professionalId);
    if (!fitsWorkingHours(range, date, policy.timezone, hours))
      throw new DomainError("O horário está fora do expediente da profissional.", "outside_hours");
  }
  const busy = await loadBusy(tx, orgId, professionalId, range.start, blockedUntil, opts.excludeAppointmentId);
  if (!opts.squeezeIn && busy.some((b) => b.start < blockedUntil && range.start < b.end))
    throw new DomainError("Este horário já está ocupado. Escolha outro ou marque como encaixe.", "conflict");
}
