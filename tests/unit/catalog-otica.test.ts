import { describe, expect, it } from "vitest";
import { BUSINESS_TYPES, presetsFor } from "@/server/modules/catalog";

describe("tipo de negócio Ótica", () => {
  it("existe na lista do cadastro", () => {
    expect(BUSINESS_TYPES.find((b) => b.id === "optics")?.label).toBe("Ótica");
  });
  it("traz serviços sugeridos com preço, duração e categoria", () => {
    const s = presetsFor("optics");
    expect(s.length).toBeGreaterThanOrEqual(8);
    for (const x of s) {
      expect(x.price).toBeGreaterThanOrEqual(0);
      expect(x.minutes).toBeGreaterThan(0);
      expect(x.category).toBeTruthy();
    }
  });
});

describe("serviços da ótica com retorno sugerido", () => {
  it("exame de vista lembra a cliente em 12 meses", () => {
    const exame = presetsFor("optics").find((s) => s.name.startsWith("Exame de vista"));
    expect(exame?.returnDays).toBe(365);
  });
});
