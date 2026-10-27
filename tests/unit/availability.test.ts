import { describe, expect, it } from "vitest";
import { availableSlots, fitsWorkingHours } from "@/domain/availability";
import { zonedDateTime, localTime } from "@/lib/time";

const TZ = "America/Sao_Paulo";
const base = {
  date: "2026-11-03", // terça-feira
  timeZone: TZ,
  workingHours: [
    { weekday: 2, start: "09:00", end: "12:00" },
    { weekday: 2, start: "13:00", end: "18:00" },
  ],
  busy: [],
  serviceMinutes: 60,
  bufferAfterMinutes: 0,
  slotIntervalMinutes: 30,
  now: new Date("2026-11-01T12:00:00Z"),
  minAdvanceMinutes: 120,
  maxAdvanceDays: 60,
};
const times = (s: Date[]) => s.map((d) => localTime(d, TZ));

describe("availableSlots", () => {
  it("respeita expediente e pausa de almoço", () => {
    const t = times(availableSlots(base));
    expect(t[0]).toBe("09:00");
    expect(t).toContain("11:00");
    expect(t).not.toContain("11:30"); // terminaria 12:30, dentro da pausa
    expect(t).toContain("13:00");
    expect(t.at(-1)).toBe("17:00");
  });

  it("remove horários que colidem com agendamentos, incluindo o tempo de limpeza", () => {
    const busy = [{ start: zonedDateTime(base.date, "10:00", TZ), end: zonedDateTime(base.date, "11:00", TZ) }];
    const t = times(availableSlots({ ...base, busy, bufferAfterMinutes: 15 }));
    expect(t).not.toContain("09:00"); // 09:00–10:00 + 15 min de limpeza colide
    expect(t).toContain("11:00");
    expect(t).not.toContain("10:30");
  });

  it("respeita antecedência mínima", () => {
    const now = zonedDateTime(base.date, "09:10", TZ);
    const t = times(availableSlots({ ...base, now, minAdvanceMinutes: 120 }));
    // 09:10 + 2h = 11:10; 11:30 não cabe antes da pausa, então o primeiro é 13:00
    expect(t[0]).toBe("13:00");
    expect(t).not.toContain("11:00");
  });

  it("respeita horizonte máximo", () => {
    expect(availableSlots({ ...base, maxAdvanceDays: 1 })).toEqual([]);
  });

  it("dia sem expediente não tem horários", () => {
    expect(availableSlots({ ...base, date: "2026-11-01" })).toEqual([]);
  });
});

describe("fitsWorkingHours", () => {
  it("rejeita atendimento que atravessa a pausa", () => {
    const range = { start: zonedDateTime(base.date, "11:30", TZ), end: zonedDateTime(base.date, "12:30", TZ) };
    expect(fitsWorkingHours(range, base.date, TZ, base.workingHours)).toBe(false);
    const ok = { start: zonedDateTime(base.date, "13:00", TZ), end: zonedDateTime(base.date, "14:00", TZ) };
    expect(fitsWorkingHours(ok, base.date, TZ, base.workingHours)).toBe(true);
  });
});
