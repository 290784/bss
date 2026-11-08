import { describe, expect, it } from "vitest";
import { normalizeCanal, normalizeConheceu } from "@/domain/canal";

describe("origem do cadastro", () => {
  it("normaliza o código do canal", () => {
    expect(normalizeCanal("IG-Bio")).toBe("ig-bio");
    expect(normalizeCanal("  wa_direto ")).toBe("wa_direto");
    expect(normalizeCanal("rj-lash-01")).toBe("rj-lash-01");
  });
  it("recusa o que não é um código simples", () => {
    for (const x of ["", " ", "a b", "<script>", "-x", "a".repeat(41), null, undefined, 3]) expect(normalizeCanal(x)).toBeNull();
  });
  it("só aceita as respostas conhecidas de 'como conheceu'", () => {
    expect(normalizeConheceu("instagram")).toBe("instagram");
    expect(normalizeConheceu("qualquer coisa")).toBeNull();
    expect(normalizeConheceu(undefined)).toBeNull();
  });
});
