import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
/**
 * Interações e ritmo das animações da landing (carrossel do hero e demonstração de agendamento).
 * Uso: BASE_URL=http://localhost:3000 node tests/e2e/interactions.mjs
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const b = await chromium.launch();
const ok = (c, m) => { console.log(c ? "✔" : "✘", m); if (!c) process.exitCode = 1; };
const sel = (p) => p.locator('[aria-roledescription="carrossel"] [role=tab][aria-selected=true]').getAttribute("aria-label");

// Desktop
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.goto(BASE + "/"); await p.mouse.move(5, 5);
await p.waitForTimeout(3500); ok(await sel(p) === "Lembretes", "hero: card ainda visível aos 3,5 s (tempo de leitura)");
await p.waitForTimeout(2300); ok(await sel(p) === "Agendamento online", "hero: avança sozinho por volta de 5,2 s");
await p.locator('[aria-roledescription="carrossel"] [aria-live]').first().click();
ok(await sel(p) === "Faturamento", "hero: clique no card avança");
await p.mouse.move(5, 5); await p.waitForTimeout(7000);
ok(await sel(p) === "Faturamento", "hero: depois de clicar, segura 12 s para a pessoa ler");
await p.locator('[aria-roledescription="carrossel"] [role=tab]').nth(4).click();
ok(await sel(p) === "Promoções", "hero: barra de progresso leva ao card escolhido");
await p.getByRole("button", { name: "Pausar animação" }).first().click();
await p.mouse.move(5, 5); await p.waitForTimeout(18000);
ok(await sel(p) === "Promoções", "hero: botão de pausa mantém o card parado");
await p.getByRole("button", { name: "Retomar animação" }).first().click();
await p.locator('[aria-roledescription="carrossel"]').focus(); await p.keyboard.press("ArrowRight");
ok(await sel(p) === "Lembretes", "hero: seta do teclado troca o card");

// Hover nos cards (sobe/brilha)
const card = p.locator("#recursos .glass").first();
await card.scrollIntoViewIfNeeded(); await card.hover(); await p.waitForTimeout(400);
const glow = await card.evaluate((el) => getComputedStyle(el).boxShadow);
ok(glow.includes("rgb"), "card de recurso brilha ao passar o mouse");

// Demo de agendamento: legendas com tempo
const demo = p.locator('[aria-label="Demonstração do agendamento online"]');
await demo.scrollIntoViewIfNeeded(); await p.mouse.move(5, 5);
const cap = () => demo.locator("p[aria-live]").innerText();
await p.waitForTimeout(1200); const c1 = await cap();
await p.waitForTimeout(1800); const c2 = await cap();
ok(c1.includes("abre o seu link") && c2.includes("Busca o serviço"), `demo: legendas no ritmo (${c1.replace(/\n/g," ")} → ${c2.replace(/\n/g," ")})`);
const typedMid = await demo.locator("span.truncate").first().innerText().catch(() => "");
ok(typedMid.length > 0 && typedMid.length < "Sobrancelha".length, `demo: digitação letra a letra visível ("${typedMid}")`);

// Celular: arrastar o dedo e não travar depois do toque
const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
await m.goto(BASE + "/"); await m.waitForTimeout(800);
const stage = m.locator('[aria-roledescription="carrossel"] [aria-live]').first();
const box = await stage.boundingBox();
const cdp = await m.context().newCDPSession(m);
const y = box.y + box.height / 2;
await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x + box.width * 0.8, y }] });
for (let i = 1; i <= 6; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: box.x + box.width * (0.8 - i * 0.1), y }] });
await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await m.waitForTimeout(300);
ok(await sel(m) === "Agendamento online", "celular: arrastar o dedo para a esquerda avança");
await m.waitForTimeout(12000 + 5200 + 1200);
ok(await sel(m) === "Faturamento", "celular: depois do toque, volta a avançar sozinho (não trava)");
console.log("erros de página:", errs.length ? errs : "nenhum");
await b.close();
