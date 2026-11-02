import type { Sql, Tx } from "@/server/db";
import { DomainError } from "@/server/errors";
import { addServiceToAppointment } from "@/server/modules/appointments";
import { notifyStaff } from "@/server/modules/notifications";
import { suggestRelatedServices } from "@/server/modules/upsell";
import { trackEvent } from "@/server/modules/audit";
import { formatMoney } from "@/lib/money";
import { formatDateBR, localDateKey, localTime } from "@/lib/time";
import {
  confirmedMessage, declinedMessage, handoffAckMessage, offerMessage, rescheduleAckMessage, upsellDoneMessage, upsellTakenMessage,
} from "@/lib/messages";

/**
 * Conversa automática do WhatsApp, depois do lembrete da véspera:
 *
 *   lembrete ─► "Confirmo" ─► confirma presença ─► oferece 1 serviço que cabe logo depois
 *                                                   ├─ "SIM" ─► reserva, soma o valor, avisa a profissional
 *                                                   └─ "NÃO" ─► "Tudo bem! Te esperamos"
 *            └► "Preciso remarcar" ─► avisa a profissional (ela assume)
 *   qualquer outra coisa ─► avisa a profissional e a automação para de responder (handoff)
 *
 * As respostas vão na janela de atendimento de 24h aberta pela cliente (mensagem livre, a mais
 * barata). Tudo acontece dentro do app; o provedor de WhatsApp só entrega e recebe.
 */

export type Intent = "confirm" | "reschedule" | "yes" | "no" | "other";
export type InboundMessage = { providerMessageId: string; from: string; text?: string | null; buttonId?: string | null };

const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/**
 * Entende a resposta. Botões têm prioridade; no texto, só respostas curtas e claras contam
 * (uma frase longa vai para a profissional, que entende melhor do que uma regra).
 */
export function classifyReply(text: string | null | undefined, buttonId?: string | null): Intent {
  if (buttonId === "confirm") return "confirm";
  if (buttonId === "reschedule") return "reschedule";
  if (buttonId === "offer_yes") return "yes";
  if (buttonId === "offer_no") return "no";
  const t = strip(text ?? "").replace(/[!.,]+$/g, "");
  if (!t) return "other";
  if (/(remarc|desmarc|cancel|nao (vou|posso|consigo|da)|outro (dia|horario)|imprevisto)/.test(t)) return "reschedule";
  if (t.split(/\s+/).length > 6) return "other";
  if (/^(nao|n|nao quero|agora nao|hoje nao|dessa vez nao|dispenso|nao obrigad[ao]|obrigad[ao] mas nao)\b/.test(t)) return "no";
  if (/^(sim|s|ss|quero|pode|pode sim|bora|claro|aceito|isso|fechado|com certeza|opa|uhum|👍|✅|❤️|💜)\b/u.test(t) || /^(👍|✅|💜|❤️)/u.test(text ?? "")) return "yes";
  if (/^(confirmo|confirmado|confirmada|confirmar|ok|okay|blz|beleza|combinado|estarei|vou sim|vou|ta|ta bom|certo)\b/.test(t)) return "confirm";
  return "other";
}

/** Os dois formatos de celular do Brasil (com e sem o 9 depois do DDD) para achar a cliente. */
export function phoneVariants(raw: string) {
  const d = raw.replace(/\D/g, "");
  const out = new Set([d]);
  if (/^55\d{2}9\d{8}$/.test(d)) out.add(d.slice(0, 4) + d.slice(5));
  if (/^55\d{2}[6-9]\d{7}$/.test(d)) out.add(d.slice(0, 4) + "9" + d.slice(4));
  return [...out];
}

/** Coloca uma resposta na fila para sair agora (o despachante entrega em seguida). */
async function reply(tx: Tx, t: Thread, template: string, body: string, buttons?: { id: string; title: string }[]) {
  await tx`
    insert into app.message_jobs (organization_id, appointment_id, client_id, channel, template, idempotency_key, scheduled_for, body, buttons)
    values (${t.organization_id}, ${t.appointment_id}, ${t.client_id}, 'whatsapp', ${template},
            ${`${template}:${t.appointment_id}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`}, now(), ${body},
            ${buttons ? tx.json(buttons) : null})`;
}

type Thread = {
  id: string; organization_id: string; appointment_id: string; client_id: string; stage: string; offer_service_id: string | null;
  client_name: string; professional_id: string; professional_name: string; starts_at: Date; ends_at: Date; status: string;
  timezone: string; upsell_enabled: boolean; client_confirmed_at: Date | null;
};

async function setStage(tx: Tx, t: Thread, stage: string, offerServiceId: string | null = null) {
  await tx`update app.whatsapp_threads set stage = ${stage}, offer_service_id = ${offerServiceId}, updated_at = now() where id = ${t.id}`;
}

const first = (n: string) => n.trim().split(/\s+/)[0] ?? n;
const when = (t: Thread) => `${formatDateBR(localDateKey(t.starts_at, t.timezone))} às ${localTime(t.starts_at, t.timezone)}`;
const agendaLink = (t: Thread) => `/app/agenda?data=${localDateKey(t.starts_at, t.timezone)}&agendamento=${t.appointment_id}`;

async function handoff(tx: Tx, t: Thread, title: string, body: string, ack: boolean) {
  await setStage(tx, t, "handoff");
  await notifyStaff(tx, t.organization_id, { type: "whatsapp_handoff", title, body, link: agendaLink(t), professionalId: t.professional_id });
  if (ack) await reply(tx, t, "reply_handoff", handoffAckMessage({ professionalName: t.professional_name }));
}

export type InboundOutcome = "duplicate" | "no_thread" | "ignored" | "confirmed" | "offered" | "upsell_added" | "upsell_taken" | "declined" | "reschedule" | "handoff";

/**
 * Processa uma mensagem recebida. Idempotente pelo id do provedor. Devolve o que aconteceu
 * (para log e testes); as respostas ficam na fila de mensagens.
 */
export async function handleInbound(sql: Sql, msg: InboundMessage, now = new Date()): Promise<InboundOutcome> {
  return sql.begin(async (tx) => {
    const phones = phoneVariants(msg.from);
    const [seen] = await tx<{ provider_message_id: string }[]>`
      insert into app.whatsapp_inbound (provider_message_id, phone_normalized, text)
      values (${msg.providerMessageId}, ${phones[0]!}, ${msg.text ?? msg.buttonId ?? null})
      on conflict (provider_message_id) do nothing returning provider_message_id`;
    if (!seen) return "duplicate";

    const [t] = await tx<Thread[]>`
      select w.id, w.organization_id, w.appointment_id, w.client_id, w.stage, w.offer_service_id,
        c.full_name as client_name, a.professional_id, p.display_name as professional_name, a.starts_at, a.ends_at, a.status,
        o.timezone, o.whatsapp_upsell_enabled as upsell_enabled, a.client_confirmed_at
      from app.whatsapp_threads w
      join app.appointments a on a.id = w.appointment_id
      join app.clients c on c.id = w.client_id
      join app.professionals p on p.id = a.professional_id
      join app.organizations o on o.id = w.organization_id
      where w.phone_normalized in ${tx(phones)} and w.expires_at > ${now}
      order by w.updated_at desc limit 1
      for update of w`;
    const outcome = await (async (): Promise<InboundOutcome> => {
      if (!t) return "no_thread";
      if (t.stage === "closed" || t.stage === "handoff") {
        // A profissional já assumiu (ou terminou): só avisa de novo se a cliente mandar algo depois de encerrado.
        if (t.stage === "closed") await handoff(tx, t, `${first(t.client_name)} mandou mensagem no WhatsApp`, `"${(msg.text ?? "").slice(0, 140)}" · ${when(t)}`, false);
        return "ignored";
      }
      if (t.status !== "pending" && t.status !== "confirmed") {
        await handoff(tx, t, `${first(t.client_name)} respondeu no WhatsApp`, `"${(msg.text ?? "").slice(0, 140)}" · ${when(t)}`, true);
        return "handoff";
      }
      const intent = classifyReply(msg.text, msg.buttonId);

      if (t.stage === "awaiting_confirmation") {
        if (intent === "confirm" || intent === "yes") {
          if (!t.client_confirmed_at) {
            await tx`update app.appointments set client_confirmed_at = ${now}, updated_at = now() where id = ${t.appointment_id}`;
            await tx`insert into app.appointment_events (organization_id, appointment_id, actor_user_id, type, data)
                     values (${t.organization_id}, ${t.appointment_id}, null, 'client_confirmed', ${tx.json({ at: now.toISOString(), via: "whatsapp" })})`;
          }
          await notifyStaff(tx, t.organization_id, {
            type: "client_confirmed", title: `${first(t.client_name)} confirmou pelo WhatsApp`, body: when(t),
            link: agendaLink(t), professionalId: t.professional_id,
          });
          // Oferta: 1 serviço que outras clientes fazem junto, que cabe logo depois e que a profissional liberou.
          const offer = t.upsell_enabled
            ? (await suggestRelatedServices(tx, t.organization_id, t.appointment_id, 5)).find((s) => s.fitsRightAfter)
            : undefined;
          const allowed = offer ? (await tx`select 1 from app.services where id = ${offer.id} and offer_as_extra`).length > 0 : false;
          if (offer && allowed) {
            await setStage(tx, t, "awaiting_offer", offer.id);
            await reply(tx, t, "upsell_offer", offerMessage({ professionalName: t.professional_name, serviceName: offer.name, priceCents: offer.priceCents }),
              [{ id: "offer_yes", title: "Quero sim" }, { id: "offer_no", title: "Agora não" }]);
            await trackEvent(tx, "whatsapp.upsell_offered", t.organization_id, null, { serviceId: offer.id });
            return "offered";
          }
          await setStage(tx, t, "closed");
          await reply(tx, t, "reply_confirmed", confirmedMessage());
          return "confirmed";
        }
        if (intent === "reschedule") {
          await setStage(tx, t, "handoff");
          await notifyStaff(tx, t.organization_id, {
            type: "whatsapp_reschedule", title: `${first(t.client_name)} precisa remarcar`, body: `${when(t)} · chame ela no WhatsApp para combinar`,
            link: agendaLink(t), professionalId: t.professional_id,
          });
          await reply(tx, t, "reply_reschedule", rescheduleAckMessage({ professionalName: t.professional_name }));
          return "reschedule";
        }
        await handoff(tx, t, `${first(t.client_name)} respondeu o lembrete`, `"${(msg.text ?? "").slice(0, 140)}" · ${when(t)}`, true);
        return "handoff";
      }

      // awaiting_offer
      if (intent === "yes" || intent === "confirm") {
        try {
          // Ponto de salvamento: se não couber mais, desfaz só esta tentativa.
          const added = await tx.savepoint((sp) => addServiceToAppointment(sp, { userId: null, organizationId: t.organization_id }, { appointmentId: t.appointment_id, serviceId: t.offer_service_id! }));
          const items = await tx<{ name: string; minutes: number }[]>`
            select service_name as name, duration_minutes as minutes from app.appointment_services where appointment_id = ${t.appointment_id} order by position`;
          const [a] = await tx<{ total: number }[]>`select (price_cents - discount_cents)::int as total from app.appointments where id = ${t.appointment_id}`;
          let cursor = t.starts_at.getTime();
          const timeline = items.map((i) => { const s = new Date(cursor); cursor += i.minutes * 60_000; return { name: i.name, startsAt: s }; });
          await tx`insert into app.appointment_events (organization_id, appointment_id, actor_user_id, type, data)
                   values (${t.organization_id}, ${t.appointment_id}, null, 'upsell_accepted', ${tx.json({ via: "whatsapp", name: added.name, priceCents: added.priceCents })})`;
          await setStage(tx, t, "closed");
          await reply(tx, t, "upsell_done", upsellDoneMessage({ items: timeline, timeZone: t.timezone, totalCents: a!.total }));
          await notifyStaff(tx, t.organization_id, {
            type: "upsell_accepted", title: `${first(t.client_name)} adicionou ${added.name}! +${formatMoney(added.priceCents)}`,
            body: `Total do atendimento: ${formatMoney(a!.total)} · ${when(t)}`, link: agendaLink(t), professionalId: t.professional_id,
          });
          await trackEvent(tx, "whatsapp.upsell_accepted", t.organization_id, null, { priceCents: added.priceCents });
          return "upsell_added";
        } catch (err) {
          if (!(err instanceof DomainError)) throw err;
          await setStage(tx, t, "handoff");
          await reply(tx, t, "upsell_taken", upsellTakenMessage({ professionalName: t.professional_name }));
          await notifyStaff(tx, t.organization_id, {
            type: "whatsapp_handoff", title: `${first(t.client_name)} queria um serviço extra, mas o horário foi ocupado`,
            body: `${when(t)} · chame ela para ver outro horário`, link: agendaLink(t), professionalId: t.professional_id,
          });
          return "upsell_taken";
        }
      }
      if (intent === "no") {
        await setStage(tx, t, "closed");
        await reply(tx, t, "reply_declined", declinedMessage());
        return "declined";
      }
      await handoff(tx, t, `${first(t.client_name)} respondeu a oferta`, `"${(msg.text ?? "").slice(0, 140)}" · ${when(t)}`, true);
      return "handoff";
    })();
    await tx`update app.whatsapp_inbound set outcome = ${outcome}, organization_id = ${t?.organization_id ?? null}, appointment_id = ${t?.appointment_id ?? null}
             where provider_message_id = ${msg.providerMessageId}`;
    return outcome;
  }) as Promise<InboundOutcome>;
}
