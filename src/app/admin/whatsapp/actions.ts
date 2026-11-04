"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePlatformAdmin } from "@/server/admin";
import { withSystem } from "@/server/db";
import { audit } from "@/server/modules/audit";
import { DomainError, type ActionState } from "@/server/errors";
import { connectWhatsApp, disconnectWhatsApp } from "@/server/modules/whatsapp-connection";

const schema = z.object({
  org: z.string().trim().min(1, "Qual estabelecimento? Use o código do link (slug)."),
  phoneNumberId: z.string().trim().regex(/^\d{8,24}$/, "O ID do número tem só dígitos."),
  wabaId: z.string().trim().regex(/^\d{8,24}$/, "O ID da conta tem só dígitos.").optional().or(z.literal("")),
  token: z.string().trim().min(20, "Cole o token de acesso completo.").max(1000),
  appSecret: z.string().trim().max(200).optional(),
});

/** Equipe da Gê: conecta o WhatsApp de um estabelecimento (feito na chamada com o cliente). */
export async function adminConnectWhatsAppAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const admin = await requirePlatformAdmin();
    const parsed = schema.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, message: "Dá uma olhadinha nos campos destacados.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
    const { org, ...creds } = parsed.data;
    const r = await withSystem(async (tx) => {
      const [o] = await tx<{ id: string }[]>`select id from app.organizations where slug = ${org} or id::text = ${org}`;
      if (!o) throw new DomainError("Não achei esse estabelecimento. Confira o código do link (slug).");
      const out = await connectWhatsApp(tx, o.id, creds);
      await audit(tx, { userId: admin.userId, organizationId: o.id }, "admin.whatsapp_connected", "organization", o.id, { phone: out.displayPhone });
      return out;
    });
    revalidatePath("/admin/whatsapp");
    return { ok: true, message: `Conectado${r.displayPhone ? `: ${r.displayPhone}` : ""}. Modelos: ${Object.entries(r.templates).map(([k, v]) => `${k} ${v}`).join(", ") || "não criados (sem ID da conta)"}.` };
  } catch (err) {
    if (err instanceof DomainError) return { ok: false, message: err.message };
    throw err;
  }
}

export async function adminDisconnectWhatsAppAction(orgId: string): Promise<ActionState> {
  const admin = await requirePlatformAdmin();
  await withSystem(async (tx) => {
    await disconnectWhatsApp(tx, orgId);
    await audit(tx, { userId: admin.userId, organizationId: orgId }, "admin.whatsapp_disconnected", "organization", orgId);
  });
  revalidatePath("/admin/whatsapp");
  return { ok: true, message: "Desconectado." };
}
