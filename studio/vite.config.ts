/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { studio } from "./src/data/studio";

/** Endereço público (para Open Graph, canonical e sitemap). Na Vercel vem do domínio de produção. */
const SITE = (process.env.SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "")).replace(/\/$/, "");
const ROTAS = [
  { caminho: "/", seo: studio.seo.links },
  { caminho: "/agendar", seo: studio.seo.agendar },
  { caminho: "/manual", seo: studio.seo.manual },
  { caminho: "/guia", seo: studio.seo.guia },
] as const;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** Canonical, og:url e og:image exigem endereço absoluto: só entram quando SITE estiver definido. */
function metas(caminho: string) {
  return [
    ...(SITE ? [
      `<link rel="canonical" href="${esc(SITE + caminho)}" />`,
      `<meta property="og:url" content="${esc(SITE + caminho)}" />`,
      `<meta property="og:image" content="${esc(`${SITE}/brand/og.png`)}" />`,
      `<meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" />`,
    ] : []),
    `<meta property="og:site_name" content="${esc(studio.marca.nome)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ].join("\n    ");
}

/**
 * SEO sem servidor: cada rota ganha seu próprio index.html com título, descrição e Open Graph
 * (o preview do link no WhatsApp/Instagram não executa JavaScript). Também gera robots.txt e sitemap.xml.
 */
function seoEstatico(): Plugin {
  const aplicar = (html: string, caminho: string, titulo: string, descricao: string) =>
    html.replaceAll("__STUDIO_TITLE__", esc(titulo)).replaceAll("__STUDIO_DESCRIPTION__", esc(descricao))
      .replace("</head>", `  ${metas(caminho)}\n  </head>`);
  return {
    name: "studio-seo-estatico",
    transformIndexHtml: { order: "pre", handler: (html) => aplicar(html, "/", studio.seo.links.titulo, studio.seo.links.descricao) },
    apply: "build",
    // writeBundle do build principal (o do service worker não tem index.html).
    writeBundle(opts, bundle) {
      const saida = opts.dir ?? "dist";
      const item = bundle["index.html"];
      if (!item || item.type !== "asset") return;
      const base = typeof item.source === "string" ? item.source : Buffer.from(item.source).toString("utf8");
      for (const r of ROTAS.slice(1)) {
        const html = base
          .replace(/<title>[^<]*<\/title>/, `<title>${esc(r.seo.titulo)}</title>`)
          .replace(/(<meta name="description" content=")[^"]*/, `$1${esc(r.seo.descricao)}`)
          .replace(/(<meta property="og:title" content=")[^"]*/, `$1${esc(r.seo.titulo)}`)
          .replace(/(<meta property="og:description" content=")[^"]*/, `$1${esc(r.seo.descricao)}`)
          .replace(/(<link rel="canonical" href=")[^"]*/, `$1${esc(SITE + r.caminho)}`)
          .replace(/(<meta property="og:url" content=")[^"]*/, `$1${esc(SITE + r.caminho)}`);
        // /agendar.html (URL limpa /agendar) e /agendar/index.html (com barra no final).
        writeFileSync(`${saida}${r.caminho}.html`, html);
        mkdirSync(`${saida}${r.caminho}`, { recursive: true });
        writeFileSync(`${saida}${r.caminho}/index.html`, html);
      }
      // 404.html: a Vercel serve este arquivo (com status 404) para endereços que não existem;
      // o app abre e mostra a página "Página não encontrada" do studio.
      writeFileSync(`${saida}/404.html`, base
        .replace(/<title>[^<]*<\/title>/, `<title>Página não encontrada · ${esc(studio.marca.nome)}</title>`)
        .replace(/\s*<link rel="canonical"[^>]*>/, "")
        .replace("<head>", '<head>\n    <meta name="robots" content="noindex" />'));
      writeFileSync(`${saida}/robots.txt`, `User-agent: *\nAllow: /\n${SITE ? `Sitemap: ${SITE}/sitemap.xml\n` : ""}`);
      if (SITE)
        writeFileSync(`${saida}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${ROTAS.map((r) => `  <url><loc>${SITE}${r.caminho}</loc></url>`).join("\n")}\n</urlset>\n`);
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    seoEstatico(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      includeAssets: ["brand/icone.svg", "brand/apple-touch-icon.png", "img/*.svg"],
      manifest: {
        name: studio.marca.nome,
        short_name: studio.marca.nome.replace(/^Studio /, ""),
        description: studio.seo.links.descricao,
        lang: "pt-BR",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#150b28",
        theme_color: "#150b28",
        icons: [
          { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/brand/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
          { name: "Agende aqui!", url: "/agendar" },
          { name: "Manual de Agendamento", url: "/manual" },
          { name: "Guia de Cuidados", url: "/guia" },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // O gerador de PDF é grande e só é usado sob demanda: fica fora do pré-cache.
        globIgnores: ["**/gerar-*.js", "**/og.png", "**/*.woff"],
        runtimeCaching: [{ urlPattern: /\/assets\/gerar-.*\.js$/, handler: "CacheFirst", options: { cacheName: "pdf" } }],
      },
    }),
  ],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node", include: ["src/**/*.test.ts", "src/**/*.test.tsx"], server: { deps: { inline: [/@react-pdf/] } } },
});
