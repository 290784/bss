import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
/**
 * Agenda: lista com resumo e horários livres, ações rápidas com "Desfazer", arrastar para remarcar
 * (com "Desfazer") e abertura em lista no celular.
 * Uso: BASE_URL=http://localhost:3000 node tests/e2e/agenda.mjs  (conta demo@beautyos.dev)
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const b = await chromium.launch();
const ok = (c, m) => { console.log(c ? "✔" : "✘", m); if (!c) process.exitCode = 1; };
const errs = [];

async function login(page) {
  await page.goto(BASE + "/entrar");
  await page.getByLabel("E-mail").fill("demo@beautyos.dev");
  await page.getByLabel("Senha").fill("demo-senha-123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/app/);
}
const amanha = () => {
  const d = new Date(Date.now() + 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
};

// Desktop
const p = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
p.on("pageerror", (e) => errs.push(e.message));
await login(p);
let dia = amanha();
// Procura um dia com atendimentos ativos nos próximos dias.
for (let i = 0; i < 6; i++) {
  await p.goto(`${BASE}/app/agenda?visao=lista&data=${dia}`); await p.waitForTimeout(600);
  if (await p.getByRole("button", { name: /^Confirmar$/ }).count() || await p.locator("ol[aria-label='Atendimentos do dia'] li").count() > 2) break;
  dia = new Date(Date.parse(dia + "T12:00:00Z") + 86_400_000).toISOString().slice(0, 10);
}
ok(await p.getByText("Previsto").count() > 0 && await p.getByText("Recebido").count() > 0, "lista: resumo do dia (previsto, recebido, a receber)");
ok(await p.getByText(/Livre/).count() > 0, "lista: horários livres aparecem entre os atendimentos");

const confirmar = p.getByRole("button", { name: /^Confirmar$/ }).first();
if (await confirmar.count()) {
  await confirmar.click(); await p.waitForTimeout(1500);
  const t = (await p.locator("[role=status]").allInnerTexts()).join(" ");
  ok(/confirmado/.test(t) && /Desfazer/.test(t), "lista: confirmar em um toque, com Desfazer no aviso");
  await p.getByRole("button", { name: "Desfazer" }).first().click(); await p.waitForTimeout(1500);
  ok(/Desfeito/.test((await p.locator("[role=status]").allInnerTexts()).join(" ")), "lista: Desfazer volta o status");
} else ok(true, "lista: (sem agendamento aguardando para confirmar neste dia)");

// Arrastar na visão de dia
await p.goto(`${BASE}/app/agenda?visao=dia&data=${dia}`); await p.waitForTimeout(800);
ok(await p.getByText(/Livre ·/).count() > 0, "dia: horários livres marcados na grade");
const bloco = p.locator("[data-appt] button[aria-label*='Confirmado'], [data-appt] button[aria-label*='Aguardando']").first();
const bb = await bloco.boundingBox();
await p.mouse.move(bb.x + 30, bb.y + 8); await p.mouse.down();
for (let i = 1; i <= 8; i++) { await p.mouse.move(bb.x + 30, bb.y + 8 + 9 * i); await p.waitForTimeout(16); }
const preview = await p.locator("text=/\\d{2}:\\d{2}–\\d{2}:\\d{2} ·/").count();
await p.mouse.up(); await p.waitForTimeout(2000);
ok(preview > 0, "dia: ao arrastar aparece a prévia do novo horário");
const t2 = (await p.locator("[role=status]").allInnerTexts()).join(" ");
ok(/remarcada para|Este horário|expediente|ocupado|não/.test(t2), `dia: soltar remarca ou explica por que não dá ("${t2.slice(0, 60)}")`);
if (/remarcada/.test(t2)) {
  await p.getByRole("button", { name: "Desfazer" }).first().click(); await p.waitForTimeout(1500);
  ok(/horário anterior/.test((await p.locator("[role=status]").allInnerTexts()).join(" ")), "dia: Desfazer devolve ao horário anterior");
}

// Celular abre em lista
const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
m.on("pageerror", (e) => errs.push(e.message));
await login(m);
await m.goto(BASE + "/app/agenda"); await m.waitForTimeout(1500);
ok(/visao=lista/.test(m.url()), "celular: a agenda abre em lista");
ok(await m.evaluate(() => document.documentElement.scrollWidth) <= 390, "celular: sem rolagem lateral");

ok(errs.length === 0, `sem erros de página${errs.length ? ": " + errs.join(" | ") : ""}`);
await b.close();
