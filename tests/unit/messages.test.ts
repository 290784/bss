import { describe, expect, it } from "vitest";
import { confirmationMessage, dayText, hourText, servicesText } from "@/lib/messages";

const tz = "America/Sao_Paulo";
const at = new Date("2026-10-28T00:00:00Z"); // 27/10 (terça) 21:00 em São Paulo

describe("mensagem de confirmação", () => {
  it("segue o tom da casa", () => {
    expect(confirmationMessage({
      clientName: "Gabriela Souza", services: ["Limpeza de pele"], startsAt: at, timeZone: tz,
      professionalName: "Pedro André", url: "https://exemplo.app/b/studio/agendamento/abc",
    })).toBe(
      "Oi, Gabriela! 😊 Tudo bem? Passando pra confirmar seu horário de limpeza de pele, na terça-feira (27/10), às 21h, com Pedro André.\n\n" +
      "Deixei aqui o link com o endereço e a confirmação de presença, tá bom? 💚\n\n" +
      "🔗 Ver meu agendamento:\nhttps://exemplo.app/b/studio/agendamento/abc\n\n" +
      "Te esperamos! 🥰",
    );
  });

  it("pedido aguardando aprovação não diz que está confirmado", () => {
    const m = confirmationMessage({ clientName: "Ana", services: ["Manicure"], startsAt: at, timeZone: tz, professionalName: "Bia", url: "u", pending: true });
    expect(m).toContain("Recebemos seu pedido de horário de manicure");
    expect(m).not.toContain("Passando pra confirmar");
  });

  it("formata hora, dia e lista de serviços", () => {
    expect(hourText(new Date("2026-10-27T17:30:00Z"), tz)).toBe("14h30");
    expect(hourText(at, tz)).toBe("21h");
    expect(dayText(at, tz)).toBe("terça-feira (27/10)");
    expect(servicesText(["Manicure", "Pedicure", "Esmaltação em gel"])).toBe("manicure, pedicure e esmaltação em gel");
    expect(servicesText(["SPA dos pés"])).toBe("SPA dos pés");
  });
});
