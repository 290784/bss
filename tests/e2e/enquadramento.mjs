import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");
const postgres = require("postgres");
/**
 * Enquadramento em celulares (iPhone SE ao Pro Max, Android): nada pode passar da borda da tela.
 * Simula o Safari do iPhone, que não esconde o excesso com overflow no html/body — ele reduz a
 * página inteira para caber e tudo fica descentralizado. Só vale recorte por contêiner próprio
 * (tabelas e listas com rolagem). Usa a conta de demonstração.
 * Uso: BASE_URL=http://localhost:3000 DATABASE_URL=... node tests/e2e/enquadramento.mjs
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
const [{ public_token: TOKEN } = {}] = await sql`select a.public_token from app.appointments a join app.organizations o on o.id = a.organization_id
  where o.is_demo and a.status in ('confirmed', 'pending') order by a.starts_at desc limit 1`;
await sql.end();
const b = await chromium.launch();
let fail = 0;
for (const dev of ["iPhone SE", "iPhone 15", "iPhone 15 Pro Max", "Pixel 7", "Galaxy S9+"]) {
  const o = { ...devices[dev] }; delete o.defaultBrowserType;
  const p = await (await b.newContext(o)).newPage();
  const bad = [];
  const scan = async (path) => {
    await p.goto(BASE + path); await p.waitForTimeout(400);
    const r = await p.evaluate(() => {
      const iw = innerWidth; const out = [];
      for (const el of document.querySelectorAll("body *")) {
        const rc = el.getBoundingClientRect(); if (!rc.width || (rc.right <= iw + 1 && rc.left >= -1)) continue;
        let a = el.parentElement, clipped = false;
        while (a && a !== document.body) { const s = getComputedStyle(a); if (s.overflowX !== "visible" || s.contain === "strict" || s.contain.includes("paint")) { clipped = true; break; } a = a.parentElement; }
        if (!clipped && getComputedStyle(el).position !== "fixed") out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 50)} [${Math.round(rc.left)},${Math.round(rc.right)}]`);
      }
      // O fundo decorativo é fixo e tem overflow hidden, mas o Safari ainda conta o que passa da borda.
      for (const el of document.querySelectorAll(".ambient > *")) {
        const rc = el.getBoundingClientRect();
        if (rc.width && (rc.right > iw + 1 || rc.left < -1)) out.push(`fundo: ${el.tagName.toLowerCase()}.${String(el.className.baseVal ?? el.className).slice(0, 30)} [${Math.round(rc.left)},${Math.round(rc.right)}]`);
      }
      return out.slice(0, 3);
    });
    if (r.length) bad.push(`${path}: ${r.join(" | ")}`);
  };
  for (const path of ["/", "/entrar", "/cadastro", "/b/studio-demonstracao", `/b/studio-demonstracao/agendamento/${TOKEN}`, "/privacidade"]) await scan(path);
  await p.goto(BASE + "/entrar");
  await p.getByLabel("E-mail").fill("demo@beautyos.dev"); await p.getByLabel("Senha").fill("demo-senha-123");
  await p.getByRole("button", { name: "Entrar" }).click(); await p.waitForURL(/\/app$/);
  for (const path of ["/app", "/app/agenda", "/app/agenda?visao=semana", "/app/agenda?visao=mes", "/app/clientes", "/app/servicos", "/app/equipe", "/app/configuracoes"]) await scan(path);
  const cid = await p.goto(BASE + "/app/clientes").then(() => p.locator('a[href^="/app/clientes/"]:not([href*="exportar"])').first().getAttribute("href"));
  if (cid) await scan(cid);
  fail += bad.length;
  console.log(bad.length ? "✘" : "✔", dev.padEnd(18), bad.length ? "\n  " + bad.join("\n  ") : "nada passa da borda da tela");
}
await b.close();
if (fail) process.exitCode = 1;
