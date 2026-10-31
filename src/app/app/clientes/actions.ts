"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionContext, tenant } from "@/server/context";
import { can } from "@/domain/permissions";
import { archiveClient, clientSchema, createClient, findPossibleDuplicates, updateClient } from "@/server/modules/clients";
import { DomainError, type ActionState } from "@/server/errors";

function formToClient(form: FormData) {
  return {
    fullName: form.get("fullName"),
    phone: form.get("phone") || undefined,
    email: form.get("email") || undefined,
    birthDate: form.get("birthDate") || undefined,
    contactPreference: form.get("contactPreference") || "whatsapp",
    marketingConsent: form.get("marketingConsent") === "on",
    preferences: form.get("preferences") || undefined,
    internalNotes: form.get("internalNotes") || undefined,
  };
}

export async function saveClientAction(_: ActionState<{ id: string }>, form: FormData): Promise<ActionState<{ id: string }>> {
  try {
    const ctx = await actionContext("clients.manage");
    const parsed = clientSchema.safeParse(formToClient(form));
    if (!parsed.success) return { ok: false, message: "Dá uma olhadinha nos campos destacados.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
    const id = String(form.get("id") ?? "") || undefined;
    const actor = { userId: ctx.user.userId, organizationId: ctx.org.id };
    const result = await tenant(ctx, async (tx) => {
      if (!form.get("ignoreDuplicates")) {
        const dups = await findPossibleDuplicates(tx, ctx.org.id, parsed.data, id);
        if (dups.length)
          return { ok: false as const, message: `Possível cadastro duplicado: ${dups.map((d) => `${d.full_name} (${d.reason})`).join(", ")}. Se for outra pessoa mesmo, é só salvar de novo.`, fieldErrors: { duplicate: ["1"] } };
      }
      if (id) {
        await updateClient(tx, actor, id, parsed.data, { canEditInternalNotes: can(ctx.role, "clients.view_internal_notes") });
        return { ok: true as const, message: "Cliente atualizada! 💜", data: { id } };
      }
      const c = await createClient(tx, actor, { ...parsed.data, internalNotes: can(ctx.role, "clients.view_internal_notes") ? parsed.data.internalNotes : null });
      return { ok: true as const, message: "Cliente cadastrada! ✨", data: { id: c.id } };
    });
    revalidatePath("/app/clientes");
    return result;
  } catch (err) {
    if (err instanceof DomainError) return { ok: false, message: err.message };
    throw err;
  }
}

export async function archiveClientAction(id: string, archived: boolean): Promise<ActionState> {
  try {
    const ctx = await actionContext("clients.delete");
    await tenant(ctx, (tx) => archiveClient(tx, { userId: ctx.user.userId, organizationId: ctx.org.id }, id, archived));
    revalidatePath("/app/clientes");
    return { ok: true, message: archived ? "Cliente arquivada." : "Cliente de volta na lista!" };
  } catch (err) {
    if (err instanceof DomainError) return { ok: false, message: err.message };
    throw err;
  }
}
