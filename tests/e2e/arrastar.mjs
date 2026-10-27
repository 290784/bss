import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
/**
 * Hero: o card acompanha o dedo e troca ao soltar. Demonstração de agendamento: roda sozinha
 * como um vídeo em looping, rolar a página não trava, recomeça ao voltar para a tela e um
 * toque revê do início.
 * Uso: BASE_URL=http://localhost:3000 node tests/e2e/arrastar.mjs
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const b = await chromium.launch();
const ok = (c, m) => { console.log(c ? "✔" : "✘", m); if (!c) process.exitCode = 1; };
const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
const errs = []; m.on("pageerror", (e) => errs.push(e.message));
await m.goto(BASE + "/"); await m.waitForTimeout(800);
const cdp = await m.context().newCDPSession(m);
const touch = async (pts, wait = 16) => {
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: pts[0][0], y: pts[0][1] }] });
  for (const [x, y] of pts.slice(1)) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] }); await m.waitForTimeout(wait); }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
};

// Hero: card acompanha o dedo
const hero = m.locator('[aria-roledescription="carrossel"]');
const sel = () => m.locator('[role=group][aria-label^="Escolher recurso"] button[aria-pressed=true]').getAttribute("aria-label");
const labels = ["Lembretes", "Agendamento online", "Faturamento", "Clientes de volta", "Promoções"];
const stage = hero.locator("[aria-live=polite]").first();
const sb = await stage.boundingBox(); const sy = sb.y + sb.height / 2;
const before = labels.indexOf(await sel());
await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: sb.x + sb.width * 0.8, y: sy }] });
for (let i = 1; i <= 8; i++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: sb.x + sb.width * 0.8 - i * 15, y: sy }] }); await m.waitForTimeout(30); }
const moving = await stage.evaluate((el) => [...el.querySelectorAll("[style]")].some((n) => /translateX\(-/.test(n.style.transform)));
await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await m.waitForTimeout(500);
ok(moving, "hero: o card acompanha o dedo durante o arraste");
ok(labels.indexOf(await sel()) === (before + 1) % labels.length, "hero: soltar após arrastar para a esquerda avança um card");
const b2 = await sel();
await touch(Array.from({ length: 11 }, (_, i) => [sb.x + sb.width * 0.5 - i * 2.5, sy]), 40);
await m.waitForTimeout(450);
ok(await sel() === b2, "hero: arraste curto não troca de card");

// Demonstração: vídeo automático em looping
const demo = m.locator('[aria-label="Demonstração do agendamento online"]');
const cap = async () => (await demo.locator("p[aria-live]").innerText()).replace(/\n/g, " ");
const num = async () => Number((await cap()).split("/")[0]);
await demo.scrollIntoViewIfNeeded(); await m.waitForTimeout(500);
ok(await num() === 1, `demo: começa do início ao entrar na tela (${await cap()})`);
// Rolar a página com o dedo em cima do vídeo não pode travar o avanço.
const db = await demo.boundingBox();
await touch(Array.from({ length: 6 }, (_, i) => [db.x + db.width / 2, db.y + db.height / 2 - i * 8]));
await m.waitForTimeout(4200);
ok(await num() === 2, `demo: avança sozinho mesmo depois de rolar com o dedo em cima (${await cap()})`);
// Etapas 2–6 somam 23,8 s; espera a volta ao começo (com folga).
const tLoop = Date.now(); let saw6 = false;
while (Date.now() - tLoop < 26000) { const k = await num(); if (k === 6) saw6 = true; if (saw6 && k === 1) break; await m.waitForTimeout(200); }
ok(saw6 && await num() === 1, `demo: depois da última etapa volta ao começo (looping) (${await cap()})`);
await m.waitForTimeout(3200 + 900);
const typed = await demo.locator("span.truncate").first().innerText();
ok(typed.length > 0 && typed.length < "Sobrancelha".length, `demo: na segunda volta a digitação recomeça letra a letra ("${typed}")`);
// Toque revê do início
await demo.locator("[role=button]").tap(); await m.waitForTimeout(300);
ok(await num() === 1, "demo: tocar no vídeo revê do início");
await m.waitForTimeout(3600);
ok(await num() === 2, "demo: depois do toque continua sozinho (não trava)");
// Sair da tela e voltar: recomeça
await m.evaluate(() => scrollTo(0, 0)); await m.waitForTimeout(600);
await demo.scrollIntoViewIfNeeded(); await m.waitForTimeout(400);
ok(await num() === 1, "demo: ao voltar para a tela, recomeça do início");

ok(await m.getByRole("button", { name: /Pausar animação|Retomar animação/ }).count() === 0, "sem botão de pausa nem barra de etapas");
ok(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "sem rolagem horizontal no celular");
ok(errs.length === 0, `sem erros no console${errs.length ? ": " + errs.join(" | ") : ""}`);
await b.close();
