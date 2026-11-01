import { describe, expect, it } from "vitest";
import { classifyReply, phoneVariants } from "@/server/modules/whatsapp";
import { reminderTime } from "@/server/modules/messaging";
import { parseMetaWebhook, validMetaSignature } from "@/server/modules/whatsapp-meta";
import { createHmac } from "node:crypto";

describe("entender a resposta da cliente", () => {
  it.each([
    ["Confirmo", "confirm"], ["ok!", "confirm"], ["Beleza", "confirm"], ["vou sim", "confirm"],
    ["SIM", "yes"], ["sim, quero", "yes"], ["Quero", "yes"], ["👍", "yes"], ["pode sim!", "yes"],
    ["não", "no"], ["Agora não, obrigada", "no"], ["nao quero", "no"],
    ["Preciso remarcar", "reschedule"], ["não vou conseguir ir", "reschedule"], ["tive um imprevisto", "reschedule"],
    ["Oi, posso levar minha filha junto? Ela quer fazer também", "other"], ["", "other"], ["simmm", "other"],
  ])("%s → %s", (text, intent) => expect(classifyReply(text)).toBe(intent));
  it("botões têm prioridade sobre o texto", () => {
    expect(classifyReply("qualquer coisa", "confirm")).toBe("confirm");
    expect(classifyReply("", "offer_no")).toBe("no");
  });
});

describe("celular com e sem o 9", () => {
  it("gera as duas formas", () => {
    expect(phoneVariants("5511911112222").sort()).toEqual(["551111112222", "5511911112222"].sort());
    expect(phoneVariants("551181112222")).toContain("5511981112222");
  });
});

describe("hora do lembrete", () => {
  const tz = "America/Sao_Paulo";
  it("véspera às 9h (horário de Brasília)", () => {
    const at = reminderTime(new Date("2026-11-20T17:00:00Z"), tz, new Date("2026-11-10T12:00:00Z"));
    expect(at?.toISOString()).toBe("2026-11-19T12:00:00.000Z");
  });
  it("marcado depois das 9h da véspera: sai na hora; em cima da hora (menos de 2h): não sai", () => {
    const now = new Date("2026-11-19T20:00:00Z");
    expect(reminderTime(new Date("2026-11-20T17:00:00Z"), tz, now)).toEqual(now);
    expect(reminderTime(new Date("2026-11-19T21:00:00Z"), tz, now)).toBeNull();
  });
});

describe("webhook da Meta", () => {
  it("assinatura confere só com o segredo certo", () => {
    const body = '{"a":1}';
    const sig = "sha256=" + createHmac("sha256", "segredo").update(body).digest("hex");
    expect(validMetaSignature(body, sig, "segredo")).toBe(true);
    expect(validMetaSignature(body, sig, "outro")).toBe(false);
    expect(validMetaSignature(body, null, "segredo")).toBe(false);
  });
  it("lê texto, botão de modelo e botão interativo", () => {
    const msgs = parseMetaWebhook({ entry: [{ changes: [{ value: { messages: [
      { id: "1", from: "5511", type: "text", text: { body: "Confirmo" } },
      { id: "2", from: "5511", type: "button", button: { text: "Preciso remarcar", payload: "Preciso remarcar" } },
      { id: "3", from: "5511", type: "interactive", interactive: { button_reply: { id: "offer_yes", title: "Quero sim" } } },
      { id: "4", from: "5511", type: "audio" },
    ] } }] }] });
    expect(msgs.map((m) => [m.text, m.buttonId ?? null])).toEqual([["Confirmo", null], ["Preciso remarcar", null], ["Quero sim", "offer_yes"], ["", null]]);
  });
});
