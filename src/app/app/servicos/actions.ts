"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionContext, tenant } from "@/server/context";
import { saveService, serviceSchema, setServiceActive } from "@/server/modules/catalog";
import { DomainError, type ActionState } from "@/server/errors";

export async function saveServiceAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const ctx = await actionContext("services.manage");
    const parsed = serviceSchema.safeParse({
      name: form.get("name"),
      categoryName: form.get("categoryName") || undefined,
      description: form.get("description") || undefined,
      price: String(form.get("price") ?? ""),
      durationMinutes: form.get("durationMinutes"),
      bufferAfterMinutes: form.get("bufferAfterMinutes") || 0,
      returnIntervalDays: form.get("returnIntervalDays") || undefined,
      onlineBookable: form.get("onlineBookable") === "on",
      professionalIds: form.getAll("professionalIds").map(String),
    });
    if (!parsed.success) return { ok: false, message: "Revise os campos destacados.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
    const id = String(form.get("id") ?? "") || undefined;
    await tenant(ctx, (tx) => saveService(tx, { userId: ctx.user.userId, organizationId: ctx.org.id }, parsed.data, id));
    revalidatePath("/app/servicos");
    return { ok: true, message: id ? "Serviço atualizado." : "Serviço criado." };
  } catch (err) {
    if (err instanceof DomainError) return { ok: false, message: err.message };
    throw err;
  }
}

export async function toggleServiceAction(id: string, active: boolean): Promise<ActionState> {
  try {
    const ctx = await actionContext("services.manage");
    await tenant(ctx, (tx) => setServiceActive(tx, { userId: ctx.user.userId, organizationId: ctx.org.id }, id, active));
    revalidatePath("/app/servicos");
    return { ok: true, message: active ? "Serviço reativado." : "Serviço desativado. O histórico foi mantido." };
  } catch (err) {
    if (err instanceof DomainError) return { ok: false, message: err.message };
    throw err;
  }
}
