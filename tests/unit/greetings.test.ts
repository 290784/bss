import { describe, expect, it } from "vitest";
import { GREETINGS, pickGreetingIndex } from "@/domain/greetings";

describe("saudações do painel", () => {
  it("são exatamente as oito frases combinadas, na ordem", () => {
    expect([...GREETINGS]).toEqual([
      "Bom dia, visionária! ✨",
      "Bom dia, patroa! Hoje é dia de fazer acontecer!",
      "E aí, empreendedora! Pronta pra mais um dia de conquistas?",
      "Bom dia, CEO da beleza! 💅",
      "Fala, poderosa! Seu negócio não para!",
      "Bom dia, chefinha! Bora transformar trabalho em resultado?",
      "Bom diaa! Mais um dia pra crescer!",
      "Bom dia, dona do seu sucesso!",
    ]);
  });

  it("nunca sorteia a mesma da véspera, seja qual for o número sorteado", () => {
    for (let prev = 0; prev < GREETINGS.length; prev++)
      for (const r of [0, 0.0001, 0.25, 0.5, 0.75, 0.9999, 0.999999999, 1, -1]) {
        const i = pickGreetingIndex(prev, () => r);
        expect(i).not.toBe(prev);
        expect(i).toBeGreaterThanOrEqual(0);
        expect(i).toBeLessThan(GREETINGS.length);
      }
  });

  it("sem saudação anterior, qualquer uma das oito pode sair", () => {
    const seen = new Set<number>();
    for (let k = 0; k < 8; k++) seen.add(pickGreetingIndex(null, () => (k + 0.5) / 8));
    expect(seen.size).toBe(8);
  });

  it("com a véspera conhecida, as outras sete aparecem (nenhuma fica de fora)", () => {
    const seen = new Set<number>();
    for (let k = 0; k < 7; k++) seen.add(pickGreetingIndex(3, () => (k + 0.5) / 7));
    expect([...seen].sort()).toEqual([0, 1, 2, 4, 5, 6, 7]);
  });
});

import { periodoDoDia, saudacaoDoHorario } from "@/domain/greetings";

describe("saudação pelo horário local", () => {
  it("divide o dia em manhã, tarde e noite", () => {
    expect([0, 4, 5, 11, 12, 17, 18, 23].map(periodoDoDia)).toEqual(["noite", "noite", "dia", "dia", "tarde", "tarde", "noite", "noite"]);
  });
  it("troca só o 'Bom dia' pela parte do dia, mantendo o resto da frase", () => {
    expect(saudacaoDoHorario("Bom dia, visionária! ✨", 9)).toBe("Bom dia, visionária! ✨");
    expect(saudacaoDoHorario("Bom dia, visionária! ✨", 14)).toBe("Boa tarde, visionária! ✨");
    expect(saudacaoDoHorario("Bom dia, patroa! Hoje é dia de fazer acontecer!", 21)).toBe("Boa noite, patroa! Hoje é dia de fazer acontecer!");
  });
  it("preserva o alongamento e não mexe em frases sem 'Bom dia'", () => {
    expect(saudacaoDoHorario("Bom diaa! Mais um dia pra crescer!", 15)).toBe("Boa tardee! Mais um dia pra crescer!");
    expect(saudacaoDoHorario("Bom diaa! Mais um dia pra crescer!", 22)).toBe("Boa noitee! Mais um dia pra crescer!");
    expect(saudacaoDoHorario("Fala, poderosa! Seu negócio não para!", 22)).toBe("Fala, poderosa! Seu negócio não para!");
  });
});
