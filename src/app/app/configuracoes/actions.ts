"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionContext, tenant } from "@/server/context";
import { withSystem } from "@/server/db";
import { audit } from "@/server/modules/audit";
import { DomainError, type ActionState } from "@/server/errors";
import { connectWhatsApp, disconnectWhatsApp } from "@/server/modules/whatsapp-connection";

const orgSchema = z.object({
  name: z.string().trim().min(2, "Qual é o nome do seu negócio?").max(120),
  phone: z.string().trim().max(30).optional(),
  instagram: z.string().trim().max(60).optional(),
  address: z.string().trim().max(200).optional(),
  onlineBookingEnabled: z.boolean(),
  onlineRequiresApproval: z.boolean(),
  minAdvanceMinutes: z.coerce.number().int().min(0).max(10080),
  maxAdvanceDays: z.coerce.number().int().min(1).max(365),
  slotIntervalMinutes: z.coerce.number().refine((v) => [5, 10, 15, 20, 30, 60].includes(v), "Esse intervalo não ficou certo. Confere?"),
  cancellationNoticeHours: z.coerce.number().int().min(0).max(168),
  bookingPolicyText: z.string().trim().max(2000).optional(),
});

export async function saveOrganizationAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const ctx = await actionContext("settings.manage");
    const parsed = orgSchema.safeParse({
      ...Object.fromEntries(form),
      onlineBookingEnabled: form.get("onlineBookingEnabled") === "on",
      onlineRequiresApproval: form.get("onlineRequiresApproval") === "on",
    });
    if (!parsed.success) return { ok: false, message: "Dá uma olhadinha nos campos destacados.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
    const d = parsed.data;
    await tenant(ctx, async (tx) => {
      await tx`update app.organizations set name = ${d.name}, phone = ${d.phone || null}, instagram = ${d.instagram?.replace(/^@/, "") || null},
        address = ${d.address || null}, online_booking_enabled = ${d.onlineBookingEnabled}, online_requires_approval = ${d.onlineRequiresApproval},
        min_advance_minutes = ${d.minAdvanceMinutes}, max_advance_days = ${d.maxAdvanceDays}, slot_interval_minutes = ${d.slotIntervalMinutes},
        cancellation_notice_hours = ${d.cancellationNoticeHours}, booking_policy_text = ${d.bookingPolicyText || null}
        where id = ${ctx.org.id}`;
      await audit(tx, { userId: ctx.user.userId, organizationId: ctx.org.id }, "organization.settings_updated", "organization", ctx.org.id);
    });
    revalidatePath("/app", "layout");
    return { ok: true, message: "Configurações salvas." };
  } catch (err) {
    if (err instanceof DomainError) return { ok: false, message: err.message };
    throw err;
  }
}

/** LGPD: registra a solicitação; a exclusão efetiva é um processo assistido (ver docs/SEGURANCA_LGPD.md). */
export async function requestAccountDeletionAction(): Promise<ActionState> {
  const ctx = await actionContext(undefined, { write: false });
  await withSystem(async (tx) => {
    await tx`update app.users set deletion_requested_at = coalesce(deletion_requested_at, now()) where id = ${ctx.user.userId}`;
    await audit(tx, { userId: ctx.user.userId, organizationId: ctx.org.id }, "account.deletion_requested", "user", ctx.user.userId);
  });
  return { ok: true, message: "Pedido anotado. Vamos falar com você por e-mail para confirmar antes de apagar qualquer coisa." };
}

/** Liga/desliga as automações do WhatsApp (lembrete com confirmação e oferta de serviço extra). */
export async function saveAutomationsAction(input: { reminder: boolean; upsell: boolean }): Promise<ActionState> {
  try {
    const ctx = await actionContext("settings.manage");
    const reminder = input.reminder === true, upsell = input.upsell === true && input.reminder === true;
    await tenant(ctx, async (tx) => {
      await tx`update app.organizations set whatsapp_reminder_enabled = ${reminder}, whatsapp_upsell_enabled = ${upsell} where id = ${ctx.org.id}`;
      await audit(tx, { userId: ctx.user.userId, organizationId: ctx.org.id }, "organization.automations_updated", "organization", ctx.org.id, { reminder, upsell });
    });
    revalidatePath("/app/configuracoes");
    return { ok: true, message: reminder ? (upsell ? "Lembrete e oferta de extra ligados." : "Lembrete ligado, oferta de extra desligada.") : "Automações desligadas." };
  } catch (err) {
    if (err instanceof DomainError) return { ok: false, message: err.message };
    throw err;
  }
}

const waSchema = z.object({
  phoneNumberId: z.string().trim().regex(/^\d{8,24}$/, "O ID do número tem só dígitos (aparece na Meta, em WhatsApp > Configuração da API)."),
  wabaId: z.string().trim().regex(/^\d{8,24}$/, "O ID da conta do WhatsApp Business tem só dígitos.").optional().or(z.literal("")),
  token: z.string().trim().min(20, "Cole o token de acesso completo.").max(1000),
  appSecret: z.string().trim().max(200).optional(),
});

/** Conecta o número de WhatsApp do próprio estabelecimento (API oficial da Meta). */
export async function connectWhatsAppAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const ctx = await actionContext("settings.manage");
    const parsed = waSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, message: "Dá uma olhadinha nos campos destacados.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
    const r = await withSystem(async (tx) => {
      const out = await connectWhatsApp(tx, ctx.org.id, parsed.data);
      await audit(tx, { userId: ctx.user.userId, organizationId: ctx.org.id }, "organization.whatsapp_connected", "organization", ctx.org.id, { phone: out.displayPhone });
      return out;
    });
    revalidatePath("/app/configuracoes");
    return { ok: true, message: `WhatsApp conectado${r.displayPhone ? `: ${r.displayPhone}` : ""}.` };
  } catch (err) {
    if (err instanceof DomainError) return { ok: false, message: err.message };
    throw err;
  }
}

export async function disconnectWhatsAppAction(): Promise<ActionState> {
  try {
    const ctx = await actionContext("settings.manage");
    await withSystem(async (tx) => {
      await disconnectWhatsApp(tx, ctx.org.id);
      await audit(tx, { userId: ctx.user.userId, organizationId: ctx.org.id }, "organization.whatsapp_disconnected", "organization", ctx.org.id);
    });
    revalidatePath("/app/configuracoes");
    return { ok: true, message: "WhatsApp desconectado. Nada mais será enviado por ele." };
  } catch (err) {
    if (err instanceof DomainError) return { ok: false, message: err.message };
    throw err;
  }
}
