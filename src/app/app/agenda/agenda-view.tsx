"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Globe, MessageCircle, Plus, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { EmptyState, STATUS_STYLE } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { addDaysToKey, formatInTz, localDateKey, localTime, localWeekday, minutesOf, zonedDateTime } from "@/lib/time";
import { STATUS_LABEL, type AppointmentStatus } from "@/domain/appointment-status";
import { NewAppointmentDialog, type NewDraft } from "./new-appointment";
import { AppointmentDrawer } from "./appointment-drawer";
import { BlockSendButton, canSendConfirmation, ConfirmationContext, ConfirmationsDialog } from "./confirmations";
import { DaySummary, freeGaps, ListView } from "./agenda-extras";
import { rescheduleAction } from "./actions";
import { useToast } from "@/components/ui/toast";
import { plural } from "@/lib/text";

export type AgendaViewMode = "dia" | "semana" | "mes" | "lista";
export type AgendaProfessional = { id: string; name: string; color: string; serviceIds: string[]; hours: { weekday: number; start: string; end: string }[] };
export type AgendaService = { id: string; name: string; priceCents: number; minutes: number; category: string | null };
export type AgendaItemDTO = {
  id: string; professionalId: string; clientName: string; startsAt: string; endsAt: string; status: AppointmentStatus;
  source: "staff" | "online"; services: string; squeezeIn: boolean; priceCents: number; paidCents: number;
  serviceNames: string[]; clientPhone: string | null; receiptUrl: string; clientConfirmedAt: string | null; confirmationSentAt: string | null;
};
export type TimeOffDTO = { id: string; professionalId: string | null; startsAt: string; endsAt: string; reason: string | null };

type Props = {
  view: AgendaViewMode; explicitView?: boolean; date: string; today: string; rangeStart: string; rangeEnd: string; timeZone: string;
  initialProfessionalId: string | null; openAppointmentId: string | null; openConfirmations?: boolean; newForClient?: { id: string; name: string } | null; readOnly: boolean; canManage: boolean; canSeeAll: boolean; canCreateClients: boolean;
  professionals: AgendaProfessional[]; services: AgendaService[]; items: AgendaItemDTO[]; timeOff: TimeOffDTO[];
};

const PX_PER_MIN = 1.2;

/** Arraste em andamento: para onde o atendimento iria (dia, profissional e minuto do início). */
type DragState = { item: AgendaItemDTO; dur: number; day: string; pro: string; minute: number; moved: boolean };
type StartDrag = (item: AgendaItemDTO, e: React.PointerEvent, origin: { day: string; minute: number; dur: number; grab: number }) => void;
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const WEEK_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function AgendaView(props: Props) {
  const { view, date, today, timeZone, professionals, items, readOnly } = props;
  const router = useRouter();
  const [proFilter, setProFilter] = useState<string>(props.initialProfessionalId ?? "all");
  const [showCancelled, setShowCancelled] = useState(false);
  const [draft, setDraft] = useState<NewDraft | null>(() => props.newForClient
    ? { date, time: "", professionalId: (props.initialProfessionalId ?? professionals[0]?.id) ?? "", clientId: props.newForClient.id, clientName: props.newForClient.name }
    : null);
  const [openId, setOpenId] = useState<string | null>(props.openAppointmentId);
  const [showConfirmations, setShowConfirmations] = useState(!!props.openConfirmations);
  const toast = useToast();

  // No celular, sem visão escolhida, a agenda abre em lista (a grade com várias colunas fica apertada).
  useEffect(() => {
    if (!props.explicitView && window.matchMedia("(max-width: 639px)").matches) {
      // Mantém o resto do endereço (agendamento aberto, confirmações, profissional…).
      const sp = new URLSearchParams(window.location.search);
      sp.set("data", date);
      sp.set("visao", "lista");
      router.replace(`/app/agenda?${sp}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Arrastar para remarcar (dia e semana) ----
  const [drag, setDrag] = useState<DragState | null>(null);
  const justDragged = useRef(false);
  const startDrag: StartDrag = (item, e, origin) => {
    if (!props.canManage || (item.status !== "pending" && item.status !== "confirmed")) return;
    if (e.button !== 0) return;
    const x0 = e.clientX, y0 = e.clientY;
    const touch = e.pointerType === "touch";
    let active = false;
    let last: DragState | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const target = (x: number, y: number) => {
      const col = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>("[data-col-day]");
      if (!col) return last;
      const rect = col.getBoundingClientRect();
      const colStart = Number(col.dataset.colStart);
      const raw = colStart + (y - rect.top) / PX_PER_MIN - origin.grab;
      const minute = Math.max(colStart, Math.round(raw / 15) * 15);
      return { item, dur: origin.dur, day: col.dataset.colDay!, pro: col.dataset.colPro || item.professionalId, minute,
        moved: col.dataset.colDay !== origin.day || (col.dataset.colPro || item.professionalId) !== item.professionalId || minute !== origin.minute };
    };
    const move = (x: number, y: number) => { last = target(x, y); setDrag(last); };
    const onPointerMove = (ev: PointerEvent) => {
      if (!active) {
        if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < (touch ? 10 : 5)) return;
        if (touch) { cleanup(); return; } // no toque, mexer antes do toque longo é rolar a tela
        active = true;
      }
      move(ev.clientX, ev.clientY);
    };
    const onTouchMove = (ev: TouchEvent) => { if (!active) return; ev.preventDefault(); const t = ev.touches[0]!; move(t.clientX, t.clientY); };
    const finish = () => {
      const result = last;
      cleanup();
      setDrag(null);
      if (!active) return;
      justDragged.current = true;
      setTimeout(() => { justDragged.current = false; }, 60);
      if (result?.moved) void drop(result);
    };
    const cleanup = () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", finish);
    };
    const onCancel = () => { if (!active) cleanup(); };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", onCancel);
    if (touch) {
      // Toque longo (0,35 s) pega o horário; depois disso o dedo arrasta sem rolar a tela.
      window.addEventListener("touchmove", onTouchMove, { passive: false });
      window.addEventListener("touchend", finish);
      timer = setTimeout(() => { active = true; navigator.vibrate?.(10); move(x0, y0); }, 350);
    }
  };
  const drop = async (d: DragState) => {
    const time = `${String(Math.floor(d.minute / 60)).padStart(2, "0")}:${String(d.minute % 60).padStart(2, "0")}`;
    const before = { date: localDateKey(new Date(d.item.startsAt), timeZone), time: localTime(new Date(d.item.startsAt), timeZone), pro: d.item.professionalId };
    const r = await rescheduleAction({ appointmentId: d.item.id, professionalId: d.pro, date: d.day, time, squeezeIn: false });
    if (!r?.ok) { toast(r?.message ?? "Não deu para remarcar. Tenta outro horário?", "error"); return; }
    router.refresh();
    const proName = professionals.find((p) => p.id === d.pro)?.name;
    toast(`${d.item.clientName.split(" ")[0]} remarcada para ${d.day === before.date ? "" : `${d.day.slice(8)}/${d.day.slice(5, 7)} `}${time}${d.pro !== before.pro && proName ? ` com ${proName}` : ""}.`, "success", {
      action: { label: "Desfazer", onClick: async () => {
        const u = await rescheduleAction({ appointmentId: d.item.id, professionalId: before.pro, date: before.date, time: before.time, squeezeIn: d.item.squeezeIn });
        toast(u?.ok ? "Prontinho, voltou para o horário de antes." : (u?.message ?? "Não consegui desfazer. Tenta de novo?"), u?.ok ? "success" : "error");
        router.refresh();
      } },
    });
  };
  /** Tira o "?novo=" da URL (veio da ficha da cliente) para não reabrir ao atualizar a página. */
  const dropNovo = () => {
    const u = new URL(window.location.href);
    if (u.searchParams.has("novo")) { u.searchParams.delete("novo"); window.history.replaceState(null, "", u); }
  };
  const openItem = (id: string) => { if (!justDragged.current) setOpenId(id); };
  const dragProps = { drag, startDrag: props.canManage ? startDrag : undefined };

  const go = (params: Partial<{ data: string; visao: AgendaViewMode }>) => {
    const sp = new URLSearchParams({ data: params.data ?? date, visao: params.visao ?? view });
    if (proFilter !== "all") sp.set("profissional", proFilter);
    router.push(`/app/agenda?${sp}`);
  };
  const step = view === "dia" || view === "lista" ? 1 : view === "semana" ? 7 : 0;
  const shift = (dir: 1 | -1) => {
    if (view === "mes") {
      const [y, m] = date.split("-").map(Number);
      go({ data: new Date(Date.UTC(y!, m! - 1 + dir, 1)).toISOString().slice(0, 10) });
    } else go({ data: addDaysToKey(date, dir * step) });
  };

  // Atalhos: ← → navegam, T = hoje, N = novo agendamento
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, dialog, [contenteditable]") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowLeft") shift(-1);
      else if (e.key === "ArrowRight") shift(1);
      else if (e.key.toLowerCase() === "t") go({ data: today });
      else if (e.key.toLowerCase() === "n" && !readOnly) setDraft({ date, time: "", professionalId: professionals[0]?.id ?? "" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const visiblePros = proFilter === "all" ? professionals : professionals.filter((p) => p.id === proFilter);
  const visibleItems = items.filter((i) => (showCancelled || i.status !== "cancelled") && visiblePros.some((p) => p.id === i.professionalId));

  const title = useMemo(() => {
    const d = zonedDateTime(date, "12:00", timeZone);
    if (view === "dia" || view === "lista") return formatInTz(d, timeZone, { weekday: "long", day: "numeric", month: "long" });
    if (view === "mes") return formatInTz(d, timeZone, { month: "long", year: "numeric" });
    const s = zonedDateTime(props.rangeStart, "12:00", timeZone);
    const e = zonedDateTime(addDaysToKey(props.rangeEnd, -1), "12:00", timeZone);
    return `${formatInTz(s, timeZone, { day: "numeric", month: "short" })} – ${formatInTz(e, timeZone, { day: "numeric", month: "short", year: "numeric" })}`;
  }, [date, view, timeZone, props.rangeStart, props.rangeEnd]);

  const shortTitle = view === "dia" || view === "lista" ? formatInTz(zonedDateTime(date, "12:00", timeZone), timeZone, { weekday: "short", day: "numeric", month: "short" }) : title;

  // Ainda sem envio nem confirmação da cliente: o número no botão "Confirmações".
  const [nowMs] = useState(() => Date.now());
  const toSend = visibleItems.filter((i) => canSendConfirmation(i, nowMs) && !i.confirmationSentAt && !i.clientConfirmedAt).length;
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const i of items.filter((i) => visiblePros.some((p) => p.id === i.professionalId))) c[i.status] = (c[i.status] ?? 0) + 1;
    return c;
  }, [items, visiblePros]);

  if (professionals.length === 0)
    return (
      <EmptyState icon={CalendarDays} title="Sua agenda ainda está vazia" description="Cadastre uma profissional com os horários de atendimento e já dá para começar a marcar."
        action={props.canSeeAll ? <Button onClick={() => router.push("/app/equipe")}>Cadastrar profissional</Button> : undefined} />
    );

  return (
    <ConfirmationContext.Provider value={{ canManage: props.canManage, timeZone, pros: professionals, now: nowMs }}>
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-[10px] border border-line-strong bg-surface">
            <button onClick={() => shift(-1)} className="grid h-10 w-10 place-items-center text-ink-soft hover:text-ink" aria-label="Anterior" title="Anterior (←)"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => go({ data: today })} className="h-10 border-x border-line px-3 text-sm font-medium hover:bg-sunken" title="Hoje (T)">Hoje</button>
            <button onClick={() => shift(1)} className="grid h-10 w-10 place-items-center text-ink-soft hover:text-ink" aria-label="Próximo" title="Próximo (→)"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <h1 className="min-w-0 truncate font-tight tracking-[-0.02em] text-[22px] font-extrabold first-letter:uppercase sm:text-2xl">
            <span className="hidden sm:inline">{title}</span>
            <span className="sm:hidden">{shortTitle}</span>
          </h1>
          <label className="relative ml-1">
            <span className="sr-only">Ir para data</span>
            <input type="date" value={date} onChange={(e) => e.target.value && go({ data: e.target.value })}
              className="h-10 w-10 cursor-pointer rounded-[10px] border border-line-strong bg-surface text-transparent [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:opacity-0" />
            <CalendarDays className="pointer-events-none absolute top-1/2 left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-ink-soft" />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Visualização" className="flex w-full rounded-[10px] bg-sunken p-1 sm:w-auto">
            {(["lista", "dia", "semana", "mes"] as const).map((v) => (
              <button key={v} role="tab" aria-selected={view === v} onClick={() => go({ visao: v })}
                className={cn("h-10 flex-1 sm:h-8 sm:flex-none rounded-lg px-3 text-[13px] font-medium capitalize", view === v ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink")}>
                {v === "mes" ? "Mês" : v}
              </button>
            ))}
          </div>
          {props.canSeeAll && professionals.length > 1 && (
            <Select value={proFilter} onChange={(e) => setProFilter(e.target.value)} className="h-10 min-w-0 flex-1 sm:w-52 sm:flex-none" aria-label="Filtrar por profissional">
              <option value="all">Todas as profissionais</option>
              {professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          )}
          {props.canManage && (
            <Button variant="secondary" onClick={() => setShowConfirmations(true)} title="Enviar ou reenviar confirmações pelo WhatsApp">
              <MessageCircle className="h-4 w-4" /> <span className="hidden sm:inline">Confirmações</span>
              {toSend > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-badge px-1 text-[11px] font-semibold text-white tabular">{toSend}</span>}
            </Button>
          )}
          {!readOnly && (
            <Button onClick={() => setDraft({ date, time: "", professionalId: visiblePros[0]?.id ?? "" })} title="Novo agendamento (N)">
              <Plus className="h-4 w-4" /> Agendar
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-muted">
        {(["pending", "confirmed", "completed", "no_show"] as const).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", STATUS_STYLE[s].dot)} aria-hidden />
            {STATUS_LABEL[s]} <span className="tabular font-medium text-ink-soft">{counts[s] ?? 0}</span>
          </span>
        ))}
        <label className="inline-flex cursor-pointer items-center gap-1.5">
          <input type="checkbox" className="accent-accent-strong" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />
          Ver cancelados ({counts.cancelled ?? 0})
        </label>
      </div>

      {(view === "dia" || view === "lista") && (
        <DaySummary items={visibleItems} pros={visiblePros} weekday={localWeekday(date)} tz={timeZone} toMin={(iso) => minutesOf(localTime(new Date(iso), timeZone))} />
      )}
      {view === "lista" && (
        <ListViewForDay {...props} pros={visiblePros} items={visibleItems} onOpen={openItem}
          onSlot={(professionalId, time) => !readOnly && setDraft({ date, time, professionalId })} />
      )}
      {view === "dia" && (
        <DayGrid {...props} {...dragProps} pros={visiblePros} items={visibleItems}
          onSlot={(professionalId, time) => !readOnly && setDraft({ date, time, professionalId })} onOpen={openItem} />
      )}
      {view === "semana" && (
        <WeekGrid {...props} {...dragProps} pros={visiblePros} items={visibleItems} onOpen={openItem}
          onSlot={(d, time) => !readOnly && setDraft({ date: d, time, professionalId: visiblePros[0]?.id ?? "" })} />
      )}
      {props.canManage && (view === "dia" || view === "semana") && (
        <p className="hidden text-xs text-muted sm:block">Dica: arraste um horário para outro lugar{view === "dia" && visiblePros.length > 1 ? " (ou para outra profissional)" : ""} e pronto, remarcado! No celular, toque e segure antes de arrastar.</p>
      )}
      {view === "mes" && <MonthGrid {...props} items={visibleItems} pros={visiblePros} onDay={(d) => go({ data: d, visao: "dia" })} />}

      {draft && (
        <NewAppointmentDialog
          draft={draft}
          onClose={() => { setDraft(null); dropNovo(); }}
          onCreated={(id) => { setDraft(null); dropNovo(); router.refresh(); setOpenId(id); }}
          professionals={professionals}
          services={props.services}
          canCreateClients={props.canCreateClients}
        />
      )}
      {openId && (
        <AppointmentDrawer id={openId} timeZone={timeZone} professionals={professionals} readOnly={readOnly}
          onClose={() => { setOpenId(null); if (props.openAppointmentId) router.replace(`/app/agenda?data=${date}&visao=${view}`); }}
          onChanged={() => router.refresh()} />
      )}
      <ConfirmationsDialog open={showConfirmations} onClose={() => setShowConfirmations(false)} items={visibleItems} title={title}
        tomorrowHref={(view === "dia" || view === "lista") && date === today ? `/app/agenda?data=${addDaysToKey(today, 1)}&visao=${view}&confirmacoes=1` : undefined} />
    </div>
    </ConfirmationContext.Provider>
  );
}

// ---------------------------------------------------------------------------

function gridBounds(pros: AgendaProfessional[], items: AgendaItemDTO[], tz: string) {
  let start = 8 * 60, end = 20 * 60;
  const hrs = pros.flatMap((p) => p.hours);
  if (hrs.length) {
    start = Math.min(...hrs.map((h) => minutesOf(h.start)));
    end = Math.max(...hrs.map((h) => minutesOf(h.end)));
  }
  for (const i of items) {
    start = Math.min(start, minutesOf(localTime(new Date(i.startsAt), tz)));
    const e = minutesOf(localTime(new Date(i.endsAt), tz));
    end = Math.max(end, e === 0 ? 24 * 60 : e);
  }
  return { start: Math.floor(start / 60) * 60, end: Math.min(Math.ceil(end / 60) * 60, 24 * 60) };
}

/** Distribui atendimentos sobrepostos (encaixes) lado a lado. */
function layoutColumns<T extends { startsAt: string; endsAt: string }>(list: T[]) {
  const sorted = [...list].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const out: { item: T; col: number; cols: number }[] = [];
  let group: { item: T; col: number }[] = [];
  let groupEnd = "";
  const flush = () => {
    const cols = Math.max(1, ...group.map((g) => g.col + 1));
    for (const g of group) out.push({ ...g, cols });
    group = [];
  };
  for (const item of sorted) {
    if (group.length && item.startsAt >= groupEnd) { flush(); groupEnd = ""; }
    const used = new Set(group.filter((g) => g.item.endsAt > item.startsAt).map((g) => g.col));
    let col = 0;
    while (used.has(col)) col++;
    group.push({ item, col });
    if (item.endsAt > groupEnd) groupEnd = item.endsAt;
  }
  flush();
  return out;
}

const subscribeMinute = (cb: () => void) => {
  const t = setInterval(cb, 30_000);
  return () => clearInterval(t);
};
const minuteSnapshot = () => Math.floor(Date.now() / 60_000);

/** Minuto atual no fuso do negócio; nulo no servidor para evitar divergência de hidratação. */
function useNowMinute(tz: string) {
  const minute = useSyncExternalStore(subscribeMinute, minuteSnapshot, () => null);
  if (minute === null) return null;
  const now = new Date(minute * 60_000);
  return { key: localDateKey(now, tz), minute: minutesOf(localTime(now, tz)) };
}

function HourRail({ start, end }: { start: number; end: number }) {
  const hours = [];
  for (let m = start; m < end; m += 60) hours.push(m);
  return (
    <div className="relative w-12 shrink-0 select-none" style={{ height: (end - start) * PX_PER_MIN }} aria-hidden>
      {hours.map((m) => (
        <div key={m} className="absolute right-2 -translate-y-1/2 text-[11px] text-muted tabular" style={{ top: (m - start) * PX_PER_MIN }}>
          {m > start ? `${String(m / 60).padStart(2, "0")}:00` : ""}
        </div>
      ))}
    </div>
  );
}

function Column({
  dayKey, tz, bounds, hours, items, timeOff, onSlot, onOpen, now, showPro, pros, colPro, drag, startDrag, showGaps,
}: {
  dayKey: string; tz: string; bounds: { start: number; end: number }; hours: { start: string; end: string }[];
  items: AgendaItemDTO[]; timeOff: TimeOffDTO[]; onSlot: (time: string) => void; onOpen: (id: string) => void;
  now: { key: string; minute: number } | null; showPro?: boolean; pros: AgendaProfessional[];
  colPro?: string; drag?: DragState | null; startDrag?: StartDrag; showGaps?: boolean;
}) {
  const total = bounds.end - bounds.start;
  const working = hours.map((h) => [minutesOf(h.start), minutesOf(h.end)] as const).sort((a, b) => a[0] - b[0]);
  const off: [number, number][] = [];
  let cursor = bounds.start;
  for (const [s, e] of working) { if (s > cursor) off.push([cursor, s]); cursor = Math.max(cursor, e); }
  if (cursor < bounds.end) off.push([cursor, bounds.end]);
  const toMin = (iso: string) => {
    const d = new Date(iso);
    const k = localDateKey(d, tz);
    if (k < dayKey) return bounds.start;
    if (k > dayKey) return bounds.end;
    return minutesOf(localTime(d, tz));
  };
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-appt]")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const minute = bounds.start + Math.floor((e.clientY - rect.top) / PX_PER_MIN / 15) * 15;
    onSlot(`${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`);
  };
  const hourLines = [];
  for (let m = bounds.start + 60; m < bounds.end; m += 60) hourLines.push(m);
  // Horários livres (só hoje a partir de agora e dias futuros).
  const fromMinute = now ? (dayKey < now.key ? Infinity : dayKey === now.key ? now.minute : 0) : 0;
  const gaps = showGaps && fromMinute !== Infinity ? freeGaps({ hours, items, timeOff, tz, toMin, fromMinute }) : [];
  const preview = drag && drag.moved !== undefined && drag.day === dayKey && (!colPro || drag.pro === colPro) ? drag : null;
  return (
    <div className={cn("relative flex-1 cursor-copy border-l border-line", preview && "bg-accent-subtle/40")} style={{ height: total * PX_PER_MIN }} onClick={handleClick}
      role="grid" aria-label={`Horários de ${dayKey}`} data-col-day={dayKey} data-col-pro={colPro ?? ""} data-col-start={bounds.start}>
      {off.map(([s, e]) => (
        <div key={s} className="absolute inset-x-0 bg-sunken/70" style={{ top: (s - bounds.start) * PX_PER_MIN, height: (e - s) * PX_PER_MIN }} aria-hidden />
      ))}
      {hourLines.map((m) => <div key={m} className="absolute inset-x-0 border-t border-line/70" style={{ top: (m - bounds.start) * PX_PER_MIN }} aria-hidden />)}
      {timeOff.map((t) => {
        const s = Math.max(toMin(t.startsAt), bounds.start), e = Math.min(toMin(t.endsAt), bounds.end);
        if (e <= s) return null;
        return (
          <div key={t.id} className="absolute inset-x-1 overflow-hidden rounded-md border border-dashed border-line-strong bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,rgba(111,101,108,0.08)_6px,rgba(111,101,108,0.08)_12px)] px-2 py-1 text-[11px] text-muted"
            style={{ top: (s - bounds.start) * PX_PER_MIN, height: (e - s) * PX_PER_MIN }}>
            Bloqueado{t.reason ? ` · ${t.reason}` : ""}
          </div>
        );
      })}
      {gaps.map(([gs, ge]) => (
        <div key={`gap-${gs}`} aria-hidden className="pointer-events-none absolute inset-x-1 flex items-start rounded-md border border-dashed border-accent-border/50 px-2 py-1 text-[11px] text-accent-text/80"
          style={{ top: (gs - bounds.start) * PX_PER_MIN + 1, height: (ge - gs) * PX_PER_MIN - 2 }}>
          Livre · {hhmm(gs)}–{hhmm(ge)}
        </div>
      ))}
      {layoutColumns(items).map(({ item, col, cols }) => {
        const s = toMin(item.startsAt), e = toMin(item.endsAt);
        const height = Math.max((e - s) * PX_PER_MIN, 24);
        const pro = pros.find((p) => p.id === item.professionalId);
        return (
          <div key={item.id} data-appt className={cn("absolute hover:z-10 focus-within:z-10", drag?.item.id === item.id && "opacity-40")}
            style={{ top: (s - bounds.start) * PX_PER_MIN + 1, height: height - 2, left: `calc(${(col / cols) * 100}% + 3px)`, width: `calc(${100 / cols}% - 6px)` }}>
            <button onClick={() => onOpen(item.id)}
              onPointerDown={startDrag ? (e) => startDrag(item, e, { day: dayKey, minute: s, dur: toMin(item.endsAt) - s, grab: (e.clientY - e.currentTarget.getBoundingClientRect().top) / PX_PER_MIN }) : undefined}
              onContextMenu={startDrag ? (e) => e.preventDefault() : undefined}
              className={cn("absolute inset-0 overflow-hidden rounded-lg border-l-[3px] py-1 pl-2 pr-7 text-left shadow-sm transition duration-200 hover:z-10 hover:shadow-[0_0_0_1px_rgb(213_158_250/0.45),0_10px_24px_-10px_rgb(150_13_242/0.7)] hover:brightness-125 active:scale-[0.97] focus-visible:z-10 [-webkit-tap-highlight-color:transparent]", STATUS_STYLE[item.status].block)}
              aria-label={`${localTime(new Date(item.startsAt), tz)} ${item.clientName}, ${item.services}, ${STATUS_LABEL[item.status]}`}>
              <div className="flex items-center gap-1 text-[11px] text-ink-soft tabular">
                {showPro && pro && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: pro.color }} />}
                {localTime(new Date(item.startsAt), tz)}
                {item.source === "online" && <Globe className="h-3 w-3" aria-label="Online" />}
                {item.squeezeIn && <Zap className="h-3 w-3" aria-label="Encaixe" />}
              </div>
              <div className="truncate text-[13px] leading-tight font-medium text-ink">{item.clientName}</div>
              {height > 44 && <div className="truncate text-[12px] text-ink-soft">{item.services}</div>}
            </button>
            {height >= 40 && <BlockSendButton item={item} />}
          </div>
        );
      })}
      {preview && (
        <div aria-hidden className="pointer-events-none absolute inset-x-1 z-20 rounded-lg border-2 border-dashed border-accent bg-accent-subtle/80 px-2 py-1 text-[12px] font-semibold text-accent-text shadow-[var(--shadow-pop)]"
          style={{ top: (preview.minute - bounds.start) * PX_PER_MIN, height: Math.max(preview.dur * PX_PER_MIN, 24) }}>
          {hhmm(preview.minute)}–{hhmm(preview.minute + preview.dur)} · {preview.item.clientName.split(" ")[0]}
        </div>
      )}
      {now && now.key === dayKey && now.minute >= bounds.start && now.minute <= bounds.end && (
        <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: (now.minute - bounds.start) * PX_PER_MIN }} aria-hidden>
          <span className="-ml-1 h-2 w-2 rounded-full bg-accent-strong" /><span className="h-px flex-1 bg-accent-strong" />
        </div>
      )}
    </div>
  );
}

type GridProps = Props & { pros: AgendaProfessional[]; items: AgendaItemDTO[]; onOpen: (id: string) => void; drag?: DragState | null; startDrag?: StartDrag };

function DayGrid({ date, timeZone, pros, items, timeOff, onSlot, onOpen, drag, startDrag, readOnly }: GridProps & { onSlot: (pro: string, time: string) => void }) {
  const bounds = gridBounds(pros, items, timeZone);
  const now = useNowMinute(timeZone);
  const wd = localWeekday(date);
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
      <div className="overflow-x-auto">
        <div style={{ minWidth: pros.length > 1 ? pros.length * 180 + 48 : undefined }}>
          <div className="sticky top-0 z-20 flex border-b border-line bg-surface">
            <div className="w-12 shrink-0" />
            {pros.map((p) => (
              <div key={p.id} className="flex flex-1 items-center gap-2 border-l border-line px-3 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} aria-hidden />
                <span className="truncate text-sm font-medium">{p.name}</span>
                {!p.hours.some((h) => h.weekday === wd) && <span className="text-xs text-muted">· folga</span>}
              </div>
            ))}
          </div>
          <div className="flex pt-2">
            <HourRail {...bounds} />
            {pros.map((p) => (
              <Column key={p.id} dayKey={date} tz={timeZone} bounds={bounds} pros={pros}
                hours={p.hours.filter((h) => h.weekday === wd)}
                items={items.filter((i) => i.professionalId === p.id)}
                timeOff={timeOff.filter((t) => t.professionalId === null || t.professionalId === p.id)}
                onSlot={(time) => onSlot(p.id, time)} onOpen={onOpen} now={now} colPro={p.id} drag={drag} startDrag={startDrag} showGaps={!readOnly} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function WeekGrid({ rangeStart, today, timeZone, pros, items, timeOff, onSlot, onOpen, drag, startDrag }: GridProps & { onSlot: (date: string, time: string) => void }) {
  const days = Array.from({ length: 7 }, (_, i) => addDaysToKey(rangeStart, i));
  const bounds = gridBounds(pros, items, timeZone);
  const now = useNowMinute(timeZone);
  const single = pros.length === 1 ? pros[0]! : null;
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
      <div className="overflow-x-auto">
        <div className="min-w-[860px]">
          <div className="sticky top-0 z-20 flex border-b border-line bg-surface">
            <div className="w-12 shrink-0" />
            {days.map((d, i) => (
              <div key={d} className={cn("flex-1 border-l border-line px-3 py-2 text-center", d === today && "bg-accent-subtle")}>
                <div className="text-xs text-muted">{WEEK_LABELS[i]}</div>
                <div className={cn("text-[15px] font-semibold tabular", d === today && "text-accent-text")}>{d.slice(8)}</div>
              </div>
            ))}
          </div>
          <div className="flex pt-2">
            <HourRail {...bounds} />
            {days.map((d) => {
              const wd = localWeekday(d);
              const hours = single ? single.hours.filter((h) => h.weekday === wd) : mergeHours(pros, wd);
              return (
                <Column key={d} dayKey={d} tz={timeZone} bounds={bounds} hours={hours} pros={pros} showPro={!single}
                  items={items.filter((i) => localDateKey(new Date(i.startsAt), timeZone) === d)}
                  timeOff={timeOff.filter((t) => t.professionalId === null || pros.some((p) => p.id === t.professionalId) && (!single || t.professionalId === single.id))}
                  onSlot={(time) => onSlot(d, time)} onOpen={onOpen} now={now} drag={drag} startDrag={startDrag} />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function mergeHours(pros: AgendaProfessional[], weekday: number) {
  return pros.flatMap((p) => p.hours.filter((h) => h.weekday === weekday));
}

function MonthGrid({ rangeStart, date, today, timeZone, items, pros, onDay }: Props & { pros: AgendaProfessional[]; items: AgendaItemDTO[]; onDay: (d: string) => void }) {
  const days = Array.from({ length: 42 }, (_, i) => addDaysToKey(rangeStart, i));
  const month = date.slice(0, 7);
  const byDay = new Map<string, AgendaItemDTO[]>();
  for (const i of items) {
    const k = localDateKey(new Date(i.startsAt), timeZone);
    byDay.set(k, [...(byDay.get(k) ?? []), i]);
  }
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
      <div className="grid grid-cols-7 border-b border-line bg-canvas/60">
        {WEEK_LABELS.map((w) => <div key={w} className="px-2 py-2 text-center text-xs font-medium text-muted">{w}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const list = (byDay.get(d) ?? []).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
          const inMonth = d.startsWith(month);
          return (
            <button key={d} onClick={() => onDay(d)}
              className={cn("flex min-h-[92px] flex-col gap-1 border-r border-b border-line p-1.5 text-left transition hover:bg-accent-subtle active:bg-accent-muted sm:min-h-[112px] sm:p-2 [&:nth-child(7n)]:border-r-0", !inMonth && "bg-canvas/50 text-muted")}
              aria-label={`${d.split("-").reverse().join("/")}: ${plural(list.length, "atendimento")}`}>
              <span className={cn("grid h-6 w-6 place-items-center rounded-full text-[13px] font-medium tabular", d === today && "btn-glow text-white")}>{Number(d.slice(8))}</span>
              {list.slice(0, 3).map((i) => {
                const pro = pros.find((p) => p.id === i.professionalId);
                return (
                  <span key={i.id} className={cn("hidden truncate rounded px-1.5 py-0.5 text-[11px] sm:block", STATUS_STYLE[i.status].badge)}>
                    {pro && pros.length > 1 && <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: pro.color }} />}
                    {localTime(new Date(i.startsAt), timeZone)} {i.clientName.split(" ")[0]}
                  </span>
                );
              })}
              {list.length > 0 && (
                <span className="mt-auto text-[11px] font-medium text-accent-text sm:text-xs">
                  <span className="sm:hidden">{list.length}</span>
                  <span className="hidden sm:inline">{list.length > 3 ? `+${list.length - 3} mais` : ""}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Lista do dia com os horários livres de cada profissional entre os atendimentos. */
function ListViewForDay({ date, today, timeZone, pros, items, timeOff, canManage, onOpen, onSlot }: GridProps & { onSlot: (pro: string, time: string) => void }) {
  const now = useNowMinute(timeZone);
  const wd = localWeekday(date);
  const toMin = (iso: string) => {
    const d = new Date(iso);
    const k = localDateKey(d, timeZone);
    return k < date ? 0 : k > date ? 24 * 60 : minutesOf(localTime(d, timeZone));
  };
  const fromMinute = date < today ? Infinity : date === today ? (now?.minute ?? 0) : 0;
  const gapsByPro = fromMinute === Infinity ? [] : pros.map((pro) => ({
    pro,
    gaps: freeGaps({ hours: pro.hours.filter((h) => h.weekday === wd), items: items.filter((i) => i.professionalId === pro.id),
      timeOff: timeOff.filter((t) => t.professionalId === null || t.professionalId === pro.id), tz: timeZone, toMin, fromMinute }),
  }));
  return <ListView items={items} pros={pros} tz={timeZone} canManage={canManage} gapsByPro={gapsByPro} onOpen={onOpen} onSlot={onSlot}
    nowMinute={now?.minute ?? null} isToday={date === today} />;
}
