import { addDaysToKey, localWeekday, zonedDateTime } from "@/lib/time";

export type TimeRange = { start: Date; end: Date };
export type WorkingWindow = { weekday: number; start: string; end: string };

export type SlotQuery = {
  date: string; // YYYY-MM-DD no fuso do negócio
  timeZone: string;
  workingHours: WorkingWindow[];
  busy: TimeRange[]; // agendamentos ativos (até blocked_until) e bloqueios
  serviceMinutes: number; // duração somada dos serviços
  bufferAfterMinutes: number; // limpeza/preparação depois do atendimento
  slotIntervalMinutes: number;
  now: Date;
  minAdvanceMinutes: number;
  maxAdvanceDays: number;
};

const MIN = 60_000;

export function overlaps(a: TimeRange, b: TimeRange): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Horários de início disponíveis em um dia para uma profissional.
 * Regras: o atendimento inteiro precisa caber na janela de trabalho; o tempo de
 * limpeza pode ultrapassar o fim do expediente, mas não pode colidir com outro
 * compromisso; respeita antecedência mínima e horizonte máximo.
 */
export function availableSlots(q: SlotQuery): Date[] {
  const earliest = new Date(q.now.getTime() + q.minAdvanceMinutes * MIN);
  const horizonEnd = zonedDateTime(addDaysToKey(localKeyFromNow(q), q.maxAdvanceDays + 1), "00:00", q.timeZone);
  const weekday = localWeekday(q.date);
  const slots: Date[] = [];

  for (const w of q.workingHours.filter((x) => x.weekday === weekday)) {
    const windowStart = zonedDateTime(q.date, w.start, q.timeZone);
    const windowEnd = zonedDateTime(q.date, w.end, q.timeZone);
    for (let t = windowStart.getTime(); ; t += q.slotIntervalMinutes * MIN) {
      const start = new Date(t);
      const end = new Date(t + q.serviceMinutes * MIN);
      if (end > windowEnd) break;
      if (start < earliest || start >= horizonEnd) continue;
      const occupied = { start, end: new Date(end.getTime() + q.bufferAfterMinutes * MIN) };
      if (q.busy.some((b) => overlaps(occupied, b))) continue;
      slots.push(start);
    }
  }
  return slots.sort((a, b) => a.getTime() - b.getTime());
}

function localKeyFromNow(q: SlotQuery): string {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: q.timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  return f.format(q.now);
}

/** Verificação usada no servidor ao gravar: o intervalo cabe no expediente e não colide. */
export function fitsWorkingHours(range: TimeRange, date: string, timeZone: string, hours: WorkingWindow[]): boolean {
  const weekday = localWeekday(date);
  return hours
    .filter((w) => w.weekday === weekday)
    .some((w) => zonedDateTime(date, w.start, timeZone) <= range.start && range.end <= zonedDateTime(date, w.end, timeZone));
}
