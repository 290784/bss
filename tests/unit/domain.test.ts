import { describe, expect, it } from "vitest";
import { canTransition, occupiesSlot } from "@/domain/appointment-status";
import { can } from "@/domain/permissions";
import { effectiveAccess, effectivePlan } from "@/domain/plans";
import { percentChange } from "@/domain/metrics";
import { parseMoneyToCents, formatMoney } from "@/lib/money";
import { normalizePhone, slugify } from "@/lib/text";
import { resolvePeriod } from "@/server/modules/dashboard";
import { zonedDateTime } from "@/lib/time";

describe("status do agendamento", () => {
  it("cancelado é final", () => {
    expect(canTransition("cancelled", "confirmed")).toBe(false);
  });
  it("aguardando não pode virar concluído sem confirmar", () => {
    expect(canTransition("pending", "completed")).toBe(false);
    expect(canTransition("confirmed", "completed")).toBe(true);
  });
  it("cancelado e falta liberam o horário", () => {
    expect(occupiesSlot("cancelled")).toBe(false);
    expect(occupiesSlot("no_show")).toBe(false);
    expect(occupiesSlot("confirmed")).toBe(true);
  });
});

describe("permissões", () => {
  it("profissional não acessa áreas administrativas", () => {
    expect(can("professional", "settings.manage")).toBe(false);
    expect(can("professional", "finance.view")).toBe(false);
    expect(can("professional", "dashboard.view")).toBe(false);
    expect(can("professional", "clients.view_internal_notes")).toBe(false);
  });
  it("recepção registra pagamentos mas não gerencia serviços", () => {
    expect(can("receptionist", "finance.record")).toBe(true);
    expect(can("receptionist", "services.manage")).toBe(false);
  });
});

describe("assinatura", () => {
  const now = new Date("2026-11-01T00:00:00Z");
  it("teste vigente libera plano Studio", () => {
    const s = { plan: "solo" as const, status: "trialing" as const, trialEndsAt: new Date("2026-11-10"), graceUntil: null };
    expect(effectiveAccess(s, now)).toBe("full");
    expect(effectivePlan(s, now).id).toBe("studio");
  });
  it("teste expirado vira somente leitura, sem perder dados", () => {
    const s = { plan: "solo" as const, status: "trialing" as const, trialEndsAt: new Date("2026-10-01"), graceUntil: null };
    expect(effectiveAccess(s, now)).toBe("read_only");
  });
  it("inadimplência tem tolerância antes de bloquear", () => {
    const s = { plan: "pro" as const, status: "past_due" as const, trialEndsAt: null, graceUntil: new Date("2026-11-05") };
    expect(effectiveAccess(s, now)).toBe("grace");
    expect(effectiveAccess({ ...s, graceUntil: new Date("2026-10-30") }, now)).toBe("read_only");
  });
});

describe("utilitários", () => {
  it("dinheiro", () => {
    expect(parseMoneyToCents("1.234,56")).toBe(123456);
    expect(parseMoneyToCents("R$ 80")).toBe(8000);
    expect(parseMoneyToCents("80.5")).toBe(8050);
    expect(parseMoneyToCents("abc")).toBeNull();
    expect(formatMoney(123456).replace(/\s/g, " ")).toBe("R$ 1.234,56");
  });
  it("telefone", () => {
    expect(normalizePhone("(11) 98765-4321")).toBe("5511987654321");
    expect(normalizePhone("123")).toBeNull();
  });
  it("slug", () => {
    expect(slugify("Estúdio Ângela & Cia")).toBe("estudio-angela-cia");
  });
  it("variação com base zero", () => {
    expect(percentChange(10, 0)).toBeNull();
    expect(percentChange(0, 0)).toBe(0);
    expect(percentChange(150, 100)).toBe(50);
  });
});

describe("comparação de períodos do painel", () => {
  const tz = "America/Sao_Paulo";
  const now = new Date("2026-10-29T15:00:00-03:00");
  it("este mês compara os dias fechados (até ontem) com o mesmo trecho do mês passado", () => {
    const p = resolvePeriod("month", tz, now);
    expect(p.fromKey).toBe("2026-10-01");
    expect(p.cmpTo.toISOString()).toBe(zonedDateTime("2026-10-29", "00:00", tz).toISOString());
    expect(p.prevFrom.toISOString()).toBe(zonedDateTime("2026-09-01", "00:00", tz).toISOString());
    expect(p.prevTo.toISOString()).toBe(zonedDateTime("2026-09-29", "00:00", tz).toISOString());
    expect(p.prevDays).toHaveLength(28);
  });
  it("mês anterior mais curto: a comparação para no fim dele", () => {
    const p = resolvePeriod("month", tz, new Date("2026-03-31T12:00:00-03:00")); // 30 dias fechados; fevereiro tem 28
    expect(p.prevTo.toISOString()).toBe(zonedDateTime("2026-03-01", "00:00", tz).toISOString());
    expect(p.prevDays).toHaveLength(28);
  });
  it("esta semana compara de segunda até ontem com o mesmo trecho da semana passada", () => {
    const p = resolvePeriod("week", tz, now); // quinta-feira
    expect(p.fromKey).toBe("2026-10-26");
    expect(p.prevDays).toEqual(["2026-10-19", "2026-10-20", "2026-10-21"]);
  });
  it("no primeiro dia do mês ainda não há trecho para comparar", () => {
    const p = resolvePeriod("month", tz, new Date("2026-11-01T10:00:00-03:00"));
    expect(p.cmpTo.getTime()).toBe(p.from.getTime());
    expect(p.prevDays).toHaveLength(0);
  });
  it("últimos 30 dias seguem comparando com os 30 anteriores", () => {
    const p = resolvePeriod("30d", tz, now);
    expect(p.prevDays).toHaveLength(30);
    expect(p.cmpTo.getTime()).toBe(p.to.getTime());
  });
});
