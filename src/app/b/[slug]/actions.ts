"use server";
import { z } from "zod";
import { withSystem } from "@/server/db";
import { clientIp } from "@/server/auth/session";
import { rateLimit } from "@/server/rate-limit";
import { bookOnline, getPublicBusiness, onlineBookingSchema, publicSlots } from "@/server/modules/public-booking";
import { normalizePhone } from "@/lib/text";
import { DomainError } from "@/server/errors";
import { dispatchSoon } from "@/server/dispatch-soon";

export async function publicSlotsAction(slug: string, serviceId: string, professionalId: string | null, date: string) {
  const ip = await clientIp();
  if (!(await rateLimit(`slots:${ip}`, 240, 600))) return { ok: false as const, message: "Muitas consultas. Aguarde um instante.", slots: [] };
  return withSystem(async (tx) => {
    const biz = await getPublicBusiness(tx, slug);
    if (!biz) return { ok: false as const, message: "Agendamento indisponível.", slots: [] };
    return { ok: true as const, slots: await publicSlots(tx, biz, serviceId, professionalId, date) };
  });
}

export async function bookAction(slug: string, input: Record<string, unknown>) {
  // Campo invisível: bots costumam preenchê-lo.
  if (input.website) return { ok: false as const, message: "Não foi possível concluir." };
  const parsed = onlineBookingSchema.safeParse(input);
  if (!parsed.success) {
    const fe = z.flattenError(parsed.error).fieldErrors;
    return { ok: false as const, message: Object.values(fe).flat()[0] ?? "Revise os dados.", fieldErrors: fe };
  }
  const ip = await clientIp();
  const phone = normalizePhone(parsed.data.phone) ?? "";
  if (!(await rateLimit(`book:ip:${ip}`, 8, 3600)) || !(await rateLimit(`book:phone:${slug}:${phone}`, 4, 3600)))
    return { ok: false as const, message: "Muitas solicitações em pouco tempo. Tente novamente mais tarde ou fale com o estabelecimento." };
  try {
    return await withSystem(async (tx) => {
      const biz = await getPublicBusiness(tx, slug);
      if (!biz) return { ok: false as const, message: "Agendamento online indisponível." };
      const r = await bookOnline(tx, biz, parsed.data);
      dispatchSoon();
      return { ok: true as const, ...r };
    });
  } catch (err) {
    if (err instanceof DomainError) return { ok: false as const, message: err.message, conflict: err.code === "conflict" };
    console.error("[public-booking]", err instanceof Error ? err.message : err);
    return { ok: false as const, message: "Não foi possível concluir agora. Tente novamente." };
  }
}
