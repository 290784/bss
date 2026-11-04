import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireAppContext, tenant } from "@/server/context";
import { can } from "@/domain/permissions";
import { METRIC_DEFINITIONS } from "@/domain/metrics";
import { COMPARACAO, loadDashboard, loadForecast, loadInsights, loadTrends, PERIOD_LABEL, type PeriodId } from "@/server/modules/dashboard";
import { B, Card, CardHeader, EmptyState, InfoTip, PageHeader } from "@/components/ui/primitives";
import { formatMoney } from "@/lib/money";
import { DashboardChart } from "../dashboard-chart";
import { PeriodTabs } from "../period-tabs";
import { DashboardInsights } from "../dashboard-insights";
import { ForecastAndAlerts, ServiceGrowth } from "../dashboard-trends";
import { Kpi, StatusBreakdown } from "../dashboard-kpi";

export const metadata: Metadata = { title: "Relatórios" };

const PERIODS: PeriodId[] = ["today", "week", "month", "30d"];

/** Relatórios: todos os números do negócio num lugar só, separados do dia a dia do Início. */
export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const ctx = await requireAppContext();
  if (!can(ctx.role, "dashboard.view")) redirect("/app/agenda");
  const sp = await searchParams;
  const period: PeriodId = PERIODS.includes(sp.periodo as PeriodId) ? (sp.periodo as PeriodId) : "month";
  const tz = ctx.org.timezone;
  const finance = can(ctx.role, "finance.view");

  const { d, insights, trends, forecast, appointments } = await tenant(ctx, async (tx) => {
    const [d, insights, trends, forecast, [count]] = await Promise.all([
      loadDashboard(tx, ctx.org.id, tz, period, { includeFinance: finance }),
      loadInsights(tx, ctx.org.id, tz, period),
      loadTrends(tx, ctx.org.id, tz),
      finance ? loadForecast(tx, ctx.org.id, tz) : Promise.resolve(null),
      tx<{ n: number }[]>`select count(*)::int as n from app.appointments where organization_id = ${ctx.org.id}`,
    ]);
    return { d, insights, trends, forecast, appointments: count!.n };
  });

  const series = d.series.map((s) => ({
    label: s.day.slice(8),
    longLabel: s.day.split("-").reverse().join("/"),
    values: { revenue: s.revenue, appointments: s.appointments },
  }));

  return (
    <div>
      <PageHeader art="chart" title="Relatórios" description={<><B>Como o seu negócio está indo</B> · {COMPARACAO[period]}</>}
        actions={<PeriodTabs basePath="/app/relatorios" periods={PERIODS.map((p) => ({ id: p, label: PERIOD_LABEL[p] }))} current={period} />} />

      {appointments === 0 ? (
        <Card><EmptyState art="chart" title="Os relatórios aparecem depois do primeiro atendimento" description="Assim que você marcar horários, os números do mês, o gráfico do dia a dia e as análises aparecem aqui." /></Card>
      ) : (
        <>
          <section aria-labelledby="numeros">
            <h2 id="numeros" className="sr-only">Números do período</h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {d.revenue && <Kpi highlight label="Recebido" metric="revenue_received" value={formatMoney(d.revenue.value)} change={d.revenue.change} />}
              <Kpi highlight={!d.revenue} label="Previsto na agenda" metric="scheduled_value" value={formatMoney(d.scheduledValue.value)} change={d.scheduledValue.change} />
              <Kpi label="Atendimentos" metric="appointments_count" value={String(d.appointments.value)} change={d.appointments.change} />
              <Kpi label="Agenda ocupada" metric="occupancy" value={d.occupancy.value === null ? "—" : `${Math.round(d.occupancy.value * 100)}%`}
                sub={d.occupancy.capacityMinutes ? `${Math.round(d.occupancy.bookedMinutes / 60)}h de ${Math.round(d.occupancy.capacityMinutes / 60)}h` : "Sem horário de atendimento no período"} />
              {d.averageTicket && <Kpi label="Ticket médio" metric="average_ticket" value={d.averageTicket.value === null ? "—" : formatMoney(d.averageTicket.value)} />}
              <Kpi label="Faltas" metric="no_show_rate" value={String(d.noShows.value)} invert change={d.noShows.change}
                sub={d.noShowRate.value === null ? "Nenhum atendimento ainda" : `${Math.round(d.noShowRate.value * 100)}% de quem tinha horário`} />
              <Kpi label="Clientes novas" metric="new_clients" value={String(d.newClients.value)} change={d.newClients.change} sub={`${d.returningClients.value} voltaram`} />
              {d.receivable && <Kpi label="A receber" metric="receivable" value={formatMoney(d.receivable.total)} sub={`${d.receivable.count === 1 ? "1 atendimento feito" : `${d.receivable.count} atendimentos feitos`} sem pagamento`} />}
            </div>
          </section>

          <Card className="mt-6">
            <CardHeader art="calendar" title="Dia a dia" description={`${PERIOD_LABEL[period]} · os números lá em cima: ${COMPARACAO[period]}`} />
            <div className="px-5 pt-4 pb-5 sm:px-6 sm:pb-6">
              <DashboardChart data={series} includeRevenue={finance} />
            </div>
          </Card>

          <ForecastAndAlerts forecast={forecast} alerts={trends.alerts} finance={finance} />
          <DashboardInsights data={insights} periodLabel={PERIOD_LABEL[period]} compareLabel={COMPARACAO[period].replace(/^comparação com /, "")} finance={finance} />
          <ServiceGrowth data={trends} finance={finance} />

          <Card className="mt-6">
            <CardHeader art="calendar-check" title="Como foram os atendimentos" description={PERIOD_LABEL[period]} />
            <div className="px-5 pt-4 pb-5 sm:px-6 sm:pb-6"><StatusBreakdown counts={d.statusCounts} /></div>
          </Card>

          {d.byProfessional.length > 1 && (
            <Card className="mt-6">
              <CardHeader art="team" title="Como está cada profissional" description={PERIOD_LABEL[period]} action={<InfoTip text={METRIC_DEFINITIONS.produced_value} />} />
              <div className="overflow-x-auto px-5 pt-3 pb-5 sm:px-6 sm:pb-6">
                <table className="w-full min-w-[480px] text-sm">
                  <thead className="text-left text-[11px] tracking-[0.12em] text-gold-ink uppercase"><tr><th className="py-2 font-bold">Profissional</th><th className="py-2 text-right font-bold">Concluídos</th><th className="py-2 text-right font-bold">Faltas</th><th className="py-2 text-right font-bold">Horas agendadas</th>{finance && <th className="py-2 text-right font-bold">Produção</th>}</tr></thead>
                  <tbody className="divide-y divide-line/70">
                    {d.byProfessional.map((p) => (
                      <tr key={p.id}>
                        <td className="py-3"><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: p.color }} aria-hidden />{p.name}</td>
                        <td className="py-3 text-right tabular">{p.completed}</td>
                        <td className="py-3 text-right tabular">{p.no_show}</td>
                        <td className="py-3 text-right tabular">{(p.booked_minutes / 60).toFixed(1).replace(".", ",")}</td>
                        {finance && <td className="py-3 text-right tabular">{formatMoney(p.produced)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
