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
  /** Padrão do BSS: escuro (ameixa). */
  escuro: {
    fundo: "#150b28", superficie: "#1d1236", superficieAlta: "#271843", afundado: "#22153f",
    borda: "#35255a", bordaForte: "#4c3678",
    texto: "#f8f0ff", textoSuave: "#e4d5f6", textoApoio: "#b9a7d9",
    primaria: "#ab3df5", primariaEscura: "#780ac2", primariaTexto: "#d59efa", primariaSuave: "#2c1a52",
    secundaria: "#a21caf", sucesso: "#6fdba5", alerta: "#f6c26b", erro: "#ff8fa3",
  } satisfies Palette,
  /** Opção do BSS: claro (contraste AA ou melhor sobre branco). */
  claro: {
    fundo: "#f8f4fc", superficie: "#ffffff", superficieAlta: "#ffffff", afundado: "#f2ebfa",
    borda: "#e7ddf3", bordaForte: "#d3c3e8",
    texto: "#1d1230", textoSuave: "#43355c", textoApoio: "#66587e",
    primaria: "#960df2", primariaEscura: "#780ac2", primariaTexto: "#7410b8", primariaSuave: "#f5ecff",
    secundaria: "#a21caf", sucesso: "#0f6e42", alerta: "#8a5800", erro: "#b4233f",
  } satisfies Palette,
  /** Degradê da marca (blocos de cor forte: capa, localização, botão principal). */
  degrade: ["#2a0c4c", "#470f78", "#7212b4", "#a21caf"] as const,
  botao: ["#ab3df5", "#960df2", "#780ac2"] as const,
  /** Texto e traços sobre o degradê da marca (iguais nos dois temas). */
  sobreMarca: "#ffffff",
  sobreMarcaSuave: "#eacffc",
  fontes: { titulo: "Inter Tight", corpo: "DM Sans", assinatura: "Allura" },
  /** Escala tipográfica em px. */
  escala: { xs: 12, sm: 13, base: 15, md: 17, lg: 22, xl: 28, "2xl": 36 },
  raio: { card: 22, botao: 12, pilula: 999 },
} as const;

export type Tema = "escuro" | "claro";
