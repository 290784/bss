// Grava o app como se estivesse sendo usado num iPhone 17 Pro Max (tela de 440 x 956 pontos).
// É o app de verdade, conduzido com toques e deslizes (sem marcador na tela); o aparelho, a barra de status e as legendas
// são desenhados em volta na montagem (vídeo vertical 1080 x 1920, ideal para Reels e TikTok).
//
// Uso: VITRINE_PASSWORD=... node materiais-comerciais/video/gravar-iphone.mjs   (app rodando; precisa do ffmpeg)
// Saída: materiais-comerciais/video/saida-iphone/ge-iphone.mp4
import { createRequire } from "node:module";
import { mkdirSync, rmSync, renameSync, writeFileSync } from "node:fs";
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
const SAIDA = join(AQUI, "saida-iphone");
rmSync(SAIDA, { recursive: true, force: true }); mkdirSync(SAIDA, { recursive: true });
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

// iPhone 17 Pro Max: tela de 440 x 956 pontos. A barra de status (54 pt) é desenhada na montagem, então a página ocupa 440 x 902.
const IPHONE = {
  viewport: { width: 440, height: 902 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: "pt-BR", timezoneId: "America/Sao_Paulo",
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
};

// ---------- Esconde só o indicador do modo de desenvolvimento do Next (nenhum círculo de dedo na tela) ----------
const OVERLAY = () => {
  const montar = () => {
    const st = document.createElement("style");
    st.textContent = "nextjs-portal,[data-nextjs-toast],[data-nextjs-dev-tools-button]{display:none!important}";
    document.head.appendChild(st);
  };
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", montar); else montar();
};

const marcas = []; let t0 = 0;
const legenda = (texto) => { marcas.push({ t: (Date.now() - t0) / 1000, texto }); };
let cdp;
const toqueCru = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
async function tocar(p, alvo, { depois = 450 } = {}) {
  const loc = typeof alvo === "string" ? p.locator(alvo).first() : alvo;
  await loc.waitFor({ timeout: 8000 });
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  const b = await loc.boundingBox(); if (!b) throw new Error("sem posição para o alvo");
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  await toqueCru("touchStart", x, y); await pausa(110); await toqueCru("touchEnd", x, y); await pausa(depois);
}
async function deslizar(p, { de = 640, ate = 240, x = 220, passos = 22, ms = 650 } = {}) {
  await toqueCru("touchStart", x, de);
  for (let i = 1; i <= passos; i++) { await toqueCru("touchMove", x, de + ((ate - de) * i) / passos); await pausa(ms / passos); }
  await toqueCru("touchEnd", x, ate); await pausa(450);
}
// Rola com o dedo até o elemento ficar a `topo` px do alto da tela (enquadra a seção, sem cortar no meio)
async function levar(p, seletor, topo = 96) {
  for (let i = 0; i < 4; i++) {
    const delta = await p.evaluate(([sel, t]) => { const e = typeof sel === "string" && sel.startsWith("text=") ? [...document.querySelectorAll("h1,h2,h3,p,span")].find((x) => x.textContent.trim().startsWith(sel.slice(5))) : document.querySelector(sel); return e ? Math.round(e.getBoundingClientRect().top - t) : 0; }, [seletor, topo]);
    if (Math.abs(delta) < 12) break;
    const d = Math.max(-520, Math.min(520, delta));
    const de = d > 0 ? 760 : 240;
    await deslizar(p, { de, ate: de - d, ms: 700 });
  }
  await pausa(500);
}
async function digitar(p, alvo, texto, atraso = 70) { await tocar(p, alvo, { depois: 250 }); await p.keyboard.type(texto, { delay: atraso }); await pausa(300); }

const navegador = await chromium.launch();
{ // aquecimento das rotas (fora da gravação)
  const c = await navegador.newContext({ viewport: { width: 1280, height: 720 } }); const w = await c.newPage();
  for (const u of ["/", "/entrar", "/b/salao-lumi"]) await w.goto(BASE + u, { timeout: 120000 }).catch(() => {});
  await w.goto(BASE + "/entrar"); await w.getByLabel("E-mail").fill(EMAIL); await w.getByLabel("Senha").fill(SENHA); await w.getByRole("button", { name: "Entrar" }).click(); await w.waitForURL(/\/app/, { timeout: 120000 });
  for (const u of ["/app", "/app/agenda", "/app/clientes"]) await w.goto(BASE + u, { timeout: 120000 }).catch(() => {});
  await c.close();
}

const ctx = await navegador.newContext({ ...IPHONE, recordVideo: { dir: SAIDA, size: IPHONE.viewport } });
await ctx.addInitScript(OVERLAY);
const p = await ctx.newPage(); cdp = await ctx.newCDPSession(p);
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
const video = p.video(); t0 = Date.now();
const passo = async (nome, fn) => { try { await fn(); } catch (e) { console.log(`  ⚠ ${nome}:`, e.message.split("\n")[0]); } };

// 1. Página de vendas
await passo("landing", async () => {
  await p.goto(BASE + "/"); await pausa(1500);
  legenda("A Gê no celular: a agenda de quem trabalha com beleza"); await pausa(4000);
  await levar(p, "text=Sua cliente marca sozinha", 110);
  legenda("A cliente marca sozinha, só em horários livres"); await pausa(4000);
  await levar(p, "text=Menos faltas", 110);
  legenda("Lembrete com confirmação pelo WhatsApp do salão"); await pausa(4000);
  await levar(p, "text=Saiba quanto recebeu", 110); await pausa(2500);
});
// 2. Entrar
await passo("login", async () => {
  await p.goto(BASE + "/entrar"); await pausa(1200);
  legenda("A dona do salão entra no painel"); 
  await digitar(p, p.getByLabel("E-mail"), EMAIL, 55);
  await digitar(p, p.getByLabel("Senha"), SENHA, 55);
  await tocar(p, p.getByRole("button", { name: "Entrar" }));
  await p.waitForURL(/\/app/, { timeout: 60000 }); await p.waitForSelector("text=/atendimentos? hoje/", { timeout: 30000 }).catch(() => {}); await pausa(1500);
});
// 3. Início
await passo("inicio", async () => {
  legenda("Todo dia uma saudação nova e o resumo do dia"); await pausa(6500);
  await deslizar(p, { ate: 330, ms: 900 }); await pausa(1200);
  legenda("Quanto entrou, quanto está previsto e quem sumiu"); await deslizar(p, { ate: 330, ms: 900 }); await pausa(3500);
  await deslizar(p, { de: 300, ate: 700, ms: 700 }); await deslizar(p, { de: 300, ate: 700, ms: 700 });
});
// 4. Agenda
await passo("agenda", async () => {
  const nav = p.locator('nav[aria-label="Navegação rápida"]');
  await tocar(p, nav.getByRole("link", { name: /Agenda/ })); await p.waitForURL(/agenda/); await pausa(1800);
  legenda("Agenda do dia, sem conflito de horário"); await pausa(4500);
  await deslizar(p, { de: 700, ate: 400, ms: 700 }); await pausa(700);
  const marc = p.locator("ol[aria-label='Atendimentos do dia'] li button.text-left").first();
  await tocar(p, marc); await p.waitForSelector("dialog[open]", { timeout: 8000 }).catch(() => {}); await pausa(1200);
  legenda("Um toque abre o atendimento: serviços, valor e pagamento"); await pausa(3500);
  await deslizar(p, { de: 700, ate: 400, ms: 700 }); await pausa(1800);
  await p.keyboard.press("Escape"); await pausa(900);
});
// 4b. Mais -> Configurações -> WhatsApp
await passo("whatsapp", async () => {
  const nav = p.locator('nav[aria-label="Navegação rápida"]');
  await tocar(p, nav.getByRole("button", { name: /Mais/ })); await pausa(1500);
  legenda("No menu, as configurações do salão"); await pausa(2500);
  await p.keyboard.press("Escape"); await pausa(300);
  await p.goto(BASE + "/app/configuracoes?aba=whatsapp"); await p.waitForSelector("#conectar-whatsapp"); await pausa(1200);
  legenda("WhatsApp pelo número do próprio salão: você pede e a equipe da Gê configura com você");
  await levar(p, "#conectar-whatsapp", 230); await pausa(5000);
});
// 5. Clientes e importação
await passo("clientes", async () => {
  const nav = p.locator('nav[aria-label="Navegação rápida"]');
  await tocar(p, nav.getByRole("link", { name: /Clientes/ })); await p.waitForURL(/clientes/); await pausa(1800);
  legenda("Clientes: histórico e quem não volta há tempo"); await pausa(3800);
  await tocar(p, p.getByRole("button", { name: "Importar planilha" }));
  await p.waitForSelector("text=Escolher arquivo CSV"); await pausa(1200);
  legenda("Trouxe sua lista de outro sistema? Importe a planilha"); await pausa(3000);
  await p.locator('input[type=file]').setInputFiles(join(AQUI, "exemplo-clientes.csv"));
  await p.waitForSelector("text=Vão entrar", { timeout: 20000 }); await pausa(900);
  legenda("A Gê mostra quem entra e o que tem erro, antes de gravar"); await pausa(2500);
  await deslizar(p, { de: 700, ate: 350, ms: 700 }); await pausa(3500);
  await p.keyboard.press("Escape"); await pausa(800);
});
// 6. Do outro lado: a cliente marcando
await passo("cliente", async () => {
  await p.goto(BASE + "/b/salao-lumi"); await pausa(1500);
  legenda("Do outro lado, a cliente abre o link do salão"); await pausa(3800);
  const servico = p.locator("button").filter({ hasText: /Agendar/ }).first();
  await tocar(p, servico); await pausa(1800);
  legenda("Escolhe o serviço e vê só os horários livres"); await pausa(2500);
  const hora = p.locator("button").filter({ hasText: /^\d{2}:\d{2}$/ }).first();
  if (await hora.count()) { await tocar(p, hora); await pausa(1800); }
  legenda("Escolhe o horário e o salão recebe o pedido"); await pausa(4500);
});

legenda(""); await pausa(500);
await ctx.close(); await navegador.close();
const bruto = join(SAIDA, "tela.webm"); renameSync(await video.path(), bruto);
if (erros.length) console.log("erros de página:", erros.join(" | "));

// ---------- Moldura do iPhone, barra de status e legendas (PNGs desenhados com as fontes do app) ----------
const nav2 = await chromium.launch();
const pg = await nav2.newPage({ viewport: { width: 1080, height: 1920 } });
await pg.goto(BASE + "/"); await pg.waitForTimeout(900);
const FUNDO = "linear-gradient(150deg,#2a0d22 0%,#44163a 34%,#682552 66%,#8b3a72 100%)";
const moldura = `
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920" style="position:fixed;left:0;top:0">
  <defs>
    <linearGradient id="fu" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(8)"><stop offset="0" stop-color="#2a0d22"/><stop offset=".34" stop-color="#44163a"/><stop offset=".66" stop-color="#682552"/><stop offset="1" stop-color="#8b3a72"/></linearGradient>
    <mask id="furo"><rect width="1080" height="1920" fill="white"/><path d="M180 404 H900 V1784 Q900 1880 804 1880 H276 Q180 1880 180 1784 Z" fill="black"/></mask>
  </defs>
  <g mask="url(#furo)">
    <rect width="1080" height="1920" fill="url(#fu)"/>
    <rect x="164" y="300" width="752" height="1596" rx="112" fill="#0d0b0e" stroke="#3a3540" stroke-width="3"/>
    <path d="M180 404 V412 A96 96 0 0 1 276 316 H804 A96 96 0 0 1 900 412 V404 Z" fill="#f6f3ee"/>
    <rect x="445" y="334" width="190" height="56" rx="28" fill="#000"/>
    <text x="252" y="378" font-family="var(--font-nunito),sans-serif" font-weight="800" font-size="34" fill="#1e1a17">9:41</text>
    <g fill="#1e1a17"><rect x="716" y="368" width="7" height="12" rx="2"/><rect x="727" y="362" width="7" height="18" rx="2"/><rect x="738" y="355" width="7" height="25" rx="2"/><rect x="749" y="348" width="7" height="32" rx="2"/></g>
    <g fill="none" stroke="#1e1a17" stroke-width="4" stroke-linecap="round"><path d="M772 361 Q790 347 808 361"/><path d="M778 369 Q790 359 802 369"/></g><circle cx="790" cy="376" r="3.2" fill="#1e1a17"/>
    <rect x="822" y="350" width="52" height="28" rx="9" fill="none" stroke="#1e1a17" stroke-opacity=".5" stroke-width="3"/><rect x="826" y="354" width="40" height="20" rx="6" fill="#1e1a17"/><rect x="876" y="358" width="4" height="12" rx="2" fill="#1e1a17" fill-opacity=".5"/>
  </g>
  <rect x="430" y="1858" width="220" height="9" rx="4.5" fill="#1e1a17" fill-opacity=".75"/>
</svg>`;
await pg.evaluate((h) => { document.documentElement.style.background = "transparent"; document.body.style.cssText = "margin:0;background:transparent"; document.body.innerHTML = h; }, moldura);
await pg.screenshot({ path: join(SAIDA, "moldura.png"), omitBackground: true });
for (const [k, m] of marcas.entries()) {
  if (!m.texto) continue;
  await pg.evaluate((t) => { document.body.innerHTML = `<div style="position:fixed;left:70px;top:40px;width:940px;height:240px;display:flex;align-items:center;justify-content:center;text-align:center;font-family:var(--font-playfair),serif;font-weight:600;font-size:58px;line-height:1.14;color:#fbf5ec">${t}</div>`; }, m.texto);
  await pg.screenshot({ path: join(SAIDA, `leg-${k}.png`), omitBackground: true });
}
await pg.evaluate((f) => { document.body.innerHTML = `<div style="position:fixed;inset:0;display:grid;place-items:center;text-align:center;background:${f};color:#fbf5ec"><div><div style="font-family:var(--font-allura),cursive;font-size:300px;line-height:1;color:#e3c88f">Gê</div><div style="font-family:var(--font-playfair),serif;font-weight:600;font-size:76px;margin-top:10px;padding:0 60px">Agenda cheia, cabeça leve.</div><div style="font-family:var(--font-nunito),sans-serif;font-weight:600;font-size:40px;margin-top:34px;color:#efe2e9">Teste grátis por 14 dias</div></div></div>`; }, FUNDO);
await pg.screenshot({ path: join(SAIDA, "fim.png") });
await nav2.close();

// ---------- Montagem ----------
const dur = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", bruto]).toString().trim();
const lms = marcas.map((m, k) => ({ ...m, k })).filter((m) => m.texto);
// Trilha de legendas: uma sequência de PNGs com a duração de cada legenda (um único vídeo com transparência, em vez de uma camada por legenda)
const total = Number(dur);
let lista = ""; let ultimo = 0;
const vazio = join(SAIDA, "leg-vazio.png");
{ const nv = await chromium.launch(); const pv = await nv.newPage({ viewport: { width: 1080, height: 300 } }); await pv.setContent("<body style='margin:0;background:transparent'></body>"); await pv.screenshot({ path: vazio, omitBackground: true }); await nv.close(); }
const linhas = [];
const quadro = (arq, d) => { if (d > 0.02) linhas.push(`file '${arq}'`, `duration ${d.toFixed(3)}`); };
quadro(vazio, lms[0] ? lms[0].t : total);
lms.forEach((m, i) => {
  const prox = marcas.slice(m.k + 1)[0]; const fimT = prox ? prox.t : total;
  quadro(join(SAIDA, `leg-${m.k}.png`), Math.min(fimT, total) - m.t);
});
linhas.push(`file '${vazio}'`);
writeFileSync(join(SAIDA, "legendas.txt"), linhas.join("\n"));
const trilha = join(SAIDA, "legendas.mov");
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", join(SAIDA, "legendas.txt"), "-vf", "crop=1080:300:0:0,fps=10,format=rgba", "-c:v", "png", trilha]);
const corpo = join(SAIDA, "corpo.mp4");
const f = "[1:v]scale=720:1476:flags=lanczos,setsar=1[t];[0:v][t]overlay=180:404:shortest=1[v0];[v0][2:v]overlay=0:0[v1];[v1][3:v]overlay=0:0:format=auto[v2];[v2]format=yuv420p[out]";
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=0x0d0b0e:s=1080x1920:r=30", "-i", bruto, "-loop", "1", "-i", join(SAIDA, "moldura.png"), "-i", trilha,
  "-filter_complex", f, "-map", "[out]", "-t", dur, "-r", "30", "-c:v", "libx264", "-crf", "20", "-preset", "medium", corpo]);
const fim = join(SAIDA, "fim.mp4");
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-loop", "1", "-t", "4", "-i", join(SAIDA, "fim.png"), "-vf", "scale=1080:1920,setsar=1,format=yuv420p", "-r", "30", "-c:v", "libx264", "-crf", "20", fim]);
writeFileSync(join(SAIDA, "lista.txt"), `file '${corpo}'\nfile '${fim}'\n`);
const final = join(SAIDA, "ge-iphone.mp4");
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", join(SAIDA, "lista.txt"), "-c", "copy", "-movflags", "+faststart", final]);
console.log(`Pronto: ${final} (${Math.round(total + 4)} s)`);
