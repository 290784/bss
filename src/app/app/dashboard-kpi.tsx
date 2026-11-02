import { ArrowDownRight, ArrowUpRight, CalendarCheck, CalendarDays, Gauge, HandCoins, Receipt, UserPlus, UserX, Wallet, type LucideIcon } from "lucide-react";
import { METRIC_DEFINITIONS, type MetricKey } from "@/domain/metrics";
import { Card, InfoTip, STATUS_STYLE } from "@/components/ui/primitives";
import { STATUS_LABEL } from "@/domain/appointment-status";
import { cn } from "@/lib/cn";

/** Ícone de cada indicador (traço fino, na pastilha do canto). */
const KPI_ICON: Partial<Record<MetricKey, LucideIcon>> = {
  revenue_received: Wallet, scheduled_value: CalendarCheck, appointments_count: CalendarDays, occupancy: Gauge,
  average_ticket: Receipt, no_show_rate: UserX, new_clients: UserPlus, receivable: HandCoins,
};

export function Kpi({ label, value, change, sub, metric, invert, highlight }: { label: string; value: string; change?: number | null; sub?: string; metric: MetricKey; invert?: boolean; highlight?: boolean }) {
  const good = change !== undefined && change !== null && (invert ? change < 0 : change > 0);
  const bad = change !== undefined && change !== null && (invert ? change > 0 : change < 0);
  const Icon = KPI_ICON[metric];
  return (
    <Card className={cn("relative overflow-hidden p-4 sm:p-5", highlight && "border-accent-muted bg-[linear-gradient(140deg,var(--color-accent-subtle)_0%,var(--color-surface)_75%)]!")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1 text-[13px] text-muted">{label}<InfoTip text={METRIC_DEFINITIONS[metric]} /></div>
        {Icon && (
          <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full", highlight ? "bg-plum text-white" : "bg-accent-subtle text-accent-text")} aria-hidden>
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
          </span>
        )}
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
