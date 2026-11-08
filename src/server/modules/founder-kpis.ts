import type { Tx } from "@/server/db";

/** Ativação: a conta criou pelo menos um atendimento em até 7 dias depois do cadastro. */
export const ATIVACAO_DIAS = 7;

export type FounderKpis = {
  cadastros: { total: number; ultimos7: number; ultimos30: number };
  /** Cadastros dos últimos 30 dias por código de canal e resposta de "como conheceu". */
  porCanal: { canal: string; conheceu: string; cadastros: number }[];
  /** Quem se cadastrou nos últimos 30 dias, etapa por etapa. */
  funil: { cadastros: number; criaramNegocio: number; concluiramOnboarding: number; ativadas: number };
  listaEspera: { total: number; ultimos7: number; porTipo: { tipo: string; pessoas: number }[] };
  reservasOnline: { ultimos7: number; ultimos30: number };
  assinaturas: { status: string; contas: number }[];
  /** Contas (não demonstração) com 3 a 30 dias de cadastro e nenhum atendimento criado até agora. */
  contasEmRisco: { orgId: string; nome: string; email: string | null; diasDesdeCadastro: number }[];
  /** Contas (não demonstração) que já usaram a agenda, mas faz 14 dias ou mais que nenhum horário novo foi criado. */
  contasParadas: { orgId: string; nome: string; email: string | null; diasParada: number }[];
};

const n = (v: unknown) => Number(v ?? 0);

/**
 * Números do painel do fundador, lidos direto do banco (eventos de funil + tabelas do produto).
 * Só roda com `withSystem` (leitura de toda a plataforma), nunca no contexto de uma conta. Sem dados pessoais,
 * exceto a lista de contas em risco, que só a equipe vê.
 */
export async function loadFounderKpis(tx: Tx, now = new Date()): Promise<FounderKpis> {
  const d7 = new Date(now.getTime() - 7 * 86_400_000), d30 = new Date(now.getTime() - 30 * 86_400_000);
  const d3 = new Date(now.getTime() - 3 * 86_400_000);

  const [c] = await tx<{ total: number; u7: number; u30: number }[]>`
    select count(*)::int as total, count(*) filter (where created_at >= ${d7})::int as u7, count(*) filter (where created_at >= ${d30})::int as u30
    from app.product_events where name = 'signup.completed'`;

  const porCanal = await tx<{ canal: string; conheceu: string; cadastros: number }[]>`
    select coalesce(props->>'canal', 'sem código') as canal, coalesce(props->>'conheceu', 'não respondeu') as conheceu, count(*)::int as cadastros
    from app.product_events where name = 'signup.completed' and created_at >= ${d30}
    group by 1, 2 order by cadastros desc, canal limit 30`;

  const [f] = await tx<{ cad: number; neg: number; onb: number; ativ: number }[]>`
    with coorte as (select user_id, min(created_at) as quando from app.product_events where name = 'signup.completed' and created_at >= ${d30} and user_id is not null group by user_id)
    select count(*)::int as cad,
      count(*) filter (where exists (select 1 from app.product_events e where e.user_id = c.user_id and e.name = 'onboarding.business_created'))::int as neg,
      count(*) filter (where exists (select 1 from app.product_events e where e.user_id = c.user_id and e.name = 'onboarding.completed'))::int as onb,
      count(*) filter (where exists (
        select 1 from app.product_events e join app.appointments a on a.organization_id = e.organization_id
        where e.user_id = c.user_id and e.name = 'onboarding.business_created' and a.created_at <= c.quando + make_interval(days => ${ATIVACAO_DIAS})))::int as ativ
    from coorte c`;

  const [w] = await tx<{ total: number; u7: number }[]>`
    select count(*)::int as total, count(*) filter (where created_at >= ${d7})::int as u7 from app.waitlist`;
  const porTipo = await tx<{ tipo: string; pessoas: number }[]>`
    select business_type as tipo, count(*)::int as pessoas from app.waitlist group by 1 order by pessoas desc`;

  const [r] = await tx<{ u7: number; u30: number }[]>`
    select count(*) filter (where created_at >= ${d7})::int as u7, count(*) filter (where created_at >= ${d30})::int as u30
    from app.product_events where name = 'booking.online_created'`;

  const assinaturas = await tx<{ status: string; contas: number }[]>`
    select s.status::text as status, count(*)::int as contas
    from app.subscriptions s join app.organizations o on o.id = s.organization_id where not o.is_demo group by 1 order by contas desc`;

  const risco = await tx<{ id: string; name: string; email: string | null; created_at: Date }[]>`
    select o.id, o.name, o.created_at,
      (select u.email from app.memberships m join app.users u on u.id = m.user_id where m.organization_id = o.id and m.role = 'owner' and m.status = 'active' order by m.created_at limit 1) as email
    from app.organizations o
    where not o.is_demo and o.created_at <= ${d3} and o.created_at >= ${d30}
      and not exists (select 1 from app.appointments a where a.organization_id = o.id)
    order by o.created_at desc limit 20`;

  const paradas = await tx<{ id: string; name: string; email: string | null; ultimo: Date }[]>`
    select o.id, o.name, u.ultimo,
      (select us.email from app.memberships m join app.users us on us.id = m.user_id where m.organization_id = o.id and m.role = 'owner' and m.status = 'active' order by m.created_at limit 1) as email
    from app.organizations o
    join (select organization_id, max(created_at) as ultimo from app.appointments where status <> 'cancelled' group by organization_id) u on u.organization_id = o.id
    where not o.is_demo and u.ultimo < ${new Date(now.getTime() - 14 * 86_400_000)}
    order by u.ultimo desc limit 20`;

  return {
    cadastros: { total: n(c?.total), ultimos7: n(c?.u7), ultimos30: n(c?.u30) },
    porCanal,
    funil: { cadastros: n(f?.cad), criaramNegocio: n(f?.neg), concluiramOnboarding: n(f?.onb), ativadas: n(f?.ativ) },
    listaEspera: { total: n(w?.total), ultimos7: n(w?.u7), porTipo },
    reservasOnline: { ultimos7: n(r?.u7), ultimos30: n(r?.u30) },
    assinaturas,
    contasParadas: paradas.map((o) => ({ orgId: o.id, nome: o.name, email: o.email, diasParada: Math.floor((now.getTime() - o.ultimo.getTime()) / 86_400_000) })),
    contasEmRisco: risco.map((o) => ({ orgId: o.id, nome: o.name, email: o.email, diasDesdeCadastro: Math.floor((now.getTime() - o.created_at.getTime()) / 86_400_000) })),
  };
}
