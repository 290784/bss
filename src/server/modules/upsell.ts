import type { Tx } from "@/server/db";
import { fitsWorkingHours } from "@/domain/availability";
import { formatMoney } from "@/lib/money";
import { localDateKey } from "@/lib/time";
import { loadBusy, loadWorkingHours } from "@/server/modules/scheduling";

/**
 * Sugestões para subir o ticket de um agendamento, só com dados reais do estabelecimento:
 * 1. serviços que outras clientes que fizeram o mesmo serviço também fazem (histórico de
 *    atendimentos confirmados/concluídos);
 * 2. na falta de histórico, serviços da mesma categoria.
 * Só entram serviços ativos que a mesma profissional realiza e que ainda não estão no
 * agendamento. `fitsRightAfter` diz se dá para emendar logo depois, sem conflito.
 */

export type Suggestion = {
  id: string; name: string; priceCents: number; minutes: number;
  reason: string; peers: number; fitsRightAfter: boolean;
};

export async function suggestRelatedServices(tx: Tx, orgId: string, appointmentId: string, limit = 3): Promise<Suggestion[]> {
  const [appt] = await tx<{ professional_id: string; starts_at: Date; ends_at: Date; status: string; allow_overlap: boolean; timezone: string }[]>`
    select a.professional_id, a.starts_at, a.ends_at, a.status, a.allow_overlap, o.timezone
    from app.appointments a join app.organizations o on o.id = a.organization_id
    where a.organization_id = ${orgId} and a.id = ${appointmentId}`;
  if (!appt || appt.status === "cancelled" || appt.status === "no_show") return [];

  const rows = await tx<{ id: string; name: string; price_cents: number; duration_minutes: number; buffer_after_minutes: number; peers: number; same_category: boolean }[]>`
    with booked as (
      select service_id from app.appointment_services
      where organization_id = ${orgId} and appointment_id = ${appointmentId} and service_id is not null
    ), cats as (
      select distinct category_id from app.services where organization_id = ${orgId} and id in (select service_id from booked) and category_id is not null
    ), peers as (
      select distinct a.client_id from app.appointments a
      join app.appointment_services s on s.appointment_id = a.id
      where a.organization_id = ${orgId} and a.id <> ${appointmentId} and a.status in ('confirmed', 'completed')
        and s.service_id in (select service_id from booked)
    ), together as (
      select s.service_id, count(distinct a.client_id)::int as n from app.appointments a
      join app.appointment_services s on s.appointment_id = a.id
      where a.organization_id = ${orgId} and a.id <> ${appointmentId} and a.status in ('confirmed', 'completed')
        and a.client_id in (select client_id from peers) and s.service_id is not null
      group by s.service_id
    )
    select sv.id, sv.name, sv.price_cents, sv.duration_minutes, sv.buffer_after_minutes,
      coalesce(t.n, 0) as peers, (sv.category_id in (select category_id from cats)) is true as same_category
    from app.services sv
    join app.professional_services ps on ps.service_id = sv.id and ps.organization_id = ${orgId} and ps.professional_id = ${appt.professional_id}
    left join together t on t.service_id = sv.id
    where sv.organization_id = ${orgId} and sv.is_active and sv.id not in (select service_id from booked)
      and (coalesce(t.n, 0) > 0 or sv.category_id in (select category_id from cats))
    order by coalesce(t.n, 0) desc, same_category desc, sv.price_cents desc, sv.name
    limit ${limit}`;
  if (rows.length === 0) return [];

  // Cabe logo depois? Mesma regra da gravação: expediente + agenda livre (ignorando o próprio agendamento).
  const date = localDateKey(appt.starts_at, appt.timezone);
  const longest = Math.max(...rows.map((r) => r.duration_minutes + r.buffer_after_minutes));
  const [hours, busy] = await Promise.all([
    loadWorkingHours(tx, orgId, appt.professional_id),
    loadBusy(tx, orgId, appt.professional_id, appt.ends_at, new Date(appt.ends_at.getTime() + longest * 60_000), appointmentId),
  ]);
  return rows.map((r) => {
    const end = new Date(appt.ends_at.getTime() + r.duration_minutes * 60_000);
    const blocked = new Date(end.getTime() + r.buffer_after_minutes * 60_000);
    const fits = appt.allow_overlap || (
      fitsWorkingHours({ start: appt.starts_at, end }, date, appt.timezone, hours) &&
      !busy.some((b) => b.start < blocked && appt.ends_at < b.end));
    return {
      id: r.id, name: r.name, priceCents: r.price_cents, minutes: r.duration_minutes, peers: r.peers, fitsRightAfter: fits,
      reason: r.peers > 0
        ? `${r.peers} ${r.peers === 1 ? "cliente que fez" : "clientes que fizeram"} o mesmo serviço também ${r.peers === 1 ? "fez" : "fizeram"} este`
        : "Da mesma categoria do serviço agendado",
    };
  });
}

/** Trecho curto para notificações: "Para subir o ticket: X (+R$ 30), Y (+R$ 20)." */
export function upsellLine(s: Suggestion[]) {
  if (s.length === 0) return "";
  return ` Para subir o ticket: ${s.map((x) => `${x.name} (+${formatMoney(x.priceCents)})`).join(", ")}.`;
}
