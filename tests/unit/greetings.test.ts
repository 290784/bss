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
