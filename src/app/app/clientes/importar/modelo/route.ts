import { NextResponse } from "next/server";
import { getAppContext } from "@/server/context";
import { can } from "@/domain/permissions";

/** Modelo de planilha para importar clientes (abre no Excel e no Google Sheets). Dados de exemplo, nenhum real. */
export async function GET() {
  const ctx = await getAppContext();
  if (!ctx || !can(ctx.role, "clients.manage")) return new NextResponse("Sem permissão.", { status: 403 });
  const csv = "﻿" + [
    "nome;telefone;email;nascimento;observacoes",
    "Maria Exemplo;(11) 90000-0001;maria@exemplo.com;15/03/1990;Prefere horário da manhã",
    "Ana Exemplo;(11) 90000-0002;;;Alérgica a acetona",
  ].join("\n") + "\n";
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="modelo-importar-clientes.csv"',
      "Cache-Control": "no-store",
    },
  });
}
