import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Illustration, type IllustrationName } from "@/components/ui/illustration";
import { METRIC_DEFINITIONS, type MetricKey } from "@/domain/metrics";
import { Card, InfoTip, STATUS_STYLE } from "@/components/ui/primitives";
import { STATUS_LABEL } from "@/domain/appointment-status";
import { cn } from "@/lib/cn";

/** Ilustração de cada indicador (no canto do cartão). */
const KPI_ART: Partial<Record<MetricKey, IllustrationName>> = {
  revenue_received: "wallet", scheduled_value: "calendar-check", appointments_count: "calendar", occupancy: "clock",
  average_ticket: "receipt", no_show_rate: "user-x", new_clients: "user-plus", receivable: "coins",
};

export function Kpi({ label, value, change, sub, metric, invert, highlight }: { label: string; value: string; change?: number | null; sub?: string; metric: MetricKey; invert?: boolean; highlight?: boolean }) {
  const good = change !== undefined && change !== null && (invert ? change < 0 : change > 0);
  const bad = change !== undefined && change !== null && (invert ? change > 0 : change < 0);
  const art = KPI_ART[metric];
  return (
    <Card className={cn("relative overflow-hidden p-4 sm:p-5", highlight && "border-accent-muted bg-[linear-gradient(140deg,var(--color-accent-subtle)_0%,var(--color-surface)_75%)]!")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1 text-[13px] text-muted">{label}<InfoTip text={METRIC_DEFINITIONS[metric]} /></div>
        {art && <Illustration name={art} className="-mt-1 -mr-1 h-11 w-11 sm:h-14 sm:w-14" />}
      </div>
      <div className={cn("mt-1 text-[22px] leading-tight font-semibold tracking-[-0.015em] tabular sm:text-[26px]", highlight && "text-accent-text")}>{value}</div>
      <div className="mt-1 flex min-h-[18px] flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
        {change !== undefined && (change === null
          ? <span className="text-muted">primeira vez por aqui</span>
          : change === 0 ? <span className="text-muted">igualzinho ao anterior</span>
          : <span className={cn("inline-flex items-center gap-0.5 font-medium", good && "text-st-completed", bad && "text-st-noshow")}>
              {change > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{Math.abs(Math.round(change))}% vs. anterior
            </span>)}
        {sub && <span className="text-muted">{sub}</span>}
      </div>
    </Card>
  );
}

export function StatusBreakdown({ counts }: { counts: Record<"pending" | "confirmed" | "completed" | "cancelled" | "no_show", number> }) {
  const order = ["completed", "confirmed", "pending", "no_show", "cancelled"] as const;
  const total = order.reduce((a, k) => a + counts[k], 0);
  if (total === 0) return <p className="text-sm text-muted">Nenhum atendimento neste período ainda.</p>;
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
