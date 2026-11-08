/** Origem do cadastro: código do canal (?c=ig-bio) e resposta de "como conheceu a Gê". Sem dados pessoais. */
export const CONHECEU = [
  { id: "instagram", label: "Instagram" },
  { id: "indicacao", label: "Indicação de uma colega" },
  { id: "whatsapp", label: "Mensagem no WhatsApp" },
  { id: "google", label: "Busca no Google" },
  { id: "evento", label: "Evento ou curso" },
  { id: "outro", label: "Outro" },
] as const;

export type Conheceu = (typeof CONHECEU)[number]["id"];

/** Aceita só letras minúsculas, números, hífen e sublinhado (até 40); qualquer outra coisa vira null. */
export function normalizeCanal(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9_-]{0,39}$/.test(v) ? v : null;
}

export function normalizeConheceu(raw: unknown): Conheceu | null {
  return CONHECEU.find((c) => c.id === raw)?.id ?? null;
}
