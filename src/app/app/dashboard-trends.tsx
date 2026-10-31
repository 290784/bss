import { AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarClock, CircleCheck, PauseCircle, TrendingDown, UserX } from "lucide-react";
import { Card, CardHeader, InfoTip } from "@/components/ui/primitives";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";
import type { Alert, ForecastData, TrendsData } from "@/server/modules/dashboard";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_LONGOS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const mes = (key: string, longo = false) => (longo ? MESES_LONGOS : MESES)[Number(key.slice(5, 7)) - 1]!;
const mil = (cents: number) => (cents >= 100_000 ? `R$ ${(cents / 100_000).toFixed(1).replace(".", ",")} mil` : formatMoney(cents));

function Crescimento({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-muted">novidade</span>;
  const r = Math.round(value);
  if (r === 0) return <span className="text-xs text-muted">estável</span>;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-sm font-semibold tabular", r > 0 ? "text-st-completed" : "text-st-noshow")}>
      {r > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}{Math.abs(r)}%
    </span>
  );
}

/** Mini-gráfico de 6 barras (um por mês); o mês atual, ainda em andamento, fica mais claro. */
function Mini({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <span className="flex h-7 w-20 items-end gap-[3px]" aria-hidden>
      {values.map((v, i) => (
        <span key={i} className={cn("flex-1 rounded-sm", i === values.length - 1 ? "bg-violet-300/60" : "bg-violet-400")} style={{ height: `${Math.max(6, (v / max) * 100)}%` }} />
      ))}
    </span>
  );
}

const ICONE: Record<Alert["kind"], typeof AlertTriangle> = { queda: TrendingDown, parado: PauseCircle, faltas: UserX, categoria: AlertTriangle };

/** Projeção do mês e dos próximos 3 meses + pontos de atenção (o que não está performando). */
export function ForecastAndAlerts({ forecast, alerts, finance }: { forecast: ForecastData | null; alerts: Alert[]; finance: boolean }) {
  return (
    <div className={cn("mt-6 grid gap-6", finance && forecast && "xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]")}>
      {finance && forecast && (
        <Card>
          <CardHeader title="Quanto você deve faturar" description="Uma estimativa no ritmo que você está"
            action={<InfoTip text="Este mês: o que entrou até ontem ÷ dias de atendimento que já passaram × dias de atendimento do mês. Próximos meses: o mesmo ritmo por dia, ajustado pela tendência dos últimos 3 meses (no máximo ±10% ao mês) e pelos dias de atendimento de cada mês. É uma estimativa, não uma promessa." />} />
          <div className="px-5 pt-4 pb-5">
            {!forecast.ready ? (
              <p className="text-sm text-muted">A estimativa aparece depois dos 3 primeiros dias de atendimento do mês.{forecast.scheduledRest > 0 && ` Você já tem ${formatMoney(forecast.scheduledRest)} marcados para o resto do mês!`}</p>
            ) : (
              <>
                <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
                  <div>
                    <div className="text-[13px] text-muted">Este mês deve fechar em torno de</div>
                    <div className="text-[28px] leading-tight font-semibold tracking-[-0.01em] tabular">{mil(forecast.thisMonth)}</div>
                  </div>
                  {forecast.vsLastMonth !== null && (
                    <span className={cn("mb-1 inline-flex items-center gap-0.5 text-sm font-medium", forecast.vsLastMonth >= 0 ? "text-st-completed" : "text-st-noshow")}>
                      {forecast.vsLastMonth >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                      {Math.abs(Math.round(forecast.vsLastMonth))}% vs. {mes(forecast.lastMonth.key, true)} ({mil(forecast.lastMonth.value)})
                    </span>
                  )}
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-sunken" aria-hidden>
                  <span className="block h-full rounded-full bg-[linear-gradient(90deg,var(--color-violet-500),var(--color-violet-300))]" style={{ width: `${Math.min(100, (forecast.soFar / Math.max(1, forecast.thisMonth)) * 100)}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted">
                  {formatMoney(forecast.soFar)} no caixa em {forecast.elapsedDays} de {forecast.monthDays} dias de atendimento
                  {forecast.scheduledRest > 0 && <> · <CalendarClock className="inline h-3.5 w-3.5 align-[-2px]" /> {formatMoney(forecast.scheduledRest)} já marcados para o resto do mês</>}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {forecast.next.map((n) => (
                    <div key={n.key} className="rounded-xl bg-sunken px-2.5 py-2.5 sm:px-3">
                      <div className="text-xs text-muted first-letter:uppercase">{mes(n.key, true)}</div>
                      <div className="mt-0.5 text-sm font-semibold whitespace-nowrap tabular sm:text-base">{mil(n.value)}</div>
                      <div className="text-[11px] text-muted">{n.days} dias<span className="hidden sm:inline"> de atendimento</span></div>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted">
                  {forecast.growth >= 0 ? "Você vem crescendo" : "Seu ritmo caiu"} {Math.abs(Math.round(forecast.growth * 100))}% ao mês nos últimos 3 meses.
                </p>
              </>
            )}
          </div>
        </Card>
      )}

      <Card id="fica-de-olho" className="scroll-mt-24">
        <CardHeader title="Fica de olho" description="O que pode render mais (últimos 90 dias)" />
        <div className="px-5 pt-3 pb-5">
          {alerts.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl bg-st-completed-bg px-4 py-3 text-sm text-st-completed">
              <CircleCheck className="h-5 w-5 shrink-0" />Tudo indo bem: nenhum serviço caindo, parado ou com muitas faltas. 💜
            </div>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {alerts.map((a, i) => {
                const Icon = ICONE[a.kind];
                return (
                  <li key={i} className="flex gap-3 rounded-xl border border-st-pending/30 bg-st-pending-bg px-3.5 py-3">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-st-pending" />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{a.title}</span>
                      <span className="block text-xs text-ink-soft">{a.detail}</span>
                      <span className="mt-1 block text-xs text-muted"><span className="font-medium text-ink-soft">Dica:</span> {a.tip}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}

/** Crescimento de cada serviço: últimos 90 dias contra os 90 anteriores, com o mini-gráfico de 6 meses. */
export function ServiceGrowth({ data, finance }: { data: TrendsData; finance: boolean }) {
  const rows = [...data.trends].filter((t) => t.last90Count + t.prev90Count > 0)
    .sort((a, b) => (b.growth ?? 999) - (a.growth ?? 999));
  return (
    <Card className="mt-6">
      <CardHeader title="O que mais cresce" description="Últimos 90 dias contra os 90 dias antes (até ontem), do que mais subiu ao que mais caiu"
        action={<InfoTip text="Valor de cada serviço feito nos últimos 90 dias, comparado com os 90 dias antes. O gráfico pequeno mostra os últimos 6 meses (o mês atual, que ainda está rolando, fica mais clarinho)." />} />
      <div className="overflow-x-auto px-5 pt-3 pb-5">
        {rows.length === 0 ? <p className="py-6 text-center text-sm text-muted">Ainda não tem histórico para comparar. Logo aparece!</p> : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="py-2 font-medium">Serviço</th>
                <th className="py-2 pl-3 text-right font-medium">90 dias</th>
                <th className="hidden py-2 pl-3 text-right font-medium sm:table-cell">Antes</th>
                <th className="py-2 pl-3 text-right font-medium">Crescimento</th>
                <th className="hidden py-2 pl-4 font-medium sm:table-cell">{mes(data.monthKeys[0]!)}–{mes(data.monthKeys.at(-1)!)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((t) => (
                <tr key={`${t.category}-${t.name}`}>
                  <td className="py-2.5"><span className="font-medium">{t.name}</span>{t.category && <span className="block text-xs text-muted">{t.category}</span>}</td>
                  <td className="py-2.5 pl-3 text-right whitespace-nowrap tabular">{finance ? formatMoney(t.last90) : `${t.last90Count}×`}</td>
                  <td className="hidden py-2.5 pl-3 text-right whitespace-nowrap text-muted tabular sm:table-cell">{finance ? formatMoney(t.prev90) : `${t.prev90Count}×`}</td>
                  <td className="py-2.5 pl-3 text-right"><Crescimento value={finance ? t.growth : t.prev90Count ? ((t.last90Count - t.prev90Count) / t.prev90Count) * 100 : null} /></td>
                  <td className="hidden py-2.5 pl-4 sm:table-cell"><Mini values={t.monthly} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}
