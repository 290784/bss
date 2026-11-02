import type { Sql, Tx } from "@/server/db";
import { receiptUrl } from "@/server/modules/receipt";
import { confirmationMessage, hourText, onDay, reminderMessage } from "@/lib/messages";
import { addDaysToKey, localDateKey, zonedDateTime } from "@/lib/time";
import { effectivePlan, type PlanId } from "@/domain/plans";
import { metaCloudProvider } from "@/server/modules/whatsapp-meta";

/**
 * Motor de mensagens (outbox).
 *
 * - Jobs são criados na mesma transação do agendamento.
 * - `idempotency_key` é única: recriar o mesmo lembrete não duplica.
 * - O despachante "reivindica" jobs com FOR UPDATE SKIP LOCKED e muda o status para
 *   `processing` antes de chamar o provedor: duas execuções simultâneas nunca enviam o
 *   mesmo job. A chave de idempotência também é repassada ao provedor.
 * - Sem provedor configurado, o job vira `skipped` com o motivo — nunca "enviado".
 */

export type Channel = "whatsapp" | "email";
/** Modelos aprovados pela Meta (iniciam a conversa) e respostas livres dentro da conversa aberta pela cliente. */
export type Template =
  | "appointment_confirmation" | "appointment_reminder" | "appointment_cancelled"
  | "upsell_offer" | "upsell_done" | "upsell_taken" | "reply_confirmed" | "reply_declined" | "reply_reschedule" | "reply_handoff";

export const TEMPLATE_LABEL: Record<Template, string> = {
  appointment_confirmation: "Confirmação do agendamento",
  appointment_reminder: "Lembrete na véspera",
  appointment_cancelled: "Aviso de cancelamento",
  upsell_offer: "Oferta de serviço extra",
  upsell_done: "Serviço extra confirmado",
  upsell_taken: "Serviço extra: horário ocupado",
  reply_confirmed: "Resposta: confirmado",
  reply_declined: "Resposta: recusou o extra",
  reply_reschedule: "Resposta: vai remarcar",
  reply_handoff: "Resposta: a profissional vai responder",
};

export type OutgoingMessage = {
  idempotencyKey: string;
  channel: Channel;
  template: Template;
  to: string;
  variables: Record<string, string>;
  /** Mensagem livre (dentro da conversa de 24h aberta pela cliente). Sem ela, o provedor usa o modelo aprovado. */
  body?: string;
  buttons?: { id: string; title: string }[];
};

export interface MessageProvider {
  channel: Channel;
  send(msg: OutgoingMessage): Promise<{ providerMessageId: string }>;
}

/** Provedores reais entram aqui quando houver credenciais (ver docs/INTEGRACOES.md). */
export function configuredProviders(): MessageProvider[] {
  const meta = metaCloudProvider();
  return meta ? [meta] : [];
}

/** O lembrete sai na véspera às 9h (no fuso do negócio); marcado depois disso, sai na hora se faltar mais de 2h. */
const REMINDER_LOCAL_TIME = "09:00";
const REMINDER_MIN_AHEAD_MS = 2 * 3_600_000;

/** O plano do estabelecimento inclui automações (o teste grátis inclui)? */
export async function hasAutomations(tx: Tx, orgId: string, now = new Date()) {
  const [s] = await tx<{ plan: string; status: "trialing" | "active" | "past_due" | "canceled"; trial_ends_at: Date | null; grace_until: Date | null }[]>`
    select plan, status, trial_ends_at, grace_until from app.subscriptions where organization_id = ${orgId}`;
  if (!s) return false;
  const state = { plan: s.plan as PlanId, status: s.status, trialEndsAt: s.trial_ends_at, graceUntil: s.grace_until };
  const active = s.status === "active" || (s.status === "trialing" && !!s.trial_ends_at && s.trial_ends_at > now) || (s.status === "past_due" && !!s.grace_until && s.grace_until > now);
  return active && effectivePlan(state, now).features.includes("automations");
}

/** Abre (ou reabre) a conversa do agendamento quando o lembrete sai. */
export async function openReminderThread(tx: Tx | Sql, a: { organizationId: string; appointmentId: string; clientId: string; phone: string; startsAt: Date }) {
  await tx`
    insert into app.whatsapp_threads (organization_id, appointment_id, client_id, phone_normalized, stage, expires_at)
    values (${a.organizationId}, ${a.appointmentId}, ${a.clientId}, ${a.phone}, 'awaiting_confirmation', ${a.startsAt})
    on conflict (appointment_id) do update set stage = 'awaiting_confirmation', offer_service_id = null,
      phone_normalized = excluded.phone_normalized, expires_at = excluded.expires_at, updated_at = now()`;
}

export function reminderTime(startsAt: Date, timeZone: string, now = new Date()): Date | null {
  const dayBefore = addDaysToKey(localDateKey(startsAt, timeZone), -1);
  const at = zonedDateTime(dayBefore, REMINDER_LOCAL_TIME, timeZone);
  if (at > now) return at;
  return startsAt.getTime() - now.getTime() > REMINDER_MIN_AHEAD_MS ? now : null;
}

type ApptForMessages = {
  id: string;
  organization_id: string;
  client_id: string;
  starts_at: Date;
  status: string;
};

async function pickChannel(tx: Tx, orgId: string, clientId: string): Promise<Channel | null> {
  const [c] = await tx<{ phone_normalized: string | null; email: string | null; contact_preference: string }[]>`
    select phone_normalized, email, contact_preference from app.clients where organization_id = ${orgId} and id = ${clientId}`;
  if (!c || c.contact_preference === "none") return null;
  if (c.contact_preference === "email" && c.email) return "email";
  if (c.phone_normalized) return "whatsapp";
  return c.email ? "email" : null;
}

export async function enqueueAppointmentMessages(tx: Tx, appt: ApptForMessages, now = new Date()) {
  const channel = await pickChannel(tx, appt.organization_id, appt.client_id);
  if (!channel) return;
  const stamp = appt.starts_at.toISOString();
  const jobs: { template: Template; at: Date }[] = [{ template: "appointment_confirmation", at: now }];
  // Lembrete com confirmação e oferta: só no WhatsApp, com automações no plano e ligado pelo salão.
  const [org] = await tx<{ timezone: string; whatsapp_reminder_enabled: boolean }[]>`
    select timezone, whatsapp_reminder_enabled from app.organizations where id = ${appt.organization_id}`;
  const reminderAt = org ? reminderTime(appt.starts_at, org.timezone, now) : null;
  if (reminderAt && channel === "whatsapp" && org!.whatsapp_reminder_enabled && (await hasAutomations(tx, appt.organization_id, now)))
    jobs.push({ template: "appointment_reminder", at: reminderAt });
  for (const j of jobs) {
    await tx`
      insert into app.message_jobs (organization_id, appointment_id, client_id, channel, template, idempotency_key, scheduled_for)
      values (${appt.organization_id}, ${appt.id}, ${appt.client_id}, ${channel}, ${j.template},
              ${`${j.template}:${appt.id}:${stamp}`}, ${j.at})
      on conflict (idempotency_key) do nothing`;
  }
}

/** Cancela mensagens ainda não enviadas quando o contexto muda (reagendamento/cancelamento). */
export async function cancelPendingMessages(tx: Tx, orgId: string, appointmentId: string) {
  await tx`
    update app.message_jobs set status = 'cancelled', updated_at = now()
    where organization_id = ${orgId} and appointment_id = ${appointmentId} and status = 'pending'`;
}

export async function enqueueCancellationNotice(tx: Tx, appt: ApptForMessages) {
  const channel = await pickChannel(tx, appt.organization_id, appt.client_id);
  if (!channel) return;
  await tx`
    insert into app.message_jobs (organization_id, appointment_id, client_id, channel, template, idempotency_key, scheduled_for)
    values (${appt.organization_id}, ${appt.id}, ${appt.client_id}, ${channel}, 'appointment_cancelled',
            ${`appointment_cancelled:${appt.id}`}, now())
    on conflict (idempotency_key) do nothing`;
}

type ClaimedJob = {
  id: string; channel: Channel; template: Template; idempotency_key: string; attempts: number; max_attempts: number;
  organization_id: string; appointment_id: string | null; client_id: string | null; body: string | null; buttons: { id: string; title: string }[] | null;
  to_phone: string | null; to_email: string | null; client_name: string | null; starts_at: Date | null;
  org_name: string; timezone: string; org_slug: string; public_token: string | null; services: string[] | null;
  professional_name: string | null; appt_status: string | null;
};

export async function dispatchDueMessages(sql: Sql, providers: MessageProvider[], limit = 50) {
  const claimed = await sql.begin(async (tx) => tx<ClaimedJob[]>`
    with due as (
      select id from app.message_jobs
      where status = 'pending' and scheduled_for <= now() and (next_attempt_at is null or next_attempt_at <= now())
      order by scheduled_for
      for update skip locked
      limit ${limit}
    ), claimed as (
      update app.message_jobs j set status = 'processing', attempts = j.attempts + 1, updated_at = now()
      from due where j.id = due.id
      returning j.*
    )
    select j.id, j.channel, j.template, j.idempotency_key, j.attempts, j.max_attempts,
           j.organization_id, j.appointment_id, j.client_id, j.body, j.buttons,
           c.phone_normalized as to_phone, c.email as to_email, c.full_name as client_name,
           a.starts_at, o.name as org_name, o.timezone, o.slug as org_slug, a.public_token,
           (select array_agg(s.service_name order by s.position) from app.appointment_services s where s.appointment_id = a.id) as services,
           p.display_name as professional_name, a.status as appt_status
    from claimed j
    join app.organizations o on o.id = j.organization_id
    left join app.clients c on c.id = j.client_id
    left join app.appointments a on a.id = j.appointment_id
    left join app.professionals p on p.id = a.professional_id`);

  const result = { sent: 0, failed: 0, skipped: 0 };
  for (const job of claimed) {
    const provider = providers.find((p) => p.channel === job.channel);
    const to = job.channel === "whatsapp" ? job.to_phone : job.to_email;
    if (!provider || !to) {
      result.skipped++;
      await sql`update app.message_jobs set status = 'skipped', updated_at = now(),
                last_error = ${!provider ? "Canal não conectado" : "Cliente sem contato para este canal"}
                where id = ${job.id}`;
      continue;
    }
    const link = job.public_token ? receiptUrl(job.org_slug, job.public_token) : "";
    try {
      const res = await provider.send({
        idempotencyKey: job.idempotency_key,
        channel: job.channel,
        template: job.template,
        to,
        variables: {
          cliente: job.client_name?.split(" ")[0] ?? "",
          negocio: job.org_name,
          inicio: job.starts_at ? job.starts_at.toISOString() : "",
          servicos: (job.services ?? []).join(" + "),
          // Comprovante completo: serviços, horário, profissional, endereço, calendário e "confirmar presença".
          link,
          quando: job.starts_at ? `${onDay(job.starts_at, job.timezone)} às ${hourText(job.starts_at, job.timezone)}` : "",
          profissional: job.professional_name?.split(" ")[0] ?? "",
          // Texto pronto no tom da casa (o provedor usa quando o canal aceita texto livre).
          ...(job.template === "appointment_confirmation" && job.starts_at && job.client_name && link
            ? { mensagem: confirmationMessage({
                clientName: job.client_name, services: job.services ?? [], startsAt: job.starts_at, timeZone: job.timezone,
                professionalName: job.professional_name ?? "", url: link, pending: job.appt_status === "pending" }) }
            : {}),
          ...(job.template === "appointment_reminder" && job.starts_at && job.client_name
            ? { mensagem: reminderMessage({ clientName: job.client_name, services: job.services ?? [], startsAt: job.starts_at,
                timeZone: job.timezone, professionalName: job.professional_name ?? "", businessName: job.org_name }) }
            : {}),
          ...(job.body ? { mensagem: job.body } : {}),
        },
        ...(job.body ? { body: job.body, buttons: job.buttons ?? undefined } : {}),
        ...(job.template === "appointment_reminder" ? { buttons: [{ id: "confirm", title: "Confirmo" }, { id: "reschedule", title: "Preciso remarcar" }] } : {}),
      });
      // O lembrete abre a conversa: a resposta da cliente segue o roteiro (confirmar → oferta → reserva).
      if (job.template === "appointment_reminder" && job.channel === "whatsapp" && job.appointment_id && job.client_id && job.starts_at
          && (job.appt_status === "pending" || job.appt_status === "confirmed"))
        await openReminderThread(sql, { organizationId: job.organization_id, appointmentId: job.appointment_id, clientId: job.client_id, phone: to, startsAt: job.starts_at });
      result.sent++;
      await sql`update app.message_jobs set status = 'sent', sent_at = now(), provider_message_id = ${res.providerMessageId},
                last_error = null, updated_at = now() where id = ${job.id}`;
    } catch (err) {
      result.failed++;
      const message = err instanceof Error ? err.message.slice(0, 300) : "Erro desconhecido";
      const exhausted = job.attempts >= job.max_attempts;
      // Retentativa com espera exponencial: 1, 2, 4, 8... minutos.
      await sql`update app.message_jobs set
                status = ${exhausted ? "failed" : "pending"},
                next_attempt_at = now() + make_interval(mins => ${2 ** (job.attempts - 1)}),
                last_error = ${message}, updated_at = now()
                where id = ${job.id}`;
    }
  }
  return result;
}
