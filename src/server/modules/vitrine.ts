/**
 * Conta vitrine para apresentações: um salão fictício com ~4 meses de agenda e números próximos
 * da realidade, contando a história "faturava ~R$ 14 mil por mês e, em 3 meses usando a Gê,
 * chegou a ~R$ 17,6 mil" (+26%). Marcada com is_demo = true (a interface exibe o aviso).
 *
 * De onde vem o crescimento (premissas conservadoras para um salão pequeno com 3 profissionais):
 *  - faltas caem de ~14% para ~5% com confirmação e lembrete;
 *  - novas clientes chegam pelo agendamento online (0% → ~35% dos agendamentos);
 *  - venda adicional no atendimento (serviço extra) sobe de ~3% para ~15% dos atendimentos;
 *  - as horas vagas passam a ser preenchidas (a ocupação sobe alguns pontos).
 *
 * Linha do tempo relativa a hoje: 5 a 3 meses atrás = "antes da Gê" (histórico importado da planilha),
 * depois 1º, 2º e 3º mês com a Gê (o 3º é o mês atual, com a agenda das próximas 2 semanas).
 * Determinístico (semente fixa): rodar de novo gera os mesmos números para a mesma data.
 *
 * Uso: `npm run db:seed-vitrine` (local) ou a rota interna /api/interno/vitrine (produção, com chave).
 */
import { hashPassword } from "@/server/auth/password";
import { createOrganizationForUser } from "@/server/modules/onboarding";
import { saveService } from "@/server/modules/catalog";
import { addServiceToAppointment, changeStatus, createAppointment } from "@/server/modules/appointments";
import { recordPayment } from "@/server/modules/payments";
import { withSystem, withTenant, type Sql, type Tx } from "@/server/db";
import { addDaysToKey, localDateKey, localWeekday } from "@/lib/time";

/**
 * Aniversário de 4 em cada 5 clientes, derivado do número da cliente (sem usar o sorteio, para os
 * demais dados continuarem iguais): espalhado pelo ano, idades de 22 a 55.
 */
function aniversario(n: number): string | null {
  if (n % 5 === 0) return null;
  const d = new Date(Date.UTC(1971 + ((n * 7) % 34), 0, 1) + ((n * 53) % 365) * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export const EMAIL_VITRINE = "vitrine@beautyos.dev";
const EMAIL = EMAIL_VITRINE;
const TZ = "America/Sao_Paulo";

// ---------------------------------------------------------------------------
// Cenário

/** Ritmo de cada mês: faturamento de um mês típico (~21,7 dias de atendimento), taxas e captação. */
const MESES = [
  { nome: "Antes da Gê", produzido: 14_000_00, falta: 0.14, cancel: 0.06, online: 0, adicional: 0.03, novas: 9 },
  { nome: "1º mês com a Gê", produzido: 15_100_00, falta: 0.1, cancel: 0.05, online: 0.18, adicional: 0.08, novas: 15 },
  { nome: "2º mês com a Gê", produzido: 16_400_00, falta: 0.07, cancel: 0.045, online: 0.28, adicional: 0.12, novas: 21 },
  { nome: "3º mês com a Gê", produzido: 17_600_00, falta: 0.05, cancel: 0.04, online: 0.35, adicional: 0.15, novas: 25 },
];

/** tendencia: variação do peso a cada mês com a Gê (ex.: −0,15 = 15% menos procurado por mês). */
type Svc = { name: string; category: string; price: number; minutes: number; buffer: number; returnDays?: number; peso: number; extra?: string; tendencia?: number };
const SERVICOS: Record<"cabelo" | "unhas" | "olhar", Svc[]> = {
  cabelo: [
    { name: "Corte feminino", category: "Cabelo", price: 9000, minutes: 60, buffer: 10, returnDays: 60, peso: 5, extra: "Hidratação" },
    { name: "Escova", category: "Cabelo", price: 6000, minutes: 45, buffer: 10, peso: 6, extra: "Hidratação" },
    { name: "Hidratação", category: "Cabelo", price: 8000, minutes: 45, buffer: 10, returnDays: 30, peso: 3 },
    { name: "Coloração", category: "Cabelo", price: 18000, minutes: 120, buffer: 15, returnDays: 45, peso: 2, extra: "Hidratação" },
    { name: "Mechas", category: "Cabelo", price: 32000, minutes: 180, buffer: 15, returnDays: 90, peso: 0.6, tendencia: 0.1 },
    { name: "Progressiva", category: "Cabelo", price: 25000, minutes: 150, buffer: 15, returnDays: 90, peso: 0.6, tendencia: -0.3 },
  ],
  unhas: [
    { name: "Manicure", category: "Unhas", price: 3500, minutes: 45, buffer: 10, returnDays: 10, peso: 6, extra: "Pedicure", tendencia: -0.15 },
    { name: "Pedicure", category: "Unhas", price: 4000, minutes: 50, buffer: 10, returnDays: 15, peso: 3 },
    { name: "Esmaltação em gel", category: "Unhas", price: 6000, minutes: 60, buffer: 10, returnDays: 21, peso: 3, extra: "Pedicure", tendencia: 0.2 },
    { name: "Alongamento em gel", category: "Unhas", price: 15000, minutes: 120, buffer: 15, returnDays: 21, peso: 1.2 },
    { name: "Manutenção do alongamento", category: "Unhas", price: 9000, minutes: 90, buffer: 15, returnDays: 21, peso: 2.5 },
  ],
  olhar: [
    { name: "Design de sobrancelhas", category: "Sobrancelhas", price: 5000, minutes: 30, buffer: 10, returnDays: 20, peso: 6, extra: "Lash lifting" },
    { name: "Design com henna", category: "Sobrancelhas", price: 7000, minutes: 45, buffer: 10, returnDays: 20, peso: 3, extra: "Lash lifting" },
    { name: "Lash lifting", category: "Cílios", price: 12000, minutes: 60, buffer: 10, returnDays: 45, peso: 1.5, tendencia: 0.15 },
    { name: "Extensão fio a fio", category: "Cílios", price: 16000, minutes: 120, buffer: 15, returnDays: 20, peso: 1, tendencia: -0.3 },
    { name: "Manutenção de cílios", category: "Cílios", price: 9000, minutes: 75, buffer: 15, returnDays: 20, peso: 2 },
  ],
};

/** Equipe: a dona (cabelo) e duas profissionais; peso = participação nos atendimentos. */
const EQUIPE = [
  { nome: "Bia Monteiro", area: "cabelo" as const, cor: "#7c3aed", peso: 0.38, dias: [2, 3, 4, 5, 6] },
  { nome: "Carla Souza", area: "unhas" as const, cor: "#c2410c", peso: 0.37, dias: [2, 3, 4, 5, 6], especialidade: "Nail designer" },
  { nome: "Dani Rocha", area: "olhar" as const, cor: "#0f766e", peso: 0.25, dias: [3, 4, 5, 6], especialidade: "Lash & sobrancelhas" },
];
const EXPEDIENTE = [["09:00", "12:00"], ["13:00", "18:00"]] as const;
const DIAS_UTEIS = [2, 3, 4, 5, 6]; // o salão abre de terça a sábado; a Dani atende de quarta a sábado
const PESO_DIA: Record<number, number> = { 2: 0.85, 3: 0.95, 4: 1, 5: 1.15, 6: 1.3 };
const PESO_MEDIO = DIAS_UTEIS.reduce((t, d) => t + PESO_DIA[d]!, 0) / DIAS_UTEIS.length;
const DIAS_POR_MES = 21.7; // terça a sábado: ~5 dias × 4,34 semanas
const MESES_ANTES = 3; // meses de histórico "antes da Gê"

const NOMES = ["Ana", "Beatriz", "Camila", "Daniela", "Eduarda", "Fernanda", "Gabriela", "Helena", "Isabela", "Juliana", "Larissa", "Letícia",
  "Mariana", "Natália", "Patrícia", "Rafaela", "Sabrina", "Tatiane", "Vanessa", "Yasmin", "Aline", "Bruna", "Carolina", "Débora", "Elaine",
  "Flávia", "Giovana", "Jéssica", "Karina", "Lívia", "Luana", "Michele", "Nicole", "Priscila", "Renata", "Simone", "Talita", "Vitória",
  "Amanda", "Bianca", "Cíntia", "Denise", "Érica", "Fabiana", "Heloísa", "Ingrid", "Joana", "Kelly", "Laura", "Marina", "Paula", "Roberta",
  "Sofia", "Thaís", "Valéria", "Alice", "Cecília", "Lorena", "Manuela", "Raquel"];
const SOBRENOMES = ["Silva", "Santos", "Oliveira", "Souza", "Lima", "Pereira", "Costa", "Ferreira", "Almeida", "Carvalho", "Gomes", "Martins",
  "Araújo", "Ribeiro", "Rocha", "Barbosa", "Melo", "Cardoso", "Teixeira", "Correia", "Nunes", "Moreira", "Freitas", "Mendes", "Batista"];

// ---------------------------------------------------------------------------
// Auxiliares

function prng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rnd = prng(20261029);
const pick = <T,>(xs: T[], peso: (x: T) => number) => {
  let r = rnd() * xs.reduce((s, x) => s + peso(x), 0);
  for (const x of xs) { r -= peso(x); if (r <= 0) return x; }
  return xs[xs.length - 1]!;
};
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const monthStart = (key: string, delta: number) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1 + delta, 1)).toISOString().slice(0, 10);
};

export type ResultadoVitrine = { status: "criada" | "ja_existe"; email: string; linhas: string[] };

export async function vitrineExiste(sql: Sql) {
  const [u] = await sql`select 1 from app.users where lower(email) = ${EMAIL}`;
  return !!u;
}

/** Troca a senha da conta vitrine e resume o que existe nela (para conferir se a criação terminou). */
export async function novaSenhaVitrine(sql: Sql, password: string) {
  const [u] = await sql<{ id: string }[]>`
    update app.users set password_hash = ${await hashPassword(password)} where lower(email) = ${EMAIL} returning id`;
  if (!u) return null;
  const [r] = await sql<{ organizacoes: number; profissionais: number; clientes: number; atendimentos: number; recebido_30d: number }[]>`
    select count(distinct o.id)::int as organizacoes,
      (select count(*) from app.professionals p where p.organization_id = any(array_agg(o.id)))::int as profissionais,
      (select count(*) from app.clients c where c.organization_id = any(array_agg(o.id)))::int as clientes,
      (select count(*) from app.appointments a where a.organization_id = any(array_agg(o.id)))::int as atendimentos,
      (select coalesce(sum(case when kind = 'payment' then amount_cents else -amount_cents end), 0) from app.payments p
        where p.organization_id = any(array_agg(o.id)) and p.paid_at > now() - interval '30 days')::int as recebido_30d
    from app.organizations o where o.created_by = ${u.id} and o.is_demo`;
  return { status: "senha_trocada" as const, email: EMAIL, ...r! };
}

/** Cria (ou, com reset, recria) a conta vitrine. Determinístico para a mesma data. */
export async function criarContaVitrine(sql: Sql, opts: { password: string; reset?: boolean }): Promise<ResultadoVitrine> {
  rnd = prng(20261029);
  const password = opts.password;
  const linhas: string[] = [];

  const [exists] = await sql<{ id: string }[]>`select id from app.users where lower(email) = ${EMAIL}`;
  if (exists && !opts.reset) return { status: "ja_existe", email: EMAIL, linhas: ["Conta vitrine já existe (use reset para recriar)."] };
  if (exists) {
    // Só apaga organizações de demonstração criadas por esta usuária (as tabelas filhas caem em cascata).
    await sql`delete from app.organizations where created_by = ${exists.id} and is_demo`;
    await sql`delete from app.users where id = ${exists.id}`;
  }

  const [user] = await sql<{ id: string }[]>`
    insert into app.users (email, password_hash, full_name) values (${EMAIL}, ${await hashPassword(password)}, 'Bia Monteiro') returning id`;
  const org = await withSystem((tx) => createOrganizationForUser(tx, user!.id,
    { name: "Salão Lumi", businessType: "salon", attends: true, ownerDisplayName: EQUIPE[0]!.nome, timezone: TZ, phone: "(11) 90000-0000" },
    { isDemo: true }), sql);
  await sql`update app.organizations set onboarding_completed_at = now(), min_advance_minutes = 60 where id = ${org.organizationId}`;
  await sql`update app.subscriptions set plan = 'studio', status = 'active', trial_ends_at = null where organization_id = ${org.organizationId}`;
  await sql`update app.professionals set specialty = 'Cabelo', color = ${EQUIPE[0]!.cor} where id = ${org.professionalId!}`;
  const proIds = [org.professionalId!];
  for (const e of EQUIPE.slice(1)) {
    const [p] = await sql<{ id: string }[]>`
      insert into app.professionals (organization_id, display_name, specialty, color) values (${org.organizationId}, ${e.nome}, ${e.especialidade ?? null}, ${e.cor}) returning id`;
    proIds.push(p!.id);
  }
  await sql`delete from app.working_hours where organization_id = ${org.organizationId}`;
  for (const [i, pid] of proIds.entries()) for (const wd of EQUIPE[i]!.dias) for (const [s, e] of EXPEDIENTE)
    await sql`insert into app.working_hours (organization_id, professional_id, weekday, start_time, end_time) values (${org.organizationId}, ${pid}, ${wd}, ${s}, ${e})`;

  const actor = { userId: user!.id, organizationId: org.organizationId };
  const today = localDateKey(new Date(), TZ);
  // 3 meses "antes da Gê" (para o gráfico dos últimos 6 meses mostrar o patamar antigo) + 3 meses com a Gê.
  const inicio = monthStart(today, -(MESES_ANTES + 2));
  const NOMES_MES = [...Array.from({ length: MESES_ANTES }, (_, i) => `Antes da Gê (${i + 1}/${MESES_ANTES})`), ...MESES.slice(1).map((m) => m.nome)];
  const fimFuturo = addDaysToKey(today, 14);
  const stats = NOMES_MES.map(() => ({ atend: 0, concluidos: 0, faltas: 0, cancel: 0, produzido: 0, online: 0, adicionais: 0, minutos: 0 }));
  const onlineIds: string[] = [];

  await withTenant(actor, async (tx: Tx) => {
    // Serviços de cada área, feitos pela profissional da área.
    const svcId = new Map<string, string>();
    for (const [i, e] of EQUIPE.entries())
      for (const s of SERVICOS[e.area])
        svcId.set(s.name, await saveService(tx, actor, { name: s.name, categoryName: s.category, price: s.price, durationMinutes: s.minutes,
          bufferAfterMinutes: s.buffer, returnIntervalDays: s.returnDays, onlineBookable: true, professionalIds: [proIds[i]!] }));

    // Clientes: base que já existia (importada da planilha) + novas a cada mês.
    const nomeUsado = new Set<string>();
    let seqFone = 0;
    const novaCliente = async (origem: "import" | "staff" | "online") => {
      let nome = "";
      do nome = `${NOMES[Math.floor(rnd() * NOMES.length)]} ${SOBRENOMES[Math.floor(rnd() * SOBRENOMES.length)]}`; while (nomeUsado.has(nome));
      nomeUsado.add(nome);
      // Telefones claramente fictícios, em sequência ((11) 90000-0001…): nenhum clique de WhatsApp
      // na demonstração pode chegar a uma pessoa de verdade.
      const fone = `90000${String(++seqFone).padStart(4, "0")}`;
      const [c] = await tx<{ id: string }[]>`
        insert into app.clients (organization_id, full_name, phone, phone_normalized, marketing_consent, source, birth_date)
        values (${org.organizationId}, ${nome}, ${`(11) ${fone.slice(0, 5)}-${fone.slice(5)}`}, ${`5511${fone}`}, ${rnd() < 0.7}, ${origem}, ${aniversario(seqFone)})
        returning id`;
      return { id: c!.id, peso: 0.4 + rnd() * 2.2 }; // frequência: algumas vêm toda semana, outras de vez em quando
    };
    type Cliente = { id: string; peso: number };
    const base: Cliente[] = [];
    for (let i = 0; i < 165; i++) base.push(await novaCliente("import"));
    // Mistura de serviços estável: cada área tira de um "baralho" montado pelos pesos, então o ticket
    // médio quase não oscila e o crescimento aparece em mais atendimentos (e mais ocupação).
    // Um baralho por mês do cenário: com a Gê, alguns serviços ganham e outros perdem procura
    // (ex.: manicure simples → esmaltação em gel; extensão de cílios → lash lifting), como na vida real.
    const baralhos = new Map<string, { cartas: Svc[]; i: number }>();
    const proximo = (a: keyof typeof SERVICOS, mi = 0) => {
      const chave = `${a}-${mi}`;
      let b = baralhos.get(chave);
      if (!b) {
        const cartas = SERVICOS[a].flatMap((x) => Array.from({ length: Math.max(1, Math.round(x.peso * (1 + (x.tendencia ?? 0)) ** mi * 5)) }, () => x));
        for (let k = cartas.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [cartas[k], cartas[j]] = [cartas[j]!, cartas[k]!]; }
        b = { cartas, i: 0 };
        baralhos.set(chave, b);
      }
      const x = b.cartas[b.i % b.cartas.length]!; b.i++; return x;
    };
    // Histórico da planilha: cada cliente da base já tinha vindo pelo menos uma vez nos 6 meses antes,
    // senão a primeira visita registrada a contaria como "cliente nova" no painel.
    for (const c of base) {
      for (let tent = 0; tent < 6; tent++) {
        let dia = addDaysToKey(inicio, -(5 + Math.floor(rnd() * 175)));
        while (!DIAS_UTEIS.includes(localWeekday(dia))) dia = addDaysToKey(dia, -1);
        const pi = Math.floor(rnd() * proIds.length);
        if (!EQUIPE[pi]!.dias.includes(localWeekday(dia))) continue;
        const svc = proximo(EQUIPE[pi]!.area);
        const hora = toTime(toMin("09:00") + 15 * Math.floor(rnd() * 32));
        const appt = await tx.savepoint((sp) => createAppointment(sp as unknown as Tx, actor,
          { professionalId: proIds[pi]!, clientId: c.id, date: dia, time: hora, serviceIds: [svcId.get(svc.name)!], squeezeIn: true, status: "confirmed" })).catch(() => null);
        if (!appt) continue;
        await changeStatus(tx, actor, appt.id, "completed");
        await recordPayment(tx, actor, { appointmentId: appt.id, amountCents: svc.price, method: "pix", isDeposit: false });
        break;
      }
    }

    // Parte dos serviços de cada área que aceita adicional: a chance de oferta compensa isso.
    const fracExtra = Object.fromEntries(Object.entries(SERVICOS).map(([a, xs]) =>
      [a, xs.filter((x) => x.extra).reduce((t, x) => t + x.peso, 0) / xs.reduce((t, x) => t + x.peso, 0)])) as Record<keyof typeof SERVICOS, number>;
    // Valor que cada mês já "garantiu" (concluído no passado; agendado no futuro, descontadas as perdas esperadas).
    const garantido = NOMES_MES.map(() => 0);
    const alvo = NOMES_MES.map(() => 0); // soma das metas diárias de cada mês do calendário até o dia corrente
    // Faltas, cancelamentos e origem online distribuídos de forma regular (sem sorte): cada mês
    // fecha na taxa planejada, em vez de oscilar com o sorteio.
    const acumulado = { falta: 0, cancel: 0, online: 0 };
    const sorteio = (k: keyof typeof acumulado, taxa: number) => { acumulado[k] += taxa; if (acumulado[k] >= 1) { acumulado[k] -= 1; return true; } return false; };

    for (let d = inicio; d <= fimFuturo; d = addDaysToKey(d, 1)) {
      const wd = localWeekday(d);
      if (!DIAS_UTEIS.includes(wd)) continue;
      const idx = (Number(d.slice(0, 4)) - Number(inicio.slice(0, 4))) * 12 + Number(d.slice(5, 7)) - Number(inicio.slice(5, 7));
      const ci = Math.min(NOMES_MES.length - 1, idx); // mês do calendário
      const mi = Math.max(0, ci - (MESES_ANTES - 1)); // cenário: 0 = antes da Gê, 1–3 = meses com a Gê
      const proximoMes = idx >= NOMES_MES.length; // agenda das próximas semanas que já cai no mês seguinte
      const mes = MESES[mi]!;
      const passado = d < today;
      const perda = 1 - mes.falta - mes.cancel;
      // Meta do dia pelo ritmo do mês (um mês típico tem ~21,7 dias de atendimento; sábado pesa mais).
      // Assim o crescimento é por dia trabalhado e aparece igual em qualquer comparação (mês até hoje,
      // últimos 30 dias), sem depender de quantos dias cada mês do calendário tem. Uma correção leva
      // o que já foi garantido de volta ao ritmo planejado, e a meta compensa faltas e cancelamentos.
      const diasMes = []; for (let x = monthStart(d, 0); x < monthStart(d, 1); x = addDaysToKey(x, 1)) if (DIAS_UTEIS.includes(localWeekday(x))) diasMes.push(x);
      const alvoDia = (mes.produzido / DIAS_POR_MES) * (PESO_DIA[wd]! / PESO_MEDIO);
      if (!proximoMes) alvo[ci]! += alvoDia;
      const correcao = proximoMes ? 0 : Math.max(-alvoDia * 0.15, Math.min(alvoDia * 0.15, alvo[ci]! - alvoDia - garantido[ci]!));
      const meta = Math.max(0, alvoDia + correcao) / perda * (0.96 + rnd() * 0.08);
      // Novas clientes do mês entram espalhadas pelos dias.
      const novasHoje = rnd() < mes.novas / diasMes.length ? 1 + (rnd() < 0.15 ? 1 : 0) : 0;
      const novasDoDia: Cliente[] = [];
      for (let k = 0; k < novasHoje; k++) novasDoDia.push(await novaCliente(rnd() < mes.online * 1.6 ? "online" : "staff"));

      const cursor = proIds.map((_, k) => EQUIPE[k]!.dias.includes(wd) ? toMin(EXPEDIENTE[0][0]) + Math.floor(rnd() * 3) * 15 : 24 * 60);
      let valor = 0, tentativas = 0;
      while (valor < meta && tentativas++ < 80) {
        const pi = proIds.indexOf(pick(proIds.filter((_, k) => EQUIPE[k]!.dias.includes(wd)), (id) => EQUIPE[proIds.indexOf(id)]!.peso));
        const area = EQUIPE[pi]!.area;
        const svc = proximo(area, mi);
        const extra = svc.extra && rnd() < mes.adicional / fracExtra[area] ? SERVICOS[area].find((x) => x.name === svc.extra) : undefined;
        const preco = svc.price + (extra ? extra.price : 0);
        // Não estoura a meta do dia: perto dela, encerra; longe dela, tenta um serviço que caiba.
        if (valor > 0 && valor + preco > meta * 1.1) { if (valor >= meta * 0.85) break; continue; }
        let ini = cursor[pi]! + (rnd() < 0.35 ? 15 * (1 + Math.floor(rnd() * 3)) : 0);
        const dur = svc.minutes + svc.buffer + (extra ? extra.minutes + extra.buffer : 0);
        if (ini < toMin(EXPEDIENTE[1][0]) && ini + dur > toMin(EXPEDIENTE[0][1])) ini = toMin(EXPEDIENTE[1][0]); // pausa do almoço
        if (ini + dur > toMin(EXPEDIENTE[1][1])) { if (cursor.every((c) => c + 45 > toMin(EXPEDIENTE[1][1]))) break; continue; }
        cursor[pi] = ini + dur;

        const nova = novasDoDia.shift();
        if (nova) base.push(nova); // nova cliente passa a fazer parte da base
        const cliente: Cliente = nova ?? pick(base, (c) => c.peso);
        const appt = await tx.savepoint((sp) => createAppointment(sp as unknown as Tx, actor,
          { professionalId: proIds[pi]!, clientId: cliente.id, date: d, time: toTime(ini), serviceIds: [svcId.get(svc.name)!], squeezeIn: passado, status: passado || rnd() < 0.75 ? "confirmed" : "pending" }),
        ).catch(() => null);
        if (!appt) continue;
        const comExtra = extra ? await addServiceToAppointment(tx, actor, { appointmentId: appt.id, serviceId: svcId.get(extra.name)! }).then(() => true, () => false) : false;
        const valorAtend = svc.price + (comExtra ? extra!.price : 0);
        const minutos = svc.minutes + (comExtra ? extra!.minutes : 0);
        valor += valorAtend;
        const online = mi > 0 && sorteio("online", mes.online);
        if (online) onlineIds.push(appt.id);
        if (proximoMes) continue;
        const st = stats[ci]!;
        st.atend++; if (comExtra) st.adicionais++; if (online) st.online++;
        if (!passado) { st.produzido += valorAtend; st.minutos += minutos; garantido[ci]! += valorAtend * perda; continue; }

        const desfecho = sorteio("falta", mes.falta) ? "no_show" : sorteio("cancel", mes.cancel) ? "cancelled" : "completed";
        await changeStatus(tx, actor, appt.id, desfecho);
        if (desfecho === "no_show") { st.faltas++; st.minutos += minutos; }
        if (desfecho === "cancelled") st.cancel++;
        if (desfecho === "completed") {
          st.concluidos++; st.produzido += valorAtend; st.minutos += minutos; garantido[ci]! += valorAtend;
          // Tudo recebido, exceto alguns atendimentos dos últimos dias (a receber).
          if (!(d >= addDaysToKey(today, -7) && rnd() < 0.05)) await recordPayment(tx, actor, { appointmentId: appt.id, amountCents: valorAtend,
            method: pick(["pix", "credit_card", "debit_card", "cash"] as const, (m) => ({ pix: 55, credit_card: 28, debit_card: 12, cash: 5 })[m]), isDeposit: false });
        }
      }
    }
    await tx`update app.message_jobs set status = 'cancelled' where organization_id = ${org.organizationId}`;
  }, sql);

  // Ajustes de histórico em contexto de sistema (no papel de tenant o financeiro é imutável):
  // pagamento na data do atendimento, origem online e cadastro da cliente na primeira visita.
  await sql`update app.payments p set paid_at = a.ends_at, created_at = a.ends_at from app.appointments a
            where a.id = p.appointment_id and p.organization_id = ${org.organizationId}`;
  if (onlineIds.length) await sql`update app.appointments set source = 'online' where id = any(${onlineIds})`;
  await sql`update app.appointments a set created_at = least(a.created_at, a.starts_at - interval '3 days') where a.organization_id = ${org.organizationId}`;
  await sql`update app.clients c set created_at = coalesce((select min(starts_at) - interval '2 days' from app.appointments a where a.client_id = c.id), c.created_at)
            where c.organization_id = ${org.organizationId} and c.source <> 'import'`;
  await sql`update app.clients set created_at = ${new Date(inicio + "T12:00:00Z")} - interval '200 days' where organization_id = ${org.organizationId} and source = 'import'`;

  // Capacidade do mês: profissionais × dias de atendimento × minutos de expediente.
  const minutosDia = EXPEDIENTE.reduce((t, [a, b]) => t + toMin(b) - toMin(a), 0);
  const capacidade = (i: number) => {
    let diasPro = 0;
    for (let x = monthStart(inicio, i); x < monthStart(inicio, i + 1); x = addDaysToKey(x, 1)) diasPro += EQUIPE.filter((e) => e.dias.includes(localWeekday(x))).length;
    return diasPro * minutosDia;
  };
  linhas.push("\nSalão Lumi — resumo por mês (valores em R$):");
  for (const [i, nome] of NOMES_MES.entries()) {
    const s = stats[i]!;
    let dias = 0;
    for (let x = monthStart(inicio, i); x < monthStart(inicio, i + 1); x = addDaysToKey(x, 1)) if (DIAS_UTEIS.includes(localWeekday(x))) dias++;
    linhas.push(`  ${nome.padEnd(21)} atendimentos ${String(s.atend).padStart(3)} · faturamento ${(s.produzido / 100).toFixed(0).padStart(6)}`
      + ` (${dias} dias; num mês típico ${((s.produzido / dias) * DIAS_POR_MES / 100).toFixed(0)})`
      + ` · faltas ${((s.faltas / Math.max(1, s.concluidos + s.faltas)) * 100).toFixed(1)}% · online ${((s.online / Math.max(1, s.atend)) * 100).toFixed(0)}%`
      + ` · com adicional ${((s.adicionais / Math.max(1, s.atend)) * 100).toFixed(0)}%`
      + ` · ocupação ${((s.minutos / capacidade(i)) * 100).toFixed(0)}%`);
  }
  linhas.push("  (o 3º mês inclui a agenda até o fim do mês; os dias seguintes ficam só como agenda)");
  return { status: "criada", email: EMAIL, linhas };
}
