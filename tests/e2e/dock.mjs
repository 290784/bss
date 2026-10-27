import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
/**
 * Dock de ícones do hero: arrastar como roleta (dedo e mouse), encaixe, impulso, toque e rolagem vertical.
 * Uso: BASE_URL=http://localhost:3000 node tests/e2e/dock.mjs
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const b = await chromium.launch();
const ok = (c, m) => { console.log(c ? "✔" : "✘", m); if (!c) process.exitCode = 1; };
const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" })).newPage();
const errs = []; m.on("pageerror", (e) => errs.push(e.message));
await m.goto(BASE + "/"); await m.waitForTimeout(800);
const sel = () => m.locator('[role=group][aria-label^="Escolher recurso"] button[aria-pressed=true]').getAttribute("aria-label");
const dock = m.locator('[role=group][aria-label^="Escolher recurso"]');
await dock.scrollIntoViewIfNeeded(); await m.waitForTimeout(300);
const box = await dock.boundingBox(); const y = box.y + box.height / 2; const cx = box.x + box.width / 2;
const cdp = await m.context().newCDPSession(m);
const touch = async (type, x, yy = y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y: yy }] });
async function drag(fromX, toX, steps, pause = 16) {
  await touch("touchStart", fromX);
  for (let i = 1; i <= steps; i++) { await touch("touchMove", fromX + ((toX - fromX) * i) / steps); await m.waitForTimeout(pause); }
}
ok(await sel() === "Lembretes", "começa em Lembretes");

// 1) arrasto lento de ~2 ícones para a esquerda: acompanha o dedo e encaixa
await drag(cx + 80, cx - 60, 20, 30);
const mid = await m.locator('[role=group][aria-label^="Escolher recurso"] button').first().evaluate((el) => el.style.transform);
await m.waitForTimeout(150); await touch("touchEnd");
await m.waitForTimeout(900);
const px = Number((mid.match(/calc\(-50% ([+-]) ([\d.]+)px\)/) ?? [])[2] ?? 0) * ((mid.match(/calc\(-50% ([+-])/) ?? [])[1] === "-" ? -1 : 1);
ok(px < -60, `ícones acompanham o dedo durante o arraste (Lembretes deslocado ${px}px)`);
ok(await sel() === "Faturamento", `arrastar 2 ícones para a esquerda encaixa em Faturamento (${await sel()})`);
const caption = await m.locator('[aria-roledescription="carrossel"] p span').first().innerText();
ok(caption === "Faturamento", "o card e a legenda acompanham a escolha");

// 2) arrasto curto (menos de meio ícone): volta para o mesmo
await drag(cx, cx - 25, 8, 30); await m.waitForTimeout(150); await touch("touchEnd"); await m.waitForTimeout(800);
ok(await sel() === "Faturamento", "arrasto curto não troca (encaixa de volta)");

// 3) peteleco rápido para a direita: anda mais de um
await drag(cx - 40, cx + 60, 4, 8); await touch("touchEnd"); await m.waitForTimeout(900);
const after = await sel();
ok(after === "Agendamento online" || after === "Lembretes", `peteleco curto e rápido para a direita volta 1–2 ícones (${after})`);

// 4) toque simples ainda seleciona
const target = m.locator('[role=group][aria-label^="Escolher recurso"] button[aria-label="Clientes de volta"]');
await target.tap(); await m.waitForTimeout(800);
ok(await sel() === "Clientes de volta", "toque em um ícone ainda seleciona");

// 5) arrasto vertical sobre o dock rola a página e não troca
const before = await sel(); await m.evaluate(() => scrollTo(0, scrollY + 0)); const sy0 = await m.evaluate(() => scrollY);
await touch("touchStart", cx, y); for (let i = 1; i <= 10; i++) { await touch("touchMove", cx + 2, y - i * 25); await m.waitForTimeout(16); } await touch("touchEnd");
await m.waitForTimeout(700);
ok(await sel() === before, "arrasto vertical não mexe no dock");
ok((await m.evaluate(() => scrollY)) > sy0, "arrasto vertical rola a página normalmente");

// 6) mouse no computador também arrasta
const d = await (await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" })).newPage();
await d.goto(BASE + "/"); await d.waitForTimeout(800);
const db = await d.locator('[role=group][aria-label^="Escolher recurso"]').boundingBox();
await d.mouse.move(db.x + db.width / 2, db.y + db.height / 2); await d.mouse.down();
await d.mouse.move(db.x + db.width / 2 - 75, db.y + db.height / 2, { steps: 15 }); await d.mouse.up(); await d.waitForTimeout(900);
ok(await d.locator('[role=group][aria-label^="Escolher recurso"] button[aria-pressed=true]').getAttribute("aria-label") === "Agendamento online", "no computador, arrastar com o mouse também funciona");
console.log("sw", await m.evaluate(() => document.documentElement.scrollWidth), "erros:", errs.length ? errs : "nenhum");
await b.close();
