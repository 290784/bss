import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarPlus, Check, ChevronRight, Link2, UserPlus } from "lucide-react";
import { Illustration, type IllustrationName } from "@/components/ui/illustration";
import { requireAppContext, tenant } from "@/server/context";
import { can } from "@/domain/permissions";
import { freeGapsToday, loadDashboard, loadTrends } from "@/server/modules/dashboard";
import { listAgenda } from "@/server/modules/appointments";
import { Card, CardHeader, EmptyState, PageHeader, StatusBadge, STATUS_STYLE } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { addDaysToKey, formatInTz, localDateKey, localTime, zonedDateTime } from "@/lib/time";
import { cn } from "@/lib/cn";
import { AvisosTicker } from "./avisos-ticker";
import { loadDicas, type Dica } from "@/server/modules/dicas";
import { CopyLink } from "./copy-link";
import { NextClientCard } from "./next-client";
import { Kpi } from "./dashboard-kpi";
import { receiptUrl } from "@/server/modules/receipt";
import { plural } from "@/lib/text";

export const metadata: Metadata = { title: "Início" };

/** Avisos da faixa abrem a dica na tela de Dicas. */
const tickerItem = (d: Dica) => ({
  id: d.id, text: d.title, kind: d.kind, href: `/app/dicas#dica-${d.id}`, urgent: d.urgent,
  value: d.value && d.value.cents > 0 ? formatMoney(d.value.cents) : undefined,
});

/**
 * Início: só o que importa hoje (próxima cliente, agenda do dia, quatro números do mês e atalhos).
 * Os números completos ficam em Relatórios e as dicas em Dicas.
 */
export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ "bem-vinda"?: string; periodo?: string }> }) {
  const ctx = await requireAppContext();
  if (!can(ctx.role, "dashboard.view")) redirect("/app/agenda");
  const sp = await searchParams;
  // Links antigos com ?periodo= abrem os relatórios no mesmo período.
  if (sp.periodo) redirect(`/app/relatorios?periodo=${encodeURIComponent(sp.periodo)}`);
  const tz = ctx.org.timezone;
  const finance = can(ctx.role, "finance.view");
  const todayKey = localDateKey(new Date(), tz);
  const canBook = ctx.access !== "read_only";

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const bookingUrl = `${appUrl}/b/${ctx.org.slug}`;
  const { d, trends, todayItems, gaps, setup, dicas } = await tenant(ctx, async (tx) => {
    const [d, trends, todayItems, gaps, [setup], dicas] = await Promise.all([
      loadDashboard(tx, ctx.org.id, tz, "month", { includeFinance: finance }),
      loadTrends(tx, ctx.org.id, tz),
      listAgenda(tx, ctx.org.id, zonedDateTime(todayKey, "00:00", tz), zonedDateTime(addDaysToKey(todayKey, 1), "00:00", tz)),
      freeGapsToday(tx, ctx.org.id, tz),
      tx<{ services: number; clients: number; appointments: number; hours: number }[]>`
        select (select count(*) from app.services where organization_id = ${ctx.org.id} and is_active)::int as services,
               (select count(*) from app.clients where organization_id = ${ctx.org.id})::int as clients,
               (select count(*) from app.appointments where organization_id = ${ctx.org.id})::int as appointments,
               (select count(*) from app.working_hours where organization_id = ${ctx.org.id})::int as hours`,
      loadDicas(tx, ctx.org.id, tz, { finance, bookingUrl }),
    ]);
    return { d, trends, todayItems, gaps, setup: setup!, dicas };
  });

  const activation = [
    { done: setup.services > 0, label: "Cadastre seus serviços", href: "/app/servicos" },
    { done: setup.hours > 0, label: "Defina seus horários", href: "/app/equipe" },
    { done: setup.clients > 0, label: "Cadastre sua primeira cliente", href: "/app/clientes?nova=1" },
    { done: setup.appointments > 0, label: "Marque o primeiro horário", href: "/app/agenda" },
  ];
  const activationDone = activation.every((a) => a.done);
  const activeToday = todayItems.filter((i) => i.status !== "cancelled");
  // Próxima cliente: o primeiro atendimento de hoje que ainda não terminou.
  const now = new Date().getTime();
  const upcoming = activeToday.filter((i) => (i.status === "pending" || i.status === "confirmed") && i.ends_at.getTime() > now);
  const next = upcoming[0];

  const shortcuts: { href: string; label: string; hint: string; art: IllustrationName; show: boolean }[] = [
    { href: "/app/agenda", label: "Marcar horário", hint: "Abre a agenda", art: "calendar-plus", show: canBook },
    { href: "/app/clientes?nova=1", label: "Nova cliente", hint: "Cadastro rápido", art: "user-plus", show: canBook && can(ctx.role, "clients.view") },
    { href: "/app/dicas", label: "Dicas", hint: dicas.length ? plural(dicas.length, "ideia") + " para faturar mais" : "Nada pendente", art: "lightbulb", show: true },
    { href: "/app/relatorios", label: "Relatórios", hint: "Todos os números", art: "chart", show: true },
  ];

  return (
    <div>
      <PageHeader
        art="sparkles"
        title={sp["bem-vinda"] ? `Tudo pronto, ${ctx.user.fullName.split(" ")[0]}` : `Oi, ${ctx.user.fullName.split(" ")[0]}`}
        description={<span className="first-letter:uppercase">{formatInTz(new Date(), tz, { weekday: "long", day: "numeric", month: "long" })} · {plural(activeToday.length, "atendimento")} hoje</span>}
        actions={canBook && <ButtonLink href="/app/agenda" size="md"><CalendarPlus className="h-4 w-4" />Agendar</ButtonLink>}
      />

      {!activationDone && (
        <Card className="mb-6 overflow-hidden">
          <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="font-serif text-[22px] font-semibold">Vamos deixar tudo pronto?</h2>
              <p className="mt-1 text-sm text-muted">Faltam poucos passos para as clientes começarem a marcar com você. {activation.filter((a) => a.done).length} de {activation.length} prontos.</p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {activation.map((a) => (
                  <li key={a.label}>
                    <Link href={a.href} className={cn("lift flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm", a.done ? "border-transparent bg-st-completed-bg text-st-completed" : "border-line hover:border-accent")}>
                      <span className={cn("grid h-5 w-5 place-items-center rounded-full border", a.done ? "border-st-completed bg-st-completed text-white" : "border-line-strong")}>{a.done && <Check className="h-3 w-3" />}</span>
                      {a.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div data-theme="dark" className="relative overflow-hidden rounded-2xl bg-plum p-5 text-white md:w-72">
              <div className="flex items-center gap-2 text-sm font-medium"><Link2 className="h-4 w-4" />Seu link de agendamento</div>
              <p className="mt-1 mb-3 text-xs text-white/65">Coloque na bio do Instagram e mande no WhatsApp: as clientes marcam sozinhas, 24h.</p>
              <CopyLink url={bookingUrl} />
            </div>
          </div>
        </Card>
      )}

      {setup.appointments > 0 && (
        <AvisosTicker items={[
          // Urgentes primeiro, depois os pontos de atenção e o resto das dicas (já em ordem de importância).
          ...dicas.filter((x) => x.urgent).map(tickerItem),
          ...trends.alerts.map((a, i) => ({ id: `alerta-${i}`, text: a.title, kind: "atencao" as const, href: "/app/relatorios#fica-de-olho" })),
          ...dicas.filter((x) => !x.urgent).map(tickerItem),
        ]} />
      )}

      {next && (
        <NextClientCard timeZone={tz} now={now} later={upcoming.length - 1} canManage={canBook && can(ctx.role, "agenda.manage")}
          next={{
            id: next.id, date: todayKey, clientName: next.client_name, clientPhone: next.client_phone, services: next.service_names,
            professionalName: next.professional_name, startsAt: next.starts_at.toISOString(), endsAt: next.ends_at.toISOString(),
            status: next.status as "pending" | "confirmed", clientConfirmedAt: next.client_confirmed_at?.toISOString() ?? null,
            confirmationSentAt: next.confirmation_sent_at?.toISOString() ?? null, receiptUrl: receiptUrl(ctx.org.slug, next.public_token),
          }} />
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader art="calendar" title="Hoje" description={plural(activeToday.length, "atendimento")} action={<Link href="/app/agenda" className="text-[13px] font-medium text-accent-text hover:underline">Ver agenda</Link>} />
          <div className="px-5 pt-3 pb-5 sm:px-6 sm:pb-6">
            {activeToday.length === 0 ? (
              <EmptyState className="py-6" art="clock" title="Dia livre por aqui" description="Que tal mandar seu link para as clientes e encher essa agenda?" />
            ) : (
              <ul className="flex flex-col divide-y divide-line/70">
                {activeToday.slice(0, 8).map((a) => (
                  <li key={a.id}>
                    <Link href={`/app/agenda?data=${todayKey}&agendamento=${a.id}`} className="row-link -mx-2 flex items-center gap-3 rounded-xl px-2 py-3">
                      <span className="w-11 text-sm font-semibold tabular">{localTime(a.starts_at, tz)}</span>
                      <span className={cn("h-8 w-1 rounded-full", STATUS_STYLE[a.status].dot)} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{a.client_name}</span>
                        <span className="block truncate text-xs text-muted">{a.services}</span>
                      </span>
                      <StatusBadge status={a.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {activeToday.length > 8 && <Link href="/app/agenda" className="mt-2 inline-block text-[13px] font-medium text-accent-text hover:underline">Ver os outros {activeToday.length - 8} na agenda</Link>}
            {gaps.length > 0 && (
              <div className="mt-4 rounded-2xl border border-highlight-border/60 bg-highlight-subtle p-3.5">
                <div className="mb-1.5 text-[13px] font-medium text-highlight-text">Horários livres hoje: dá para encaixar alguém</div>
                <ul className="flex flex-wrap gap-1.5">
                  {gaps.slice(0, 6).map((g, i) => (
                    <li key={i} className="rounded-full bg-surface px-2.5 py-1 text-xs text-ink-soft tabular">
                      {localTime(g.start, tz)}–{localTime(g.end, tz)}{d.byProfessional.length > 1 ? ` · ${g.name}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader art="sparkles" title="Atalhos" />
            <ul className="grid grid-cols-2 gap-2.5 px-5 pt-4 pb-5 sm:px-6 sm:pb-6 lg:grid-cols-1">
              {shortcuts.filter((x) => x.show).map((x) => (
                <li key={x.href}>
                  <Link href={x.href} className="lift flex h-full items-center gap-3 rounded-2xl border border-line/70 bg-surface p-3">
                    <Illustration name={x.art} className="h-14 w-14 -my-1" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{x.label}</span>
                      <span className="hidden truncate text-xs text-muted sm:block">{x.hint}</span>
                    </span>
                    <ChevronRight className="seta hidden h-4 w-4 shrink-0 text-muted sm:block" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          {activationDone && (
            <div data-theme="dark" className="relative overflow-hidden rounded-[var(--radius-card)] bg-plum p-5 text-white">
              <div className="flex items-center gap-2 text-sm font-medium"><Link2 className="h-4 w-4" />Seu link de agendamento</div>
              <p className="mt-1 mb-3 text-xs text-white/65">Mande no WhatsApp ou coloque na bio: as clientes marcam sozinhas.</p>
              <CopyLink url={bookingUrl} />
            </div>
          )}
        </div>
      </div>

      <section aria-labelledby="mes" className="mt-8">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 id="mes" className="font-serif text-[20px] font-semibold">Este mês</h2>
          <Link href="/app/relatorios" className="inline-flex min-h-10 items-center gap-0.5 text-[13px] font-medium text-accent-text hover:underline">Ver relatórios<ChevronRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {d.revenue && <Kpi highlight label="Recebido" metric="revenue_received" value={formatMoney(d.revenue.value)} change={d.revenue.change} />}
          <Kpi highlight={!d.revenue} label="Previsto na agenda" metric="scheduled_value" value={formatMoney(d.scheduledValue.value)} change={d.scheduledValue.change} />
          <Kpi label="Atendimentos" metric="appointments_count" value={String(d.appointments.value)} change={d.appointments.change} />
          <Kpi label="Agenda ocupada" metric="occupancy" value={d.occupancy.value === null ? "—" : `${Math.round(d.occupancy.value * 100)}%`}
            sub={d.occupancy.capacityMinutes ? `${Math.round(d.occupancy.bookedMinutes / 60)}h de ${Math.round(d.occupancy.capacityMinutes / 60)}h` : "Sem horário de atendimento no período"} />
          {!d.revenue && <Kpi label="Clientes novas" metric="new_clients" value={String(d.newClients.value)} change={d.newClients.change} sub={`${d.returningClients.value} voltaram`} />}
        </div>
      </section>

      {setup.clients === 0 && (
        <div className="mt-6 flex justify-center"><ButtonLink href="/app/clientes?nova=1" variant="secondary"><UserPlus className="h-4 w-4" />Cadastrar cliente</ButtonLink></div>
      )}
    </div>
  );
}
