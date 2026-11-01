import { formatInTz } from "@/lib/time";

/**
 * Textos das mensagens para a cliente, no tom da casa: próximo, carinhoso e curto.
 * Usado no botão "Enviar no WhatsApp" do agendamento e enviado ao provedor (variável `mensagem`).
 */

/** "21h", "14h30" */
export function hourText(instant: Date, timeZone: string) {
  const [h, m] = formatInTz(instant, timeZone, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).split(":");
  return `${Number(h)}h${m === "00" ? "" : m}`;
}

/** "na terça-feira" / "no sábado" / "no domingo": o artigo certo para o dia da semana. */
export function onDay(instant: Date, timeZone: string) {
  const weekday = formatInTz(instant, timeZone, { weekday: "long" });
  return `${/^(sábado|domingo)/.test(weekday) ? "no" : "na"} ${dayText(instant, timeZone)}`;
}

/** "terça-feira (27/10)" */
export function dayText(instant: Date, timeZone: string) {
  const weekday = formatInTz(instant, timeZone, { weekday: "long" });
  const date = formatInTz(instant, timeZone, { day: "2-digit", month: "2-digit" });
  return `${weekday} (${date})`;
}

/** Nome do serviço no meio da frase: "Limpeza de pele" → "limpeza de pele" (siglas e nomes ficam como estão). */
function inSentence(name: string) {
  return /^[A-ZÀ-Ú][a-zà-ú]/.test(name) ? name[0]!.toLowerCase() + name.slice(1) : name;
}

export function servicesText(names: string[]) {
  const list = names.map(inSentence);
  return list.length <= 1 ? (list[0] ?? "") : `${list.slice(0, -1).join(", ")} e ${list.at(-1)}`;
}

export function confirmationMessage(p: {
  clientName: string; services: string[]; startsAt: Date; timeZone: string; professionalName: string; url: string; pending?: boolean;
}) {
  const first = p.clientName.trim().split(/\s+/)[0] ?? p.clientName;
  const when = `${servicesText(p.services)}, ${onDay(p.startsAt, p.timeZone)}, às ${hourText(p.startsAt, p.timeZone)}, com ${p.professionalName}`;
  const opening = p.pending
    ? `Recebemos seu pedido de horário de ${when}. Já já confirmamos pra você.`
    : `Passando pra confirmar seu horário de ${when}.`;
  return [
    `Oi, ${first}! 😊 Tudo bem? ${opening}`,
    "",
    `Deixei aqui o link com o endereço e a confirmação de presença, tá bom? 💚`,
    "",
    `🔗 Ver meu agendamento:`,
    p.url,
    "",
    `Te esperamos! 🥰`,
  ].join("\n");
}
