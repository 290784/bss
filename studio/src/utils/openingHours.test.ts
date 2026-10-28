import { describe, expect, it } from "vitest";
import { agoraNoFuso, hora, resumoSemana, situacao } from "./openingHours";
import { studio } from "@/data/studio";

const F = studio.horarios.faixas;
const SP = "America/Sao_Paulo";
// São Paulo é UTC-3 o ano todo (sem horário de verão desde 2019).
const sp = (iso: string) => new Date(`${iso}-03:00`);

describe("Aberto/Fechado no fuso de São Paulo", () => {
  it("terça 09:00 em ponto: aberto (abertura inclusive)", () => {
    expect(situacao(F, SP, sp("2026-10-27T09:00:00"))).toMatchObject({ aberto: true, hoje: 2 });
  });
  it("terça 08:59: fechado, abre hoje às 9h", () => {
    const s = situacao(F, SP, sp("2026-10-27T08:59:59"));
    expect(s.aberto).toBe(false);
    expect(s.proxima).toMatchObject({ dia: 2, abre: "09:00" });
  });
  it("terça 19:29: aberto; 19:30 em ponto: fechado (fechamento exclusive)", () => {
    expect(situacao(F, SP, sp("2026-10-27T19:29:59")).aberto).toBe(true);
    const s = situacao(F, SP, sp("2026-10-27T19:30:00"));
    expect(s.aberto).toBe(false);
    expect(s.proxima).toMatchObject({ dia: 3, abre: "09:00" });
  });
  it("sábado 14:59 aberto; 15:00 fechado; próxima abertura na terça", () => {
    expect(situacao(F, SP, sp("2026-10-31T14:59:00")).aberto).toBe(true);
    const s = situacao(F, SP, sp("2026-10-31T15:00:00"));
    expect(s.aberto).toBe(false);
    expect(s.proxima).toMatchObject({ dia: 2, abre: "09:00" });
  });
  it("domingo e segunda: fechado o dia todo", () => {
    expect(situacao(F, SP, sp("2026-11-01T12:00:00"))).toMatchObject({ aberto: false, hoje: 0 });
    expect(situacao(F, SP, sp("2026-11-02T12:00:00"))).toMatchObject({ aberto: false, hoje: 1 });
  });
  it("usa o fuso do studio, não o do aparelho: 23:30 UTC de terça = 20:30 em SP (fechado)", () => {
    const s = situacao(F, SP, new Date("2026-10-27T23:30:00Z"));
    expect(agoraNoFuso(new Date("2026-10-27T23:30:00Z"), SP)).toEqual({ dia: 2, hhmm: "20:30" });
    expect(s.aberto).toBe(false);
  });
  it("virada da meia-noite em SP: 02:59 UTC de quarta ainda é terça 23:59 em SP", () => {
    expect(agoraNoFuso(new Date("2026-10-28T02:59:00Z"), SP)).toEqual({ dia: 2, hhmm: "23:59" });
  });
  it("formata horas e resume a semana", () => {
    expect(hora("09:00")).toBe("9h");
    expect(hora("19:30")).toBe("19h30");
    expect(resumoSemana(F)).toEqual([
      { dias: "Terça a Sexta", horario: "09:00–19:30", inclui: [2, 3, 4, 5] },
      { dias: "Sábado", horario: "09:00–15:00", inclui: [6] },
    ]);
  });
});
