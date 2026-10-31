"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionContext, tenant } from "@/server/context";
import { withSystem } from "@/server/db";
import { audit } from "@/server/modules/audit";
import { DomainError, type ActionState } from "@/server/errors";

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
    return { ok: true, message: "Tudo salvo! ✨" };
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
