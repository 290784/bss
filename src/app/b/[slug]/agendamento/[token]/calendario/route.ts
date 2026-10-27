import { withSystem } from "@/server/db";
import { getReceipt, receiptIcs, receiptUrl } from "@/server/modules/receipt";

/** Arquivo de calendário (.ics) do agendamento — abre direto na agenda do celular. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await params;
  const r = await withSystem((tx) => getReceipt(tx, slug, token));
  if (!r || r.status === "cancelled") return new Response("Agendamento não encontrado.", { status: 404 });
  return new Response(receiptIcs(r, receiptUrl(slug, token)), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="agendamento-${slug}.ics"`,
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex",
    },
  });
}
