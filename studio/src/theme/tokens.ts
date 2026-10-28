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
  /** Padrão: champanhe (dourado do Manual original). Mantém a chave "escuro" por compatibilidade. */
  escuro: {
    fundo: "#f6efe2", superficie: "#fdf8ef", superficieAlta: "#fffbf3", afundado: "#f1e7d5",
    borda: "#e8d6b3", bordaForte: "#d6bb87",
    texto: "#2e261e", textoSuave: "#55493d", textoApoio: "#6e6152",
    primaria: "#b08743", primariaEscura: "#8a6426", primariaTexto: "#83601f", primariaSuave: "#f3e8d2",
    secundaria: "#d4b483", sucesso: "#2a6440", alerta: "#8a5800", erro: "#ad1f3a",
  } satisfies Palette,
  /** Opção: marfim, mais claro (contraste AA ou melhor sobre branco). */
  claro: {
    fundo: "#fbf8f2", superficie: "#ffffff", superficieAlta: "#ffffff", afundado: "#f6f0e4",
    borda: "#efe5d3", bordaForte: "#e0cca5",
    texto: "#2e261e", textoSuave: "#5a4e42", textoApoio: "#75685a",
    primaria: "#b08743", primariaEscura: "#8a6426", primariaTexto: "#8a6426", primariaSuave: "#f7eedc",
    secundaria: "#d4b483", sucesso: "#2f6b45", alerta: "#8a5800", erro: "#b4233f",
  } satisfies Palette,
  /** Degradê dourado da marca (blocos de cor: agenda, localização, botão). O 1º tom é só o brilho do canto. */
  degrade: ["#c6a05b", "#946c2e", "#8a6426", "#7d5822"] as const,
  botao: ["#c6a05b", "#946c2e", "#835c22"] as const,
  /** Texto e traços sobre o degradê da marca (iguais nos dois temas). */
  sobreMarca: "#ffffff",
  sobreMarcaSuave: "#fffbf4",
  fontes: { titulo: "Cormorant Garamond", corpo: "DM Sans", assinatura: "Allura" },
  /** Escala tipográfica em px. */
  escala: { xs: 12, sm: 13, base: 15, md: 17, lg: 22, xl: 28, "2xl": 36 },
  raio: { card: 24, botao: 999, pilula: 999 },
} as const;

export type Tema = "escuro" | "claro";
