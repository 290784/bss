import { describe, expect, it } from "vitest";
import { studio } from "@/data/studio";
import { criarProvedorWhatsApp, linkWhatsApp, montarMensagem } from "./booking";
import { formatarPreco } from "@/utils/format";

describe("agendamento pelo WhatsApp", () => {
  const servico = studio.agendamento.servicos[0]!;
  const profissional = studio.agendamento.profissionais[0]!;

  it("monta a mensagem no modelo da especificação", () => {
    expect(montarMensagem(studio.agendamento.mensagemWhatsApp, { servico, profissional }))
      .toBe("Olá! Quero agendar: Aplicação (120 min, R$ 140,00) com Manoella Lopes. Tenho disponibilidade em: ____.");
  });

  it("link wa.me com DDI 55, número e texto codificado", () => {
    const { url } = criarProvedorWhatsApp(studio).concluir({ servico, profissional });
    expect(url.startsWith("https://wa.me/5521995781069?text=")).toBe(true);
    expect(decodeURIComponent(url.split("?text=")[1]!)).toContain("Aplicação (120 min, R$ 140,00)");
    expect(linkWhatsApp(studio)).toBe("https://wa.me/5521995781069");
  });

  it("preço em reais sem espaço especial", () => {
    expect(formatarPreco(14000)).toBe("R$ 140,00");
    expect(formatarPreco(1500)).toBe("R$ 15,00");
  });
});
