import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");
/**
 * Fluxo completo no celular: links → agendar (acordeão, WhatsApp, Aberto/Fechado) → manual/guia
 * (seções, baixar PDF real, compartilhar), tema claro, enquadramento e SEO por rota.
 * Uso: npm run build && npm run preview & BASE_URL=http://localhost:4173 node tests/e2e.mjs
 */
const BASE = process.env.BASE_URL ?? "http://localhost:4173";
const b = await chromium.launch();
const ok = (c, m) => { console.log(c ? "✔" : "✘", m); if (!c) process.exitCode = 1; };
const o = { ...devices["iPhone 15"] }; delete o.defaultBrowserType;
const ctx = await b.newContext({ ...o, acceptDownloads: true, permissions: ["clipboard-read", "clipboard-write"] });
await ctx.route("https://wa.me/**", (r) => r.fulfill({ contentType: "text/html", body: "WhatsApp" }));
const p = await ctx.newPage();
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
const semLateral = () => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

// Links
await p.goto(BASE + "/");
ok(await p.getByRole("heading", { level: 1, name: "Studio Manoella Lopes" }).count() === 1, "links: nome do studio");
const nav = p.getByRole("navigation", { name: "Links principais" });
const textos = await nav.getByRole("link").allInnerTexts();
ok(textos.length === 3 && /Manual de Agendamento/.test(textos[0]) && /Agende aqui!/.test(textos[1]) && /Guia de Cuidados/.test(textos[2]), "links: 3 cartões na ordem");
ok(await nav.getByText("PDF · 7 páginas").count() === 1 && await nav.getByText("PDF · 4 páginas").count() === 1, "links: PDFs com número de páginas");
ok(await semLateral(), "links: sem rolagem lateral");

// Agendar
await nav.getByRole("link", { name: /Agende aqui!/ }).tap();
await p.waitForURL(/\/agendar$/);
ok(await p.getByRole("region", { name: /Aplicação|Manutenção/ }).count() === 0, "agendar: acordeão começa fechado");
await p.getByRole("button", { name: /^Aplicação/ }).tap();
await p.getByRole("button", { name: /^Remoção/ }).tap();
ok(await p.locator('[aria-expanded="true"]').count() === 1, "agendar: um serviço aberto por vez");
const botao = p.getByRole("link", { name: "Agendar pelo WhatsApp" });
const href = await botao.getAttribute("href");
ok(decodeURIComponent(href.split("text=")[1]) === "Olá! Quero agendar: Remoção (60 min, R$ 35,00) com Manoella Lopes. Tenho disponibilidade em: ____.", "agendar: mensagem do WhatsApp com serviço, duração, valor e profissional");
ok(href.startsWith("https://wa.me/5521995781069?text="), "agendar: número do studio");
const selo = await p.getByText(/Aberto até|Fechado agora/).innerText();
ok(/Aberto até \d+h|Fechado agora/.test(selo), `agendar: selo de horário (${selo})`);
ok(await p.locator('[aria-current="date"]').count() === 1, "agendar: dia de hoje destacado");
ok(await p.getByRole("link", { name: "(21) 99578-1069", exact: true }).getAttribute("href") === "tel:+5521995781069", "agendar: telefone clicável");
ok(await semLateral(), "agendar: sem rolagem lateral");

// Manual: seções, PDF e compartilhar
await p.goto(BASE + "/manual");
ok(await p.getByText(/^\d de 7$/).count() === 7, "manual: 7 seções com \"N de 7\"");
const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 60_000 }), p.getByRole("button", { name: "Baixar PDF" }).tap()]);
const caminho = await dl.path();
const pdf = readFileSync(caminho);
const paginas = (pdf.toString("latin1").match(/\/Type\s*\/Page(?!s)/g) ?? []).length;
ok(dl.suggestedFilename() === "manual-de-agendamento-studio-manoella-lopes.pdf" && pdf.subarray(0, 5).toString() === "%PDF-" && paginas === 7, `manual: PDF baixado (${paginas} páginas, ${Math.round(pdf.length / 1024)} KB)`);
await p.evaluate(() => { Object.defineProperty(navigator, "share", { value: undefined, configurable: true }); });
await p.getByRole("button", { name: "Compartilhar" }).tap();
await p.getByText("Link copiado.").waitFor();
ok(await p.evaluate(() => navigator.clipboard.readText()) === BASE + "/manual", "manual: sem Web Share, copia o link");

// Guia
await p.goto(BASE + "/guia");
ok(await p.getByText(/^\d de 4$/).count() === 4, "guia: 4 seções");
ok(await p.getByRole("link", { name: "Falar no WhatsApp" }).count() === 1, "guia: botão de WhatsApp no quadro de dúvidas");
const [dl2] = await Promise.all([p.waitForEvent("download", { timeout: 60_000 }), p.getByRole("button", { name: "Baixar PDF" }).tap()]);
const pdf2 = readFileSync(await dl2.path());
ok((pdf2.toString("latin1").match(/\/Type\s*\/Page(?!s)/g) ?? []).length === 4, "guia: PDF com 4 páginas");

// Tema claro
await p.getByRole("button", { name: "Usar tema claro" }).tap();
await p.reload();
ok(await p.evaluate(() => document.documentElement.dataset.theme) === "claro", "tema claro salvo e aplicado ao recarregar");

// SEO por rota (HTML estático, sem JavaScript)
for (const [rota, titulo] of [["/agendar", "Agende aqui"], ["/manual", "Manual de Agendamento"], ["/guia", "Guia de Cuidados"]]) {
  const html = await (await fetch(BASE + rota)).text();
  ok(html.includes(`<title>${titulo}`) && html.includes('lang="pt-BR"') && html.includes('og:title'), `SEO: ${rota} com título e Open Graph no HTML`);
}
// PWA
const man = await (await fetch(BASE + "/manifest.webmanifest")).json();
ok(man.name === "Studio Manoella Lopes" && man.icons.length >= 3 && man.display === "standalone", "PWA: manifest com nome, ícones e modo app");
ok(erros.length === 0, `sem erros no console${erros.length ? ": " + erros.join(" | ") : ""}`);
await b.close();
