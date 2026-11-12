import { NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { isPlatformAdmin } from "@/server/admin";
import { withSystem } from "@/server/db";
import { BUSINESS_TYPES } from "@/server/modules/catalog";
import { audit } from "@/server/modules/audit";
import { csvBody, csvResponse } from "@/server/csv";
import { formatPhone } from "@/lib/text";
import { localDateKey, localTime } from "@/lib/time";

/** Baixa a lista de espera em CSV. Só administradora da plataforma; para as demais pessoas a página não existe (404). */
export async function GET() {
  const user = await getSession();
  if (!user || !isPlatformAdmin(user)) return new NextResponse("Não encontrado.", { status: 404 });
  const rows = await withSystem(async (tx) => {
    const r = await tx<{ full_name: string; phone: string; business_type: string; canal: string | null; created_at: Date }[]>`
      select full_name, phone, business_type, canal, created_at from app.waitlist order by created_at desc limit 10000`;
    await audit(tx, { userId: user.userId, organizationId: null }, "admin.waitlist_exported", "waitlist", null, { count: r.length });
    return r;
  });
  const tz = "America/Sao_Paulo";
  const tipo = (id: string) => BUSINESS_TYPES.find((b) => b.id === id)?.label ?? id;
  const body = csvBody(["quando", "nome", "whatsapp", "atividade", "canal"],
    rows.map((r) => [`${localDateKey(r.created_at, tz)} ${localTime(r.created_at, tz)}`, r.full_name, formatPhone(r.phone), tipo(r.business_type), r.canal]));
  return csvResponse(body, `lista-de-espera-${localDateKey(new Date(), tz)}.csv`);
}
