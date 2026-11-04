import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
/**
 * Visual: o app é só claro (uso no salão, de dia). Não existe botão de tema escuro, e uma preferência "escuro" antiga
 * guardada no aparelho é ignorada. Os blocos de ameixa (cabeçalho da página pública, botões) continuam com texto claro.
 * Uso: BASE_URL=http://localhost:3000 node tests/e2e/tema.mjs
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const b = await chromium.launch();
const ok = (c, m) => { console.log(c ? "✔" : "✘", m); if (!c) process.exitCode = 1; };
const lum = (rgb) => { const [r, g, bl] = rgb.match(/\d+/g).map(Number); return (0.2126 * r + 0.7152 * g + 0.0722 * bl) / 255; };
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
// Quem tinha escolhido o tema escuro antes: a escolha antiga não pode mais valer.
await ctx.addInitScript(() => { try { localStorage.setItem("ge-tema", "dark"); } catch { /* sem armazenamento */ } });
const p = await ctx.newPage();
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
const bodyBg = () => p.evaluate(() => getComputedStyle(document.body).backgroundColor);

await p.goto(BASE + "/entrar");
ok(await p.evaluate(() => document.documentElement.dataset.theme) === "light", "a página nasce no tema claro");
ok(lum(await bodyBg()) > 0.9, "fundo claro, mesmo com a preferência antiga “escuro” guardada");
ok(lum(await p.getByLabel("E-mail").evaluate((e) => getComputedStyle(e).backgroundColor)) > 0.9, "campos claros");
ok(lum(await p.getByRole("heading").first().evaluate((e) => getComputedStyle(e).color)) < 0.2, "texto escuro sobre fundo claro");
ok(await p.getByRole("button", { name: /tema (claro|escuro)/i }).count() === 0, "não há botão para trocar de tema");
ok(await p.evaluate(() => getComputedStyle(document.documentElement).colorScheme) === "light", "campos nativos (data, hora) também em claro");
ok(await p.evaluate(() => document.querySelector('meta[name="theme-color"]')?.getAttribute("content")) === "#f6f3ee", "a barra do navegador acompanha o creme");

// Página pública: cabeçalho de ameixa continua com texto claro
await p.goto(BASE + "/b/studio-demonstracao");
const h1 = p.getByRole("heading", { level: 1 });
ok(lum(await h1.evaluate((e) => getComputedStyle(e).color)) > 0.8, "cabeçalho da página pública segue legível (texto claro sobre a ameixa)");
ok(lum(await p.locator("main").evaluate((e) => getComputedStyle(e.querySelector("div")).backgroundColor)) > 0.9, "cards da página pública claros");
ok(await p.getByRole("button", { name: /tema (claro|escuro)/i }).count() === 0, "página pública também sem botão de tema");

// Landing creme
await p.goto(BASE + "/");
ok(lum(await p.locator("[data-landing]").evaluate((e) => getComputedStyle(e).backgroundColor)) > 0.85, "landing creme");
ok(lum(await p.getByRole("heading", { level: 1 }).evaluate((e) => getComputedStyle(e).color)) < 0.2, "título escuro sobre o creme");

// Dentro do app: sem botão de tema e botões de ameixa com texto claro
await p.goto(BASE + "/entrar");
await p.getByLabel("E-mail").fill("vitrine@beautyos.dev"); await p.getByLabel("Senha").fill(process.env.VITRINE_PASSWORD ?? "vitrine-senha-123");
await p.getByRole("button", { name: "Entrar" }).tap(); await p.waitForURL(/\/app/);
await p.waitForSelector("h1");
ok(await p.getByRole("button", { name: /tema (claro|escuro)/i }).count() === 0, "dentro do app também não há botão de tema");
ok(lum(await bodyBg()) > 0.9, "painel em tema claro");
const agendar = p.getByRole("link", { name: /Agendar/ }).first();
ok(lum(await agendar.evaluate((e) => getComputedStyle(e).color)) > 0.8 && lum(await agendar.evaluate((e) => getComputedStyle(e).backgroundColor)) < 0.3, "botão principal: texto claro sobre ameixa");

ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "sem rolagem horizontal");
ok(errs.length === 0, `sem erros no console${errs.length ? ": " + errs.join(" | ") : ""}`);
await b.close();
