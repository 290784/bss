import type { Metadata } from "next";
import { requireAppContext, tenant } from "@/server/context";
import { listAgenda } from "@/server/modules/appointments";
import { listProfessionals, listTimeOff } from "@/server/modules/team";
import { listServices } from "@/server/modules/catalog";
import { can } from "@/domain/permissions";
import { addDaysToKey, isDateKey, localDateKey, localWeekday, zonedDateTime } from "@/lib/time";
import { receiptUrl } from "@/server/modules/receipt";
import { AgendaView, type AgendaViewMode } from "./agenda-view";

export const metadata: Metadata = { title: "Agenda" };

function rangeFor(view: AgendaViewMode, date: string) {
  if (view === "semana") {
    const start = addDaysToKey(date, -((localWeekday(date) + 6) % 7));
    return { start, end: addDaysToKey(start, 7) };
  }
  if (view === "mes") {
    const first = date.slice(0, 8) + "01";
    const gridStart = addDaysToKey(first, -((localWeekday(first) + 6) % 7));
    return { start: gridStart, end: addDaysToKey(gridStart, 42) };
  }
  return { start: date, end: addDaysToKey(date, 1) };
}

export default async function AgendaPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireAppContext();
  const sp = await searchParams;
  const tz = ctx.org.timezone;
  const today = localDateKey(new Date(), tz);
  const date = sp.data && isDateKey(sp.data) ? sp.data : today;
  const view: AgendaViewMode = sp.visao === "semana" || sp.visao === "mes" || sp.visao === "lista" ? sp.visao : "dia";
  const seeAll = can(ctx.role, "agenda.view_all");
  const { start, end } = rangeFor(view, date);
  const from = zonedDateTime(start, "00:00", tz);
  const to = zonedDateTime(end, "00:00", tz);

  const data = await tenant(ctx, async (tx) => {
    const [professionals, services, items, timeOff] = await Promise.all([
      listProfessionals(tx, ctx.org.id, { activeOnly: true }),
      listServices(tx, ctx.org.id, { activeOnly: true }),
      listAgenda(tx, ctx.org.id, from, to, seeAll ? null : ctx.professionalId),
      listTimeOff(tx, ctx.org.id, from),
    ]);
    return { professionals, services, items, timeOff: timeOff.filter((t) => t.starts_at < to) };
  });

  const visiblePros = seeAll ? data.professionals : data.professionals.filter((p) => p.id === ctx.professionalId);

  return (
    <AgendaView
      key={`${view}-${date}`}
      view={view}
      explicitView={!!sp.visao}
      date={date}
      today={today}
      rangeStart={start}
      rangeEnd={end}
      timeZone={tz}
      initialProfessionalId={sp.profissional ?? null}
      openAppointmentId={sp.agendamento ?? null}
      openConfirmations={sp.confirmacoes === "1"}
      readOnly={ctx.access === "read_only"}
      canManage={ctx.access !== "read_only" && can(ctx.role, "agenda.manage")}
      canSeeAll={seeAll}
      canCreateClients={can(ctx.role, "clients.manage")}
      professionals={visiblePros.map((p) => ({ id: p.id, name: p.display_name, color: p.color, serviceIds: p.service_ids, hours: p.hours }))}
      services={data.services.map((s) => ({ id: s.id, name: s.name, priceCents: s.price_cents, minutes: s.duration_minutes, category: s.category }))}
      items={data.items.map((a) => ({
        id: a.id, professionalId: a.professional_id, clientName: a.client_name, startsAt: a.starts_at.toISOString(),
        endsAt: a.ends_at.toISOString(), status: a.status, source: a.source, services: a.services, squeezeIn: a.allow_overlap,
        priceCents: a.price_cents - a.discount_cents, paidCents: a.paid_cents,
        serviceNames: a.service_names, clientPhone: a.client_phone, receiptUrl: receiptUrl(ctx.org.slug, a.public_token),
        clientConfirmedAt: a.client_confirmed_at?.toISOString() ?? null, confirmationSentAt: a.confirmation_sent_at?.toISOString() ?? null,
      }))}
      timeOff={data.timeOff.map((t) => ({ id: t.id, professionalId: t.professional_id, startsAt: t.starts_at.toISOString(), endsAt: t.ends_at.toISOString(), reason: t.reason }))}
    />
  );
}
