import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
/**
 * Tema: claro é o padrão do app (uso no salão, de dia); o escuro é opção pelo botão de sol/lua,
 * fica salvo no aparelho e é aplicado sem "piscar" ao recarregar. A landing tem o visual próprio.
 * Uso: BASE_URL=http://localhost:3000 node tests/e2e/tema.mjs
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const b = await chromium.launch();
const ok = (c, m) => { console.log(c ? "✔" : "✘", m); if (!c) process.exitCode = 1; };
const lum = (rgb) => { const [r, g, bl] = rgb.match(/\d+/g).map(Number); return (0.2126 * r + 0.7152 * g + 0.0722 * bl) / 255; };
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
const bodyBg = () => p.evaluate(() => getComputedStyle(document.body).backgroundColor);

await p.goto(BASE + "/entrar");
ok(lum(await bodyBg()) > 0.9, "padrão é o tema claro");
ok(lum(await p.getByLabel("E-mail").evaluate((e) => getComputedStyle(e).backgroundColor)) > 0.9, "campos claros");
ok(lum(await p.getByRole("heading").first().evaluate((e) => getComputedStyle(e).color)) < 0.2, "texto escuro sobre fundo claro");
await p.getByRole("button", { name: "Usar tema escuro" }).tap();
await p.waitForTimeout(300);
ok(lum(await bodyBg()) < 0.1, "botão liga o tema escuro");

// Recarregar mantém o escuro já no primeiro quadro (script no <head>)
await p.reload({ waitUntil: "commit" });
await p.waitForSelector("body");
ok(await p.evaluate(() => document.documentElement.dataset.theme) === undefined && await p.evaluate(() => localStorage.getItem("ge-tema")) === "dark", "preferência salva e aplicada antes da pintura");
await p.getByRole("button", { name: "Usar tema claro" }).tap();
await p.waitForTimeout(300);

// Página pública: cabeçalho com degradê continua com texto claro
await p.goto(BASE + "/b/studio-demonstracao");
const h1 = p.getByRole("heading", { level: 1 });
ok(lum(await h1.evaluate((e) => getComputedStyle(e).color)) > 0.8, "cabeçalho da página pública segue legível (texto claro no degradê)");
ok(lum(await p.locator("main").evaluate((e) => getComputedStyle(e.querySelector("div")).backgroundColor)) > 0.9, "cards da página pública claros");
ok(await p.getByRole("button", { name: "Usar tema escuro" }).count() === 1, "página pública tem o botão de tema");

// Landing creme (independe do tema do app), com os blocos violeta escuros
await p.goto(BASE + "/");
ok(lum(await p.locator("[data-landing]").evaluate((e) => getComputedStyle(e).backgroundColor)) > 0.85, "landing creme");
ok(lum(await p.getByRole("heading", { level: 1 }).evaluate((e) => getComputedStyle(e).color)) < 0.2, "título escuro sobre o creme");

// Volta para o claro e salva
await p.goto(BASE + "/entrar");
ok(lum(await bodyBg()) > 0.9 && await p.evaluate(() => localStorage.getItem("ge-tema")) === "light", "voltou para o claro e salvou");
ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "sem rolagem horizontal");
ok(errs.length === 0, `sem erros no console${errs.length ? ": " + errs.join(" | ") : ""}`);
await b.close();
