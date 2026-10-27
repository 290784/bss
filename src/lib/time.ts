import { TZDate } from "@date-fns/tz";

/** "YYYY-MM-DD" + "HH:MM" no fuso informado → instante absoluto. */
export function zonedDateTime(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(new TZDate(y!, m! - 1, d!, hh!, mm!, 0, timeZone).getTime());
}

/** Data local (YYYY-MM-DD) de um instante em um fuso. */
export function localDateKey(instant: Date, timeZone: string): string {
  const t = new TZDate(instant.getTime(), timeZone);
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
}

export function localTime(instant: Date, timeZone: string): string {
  const t = new TZDate(instant.getTime(), timeZone);
  return `${pad(t.getHours())}:${pad(t.getMinutes())}`;
}

/** Dia da semana local (0 = domingo). */
export function localWeekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
}

export function addDaysToKey(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d! + days));
  return dt.toISOString().slice(0, 10);
}

export function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h! * 60 + m!;
}

export function isDateKey(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + "T00:00:00Z"));
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

const dateFmt = new Map<string, Intl.DateTimeFormat>();
export function formatInTz(instant: Date, timeZone: string, opts: Intl.DateTimeFormatOptions): string {
  const key = timeZone + JSON.stringify(opts);
  let f = dateFmt.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat("pt-BR", { timeZone, ...opts });
    dateFmt.set(key, f);
  }
  return f.format(instant);
}

/** DD/MM/AAAA */
export function formatDateBR(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}
