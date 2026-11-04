import { describe, expect, it } from "vitest";
import { classifyReply, type Intent } from "@/server/modules/whatsapp";

/**
 * Como a automação entende o que a cliente escreve. Regra de ouro: na dúvida, vai para a profissional ("other"),
 * nunca o contrário: uma resposta mal entendida (ex.: tratar “não preciso remarcar” como pedido de remarcação)
 * faz a automação agir errado em nome da profissional.
 */
const casos: [string, Intent][] = [
  // confirmar
  ["Confirmo", "confirm"], ["confirmado!", "confirm"], ["Confirmada", "confirm"], ["ok", "confirm"], ["Ok 😊", "confirm"], ["blz", "confirm"],
  ["beleza", "confirm"], ["combinado", "confirm"], ["estarei aí", "confirm"], ["tá bom", "confirm"], ["tá", "confirm"], ["vou sim", "confirm"], ["certo", "confirm"],
  // aceitar a oferta
  ["sim", "yes"], ["SIM!", "yes"], ["s", "yes"], ["quero", "yes"], ["pode sim", "yes"], ["bora", "yes"], ["claro", "yes"], ["aceito", "yes"], ["fechado", "yes"],
  ["com certeza", "yes"], ["👍", "yes"], ["👍🏽", "yes"], ["✅", "yes"], ["💜", "yes"],
  // recusar
  ["não", "no"], ["Nao", "no"], ["n", "no"], ["agora não", "no"], ["hoje não", "no"], ["não quero", "no"], ["não, obrigada", "no"], ["dispenso", "no"],
  // remarcar / cancelar de verdade
  ["preciso remarcar", "reschedule"], ["Quero remarcar", "reschedule"], ["vou ter que desmarcar", "reschedule"], ["pode cancelar", "reschedule"],
  ["não vou conseguir ir", "reschedule"], ["não posso ir", "reschedule"], ["amanhã não dá", "reschedule"], ["pode ser outro dia?", "reschedule"],
  ["outro horário?", "reschedule"], ["tive um imprevisto", "reschedule"],
  // fora do roteiro: a profissional responde
  ["", "other"], ["   ", "other"], ["oi", "other"], ["bom dia!", "other"], ["obrigada", "other"], ["kkk", "other"], ["😊", "other"],
  ["Posso levar minha filha junto? Ela quer fazer também", "other"], ["qual o endereço mesmo?", "other"], ["quanto custa o gel?", "other"],
  ["Confirmo, mas posso chegar 10 minutos atrasada?", "other"],
];

describe("respostas claras", () => {
  it.each(casos)("“%s” → %s", (texto, esperado) => expect(classifyReply(texto)).toBe(esperado));
});

describe("negação não vira pedido de remarcação (vai para a profissional)", () => {
  it.each([
    "não preciso remarcar", "não vou cancelar", "não precisa cancelar", "não quero desmarcar", "sem imprevistos, confirmo",
    "não tenho imprevisto nenhum", "ainda bem que não vou precisar remarcar", "não vou faltar",
  ])("“%s” não é remarcar", (texto) => expect(classifyReply(texto)).not.toBe("reschedule"));
});

describe("resposta com ressalva vai para a profissional, não vira “sim” automático", () => {
  it.each([
    "sim, mas chego atrasada", "confirmo, só que vou com uma amiga", "quero, porém só tenho 20 minutos", "pode, desde que seja rápido",
  ])("“%s” → other", (texto) => expect(classifyReply(texto)).toBe("other"));
});

describe("botões valem mais que o texto", () => {
  it.each<[string, string, Intent]>([
    ["", "confirm", "confirm"], ["não", "confirm", "confirm"], ["sim", "reschedule", "reschedule"], ["", "offer_yes", "yes"], ["sim", "offer_no", "no"],
  ])("texto “%s” + botão %s → %s", (texto, botao, esperado) => expect(classifyReply(texto, botao)).toBe(esperado));
  it("botão desconhecido cai no entendimento do texto", () => expect(classifyReply("sim", "algo_novo")).toBe("yes"));
});
