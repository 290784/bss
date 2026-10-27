import { NextResponse } from "next/server";
import { getAppContext, tenant } from "@/server/context";
import { can } from "@/domain/permissions";
import { listClients, SEGMENTS, type Segment } from "@/server/modules/clients";
import { audit } from "@/server/modules/audit";

const esc = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  // Evita injeção de fórmulas em planilhas (=, +, -, @).
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",;\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export async function GET(request: Request) {
  const ctx = await getAppContext();
  if (!ctx || !can(ctx.role, "clients.manage")) return new NextResponse("Sem permissão.", { status: 403 });
  const url = new URL(request.url);
  const seg = url.searchParams.get("segmento") ?? "all";
  const segment = (Object.keys(SEGMENTS).includes(seg) ? seg : "all") as Segment;
  const finance = can(ctx.role, "finance.view");
  const rows = await tenant(ctx, async (tx) => {
    const r = await listClients(tx, ctx.org.id, { q: url.searchParams.get("q") ?? undefined, segment, includeSpent: finance, limit: 10000 });
    await audit(tx, { userId: ctx.user.userId, organizationId: ctx.org.id }, "clients.exported", "client", null, { segment, count: r.length });
    return r;
  });
  const header = ["nome", "telefone", "email", "visitas", "ultima_visita", "proxima_visita", ...(finance ? ["total_gasto_reais"] : [])];
  const lines = rows.map((c) => [
    c.full_name, c.phone_normalized, c.email, c.visits, c.last_visit?.toISOString().slice(0, 10), c.next_visit?.toISOString().slice(0, 10),
    ...(finance ? [(c.total_spent_cents / 100).toFixed(2).replace(".", ",")] : []),
  ].map(esc).join(";"));
  const csv = "﻿" + [header.join(";"), ...lines].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clientes-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
