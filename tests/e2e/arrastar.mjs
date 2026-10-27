import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
/**
 * Arrastar com o dedo e o mouse: barra de etapas (scrub) e card que acompanha o gesto,
 * no hero e na demonstração de agendamento.
 * Uso: BASE_URL=http://localhost:3000 node tests/e2e/arrastar.mjs
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const b = await chromium.launch();
const ok = (c, m) => { console.log(c ? "✔" : "✘", m); if (!c) process.exitCode = 1; };
const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
const errs = []; m.on("pageerror", (e) => errs.push(e.message));
await m.goto(BASE + "/"); await m.waitForTimeout(800);
const cdp = await m.context().newCDPSession(m);
const touch = async (pts) => {
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: pts[0][0], y: pts[0][1] }] });
  for (const [x, y] of pts.slice(1)) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] }); await m.waitForTimeout(16); }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
};
const line = (x0, x1, y, n = 14) => Array.from({ length: n + 1 }, (_, i) => [x0 + ((x1 - x0) * i) / n, y]);

for (const [name, region] of [["hero", '[aria-roledescription="carrossel"]'], ["demo", '[aria-label="Demonstração do agendamento online"]']]) {
  const r = m.locator(region);
  await r.getByRole("button", { name: "Pausar animação" }).tap();
  const bars = r.locator('[role=tablist]');
  await bars.scrollIntoViewIfNeeded(); await m.waitForTimeout(300);
  const tabs = r.locator("[role=tab]"); const count = await tabs.count();
  const selected = async () => { for (let i = 0; i < count; i++) if ((await tabs.nth(i).getAttribute("aria-selected")) === "true") return i; return -1; };
  const bb = await bars.boundingBox(); const by = bb.y + bb.height / 2;

  // Arrasta o dedo da 1ª até a última etapa pela barra.
  await touch(line(bb.x + 4, bb.x + bb.width - 4, by));
  await m.waitForTimeout(200);
  ok(await selected() === count - 1, `${name}: arrastar a barra até o fim leva à última etapa`);
  // Volta até o meio — a etapa acompanha.
  await touch(line(bb.x + bb.width - 4, bb.x + bb.width * 0.5, by));
  await m.waitForTimeout(200);
  ok(await selected() === Math.floor(count * 0.5), `${name}: arrastar de volta para o meio acompanha (${await selected()})`);

  // Mouse: arrastar a barra também funciona.
  await m.mouse.move(bb.x + 4, by); await m.mouse.down();
  await m.mouse.move(bb.x + bb.width * 0.3, by, { steps: 6 });
  const mid = await m.locator('[role=tablist] span.btn-glow').count();
  await m.mouse.move(bb.x + 2, by, { steps: 6 }); await m.mouse.up();
  ok(await selected() === 0 && mid > 0, `${name}: mouse arrasta a barra (marcador visível durante o arraste)`);

  // Card acompanha o dedo e troca ao soltar.
  const stage = name === "hero" ? r.locator("[aria-live=polite]").first() : r.locator("[role=img]");
  const sb = await stage.boundingBox(); const sy = sb.y + sb.height / 2;
  const before = await selected();
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: sb.x + sb.width * 0.8, y: sy }] });
  for (let i = 1; i <= 8; i++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: sb.x + sb.width * 0.8 - i * 15, y: sy }] }); await m.waitForTimeout(30); }
  const moving = await stage.evaluate((el) => [...el.querySelectorAll("[style]")].some((n) => /translateX\(-/.test(n.style.transform)));
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await m.waitForTimeout(500);
  ok(moving, `${name}: o card acompanha o dedo durante o arraste`);
  ok(await selected() === (before + 1) % count, `${name}: soltar após arrastar para a esquerda avança uma etapa`);

  // Arraste curto e lento: volta ao lugar sem trocar.
  const b2 = await selected();
  await touch(line(sb.x + sb.width * 0.5, sb.x + sb.width * 0.5 - 25, sy, 10));
  await m.waitForTimeout(450);
  ok(await selected() === b2, `${name}: arraste curto não troca de etapa`);
}

// Rolagem vertical sobre a barra continua rolando a página.
const y0 = await m.evaluate(() => scrollY);
const bars = await m.locator('[aria-roledescription="carrossel"] [role=tablist]').boundingBox();
await touch(Array.from({ length: 10 }, (_, i) => [bars.x + 40, bars.y + bars.height / 2 + 120 - i * 20]));
await m.waitForTimeout(400);
ok(await m.evaluate(() => scrollY) !== y0, "rolar para cima/baixo sobre a barra continua rolando a página");
ok(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "sem rolagem horizontal no celular");
ok(errs.length === 0, `sem erros no console${errs.length ? ": " + errs.join(" | ") : ""}`);
await b.close();
