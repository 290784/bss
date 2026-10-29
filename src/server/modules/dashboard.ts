import type { Tx } from "@/server/db";
import { addDaysToKey, localDateKey, localWeekday, zonedDateTime } from "@/lib/time";
import { percentChange, ratio } from "@/domain/metrics";

export type PeriodId = "today" | "week" | "month" | "30d";
export const PERIOD_LABEL: Record<PeriodId, string> = { today: "Hoje", week: "Esta semana", month: "Este mês", "30d": "Últimos 30 dias" };
/** Com o que cada período é comparado (texto exibido no painel). */
export const COMPARACAO: Record<PeriodId, string> = {
  today: "comparação com ontem", week: "comparação com o mesmo trecho da semana passada (até ontem)",
  month: "comparação com o mesmo período do mês passado (até ontem)", "30d": "comparação com os 30 dias anteriores",
};

export type Period = {
  id: PeriodId; fromKey: string; toKey: string; from: Date; to: Date; prevFrom: Date; prevTo: Date; days: string[];
  /** Janela usada nas comparações: "este mês"/"esta semana" comparam só os dias já fechados (até ontem), com o mesmo trecho do período anterior. */
  cmpTo: Date; prevDays: string[];
};

/**
 * Intervalos sempre no fuso do negócio, fim exclusivo. Hoje e últimos 30 dias comparam com o período
 * anterior de mesmo tamanho. Este mês e esta semana comparam os dias já fechados (até ontem) com o
 * mesmo trecho do mês/semana anterior — senão o dia 29 de um mês seria comparado com o mês anterior
 * inteiro (e o dia de hoje, ainda em andamento, com um dia completo) e pareceria queda.
 */
export function resolvePeriod(id: PeriodId, timeZone: string, now = new Date()): Period {
  const today = localDateKey(now, timeZone);
  let fromKey = today;
  let toKey = addDaysToKey(today, 1);
  if (id === "week") {
    const wd = localWeekday(today);
    fromKey = addDaysToKey(today, -((wd + 6) % 7)); // segunda-feira
    toKey = addDaysToKey(fromKey, 7);
  } else if (id === "month") {
    fromKey = today.slice(0, 8) + "01";
    const [y, m] = today.split("-").map(Number);
    toKey = new Date(Date.UTC(y!, m!, 1)).toISOString().slice(0, 10);
  } else if (id === "30d") {
    fromKey = addDaysToKey(today, -29);
  }
  const from = zonedDateTime(fromKey, "00:00", timeZone);
  const to = zonedDateTime(toKey, "00:00", timeZone);
  const days: string[] = [];
  for (let d = fromKey; d < toKey; d = addDaysToKey(d, 1)) days.push(d);
  const span = (a: string, b: string) => { const r: string[] = []; for (let d = a; d < b; d = addDaysToKey(d, 1)) r.push(d); return r; };

  if (id === "month" || id === "week") {
    const cmpToKey = today < toKey ? today : toKey; // dias já fechados
    const elapsed = span(fromKey, cmpToKey).length;
    const prevFromKey = id === "week" ? addDaysToKey(fromKey, -7)
      : (() => { const [y, m] = fromKey.split("-").map(Number); return new Date(Date.UTC(y!, m! - 2, 1)).toISOString().slice(0, 10); })();
    // Mês anterior mais curto (ex.: 30 de março → fevereiro): a comparação para no fim dele.
    const prevToKey = addDaysToKey(prevFromKey, elapsed) < fromKey ? addDaysToKey(prevFromKey, elapsed) : fromKey;
    return { id, fromKey, toKey, from, to, days,
      cmpTo: zonedDateTime(cmpToKey, "00:00", timeZone), prevFrom: zonedDateTime(prevFromKey, "00:00", timeZone),
      prevTo: zonedDateTime(prevToKey, "00:00", timeZone), prevDays: span(prevFromKey, prevToKey) };
  }
  const len = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - len);
  return { id, fromKey, toKey, from, to, prevFrom, prevTo: from, days, cmpTo: to,
    prevDays: span(localDateKey(prevFrom, timeZone), fromKey) };
}

async function periodNumbers(tx: Tx, orgId: string, from: Date, to: Date, includeFinance: boolean) {
  const [a] = await tx<{
    total: number; pending: number; confirmed: number; completed: number; cancelled: number; no_show: number;
    scheduled_value: number; produced_value: number; booked_minutes: number;
  }[]>`
    select
      count(*) filter (where status <> 'cancelled')::int as total,
      count(*) filter (where status = 'pending')::int as pending,
      count(*) filter (where status = 'confirmed')::int as confirmed,
      count(*) filter (where status = 'completed')::int as completed,
      count(*) filter (where status = 'cancelled')::int as cancelled,
      count(*) filter (where status = 'no_show')::int as no_show,
      coalesce(sum(price_cents - discount_cents) filter (where status in ('pending', 'confirmed', 'completed')), 0)::int as scheduled_value,
      coalesce(sum(price_cents - discount_cents) filter (where status = 'completed'), 0)::int as produced_value,
      coalesce(sum(extract(epoch from (ends_at - starts_at)) / 60) filter (where status in ('pending', 'confirmed', 'completed')), 0)::int as booked_minutes
    from app.appointments
    where organization_id = ${orgId} and starts_at >= ${from} and starts_at < ${to}`;
  const [rev] = includeFinance
    ? await tx<{ revenue: number }[]>`
        select coalesce(sum(case when kind = 'payment' then amount_cents else -amount_cents end), 0)::int as revenue
        from app.payments where organization_id = ${orgId} and paid_at >= ${from} and paid_at < ${to}`
    : [{ revenue: 0 }];
  const [cl] = await tx<{ new_clients: number; returning_clients: number }[]>`
    with visits as (
      select client_id, min(starts_at) as first_visit,
        bool_or(starts_at >= ${from} and starts_at < ${to}) as in_period
      from app.appointments where organization_id = ${orgId} and status = 'completed' and starts_at < ${to}
      group by client_id
    )
    select count(*) filter (where in_period and first_visit >= ${from})::int as new_clients,
           count(*) filter (where in_period and first_visit < ${from})::int as returning_clients
    from visits`;
  return { ...a!, revenue: rev!.revenue, ...cl! };
}

async function capacityMinutes(tx: Tx, orgId: string, timeZone: string, from: Date, to: Date, days: string[]) {
  const hours = await tx<{ professional_id: string; weekday: number; start: string; end: string }[]>`
    select w.professional_id, w.weekday, to_char(w.start_time, 'HH24:MI') as start, to_char(w.end_time, 'HH24:MI') as end
    from app.working_hours w join app.professionals p on p.id = w.professional_id
    where w.organization_id = ${orgId} and p.is_active`;
  const blocks = await tx<{ professional_id: string | null; starts_at: Date; ends_at: Date }[]>`
    select professional_id, starts_at, ends_at from app.time_off
    where organization_id = ${orgId} and starts_at < ${to} and ends_at > ${from}`;
  let total = 0;
  for (const day of days) {
    const wd = localWeekday(day);
    for (const h of hours.filter((x) => x.weekday === wd)) {
      const s = zonedDateTime(day, h.start, timeZone).getTime();
      const e = zonedDateTime(day, h.end, timeZone).getTime();
      let minutes = (e - s) / 60_000;
      for (const b of blocks.filter((b) => b.professional_id === null || b.professional_id === h.professional_id)) {
        const overlap = Math.min(e, b.ends_at.getTime()) - Math.max(s, b.starts_at.getTime());
        if (overlap > 0) minutes -= overlap / 60_000;
      }
      total += Math.max(minutes, 0);
    }
  }
  return Math.round(total);
}

export async function loadDashboard(tx: Tx, orgId: string, timeZone: string, periodId: PeriodId, opts: { includeFinance: boolean }, now = new Date()) {
  const p = resolvePeriod(periodId, timeZone, now);
  const partial = p.cmpTo.getTime() < p.to.getTime();
  const [cur, prev, capacity, prevCapacity, curCmp] = await Promise.all([
    periodNumbers(tx, orgId, p.from, p.to, opts.includeFinance),
    periodNumbers(tx, orgId, p.prevFrom, p.prevTo, opts.includeFinance),
    capacityMinutes(tx, orgId, timeZone, p.from, p.to, p.days),
    capacityMinutes(tx, orgId, timeZone, p.prevFrom, p.prevTo, p.prevDays),
    partial ? periodNumbers(tx, orgId, p.from, p.cmpTo, opts.includeFinance) : null,
  ]);
  // Valores exibidos: o período inteiro. Variação: o trecho comparável (até hoje) contra o anterior.
  const cmp = curCmp ?? cur;

  const receivable = opts.includeFinance
    ? (await tx<{ total: number; count: number }[]>`
        select coalesce(sum(due - paid), 0)::int as total, count(*)::int as count from (
          select a.price_cents - a.discount_cents as due,
            coalesce((select sum(case when kind = 'payment' then amount_cents else -amount_cents end) from app.payments pm where pm.appointment_id = a.id), 0) as paid
          from app.appointments a where a.organization_id = ${orgId} and a.status = 'completed'
        ) x where due > paid`)[0]!
    : null;

  const series = await tx<{ day: string; revenue: number; appointments: number }[]>`
    with days as (select generate_series(${p.fromKey}::date, (${p.toKey}::date - 1), interval '1 day')::date as day)
    select to_char(d.day, 'YYYY-MM-DD') as day,
      coalesce((select sum(case when kind = 'payment' then amount_cents else -amount_cents end) from app.payments
                where organization_id = ${orgId} and ${opts.includeFinance} and (paid_at at time zone ${timeZone})::date = d.day), 0)::int as revenue,
      (select count(*) from app.appointments where organization_id = ${orgId} and status <> 'cancelled'
                and (starts_at at time zone ${timeZone})::date = d.day)::int as appointments
    from days d order by d.day`;

  const byProfessional = await tx<{ id: string; name: string; color: string; completed: number; no_show: number; produced: number; booked_minutes: number }[]>`
    select p.id, p.display_name as name, p.color,
      count(a.id) filter (where a.status = 'completed')::int as completed,
      count(a.id) filter (where a.status = 'no_show')::int as no_show,
      coalesce(sum(a.price_cents - a.discount_cents) filter (where a.status = 'completed'), 0)::int as produced,
      coalesce(sum(extract(epoch from (a.ends_at - a.starts_at)) / 60) filter (where a.status in ('pending', 'confirmed', 'completed')), 0)::int as booked_minutes
    from app.professionals p
    left join app.appointments a on a.professional_id = p.id and a.starts_at >= ${p.from} and a.starts_at < ${p.to}
    where p.organization_id = ${orgId} and p.is_active
    group by p.id order by produced desc, p.display_name`;

  const reactivate = await tx<{ id: string; full_name: string; last_visit: Date; visits: number }[]>`
    select c.id, c.full_name, max(a.starts_at) as last_visit, count(*)::int as visits
    from app.clients c join app.appointments a on a.client_id = c.id and a.status = 'completed'
    where c.organization_id = ${orgId} and c.archived_at is null
      and not exists (select 1 from app.appointments f where f.client_id = c.id and f.status in ('pending', 'confirmed') and f.starts_at > now())
    group by c.id
    having max(a.starts_at) < now() - interval '60 days'
    order by count(*) desc, max(a.starts_at) desc limit 5`;

  const delta = (k: keyof typeof cur) => ({ value: cur[k], previous: prev[k], change: percentChange(cmp[k], prev[k]) });
  const noShowRate = ratio(cur.no_show, cur.completed + cur.no_show);
  const prevNoShowRate = ratio(prev.no_show, prev.completed + prev.no_show);
  const occupancy = ratio(cur.booked_minutes, capacity);
  const prevOccupancy = ratio(prev.booked_minutes, prevCapacity);

  return {
    period: p,
    revenue: opts.includeFinance ? delta("revenue") : null,
    scheduledValue: delta("scheduled_value"),
    produced: delta("produced_value"),
    appointments: delta("total"),
    statusCounts: { pending: cur.pending, confirmed: cur.confirmed, completed: cur.completed, cancelled: cur.cancelled, no_show: cur.no_show },
    noShows: delta("no_show"),
    noShowRate: { value: noShowRate, previous: prevNoShowRate },
    occupancy: { value: occupancy, previous: prevOccupancy, capacityMinutes: capacity, bookedMinutes: cur.booked_minutes },
    averageTicket: opts.includeFinance
      ? { value: cur.completed ? Math.round(cur.revenue / cur.completed) : null, previous: prev.completed ? Math.round(prev.revenue / prev.completed) : null }
      : null,
    newClients: delta("new_clients"),
    returningClients: delta("returning_clients"),
    receivable,
    series,
    byProfessional,
    reactivate,
  };
}

export type DashboardData = Awaited<ReturnType<typeof loadDashboard>>;

/** Lacunas livres de hoje (≥ 30 min) por profissional, para encaixes e promoções. */
export async function freeGapsToday(tx: Tx, orgId: string, timeZone: string, now = new Date()) {
  const today = localDateKey(now, timeZone);
  const wd = localWeekday(today);
  const pros = await tx<{ id: string; name: string; start: string; end: string }[]>`
    select p.id, p.display_name as name, to_char(w.start_time, 'HH24:MI') as start, to_char(w.end_time, 'HH24:MI') as end
    from app.professionals p join app.working_hours w on w.professional_id = p.id
    where p.organization_id = ${orgId} and p.is_active and w.weekday = ${wd} order by p.created_at, w.start_time`;
  const dayStart = zonedDateTime(today, "00:00", timeZone);
  const dayEnd = zonedDateTime(addDaysToKey(today, 1), "00:00", timeZone);
  const busy = await tx<{ professional_id: string | null; s: Date; e: Date }[]>`
    select professional_id, starts_at as s, blocked_until as e from app.appointments
    where organization_id = ${orgId} and status in ('pending', 'confirmed', 'completed') and starts_at < ${dayEnd} and blocked_until > ${dayStart}
    union all
    select professional_id, starts_at, ends_at from app.time_off where organization_id = ${orgId} and starts_at < ${dayEnd} and ends_at > ${dayStart}`;
  const gaps: { professionalId: string; name: string; start: Date; end: Date }[] = [];
  for (const w of pros) {
    const nowRounded = Math.ceil(now.getTime() / (15 * 60_000)) * 15 * 60_000;
    let cursor = Math.max(zonedDateTime(today, w.start, timeZone).getTime(), nowRounded);
    const end = zonedDateTime(today, w.end, timeZone).getTime();
    const mine = busy
      .filter((b) => b.professional_id === w.id || b.professional_id === null)
      .sort((a, b) => a.s.getTime() - b.s.getTime());
    for (const b of mine) {
      if (b.e.getTime() <= cursor) continue;
      if (b.s.getTime() >= end) break;
      if (b.s.getTime() - cursor >= 30 * 60_000) gaps.push({ professionalId: w.id, name: w.name, start: new Date(cursor), end: b.s });
      cursor = Math.max(cursor, b.e.getTime());
    }
    if (end - cursor >= 30 * 60_000) gaps.push({ professionalId: w.id, name: w.name, start: new Date(cursor), end: new Date(end) });
  }
  return gaps;
}
