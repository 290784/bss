import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { bss, type Palette } from "./tokens";

/** tokens.ts (PDFs) e theme.css (site) precisam ter as mesmas cores do BSS. */
const css = readFileSync(new URL("./theme.css", import.meta.url), "utf8");
const bloco = (inicio: string) => css.slice(css.indexOf(inicio), css.indexOf("}", css.indexOf(inicio)));
const kebab = (k: string) => k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
const cor = (trecho: string, nome: string) => trecho.match(new RegExp(`--color-${nome}:\\s*(#[0-9a-f]{6})`, "i"))?.[1]?.toLowerCase();

describe("tokens BSS: TS × CSS", () => {
  for (const [tema, inicio] of [["escuro", "@theme {"], ["claro", '[data-theme="claro"] {']] as const) {
    it(`tema ${tema}`, () => {
      const trecho = bloco(inicio);
      for (const [k, v] of Object.entries(bss[tema] as Palette)) expect([k, cor(trecho, kebab(k))]).toEqual([k, v.toLowerCase()]);
    });
  }
  it("raio dos cartões e botões", () => {
    expect(css).toContain(`--radius-card: ${bss.raio.card}px`);
    expect(css).toContain(`--radius-botao: ${bss.raio.botao}px`);
  });
});

/** Contraste WCAG AA (4,5:1 para texto normal) nos dois temas. */
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contraste = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x! + 0.05) / (y! + 0.05); };

describe("contraste AA", () => {
  for (const tema of ["escuro", "claro"] as const) {
    const p = bss[tema];
    for (const fundo of ["fundo", "superficie", "afundado"] as const)
      for (const texto of ["texto", "textoSuave", "textoApoio", "primariaTexto", "sucesso", "erro"] as const)
        it(`${tema}: ${texto} sobre ${fundo} ≥ 4,5`, () => expect(contraste(p[texto], p[fundo])).toBeGreaterThanOrEqual(4.5));
    it(`${tema}: primariaTexto sobre primariaSuave ≥ 4,5`, () => expect(contraste(p.primariaTexto, p.primariaSuave)).toBeGreaterThanOrEqual(4.5));
  }
  it("texto sobre o degradê da marca e sobre o botão ≥ 4,5", () => {
    for (const c of [...bss.degrade.slice(1), ...bss.botao.slice(1)]) expect(contraste(bss.sobreMarca, c)).toBeGreaterThanOrEqual(4.5);
    // O 1º tom do degradê é só o brilho do canto (sem texto em cima).
    for (const c of bss.degrade.slice(1, 3)) expect(contraste(bss.sobreMarcaSuave, c)).toBeGreaterThanOrEqual(4.5);
  });
});
