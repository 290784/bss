"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePlatformAdmin } from "@/server/admin";
import { withSystem } from "@/server/db";
import { removeWaitlistEntry } from "@/server/modules/waitlist";
import type { ActionState } from "@/server/errors";

/** Equipe da Gê: tira uma pessoa da lista de espera (pedido de exclusão ou contato já resolvido). Só o código vai para a auditoria, nunca o nome nem o telefone. */
export async function removeFromWaitlistAction(id: string): Promise<ActionState> {
  const admin = await requirePlatformAdmin();
  if (!z.uuid().safeParse(id).success) return { ok: false, message: "Código inválido." };
  const removed = await withSystem((tx) => removeWaitlistEntry(tx, admin.userId, id));
  revalidatePath("/admin/lista-de-espera");
  return removed ? { ok: true, message: "Removida da lista. Se ela também está na planilha do Make, apague a linha lá." } : { ok: false, message: "Essa pessoa já não está na lista." };
}
