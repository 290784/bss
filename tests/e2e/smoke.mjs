/**
 * Fluxo ponta a ponta no navegador real (Chromium/Playwright) contra um servidor rodando.
 * Uso: BASE_URL=http://localhost:3000 node tests/e2e/smoke.mjs [--shots=dir]
 */
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const shotsArg = process.argv.find((a) => a.startsWith("--shots="));
const SHOTS = shotsArg ? shotsArg.split("=")[1] : null;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const results = [];
async function step(name, fn) {
  try { await fn(); results.push(["✔", name]); console.log("✔", name); }
  catch (e) { if (SHOTS && globalThis.__page) await globalThis.__page.screenshot({ path: `${SHOTS}/FAIL.png`, fullPage: true }).catch(() => {}); results.push(["✘", name]); console.log("✘", name, "\n   ", e.message.split("\n")[0]); process.exitCode = 1; throw e; }
}
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
const noHorizontalScroll = async (page, label) => {
  // Compara com a largura configurada: em modo mobile o innerWidth "cresce" junto com o conteúdo.
  const iw = page.viewportSize().width;
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  if (sw > iw + 1) throw new Error(`${label}: rolagem horizontal (${sw} > ${iw})`);
};

const browser = await chromium.launch();
const errors = [];
try {
  const ctx = await browser.newContext({ locale: "pt-BR", timezoneId: "America/Sao_Paulo", viewport: { width: 1360, height: 900 } });
  const page = await ctx.newPage();
  globalThis.__page = page;
  page.on("pageerror", (e) => errors.push(e.message));
  const email = `e2e-${Date.now()}@teste.dev`;
  let slug = "";

  await step("landing page carrega com CTA", async () => {
    await page.goto(BASE);
    await page.getByRole("link", { name: /Começar teste grátis/ }).waitFor();
    await shot(page, "01-landing");
  });

  await step("área privada exige login", async () => {
    await page.goto(`${BASE}/app/clientes`);
    await page.waitForURL(/\/entrar/);
  });

  await step("cadastro valida campos e cria conta", async () => {
    await page.goto(`${BASE}/cadastro`);
    await page.getByRole("button", { name: "Criar conta grátis" }).click();
    await page.getByText("Revise os campos destacados.").waitFor();
    await page.getByLabel("Seu nome").fill("Ana Teste");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill("senha-segura-123");
    await page.locator('input[name="acceptTerms"]').check();
    await page.getByRole("button", { name: "Criar conta grátis" }).click();
    await page.waitForURL(/\/onboarding/);
  });

  await step("onboarding: negócio, horários e serviços", async () => {
    await page.getByLabel("Nome do negócio").fill(`Studio E2E ${Date.now() % 100000}`);
    await page.getByLabel("O que você faz?").selectOption("nails");
    await shot(page, "02-onboarding");
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByText("Quando você atende?").waitFor();
    // Atende todos os dias para o teste não depender do dia da semana
    await page.getByRole("button", { name: "Dom", pressed: false }).click();
    await page.getByLabel("Término").fill("20:00");
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByText("Seus serviços").waitFor();
    await page.getByRole("button", { name: "Abrir minha agenda" }).click();
    await page.waitForURL(/\/app\?bem-vinda=1/);
    await page.getByText("Primeiros passos").waitFor();
    slug = (await page.locator("text=/\\/b\\//").first().innerText()).split("/b/")[1].trim();
    await shot(page, "03-dashboard-novo");
  });

  await step("cliente: erro de validação e cadastro", async () => {
    await page.goto(`${BASE}/app/clientes?nova=1`);
    await page.getByLabel("WhatsApp / telefone").fill("123");
    await page.getByRole("button", { name: "Salvar" }).click();
    await page.getByText("Telefone inválido. Use DDD + número.").waitFor();
    await page.getByLabel("Nome completo").fill("Beatriz Cliente");
    await page.getByLabel("WhatsApp / telefone").fill("(11) 98888-7777");
    await page.getByRole("button", { name: "Salvar" }).click();
    await page.waitForURL(/\/app\/clientes\/[0-9a-f-]{36}/);
    await page.getByRole("heading", { name: "Beatriz Cliente" }).waitFor();
  });

  await step("agenda: cria agendamento a partir dos horários livres", async () => {
    const tomorrow = new Date(Date.now() + 86_400_000).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    await page.goto(`${BASE}/app/agenda?data=${tomorrow}`);
    await page.getByRole("button", { name: "Agendar" }).click();
    await page.locator("dialog[open]").getByLabel("Cliente", { exact: true }).fill("Beat");
    await page.locator("dialog[open]").getByRole("button", { name: /Beatriz Cliente/ }).click();
    await page.locator("dialog[open]").getByRole("checkbox").first().check();
    await page.getByText("Horários livres").waitFor();
    await page.locator("dialog[open] button", { hasText: "10:00" }).first().click();
    await page.locator("dialog[open]").getByRole("button", { name: "Agendar", exact: true }).click();
    await page.getByText("Agendamento criado.").waitFor();
    await page.locator("dialog[open]").getByText("Agendamento criado pela equipe").waitFor();
    await shot(page, "04-agendamento-detalhe");
  });

  await step("agenda: registra pagamento parcial e conclui", async () => {
    const dlg = page.locator("dialog[open]");
    await dlg.getByRole("button", { name: "Registrar pagamento" }).click();
    await dlg.getByLabel("Valor (R$)").fill("10,00");
    await dlg.getByRole("button", { name: "Registrar", exact: true }).click();
    await page.getByText("Pagamento registrado.").waitFor();
    await dlg.getByText(/Pagamento de R\$\s?10,00 registrado/).waitFor();
    await dlg.getByRole("button", { name: "Concluir atendimento" }).click();
    await page.getByText("Status atualizado.").waitFor();
    await dlg.getByRole("button", { name: "Fechar" }).click();
  });

  await step("agenda: conflito de horário é recusado", async () => {
    await page.getByRole("button", { name: "Agendar" }).click();
    const dlg = page.locator("dialog[open]");
    await dlg.getByLabel("Cliente", { exact: true }).fill("Beat");
    await dlg.getByRole("button", { name: /Beatriz Cliente/ }).click();
    await dlg.getByRole("checkbox").first().check();
    await dlg.getByLabel("Horário").fill("10:00");
    await dlg.getByRole("button", { name: "Agendar", exact: true }).click();
    await dlg.getByText(/já está ocupado/).waitFor();
    await dlg.getByRole("button", { name: "Fechar" }).click();
  });

  await step("visões semana e mês renderizam", async () => {
    await page.getByRole("tab", { name: "semana" }).click();
    await page.waitForURL(/visao=semana/);
    await page.getByText("Beatriz Cliente").first().waitFor();
    await shot(page, "05-agenda-semana");
    await page.getByRole("tab", { name: "Mês" }).click();
    await page.waitForURL(/visao=mes/);
  });

  // Cliente final, sem login
  const pub = await browser.newContext({ locale: "pt-BR", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p2 = await pub.newPage();
  p2.on("pageerror", (e) => errors.push(e.message));
  globalThis.__page = p2;
  await step("página pública: cliente solicita horário no celular", async () => {
    await p2.goto(`${BASE}/b/${slug}`);
    await p2.getByText("Escolha o serviço").waitFor();
    await noHorizontalScroll(p2, "página pública");
    await shot(p2, "06-publico-mobile");
    await p2.getByRole("button", { name: /Manicure/ }).first().click();
    await p2.locator("button[aria-pressed]").nth(2).click();
    await p2.locator("button.tabular, button:has-text(':')").filter({ hasText: /^\d\d:\d\d$/ }).first().click();
    await p2.getByLabel("Seu nome").fill("Carla Online");
    await p2.getByLabel("WhatsApp").fill("(21) 97777-6666");
    await p2.getByRole("button", { name: /Solicitar agendamento/ }).click();
    await p2.getByRole("alert").filter({ hasText: "É preciso aceitar a política de agendamento." }).waitFor();
    // O que a cliente digitou não pode se perder com o erro
    if ((await p2.getByLabel("Seu nome").inputValue()) !== "Carla Online") throw new Error("campos apagados após erro de validação");
    await p2.locator('input[name="acceptPolicy"]').check();
    await p2.getByRole("button", { name: /Solicitar agendamento/ }).click();
    await p2.getByText("Solicitação enviada!").waitFor();
    await shot(p2, "07-publico-confirmado");
  });

  globalThis.__page = page;
  await step("equipe recebe notificação da solicitação online", async () => {
    await page.goto(`${BASE}/app`);
    await page.getByRole("button", { name: /Notificações \(1 novas\)/ }).click();
    await page.getByText("Nova solicitação de agendamento").waitFor();
  });

  await step("isolamento: página de cliente de outra empresa não abre", async () => {
    const demo = await browser.newContext();
    const d = await demo.newPage();
    await d.goto(`${BASE}/entrar`);
    await d.getByLabel("E-mail").fill("demo@beautyos.dev");
    await d.getByLabel("Senha").fill(process.env.DEMO_PASSWORD ?? "demo-senha-123");
    await d.getByRole("button", { name: "Entrar" }).click();
    await d.waitForURL(/\/app$/);
    await d.getByText("conta de demonstração").waitFor();
    await shot(d, "08-dashboard-demo");
    // Pega um id de cliente da conta E2E e tenta abrir com a sessão da demo
    const clientUrl = await page.goto(`${BASE}/app/clientes?q=Beatriz`).then(() => page.getByRole("link", { name: "Beatriz Cliente" }).getAttribute("href"));
    // Com streaming (loading.tsx) o Next envia status 200 antes do notFound(); o que importa é não vazar dados.
    await d.goto(`${BASE}${clientUrl}`);
    await d.getByText("Página não encontrada").waitFor();
    if ((await d.content()).includes("Beatriz Cliente")) throw new Error("dados de outra empresa foram exibidos");
    await d.setViewportSize({ width: 390, height: 844 });
    await d.goto(`${BASE}/app/agenda`);
    await noHorizontalScroll(d, "agenda mobile");
    await shot(d, "09-agenda-mobile");
    await d.goto(`${BASE}/app`);
    await noHorizontalScroll(d, "dashboard mobile");
    await shot(d, "10-dashboard-mobile");
    await demo.close();
  });

  await step("sair encerra a sessão", async () => {
    await page.goto(`${BASE}/app`);
    await page.getByRole("button", { name: "Sair" }).first().click();
    await page.waitForURL(/\/entrar/);
    await page.goto(`${BASE}/app`);
    await page.waitForURL(/\/entrar/);
  });

  if (errors.length) { console.log("Erros de página:", errors); process.exitCode = 1; }
} finally {
  await browser.close();
  console.log(`\n${results.filter((r) => r[0] === "✔").length}/${results.length} etapas OK`);
}
