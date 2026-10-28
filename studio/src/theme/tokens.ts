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
  /** Padrão do BSS: escuro (grafite lavanda, suave). */
  escuro: {
    fundo: "#16131b", superficie: "#1d1a23", superficieAlta: "#25212d", afundado: "#1a1720",
    borda: "#2d2836", bordaForte: "#3f384c",
    texto: "#f6f3f9", textoSuave: "#ddd6e6", textoApoio: "#aca3ba",
    primaria: "#a993d6", primariaEscura: "#7861aa", primariaTexto: "#c8b6e6", primariaSuave: "#29233a",
    secundaria: "#c39ac0", sucesso: "#82d1aa", alerta: "#e8c27f", erro: "#f0a3b0",
  } satisfies Palette,
  /** Opção do BSS: claro (contraste AA ou melhor sobre branco). */
  claro: {
    fundo: "#fbfafc", superficie: "#ffffff", superficieAlta: "#ffffff", afundado: "#f5f2f8",
    borda: "#ece7f1", bordaForte: "#ddd5e6",
    texto: "#1f1a26", textoSuave: "#4a4256", textoApoio: "#6b6378",
    primaria: "#8d76bf", primariaEscura: "#7861aa", primariaTexto: "#6a4f9c", primariaSuave: "#f3eefa",
    secundaria: "#a8789f", sucesso: "#1f6b48", alerta: "#8a5800", erro: "#b4233f",
  } satisfies Palette,
  /** Degradê da marca (blocos de cor forte: capa, localização, botão principal). */
  degrade: ["#3a3150", "#4d4269", "#615584", "#73659a"] as const,
  botao: ["#8d76bf", "#7861aa", "#665096"] as const,
  /** Texto e traços sobre o degradê da marca (iguais nos dois temas). */
  sobreMarca: "#ffffff",
  sobreMarcaSuave: "#ece4f7",
  fontes: { titulo: "Inter Tight", corpo: "DM Sans", assinatura: "Allura" },
  /** Escala tipográfica em px. */
  escala: { xs: 12, sm: 13, base: 15, md: 17, lg: 22, xl: 28, "2xl": 36 },
  raio: { card: 22, botao: 12, pilula: 999 },
} as const;

export type Tema = "escuro" | "claro";
