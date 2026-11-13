// Captura as telas REAIS do produto (conta de demonstração, dados fictícios) para o material de vendas.
// Uso: VITRINE_PASSWORD=... BASE_URL=http://localhost:3100 node materiais-comerciais/vendas/capturar.mjs
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SENHA = process.env.VITRINE_PASSWORD;
if (!SENHA) { console.error("Defina VITRINE_PASSWORD."); process.exit(1); }
const OUT = join(dirname(fileURLToPath(import.meta.url)), "presentation", "screenshots");
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
await ctx.addInitScript(() => { const s = document.createElement("style"); s.textContent = "nextjs-portal,[data-nextjs-toast]{display:none!important}"; addEventListener("DOMContentLoaded", () => document.head.appendChild(s)); });
const p = await ctx.newPage();
await p.goto(BASE + "/entrar"); await p.getByLabel("E-mail").fill("vitrine@beautyos.dev"); await p.getByLabel("Senha").fill(SENHA); await p.getByRole("button", { name: "Entrar" }).click(); await p.waitForURL(/\/app/, { timeout: 90000 });
const fechaAbertura = async () => { const x = p.getByRole("button", { name: "Agora não" }); if (await x.count()) await x.click().catch(() => {}); };
const SO = process.env.SO ? process.env.SO.split(",") : null;
const tela = async (nome, url, depois) => {
  if (SO && !SO.includes(nome)) return;
  try { await p.goto(BASE + url); await p.waitForSelector("h1", { timeout: 60000 }); await pausa(2500); await fechaAbertura(); if (depois) await depois(); await pausa(800); await p.screenshot({ path: join(OUT, nome + ".png") }); console.log("ok", nome); }
  catch (e) { console.log("FALHOU", nome, e.message.split("\n")[0]); }
};
await tela("inicio", "/app");
await tela("agenda-dia", "/app/agenda");
await tela("agenda-atendimento", "/app/agenda", async () => { const bloco = p.getByText("Valéria Moreira").first(); await bloco.waitFor({ timeout: 10000 }); await bloco.click(); await p.waitForSelector("dialog[open]", { timeout: 8000 }); });
await tela("clientes", "/app/clientes");
await tela("clientes-importar", "/app/clientes", async () => { await p.getByRole("button", { name: "Importar planilha" }).click(); await p.waitForSelector("text=Escolher arquivo CSV", { timeout: 8000 }); });
await tela("relatorios", "/app/relatorios");
await tela("dicas", "/app/dicas");
await tela("equipe", "/app/equipe");
await tela("servicos", "/app/servicos");
await tela("whatsapp-automacoes", "/app/configuracoes?aba=whatsapp");
await tela("planos-no-app", "/app/configuracoes?aba=plano");
// Página pública (a cliente marcando), em tela de celular
const m = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "pt-BR" });
const q = await m.newPage(); await q.goto(BASE + "/b/salao-lumi"); await q.waitForSelector("h1", { timeout: 60000 }); await pausa(2000); await q.screenshot({ path: join(OUT, "cliente-pagina-publica.png") }); console.log("ok cliente-pagina-publica");
const servico = q.locator("button").filter({ hasText: /Agendar/ }).first(); if (await servico.count()) { await servico.click(); await pausa(1500); await q.screenshot({ path: join(OUT, "cliente-escolhe-horario.png") }); console.log("ok cliente-escolhe-horario"); }
// Landing (hero) em desktop
await p.goto(BASE + "/"); await pausa(2500); await p.screenshot({ path: join(OUT, "landing.png") }); console.log("ok landing");
await b.close();
