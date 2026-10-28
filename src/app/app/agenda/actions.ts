"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionContext, tenant } from "@/server/context";
import { DomainError, type ActionState } from "@/server/errors";
import { can } from "@/domain/permissions";
import { APPOINTMENT_STATUSES } from "@/domain/appointment-status";
import { suggestRelatedServices } from "@/server/modules/upsell";
import { receiptUrl } from "@/server/modules/receipt";
import {
  addServiceSchema, addServiceToAppointment, recordConfirmationSent, undoLastStatusChange, changeStatus, createAppointment, createAppointmentSchema, getAppointmentDetail, rescheduleAppointment, rescheduleSchema,
} from "@/server/modules/appointments";
import { recordPayment, recordPaymentSchema, refundPayment, refundSchema } from "@/server/modules/payments";
import { clientSchema, createClient, findPossibleDuplicates } from "@/server/modules/clients";
import { loadPolicy, loadServices, professionalCanDo, slotsForProfessional, totals } from "@/server/modules/scheduling";
import { localTime } from "@/lib/time";

function fail(err: unknown): { ok: false; message: string } {
  if (err instanceof DomainError) return { ok: false, message: err.message };
  if (err instanceof z.ZodError) return { ok: false, message: err.issues[0]?.message ?? "Dados inválidos." };
  console.error("[agenda]", err instanceof Error ? err.message : err);
  return { ok: false, message: "Não foi possível concluir. Tente novamente." };
}

const actorOf = (ctx: Awaited<ReturnType<typeof actionContext>>) => ({ userId: ctx.user.userId, organizationId: ctx.org.id });

/** Profissionais só criam/alteram na própria agenda (o RLS também impõe isso). */
function assertOwnAgenda(ctx: Awaited<ReturnType<typeof actionContext>>, professionalId: string) {
  if (!can(ctx.role, "agenda.view_all") && ctx.professionalId !== professionalId)
    throw new DomainError("Você só pode gerenciar a sua própria agenda.", "forbidden");
}

export async function createAppointmentAction(input: unknown): Promise<ActionState<{ id: string }>> {
  try {
    const ctx = await actionContext("agenda.manage");
    const data = createAppointmentSchema.parse(input);
    assertOwnAgenda(ctx, data.professionalId);
    const appt = await tenant(ctx, (tx) => createAppointment(tx, actorOf(ctx), data));
    revalidatePath("/app", "layout");
    return { ok: true, message: "Agendamento criado.", data: { id: appt.id } };
  } catch (err) {
    return fail(err);
  }
}

export async function rescheduleAction(input: unknown): Promise<ActionState> {
  try {
    const ctx = await actionContext("agenda.manage");
    const data = rescheduleSchema.parse(input);
    assertOwnAgenda(ctx, data.professionalId);
    await tenant(ctx, (tx) => rescheduleAppointment(tx, actorOf(ctx), data));
    revalidatePath("/app", "layout");
    return { ok: true, message: "Agendamento reagendado. Lembretes atualizados." };
  } catch (err) {
    return fail(err);
  }
}

const statusInput = z.object({ appointmentId: z.uuid(), status: z.enum(APPOINTMENT_STATUSES), reason: z.string().max(300).optional() });

export async function changeStatusAction(input: unknown): Promise<ActionState> {
  try {
    const ctx = await actionContext("agenda.manage");
    const data = statusInput.parse(input);
    await tenant(ctx, (tx) => changeStatus(tx, actorOf(ctx), data.appointmentId, data.status, data.reason));
    revalidatePath("/app", "layout");
    return { ok: true, message: "Status atualizado." };
  } catch (err) {
    return fail(err);
  }
}

export async function recordPaymentAction(input: unknown): Promise<ActionState> {
  try {
    const ctx = await actionContext("finance.record");
    const data = recordPaymentSchema.parse(input);
    await tenant(ctx, (tx) => recordPayment(tx, actorOf(ctx), data));
    revalidatePath("/app", "layout");
    return { ok: true, message: "Pagamento registrado." };
  } catch (err) {
    return fail(err);
  }
}

export async function refundAction(input: unknown): Promise<ActionState> {
  try {
    const ctx = await actionContext("finance.record");
    const data = refundSchema.parse(input);
    await tenant(ctx, (tx) => refundPayment(tx, actorOf(ctx), data));
    revalidatePath("/app", "layout");
    return { ok: true, message: "Estorno registrado." };
  } catch (err) {
    return fail(err);
  }
}

export async function addServiceAction(input: unknown): Promise<ActionState> {
  try {
    const ctx = await actionContext("agenda.manage");
    const data = addServiceSchema.parse(input);
    const r = await tenant(ctx, (tx) => addServiceToAppointment(tx, actorOf(ctx), data));
    revalidatePath("/app", "layout");
    return { ok: true, message: `${r.name} adicionado ao atendimento.` };
  } catch (err) {
    return fail(err);
  }
}

export async function undoStatusAction(appointmentId: string): Promise<ActionState> {
  try {
    const ctx = await actionContext("agenda.manage");
    const id = z.uuid().parse(appointmentId);
    await tenant(ctx, (tx) => undoLastStatusChange(tx, actorOf(ctx), id));
    revalidatePath("/app", "layout");
    return { ok: true, message: "Desfeito. O horário voltou para a agenda." };
  } catch (err) {
    return fail(err);
  }
}

export async function confirmationSentAction(appointmentId: string): Promise<ActionState> {
  try {
    const ctx = await actionContext("agenda.manage");
    const id = z.uuid().parse(appointmentId);
    await tenant(ctx, (tx) => recordConfirmationSent(tx, actorOf(ctx), id));
    revalidatePath("/app/agenda");
    return { ok: true, message: "Envio registrado no histórico." };
  } catch (err) {
    return fail(err);
  }
}

export async function getAppointmentAction(id: string) {
  const ctx = await actionContext(undefined, { write: false });
  if (!z.uuid().safeParse(id).success) return null;
  const [d, suggestions] = await tenant(ctx, async (tx) => {
    const detail = await getAppointmentDetail(tx, ctx.org.id, id, { withPayments: can(ctx.role, "finance.view") });
    return [detail, detail ? await suggestRelatedServices(tx, ctx.org.id, id) : []] as const;
  });
  if (!d) return null;
  return {
    id: d.id, status: d.status, source: d.source, version: d.version,
    startsAt: d.starts_at.toISOString(), endsAt: d.ends_at.toISOString(),
    professionalId: d.professional_id, professionalName: d.professional_name,
    clientId: d.client_id, clientName: d.client_name, clientPhone: d.client_phone,
    priceCents: d.price_cents, discountCents: d.discount_cents, squeezeIn: d.allow_overlap,
    internalNotes: can(ctx.role, "clients.view_internal_notes") ? d.internal_notes : null,
    clientNotes: d.client_notes, cancelReason: d.cancel_reason,
    services: d.serviceItems,
    events: d.events.map((e) => ({ ...e, created_at: e.created_at.toISOString() })),
    messages: d.messages.map((m) => ({ ...m, scheduled_for: m.scheduled_for.toISOString() })),
    payments: d.payments.map((p) => ({ ...p, paid_at: p.paid_at.toISOString() })),
    suggestions,
    receiptUrl: receiptUrl(ctx.org.slug, d.public_token),
    clientConfirmedAt: d.client_confirmed_at?.toISOString() ?? null,
    canSeeFinance: can(ctx.role, "finance.view"),
    canRecordPayment: can(ctx.role, "finance.record"),
  };
}
export type AppointmentDetailDTO = NonNullable<Awaited<ReturnType<typeof getAppointmentAction>>>;

export async function searchClientsAction(q: string) {
  const ctx = await actionContext("clients.view", { write: false });
  const term = q.trim().slice(0, 80);
  if (term.length < 2) return [];
  const digits = term.replace(/\D/g, "");
  return tenant(ctx, (tx) => tx<{ id: string; full_name: string; phone_normalized: string | null }[]>`
    select id, full_name, phone_normalized from app.clients
    where organization_id = ${ctx.org.id} and archived_at is null
      and (full_name ilike ${"%" + term + "%"} or (${digits.length >= 4} and phone_normalized like ${"%" + digits + "%"}))
    order by full_name limit 8`);
}

export async function quickCreateClientAction(input: { fullName: string; phone: string; force?: boolean }): Promise<ActionState<{ id: string; full_name: string; duplicates?: { id: string; full_name: string; reason: string }[] }>> {
  try {
    const ctx = await actionContext("clients.manage");
    const data = clientSchema.parse({ fullName: input.fullName, phone: input.phone || undefined });
    return await tenant(ctx, async (tx) => {
      if (!input.force) {
        const dups = await findPossibleDuplicates(tx, ctx.org.id, data);
        if (dups.length) return { ok: false as const, message: "Encontramos cadastros parecidos. Use um deles ou confirme o novo cadastro.", fieldErrors: { duplicates: dups.map((d) => JSON.stringify(d)) } };
      }
      const c = await createClient(tx, actorOf(ctx), data);
      return { ok: true as const, data: { id: c.id, full_name: data.fullName } };
    });
  } catch (err) {
    return fail(err);
  }
}

const slotsInput = z.object({ professionalId: z.uuid(), date: z.string(), serviceIds: z.array(z.uuid()).min(1), excludeAppointmentId: z.uuid().optional() });

/** Horários livres para a equipe (sem antecedência mínima — a recepção pode marcar para daqui a pouco). */
export async function findSlotsAction(input: unknown): Promise<{ ok: boolean; times: string[]; message?: string }> {
  try {
    const ctx = await actionContext("agenda.manage", { write: false });
    const data = slotsInput.parse(input);
    return await tenant(ctx, async (tx) => {
      if (!(await professionalCanDo(tx, ctx.org.id, data.professionalId, data.serviceIds)))
        return { ok: false, times: [], message: "Esta profissional não realiza todos os serviços escolhidos." };
      const policy = await loadPolicy(tx, ctx.org.id);
      const t = totals(await loadServices(tx, ctx.org.id, data.serviceIds));
      const slots = await slotsForProfessional(tx, ctx.org.id, data.professionalId, data.date, policy, t.minutes, t.bufferAfter, new Date(), { ignoreAdvanceRules: true });
      return { ok: true, times: slots.map((s) => localTime(s, policy.timezone)) };
    });
  } catch (err) {
    return { ...fail(err), times: [] };
  }
}
