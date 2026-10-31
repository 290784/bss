import type { Tx } from "@/server/db";
import { addDaysToKey, localDateKey, localWeekday, zonedDateTime } from "@/lib/time";
import { localTime } from "@/lib/time";
import { servicesText } from "@/lib/messages";
import { freeGapsToday } from "@/server/modules/dashboard";

/**
 * Dicas da Gê: sugestões práticas tiradas dos dados do próprio negócio, em quatro grupos.
 * - faturamento: quem já passou do tempo de voltar, dias fracos da semana que vem, combos, reajuste;
 * - estoque: o que conferir de material pelo que está marcado nos próximos 7 dias;
 * - mimos: aniversárias, marcos de fidelidade, clientes novas e as que mais gastam;
 * - avisos: confirmações de amanhã, valores a receber, configurações que deixam a Gê trabalhar melhor.
 * Cada dica tem um id estável (para "já fiz") e, quando faz sentido, ações e uma lista de clientes
 * com mensagem pronta para o WhatsApp.
 */

export type DicaKind = "faturamento" | "estoque" | "mimos" | "avisos";
export type DicaCliente = { name: string; phone: string | null; note: string; message: string };
export type Dica = {
  id: string;
  kind: DicaKind;
  title: string;
  detail: string;
  /** Valor ligado à dica (ex.: "R$ 1.200 esperando voltar"), só para quem vê o financeiro. */
  value?: { cents: number; label: string };
  action?: { label: string; href: string };
  /** Texto pronto para copiar (status do WhatsApp, Instagram…). */
  copy?: { label: string; text: string };
  clients?: DicaCliente[];
  /** Quantas clientes ficaram fora da lista mostrada. */
  moreClients?: number;
  checklist?: string[];
  /** Importância (0–100): as dicas vêm ordenadas por ela; 85+ aparece como "Urgente". */
  priority: number;
  urgent: boolean;
};

const DAY = 86_400_000;
const first = (name: string) => name.split(" ")[0]!;
const WEEKDAY = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const brDate = (key: string) => `${key.slice(8)}/${key.slice(5, 7)}`;

/** Material típico por tipo de serviço (por palavras no nome do serviço ou da categoria). */
const MATERIAL: { match: RegExp; label: string; items: string[] }[] = [
  { match: /alongamento|gel|fibra|acr[ií]l|postiça|tips/i, label: "unhas em gel", items: ["gel e primer", "tips ou formas", "lixas e buffers", "álcool e cleanser"] },
  { match: /manicure|pedicure|unha|esmalt|spa dos p[ée]s|nail/i, label: "manicure e pedicure", items: ["esmaltes (os tons da estação!)", "lixas e palitos", "algodão e acetona", "removedor de cutícula", "kits descartáveis"] },
  { match: /colora|tintura|mecha|luzes|reflexo|balayage|tonaliz|descolor/i, label: "coloração", items: ["tintas nos tons mais pedidos", "oxidante", "pó descolorante", "papel alumínio e luvas", "matizador"] },
  { match: /progressiva|alisa|botox capilar|selagem|escova definitiva/i, label: "alisamentos", items: ["produto de progressiva", "shampoo antirresíduo", "máscara pós-química"] },
  { match: /hidrata|nutri|reconstru|cronograma|tratamento capilar/i, label: "tratamentos", items: ["máscaras de hidratação", "ampolas", "touca térmica limpa"] },
  { match: /corte|escova|penteado|cabelo/i, label: "cabelo", items: ["shampoo e condicionador", "finalizador e protetor térmico", "toalhas limpas", "capas"] },
  { match: /sobrancelha|henna|design|brow/i, label: "sobrancelhas", items: ["henna e fixador", "linha e pinça", "lápis e régua descartável"] },
  { match: /c[ií]lios|lash|fio a fio|volume russo|extens[ãa]o/i, label: "cílios", items: ["fios nas curvaturas mais usadas", "cola (confere a validade!)", "removedor", "microbrush e patches"] },
  { match: /depila|cera|laser/i, label: "depilação", items: ["cera", "espátulas", "lenços e óleo pós-depilação"] },
  { match: /limpeza de pele|peeling|facial|est[ée]tica|drenagem|massagem/i, label: "estética", items: ["algodão e gaze", "ácidos e máscaras", "óleo de massagem", "lençol descartável"] },
  { match: /maquia|make/i, label: "maquiagem", items: ["base nos tons mais usados", "demaquilante", "esponjas e pincéis higienizados"] },
];

export async function loadDicas(tx: Tx, orgId: string, timeZone: string, opts: { finance: boolean; bookingUrl: string }, now = new Date()) {
  const todayKey = localDateKey(now, timeZone);
  const today = zonedDateTime(todayKey, "00:00", timeZone);
  const in7 = zonedDateTime(addDaysToKey(todayKey, 7), "00:00", timeZone);
  const tomorrowKey = addDaysToKey(todayKey, 1);
  const dicas: Omit<Dica, "priority" | "urgent">[] = [];

  const [org] = await tx<{ name: string; online_booking_enabled: boolean }[]>`
    select name, online_booking_enabled from app.organizations where id = ${orgId}`;
  if (!org) return [];

  // ───────── Faturamento ─────────

  // 1) Quem já passou do tempo de voltar (retorno sugerido do serviço) e não tem nada marcado.
  const overdue = await tx<{ name: string; phone: string | null; service: string; price: number; last: Date; interval: number }[]>`
    with ultimo as (
      select distinct on (a.client_id, x.service_id) a.client_id, x.service_id, a.starts_at
      from app.appointments a join app.appointment_services x on x.appointment_id = a.id
      where a.organization_id = ${orgId} and a.status = 'completed'
      order by a.client_id, x.service_id, a.starts_at desc
    ), vencidos as (
      select distinct on (u.client_id) u.client_id, s.name as service, s.price_cents as price, u.starts_at as last, s.return_interval_days as interval
      from ultimo u join app.services s on s.id = u.service_id
      where s.return_interval_days is not null and s.is_active
        and u.starts_at + make_interval(days => s.return_interval_days) < ${today}
        and u.starts_at + make_interval(days => s.return_interval_days) > ${today}::timestamptz - interval '45 days'
      order by u.client_id, u.starts_at + make_interval(days => s.return_interval_days)
    )
    select c.full_name as name, c.phone_normalized as phone, v.service, v.price, v.last, v.interval
    from vencidos v join app.clients c on c.id = v.client_id
    where c.archived_at is null and c.contact_preference <> 'none'
      and not exists (select 1 from app.appointments f where f.client_id = v.client_id and f.status in ('pending', 'confirmed') and f.starts_at >= ${today})
    order by v.price desc, v.last`;
  if (overdue.length > 0) {
    const total = overdue.reduce((t, o) => t + o.price, 0);
    dicas.push({
      id: `retorno-${todayKey.slice(0, 7)}-${overdue.length}`,
      kind: "faturamento",
      title: overdue.length === 1 ? `${first(overdue[0]!.name)} já passou do tempo de voltar` : `${overdue.length} clientes já passaram do tempo de voltar`,
      detail: "Nos últimos 45 dias venceu o retorno sugerido delas e ninguém marcou de novo. Uma mensagem carinhosa agora, enquanto a vontade ainda está fresquinha, traz muitas de volta.",
      moreClients: Math.max(0, overdue.length - 6),
      value: opts.finance ? { cents: total, label: "esperando voltar" } : undefined,
      clients: overdue.slice(0, 6).map((o) => {
        const semanas = Math.max(1, Math.round((now.getTime() - o.last.getTime()) / DAY / 7));
        return {
          name: o.name, phone: o.phone,
          note: `${o.service} há ${semanas} semana${semanas === 1 ? "" : "s"}`,
          message: `Oi, ${first(o.name)}! Tudo bem? 💜 Já faz ${semanas} semana${semanas === 1 ? "" : "s"} do seu ${servicesText([o.service])}, tá na hora de caprichar de novo! Quer que eu separe um horário pra você essa semana? Se preferir, escolhe direto aqui: ${opts.bookingUrl}`,
        };
      }),
    });
  }

  // 2) Dia fraco na próxima semana: compara o que já está marcado com a média do mesmo dia da semana
  //    nas últimas 8 semanas.
  const [hist, ahead, openDays] = await Promise.all([
    tx<{ dow: number; n: number }[]>`
      select extract(dow from a.starts_at at time zone ${timeZone})::int as dow, count(*)::int as n
      from app.appointments a where a.organization_id = ${orgId} and a.status in ('completed', 'no_show', 'confirmed')
        and a.starts_at >= ${new Date(today.getTime() - 56 * DAY)} and a.starts_at < ${today}
      group by 1`,
    tx<{ day: string; n: number }[]>`
      select to_char(a.starts_at at time zone ${timeZone}, 'YYYY-MM-DD') as day, count(*)::int as n
      from app.appointments a where a.organization_id = ${orgId} and a.status in ('pending', 'confirmed')
        and a.starts_at >= ${zonedDateTime(tomorrowKey, "00:00", timeZone)} and a.starts_at < ${in7}
      group by 1`,
    tx<{ weekday: number }[]>`
      select distinct w.weekday from app.working_hours w join app.professionals p on p.id = w.professional_id
      where w.organization_id = ${orgId} and p.is_active`,
  ]);
  const open = new Set(openDays.map((r) => r.weekday));
  const avgByDow = new Map(hist.map((h) => [h.dow, h.n / 8]));
  const aheadMap = new Map(ahead.map((a) => [a.day, a.n]));
  let weakest: { day: string; n: number; avg: number } | null = null;
  for (let i = 1; i <= 6; i++) {
    const day = addDaysToKey(todayKey, i);
    const dow = localWeekday(day);
    const avg = avgByDow.get(dow) ?? 0;
    if (!open.has(dow) || avg < 3) continue;
    const n = aheadMap.get(day) ?? 0;
    // Dias mais distantes ainda vão encher: só conta como fraco o que está bem abaixo do normal.
    const fill = n / avg;
    const limit = i <= 2 ? 0.55 : 0.35;
    if (fill < limit && (!weakest || fill < weakest.n / weakest.avg)) weakest = { day, n, avg };
  }
  if (weakest) {
    const dia = `${WEEKDAY[localWeekday(weakest.day)]} (${brDate(weakest.day)})`;
    dicas.push({
      id: `dia-fraco-${weakest.day}`,
      kind: "faturamento",
      title: `${dia[0]!.toUpperCase()}${dia.slice(1)} está bem vazia`,
      detail: `Tem ${weakest.n} horário${weakest.n === 1 ? "" : "s"} marcado${weakest.n === 1 ? "" : "s"}, e normalmente esse dia tem uns ${Math.round(weakest.avg)}. Que tal uma promo relâmpago só para esse dia? Posta no status e manda para as clientes que gostam de última hora.`,
      copy: {
        label: "Copiar texto da promo",
        text: `✨ Promo relâmpago de ${dia}! ✨\nAbri uns horários especiais e quem marcar para esse dia ganha um mimo surpresa 💜\nCorre que são poucos: ${opts.bookingUrl}`,
      },
      action: { label: "Ver a agenda desse dia", href: `/app/agenda?data=${weakest.day}` },
    });
  }

  // 3) Combo que mais sai junto (para oferecer como pacote), se as vendas extras estão baixas.
  const [combo] = await tx<{ a: string; b: string; n: number }[]>`
    select least(x1.service_name, x2.service_name) as a, greatest(x1.service_name, x2.service_name) as b,
           count(*)::int as n
    from app.appointments ap
    join app.appointment_services x1 on x1.appointment_id = ap.id
    join app.appointment_services x2 on x2.appointment_id = ap.id and x2.service_name > x1.service_name
    where ap.organization_id = ${orgId} and ap.status = 'completed' and ap.starts_at >= ${new Date(today.getTime() - 90 * DAY)}
    group by 1, 2 order by n desc limit 1`;
  const [up] = await tx<{ done: number; multi: number }[]>`
    select count(*)::int as done, count(*) filter (where (select count(*) from app.appointment_services x where x.appointment_id = a.id) > 1)::int as multi
    from app.appointments a where a.organization_id = ${orgId} and a.status = 'completed' and a.starts_at >= ${new Date(today.getTime() - 30 * DAY)}`;
  const upRate = up && up.done >= 10 ? up.multi / up.done : null;
  if (combo && combo.n >= 3 && upRate !== null && upRate < 0.3) {
    dicas.push({
      id: `combo-${combo.a}-${combo.b}`,
      kind: "faturamento",
      title: `Crie o combo ${combo.a} + ${combo.b}`,
      detail: `${combo.n} clientes já fizeram os dois juntos nos últimos 90 dias, mas só ${Math.round(upRate * 100)}% dos atendimentos do último mês tiveram mais de um serviço. Um combo com um descontinho (5 a 10%) faz mais gente levar os dois.`,
      action: { label: "Ir para serviços", href: "/app/servicos" },
    });
  } else if (upRate !== null && upRate < 0.15) {
    dicas.push({
      id: `upsell-${todayKey.slice(0, 7)}`,
      kind: "faturamento",
      title: "Ofereça um extra em cada atendimento",
      detail: `Só ${Math.round(upRate * 100)}% das clientes saíram com mais de um serviço no último mês. Uma pergunta simples (“quer aproveitar e hidratar hoje?”) já aumenta o ticket. No agendamento eu sugiro o extra certo para cada cliente.`,
    });
  }

  // 4) Serviço com procura em alta: dá para reajustar o preço.
  const [hot] = await tx<{ name: string; last: number; prev: number; price: number }[]>`
    select s.name, count(*) filter (where a.starts_at >= ${new Date(today.getTime() - 60 * DAY)})::int as last,
           count(*) filter (where a.starts_at < ${new Date(today.getTime() - 60 * DAY)})::int as prev, s.price_cents as price
    from app.appointment_services x join app.appointments a on a.id = x.appointment_id join app.services s on s.id = x.service_id
    where a.organization_id = ${orgId} and a.status = 'completed' and s.is_active
      and a.starts_at >= ${new Date(today.getTime() - 120 * DAY)} and a.starts_at < ${today}
    group by s.id, s.name, s.price_cents
    having count(*) filter (where a.starts_at < ${new Date(today.getTime() - 60 * DAY)}) >= 8
    order by (count(*) filter (where a.starts_at >= ${new Date(today.getTime() - 60 * DAY)}))::float
           / nullif(count(*) filter (where a.starts_at < ${new Date(today.getTime() - 60 * DAY)}), 0) desc
    limit 1`;
  if (hot && hot.last >= hot.prev * 1.25) {
    const growth = Math.round((hot.last / hot.prev - 1) * 100);
    const plus = Math.round((hot.price * 0.07) / 500) * 500;
    dicas.push({
      id: `reajuste-${hot.name}-${todayKey.slice(0, 7)}`,
      kind: "faturamento",
      title: `${hot.name} está em alta: hora de reajustar?`,
      detail: `A procura subiu ${growth}% nos últimos 60 dias. Quando a agenda de um serviço enche, um reajuste de 5 a 10% quase não afasta ninguém${opts.finance && plus > 0 ? ` (uns R$ ${(plus / 100).toFixed(0)} a mais por atendimento)` : ""}. Avise as clientes fiéis com antecedência, elas adoram esse cuidado.`,
      value: opts.finance && plus > 0 ? { cents: Math.round((plus * hot.last) / 2), label: "a mais por mês" } : undefined,
      action: { label: "Ajustar preço", href: "/app/servicos" },
    });
  }

  // ───────── Estoque ─────────
  const [nextWeek, lastWeek] = await Promise.all([
    tx<{ name: string; category: string | null; n: number }[]>`
      select x.service_name as name, c.name as category, count(*)::int as n
      from app.appointment_services x join app.appointments a on a.id = x.appointment_id
      left join app.services s on s.id = x.service_id left join app.service_categories c on c.id = s.category_id
      where a.organization_id = ${orgId} and a.status in ('pending', 'confirmed') and a.starts_at >= ${now} and a.starts_at < ${in7}
      group by 1, 2`,
    tx<{ name: string; category: string | null; n: number }[]>`
      select x.service_name as name, c.name as category, count(*)::int as n
      from app.appointment_services x join app.appointments a on a.id = x.appointment_id
      left join app.services s on s.id = x.service_id left join app.service_categories c on c.id = s.category_id
      where a.organization_id = ${orgId} and a.status in ('completed', 'confirmed', 'pending') and a.starts_at >= ${new Date(today.getTime() - 7 * DAY)} and a.starts_at < ${today}
      group by 1, 2`,
  ]);
  const group = (rows: { name: string; category: string | null; n: number }[]) => {
    const m = new Map<string, { n: number; items: string[] }>();
    for (const r of rows) {
      const g = MATERIAL.find((x) => x.match.test(r.name)) ?? MATERIAL.find((x) => r.category && x.match.test(r.category));
      if (!g) continue;
      const cur = m.get(g.label) ?? { n: 0, items: g.items };
      cur.n += r.n; m.set(g.label, cur);
    }
    return m;
  };
  const gNext = group(nextWeek), gLast = group(lastWeek);
  const ordered = [...gNext.entries()].sort((a, b) => b[1].n - a[1].n);
  if (ordered.length > 0) {
    const busier = ordered.find(([l, v]) => v.n >= 5 && v.n >= (gLast.get(l)?.n ?? 0) * 1.3 && (gLast.get(l)?.n ?? 0) > 0);
    const resumo = ordered.slice(0, 3).map(([l, v]) => `${v.n} de ${l}`).join(", ");
    dicas.push({
      id: `estoque-${todayKey}`,
      kind: "estoque",
      title: busier ? `Semana que vem tem mais ${busier[0]} que o normal` : "Confere o material da semana",
      detail: busier
        ? `São ${busier[1].n} atendimentos de ${busier[0]} marcados para os próximos 7 dias (na semana passada foram ${gLast.get(busier[0])?.n ?? 0}). Vale conferir se o material dá conta antes de faltar no meio do atendimento.`
        : `Nos próximos 7 dias você tem ${resumo}. Uma conferida rápida agora evita correria depois.`,
      checklist: [...new Set([...(busier ?? ordered[0]!)[1].items, ...ordered.slice(0, 3).flatMap(([, v]) => v.items.slice(0, 2))])].slice(0, 7),
    });
  }
  // Lembrete fixo de inventário (uma vez por semana, na segunda ou no primeiro dia aberto).
  dicas.push({
    id: `inventario-${addDaysToKey(todayKey, -((localWeekday(todayKey) + 6) % 7))}`,
    kind: "estoque",
    title: "Inventário rapidinho da semana",
    detail: "Separe 10 minutos para olhar o que está acabando e o que está perto da validade. Produto vencido é dinheiro jogado fora, e o que está quase vencendo pode virar brinde!",
    checklist: ["O que acabou ou está no fim", "Produtos perto da validade (viram mimo!)", "Descartáveis: luvas, lençol, toalhinhas", "Itens de revenda na vitrine"],
  });

  // ───────── Mimos ─────────

  // 1) Aniversárias dos próximos 14 dias.
  const bdays = await tx<{ name: string; phone: string | null; md: string; visits: number }[]>`
    select c.full_name as name, c.phone_normalized as phone, to_char(c.birth_date, 'MM-DD') as md,
           (select count(*) from app.appointments a where a.client_id = c.id and a.status = 'completed')::int as visits
    from app.clients c
    where c.organization_id = ${orgId} and c.archived_at is null and c.birth_date is not null
      and exists (select 1 from app.appointments a where a.client_id = c.id and a.status = 'completed' and a.starts_at >= ${new Date(today.getTime() - 365 * DAY)})`;
  const upcomingBdays = bdays.map((b) => {
    let key = `${todayKey.slice(0, 4)}-${b.md}`;
    if (key < todayKey) key = `${Number(todayKey.slice(0, 4)) + 1}-${b.md}`;
    return { ...b, key };
  }).filter((b) => b.key <= addDaysToKey(todayKey, 14)).sort((a, b) => a.key.localeCompare(b.key) || b.visits - a.visits);
  if (upcomingBdays.length > 0) {
    dicas.push({
      id: `aniversario-${todayKey}-${upcomingBdays.length}`,
      kind: "mimos",
      title: upcomingBdays.length === 1 ? `${first(upcomingBdays[0]!.name)} faz aniversário ${upcomingBdays[0]!.key === todayKey ? "hoje! 🎂" : "logo, logo 🎂"}` : `${upcomingBdays.length} aniversárias nas próximas 2 semanas 🎂`,
      detail: "Um parabéns com um presentinho (um mimo no próximo horário ou 10% no mês do aniversário) faz a cliente se sentir especial e volta como agendamento.",
      moreClients: Math.max(0, upcomingBdays.length - 6),
      clients: upcomingBdays.slice(0, 6).map((b) => ({
        name: b.name, phone: b.phone,
        note: b.key === todayKey ? "hoje" : brDate(b.key),
        message: `Oi, ${first(b.name)}! ${b.key === todayKey ? "Feliz aniversário" : "Seu aniversário tá chegando"}! 🎂💜 Pra comemorar, separei um presentinho pra você: no seu próximo horário aqui ${b.key === todayKey ? "neste mês" : "no mês do seu aniversário"} tem um mimo especial te esperando. Bora marcar? ${opts.bookingUrl}`,
      })),
    });
  }

  // 2) Marcos de fidelidade: quem vem nos próximos 7 dias e completa 5ª, 10ª, 20ª… visita.
  const milestones = await tx<{ name: string; phone: string | null; starts_at: Date; visits: number; is_new: boolean }[]>`
    select distinct on (c.id) c.full_name as name, c.phone_normalized as phone, a.starts_at,
      (select count(*) from app.appointments p where p.client_id = c.id and p.status = 'completed')::int as visits,
      false as is_new
    from app.appointments a join app.clients c on c.id = a.client_id
    where a.organization_id = ${orgId} and a.status in ('pending', 'confirmed') and a.starts_at >= ${now} and a.starts_at < ${in7}
    order by c.id, a.starts_at`;
  const fmtDay = (d: Date) => { const k = localDateKey(d, timeZone); return k === todayKey ? "hoje" : k === tomorrowKey ? "amanhã" : `${WEEKDAY[localWeekday(k)]} (${brDate(k)})`; };
  const marcos = milestones.filter((m) => [4, 9, 19, 29, 49, 99].includes(m.visits)).sort((a, b) => a.starts_at.getTime() - b.starts_at.getTime());
  if (marcos.length > 0) {
    dicas.push({
      id: `fidelidade-${todayKey}-${marcos.length}`,
      kind: "mimos",
      title: marcos.length === 1 ? `${first(marcos[0]!.name)} vem pela ${marcos[0]!.visits + 1}ª vez ${fmtDay(marcos[0]!.starts_at)}` : `${marcos.length} clientes completam uma visita especial esta semana`,
      detail: "Marcos assim merecem comemoração: um esmalte, uma amostra, um cartãozinho escrito à mão. Custa pouco e vira post no Instagram delas. 📸",
      moreClients: Math.max(0, marcos.length - 6),
      clients: marcos.slice(0, 6).map((m) => ({ name: m.name, phone: null, note: `${m.visits + 1}ª visita · ${fmtDay(m.starts_at)}`, message: "" })),
    });
  }
  const novas = milestones.filter((m) => m.visits === 0).sort((a, b) => a.starts_at.getTime() - b.starts_at.getTime());
  if (novas.length > 0) {
    dicas.push({
      id: `boas-vindas-${todayKey}-${novas.length}`,
      kind: "mimos",
      title: novas.length === 1 ? `${first(novas[0]!.name)} vem pela primeira vez ${fmtDay(novas[0]!.starts_at)} ✨` : `${novas.length} clientes novas vêm esta semana ✨`,
      detail: "A primeira visita decide se ela volta. Um brinde de boas-vindas (amostra, cartão de fidelidade ou 10% no retorno) e uma mensagem no dia seguinte fazem toda a diferença.",
      moreClients: Math.max(0, novas.length - 6),
      clients: novas.slice(0, 6).map((m) => ({ name: m.name, phone: null, note: fmtDay(m.starts_at), message: "" })),
    });
  }

  // 3) As que mais gastaram nos últimos 90 dias: mimo surpresa.
  if (opts.finance) {
    const tops = await tx<{ name: string; phone: string | null; spent: number; visits: number }[]>`
      select c.full_name as name, c.phone_normalized as phone, sum(a.price_cents - a.discount_cents)::int as spent, count(*)::int as visits
      from app.appointments a join app.clients c on c.id = a.client_id
      where a.organization_id = ${orgId} and a.status = 'completed' and a.starts_at >= ${new Date(today.getTime() - 90 * DAY)}
      group by c.id, c.full_name, c.phone_normalized having count(*) >= 3
      order by spent desc limit 5`;
    if (tops.length >= 3) {
      dicas.push({
        id: `vips-${todayKey.slice(0, 7)}`,
        kind: "mimos",
        title: `Suas ${tops.length} clientes VIP merecem um carinho 💜`,
        detail: "São as que mais investiram com você nos últimos 3 meses. Um mimo surpresa (sem ser aniversário!) mostra que você repara nelas e faz elas indicarem você para as amigas.",
        value: { cents: tops.reduce((t, c) => t + c.spent, 0), label: "em 3 meses" },
        clients: tops.map((c) => ({
          name: c.name, phone: c.phone, note: `${c.visits} visitas · R$ ${Math.round(c.spent / 100).toLocaleString("pt-BR")}`,
          message: `Oi, ${first(c.name)}! 💜 Passando só pra agradecer pelo carinho de sempre. Você é uma cliente muito especial e no seu próximo horário tem um mimo surpresa te esperando aqui! 🎁`,
        })),
      });
    }
  }

  // ───────── Avisos ─────────
  const [tom] = await tx<{ n: number; total: number }[]>`
    select count(*) filter (where client_confirmed_at is null)::int as n, count(*)::int as total
    from app.appointments where organization_id = ${orgId} and status in ('pending', 'confirmed')
      and starts_at >= ${zonedDateTime(tomorrowKey, "00:00", timeZone)} and starts_at < ${zonedDateTime(addDaysToKey(tomorrowKey, 1), "00:00", timeZone)}`;
  if (tom && tom.n > 0) {
    dicas.push({
      id: `confirmar-${tomorrowKey}-${tom.n}`,
      kind: "avisos",
      title: tom.n === 1 ? "1 cliente de amanhã ainda não confirmou" : `${tom.n} de ${tom.total} clientes de amanhã ainda não confirmaram`,
      detail: "Mandar a confirmação hoje diminui muito as faltas e, se alguém desmarcar, ainda dá tempo de encaixar outra cliente.",
      action: { label: "Mandar confirmações", href: `/app/agenda?data=${tomorrowKey}&confirmacoes=1` },
    });
  }
  if (opts.finance) {
    const [rec] = await tx<{ n: number; v: number }[]>`
      select count(*)::int as n, coalesce(sum(a.price_cents - a.discount_cents - coalesce(p.paid, 0)), 0)::int as v
      from app.appointments a
      left join (select appointment_id, sum(case when kind = 'payment' then amount_cents else -amount_cents end) as paid
                 from app.payments where organization_id = ${orgId} group by 1) p on p.appointment_id = a.id
      where a.organization_id = ${orgId} and a.status = 'completed' and a.starts_at >= ${new Date(today.getTime() - 60 * DAY)}
        and a.price_cents - a.discount_cents > coalesce(p.paid, 0)`;
    if (rec && rec.n > 0) {
      dicas.push({
        id: `receber-${todayKey}-${rec.n}`,
        kind: "avisos",
        title: rec.n === 1 ? "Tem 1 atendimento feito sem pagamento anotado" : `Tem ${rec.n} atendimentos feitos sem pagamento anotado`,
        detail: "Pode ser só esquecimento de anotar, ou uma cliente que ficou de pagar depois. Vale dar uma olhada para o seu caixa bater certinho.",
        value: { cents: rec.v, label: "a receber" },
        action: { label: "Ver na agenda", href: "/app/agenda?visao=lista" },
      });
    }
  }
  const [cfg] = await tx<{ semRetorno: number; semAniversario: number; clientes: number }[]>`
    select (select count(*) from app.services where organization_id = ${orgId} and is_active and return_interval_days is null)::int as "semRetorno",
           (select count(*) from app.clients where organization_id = ${orgId} and archived_at is null and birth_date is null)::int as "semAniversario",
           (select count(*) from app.clients where organization_id = ${orgId} and archived_at is null)::int as clientes`;
  if (cfg && cfg.semRetorno > 0) {
    dicas.push({
      id: `cfg-retorno-${cfg.semRetorno}`,
      kind: "avisos",
      title: cfg.semRetorno === 1 ? "1 serviço está sem tempo de retorno" : `${cfg.semRetorno} serviços estão sem tempo de retorno`,
      detail: "Coloca de quanto em quanto tempo a cliente costuma voltar (ex.: manicure a cada 15 dias). Assim eu te aviso quem está atrasada para voltar.",
      action: { label: "Completar serviços", href: "/app/servicos" },
    });
  }
  if (cfg && cfg.clientes >= 10 && cfg.semAniversario / cfg.clientes > 0.5) {
    dicas.push({
      id: `cfg-aniversario-${Math.round(cfg.semAniversario / 10)}`,
      kind: "avisos",
      title: "Anote o aniversário das clientes",
      detail: `${cfg.semAniversario} de ${cfg.clientes} clientes estão sem data de aniversário. Pergunta no próximo atendimento: com a data anotada, eu te lembro de mandar um mimo na hora certa. 🎂`,
      action: { label: "Ver clientes", href: "/app/clientes" },
    });
  }
  if (!org.online_booking_enabled) {
    dicas.push({
      id: "cfg-link-desligado",
      kind: "avisos",
      title: "Seu link de agendamento está pausado",
      detail: "Com ele ligado, as clientes marcam sozinhas a qualquer hora, até de madrugada. É horário entrando enquanto você descansa!",
      action: { label: "Ligar o link", href: "/app/configuracoes" },
    });
  }

  // ───────── Novas dicas ─────────

  // Horários livres ainda hoje: dá tempo de encaixar alguém (status do WhatsApp, lista de espera).
  const gaps = await freeGapsToday(tx, orgId, timeZone, now);
  const freeMin = gaps.reduce((t, g) => t + (g.end.getTime() - g.start.getTime()) / 60_000, 0);
  if (gaps.length > 0 && freeMin >= 60) {
    const lista = gaps.slice(0, 4).map((g) => `${localTime(g.start, timeZone)}`).join(", ");
    dicas.push({
      id: `livres-hoje-${todayKey}-${gaps.length}`,
      kind: "faturamento",
      title: `Ainda dá para encaixar ${gaps.length === 1 ? "1 cliente" : `até ${gaps.length} clientes`} hoje`,
      detail: `Tem ${Math.round(freeMin / 60)}h livres na agenda de hoje (a partir de ${lista}). Posta no status: quem está por perto adora um horário de última hora.`,
      copy: { label: "Copiar texto do status", text: `Abriu horário HOJE ✨ ${lista}. Quem quiser se cuidar ainda hoje, me chama ou marca aqui: ${opts.bookingUrl} 💜` },
      action: { label: "Ver a agenda de hoje", href: `/app/agenda?data=${todayKey}&visao=lista` },
    });
  }

  // Quem já faltou e tem horário marcado nos próximos 3 dias: confirmar com carinho (ou pedir sinal).
  const faltosas = await tx<{ name: string; phone: string | null; starts_at: Date; faltas: number }[]>`
    select c.full_name as name, c.phone_normalized as phone, a.starts_at,
      (select count(*) from app.appointments n where n.client_id = c.id and n.status = 'no_show' and n.starts_at >= ${new Date(today.getTime() - 180 * DAY)})::int as faltas
    from app.appointments a join app.clients c on c.id = a.client_id
    where a.organization_id = ${orgId} and a.status in ('pending', 'confirmed') and a.client_confirmed_at is null
      and a.starts_at >= ${now} and a.starts_at < ${new Date(today.getTime() + 4 * DAY)}
    order by a.starts_at`;
  const risco = faltosas.filter((f) => f.faltas >= 1);
  if (risco.length > 0) {
    const fmt = (d: Date) => { const k = localDateKey(d, timeZone); return `${k === todayKey ? "hoje" : k === tomorrowKey ? "amanhã" : `${WEEKDAY[localWeekday(k)]}`} às ${localTime(d, timeZone)}`; };
    dicas.push({
      id: `risco-falta-${todayKey}-${risco.length}`,
      kind: "avisos",
      title: risco.length === 1 ? `${first(risco[0]!.name)} já faltou antes e vem ${fmt(risco[0]!.starts_at)}` : `${risco.length} clientes que já faltaram vêm nos próximos dias`,
      detail: "Ainda não confirmaram. Uma mensagem carinhosa hoje evita o horário vazio, e para quem falta sempre vale pedir um sinal na próxima vez.",
      clients: risco.slice(0, 6).map((f) => ({
        name: f.name, phone: f.phone, note: `${f.faltas} falta${f.faltas === 1 ? "" : "s"} · ${fmt(f.starts_at)}`,
        message: `Oi, ${first(f.name)}! Tudo bem? 💜 Passando pra confirmar seu horário ${fmt(f.starts_at)}. Posso contar com você? Se precisar remarcar, me avisa que eu ajeito!`,
      })),
      moreClients: Math.max(0, risco.length - 6),
    });
  }

  // Clientes novas que vieram uma vez (há 20 a 50 dias) e não voltaram: a segunda visita é a que fideliza.
  const primeiraVez = await tx<{ name: string; phone: string | null; service: string; first: Date }[]>`
    select c.full_name as name, c.phone_normalized as phone, min(a.starts_at) as first,
      (select x.service_name from app.appointment_services x where x.appointment_id = (array_agg(a.id order by a.starts_at))[1] order by x.position limit 1) as service
    from app.clients c join app.appointments a on a.client_id = c.id and a.status = 'completed'
    where c.organization_id = ${orgId} and c.archived_at is null and c.contact_preference <> 'none'
      and not exists (select 1 from app.appointments f where f.client_id = c.id and f.status in ('pending', 'confirmed') and f.starts_at >= ${now})
    group by c.id, c.full_name, c.phone_normalized
    having count(a.id) = 1 and min(a.starts_at) between ${new Date(today.getTime() - 50 * DAY)} and ${new Date(today.getTime() - 20 * DAY)}
    order by min(a.starts_at) desc`;
  if (primeiraVez.length > 0) {
    dicas.push({
      id: `segunda-visita-${todayKey.slice(0, 7)}-${primeiraVez.length}`,
      kind: "faturamento",
      title: primeiraVez.length === 1 ? `${first(primeiraVez[0]!.name)} veio uma vez e ainda não voltou` : `${primeiraVez.length} clientes novas vieram uma vez e não voltaram`,
      detail: "A segunda visita é a que transforma cliente nova em cliente fiel. Um convite com um agradinho (10% ou um mimo) costuma resolver.",
      clients: primeiraVez.slice(0, 6).map((p) => ({
        name: p.name, phone: p.phone, note: `${p.service} em ${brDate(localDateKey(p.first, timeZone))}`,
        message: `Oi, ${first(p.name)}! Amei te atender 💜 Como ficou o ${servicesText([p.service])}? Pra sua próxima visita separei um mimo especial. Bora marcar? ${opts.bookingUrl}`,
      })),
      moreClients: Math.max(0, primeiraVez.length - 6),
    });
  }

  // VIPs (as que mais gastam) que não vêm há mais de 45 dias e não têm nada marcado.
  if (opts.finance) {
    const vipsSumidas = await tx<{ name: string; phone: string | null; last: Date; spent: number }[]>`
      with gasto as (
        select a.client_id, sum(a.price_cents - a.discount_cents)::int as spent, max(a.starts_at) as last
        from app.appointments a where a.organization_id = ${orgId} and a.status = 'completed' and a.starts_at >= ${new Date(today.getTime() - 365 * DAY)}
        group by a.client_id
      ), corte as (select percentile_cont(0.8) within group (order by spent) as p80 from gasto)
      select c.full_name as name, c.phone_normalized as phone, g.last, g.spent
      from gasto g join app.clients c on c.id = g.client_id, corte
      where g.spent >= corte.p80 and g.last < ${new Date(today.getTime() - 45 * DAY)} and c.archived_at is null
        and not exists (select 1 from app.appointments f where f.client_id = g.client_id and f.status in ('pending', 'confirmed') and f.starts_at >= ${now})
      order by g.spent desc`;
    if (vipsSumidas.length > 0) {
      dicas.push({
        id: `vip-sumida-${todayKey.slice(0, 7)}-${vipsSumidas.length}`,
        kind: "mimos",
        title: vipsSumidas.length === 1 ? `${first(vipsSumidas[0]!.name)}, uma das suas VIPs, sumiu` : `${vipsSumidas.length} clientes VIP estão sumidas`,
        detail: "Estão entre as que mais investiram com você no último ano e não aparecem há mais de 45 dias. Vale um carinho pessoal (e um mimo) antes que elas se acostumem com outro lugar.",
        value: { cents: Math.round(vipsSumidas.reduce((t, v) => t + v.spent, 0) / 12), label: "por mês em jogo" },
        clients: vipsSumidas.slice(0, 6).map((v) => ({
          name: v.name, phone: v.phone, note: `última visita ${brDate(localDateKey(v.last, timeZone))}`,
          message: `Oi, ${first(v.name)}! Que saudade! 💜 Faz tempinho que você não aparece e eu separei um mimo especial pra sua próxima visita. Bora matar a saudade? ${opts.bookingUrl}`,
        })),
        moreClients: Math.max(0, vipsSumidas.length - 6),
      });
    }
  }

  // Ordem por importância: o que precisa de ação hoje primeiro, depois o que vale mais dinheiro.
  const PRIORITY: [string, number][] = [
    ["confirmar-", 95], ["risco-falta-", 92], ["livres-hoje-", 90], ["aniversario-", 78], ["retorno-", 80], ["vip-sumida-", 76],
    ["segunda-visita-", 72], ["dia-fraco-", 68], ["receber-", 62], ["estoque-", 58], ["boas-vindas-", 55], ["fidelidade-", 50],
    ["combo-", 46], ["upsell-", 44], ["reajuste-", 42], ["vips-", 36], ["cfg-link-", 34], ["cfg-retorno-", 26], ["cfg-aniversario-", 22], ["inventario-", 20],
  ];
  return dicas.map((d) => {
    let p = PRIORITY.find(([k]) => d.id.startsWith(k))?.[1] ?? 30;
    if (d.id.startsWith("aniversario-") && d.title.includes("hoje")) p = 93;
    return { ...d, priority: p, urgent: p >= 85 };
  }).sort((a, b) => b.priority - a.priority);
}

export type DicasData = Awaited<ReturnType<typeof loadDicas>>;
