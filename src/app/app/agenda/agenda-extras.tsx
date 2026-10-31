"use client";
import { useContext, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCheck, Clock, Globe, MessageCircle, UserX, Zap } from "lucide-react";
import { EmptyState, StatusBadge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";
import { localTime, minutesOf } from "@/lib/time";
import type { AppointmentStatus } from "@/domain/appointment-status";
import type { AgendaItemDTO, AgendaProfessional, TimeOffDTO } from "./agenda-view";
import { changeStatusAction, undoStatusAction } from "./actions";
import { canSendConfirmation, ConfirmationContext, useRecordSent, waLink } from "./confirmations";

const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/**
 * Horários livres de um dia para uma profissional: trechos do expediente sem atendimento ativo nem
 * bloqueio, com pelo menos `min` minutos. Passado de hoje não conta (só a partir de agora).
 */
export function freeGaps(opts: {
  hours: { start: string; end: string }[]; items: AgendaItemDTO[]; timeOff: TimeOffDTO[]; tz: string;
  toMin: (iso: string) => number; fromMinute?: number; min?: number;
}) {
  const min = opts.min ?? 30;
  const busy = [
    ...opts.items.filter((i) => i.status !== "cancelled" && i.status !== "no_show").map((i) => [opts.toMin(i.startsAt), opts.toMin(i.endsAt)] as const),
    ...opts.timeOff.map((t) => [opts.toMin(t.startsAt), opts.toMin(t.endsAt)] as const),
  ].sort((a, b) => a[0] - b[0]);
  const gaps: [number, number][] = [];
  for (const h of opts.hours) {
    let cursor = Math.max(minutesOf(h.start), opts.fromMinute ?? 0);
    cursor = Math.ceil(cursor / 15) * 15;
    const end = minutesOf(h.end);
    for (const [s, e] of busy) {
      if (e <= cursor || s >= end) continue;
      if (s - cursor >= min) gaps.push([cursor, s]);
      cursor = Math.max(cursor, e);
    }
    if (end - cursor >= min) gaps.push([cursor, end]);
  }
  return gaps;
}

/** Resumo do dia: previsto, recebido, a receber e a ocupação de cada profissional. */
export function DaySummary({ items, pros, weekday, tz, toMin }: {
  items: AgendaItemDTO[]; pros: AgendaProfessional[]; weekday: number; tz: string; toMin: (iso: string) => number;
}) {
  const active = items.filter((i) => i.status !== "cancelled");
  const forecast = active.filter((i) => i.status !== "no_show").reduce((t, i) => t + i.priceCents, 0);
  const received = items.reduce((t, i) => t + i.paidCents, 0);
  const due = items.filter((i) => i.status === "completed").reduce((t, i) => t + Math.max(0, i.priceCents - i.paidCents), 0);
  void tz;
  return (
    <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)]">
      <div className="grid grid-cols-3 gap-2 rounded-[var(--radius-card)] border border-line bg-surface p-3">
        <Num label="Previsto" value={formatMoney(forecast)} />
        <Num label="Recebido" value={formatMoney(received)} tone="text-st-completed" />
        <Num label="A receber" value={formatMoney(due)} tone={due > 0 ? "text-st-pending" : undefined} />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {pros.map((p) => {
          const hours = p.hours.filter((h) => h.weekday === weekday);
          const capacity = hours.reduce((t, h) => t + minutesOf(h.end) - minutesOf(h.start), 0);
          const mine = active.filter((i) => i.professionalId === p.id && i.status !== "no_show");
          const booked = mine.reduce((t, i) => t + Math.max(0, toMin(i.endsAt) - toMin(i.startsAt)), 0);
          const pct = capacity ? Math.min(100, Math.round((booked / capacity) * 100)) : null;
          return (
            <div key={p.id} className="min-w-[150px] flex-1 rounded-[var(--radius-card)] border border-line bg-surface px-3 py-2.5">
              <div className="flex items-center gap-2 text-sm font-medium"><span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />{p.name}</div>
              {pct === null ? <div className="mt-1 text-xs text-muted">Folga</div> : (
                <>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sunken"><span className="block h-full rounded-full" style={{ width: `${pct}%`, background: p.color }} /></div>
                  <div className="mt-1 flex justify-between gap-2 text-xs whitespace-nowrap text-muted tabular"><span>{mine.length} atend. · {pct}%</span><span>{String(Math.round(Math.max(0, capacity - booked) / 6) / 10).replace(".", ",")}h livres</span></div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Num({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0 px-1">
      <div className="text-xs text-muted">{label}</div>
      <div className={cn("truncate text-[15px] font-semibold tabular sm:text-base", tone)}>{value}</div>
    </div>
  );
}

/** Ações rápidas de status, com "Desfazer" no aviso. */
function useQuickStatus() {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const set = (item: AgendaItemDTO, status: AppointmentStatus, label: string) => start(async () => {
    const r = await changeStatusAction({ appointmentId: item.id, status });
    if (!r?.ok) { toast(r?.message ?? "Não deu certo. Tenta de novo?", "error"); return; }
    router.refresh();
    toast(`${item.clientName.split(" ")[0]}: ${label}.`, "success", {
      action: { label: "Desfazer", onClick: async () => { const u = await undoStatusAction(item.id); toast(u?.message ?? "Não consegui desfazer. Tenta de novo?", u?.ok ? "success" : "error"); router.refresh(); } },
    });
  });
  return { set, pending };
}

/**
 * Visão em lista: os atendimentos do dia em ordem, com o que dá para fazer em um toque
 * (confirmar, concluir, marcar falta, WhatsApp) e os horários livres entre eles.
 */
export function ListView({ items, pros, tz, canManage, gapsByPro, onOpen, onSlot, nowMinute, isToday }: {
  items: AgendaItemDTO[]; pros: AgendaProfessional[]; tz: string; canManage: boolean;
  gapsByPro: { pro: AgendaProfessional; gaps: [number, number][] }[]; onOpen: (id: string) => void;
  onSlot: (proId: string, time: string) => void; nowMinute: number | null; isToday: boolean;
}) {
  const ctx = useContext(ConfirmationContext);
  const { set, pending } = useQuickStatus();
  const { record } = useRecordSent();
  const sorted = [...items].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const gaps = gapsByPro.flatMap(({ pro, gaps }) => gaps.map(([s, e]) => ({ pro, s, e }))).sort((a, b) => a.s - b.s);

  if (sorted.length === 0 && gaps.length === 0)
    return <EmptyState icon={Clock} title="Dia livrinho" description="Toque em Agendar para marcar alguém." />;

  // Atendimentos e horários livres intercalados por horário.
  type Row = { kind: "appt"; at: number; item: AgendaItemDTO } | { kind: "gap"; at: number; pro: AgendaProfessional; s: number; e: number };
  const rows: Row[] = [
    ...sorted.map((item) => ({ kind: "appt" as const, at: minutesOf(localTime(new Date(item.startsAt), tz)), item })),
    ...gaps.map((g) => ({ kind: "gap" as const, at: g.s, ...g })),
  ].sort((a, b) => a.at - b.at || (a.kind === "appt" ? -1 : 1));
  // A linha "agora" entra antes do primeiro item que ainda não começou.
  const nowIdx = isToday && nowMinute !== null ? rows.findIndex((r) => r.at > nowMinute) : -1;

  return (
    <ol className="flex flex-col gap-2" aria-label="Atendimentos do dia">
      {rows.map((r, idx) => {
        const showNow = idx === nowIdx;
        const nowLine = showNow && (
          <li key={`now-${r.at}`} aria-hidden className="flex items-center gap-2 px-1 text-[11px] font-medium text-accent-text">
            <span className="h-2 w-2 rounded-full bg-accent-strong" /><span className="h-px flex-1 bg-accent-strong/60" />agora · {hm(nowMinute!)}
          </li>
        );
        if (r.kind === "gap") {
          return [nowLine, (
            <li key={`gap-${r.pro.id}-${r.s}`}>
              <button type="button" disabled={!canManage} onClick={() => onSlot(r.pro.id, hm(r.s))}
                className="flex w-full items-center gap-3 rounded-xl border border-dashed border-line-strong px-3 py-2 text-left text-sm text-muted transition hover:border-accent hover:bg-accent-subtle hover:text-ink disabled:pointer-events-none">
                <span className="w-24 shrink-0 text-xs tabular">{hm(r.s)}–{hm(r.e)}</span>
                <span className="flex-1">Livre{pros.length > 1 ? ` · ${r.pro.name}` : ""} <span className="text-xs">({String(Math.round((r.e - r.s) / 6) / 10).replace(".", ",")}h)</span></span>
                {canManage && <span className="text-xs font-medium text-accent-text">+ Agendar</span>}
              </button>
            </li>
          )];
        }
        const i = r.item;
        const pro = pros.find((p) => p.id === i.professionalId);
        const start = localTime(new Date(i.startsAt), tz), end = localTime(new Date(i.endsAt), tz);
        const active = i.status === "pending" || i.status === "confirmed";
        const started = isToday && nowMinute !== null && minutesOf(start) <= nowMinute;
        return [nowLine, (
          <li key={i.id} className={cn("rounded-xl border border-line bg-surface shadow-sm transition", i.status === "cancelled" && "opacity-60")}>
            <button type="button" onClick={() => onOpen(i.id)} className="flex w-full items-start gap-3 px-3 pt-3 pb-2 text-left">
              <span className="w-12 shrink-0 text-sm font-semibold tabular">{start}<span className="block text-xs font-normal text-muted">{end}</span></span>
              <span className="h-10 w-1 shrink-0 rounded-full" style={{ background: pro?.color }} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 truncate font-medium">{i.clientName}
                  {i.source === "online" && <Globe className="h-3.5 w-3.5 text-muted" aria-label="Agendado online" />}
                  {i.squeezeIn && <Zap className="h-3.5 w-3.5 text-muted" aria-label="Encaixe" />}
                  {i.clientConfirmedAt && <CheckCheck className="h-3.5 w-3.5 text-st-confirmed" aria-label="A cliente confirmou" />}
                </span>
                <span className="block truncate text-xs text-muted">{i.services}{pros.length > 1 && pro ? ` · ${pro.name}` : ""}</span>
                <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 sm:hidden">
                  <StatusBadge status={i.status} />
                  <span className="text-xs whitespace-nowrap text-muted tabular">{formatMoney(i.priceCents)}{i.paidCents >= i.priceCents && i.priceCents > 0 ? " · pago" : ""}</span>
                </span>
              </span>
              <span className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                <StatusBadge status={i.status} />
                <span className="text-xs text-muted tabular">{formatMoney(i.priceCents)}{i.paidCents >= i.priceCents && i.priceCents > 0 ? " · pago" : ""}</span>
              </span>
            </button>
            {canManage && (active || (i.status === "completed" && i.paidCents < i.priceCents)) && (
              <div className="flex flex-wrap gap-1.5 border-t border-line px-3 py-2">
                {i.status === "pending" && <Quick onClick={() => set(i, "confirmed", "confirmado")} disabled={pending}><Check className="h-3.5 w-3.5" />Confirmar</Quick>}
                {active && started && <Quick onClick={() => set(i, "completed", "atendimento feito ✨")} disabled={pending} tone="ok"><CheckCheck className="h-3.5 w-3.5" />Concluir</Quick>}
                {active && started && <Quick onClick={() => set(i, "no_show", "falta anotada")} disabled={pending} tone="bad"><UserX className="h-3.5 w-3.5" />Falta</Quick>}
                {canSendConfirmation(i, ctx.now) && (
                  <a href={waLink(i, ctx)} target="_blank" rel="noreferrer" onClick={() => record(i.id)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-medium text-ink-soft transition hover:bg-sunken">
                    <MessageCircle className="h-3.5 w-3.5" />{i.confirmationSentAt ? "Reenviar confirmação" : "Enviar confirmação"}
                  </a>
                )}
                {i.status === "completed" && i.paidCents < i.priceCents && (
                  <Quick onClick={() => onOpen(i.id)}>Registrar pagamento · {formatMoney(i.priceCents - i.paidCents)}</Quick>
                )}
              </div>
            )}
          </li>
        )];
      })}
    </ol>
  );
}

function Quick({ children, onClick, disabled, tone }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; tone?: "ok" | "bad" }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={cn("inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition disabled:opacity-50",
        tone === "ok" ? "border-st-completed/40 bg-st-completed-bg text-st-completed hover:brightness-110"
          : tone === "bad" ? "border-st-noshow/40 bg-st-noshow-bg text-st-noshow hover:brightness-110"
          : "border-line text-ink-soft hover:bg-sunken")}>
      {children}
    </button>
  );
}
