"use server";
import { revalidatePath } from "next/cache";
import { withSystem } from "@/server/db";
import { clientIp } from "@/server/auth/session";
import { rateLimit } from "@/server/rate-limit";
import { DomainError } from "@/server/errors";
import { confirmAttendance, receiptPath, TOKEN_RE } from "@/server/modules/receipt";

export async function confirmAttendanceAction(slug: string, token: string) {
  if (!TOKEN_RE.test(token)) return { ok: false as const, message: "Agendamento não encontrado." };
  const ip = await clientIp();
  if (!(await rateLimit(`confirm:${ip}`, 20, 3600))) return { ok: false as const, message: "Muitas tentativas. Tente mais tarde." };
  try {
    await withSystem((tx) => confirmAttendance(tx, slug, token));
    revalidatePath(receiptPath(slug, token));
    return { ok: true as const, message: "Presença confirmada! O estabelecimento já foi avisado." };
  } catch (err) {
    if (err instanceof DomainError) return { ok: false as const, message: err.message };
    console.error("[receipt]", err instanceof Error ? err.message : err);
    return { ok: false as const, message: "Não foi possível confirmar agora. Tente novamente." };
  }
}
