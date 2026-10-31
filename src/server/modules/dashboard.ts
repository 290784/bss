import type { Tx } from "@/server/db";
import { addDaysToKey, localDateKey, localWeekday, zonedDateTime } from "@/lib/time";
import { percentChange, ratio } from "@/domain/metrics";

export type PeriodId = "today" | "week" | "month" | "30d";
export const PERIOD_LABEL: Record<PeriodId, string> = { today: "Hoje", week: "Esta semana", month: "Este mês", "30d": "Últimos 30 dias" };
/** Com o que cada período é comparado (texto exibido no painel). */
export const COMPARACAO: Record<PeriodId, string> = {
  today: "comparados com ontem", week: "comparados com o mesmo pedaço da semana passada (até ontem)",
  month: "comparados com os mesmos dias do mês passado (até ontem)", "30d": "comparados com os 30 dias anteriores",
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

// ---------------------------------------------------------------------------
// Detalhamento: por serviço, por categoria, origem, vendas adicionais e últimos meses

export type ServiceRowInsight = { name: string; category: string | null; count: number; value: number; avg: number; change: number | null };

/**
 * Detalhes do período para o painel. Considera só atendimentos concluídos (o que de fato foi feito),
 * pelo valor de cada serviço no atendimento; a variação usa a mesma janela de comparação dos indicadores.
 */
export async function loadInsights(tx: Tx, orgId: string, timeZone: string, periodId: PeriodId, now = new Date()) {
  const p = resolvePeriod(periodId, timeZone, now);
  const cmpTo = p.cmpTo.getTime() < p.to.getTime() ? p.cmpTo : p.to;

  const services = await tx<{ name: string; category: string | null; count: number; value: number; cmp_value: number; prev_value: number }[]>`
    select coalesce(s.name, x.service_name) as name, c.name as category,
      count(*) filter (where a.starts_at >= ${p.from} and a.starts_at < ${p.to})::int as count,
      coalesce(sum(x.price_cents) filter (where a.starts_at >= ${p.from} and a.starts_at < ${p.to}), 0)::int as value,
      coalesce(sum(x.price_cents) filter (where a.starts_at >= ${p.from} and a.starts_at < ${cmpTo}), 0)::int as cmp_value,
      coalesce(sum(x.price_cents) filter (where a.starts_at >= ${p.prevFrom} and a.starts_at < ${p.prevTo}), 0)::int as prev_value
    from app.appointment_services x
    join app.appointments a on a.id = x.appointment_id
    left join app.services s on s.id = x.service_id
    left join app.service_categories c on c.id = s.category_id
    where x.organization_id = ${orgId} and a.status = 'completed'
      and ((a.starts_at >= ${p.from} and a.starts_at < ${p.to}) or (a.starts_at >= ${p.prevFrom} and a.starts_at < ${p.prevTo}))
    group by 1, 2`;
  const byService: ServiceRowInsight[] = services
    .filter((s) => s.count > 0)
    .map((s) => ({ name: s.name, category: s.category, count: s.count, value: s.value, avg: Math.round(s.value / s.count), change: percentChange(s.cmp_value, s.prev_value) }))
    .sort((a, b) => b.value - a.value || b.count - a.count);

  const catMap = new Map<string, { name: string; count: number; value: number; cmp: number; prev: number }>();
  for (const s of services) {
    const k = s.category ?? "Sem categoria";
    const c = catMap.get(k) ?? { name: k, count: 0, value: 0, cmp: 0, prev: 0 };
    c.count += s.count; c.value += s.value; c.cmp += s.cmp_value; c.prev += s.prev_value;
    catMap.set(k, c);
  }
  const byCategory = [...catMap.values()].filter((c) => c.count > 0)
    .map((c) => ({ name: c.name, count: c.count, value: c.value, change: percentChange(c.cmp, c.prev) }))
    .sort((a, b) => b.value - a.value);

  const [origin] = await tx<{ online: number; staff: number; online_value: number; staff_value: number }[]>`
    select count(*) filter (where source = 'online')::int as online, count(*) filter (where source <> 'online')::int as staff,
      coalesce(sum(price_cents - discount_cents) filter (where source = 'online' and status = 'completed'), 0)::int as online_value,
      coalesce(sum(price_cents - discount_cents) filter (where source <> 'online' and status = 'completed'), 0)::int as staff_value
    from app.appointments where organization_id = ${orgId} and status <> 'cancelled' and starts_at >= ${p.from} and starts_at < ${p.to}`;

  // Venda adicional: atendimento concluído com mais de um serviço; o adicional é o que veio depois do primeiro.
  const [upsell] = await tx<{ completed: number; with_extra: number; extra_value: number; prev_completed: number; prev_with_extra: number }[]>`
    with per as (
      select a.id, a.starts_at, count(x.*) as n, coalesce(sum(x.price_cents) filter (where x.position > 0), 0) as extra
      from app.appointments a join app.appointment_services x on x.appointment_id = a.id
      where a.organization_id = ${orgId} and a.status = 'completed'
        and ((a.starts_at >= ${p.from} and a.starts_at < ${p.to}) or (a.starts_at >= ${p.prevFrom} and a.starts_at < ${p.prevTo}))
      group by a.id)
    select count(*) filter (where starts_at >= ${p.from})::int as completed,
      count(*) filter (where starts_at >= ${p.from} and n > 1)::int as with_extra,
      coalesce(sum(extra) filter (where starts_at >= ${p.from}), 0)::int as extra_value,
      count(*) filter (where starts_at < ${p.from})::int as prev_completed,
      count(*) filter (where starts_at < ${p.from} and n > 1)::int as prev_with_extra
    from per`;

  // Últimos 6 meses do calendário (o atual até hoje): recebido e atendimentos concluídos.
  const todayKey = localDateKey(now, timeZone);
  const monthKeys = Array.from({ length: 7 }, (_, i) => {
    const [y, m] = todayKey.split("-").map(Number);
    return new Date(Date.UTC(y!, m! - 1 - 5 + i, 1)).toISOString().slice(0, 10);
  });
  const bounds = monthKeys.map((k) => zonedDateTime(k, "00:00", timeZone));
  const months = await Promise.all(bounds.slice(0, 6).map(async (from, i) => {
    const to = bounds[i + 1]!;
    const [r] = await tx<{ revenue: number; completed: number }[]>`
      select
        (select coalesce(sum(case when kind = 'payment' then amount_cents else -amount_cents end), 0) from app.payments
          where organization_id = ${orgId} and paid_at >= ${from} and paid_at < ${to})::int as revenue,
        (select count(*) from app.appointments where organization_id = ${orgId} and status = 'completed' and starts_at >= ${from} and starts_at < ${to})::int as completed`;
    return { key: monthKeys[i]!, current: i === 5, ...r! };
  }));

  return {
    byService, byCategory,
    origin: origin!,
    upsell: {
      completed: upsell!.completed, withExtra: upsell!.with_extra, extraValue: upsell!.extra_value,
      rate: ratio(upsell!.with_extra, upsell!.completed), prevRate: ratio(upsell!.prev_with_extra, upsell!.prev_completed),
    },
    months,
  };
}

export type InsightsData = Awaited<ReturnType<typeof loadInsights>>;

// ---------------------------------------------------------------------------
// Tendências por serviço, pontos de atenção e projeção de faturamento

const DAY = 86_400_000;

export type ServiceTrend = {
  name: string; category: string | null;
  last90: number; prev90: number; last90Count: number; prev90Count: number;
  growth: number | null; monthly: number[]; lastSeen: Date;
};
export type Alert = { kind: "queda" | "parado" | "faltas" | "categoria"; title: string; detail: string; tip: string };

/** Primeiro dia de cada um dos últimos `n` meses (o atual por último) e o do mês seguinte. */
function monthKeysBack(todayKey: string, n: number) {
  const [y, m] = todayKey.split("-").map(Number);
  return Array.from({ length: n + 1 }, (_, i) => new Date(Date.UTC(y!, m! - 1 - (n - 1) + i, 1)).toISOString().slice(0, 10));
}

/** Dias do intervalo [fromKey, toKey) em que alguma profissional ativa tem expediente. */
async function workingDays(tx: Tx, orgId: string, fromKey: string, toKey: string) {
  const rows = await tx<{ weekday: number }[]>`
    select distinct w.weekday from app.working_hours w join app.professionals p on p.id = w.professional_id
    where w.organization_id = ${orgId} and p.is_active`;
  const open = new Set(rows.map((r) => r.weekday));
  let n = 0;
  for (let d = fromKey; d < toKey; d = addDaysToKey(d, 1)) if (open.has(localWeekday(d))) n++;
  return n;
}

/**
 * Crescimento de cada serviço (últimos 90 dias fechados contra os 90 anteriores, por valor concluído),
 * a série mensal dos últimos 6 meses para o mini-gráfico, e pontos de atenção:
 * serviço em queda, serviço parado, faltas altas por serviço e categoria em queda.
 */
export async function loadTrends(tx: Tx, orgId: string, timeZone: string, now = new Date()) {
  const todayKey = localDateKey(now, timeZone);
  const end = zonedDateTime(todayKey, "00:00", timeZone);
  const mid = new Date(end.getTime() - 90 * DAY);
  const start = new Date(end.getTime() - 180 * DAY);
  const keys = monthKeysBack(todayKey, 6);
  const bounds = keys.map((k) => zonedDateTime(k, "00:00", timeZone));
  const since = new Date(Math.min(start.getTime(), bounds[0]!.getTime()));

  const rows = await tx<{ name: string; category: string | null; starts_at: Date; price: number }[]>`
    select coalesce(s.name, x.service_name) as name, c.name as category, a.starts_at, x.price_cents as price
    from app.appointment_services x
    join app.appointments a on a.id = x.appointment_id
    left join app.services s on s.id = x.service_id
    left join app.service_categories c on c.id = s.category_id
    where x.organization_id = ${orgId} and a.status = 'completed' and a.starts_at >= ${since} and a.starts_at < ${bounds[6]!}`;

  const map = new Map<string, ServiceTrend>();
  for (const r of rows) {
    const k = `${r.category ?? ""}|${r.name}`;
    const t = map.get(k) ?? { name: r.name, category: r.category, last90: 0, prev90: 0, last90Count: 0, prev90Count: 0, growth: null, monthly: [0, 0, 0, 0, 0, 0], lastSeen: r.starts_at };
    const ts = r.starts_at.getTime();
    if (ts >= mid.getTime() && ts < end.getTime()) { t.last90 += r.price; t.last90Count++; }
    else if (ts >= start.getTime() && ts < mid.getTime()) { t.prev90 += r.price; t.prev90Count++; }
    const mi = bounds.findIndex((b, i) => i < 6 && ts >= b.getTime() && ts < bounds[i + 1]!.getTime());
    if (mi >= 0) t.monthly[mi]! += r.price;
    if (r.starts_at > t.lastSeen) t.lastSeen = r.starts_at;
    map.set(k, t);
  }
  const trends = [...map.values()].map((t) => ({ ...t, growth: percentChange(t.last90, t.prev90) }))
    .sort((a, b) => b.last90 - a.last90);

  // Faltas por serviço nos últimos 90 dias (concluídos + faltas).
  const noShow = await tx<{ name: string; done: number; missed: number }[]>`
    select coalesce(s.name, x.service_name) as name,
      count(*) filter (where a.status = 'completed')::int as done, count(*) filter (where a.status = 'no_show')::int as missed
    from app.appointment_services x join app.appointments a on a.id = x.appointment_id
    left join app.services s on s.id = x.service_id
    where x.organization_id = ${orgId} and a.status in ('completed', 'no_show') and a.starts_at >= ${mid} and a.starts_at < ${end}
    group by 1`;
  const [overall] = await tx<{ done: number; missed: number }[]>`
    select count(*) filter (where status = 'completed')::int as done, count(*) filter (where status = 'no_show')::int as missed
    from app.appointments where organization_id = ${orgId} and status in ('completed', 'no_show') and starts_at >= ${mid} and starts_at < ${end}`;

  const alerts: Alert[] = [];
  const pctTxt = (v: number) => `${Math.abs(Math.round(v))}%`;
  // Serviço em queda: perdeu 15% ou mais e tinha volume para a comparação valer.
  for (const t of trends.filter((t) => t.growth !== null && t.growth <= -15 && t.prev90Count >= 6).sort((a, b) => (a.growth ?? 0) - (b.growth ?? 0)).slice(0, 3))
    alerts.push({
      kind: "queda", title: `${t.name} caiu ${pctTxt(t.growth!)}`,
      detail: `${t.last90Count} atendimento(s) nos últimos 90 dias, contra ${t.prev90Count} nos 90 dias antes.`,
      tip: "Que tal oferecer como um mimo extra no agendamento ou fazer um preço especial nos horários livres?",
    });
  // Serviço parado: tinha procura e não aparece há 45 dias ou mais.
  for (const t of trends.filter((t) => now.getTime() - t.lastSeen.getTime() > 45 * DAY && t.prev90Count + t.last90Count >= 3).slice(0, 2))
    alerts.push({
      kind: "parado", title: `${t.name} sem atendimentos há ${Math.floor((now.getTime() - t.lastSeen.getTime()) / DAY)} dias`,
      detail: "Ele tinha procura e sumiu da agenda.",
      tip: "Veja se ele aparece no seu link de agendamento e chame as clientes que costumavam fazer.",
    });
  // Faltas acima da média do salão.
  const avgMiss = overall && overall.done + overall.missed > 0 ? overall.missed / (overall.done + overall.missed) : 0;
  for (const n of noShow.filter((n) => n.done + n.missed >= 10 && n.missed / (n.done + n.missed) >= Math.max(0.12, avgMiss * 2)).slice(0, 2))
    alerts.push({
      kind: "faltas", title: `Faltas altas em ${n.name}`,
      detail: `${Math.round((n.missed / (n.done + n.missed)) * 100)}% das clientes faltaram nos últimos 90 dias (a média do salão é ${Math.round(avgMiss * 100)}%).`,
      tip: "Peça um sinal para esse serviço e mande a confirmação na véspera.",
    });
  // Categoria em queda.
  const cats = new Map<string, { last: number; prev: number; prevCount: number }>();
  for (const t of trends) {
    const c = cats.get(t.category ?? "Sem categoria") ?? { last: 0, prev: 0, prevCount: 0 };
    c.last += t.last90; c.prev += t.prev90; c.prevCount += t.prev90Count;
    cats.set(t.category ?? "Sem categoria", c);
  }
  for (const [name, c] of cats) {
    const g = percentChange(c.last, c.prev);
    if (g !== null && g <= -10 && c.prevCount >= 10)
      alerts.push({ kind: "categoria", title: `${name} caiu ${pctTxt(g)}`, detail: "Essa área faturou menos nos últimos 90 dias.", tip: "Vale dar uma olhada no preço, na divulgação e nos horários dela." });
  }

  return { trends, alerts: alerts.slice(0, 4), monthKeys: keys.slice(0, 6) };
}

export type TrendsData = Awaited<ReturnType<typeof loadTrends>>;

/**
 * Projeção de faturamento (recebido): o mês atual fecha no ritmo dos dias já fechados
 * (recebido ÷ dias de atendimento que já passaram × dias de atendimento do mês); os próximos 3 meses
 * seguem a tendência média mês a mês dos últimos 3 meses completos (limitada a ±10% ao mês),
 * proporcional aos dias de atendimento de cada mês. É uma estimativa, não uma garantia.
 */
export async function loadForecast(tx: Tx, orgId: string, timeZone: string, now = new Date()) {
  const todayKey = localDateKey(now, timeZone);
  const keys = monthKeysBack(todayKey, 5); // 4 meses completos + o atual, e o início do próximo
  const bounds = keys.map((k) => zonedDateTime(k, "00:00", timeZone));
  const today = zonedDateTime(todayKey, "00:00", timeZone);
  const revenue = async (from: Date, to: Date) => (await tx<{ v: number }[]>`
    select coalesce(sum(case when kind = 'payment' then amount_cents else -amount_cents end), 0)::int as v
    from app.payments where organization_id = ${orgId} and paid_at >= ${from} and paid_at < ${to}`)[0]!.v;

  const full = await Promise.all([0, 1, 2, 3].map(async (i) => ({
    key: keys[i]!, value: await revenue(bounds[i]!, bounds[i + 1]!), days: await workingDays(tx, orgId, keys[i]!, keys[i + 1]!),
  })));
  const curKey = keys[4]!, nextKey = keys[5]!;
  const soFar = await revenue(bounds[4]!, today);
  const elapsedDays = await workingDays(tx, orgId, curKey, todayKey);
  const monthDays = await workingDays(tx, orgId, curKey, nextKey);
  const [ag] = await tx<{ v: number }[]>`
    select coalesce(sum(price_cents - discount_cents), 0)::int as v from app.appointments
    where organization_id = ${orgId} and status in ('pending', 'confirmed') and starts_at >= ${today} and starts_at < ${bounds[5]!}`;

  if (elapsedDays < 3 || monthDays === 0) return { ready: false as const, soFar, scheduledRest: ag!.v };
  const dailyRate = soFar / elapsedDays;
  const thisMonth = Math.round(dailyRate * monthDays);

  // Tendência: média das variações do ritmo diário entre os meses completos com dados.
  const rates = full.filter((m) => m.days > 0 && m.value > 0).map((m) => m.value / m.days);
  const steps: number[] = [];
  for (let i = 1; i < rates.length; i++) steps.push(rates[i]! / rates[i - 1]! - 1);
  const recent = steps.slice(-3);
  const growth = recent.length ? Math.max(-0.1, Math.min(0.1, recent.reduce((a, b) => a + b, 0) / recent.length)) : 0;

  const next = [];
  let rate = dailyRate;
  for (let k = 1; k <= 3; k++) {
    const [y, m] = curKey.split("-").map(Number);
    const from = new Date(Date.UTC(y!, m! - 1 + k, 1)).toISOString().slice(0, 10);
    const to = new Date(Date.UTC(y!, m! + k, 1)).toISOString().slice(0, 10);
    rate *= 1 + growth;
    const days = await workingDays(tx, orgId, from, to);
    next.push({ key: from, days, value: Math.round(rate * days) });
  }
  const lastFull = full.at(-1)!;
  return {
    ready: true as const, soFar, scheduledRest: ag!.v, elapsedDays, monthDays, thisMonth,
    vsLastMonth: percentChange(thisMonth, lastFull.value), lastMonth: lastFull, growth, next,
  };
}

export type ForecastData = Awaited<ReturnType<typeof loadForecast>>;
