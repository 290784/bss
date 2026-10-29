import { NextResponse } from "next/server";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { getSql } from "@/server/db";
import { criarContaVitrine } from "@/server/modules/vitrine";

/**
 * Cria a conta vitrine no banco do ambiente publicado (onde só o servidor tem a credencial do banco).
 * Desligada por padrão: só responde quando VITRINE_SEED_TOKEN está definida e a chave confere.
 * Uso único: GET /api/interno/vitrine?chave=<VITRINE_SEED_TOKEN>[&reset=1] — devolve o login e uma
 * senha nova. Depois de usar, troque ou apague VITRINE_SEED_TOKEN (a chave passou pela URL).
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const token = process.env.VITRINE_SEED_TOKEN;
  const given = new URL(request.url).searchParams.get("chave") ?? "";
  if (!token || token.length < 32) return new NextResponse(null, { status: 404 });
  if (given.length !== token.length || !timingSafeEqual(Buffer.from(given), Buffer.from(token)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const senha = randomBytes(12).toString("base64url");
  const reset = new URL(request.url).searchParams.get("reset") === "1";
  const r = await criarContaVitrine(getSql(), { password: senha, reset });
  return NextResponse.json({ ...r, senha: r.status === "criada" ? senha : undefined },
    { headers: { "cache-control": "no-store" } });
}
