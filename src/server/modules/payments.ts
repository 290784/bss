import { z } from "zod";
import type { Tx } from "@/server/db";
import { DomainError } from "@/server/errors";
import { audit } from "@/server/modules/audit";
import type { Actor } from "@/server/modules/appointments";

export const PAYMENT_METHODS = ["pix", "cash", "credit_card", "debit_card", "bank_transfer", "other"] as const;
export const METHOD_LABEL: Record<(typeof PAYMENT_METHODS)[number], string> = {
  pix: "PIX", cash: "Dinheiro", credit_card: "Cartão de crédito", debit_card: "Cartão de débito",
  bank_transfer: "Transferência", other: "Outro",
};

export const recordPaymentSchema = z.object({
  appointmentId: z.uuid(),
  amountCents: z.number().int().positive("Informe um valor maior que zero.").max(100_000_00),
  method: z.enum(PAYMENT_METHODS),
  isDeposit: z.boolean().default(false),
  notes: z.string().max(500).optional(),
});

/** Saldo do atendimento: valor devido, pago (líquido de estornos) e restante. */
export async function appointmentBalance(tx: Tx, orgId: string, appointmentId: string) {
  const [r] = await tx<{ due: number; paid: number }[]>`
    select (a.price_cents - a.discount_cents) as due,
      coalesce((select sum(case when p.kind = 'payment' then p.amount_cents else -p.amount_cents end)
                from app.payments p where p.appointment_id = a.id), 0)::int as paid
    from app.appointments a where a.organization_id = ${orgId} and a.id = ${appointmentId}`;
  if (!r) throw new DomainError("Não achei esse agendamento. Atualiza a página?");
  return { due: r.due, paid: r.paid, remaining: Math.max(r.due - r.paid, 0) };
}

/**
 * Registra pagamento integral, parcial ou sinal. O estado do pagamento é independente
 * do status do agendamento: um cancelamento nunca apaga lançamentos.
 */
export async function recordPayment(tx: Tx, actor: Actor, input: z.infer<typeof recordPaymentSchema>) {
  const [appt] = await tx<{ id: string; client_id: string; status: string }[]>`
    select id, client_id, status from app.appointments where organization_id = ${actor.organizationId} and id = ${input.appointmentId} for update`;
  if (!appt) throw new DomainError("Não achei esse agendamento. Atualiza a página?");
  if (appt.status === "cancelled" && !input.isDeposit)
    throw new DomainError("Atendimento cancelado não recebe pagamento novo (só dá para reter o sinal).");
  const bal = await appointmentBalance(tx, actor.organizationId, appt.id);
  if (input.amountCents > bal.remaining)
    throw new DomainError("Esse valor passa do que falta receber nesse atendimento.");
  const [p] = await tx<{ id: string }[]>`
    insert into app.payments (organization_id, appointment_id, client_id, kind, amount_cents, method, is_deposit, notes, created_by)
    values (${actor.organizationId}, ${appt.id}, ${appt.client_id}, 'payment', ${input.amountCents}, ${input.method},
            ${input.isDeposit}, ${input.notes ?? null}, ${actor.userId})
    returning id`;
  await tx`insert into app.appointment_events (organization_id, appointment_id, actor_user_id, type, data)
           values (${actor.organizationId}, ${appt.id}, ${actor.userId}, 'payment_recorded',
                   ${tx.json({ amountCents: input.amountCents, method: input.method, isDeposit: input.isDeposit })})`;
  await audit(tx, actor, "payment.recorded", "payment", p!.id, { amountCents: input.amountCents, method: input.method });
  return p!;
}

export const refundSchema = z.object({
  paymentId: z.uuid(),
  amountCents: z.number().int().positive(),
  reason: z.string().min(3, "Descreva o motivo do estorno.").max(500),
});

/** Estorno = novo lançamento negativo vinculado ao original. Nada é apagado ou editado. */
export async function refundPayment(tx: Tx, actor: Actor, input: z.infer<typeof refundSchema>) {
  // Lançamentos são imutáveis (sem UPDATE), então serializamos estornos com um lock transacional.
  await tx`select pg_advisory_xact_lock(hashtext(${"refund:" + input.paymentId}))`;
  const [orig] = await tx<{ id: string; appointment_id: string | null; client_id: string | null; amount_cents: number; method: string; kind: string }[]>`
    select id, appointment_id, client_id, amount_cents, method, kind from app.payments
    where organization_id = ${actor.organizationId} and id = ${input.paymentId}`;
  if (!orig || orig.kind !== "payment") throw new DomainError("Não achei esse pagamento.");
  const [{ refunded } = { refunded: 0 }] = await tx<{ refunded: number }[]>`
    select coalesce(sum(amount_cents), 0)::int as refunded from app.payments where refund_of = ${orig.id}`;
  if (input.amountCents > orig.amount_cents - refunded)
    throw new DomainError("O estorno passa do valor que ainda dá para devolver nesse pagamento.");
  const [r] = await tx<{ id: string }[]>`
    insert into app.payments (organization_id, appointment_id, client_id, kind, amount_cents, method, refund_of, notes, created_by)
    values (${actor.organizationId}, ${orig.appointment_id}, ${orig.client_id}, 'refund', ${input.amountCents}, ${orig.method},
            ${orig.id}, ${input.reason}, ${actor.userId})
    returning id`;
  if (orig.appointment_id)
    await tx`insert into app.appointment_events (organization_id, appointment_id, actor_user_id, type, data)
             values (${actor.organizationId}, ${orig.appointment_id}, ${actor.userId}, 'payment_refunded',
                     ${tx.json({ amountCents: input.amountCents, reason: input.reason })})`;
  await audit(tx, actor, "payment.refunded", "payment", r!.id, { refundOf: orig.id, amountCents: input.amountCents });
  return r!;
}
