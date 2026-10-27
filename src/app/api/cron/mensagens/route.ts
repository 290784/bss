import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getSql } from "@/server/db";
import { configuredProviders, dispatchDueMessages } from "@/server/modules/messaging";

/**
 * Despacha mensagens vencidas da fila. Chamado por um agendador (ex.: Vercel Cron a cada 5 min)
 * com o cabeçalho `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await dispatchDueMessages(getSql(), configuredProviders());
  return NextResponse.json(result);
}
