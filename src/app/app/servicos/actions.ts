"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionContext, tenant } from "@/server/context";
import { adjustPrices, saveService, serviceSchema, setServiceActive } from "@/server/modules/catalog";
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
      offerAsExtra: form.get("offerAsExtra") === "on",
      professionalIds: form.getAll("professionalIds").map(String),
    });
    if (!parsed.success) return { ok: false, message: "Dá uma olhadinha nos campos destacados.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
    const id = String(form.get("id") ?? "") || undefined;
    await tenant(ctx, (tx) => saveService(tx, { userId: ctx.user.userId, organizationId: ctx.org.id }, parsed.data, id));
    revalidatePath("/app/servicos");
    return { ok: true, message: id ? "Serviço atualizado! ✨" : "Serviço criado! ✨" };
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
    return { ok: true, message: active ? "Serviço de volta ao cardápio!" : "Serviço pausado. O histórico continua guardado." };
  } catch (err) {
    if (err instanceof DomainError) return { ok: false, message: err.message };
    throw err;
  }
}

export async function adjustPricesAction(input: { serviceIds: string[]; percent: number; roundTo: number }): Promise<ActionState> {
  try {
    const ctx = await actionContext("services.manage");
    const ids = z.array(z.uuid()).max(500).safeParse(input.serviceIds);
    const roundTo = [0, 100, 500, 1000].includes(input.roundTo) ? input.roundTo : 0;
    if (!ids.success) return { ok: false, message: "Algo não ficou certo na escolha dos serviços." };
    const n = await tenant(ctx, (tx) => adjustPrices(tx, { userId: ctx.user.userId, organizationId: ctx.org.id }, { serviceIds: ids.data, percent: Number(input.percent), roundTo }));
    revalidatePath("/app/servicos");
    return { ok: true, message: n === 1 ? "Preço reajustado! ✨" : `${n} preços reajustados! ✨` };
  } catch (err) {
    if (err instanceof DomainError) return { ok: false, message: err.message };
    throw err;
  }
}
