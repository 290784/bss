/**
 * Preço depois de um reajuste: aplica a porcentagem e arredonda para cima no múltiplo escolhido
 * (ex.: 500 = R$ 5,00). Sem arredondamento (0), só arredonda o centavo.
 */
export function adjustedPrice(cents: number, percent: number, roundTo: number) {
  const raw = cents * (1 + percent / 100);
  return roundTo > 0 ? Math.max(roundTo, Math.ceil(raw / roundTo - 1e-9) * roundTo) : Math.round(raw);
}

/** Quanto o serviço rende por hora de agenda ocupada (atendimento + preparo). */
export function perHour(priceCents: number, minutes: number, bufferMinutes = 0) {
  const total = minutes + bufferMinutes;
  return total > 0 ? Math.round((priceCents / total) * 60) : 0;
}
