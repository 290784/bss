import type { ComponentProps, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Sparkle } from "@/components/brand/sparkles";
import { STATUS_LABEL, type AppointmentStatus } from "@/domain/appointment-status";

export function Card({ className, interactive, ...props }: ComponentProps<"div"> & { interactive?: boolean }) {
  return <div className={cn("rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)]", interactive ? "lift" : "glow-hover", className)} {...props} />;
}

export function CardHeader({ title, description, action, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-3 px-5 pt-5", className)}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 font-tight text-[28px] leading-tight font-extrabold tracking-[-0.02em] text-ink">{title}<Sparkle size={14} className="motion-safe:[animation:twinkle_3.6s_ease-in-out_infinite]" /></h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const tone = {
  neutral: "bg-sunken text-ink-soft",
  plum: "bg-accent-subtle text-accent-text",
  champagne: "bg-highlight-subtle text-highlight-text",
  success: "bg-st-completed-bg text-st-completed",
  warning: "bg-st-pending-bg text-st-pending",
  danger: "bg-st-noshow-bg text-st-noshow",
  info: "bg-st-confirmed-bg text-st-confirmed",
};

export function Badge({ children, variant = "neutral", className }: { children: ReactNode; variant?: keyof typeof tone; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", tone[variant], className)}>{children}</span>;
}

export const STATUS_STYLE: Record<AppointmentStatus, { badge: string; block: string; dot: string }> = {
  pending: { badge: "bg-st-pending-bg text-st-pending", block: "border-l-st-pending bg-st-pending-bg/80", dot: "bg-st-pending" },
  confirmed: { badge: "bg-st-confirmed-bg text-st-confirmed", block: "border-l-st-confirmed bg-st-confirmed-bg/80", dot: "bg-st-confirmed" },
  completed: { badge: "bg-st-completed-bg text-st-completed", block: "border-l-st-completed bg-st-completed-bg/80", dot: "bg-st-completed" },
  cancelled: { badge: "bg-st-cancelled-bg text-st-cancelled", block: "border-l-st-cancelled bg-st-cancelled-bg/70 opacity-70 line-through decoration-1", dot: "bg-st-cancelled" },
  no_show: { badge: "bg-st-noshow-bg text-st-noshow", block: "border-l-st-noshow bg-st-noshow-bg/80", dot: "bg-st-noshow" },
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", STATUS_STYLE[status].badge)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_STYLE[status].dot)} aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }: { icon: LucideIcon; title: string; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-accent-subtle text-accent-text">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

/** Explicação de uma métrica. Acessível por teclado (foco) e toque. */
export { InfoTip } from "./info-tip";

export function Avatar({ name, color, className }: { name: string; color?: string; className?: string }) {
  const parts = name.trim().split(/\s+/);
  const ini = ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts.at(-1)![0] : "")).toUpperCase();
  return (
    <span
      className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold", !color && "bg-accent-muted text-accent-text", className)}
      style={color ? { backgroundColor: color + "1f", color } : undefined}
      aria-hidden
    >
      {ini}
    </span>
  );
}

export function DemoBanner() {
  return (
    <div className="border-b border-highlight-border bg-highlight-subtle px-4 py-2 text-center text-[13px] text-highlight-text">
      Você está em uma <strong>conta de demonstração</strong>. Os dados desta organização são fictícios e isolados das contas reais.
    </div>
  );
}
