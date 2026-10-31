import { ArrowDownRight, ArrowUpRight, Globe, Sparkles as SparklesIcon, Store } from "lucide-react";
import { Card, CardHeader, InfoTip } from "@/components/ui/primitives";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";
import type { InsightsData } from "@/server/modules/dashboard";
import { plural } from "@/lib/text";

/** Tons da marca para as categorias (do mais forte ao mais claro). */
const TONS = ["bg-violet-500", "bg-violet-300", "bg-gold-400", "bg-violet-700", "bg-gold-300", "bg-violet-200"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function Variacao({ change }: { change: number | null }) {
  if (change === null) return <span className="text-xs text-muted">novo</span>;
  if (Math.round(change) === 0) return <span className="text-xs text-muted">=</span>;
  const up = change > 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium tabular", up ? "text-st-completed" : "text-st-noshow")}>
      {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{Math.abs(Math.round(change))}%
    </span>
  );
}

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);

/**
 * Detalhamento do período: por serviço e categoria, origem dos agendamentos, vendas adicionais e
 * os últimos 6 meses. Valores em dinheiro só para quem vê o financeiro.
 */
export function DashboardInsights({ data, periodLabel, compareLabel, finance }: { data: InsightsData; periodLabel: string; compareLabel: string; finance: boolean }) {
  const totalValue = data.byService.reduce((t, s) => t + s.value, 0);
  const totalCount = data.byService.reduce((t, s) => t + s.count, 0);
  const totalCat = data.byCategory.reduce((t, c) => t + (finance ? c.value : c.count), 0);
  const originTotal = data.origin.online + data.origin.staff;
  const maxMonth = Math.max(1, ...data.months.map((m) => (finance ? m.revenue : m.completed)));

  return (
    <>
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader title="Seus serviços" description={`${periodLabel} · atendimentos concluídos · variação: ${compareLabel}`}
            action={<InfoTip text="Cada serviço feito no período, pelo valor cobrado. Se a cliente fez dois serviços, conta para os dois." />} />
          <div className="overflow-x-auto px-5 pt-3 pb-5">
            {data.byService.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">Nenhum atendimento feito neste período ainda.</p>
            ) : (
              <table className="w-full text-sm sm:min-w-[560px]">
                <thead className="text-left text-xs text-muted">
                  <tr>
                    <th className="py-2 font-medium">Serviço</th>
                    <th className="py-2 pl-3 text-right font-medium">Feitos</th>
                    {finance && <th className="py-2 pl-3 text-right font-medium">Faturamento</th>}
                    <th className="hidden w-[26%] py-2 pl-4 font-medium sm:table-cell">Participação</th>
                    {finance && <th className="hidden py-2 pl-3 text-right font-medium sm:table-cell">Preço médio</th>}
                    {finance && <th className="py-2 pl-3 text-right font-medium">Variação</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.byService.map((s) => {
                    const share = finance ? (totalValue ? s.value / totalValue : 0) : totalCount ? s.count / totalCount : 0;
                    return (
                      <tr key={`${s.category}-${s.name}`}>
                        <td className="py-2.5"><span className="font-medium">{s.name}</span>{s.category && <span className="block text-xs text-muted">{s.category}</span>}</td>
                        <td className="py-2.5 pl-3 text-right tabular">{s.count}</td>
                        {finance && <td className="py-2.5 pl-3 text-right whitespace-nowrap tabular">{formatMoney(s.value)}</td>}
                        <td className="hidden py-2.5 pl-4 sm:table-cell">
                          <span className="flex items-center gap-2">
                            <span className="h-2 flex-1 overflow-hidden rounded-full bg-sunken"><span className="block h-full rounded-full bg-[linear-gradient(90deg,var(--color-violet-500),var(--color-violet-300))]" style={{ width: `${Math.max(2, share * 100)}%` }} /></span>
                            <span className="w-9 text-right text-xs text-muted tabular">{Math.round(share * 100)}%</span>
                          </span>
                        </td>
                        {finance && <td className="hidden py-2.5 pl-3 text-right whitespace-nowrap tabular sm:table-cell">{formatMoney(s.avg)}</td>}
                        {finance && <td className="py-2.5 pl-3 text-right"><Variacao change={s.change} /></td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Por área" description={finance ? "Quanto cada área traz para o caixa" : "Quanto cada área ocupa da agenda"} />
            <div className="px-5 pt-4 pb-5">
              {data.byCategory.length === 0 ? <p className="text-sm text-muted">Ainda sem atendimentos neste período.</p> : <>
                <div className="flex h-3 overflow-hidden rounded-full bg-sunken" aria-hidden>
                  {data.byCategory.map((c, i) => (
                    <span key={c.name} className={TONS[i % TONS.length]} style={{ width: `${((finance ? c.value : c.count) / Math.max(1, totalCat)) * 100}%` }} />
                  ))}
                </div>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {data.byCategory.map((c, i) => (
                    <li key={c.name} className="flex items-center gap-2 text-sm">
                      <span className={cn("h-2.5 w-2.5 rounded-full", TONS[i % TONS.length])} aria-hidden />
                      <span className="flex-1">{c.name}</span>
                      <span className="text-xs text-muted tabular">{Math.round(((finance ? c.value : c.count) / Math.max(1, totalCat)) * 100)}%</span>
                      <span className="w-24 text-right tabular">{finance ? formatMoney(c.value) : `${c.count} feitos`}</span>
                      {finance && <span className="w-11 text-right"><Variacao change={c.change} /></span>}
                    </li>
                  ))}
                </ul>
              </>}
            </div>
          </Card>

          <Card>
            <CardHeader title="Vendas extras" description="Clientes que saíram com mais de um serviço"
              action={<InfoTip text="Atendimentos do período em que a cliente fez mais de um serviço (por exemplo, topou a sugestão de um extra). O valor a mais é a soma dos serviços além do primeiro." />} />
            <div className="grid grid-cols-2 gap-3 px-5 pt-4 pb-5">
              <div>
                <div className="text-2xl font-semibold tabular">{pct(data.upsell.rate)}</div>
                <div className="text-xs text-muted">{data.upsell.withExtra} de {data.upsell.completed} atendimentos</div>
                {data.upsell.rate !== null && data.upsell.prevRate !== null && Math.round((data.upsell.rate - data.upsell.prevRate) * 100) !== 0 && (
                  <div className={cn("mt-1 text-xs font-medium", data.upsell.rate > data.upsell.prevRate ? "text-st-completed" : "text-st-noshow")}>
                    {data.upsell.rate > data.upsell.prevRate ? "+" : "−"}{Math.abs(Math.round((data.upsell.rate - data.upsell.prevRate) * 100))} p.p. vs. período anterior
                  </div>
                )}
              </div>
              {finance && (
                <div className="rounded-xl bg-highlight-subtle p-3">
                  <div className="flex items-center gap-1 text-xs text-highlight-text"><SparklesIcon className="h-3.5 w-3.5" />A mais no caixa ✨</div>
                  <div className="mt-0.5 text-lg font-semibold tabular">{formatMoney(data.upsell.extraValue)}</div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <Card>
          <CardHeader title="De onde vêm os horários" description={`${periodLabel} · exceto cancelados`} />
          <div className="px-5 pt-4 pb-5">
            {originTotal === 0 ? <p className="text-sm text-muted">Nenhum horário marcado neste período ainda.</p> : <>
              <div className="flex h-3 overflow-hidden rounded-full bg-sunken" aria-hidden>
                <span className="bg-violet-500" style={{ width: `${(data.origin.online / originTotal) * 100}%` }} />
                <span className="bg-gold-400" style={{ width: `${(data.origin.staff / originTotal) * 100}%` }} />
              </div>
              <ul className="mt-4 flex flex-col gap-3 text-sm">
                <li className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-subtle text-accent-text"><Globe className="h-4 w-4" /></span>
                  <span className="flex-1"><span className="block font-medium">Pelo seu link (online)</span><span className="text-xs text-muted">{plural(data.origin.online, "agendamento")}</span></span>
                  <span className="text-right"><span className="block font-semibold tabular">{Math.round((data.origin.online / originTotal) * 100)}%</span>{finance && <span className="text-xs text-muted tabular">{formatMoney(data.origin.online_value)}</span>}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-gold-50 text-gold-700"><Store className="h-4 w-4" /></span>
                  <span className="flex-1"><span className="block font-medium">Marcados por você ou pela equipe</span><span className="text-xs text-muted">{plural(data.origin.staff, "agendamento")}</span></span>
                  <span className="text-right"><span className="block font-semibold tabular">{Math.round((data.origin.staff / originTotal) * 100)}%</span>{finance && <span className="text-xs text-muted tabular">{formatMoney(data.origin.staff_value)}</span>}</span>
                </li>
              </ul>
            </>}
          </div>
        </Card>

        <Card>
          <CardHeader title="Seus últimos 6 meses" description={finance ? "Quanto entrou por mês (o mês atual, até hoje)" : "Atendimentos feitos por mês (o mês atual, até hoje)"} />
          <div className="px-5 pt-4 pb-5">
            <div className="flex h-44 items-end gap-3" role="img"
              aria-label={data.months.map((m) => `${MESES[Number(m.key.slice(5, 7)) - 1]}: ${finance ? formatMoney(m.revenue) : `${m.completed} atendimentos`}`).join("; ")}>
              {data.months.map((m) => {
                const v = finance ? m.revenue : m.completed;
                return (
                  <div key={m.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5" aria-hidden>
                    <span className="text-[11px] text-muted tabular">{finance ? (v >= 100_000 ? `${(v / 100_000).toFixed(1).replace(".", ",")} mil` : formatMoney(v)) : v}</span>
                    <span className={cn("w-full max-w-14 rounded-t-lg", m.current ? "bg-[repeating-linear-gradient(135deg,var(--color-violet-300)_0_6px,var(--color-violet-200)_6px_12px)]" : "bg-[linear-gradient(180deg,var(--color-violet-400),var(--color-violet-600))]")}
                      style={{ height: `${Math.max(3, (v / maxMonth) * 100)}%` }} />
                    <span className={cn("text-xs", m.current ? "font-medium text-ink" : "text-muted")}>{MESES[Number(m.key.slice(5, 7)) - 1]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
