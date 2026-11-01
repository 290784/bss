import { describe, expect, it } from "vitest";
import { adjustedPrice, perHour } from "@/domain/pricing";

describe("reajuste de preços", () => {
  it("aplica a porcentagem e arredonda para cima no múltiplo escolhido", () => {
    expect(adjustedPrice(3500, 8, 500)).toBe(4000); // 37,80 → 40
    expect(adjustedPrice(9000, 10, 500)).toBe(10000); // 99,00 → 100
    expect(adjustedPrice(15000, 8, 1000)).toBe(17000); // 162 → 170
    expect(adjustedPrice(3500, 8, 100)).toBe(3800);
    expect(adjustedPrice(3500, 8, 0)).toBe(3780);
  });
  it("valor exato no múltiplo não sobe à toa e baixar também funciona", () => {
    expect(adjustedPrice(5000, 0, 500)).toBe(5000);
    expect(adjustedPrice(10000, -10, 500)).toBe(9000);
  });
});

describe("rende por hora", () => {
  it("conta o tempo de preparo junto com o atendimento", () => {
    expect(perHour(6000, 50, 10)).toBe(6000);
    expect(perHour(3500, 45)).toBe(4667);
    expect(perHour(1000, 0)).toBe(0);
  });
});
