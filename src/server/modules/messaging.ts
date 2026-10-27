import type { Sql, Tx } from "@/server/db";

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
export type Template = "appointment_confirmation" | "appointment_reminder" | "appointment_cancelled";

export const TEMPLATE_LABEL: Record<Template, string> = {
  appointment_confirmation: "Confirmação do agendamento",
  appointment_reminder: "Lembrete 24h antes",
  appointment_cancelled: "Aviso de cancelamento",
};

export type OutgoingMessage = {
  idempotencyKey: string;
  channel: Channel;
  template: Template;
  to: string;
  variables: Record<string, string>;
};

export interface MessageProvider {
  channel: Channel;
  send(msg: OutgoingMessage): Promise<{ providerMessageId: string }>;
}

/** Provedores reais entram aqui quando houver credenciais (ver docs/INTEGRACOES.md). */
export function configuredProviders(): MessageProvider[] {
  return [];
}

const REMINDER_HOURS = 24;

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
  const reminderAt = new Date(appt.starts_at.getTime() - REMINDER_HOURS * 3_600_000);
  if (reminderAt > now) jobs.push({ template: "appointment_reminder", at: reminderAt });
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
  to_phone: string | null; to_email: string | null; client_name: string | null; starts_at: Date | null;
  org_name: string; timezone: string;
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
           c.phone_normalized as to_phone, c.email as to_email, c.full_name as client_name,
           a.starts_at, o.name as org_name, o.timezone
    from claimed j
    join app.organizations o on o.id = j.organization_id
    left join app.clients c on c.id = j.client_id
    left join app.appointments a on a.id = j.appointment_id`);

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
        },
      });
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
