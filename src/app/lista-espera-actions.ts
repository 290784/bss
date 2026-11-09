"use server";
import { z } from "zod";
import { withSystem } from "@/server/db";
import { clientIp } from "@/server/auth/session";
import { rateLimit } from "@/server/rate-limit";
import { trackEvent } from "@/server/modules/audit";
import { BUSINESS_TYPES } from "@/server/modules/catalog";
import { notifyWaitlistToMake } from "@/server/make-webhook";
import { formatPhone } from "@/lib/text";
import { normalizeCanal } from "@/domain/canal";
import { normalizePhone } from "@/lib/text";
import type { ActionState } from "@/server/errors";

const schema = z.object({
  fullName: z.string().trim().min(2, "Como você se chama?").max(120),
  phone: z.string().transform((v) => normalizePhone(v)).refine((v): v is string => v !== null, "Esse WhatsApp não parece certo. Coloque com DDD."),
  businessType: z.enum(BUSINESS_TYPES.map((b) => b.id) as [string, ...string[]], { error: "Escolha o que você faz." }),
  accept: z.literal("on", { error: "Para entrar na lista, aceite que a Gê te chame no WhatsApp." }),
});

/** Lista de espera da landing: nome, WhatsApp e o que ela faz. Repetir o mesmo número não duplica. */
export async function joinWaitlist(_: ActionState, form: FormData): Promise<ActionState> {
  const ip = await clientIp();
  if (!(await rateLimit(`waitlist:${ip}`, 6, 3600))) return { ok: false, message: "Muitas tentativas seguidas. Tenta de novo daqui a pouquinho." };
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "Dá uma olhadinha nos campos destacados.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { fullName, phone, businessType } = parsed.data;
  const canal = normalizeCanal(form.get("canal"));
  let entrouAgora = false;
  await withSystem(async (tx) => {
    const novo = await tx`insert into app.waitlist (full_name, phone, business_type, canal) values (${fullName}, ${phone}, ${businessType}, ${canal})
      on conflict (phone) do nothing returning id`;
    entrouAgora = novo.length > 0;
    if (entrouAgora) await trackEvent(tx, "waitlist.joined", null, null, { businessType, ...(canal ? { canal } : {}) });
  });
  // Aviso para a automação do Make (planilha e e-mail para o dono). Sem Make configurado ou com falha, nada muda para a pessoa.
  if (entrouAgora) {
    const atividade = BUSINESS_TYPES.find((b) => b.id === businessType)?.label ?? businessType;
    await notifyWaitlistToMake({ nome: fullName, whatsapp: formatPhone(phone), atividade, canal, quando: new Date().toISOString() });
  }
  return { ok: true, message: "Pronto! Você está na lista. A gente te chama no WhatsApp para ajudar a montar a sua agenda." };
}
