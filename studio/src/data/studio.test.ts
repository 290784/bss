import { describe, expect, it } from "vitest";
import { studio } from "./studio";
import { formatarPreco } from "@/utils/format";

/** O conteúdo tem de bater com a referência (seção 5 da especificação). */
describe("conteúdo do studio (seed)", () => {
  it("3 links na ordem certa", () => {
    expect(studio.links.map((l) => [l.titulo, l.rota, l.paginas ?? null])).toEqual([
      ["Manual de Agendamento", "/manual", 7], ["Agende aqui!", "/agendar", null], ["Guia de Cuidados", "/guia", 4],
    ]);
  });
  it("7 serviços com duração, valor e profissional", () => {
    expect(studio.agendamento.servicos.map((s) => [s.nome, s.duracaoMin, formatarPreco(s.precoCentavos)])).toEqual([
      ["Aplicação", 120, "R$ 140,00"], ["Manutenção", 90, "R$ 100,00"], ["Manutenção (outro profissional)", 90, "R$ 115,00"],
      ["Banho de gel", 90, "R$ 100,00"], ["Banho de Gel (outra profissional)", 90, "R$ 115,00"],
      ["Esmaltação em gel em unhas naturais", 90, "R$ 85,00"], ["Remoção", 60, "R$ 35,00"],
    ]);
    for (const s of studio.agendamento.servicos)
      for (const p of s.profissionais) expect(studio.agendamento.profissionais.some((x) => x.id === p)).toBe(true);
  });
  it("tabela com 9 valores e as 3 notas", () => {
    expect(studio.valores.itens.map((v) => [v.nome, formatarPreco(v.precoCentavos)])).toEqual([
      ["Alongamento", "R$ 140,00"], ["Manutenção", "R$ 100,00"], ["Banho de Gel", "R$ 100,00"], ["Esmaltação em Gel no pé", "R$ 60,00"],
      ["Baby Boomer", "R$ 15,00"], ["Borda Camuflada", "R$ 20,00"], ["Pó Cromado", "R$ 10,00"], ["Baby Glitter ou Color", "R$ 10,00"],
      ["Troca de Formato", "R$ 15,00"],
    ]);
    expect(studio.valores.notas).toHaveLength(3);
  });
  it("manual com 7 seções e guia com 4", () => {
    expect(studio.manual.secoes.map((s) => s.id)).toEqual(["capa", "boas-vindas", "alongamento", "banho-de-gel", "valores", "protocolo", "localizacao"]);
    expect(studio.guia.secoes.map((s) => s.id)).toEqual(["capa", "ola", "orientacoes", "encerramento"]);
  });
  it("protocolo completo: 5 regras, 3 dicas e o alerta de manutenção", () => {
    const p = studio.manual.secoes.find((s) => s.id === "protocolo")!;
    const lista = p.blocos.find((b) => b.tipo === "lista");
    const dicas = p.blocos.find((b) => b.tipo === "dicas");
    expect(lista && "itens" in lista && lista.itens).toHaveLength(5);
    expect(dicas && "itens" in dicas && dicas.itens).toHaveLength(3);
    expect(p.blocos.some((b) => b.tipo === "destaque" && b.texto.includes("não passar do prazo de manutenção"))).toBe(true);
  });
  it("guia completo: higienização, cuidados e remoção", () => {
    const o = studio.guia.secoes.find((s) => s.id === "orientacoes")!;
    const t = o.blocos.find((b) => b.tipo === "topicos");
    expect(t && "itens" in t && t.itens.map((i) => i.titulo)).toEqual(["HIGIENIZAÇÃO", "CUIDADOS", "REMOÇÃO"]);
  });
  it("horários: terça a sexta 09:00–19:30 e sábado 09:00–15:00 (padrão da agenda online)", () => {
    expect(studio.horarios.faixas).toEqual([2, 3, 4, 5].map((dia) => ({ dia, abre: "09:00", fecha: "19:30" })).concat([{ dia: 6, abre: "09:00", fecha: "15:00" }]));
  });
});
