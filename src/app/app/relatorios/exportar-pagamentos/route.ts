import { NextResponse } from "next/server";
import { getAppContext, tenant } from "@/server/context";
import { can } from "@/domain/permissions";
import { audit } from "@/server/modules/audit";
import { exportarPagamentos, periodoDaExportacao } from "@/server/modules/exports";
import { csvBody, csvResponse, reais } from "@/server/csv";

/** CSV dos pagamentos e estornos do período. Só para quem vê o financeiro. */
export async function GET(request: Request) {
  const ctx = await getAppContext();
  if (!ctx || !can(ctx.role, "finance.view")) return new NextResponse("Sem permissão.", { status: 403 });
  const tz = ctx.org.timezone;
  const { de, ate } = periodoDaExportacao(new URL(request.url).searchParams, tz);
  const rows = await tenant(ctx, async (tx) => {
    const r = await exportarPagamentos(tx, ctx.org.id, tz, de, ate);
    await audit(tx, { userId: ctx.user.userId, organizationId: ctx.org.id }, "payments.exported", "payment", null, { de, ate, count: r.length });
    return r;
  });
  const body = csvBody(["data", "hora", "tipo", "valor_reais", "forma", "sinal", "cliente", "observacao"],
    rows.map((r) => [r.data, r.hora, r.tipo, reais(r.valorCents), r.forma, r.sinal ? "sim" : "não", r.cliente, r.observacao]));
  return csvResponse(body, `pagamentos-${de}-a-${ate}.csv`);
}
