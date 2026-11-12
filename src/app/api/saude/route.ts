import { withSystem } from "@/server/db";

export const dynamic = "force-dynamic";

/** Endereço de saúde para monitoramento (uptime): 200 se o app e o banco respondem, 503 se não. Não revela nada além de "ok". */
export async function GET() {
  try {
    await withSystem((tx) => tx`select 1`);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
