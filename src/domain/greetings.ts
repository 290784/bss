/**
 * Saudações do painel. As frases são fixas (não editar o texto) e a posição de cada uma é gravada no banco:
 * para acrescentar novas, só no final da lista, sem reordenar. O limite da coluna (0 a 7) acompanha o tamanho.
 */
export const GREETINGS = [
  "Bom dia, visionária! ✨",
  "Bom dia, patroa! Hoje é dia de fazer acontecer!",
  "E aí, empreendedora! Pronta pra mais um dia de conquistas?",
  "Bom dia, CEO da beleza! 💅",
  "Fala, poderosa! Seu negócio não para!",
  "Bom dia, chefinha! Bora transformar trabalho em resultado?",
  "Bom diaa! Mais um dia pra crescer!",
  "Bom dia, dona do seu sucesso!",
] as const;

/**
 * Sorteia a posição de uma saudação, nunca igual à anterior (para não repetir em dias seguidos).
 * `random` devolve um número em [0, 1): vem de fora para o teste poder controlar o sorteio.
 */
export function pickGreetingIndex(previous: number | null, random: () => number = Math.random): number {
  const pool = GREETINGS.map((_, i) => i).filter((i) => i !== previous);
  const r = Math.min(Math.max(random(), 0), 0.999999999);
  return pool[Math.floor(r * pool.length)]!;
}

/** Parte do dia no horário local: 5h às 11h59 manhã, 12h às 17h59 tarde, o resto noite (madrugada inclusa). */
export function periodoDoDia(hour: number): "dia" | "tarde" | "noite" {
  return hour >= 5 && hour < 12 ? "dia" : hour >= 12 && hour < 18 ? "tarde" : "noite";
}

/**
 * Ajusta o "Bom dia" da frase para a hora local (Bom dia, Boa tarde ou Boa noite). As frases gravadas no banco
 * continuam as mesmas; só o texto mostrado muda. O alongamento ("Bom diaa") vira "Boa tardee" / "Boa noitee".
 * Frases sem "Bom dia" (como "Fala, poderosa!") ficam como estão.
 */
export function saudacaoDoHorario(frase: string, hour: number): string {
  const p = periodoDoDia(hour);
  return frase.replace(/^Bom dia(a*)/, (_, extra: string) => {
    const base = p === "dia" ? "Bom dia" : p === "tarde" ? "Boa tarde" : "Boa noite";
    return base + base.slice(-1).repeat(extra.length);
  });
}
