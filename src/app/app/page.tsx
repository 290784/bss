import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, CalendarPlus, Check, Clock, Link2, UserPlus, Users } from "lucide-react";
import { requireAppContext, tenant } from "@/server/context";
import { can } from "@/domain/permissions";
import { METRIC_DEFINITIONS, type MetricKey } from "@/domain/metrics";
import { COMPARACAO, freeGapsToday, loadDashboard, PERIOD_LABEL, type PeriodId } from "@/server/modules/dashboard";
import { listAgenda } from "@/server/modules/appointments";
import { Card, CardHeader, EmptyState, InfoTip, PageHeader, StatusBadge, STATUS_STYLE } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { addDaysToKey, formatInTz, localDateKey, localTime, zonedDateTime } from "@/lib/time";
import { cn } from "@/lib/cn";
import { STATUS_LABEL } from "@/domain/appointment-status";
import { DashboardChart } from "./dashboard-chart";
import { CopyLink } from "./copy-link";
import { NextClientCard } from "./next-client";
import { receiptUrl } from "@/server/modules/receipt";
import { Sparkles } from "@/components/brand/sparkles";

export const metadata: Metadata = { title: "Início" };

const PERIODS: PeriodId[] = ["today", "week", "month", "30d"];

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ periodo?: string; "bem-vinda"?: string }> }) {
  const ctx = await requireAppContext();
  if (!can(ctx.role, "dashboard.view")) redirect("/app/agenda");
  const sp = await searchParams;
  const period: PeriodId = PERIODS.includes(sp.periodo as PeriodId) ? (sp.periodo as PeriodId) : "month";
  const tz = ctx.org.timezone;
  const finance = can(ctx.role, "finance.view");
  const todayKey = localDateKey(new Date(), tz);

  const { d, todayItems, gaps, setup } = await tenant(ctx, async (tx) => {
    const [d, todayItems, gaps, [setup]] = await Promise.all([
      loadDashboard(tx, ctx.org.id, tz, period, { includeFinance: finance }),
      listAgenda(tx, ctx.org.id, zonedDateTime(todayKey, "00:00", tz), zonedDateTime(addDaysToKey(todayKey, 1), "00:00", tz)),
      freeGapsToday(tx, ctx.org.id, tz),
      tx<{ services: number; clients: number; appointments: number; hours: number }[]>`
        select (select count(*) from app.services where organization_id = ${ctx.org.id} and is_active)::int as services,
               (select count(*) from app.clients where organization_id = ${ctx.org.id})::int as clients,
               (select count(*) from app.appointments where organization_id = ${ctx.org.id})::int as appointments,
               (select count(*) from app.working_hours where organization_id = ${ctx.org.id})::int as hours`,
    ]);
    return { d, todayItems, gaps, setup: setup! };
  });

  const activation = [
    { done: setup.services > 0, label: "Cadastrar serviços", href: "/app/servicos" },
    { done: setup.hours > 0, label: "Definir horários de atendimento", href: "/app/equipe" },
    { done: setup.clients > 0, label: "Cadastrar a primeira cliente", href: "/app/clientes?nova=1" },
    { done: setup.appointments > 0, label: "Criar o primeiro agendamento", href: "/app/agenda" },
  ];
  const activationDone = activation.every((a) => a.done);
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const activeToday = todayItems.filter((i) => i.status !== "cancelled");
  // Próxima cliente: o primeiro atendimento de hoje que ainda não terminou.
  const now = new Date().getTime();
  const upcoming = activeToday.filter((i) => (i.status === "pending" || i.status === "confirmed") && i.ends_at.getTime() > now);
  const next = upcoming[0];

  const series = d.series.map((s) => ({
    label: s.day.slice(8),
    longLabel: s.day.split("-").reverse().join("/"),
    values: { revenue: s.revenue, appointments: s.appointments },
  }));

  return (
    <div>
      <PageHeader
        title={sp["bem-vinda"] ? `Tudo pronto, ${ctx.user.fullName.split(" ")[0]}!` : `Olá, ${ctx.user.fullName.split(" ")[0]}`}
        description={<span className="first-letter:uppercase">{formatInTz(new Date(), tz, { weekday: "long", day: "numeric", month: "long" })} · {activeToday.length} atendimento(s) hoje</span>}
        actions={<>
          <nav aria-label="Período" className="flex max-w-full overflow-x-auto rounded-[10px] bg-sunken p-1">
            {PERIODS.map((p) => (
              <Link key={p} href={`/app?periodo=${p}`} aria-current={p === period ? "page" : undefined}
                className={cn("h-10 shrink-0 rounded-lg px-3 text-[13px] leading-10 sm:h-8 sm:leading-8 font-medium whitespace-nowrap", p === period ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink")}>
                {PERIOD_LABEL[p]}
              </Link>
            ))}
          </nav>
          {ctx.access !== "read_only" && <ButtonLink href="/app/agenda" size="md"><CalendarPlus className="h-4 w-4" />Agendar</ButtonLink>}
        </>}
      />

      {!activationDone && (
        <Card className="mb-6 overflow-hidden">
          <div className="grid gap-6 p-5 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="font-tight tracking-[-0.02em] text-xl font-extrabold">Primeiros passos</h2>
              <p className="mt-1 text-sm text-muted">Complete para começar a receber agendamentos. {activation.filter((a) => a.done).length} de {activation.length} concluídos.</p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {activation.map((a) => (
                  <li key={a.label}>
                    <Link href={a.href} className={cn("lift flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm", a.done ? "border-transparent bg-st-completed-bg text-st-completed" : "border-line hover:border-accent")}>
                      <span className={cn("grid h-5 w-5 place-items-center rounded-full border", a.done ? "border-st-completed bg-st-completed text-white" : "border-line-strong")}>{a.done && <Check className="h-3 w-3" />}</span>
                      {a.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div data-theme="dark" className="bg-royal ring-glass relative overflow-hidden rounded-[22px] p-4 text-white md:w-72">
              <Sparkles points={[[82, 14, 8, 0.2], [92, 62, 6, 1.6], [60, 82, 5, 2.4]]} />
              <div className="flex items-center gap-2 text-sm font-medium"><Link2 className="h-4 w-4" />Sua página de agendamento</div>
              <p className="mt-1 mb-3 text-xs text-white/65">Coloque na bio do Instagram e envie no WhatsApp.</p>
              <CopyLink url={`${appUrl}/b/${ctx.org.slug}`} />
            </div>
          </div>
        </Card>
      )}

      {next && (
        <NextClientCard timeZone={tz} now={now} later={upcoming.length - 1} canManage={ctx.access !== "read_only" && can(ctx.role, "agenda.manage")}
          next={{
            id: next.id, date: todayKey, clientName: next.client_name, clientPhone: next.client_phone, services: next.service_names,
            professionalName: next.professional_name, startsAt: next.starts_at.toISOString(), endsAt: next.ends_at.toISOString(),
            status: next.status as "pending" | "confirmed", clientConfirmedAt: next.client_confirmed_at?.toISOString() ?? null,
            confirmationSentAt: next.confirmation_sent_at?.toISOString() ?? null, receiptUrl: receiptUrl(ctx.org.slug, next.public_token),
          }} />
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {d.revenue && <Kpi highlight label="Recebido" metric="revenue_received" value={formatMoney(d.revenue.value)} change={d.revenue.change} />}
        <Kpi highlight={!d.revenue} label="Valor agendado" metric="scheduled_value" value={formatMoney(d.scheduledValue.value)} change={d.scheduledValue.change} />
        <Kpi label="Atendimentos" metric="appointments_count" value={String(d.appointments.value)} change={d.appointments.change} />
        <Kpi label="Ocupação da agenda" metric="occupancy" value={d.occupancy.value === null ? "—" : `${Math.round(d.occupancy.value * 100)}%`}
          sub={d.occupancy.capacityMinutes ? `${Math.round(d.occupancy.bookedMinutes / 60)}h de ${Math.round(d.occupancy.capacityMinutes / 60)}h` : "Sem expediente no período"} />
        {d.averageTicket && <Kpi label="Ticket médio" metric="average_ticket" value={d.averageTicket.value === null ? "—" : formatMoney(d.averageTicket.value)} />}
        <Kpi label="Faltas" metric="no_show_rate" value={String(d.noShows.value)} invert change={d.noShows.change}
          sub={d.noShowRate.value === null ? "Sem atendimentos realizados" : `${Math.round(d.noShowRate.value * 100)}% dos atendimentos previstos`} />
        <Kpi label="Clientes novas" metric="new_clients" value={String(d.newClients.value)} change={d.newClients.change} sub={`${d.returningClients.value} retornando`} />
        {d.receivable && <Kpi label="A receber" metric="receivable" value={formatMoney(d.receivable.total)} sub={`${d.receivable.count} atendimento(s) concluído(s) em aberto`} />}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader title="Evolução diária" description={`${PERIOD_LABEL[period]} · ${COMPARACAO[period]} nos indicadores acima`} />
          <div className="px-5 pt-4 pb-5">
            <DashboardChart data={series} includeRevenue={finance} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Hoje" description={`${activeToday.length} atendimento(s)`} action={<Link href="/app/agenda" className="text-[13px] font-medium text-accent-text hover:underline">Abrir agenda</Link>} />
          <div className="px-5 pt-3 pb-5">
            {activeToday.length === 0 ? (
              <EmptyState className="py-6" icon={Clock} title="Nenhum atendimento hoje" description="Compartilhe sua página de agendamento para preencher a agenda." />
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {activeToday.slice(0, 8).map((a) => (
                  <li key={a.id}>
                    <Link href={`/app/agenda?data=${todayKey}&agendamento=${a.id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-hover-tint active:scale-[0.99]">
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
            {gaps.length > 0 && (
              <div className="mt-4 rounded-xl bg-highlight-subtle p-3">
                <div className="mb-1.5 text-[13px] font-medium text-highlight-text">Horários vagos hoje</div>
                <ul className="flex flex-wrap gap-1.5">
                  {gaps.slice(0, 6).map((g, i) => (
                    <li key={i} className="rounded-md bg-surface px-2 py-1 text-xs text-ink-soft tabular">
                      {localTime(g.start, tz)}–{localTime(g.end, tz)}{d.byProfessional.length > 1 ? ` · ${g.name}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Status dos atendimentos" description={PERIOD_LABEL[period]} />
          <div className="px-5 pt-4 pb-5">
            <StatusBreakdown counts={d.statusCounts} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Clientes para reativar" description="Sem visita há mais de 60 dias e sem agendamento futuro"
            action={<InfoTip text={METRIC_DEFINITIONS.inactive_clients} />} />
          <div className="px-5 pt-3 pb-5">
            {d.reactivate.length === 0 ? (
              <EmptyState className="py-6" icon={Users} title="Ninguém sumido por aqui" description="Quando uma cliente ficar mais de 60 dias sem voltar, ela aparece nesta lista." />
            ) : (
              <ul className="divide-y divide-line">
                {d.reactivate.map((c) => (
                  <li key={c.id}>
                    <Link href={`/app/clientes/${c.id}`} className="-mx-2 flex items-center justify-between rounded-xl px-2 py-2.5 text-sm transition hover:bg-hover-tint active:scale-[0.99]">
                      <span className="font-medium">{c.full_name}</span>
                      <span className="text-xs text-muted">{c.visits} visita(s) · última em {formatInTz(c.last_visit, tz, { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      {d.byProfessional.length > 1 && (
        <Card className="mt-6">
          <CardHeader title="Desempenho por profissional" description={PERIOD_LABEL[period]} action={<InfoTip text={METRIC_DEFINITIONS.produced_value} />} />
          <div className="overflow-x-auto px-5 pt-3 pb-5">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="text-left text-xs text-muted"><tr><th className="py-2 font-medium">Profissional</th><th className="py-2 text-right font-medium">Concluídos</th><th className="py-2 text-right font-medium">Faltas</th><th className="py-2 text-right font-medium">Horas agendadas</th>{finance && <th className="py-2 text-right font-medium">Produção</th>}</tr></thead>
              <tbody className="divide-y divide-line">
                {d.byProfessional.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2.5"><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: p.color }} aria-hidden />{p.name}</td>
                    <td className="py-2.5 text-right tabular">{p.completed}</td>
                    <td className="py-2.5 text-right tabular">{p.no_show}</td>
                    <td className="py-2.5 text-right tabular">{(p.booked_minutes / 60).toFixed(1).replace(".", ",")}</td>
                    {finance && <td className="py-2.5 text-right tabular">{formatMoney(p.produced)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {setup.clients === 0 && (
        <div className="mt-6 flex justify-center"><ButtonLink href="/app/clientes?nova=1" variant="secondary"><UserPlus className="h-4 w-4" />Cadastrar cliente</ButtonLink></div>
      )}
    </div>
  );
}

function Kpi({ label, value, change, sub, metric, invert, highlight }: { label: string; value: string; change?: number | null; sub?: string; metric: MetricKey; invert?: boolean; highlight?: boolean }) {
  const good = change !== undefined && change !== null && (invert ? change < 0 : change > 0);
  const bad = change !== undefined && change !== null && (invert ? change > 0 : change < 0);
  return (
    <Card data-theme={highlight ? "dark" : undefined} className={cn("relative overflow-hidden p-4", highlight && "bg-royal ring-glass border-transparent shadow-[0_20px_50px_-24px_rgb(147_3_197/0.9)]")}>
      {highlight && <Sparkles points={[[86, 18, 9, 0.3], [70, 70, 6, 1.7], [94, 78, 5, 2.6]]} />}
      <div className={cn("relative flex items-center gap-1 text-[13px]", highlight ? "text-violet-100" : "text-muted")}>{label}<InfoTip text={METRIC_DEFINITIONS[metric]} /></div>
      <div className="mt-1.5 text-[22px] leading-tight font-semibold tracking-[-0.01em] tabular sm:text-2xl">{value}</div>
      <div className="mt-1 flex min-h-[18px] flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
        {change !== undefined && (change === null
          ? <span className="text-muted">sem base no período anterior</span>
          : change === 0 ? <span className="text-muted">igual ao período anterior</span>
          : <span className={cn("inline-flex items-center gap-0.5 font-medium", good && "text-st-completed", bad && "text-st-noshow")}>
              {change > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{Math.abs(Math.round(change))}% vs. anterior
            </span>)}
        {sub && <span className="text-muted">{sub}</span>}
      </div>
    </Card>
  );
}

function StatusBreakdown({ counts }: { counts: Record<"pending" | "confirmed" | "completed" | "cancelled" | "no_show", number> }) {
  const order = ["completed", "confirmed", "pending", "no_show", "cancelled"] as const;
  const total = order.reduce((a, k) => a + counts[k], 0);
  if (total === 0) return <p className="text-sm text-muted">Nenhum atendimento no período.</p>;
  return (
    <div>
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full" role="img" aria-label="Distribuição por status">
        {order.filter((k) => counts[k] > 0).map((k) => <div key={k} className={STATUS_STYLE[k].dot} style={{ width: `${(counts[k] / total) * 100}%` }} />)}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {order.map((k) => (
          <li key={k} className="flex items-center gap-2 text-sm">
            <span className={cn("h-2.5 w-2.5 rounded-sm", STATUS_STYLE[k].dot)} aria-hidden />
            <span className="text-ink-soft">{STATUS_LABEL[k]}</span>
            <span className="ml-auto font-medium tabular">{counts[k]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
