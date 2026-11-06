// Gera os HTMLs (pasta fonte/) e as imagens PNG (pasta png/) das peças visuais da Gê.
// Uso, a partir da raiz do repositório:  node materiais-comerciais/visual/gerar.mjs
// Edite os textos nos blocos "PEÇAS" abaixo e rode de novo. Precisa do Playwright (npm i -D playwright; npx playwright install chromium).
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync, readdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const AQUI = dirname(fileURLToPath(import.meta.url));
const FONTE = join(AQUI, "fonte"), PNG = join(AQUI, "png");
mkdirSync(FONTE, { recursive: true }); mkdirSync(PNG, { recursive: true });
for (const d of [FONTE, PNG]) for (const f of readdirSync(d)) unlinkSync(join(d, f));

// ---------- Identidade (a mesma do site: creme, ameixa e dourado; Playfair, Nunito e Allura) ----------
const CSS = `
@font-face{font-family:"Playfair Display";src:url("../fontes/PlayfairDisplay-latin-variavel.woff2") format("woff2");font-weight:400 900}
@font-face{font-family:"Nunito";src:url("../fontes/Nunito-latin-variavel.woff2") format("woff2");font-weight:200 1000}
@font-face{font-family:"Allura";src:url("../fontes/Allura-latin.woff2") format("woff2");font-weight:400}
:root{--creme:#f6f3ee;--creme2:#fbf5ec;--ameixa:#642350;--ameixa-esc:#2a0d22;--dourado:#b28e52;--dourado-cl:#e3c88f;--tinta:#1e1a17;--suave:#52463f;--fio:rgba(178,142,82,.6)}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:var(--w);height:var(--h);overflow:hidden}
body{font-family:"Nunito",sans-serif;color:var(--tinta);-webkit-font-smoothing:antialiased}
.creme{background:var(--creme)}
.ameixa{background:linear-gradient(150deg,#2a0d22 0%,#44163a 34%,#682552 66%,#8b3a72 100%);color:var(--creme2)}
.pag{position:relative;width:var(--w);height:var(--h);padding:var(--py) var(--px);display:flex;flex-direction:column}
.topo{display:flex;align-items:center;justify-content:space-between}
.logo{font-family:"Allura",cursive;font-size:84px;line-height:1;color:var(--ameixa)}
.ameixa .logo{color:var(--dourado-cl)}
.rotulo{font-size:32px;font-weight:700;color:var(--dourado)}
.ameixa .rotulo{color:var(--dourado-cl)}
h1,h2,.serif{font-family:"Playfair Display",serif;font-weight:700;letter-spacing:-.01em;line-height:1.08}
.ouro{background:linear-gradient(180deg,#c9a35e 0%,#a98243 55%,#8a6426 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.ameixa .ouro{background:none;color:var(--dourado-cl)}
.fio{height:3px;width:120px;background:var(--dourado);border-radius:2px}
.rodape{margin-top:auto;display:flex;align-items:center;justify-content:space-between;font-size:30px;font-weight:700;color:var(--suave)}
.ameixa .rodape{color:var(--dourado-cl)}
.corpo{font-size:48px;line-height:1.36;font-weight:600;color:var(--suave)}
.ameixa .corpo{color:#efe2e9}
.balao{background:#fff;border:2px solid var(--fio);border-radius:32px 32px 32px 8px;padding:36px 42px;font-size:44px;line-height:1.35;font-weight:600;box-shadow:0 18px 40px -28px rgba(100,35,80,.45);max-width:820px}
.botao{display:inline-block;border-radius:999px;padding:24px 46px;font-size:40px;font-weight:800}
.b-ameixa{background:var(--ameixa);color:#fff}.b-contorno{border:3px solid var(--ameixa);color:var(--ameixa);background:transparent}
.chip{display:inline-block;border:2px solid var(--fio);border-radius:999px;padding:18px 36px;font-size:38px;font-weight:700;color:var(--ameixa);background:var(--creme2)}
.card{background:#fff;border:2px solid var(--fio);border-radius:36px;padding:34px;box-shadow:0 24px 50px -34px rgba(100,35,80,.5)}
.linha{display:flex;align-items:center;gap:26px;border-radius:24px;background:#f3eee6;padding:28px 32px;font-size:44px;font-weight:700}
.linha small{display:block;font-size:34px;font-weight:600;color:var(--suave)}
.hora{width:140px;font-variant-numeric:tabular-nums;color:var(--ameixa)}
.vago{background:transparent;border:3px dashed var(--dourado);color:var(--suave)}
.faltou{background:#f6e6ec;color:#7a1f3f}
`;

const pagina = ({ w, h, px = 96, py = 96, classe = "creme", corpo }) =>
  `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Gê</title><style>${CSS}:root{--w:${w}px;--h:${h}px;--px:${px}px;--py:${py}px}</style></head><body><div class="pag ${classe}">${corpo}</div></body></html>`;

const topo = (rotulo = "") => `<div class="topo"><span class="logo">Gê</span><span class="rotulo">${rotulo}</span></div>`;
const pecas = []; // { nome, w, h, html }
const add = (nome, w, h, opts, corpo) => pecas.push({ nome, w, h, html: pagina({ w, h, ...opts, corpo }) });

// ---------- PEÇAS ----------
// 1. Foto de perfil (Instagram e TikTok recortam em círculo: o "Gê" fica no meio)
add("01-foto-de-perfil", 1080, 1080, { classe: "ameixa", px: 0, py: 0 },
  `<div style="display:grid;place-items:center;height:100%"><div style="width:760px;height:760px;border-radius:50%;border:4px solid rgba(227,200,143,.6);display:grid;place-items:center"><span style="font-family:Allura;font-size:520px;line-height:1;color:#e3c88f;margin-top:-30px">Gê</span></div></div>`);

// 2. Carrossel do dia 2: "5 jeitos de reduzir falta sem brigar com cliente" (7 telas, 1080x1350)
const jeitos = [
  { n: 1, titulo: "Confirme na véspera", texto: "Uma mensagem curta no dia anterior já separa quem vem de quem esqueceu.", extra: `<div class="balao">Oi, Ana! Amanhã às 14h tem seus cílios comigo. Confirma?</div>` },
  { n: 2, titulo: "Peça um sinal", texto: "Um valor pequeno, pago antes, faz o horário valer para as duas.", extra: `<div style="display:flex;flex-wrap:wrap;gap:16px"><span class="chip">Combine o valor</span><span class="chip">Diga como abate no serviço</span></div>` },
  { n: 3, titulo: "Deixe as regras claras", texto: "Atraso, cancelamento e remarcação combinados antes de marcar, por escrito.", extra: `<div style="display:flex;flex-wrap:wrap;gap:16px"><span class="chip">Tolerância de atraso</span><span class="chip">Aviso com antecedência</span><span class="chip">Como remarcar</span></div>` },
  { n: 4, titulo: "Tenha uma lista de espera", texto: "Se alguém cancela, outra cliente ocupa o horário em vez de ele ficar vago.", extra: `<div class="card" style="max-width:820px;padding:26px"><div class="linha vago"><span class="hora">14:00</span>horário liberado</div><div style="height:16px"></div><div class="linha"><span class="hora">&rarr;</span><div>Bia assume<small>da lista de espera</small></div></div></div>` },
  { n: 5, titulo: "Use um lembrete automático", texto: "A mensagem sai sozinha e a cliente confirma com um toque. É o que a Gê faz por você.", extra: `<div><span class="botao b-ameixa">Confirmo</span> &nbsp; <span class="botao b-contorno">Preciso remarcar</span></div>` },
];
const TOTAL = 7;
add("carrossel-dia02-5-jeitos-1", 1080, 1350, { classe: "ameixa" },
  `${topo("Para lash e nail designers")}
   <div style="margin:auto 0"><div class="fio" style="background:var(--dourado-cl);margin-bottom:44px"></div>
   <h1 style="font-size:112px">5 jeitos de reduzir <span class="ouro">falta</span> sem brigar com cliente</h1></div>
   <div class="rodape"><span>Agenda cheia, cabeça leve.</span><span>arraste &rarr;</span></div>`);
jeitos.forEach((j, i) => add(`carrossel-dia02-5-jeitos-${i + 2}`, 1080, 1350, {},
  `${topo("5 jeitos de reduzir falta")}
   <div style="margin:auto 0">
   <span class="serif ouro" style="font-size:210px;line-height:.9;display:block">${j.n}</span>
   <h2 style="font-size:88px;margin-top:6px">${j.titulo}</h2>
   <p class="corpo" style="margin-top:26px;max-width:900px;font-size:44px">${j.texto}</p>
   <div style="margin-top:36px">${j.extra}</div></div>
   <div class="rodape"><span>${i + 2} de ${TOTAL}</span><span>arraste &rarr;</span></div>`));
add("carrossel-dia02-5-jeitos-7", 1080, 1350, { classe: "ameixa" },
  `${topo("")}
   <div style="margin:auto 0"><h1 style="font-size:120px">Qual você <span class="ouro">já usa</span>?</h1>
   <p class="corpo" style="margin-top:44px;max-width:860px">Salve para usar depois e mande para uma colega que também sofre com falta.</p></div>
   <div class="rodape"><span>Agenda cheia, cabeça leve.</span><span>7 de ${TOTAL}</span></div>`);

// 3. Post do dia 12 (1080x1350)
add("post-dia12-cobrar-o-que-vale", 1080, 1350, {},
  `${topo("")}
   <div style="margin:auto 0"><div class="fio" style="margin-bottom:56px"></div>
   <h1 style="font-size:96px;text-wrap:balance">Cobrar <span class="ouro">o que vale</span> é profissionalismo.</h1></div>
   <div class="rodape"><span>Agenda cheia, cabeça leve.</span><span></span></div>`);

// 4. Stories do dia 11, sequência de 5 (1080x1920; texto dentro da área segura: 250 px em cima e 340 embaixo livres)
const S = { w: 1080, h: 1920, py: 260 };
add("stories-dia11-1", S.w, S.h, { ...S, classe: "ameixa" },
  `<div style="margin:auto 0"><h1 style="font-size:128px">Fiz uma conta que me <span class="ouro">assustou</span>.</h1>
   <p class="corpo" style="margin-top:56px;font-size:48px">3 faltas por mês &times; R$ 150</p>
   <p class="serif" style="font-size:96px;margin-top:20px;color:#e3c88f">R$ 5.400 por ano</p>
   <p class="rotulo" style="margin-top:32px;font-size:30px">Exemplo: troque pelo seu ticket.</p></div><div style="height:240px"></div>`);
add("stories-dia11-2", S.w, S.h, { ...S },
  `<div style="margin:auto 0"><h1 style="font-size:104px">Esse horário vazio custou <span class="ouro">R$ 150</span>.</h1>
   <div class="card" style="margin-top:64px"><div class="rotulo" style="margin-bottom:22px">Agenda de terça (exemplo)</div>
   <div class="linha"><span class="hora">09:00</span><div>Ana<small>Cílios fio a fio</small></div></div><div style="height:16px"></div>
   <div class="linha faltou"><span class="hora">11:00</span><div>Bia<small>Faltou, sem aviso</small></div></div><div style="height:16px"></div>
   <div class="linha vago"><span class="hora">14:00</span>horário perdido</div></div></div><div style="height:240px"></div>`);
add("stories-dia11-3", S.w, S.h, { ...S },
  `<div style="margin:auto 0"><h1 style="font-size:104px">Agora a cliente <span class="ouro">confirma sozinha</span>.</h1>
   <div class="balao" style="margin-top:64px;max-width:900px">Oi, Ana! Amanhã às 14h você tem seus cílios com a Bia. Confirma?</div>
   <div style="margin-top:36px;display:flex;gap:24px"><span class="botao b-ameixa">Confirmo</span><span class="botao b-contorno">Preciso remarcar</span></div></div><div style="height:240px"></div>`);
add("stories-dia11-4", S.w, S.h, { ...S, classe: "ameixa" },
  `<div style="margin:auto 0"><h1 style="font-size:128px">15 vagas no <span class="ouro">beta</span>.</h1>
   <p class="corpo" style="margin-top:48px;font-size:52px">Eu configuro tudo com você:</p>
   <div style="margin-top:36px;display:flex;flex-direction:column;gap:20px;align-items:flex-start">
   <span class="chip" style="background:transparent;color:#fbf5ec;border-color:rgba(227,200,143,.7)">Agenda e link de agendamento</span>
   <span class="chip" style="background:transparent;color:#fbf5ec;border-color:rgba(227,200,143,.7)">Lembrete com confirmação</span>
   <span class="chip" style="background:transparent;color:#fbf5ec;border-color:rgba(227,200,143,.7)">Importação das suas clientes</span></div></div><div style="height:240px"></div>`);
add("stories-dia11-5", S.w, S.h, { ...S },
  `<div style="margin:auto 0;text-align:center"><span class="logo" style="font-size:220px">Gê</span>
   <h1 style="font-size:112px;margin-top:20px">Quer uma <span class="ouro">vaga</span>?</h1>
   <p class="corpo" style="margin-top:48px;font-size:52px">Responda <b style="color:var(--ameixa)">EU QUERO</b> aqui no direct.</p></div><div style="height:240px"></div>`);

// 5. Capas de Reels (1080x1920; o título fica no miolo, longe das bordas)
add("reels-capa-dia01-ela-avisou", S.w, S.h, { ...S, classe: "ameixa" },
  `<div style="margin:auto 0"><div class="fio" style="background:var(--dourado-cl);margin-bottom:56px"></div>
   <h1 style="font-size:136px">Ela avisou 10 minutos antes que <span class="ouro">não vem</span>.</h1></div><div style="height:240px"></div>`);
add("reels-capa-dia04-cliente-marcando", S.w, S.h, { ...S },
  `<div style="margin:auto 0"><h1 style="font-size:128px">Veja uma cliente <span class="ouro">marcando sozinha</span>.</h1>
   <div style="margin-top:64px;display:flex;gap:20px;flex-wrap:wrap"><span class="chip">09:00</span><span class="chip" style="background:var(--ameixa);color:#fff;border-color:var(--ameixa)">10:30</span><span class="chip">14:00</span><span class="chip">16:30</span></div></div><div style="height:240px"></div>`);

// ---------- Escreve os HTMLs e renderiza os PNGs ----------
const navegador = await chromium.launch();
for (const p of pecas) {
  const arquivo = join(FONTE, `${p.nome}.html`);
  writeFileSync(arquivo, p.html);
  const pg = await navegador.newPage({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: 1 });
  await pg.goto(pathToFileURL(arquivo).href);
  await pg.evaluate(() => document.fonts.ready);
  await pg.screenshot({ path: join(PNG, `${p.nome}.png`) });
  // confere se o conteúdo coube na tela (nada cortado)
  const estouro = await pg.evaluate(() => [...document.querySelectorAll(".pag *")].some((e) => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 || r.bottom > innerHeight + 1; }));
  if (estouro) console.log("⚠ conteúdo passa da borda em", p.nome);
  await pg.close();
}
await navegador.close();
console.log(`${pecas.length} peças geradas em ${PNG}`);

// ---------- Visualizador (um único HTML, com tudo embutido: abre com duplo clique, sem internet) ----------
import { readFileSync } from "node:fs";
const b64 = (arq, tipo) => `data:${tipo};base64,${readFileSync(arq).toString("base64")}`;
const GRUPOS = [
  { titulo: "Foto de perfil", nota: "Instagram e TikTok recortam em círculo; o “Gê” já fica no meio.", tam: "1080 × 1080", prefixo: "01-" },
  { titulo: "Carrossel do dia 2: 5 jeitos de reduzir falta", nota: "7 telas: capa, os 5 jeitos e o fechamento. Poste na ordem.", tam: "1080 × 1350", prefixo: "carrossel-" },
  { titulo: "Post do dia 12", nota: "“Cobrar o que vale é profissionalismo.”", tam: "1080 × 1350", prefixo: "post-" },
  { titulo: "Stories do dia 11: convite para o beta", nota: "Sequência de 5. “15 vagas” só vale se o beta existir; R$ 150 e 3 faltas são exemplo.", tam: "1080 × 1920", prefixo: "stories-" },
  { titulo: "Capas de Reels", nota: "Dia 1 e dia 4. O título fica no miolo, longe das bordas.", tam: "1080 × 1920", prefixo: "reels-" },
];
const arquivos = readdirSync(PNG).filter((f) => f.endsWith(".png")).sort((a, b) => a.localeCompare(b, "pt", { numeric: true }));
const secoes = GRUPOS.map((g) => {
  const itens = arquivos.filter((f) => f.startsWith(g.prefixo)).map((f) => ({ nome: f, src: b64(join(PNG, f), "image/png") }));
  const vertical = g.tam.endsWith("1920");
  return `<section><h2>${g.titulo}</h2><p class="nota">${g.nota} <span class="tam">${g.tam}</span></p>
  <div class="faixa ${vertical ? "vert" : ""}">${itens.map((i) => `<figure><button type="button" class="abrir" data-src="${i.nome}" aria-label="Ampliar ${i.nome}"><img src="${i.src}" alt="${i.nome.replace(".png", "").replace(/-/g, " ")}" loading="lazy"></button><figcaption><span>${i.nome.replace(".png", "")}</span><a class="baixar" href="#" download="${i.nome}">Baixar</a></figcaption></figure>`).join("")}</div></section>`;
}).join("\n");
const fonte = (arq, tipo) => b64(join(AQUI, "fontes", arq), tipo);
const visualizador = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gê · peças visuais</title>
<style>
@font-face{font-family:"Playfair Display";src:url(${fonte("PlayfairDisplay-latin-variavel.woff2", "font/woff2")}) format("woff2");font-weight:400 900}
@font-face{font-family:"Nunito";src:url(${fonte("Nunito-latin-variavel.woff2", "font/woff2")}) format("woff2");font-weight:200 1000}
@font-face{font-family:"Allura";src:url(${fonte("Allura-latin.woff2", "font/woff2")}) format("woff2")}
:root{--creme:#f6f3ee;--ameixa:#642350;--dourado:#b28e52;--tinta:#1e1a17;--suave:#52463f;--fio:rgba(178,142,82,.5)}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Nunito,system-ui,sans-serif;background:var(--creme);color:var(--tinta);-webkit-font-smoothing:antialiased}
header{padding:40px 24px 8px;max-width:1240px;margin:0 auto}
.logo{font-family:Allura,cursive;font-size:64px;line-height:1;color:var(--ameixa)}
header h1{font-family:"Playfair Display",serif;font-size:34px;margin-top:6px}
header p{color:var(--suave);margin-top:8px;max-width:720px;line-height:1.5}
main{max-width:1240px;margin:0 auto;padding:8px 24px 64px}
section{margin-top:44px}
h2{font-family:"Playfair Display",serif;font-size:26px;font-weight:700}
.nota{color:var(--suave);margin:6px 0 16px;line-height:1.5}.tam{display:inline-block;margin-left:6px;padding:2px 10px;border:1px solid var(--fio);border-radius:999px;font-size:13px;font-weight:700;color:var(--ameixa);background:#fff}
.faixa{display:flex;gap:18px;overflow-x:auto;padding:4px 2px 16px;scroll-snap-type:x proximity}
figure{flex:0 0 auto;width:260px;scroll-snap-align:start}
.faixa.vert figure{width:200px}
.abrir{display:block;width:100%;border:0;padding:0;background:none;cursor:zoom-in;border-radius:14px;overflow:hidden;box-shadow:0 18px 40px -26px rgba(100,35,80,.55);outline-offset:3px}
.abrir:focus-visible{outline:3px solid var(--ameixa)}
img{display:block;width:100%;height:auto}
figcaption{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:10px;font-size:13px;color:var(--suave)}
.baixar{color:var(--ameixa);font-weight:800;text-decoration:underline;white-space:nowrap}
.lb{position:fixed;inset:0;background:rgba(30,26,23,.88);display:none;align-items:center;justify-content:center;z-index:10;padding:24px}
.lb.on{display:flex}.lb img{max-height:92vh;max-width:min(92vw,720px);width:auto;border-radius:12px}
.lb button{position:absolute;border:0;background:#fff;color:var(--ameixa);font-size:28px;font-weight:800;width:52px;height:52px;border-radius:50%;cursor:pointer}
.lb .x{top:18px;right:18px}.lb .p{left:14px;top:50%}.lb .n{right:14px;top:50%}
footer{max-width:1240px;margin:0 auto;padding:0 24px 40px;color:var(--suave);font-size:14px;line-height:1.6}
@media(max-width:600px){figure{width:210px}.faixa.vert figure{width:170px}header h1{font-size:28px}}
</style></head><body>
<header><div class="logo">Gê</div><h1>Peças visuais para Instagram e TikTok</h1>
<p>Toque em uma imagem para ampliar; use as setas do teclado ou os botões para passar. “Baixar” salva a imagem no tamanho original. Nada daqui foi publicado: publicar depende da sua aprovação.</p></header>
<main>${secoes}</main>
<footer>Textos do calendário de 30 dias. Nomes e valores nas imagens são exemplos. Para mudar um texto, edite <code>gerar.mjs</code> e rode de novo (veja o LEIA-ME).</footer>
<div class="lb" id="lb" role="dialog" aria-modal="true" aria-label="Imagem ampliada"><button class="x" aria-label="Fechar">&times;</button><button class="p" aria-label="Anterior">&lsaquo;</button><img alt=""><button class="n" aria-label="Próxima">&rsaquo;</button></div>
<script>
const imgs=[...document.querySelectorAll(".abrir img")],lb=document.getElementById("lb"),big=lb.querySelector("img");let i=0;
const show=n=>{i=(n+imgs.length)%imgs.length;big.src=imgs[i].src;big.alt=imgs[i].alt;lb.classList.add("on")};
imgs.forEach((im,k)=>{im.parentElement.addEventListener("click",()=>show(k));im.closest("figure").querySelector(".baixar").href=im.src});
lb.querySelector(".x").onclick=()=>lb.classList.remove("on");lb.querySelector(".p").onclick=()=>show(i-1);lb.querySelector(".n").onclick=()=>show(i+1);
lb.addEventListener("click",e=>{if(e.target===lb)lb.classList.remove("on")});
addEventListener("keydown",e=>{if(!lb.classList.contains("on"))return;if(e.key==="Escape")lb.classList.remove("on");if(e.key==="ArrowLeft")show(i-1);if(e.key==="ArrowRight")show(i+1)});
</script></body></html>`;
writeFileSync(join(AQUI, "visualizar.html"), visualizador);
console.log("Visualizador: materiais-comerciais/visual/visualizar.html");
