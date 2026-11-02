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
  /** Padrão: nude rosé com acento vinho (as cores das unhas do studio). Mantém a chave "escuro" por compatibilidade. */
  escuro: {
    fundo: "#f6ece6", superficie: "#fdf7f3", superficieAlta: "#fffaf7", afundado: "#f0e1d9",
    borda: "#e9d2c7", bordaForte: "#d7ad9d",
    texto: "#2c1c1e", textoSuave: "#573e41", textoApoio: "#6f5558",
    primaria: "#a24d5d", primariaEscura: "#7d3344", primariaTexto: "#86394a", primariaSuave: "#f5e2e2",
    secundaria: "#dba79f", sucesso: "#2a6440", alerta: "#8a5800", erro: "#ad1f3a",
  } satisfies Palette,
  /** Opção: claro, quase branco (contraste AA ou melhor sobre branco). */
  claro: {
    fundo: "#fcf8f6", superficie: "#ffffff", superficieAlta: "#ffffff", afundado: "#f7eeea",
    borda: "#f1e3dc", bordaForte: "#e3c3b6",
    texto: "#2c1c1e", textoSuave: "#5d4447", textoApoio: "#765c5f",
    primaria: "#a24d5d", primariaEscura: "#7d3344", primariaTexto: "#7d3344", primariaSuave: "#f8e9e8",
    secundaria: "#dba79f", sucesso: "#2f6b45", alerta: "#8a5800", erro: "#b4233f",
  } satisfies Palette,
  /** Degradê rosé-vinho da marca (blocos de cor: agenda, localização, botão). O 1º tom é só o brilho do canto. */
  degrade: ["#c97b84", "#a24d5d", "#8e3e4f", "#7a3243"] as const,
  botao: ["#c97b84", "#a24d5d", "#843a4b"] as const,
  /** Texto e traços sobre o degradê da marca (iguais nos dois temas). */
  sobreMarca: "#ffffff",
  sobreMarcaSuave: "#fff6f3",
  fontes: { titulo: "Cormorant Garamond", corpo: "DM Sans", assinatura: "Allura" },
  /** Escala tipográfica em px. */
  escala: { xs: 12, sm: 13, base: 15, md: 17, lg: 22, xl: 28, "2xl": 36 },
  raio: { card: 24, botao: 999, pilula: 999 },
} as const;

export type Tema = "escuro" | "claro";
