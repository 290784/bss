/**
 * Gera os ícones PNG do app (PWA) e a imagem de compartilhamento a partir de public/brand/icone.svg
 * e dos dados do studio. Uso: npm run icons (requer Playwright/Chromium instalado na máquina).
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const svg = readFileSync("public/brand/icone.svg", "utf8");
const studioSrc = readFileSync("src/data/studio.ts", "utf8");
const nome = studioSrc.match(/nome: "([^"]+)"/)?.[1] ?? "Studio";
const subtitulo = studioSrc.match(/subtitulo: "([^"]+)"/)?.[1] ?? "";
const cidade = studioSrc.match(/cidade: "([^"]+)"/)?.[1] ?? "";

const b = await chromium.launch();
const p = await b.newPage();
async function png(html, w, h, file) {
  await p.setViewportSize({ width: w, height: h });
  await p.setContent(`<html><body style="margin:0">${html}</body></html>`);
  writeFileSync(file, await p.screenshot({ type: "png", omitBackground: false }));
  console.log("✔", file);
}
const icone = (s, pad = 0) => `<div style="width:${s}px;height:${s}px;display:grid;place-items:center;background:#f6efe2">
  <div style="width:${s - pad * 2}px;height:${s - pad * 2}px">${svg.replace("<svg ", `<svg width="${s - pad * 2}" height="${s - pad * 2}" `)}</div></div>`;
await png(icone(192), 192, 192, "public/brand/icon-192.png");
await png(icone(512), 512, 512, "public/brand/icon-512.png");
await png(icone(512, 56), 512, 512, "public/brand/icon-maskable-512.png");
await png(icone(180), 180, 180, "public/brand/apple-touch-icon.png");
const fonte = (pkg, f) => `data:font/woff;base64,${readFileSync(require.resolve(`@fontsource/${pkg}/files/${f}`)).toString("base64")}`;
await png(`<style>
  @font-face{font-family:T;src:url(${fonte("cormorant-garamond", "cormorant-garamond-latin-700-normal.woff")})}
  @font-face{font-family:C;src:url(${fonte("dm-sans", "dm-sans-latin-500-normal.woff")})}
</style>
<div style="width:1200px;height:630px;display:flex;align-items:center;gap:56px;padding:0 90px;box-sizing:border-box;color:#fff;
  background:linear-gradient(150deg,#c6a05b 0%,#946c2e 34%,#8a6426 66%,#7d5822 100%)">
  <div style="width:220px;height:220px;flex:none">${svg.replace("<svg ", '<svg width="220" height="220" ')}</div>
  <div><div style="font:700 80px/1.05 T">${nome}</div>
  <div style="font:500 32px/1.3 C;color:#fffbf4;margin-top:18px">${subtitulo}</div>
  <div style="font:500 28px/1.3 C;color:#fffbf4;margin-top:8px">${cidade}</div></div>
</div>`, 1200, 630, "public/brand/og.png");
await b.close();
