import { z } from "zod";
import type { Tx } from "@/server/db";
import { DomainError } from "@/server/errors";
import type { Actor } from "@/server/modules/appointments";
import type { Plan } from "@/domain/plans";
import { minutesOf, isDateKey, zonedDateTime } from "@/lib/time";
import { audit } from "@/server/modules/audit";

export const PROFESSIONAL_COLORS = ["#7c3a5c", "#3f6f6a", "#8a5a2b", "#4b5aa8", "#a0466b", "#5f7a3a", "#6b4fa0", "#2f6f8f"];

export const professionalSchema = z.object({
  displayName: z.string().trim().min(2, "Informe o nome.").max(80),
  specialty: z.string().trim().max(80).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default(PROFESSIONAL_COLORS[0]!),
  commissionPercent: z.coerce.number().min(0).max(100).default(0),
  acceptsOnline: z.boolean().default(true),
  serviceIds: z.array(z.uuid()).default([]),
});

export async function countActiveProfessionals(tx: Tx, orgId: string) {
  const [r] = await tx<{ n: number }[]>`select count(*)::int as n from app.professionals where organization_id = ${orgId} and is_active`;
  return r!.n;
}

export async function saveProfessional(tx: Tx, actor: Actor, plan: Plan, input: z.infer<typeof professionalSchema>, id?: string) {
  const orgId = actor.organizationId;
  let pid = id;
  if (!id) {
    if ((await countActiveProfessionals(tx, orgId)) >= plan.maxProfessionals)
      throw new DomainError(`Seu plano (${plan.name}) permite até ${plan.maxProfessionals} profissional(is) ativa(s). Faça upgrade para adicionar mais.`, "plan_limit");
    const [unit] = await tx<{ id: string }[]>`select id from app.units where organization_id = ${orgId} order by created_at limit 1`;
    const [p] = await tx<{ id: string }[]>`
      insert into app.professionals (organization_id, unit_id, display_name, specialty, color, commission_percent, accepts_online)
      values (${orgId}, ${unit?.id ?? null}, ${input.displayName}, ${input.specialty ?? null}, ${input.color}, ${input.commissionPercent}, ${input.acceptsOnline})
      returning id`;
    pid = p!.id;
    await setWorkingHours(tx, actor, pid, await defaultHours(tx, orgId));
  } else {
    const r = await tx`
      update app.professionals set display_name = ${input.displayName}, specialty = ${input.specialty ?? null}, color = ${input.color},
        commission_percent = ${input.commissionPercent}, accepts_online = ${input.acceptsOnline}
      where organization_id = ${orgId} and id = ${id}`;
    if (r.count === 0) throw new DomainError("Não achei essa profissional.");
  }
  await tx`delete from app.professional_services where organization_id = ${orgId} and professional_id = ${pid!}`;
  for (const sid of input.serviceIds)
    await tx`insert into app.professional_services (organization_id, professional_id, service_id) values (${orgId}, ${pid!}, ${sid})`;
  return pid!;
}

export async function setProfessionalActive(tx: Tx, actor: Actor, plan: Plan, id: string, active: boolean) {
  if (active && (await countActiveProfessionals(tx, actor.organizationId)) >= plan.maxProfessionals)
    throw new DomainError(`Seu plano permite até ${plan.maxProfessionals} profissional(is) ativa(s).`, "plan_limit");
  await tx`update app.professionals set is_active = ${active} where organization_id = ${actor.organizationId} and id = ${id}`;
  await audit(tx, actor, active ? "professional.activated" : "professional.deactivated", "professional", id);
}

export type HourWindow = { weekday: number; start: string; end: string };

export const hoursSchema = z
  .array(z.object({ weekday: z.number().int().min(0).max(6), start: z.string().regex(/^\d{2}:\d{2}$/), end: z.string().regex(/^\d{2}:\d{2}$/) }))
  .max(28)
  .superRefine((rows, ctx) => {
    for (const r of rows) if (minutesOf(r.end) <= minutesOf(r.start)) ctx.addIssue({ code: "custom", message: "O fim do expediente deve ser depois do início." });
    for (let d = 0; d < 7; d++) {
      const day = rows.filter((r) => r.weekday === d).sort((a, b) => minutesOf(a.start) - minutesOf(b.start));
      for (let i = 1; i < day.length; i++)
        if (minutesOf(day[i]!.start) < minutesOf(day[i - 1]!.end)) ctx.addIssue({ code: "custom", message: "Há períodos sobrepostos no mesmo dia." });
    }
  });

export async function setWorkingHours(tx: Tx, actor: Actor, professionalId: string, hours: HourWindow[]) {
  const parsed = hoursSchema.parse(hours);
  await tx`delete from app.working_hours where organization_id = ${actor.organizationId} and professional_id = ${professionalId}`;
  for (const h of parsed)
    await tx`insert into app.working_hours (organization_id, professional_id, weekday, start_time, end_time)
             values (${actor.organizationId}, ${professionalId}, ${h.weekday}, ${h.start}, ${h.end})`;
}

async function defaultHours(tx: Tx, orgId: string): Promise<HourWindow[]> {
  // Copia o expediente da primeira profissional; senão, seg–sáb 09:00–18:00.
  const rows = await tx<{ weekday: number; start: string; end: string }[]>`
    select weekday, to_char(start_time, 'HH24:MI') as start, to_char(end_time, 'HH24:MI') as end
    from app.working_hours where professional_id = (
      select id from app.professionals where organization_id = ${orgId} order by created_at limit 1)`;
  if (rows.length) return rows;
  return [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, start: "09:00", end: "18:00" }));
}

export const timeOffSchema = z.object({
  professionalId: z.uuid().nullable(),
  startDate: z.string().refine(isDateKey, "Data inválida."),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).default("00:00"),
  endDate: z.string().refine(isDateKey, "Data inválida."),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).default("23:59"),
  reason: z.string().trim().max(200).optional(),
});

export async function addTimeOff(tx: Tx, actor: Actor, timezone: string, input: z.infer<typeof timeOffSchema>) {
  const start = zonedDateTime(input.startDate, input.startTime, timezone);
  const end = zonedDateTime(input.endDate, input.endTime, timezone);
  if (end <= start) throw new DomainError("O fim do bloqueio precisa ser depois do início.");
  const [r] = await tx<{ id: string }[]>`
    insert into app.time_off (organization_id, professional_id, starts_at, ends_at, reason, created_by)
    values (${actor.organizationId}, ${input.professionalId}, ${start}, ${end}, ${input.reason ?? null}, ${actor.userId})
    returning id`;
  // Informa quantos agendamentos ativos já existem no período (não cancela automaticamente).
  const [c] = await tx<{ n: number }[]>`
    select count(*)::int as n from app.appointments
    where organization_id = ${actor.organizationId} and status in ('pending', 'confirmed')
      and (${input.professionalId}::uuid is null or professional_id = ${input.professionalId}::uuid)
      and starts_at < ${end} and blocked_until > ${start}`;
  return { id: r!.id, conflicts: c!.n };
}

export async function removeTimeOff(tx: Tx, actor: Actor, id: string) {
  await tx`delete from app.time_off where organization_id = ${actor.organizationId} and id = ${id}`;
}

export type ProfessionalRow = {
  id: string; display_name: string; specialty: string | null; color: string; commission_percent: string; accepts_online: boolean;
  is_active: boolean; service_ids: string[]; hours: HourWindow[]; user_id: string | null;
};

export async function listProfessionals(tx: Tx, orgId: string, opts: { activeOnly?: boolean } = {}) {
  return tx<ProfessionalRow[]>`
    select p.id, p.display_name, p.specialty, p.color, p.commission_percent::text, p.accepts_online, p.is_active, p.user_id,
      coalesce((select array_agg(service_id) from app.professional_services ps where ps.professional_id = p.id), '{}') as service_ids,
      coalesce((select json_agg(json_build_object('weekday', weekday, 'start', to_char(start_time, 'HH24:MI'), 'end', to_char(end_time, 'HH24:MI')) order by weekday, start_time)
                from app.working_hours w where w.professional_id = p.id), '[]') as hours
    from app.professionals p
    where p.organization_id = ${orgId} and (${!opts.activeOnly} or p.is_active)
    order by p.is_active desc, p.created_at`;
}

export async function listTimeOff(tx: Tx, orgId: string, from: Date) {
  return tx<{ id: string; professional_id: string | null; professional_name: string | null; starts_at: Date; ends_at: Date; reason: string | null }[]>`
    select t.id, t.professional_id, p.display_name as professional_name, t.starts_at, t.ends_at, t.reason
    from app.time_off t left join app.professionals p on p.id = t.professional_id
    where t.organization_id = ${orgId} and t.ends_at >= ${from}
    order by t.starts_at limit 100`;
}
