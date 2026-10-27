"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
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

export type AgendaViewMode = "dia" | "semana" | "mes";
export type AgendaProfessional = { id: string; name: string; color: string; serviceIds: string[]; hours: { weekday: number; start: string; end: string }[] };
export type AgendaService = { id: string; name: string; priceCents: number; minutes: number; category: string | null };
export type AgendaItemDTO = {
  id: string; professionalId: string; clientName: string; startsAt: string; endsAt: string; status: AppointmentStatus;
  source: "staff" | "online"; services: string; squeezeIn: boolean; priceCents: number; paidCents: number;
  serviceNames: string[]; clientPhone: string | null; receiptUrl: string; clientConfirmedAt: string | null; confirmationSentAt: string | null;
};
export type TimeOffDTO = { id: string; professionalId: string | null; startsAt: string; endsAt: string; reason: string | null };

type Props = {
  view: AgendaViewMode; date: string; today: string; rangeStart: string; rangeEnd: string; timeZone: string;
  initialProfessionalId: string | null; openAppointmentId: string | null; readOnly: boolean; canManage: boolean; canSeeAll: boolean; canCreateClients: boolean;
  professionals: AgendaProfessional[]; services: AgendaService[]; items: AgendaItemDTO[]; timeOff: TimeOffDTO[];
};

const PX_PER_MIN = 1.2;
const WEEK_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function AgendaView(props: Props) {
  const { view, date, today, timeZone, professionals, items, readOnly } = props;
  const router = useRouter();
  const [proFilter, setProFilter] = useState<string>(props.initialProfessionalId ?? "all");
  const [showCancelled, setShowCancelled] = useState(false);
  const [draft, setDraft] = useState<NewDraft | null>(null);
  const [openId, setOpenId] = useState<string | null>(props.openAppointmentId);
  const [showConfirmations, setShowConfirmations] = useState(false);

  const go = (params: Partial<{ data: string; visao: AgendaViewMode }>) => {
    const sp = new URLSearchParams({ data: params.data ?? date, visao: params.visao ?? view });
    if (proFilter !== "all") sp.set("profissional", proFilter);
    router.push(`/app/agenda?${sp}`);
  };
  const step = view === "dia" ? 1 : view === "semana" ? 7 : 0;
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
    if (view === "dia") return formatInTz(d, timeZone, { weekday: "long", day: "numeric", month: "long" });
    if (view === "mes") return formatInTz(d, timeZone, { month: "long", year: "numeric" });
    const s = zonedDateTime(props.rangeStart, "12:00", timeZone);
    const e = zonedDateTime(addDaysToKey(props.rangeEnd, -1), "12:00", timeZone);
    return `${formatInTz(s, timeZone, { day: "numeric", month: "short" })} – ${formatInTz(e, timeZone, { day: "numeric", month: "short", year: "numeric" })}`;
  }, [date, view, timeZone, props.rangeStart, props.rangeEnd]);

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
      <EmptyState icon={CalendarDays} title="Nenhuma agenda ativa" description="Cadastre uma profissional com horários de atendimento para começar a agendar."
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
          <h1 className="min-w-0 truncate font-tight tracking-[-0.02em] text-[22px] font-extrabold first-letter:uppercase sm:text-2xl">{title}</h1>
          <label className="relative ml-1">
            <span className="sr-only">Ir para data</span>
            <input type="date" value={date} onChange={(e) => e.target.value && go({ data: e.target.value })}
              className="h-10 w-10 cursor-pointer rounded-[10px] border border-line-strong bg-surface text-transparent [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:opacity-0" />
            <CalendarDays className="pointer-events-none absolute top-1/2 left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-ink-soft" />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Visualização" className="flex rounded-[10px] bg-sunken p-1">
            {(["dia", "semana", "mes"] as const).map((v) => (
              <button key={v} role="tab" aria-selected={view === v} onClick={() => go({ visao: v })}
                className={cn("h-8 rounded-lg px-3 text-[13px] font-medium capitalize", view === v ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink")}>
                {v === "mes" ? "Mês" : v}
              </button>
            ))}
          </div>
          {props.canSeeAll && professionals.length > 1 && (
            <Select value={proFilter} onChange={(e) => setProFilter(e.target.value)} className="h-10 w-52" aria-label="Filtrar por profissional">
              <option value="all">Todas as profissionais</option>
              {professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          )}
          {props.canManage && (
            <Button variant="secondary" onClick={() => setShowConfirmations(true)} title="Enviar ou reenviar confirmações pelo WhatsApp">
              <MessageCircle className="h-4 w-4" /> Confirmações
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
          Mostrar cancelados ({counts.cancelled ?? 0})
        </label>
      </div>

      {view === "dia" && (
        <DayGrid {...props} pros={visiblePros} items={visibleItems}
          onSlot={(professionalId, time) => !readOnly && setDraft({ date, time, professionalId })} onOpen={setOpenId} />
      )}
      {view === "semana" && (
        <WeekGrid {...props} pros={visiblePros} items={visibleItems} onOpen={setOpenId}
          onSlot={(d, time) => !readOnly && setDraft({ date: d, time, professionalId: visiblePros[0]?.id ?? "" })} />
      )}
      {view === "mes" && <MonthGrid {...props} items={visibleItems} pros={visiblePros} onDay={(d) => go({ data: d, visao: "dia" })} />}

      {draft && (
        <NewAppointmentDialog
          draft={draft}
          onClose={() => setDraft(null)}
          onCreated={(id) => { setDraft(null); router.refresh(); setOpenId(id); }}
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
      <ConfirmationsDialog open={showConfirmations} onClose={() => setShowConfirmations(false)} items={visibleItems} title={title} />
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
  dayKey, tz, bounds, hours, items, timeOff, onSlot, onOpen, now, showPro, pros,
}: {
  dayKey: string; tz: string; bounds: { start: number; end: number }; hours: { start: string; end: string }[];
  items: AgendaItemDTO[]; timeOff: TimeOffDTO[]; onSlot: (time: string) => void; onOpen: (id: string) => void;
  now: { key: string; minute: number } | null; showPro?: boolean; pros: AgendaProfessional[];
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
  return (
    <div className="relative flex-1 cursor-copy border-l border-line" style={{ height: total * PX_PER_MIN }} onClick={handleClick}
      role="grid" aria-label={`Horários de ${dayKey}`}>
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
      {layoutColumns(items).map(({ item, col, cols }) => {
        const s = toMin(item.startsAt), e = toMin(item.endsAt);
        const height = Math.max((e - s) * PX_PER_MIN, 24);
        const pro = pros.find((p) => p.id === item.professionalId);
        return (
          <div key={item.id} data-appt className="absolute hover:z-10 focus-within:z-10"
            style={{ top: (s - bounds.start) * PX_PER_MIN + 1, height: height - 2, left: `calc(${(col / cols) * 100}% + 3px)`, width: `calc(${100 / cols}% - 6px)` }}>
            <button onClick={() => onOpen(item.id)}
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
      {now && now.key === dayKey && now.minute >= bounds.start && now.minute <= bounds.end && (
        <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: (now.minute - bounds.start) * PX_PER_MIN }} aria-hidden>
          <span className="-ml-1 h-2 w-2 rounded-full bg-accent-strong" /><span className="h-px flex-1 bg-accent-strong" />
        </div>
      )}
    </div>
  );
}

type GridProps = Props & { pros: AgendaProfessional[]; items: AgendaItemDTO[]; onOpen: (id: string) => void };

function DayGrid({ date, timeZone, pros, items, timeOff, onSlot, onOpen }: GridProps & { onSlot: (pro: string, time: string) => void }) {
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
                onSlot={(time) => onSlot(p.id, time)} onOpen={onOpen} now={now} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function WeekGrid({ rangeStart, today, timeZone, pros, items, timeOff, onSlot, onOpen }: GridProps & { onSlot: (date: string, time: string) => void }) {
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
                  onSlot={(time) => onSlot(d, time)} onOpen={onOpen} now={now} />
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
              aria-label={`${d.split("-").reverse().join("/")}: ${list.length} atendimento(s)`}>
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
