// Grava o vídeo de apresentação usando o PRÓPRIO app rodando (mesmas fontes, animações e interações do produto).
// Não é uma réplica desenhada: é o app de verdade, conduzido pelo Playwright, com cursor e legendas por cima.
//
// Pré-requisitos: app rodando em desenvolvimento com dados de demonstração e a conta vitrine; ffmpeg instalado.
//   BASE_URL=http://localhost:3000 VITRINE_PASSWORD=... node materiais-comerciais/video/gravar.mjs
// Saída: materiais-comerciais/video/saida/gê-apresentacao.mp4 (e os .webm brutos de cada cena).
import { createRequire } from "node:module";
import { mkdirSync, rmSync, writeFileSync, readdirSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const EMAIL = process.env.VITRINE_EMAIL ?? "vitrine@beautyos.dev";
const SENHA = process.env.VITRINE_PASSWORD;
if (!SENHA) { console.error("Defina VITRINE_PASSWORD (senha da conta de demonstração)."); process.exit(1); }
const AQUI = dirname(fileURLToPath(import.meta.url));
const SAIDA = join(AQUI, "saida"), BRUTO = join(SAIDA, "bruto");
const SO = process.env.CENAS ? process.env.CENAS.split(",") : null; // CENAS=cliente-celular regrava só essa cena e reaproveita as outras
if (!SO) rmSync(SAIDA, { recursive: true, force: true });
mkdirSync(BRUTO, { recursive: true });
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Camada visual por cima da página: cursor, clique e legenda ----------
const OVERLAY = () => {
  const css = `
  #gv-cursor{position:fixed;left:-50px;top:-50px;width:30px;height:30px;z-index:2147483646;pointer-events:none;transition:transform .08s;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}
  .gv-ripple{position:fixed;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;border:3px solid #642350;z-index:2147483645;pointer-events:none;animation:gv-r .55s ease-out forwards}
  @keyframes gv-r{to{transform:scale(4.5);opacity:0}}
  #gv-legenda{position:fixed;left:50%;bottom:34px;transform:translateX(-50%);max-width:82%;z-index:2147483647;pointer-events:none;
    background:rgba(42,13,34,.94);color:#fbf5ec;padding:15px 30px;border-radius:999px;font:700 25px/1.25 var(--font-nunito),Nunito,system-ui,sans-serif;text-align:center;
    box-shadow:0 14px 34px -14px rgba(0,0,0,.55);opacity:0;transition:opacity .3s}
  #gv-legenda.on{opacity:1}
  #gv-legenda.topo{bottom:auto;top:26px}
  nextjs-portal,[data-nextjs-toast],[data-nextjs-dev-tools-button]{display:none!important}
  @media (max-width:500px){#gv-legenda{font-size:15px;padding:10px 18px;border-radius:18px;bottom:16px;max-width:92%}}`;
  const montar = () => {
    if (document.getElementById("gv-cursor")) return;
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    const c = document.createElement("div"); c.id = "gv-cursor";
    c.innerHTML = '<svg viewBox="0 0 24 24" width="30" height="30"><path d="M3 2l7.5 19 2.6-7.7L21 10.7z" fill="#fff" stroke="#642350" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.body.appendChild(c);
    const l = document.createElement("div"); l.id = "gv-legenda"; document.body.appendChild(l);
    addEventListener("mousemove", (e) => { c.style.left = e.clientX - 3 + "px"; c.style.top = e.clientY - 2 + "px"; }, true);
    addEventListener("mousedown", (e) => { const r = document.createElement("div"); r.className = "gv-ripple"; r.style.left = e.clientX + "px"; r.style.top = e.clientY + "px"; document.body.appendChild(r); setTimeout(() => r.remove(), 700); }, true);
  };
  window.__legenda = (t, topo) => { montar(); const l = document.getElementById("gv-legenda"); if (!t) { l.classList.remove("on"); return; } l.classList.toggle("topo", !!topo); l.textContent = t; l.classList.add("on"); };
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", montar); else montar();
};

const lista = [];
const marcas = {}; // legendas desenhadas fora da tela do app (cena de celular): { cena: [{ t, texto }] }
let t0cena = 0, cenaAtual = "";
async function cena(nome, ctxOpts, fn, { tamanhoVideo } = {}) {
  const ORDEM = ["landing", "painel", "cliente-celular"];
  const arquivo = join(BRUTO, `${String(ORDEM.indexOf(nome) + 1).padStart(2, "0")}-${nome}.webm`);
  if (SO && !SO.includes(nome)) { console.log("↷ reaproveita:", nome); lista.push(arquivo); return; }
  console.log("▶ cena:", nome);
  const navegador = cena.navegador;
  const ctx = await navegador.newContext({ ...ctxOpts, recordVideo: { dir: BRUTO, size: tamanhoVideo ?? ctxOpts.viewport } });
  await ctx.addInitScript(OVERLAY);
  const p = await ctx.newPage();
  const erros = []; p.on("pageerror", (e) => erros.push(e.message));
  const video = p.video();
  t0cena = Date.now(); cenaAtual = nome; marcas[nome] = [];
  try { await fn(p, ctx); } catch (e) { console.log("  ⚠ falhou:", e.message.split("\n")[0]); }
  await p.evaluate(() => window.__legenda?.("")).catch(() => {});
  await pausa(600);
  await ctx.close();
  renameSync(await video.path(), arquivo);
  lista.push(arquivo);
  if (erros.length) console.log("  erros de página:", erros.join(" | "));
}

const legenda = (p, t, topo = false) => {
  if (p.__externa) { (marcas[cenaAtual] ??= []).push({ t: (Date.now() - t0cena) / 1000, texto: t }); return Promise.resolve(); }
  return p.evaluate(([x, y]) => window.__legenda(x, y), [t, topo]);
};
async function mover(p, alvo, { depois = 350 } = {}) {
  const loc = typeof alvo === "string" ? p.locator(alvo).first() : alvo;
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  const box = await loc.boundingBox();
  if (!box) throw new Error("sem posição para o alvo");
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 28 });
  await pausa(depois);
  return loc;
}
async function clicar(p, alvo, opts) { const loc = await mover(p, alvo, opts); await loc.click(); }
async function digitar(p, alvo, texto, atraso = 75) { await clicar(p, alvo); await p.keyboard.type(texto, { delay: atraso }); }
async function rolarAte(p, seletor, ms = 1800) {
  await p.evaluate(async ([sel, dur]) => {
    const alvo = document.querySelector(sel); if (!alvo) return;
    const ini = scrollY, fim = alvo.getBoundingClientRect().top + scrollY - 70, t0 = performance.now();
    await new Promise((ok) => { const f = (t) => { const k = Math.min(1, (t - t0) / dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; scrollTo(0, ini + (fim - ini) * e); k < 1 ? requestAnimationFrame(f) : ok(); }; requestAnimationFrame(f); });
  }, [seletor, ms]);
}

const navegador = await chromium.launch(); cena.navegador = navegador;
{ // aquecimento: visita as rotas uma vez, sem gravar, para o app já estar compilado
  const c = await navegador.newContext({ viewport: { width: 1280, height: 720 } }); const w = await c.newPage();
  for (const u of ["/", "/entrar", "/b/salao-lumi"]) await w.goto(BASE + u, { timeout: 120000 }).catch(() => {});
  await w.goto(BASE + "/entrar"); await w.getByLabel("E-mail").fill(EMAIL); await w.getByLabel("Senha").fill(SENHA); await w.getByRole("button", { name: "Entrar" }).click(); await w.waitForURL(/\/app/, { timeout: 120000 });
  for (const u of ["/app", "/app/agenda", "/app/clientes", "/app/configuracoes?aba=whatsapp"]) await w.goto(BASE + u, { timeout: 120000 }).catch(() => {});
  await c.close();
}
const DESK = { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, locale: "pt-BR", timezoneId: "America/Sao_Paulo" };
const CEL = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "pt-BR", timezoneId: "America/Sao_Paulo" };

// 1. Página de vendas
await cena("landing", DESK, async (p) => {
  await p.goto(BASE + "/"); await pausa(1200);
  await legenda(p, "A Gê organiza a agenda de quem trabalha com beleza"); await pausa(4200);
  await rolarAte(p, "#agendamento-online", 2200);
  await legenda(p, "A cliente marca sozinha, só em horários livres"); await pausa(9000);
  await rolarAte(p, "#recursos", 2000);
  await legenda(p, "Lembrete com confirmação pelo WhatsApp do próprio salão"); await pausa(9000);
  await rolarAte(p, "#planos", 2000);
  await legenda(p, "Teste grátis por 14 dias, sem cartão"); await pausa(3500);
});

// 2. Painel do salão (desktop)
await cena("painel", DESK, async (p) => {
  await p.goto(BASE + "/entrar"); await pausa(900);
  await legenda(p, "O painel do salão: entra e já vê o dia"); await pausa(1500);
  await digitar(p, p.getByLabel("E-mail"), EMAIL, 55);
  await digitar(p, p.getByLabel("Senha"), SENHA, 55);
  await clicar(p, p.getByRole("button", { name: "Entrar" }));
  await p.waitForURL(/\/app/); await p.waitForSelector("h1"); await pausa(500);
  await legenda(p, "Todo dia uma saudação nova, e o resumo do dia logo abaixo"); await pausa(9000);
  await p.mouse.wheel(0, 380); await pausa(2200);
  await legenda(p, "Quanto entrou, quanto está previsto e quem sumiu"); await pausa(4500);
  await p.mouse.wheel(0, -380); await pausa(800);

  await clicar(p, p.getByRole("link", { name: "Agenda" }).first());
  await p.waitForURL(/agenda/); await pausa(1800);
  await legenda(p, "Agenda por dia, semana e mês, sem conflito de horário"); await pausa(4500);
  const marc = p.locator("[data-appt]").first();
  await clicar(p, marc);
  await p.waitForSelector("dialog[open]", { timeout: 8000 }).catch(() => {}); await pausa(1200);
  await legenda(p, "Um toque abre o atendimento: serviços, valor e pagamento", true); await pausa(5000);
  await p.keyboard.press("Escape"); await legenda(p, ""); await pausa(700);

  await clicar(p, p.getByRole("link", { name: "Clientes" }).first());
  await p.waitForURL(/clientes/); await pausa(1800);
  await legenda(p, "Clientes: histórico, frequência e quem não volta há tempo"); await pausa(4500);
  await clicar(p, p.getByRole("button", { name: "Importar planilha" }));
  await p.waitForSelector("text=Escolher arquivo CSV"); await pausa(1200);
  await legenda(p, "Trouxe sua lista de outro sistema? Importe a planilha e confira antes"); await pausa(3500);
  await p.locator('input[type=file]').setInputFiles(join(AQUI, "exemplo-clientes.csv"));
  await p.waitForSelector("text=Vão entrar", { timeout: 20000 }); await pausa(900);
  await legenda(p, "Mostra quem entra, quem já existe e o que tem erro, antes de gravar", true); await pausa(7500);
  await p.keyboard.press("Escape"); await legenda(p, ""); await pausa(800);

  await clicar(p, p.getByRole("link", { name: "Configurações" }).first());
  await p.waitForURL(/configuracoes/); await pausa(1200);
  await p.goto(BASE + "/app/configuracoes?aba=whatsapp"); await p.waitForSelector("#conectar-whatsapp"); await pausa(1500);
  await legenda(p, "WhatsApp pelo número do próprio salão: você pede, a equipe da Gê configura com você"); await pausa(6500);
  await legenda(p, "O lembrete sai na véspera e a cliente confirma com um toque"); await pausa(5500);
});

// 3. Página de agendamento da cliente (celular)
await cena("cliente-celular", CEL, async (p) => {
  p.__externa = true;
  await p.goto(BASE + "/b/salao-lumi"); await pausa(1500);
  await legenda(p, "No celular da cliente: o link do salão"); await pausa(4500);
  const servico = p.locator("button, label").filter({ hasText: /Manicure|Cílios|Sobrancelha|Esmalta|Design|Hidrata|Corte/i }).first();
  await clicar(p, servico).catch(() => {}); await pausa(900);
  await legenda(p, "Ela escolhe o serviço e vê só os horários livres"); await pausa(4500);
  const continuar = p.getByRole("button", { name: /Continuar|Próximo|Ver horários/i }).first();
  if (await continuar.count()) await clicar(p, continuar).catch(() => {});
  await pausa(2500);
  const hora = p.locator("button").filter({ hasText: /^\d{2}:\d{2}$/ }).first();
  if (await hora.count()) { await clicar(p, hora); await pausa(1800); }
  await legenda(p, "Escolhe o horário e pronto: o salão recebe o pedido"); await pausa(6000);
});

await navegador.close();

// ---------- Junta as cenas, legendas já estão no vídeo; cria o cartão final e exporta o MP4 ----------
const fim = join(SAIDA, "fim.png");
const nav2 = await chromium.launch();
const pg = await nav2.newPage({ viewport: { width: 1280, height: 720 } });
await pg.goto(BASE + "/"); await pg.waitForTimeout(800);
await pg.evaluate(() => {
  document.body.innerHTML = `<div style="position:fixed;inset:0;display:grid;place-items:center;text-align:center;background:linear-gradient(150deg,#2a0d22 0%,#44163a 34%,#682552 66%,#8b3a72 100%);color:#fbf5ec">
   <div><div style="font-family:var(--font-allura),cursive;font-size:190px;line-height:1;color:#e3c88f">Gê</div>
   <div style="font-family:var(--font-playfair),serif;font-weight:600;font-size:60px;margin-top:6px">Agenda cheia, cabeça leve.</div>
   <div style="font-family:var(--font-nunito),sans-serif;font-weight:600;font-size:30px;margin-top:26px;color:#efe2e9">Teste grátis por 14 dias, sem cartão de crédito</div></div></div>`;
});
await pg.waitForTimeout(500); await pg.screenshot({ path: fim });
for (const [k, m] of (marcas["cliente-celular"] ?? []).entries()) {
  await pg.evaluate((texto) => {
    document.documentElement.style.background = "transparent";
    document.body.innerHTML = `<div style="position:fixed;left:560px;top:0;width:660px;height:720px;display:flex;align-items:center;font-family:var(--font-playfair),serif;font-weight:600;font-size:58px;line-height:1.15;color:#fbf5ec">${texto}</div>`;
    document.body.style.background = "transparent";
  }, m.texto);
  await pg.screenshot({ path: join(SAIDA, `leg-${k}.png`), omitBackground: true });
}
await nav2.close();

const segmentos = [];
lista.forEach((arq, i) => {
  const norm = join(SAIDA, `seg-${i + 1}.mp4`);
  // Cena de celular: o aparelho à esquerda e a legenda grande à direita, sobre o fundo ameixa
  if (arq.includes("cliente-celular")) {
    const ms = marcas["cliente-celular"] ?? [];
    const duracao = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", arq]).toString().trim();
    const entradas = ["-y", "-loglevel", "error", "-i", arq, "-f", "lavfi", "-i", "color=c=0x44163a:s=1280x720:r=30"];
    ms.forEach((_, k) => entradas.push("-loop", "1", "-i", join(SAIDA, `leg-${k}.png`)));
    let f = "[0:v]scale=-2:700:flags=lanczos,setsar=1,drawbox=x=0:y=0:w=iw:h=ih:color=0xe3c88f:t=3[c];[1:v][c]overlay=170:10:shortest=1[v0]";
    ms.forEach((m, k) => {
      const ini = m.t.toFixed(2), fimT = (ms[k + 1] ? ms[k + 1].t : 999).toFixed(2);
      f += `;[v${k}][${k + 2}:v]overlay=0:0:enable='between(t,${ini},${fimT})'[v${k + 1}]`;
    });
    f += `;[v${ms.length}]format=yuv420p[out]`;
    execFileSync("ffmpeg", [...entradas, "-filter_complex", f, "-map", "[out]", "-t", duracao, "-r", "30", "-c:v", "libx264", "-crf", "20", "-preset", "medium", norm]);
  } else {
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", arq, "-vf", "scale=1280:720,setsar=1,format=yuv420p", "-r", "30", "-c:v", "libx264", "-crf", "20", "-preset", "medium", norm]);
  }
  segmentos.push(norm);
});
const segFim = join(SAIDA, "seg-fim.mp4");
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-loop", "1", "-t", "4", "-i", fim, "-vf", "scale=1280:720,setsar=1,format=yuv420p", "-r", "30", "-c:v", "libx264", "-crf", "20", segFim]);
segmentos.push(segFim);
writeFileSync(join(SAIDA, "lista.txt"), segmentos.map((s) => `file '${s}'`).join("\n"));
const final = join(SAIDA, "ge-apresentacao.mp4");
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", join(SAIDA, "lista.txt"), "-c", "copy", "-movflags", "+faststart", final]);
const dur = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", final]).toString().trim();
console.log(`Pronto: ${final} (${Math.round(Number(dur))} s)`);
