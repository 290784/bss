import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const postgres = require("postgres");
/**
 * Saudação do painel: uma por usuária por dia, igual ao atualizar, ao sair e entrar de novo e em outro
 * aparelho; muda no dia seguinte (sem repetir a anterior); texto exatamente como combinado.
 * Usa a conta vitrine (npm run db:seed-vitrine).
 * Uso: BASE_URL=http://localhost:3000 DATABASE_URL=... node tests/e2e/saudacao.mjs
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const EMAIL = "vitrine@beautyos.dev", SENHA = process.env.VITRINE_PASSWORD ?? "vitrine-senha-123";
const FRASES = [
  "Bom dia, visionária! ✨", "Bom dia, patroa! Hoje é dia de fazer acontecer!", "E aí, empreendedora! Pronta pra mais um dia de conquistas?",
  "Bom dia, CEO da beleza! 💅", "Fala, poderosa! Seu negócio não para!", "Bom dia, chefinha! Bora transformar trabalho em resultado?",
  "Bom diaa! Mais um dia pra crescer!", "Bom dia, dona do seu sucesso!",
];
const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
const b = await chromium.launch();
const ok = (c, m) => { console.log(c ? "✔" : "✘", m); if (!c) process.exitCode = 1; };
const errs = [];

async function entrar(ctx) {
  const p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(BASE + "/entrar");
  await p.getByLabel("E-mail").fill(EMAIL); await p.getByLabel("Senha").fill(SENHA);
  await p.getByRole("button", { name: "Entrar" }).click(); await p.waitForURL(/\/app/);
  return p;
}
const titulo = async (p) => (await p.getByRole("heading", { level: 1 }).first().innerText()).trim();

const [u] = await sql`select u.id as uid, m.organization_id as oid from app.users u join app.memberships m on m.user_id = u.id where u.email = ${EMAIL} and m.status = 'active' limit 1`;
await sql`delete from app.user_greetings where user_id = ${u.uid} and organization_id = ${u.oid}`;

try {
  const desktop = await b.newContext({ viewport: { width: 1366, height: 900 } });
  const p = await entrar(desktop);
  const hoje = await titulo(p);
  ok(FRASES.includes(hoje), `o título do painel é uma das oito frases (“${hoje}”)`);
  const [row] = await sql`select count(*)::int as n from app.user_greetings where user_id = ${u.uid} and organization_id = ${u.oid}`;
  ok(row.n === 1, "fica gravada uma saudação para a usuária");

  let igual = true;
  for (let i = 0; i < 3; i++) { await p.reload(); igual &&= (await titulo(p)) === hoje; }
  ok(igual, "atualizar a página não muda a saudação");

  await p.goto(BASE + "/app/agenda"); await p.goto(BASE + "/app");
  ok((await titulo(p)) === hoje, "sair do painel e voltar mantém a saudação");

  await p.context().clearCookies();
  const p2 = await entrar(desktop);
  ok((await titulo(p2)) === hoje, "sair e entrar de novo no mesmo dia mantém a saudação");

  const celular = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const m = await entrar(celular);
  ok((await titulo(m)) === hoje, "em outro aparelho, a mesma saudação");
  const box = await m.getByRole("heading", { level: 1 }).first().boundingBox();
  ok(box && box.x >= 0 && box.x + box.width <= 390, "no celular o título cabe na tela");
  ok(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "sem rolagem lateral no celular");
  await m.screenshot({ path: process.env.SHOT ?? "/tmp/saudacao-cel.png", clip: { x: 0, y: 0, width: 390, height: 360 } });

  // "Amanhã": recua a saudação de hoje para ontem. O painel sorteia outra, diferente da de ontem.
  await sql`update app.user_greetings set local_date = local_date - 1 where user_id = ${u.uid} and organization_id = ${u.oid}`;
  await p2.reload();
  const amanha = await titulo(p2);
  ok(FRASES.includes(amanha) && amanha !== hoje, `no dia seguinte vem outra frase (“${amanha}”)`);
  await p2.reload();
  ok((await titulo(p2)) === amanha, "e ela também fica a mesma o dia todo");

  ok(errs.length === 0, "sem erros de página" + (errs.length ? ": " + errs.join(" | ") : ""));
} finally {
  await b.close(); await sql.end();
}
