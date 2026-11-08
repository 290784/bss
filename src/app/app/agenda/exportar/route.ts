import { NextResponse } from "next/server";
import { getAppContext, tenant } from "@/server/context";
import { can } from "@/domain/permissions";
import { audit } from "@/server/modules/audit";
import { exportarAgenda, periodoDaExportacao } from "@/server/modules/exports";
import { csvBody, csvResponse, reais } from "@/server/csv";

/** CSV da agenda (atendimentos do período). Valores só para quem vê o financeiro. */
export async function GET(request: Request) {
  const ctx = await getAppContext();
  if (!ctx || !can(ctx.role, "agenda.manage")) return new NextResponse("Sem permissão.", { status: 403 });
  const tz = ctx.org.timezone;
  const { de, ate } = periodoDaExportacao(new URL(request.url).searchParams, tz);
  const finance = can(ctx.role, "finance.view");
  const rows = await tenant(ctx, async (tx) => {
    const r = await exportarAgenda(tx, ctx.org.id, tz, de, ate);
    await audit(tx, { userId: ctx.user.userId, organizationId: ctx.org.id }, "agenda.exported", "appointment", null, { de, ate, count: r.length });
    return r;
  });
  const header = ["data", "inicio", "fim", "status", "cliente", "telefone", "profissional", "servicos", ...(finance ? ["valor_reais"] : []), "origem", "motivo_cancelamento"];
  const body = csvBody(header, rows.map((r) => [r.data, r.inicio, r.fim, r.status, r.cliente, r.telefone, r.profissional, r.servicos, ...(finance ? [reais(r.valorCents)] : []), r.origem, r.motivoCancelamento]));
  return csvResponse(body, `agenda-${de}-a-${ate}.csv`);
}
