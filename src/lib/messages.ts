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

// ---------------------------------------------------------------------------
// Conversa automática do WhatsApp (lembrete → confirmação → serviço extra)
// ---------------------------------------------------------------------------

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;
const money = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",").replace(/,00$/, "")}`;

/** Lembrete da véspera (vai com os botões "Confirmo" e "Preciso remarcar"). */
export function reminderMessage(p: { clientName: string; services: string[]; startsAt: Date; timeZone: string; professionalName: string; businessName: string }) {
  const today = formatInTz(new Date(), p.timeZone, { year: "numeric", month: "2-digit", day: "2-digit" });
  const day = formatInTz(p.startsAt, p.timeZone, { year: "numeric", month: "2-digit", day: "2-digit" });
  const when = day === today ? "hoje" : "amanhã";
  return `Oi, ${firstName(p.clientName)}! 💜 Passando pra lembrar: ${when} às ${hourText(p.startsAt, p.timeZone)} tem ${servicesText(p.services)} com a ${firstName(p.professionalName)}, no ${p.businessName}. Posso confirmar?`;
}

/** Depois do "Confirmo": confirma e oferece um serviço que cabe logo depois. */
export function offerMessage(p: { professionalName: string; serviceName: string; priceCents: number }) {
  return `Oba, confirmado! 💜 Vi que a ${firstName(p.professionalName)} tem um horário livre logo depois. Quer aproveitar e fazer ${servicesText([p.serviceName])}? Fica +${money(p.priceCents)}. É só responder SIM 😉`;
}

/** Confirmou e não há oferta (ou a oferta está desligada). */
export function confirmedMessage() {
  return "Oba, confirmado! Te esperamos 💜";
}

/** Aceitou o extra e coube na agenda: os dois horários e o total. */
export function upsellDoneMessage(p: { items: { name: string; startsAt: Date }[]; timeZone: string; totalCents: number }) {
  const list = p.items.map((i) => `${servicesText([i.name])} às ${hourText(i.startsAt, p.timeZone)}`);
  const joined = (list.length > 1 ? `${list.slice(0, -1).join(", ")} e ${list.at(-1)}` : list[0]) ?? "";
  return `Prontinho! ${joined.charAt(0).toUpperCase()}${joined.slice(1)}, total ${money(p.totalCents)}. Te esperamos 💜`;
}

/** Aceitou, mas o horário foi ocupado nesse meio tempo. */
export function upsellTakenMessage(p: { professionalName: string }) {
  return `Poxa, esse horário acabou de ser ocupado 😕 Quer que a ${firstName(p.professionalName)} te chame pra ver outro?`;
}

export function declinedMessage() {
  return "Tudo bem! Te esperamos 💜";
}

export function rescheduleAckMessage(p: { professionalName: string }) {
  return `Sem problema! A ${firstName(p.professionalName)} já vai te chamar pra combinar outro horário 💜`;
}

/** Saiu do roteiro: avisa que uma pessoa vai responder. */
export function handoffAckMessage(p: { professionalName: string }) {
  return `Vou avisar a ${firstName(p.professionalName)}, ela já te responde 💜`;
}
