/**
 * Tokens da identidade BSS (fonte: app principal, src/app/globals.css — tema "Gê / Royal Violet").
 * Este arquivo é a referência em TypeScript (usada pelos PDFs); theme.css expõe os mesmos valores
 * como variáveis CSS para o Tailwind. Um teste garante que os dois não divergem.
 * Trocar a identidade = trocar os valores aqui e em theme.css (ver README).
 */
export type Palette = {
  fundo: string; superficie: string; superficieAlta: string; afundado: string;
  borda: string; bordaForte: string;
  texto: string; textoSuave: string; textoApoio: string;
  primaria: string; primariaEscura: string; primariaTexto: string; primariaSuave: string;
  secundaria: string; sucesso: string; alerta: string; erro: string;
};

export const bss = {
  /** Padrão do BSS: escuro (ameixa rosé, suave). */
  escuro: {
    fundo: "#1a1418", superficie: "#221b21", superficieAlta: "#2b222a", afundado: "#1e181d",
    borda: "#352a33", bordaForte: "#4c3d4a",
    texto: "#fbf5f8", textoSuave: "#e8dce3", textoApoio: "#b9a6b2",
    primaria: "#d898bb", primariaEscura: "#a05a83", primariaTexto: "#ebbcd4", primariaSuave: "#35252f",
    secundaria: "#c7a3dc", sucesso: "#82d1aa", alerta: "#ecc483", erro: "#f4a3b4",
  } satisfies Palette,
  /** Opção do BSS: claro (contraste AA ou melhor sobre branco). */
  claro: {
    fundo: "#fdf8fa", superficie: "#ffffff", superficieAlta: "#ffffff", afundado: "#f9eff4",
    borda: "#f2e4eb", bordaForte: "#e6d0dc",
    texto: "#2a1c24", textoSuave: "#57434f", textoApoio: "#75616d",
    primaria: "#c4829f", primariaEscura: "#a05a83", primariaTexto: "#93507a", primariaSuave: "#fbedf4",
    secundaria: "#9b7bb8", sucesso: "#1f6b48", alerta: "#8a5800", erro: "#b4233f",
  } satisfies Palette,
  /** Degradê da marca (blocos de cor forte: capa, localização, botão principal). */
  degrade: ["#4a2c45", "#6a3f62", "#87527c", "#9a5f8d"] as const,
  botao: ["#c4829f", "#a05a83", "#8a4b72"] as const,
  /** Texto e traços sobre o degradê da marca (iguais nos dois temas). */
  sobreMarca: "#ffffff",
  sobreMarcaSuave: "#f7e4ee",
  fontes: { titulo: "Cormorant Garamond", corpo: "DM Sans", assinatura: "Allura" },
  /** Escala tipográfica em px. */
  escala: { xs: 12, sm: 13, base: 15, md: 17, lg: 22, xl: 28, "2xl": 36 },
  raio: { card: 24, botao: 999, pilula: 999 },
} as const;

export type Tema = "escuro" | "claro";
