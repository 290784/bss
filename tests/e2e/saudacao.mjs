import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
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

  // Depois de 20 segundos o título volta para "Oii, nome" (relógio simulado: não espera de verdade).
  // O tempo vem direto do código, para o teste acompanhar se ele mudar.
  const VISIVEL = Number(/GREETING_VISIBLE_MS = ([\d_]+)/.exec(readFileSync("src/app/app/greeting-title.tsx", "utf8"))[1].replaceAll("_", ""));
  ok(VISIVEL === 20_000, "a saudação fica 20 segundos");
  const [{ full_name: nome }] = await sql`select full_name from app.users where id = ${u.uid}`;
  const primeiro = nome.split(" ")[0];
  const ctxRelogio = await b.newContext({ viewport: { width: 1366, height: 900 } });
  const rel = await ctxRelogio.newPage(); rel.on("pageerror", (e) => errs.push(e.message));
  await rel.clock.install();
  await rel.goto(BASE + "/entrar");
  await rel.getByLabel("E-mail").fill(EMAIL); await rel.getByLabel("Senha").fill(SENHA);
  await rel.getByRole("button", { name: "Entrar" }).click(); await rel.waitForURL(/\/app/);
  const frase = await titulo(rel);
  ok(FRASES.includes(frase), "ao abrir o painel, aparece a saudação do dia");
  await rel.clock.runFor(VISIVEL - 10_000);
  ok((await titulo(rel)) === frase, "com 10 segundos ainda é a saudação");
  // Aos 20 s começa a apagar, letra por letra (efeito de máquina de escrever): no meio, sobra só o começo da frase.
  await rel.clock.runFor(10_000 + 450);
  const parcial = await titulo(rel);
  ok(parcial.length < frase.length && frase.startsWith(parcial), `as letras vão sendo apagadas (“${parcial}”)`);
  ok(await rel.locator("h1 .tw-caret").count() === 1, "aparece o cursor piscando durante a troca");
  // Acompanha o resto da troca de 40 em 40 ms (relógio simulado) e confere a sequência inteira.
  const final = `Oii, ${primeiro}`;
  const vistos = [parcial];
  for (let t = 0; t < 7_000; t += 40) { await rel.clock.runFor(40); vistos.push(await titulo(rel)); }
  const primeiraDigitada = vistos.findIndex((x) => x.length > 0 && final.startsWith(x));
  const apagando = vistos.slice(0, primeiraDigitada), digitando = vistos.slice(primeiraDigitada);
  ok(apagando.every((x) => frase.startsWith(x)) && apagando.every((x, i) => i === 0 || x.length <= apagando[i - 1].length), "apaga da direita para a esquerda, só diminuindo");
  ok(apagando.includes(""), "a saudação some por completo antes de começar o nome");
  ok(digitando.every((x, i) => final.startsWith(x) && (i === 0 || x.length >= digitando[i - 1].length)), "depois o nome é digitado letra por letra, só crescendo");
  ok(digitando.some((x) => x.length > 0 && x.length < final.length), "dá para ver o nome ainda pela metade (não aparece de uma vez)");
  ok(vistos.at(-1) === final, `no fim volta para “${final}”`);
  ok(await rel.locator("h1 .tw-caret").count() === 0, "o cursor some depois de digitar");
  const tamanho = (pg) => pg.getByRole("heading", { level: 1 }).first().evaluate((e) => parseFloat(getComputedStyle(e.firstElementChild ?? e).fontSize));
  const depois = await tamanho(rel);
  await rel.goto(BASE + "/app/servicos");
  ok(depois === (await tamanho(rel)), "o “Oii, nome” tem o mesmo tamanho dos títulos das outras páginas");

  // Com "reduzir movimento" ligado, volta para “Oii, nome” de uma vez, sem animação.
  const calmo = await b.newContext({ viewport: { width: 1366, height: 900 }, reducedMotion: "reduce" });
  const c = await calmo.newPage(); c.on("pageerror", (e) => errs.push(e.message));
  await c.clock.install();
  await c.goto(BASE + "/entrar");
  await c.getByLabel("E-mail").fill(EMAIL); await c.getByLabel("Senha").fill(SENHA);
  await c.getByRole("button", { name: "Entrar" }).click(); await c.waitForURL(/\/app/);
  ok(FRASES.includes(await titulo(c)), "com reduzir movimento: começa com a saudação");
  await c.clock.runFor(VISIVEL + 100);
  ok((await titulo(c)) === `Oii, ${primeiro}` && await c.locator("h1 .tw-caret").count() === 0, "com reduzir movimento: troca direta, sem animação");

  ok(errs.length === 0, "sem erros de página" + (errs.length ? ": " + errs.join(" | ") : ""));
} finally {
  await b.close(); await sql.end();
}
