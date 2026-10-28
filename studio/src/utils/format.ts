/** "R$ 140,00" */
export function formatarPreco(centavos: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(centavos / 100).replace(/\u00a0/g, " ");
}
/** "140,00" (sem o símbolo — usado em frases como "R$ {valor}") */
export function formatarValor(centavos: number) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(centavos / 100);
}
/** "120 min" */
export function formatarDuracao(min: number) {
  return `${min} min`;
}
