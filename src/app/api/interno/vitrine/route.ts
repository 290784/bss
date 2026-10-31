import { after, NextResponse } from "next/server";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { getSql } from "@/server/db";
import { criarContaVitrine, EMAIL_VITRINE, novaSenhaVitrine, preencherAniversariosVitrine, vitrineExiste } from "@/server/modules/vitrine";

/**
 * Cria a conta vitrine no banco do ambiente publicado (onde só o servidor tem a credencial do banco).
 * Desligada por padrão: só responde quando VITRINE_SEED_TOKEN está definida e a chave confere.
 * Uso único: GET /api/interno/vitrine?chave=<VITRINE_SEED_TOKEN>[&reset=1] — devolve o login e uma
 * senha nova. `&acao=senha` só gera uma senha nova e mostra um resumo do que existe (rápido; útil se a
 * resposta da criação se perder). `&acao=aniversarios` só preenche o aniversário das clientes que ainda
 * não têm (sem apagar nada nem trocar a senha). Depois de usar, troque ou apague VITRINE_SEED_TOKEN (a chave passou pela URL).
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const token = process.env.VITRINE_SEED_TOKEN;
  const given = new URL(request.url).searchParams.get("chave") ?? "";
  if (!token || token.length < 32) return new NextResponse(null, { status: 404 });
  if (given.length !== token.length || !timingSafeEqual(Buffer.from(given), Buffer.from(token)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  if (params.get("acao") === "aniversarios")
    return NextResponse.json(await preencherAniversariosVitrine(getSql()), { headers: { "cache-control": "no-store" } });
  const senha = randomBytes(12).toString("base64url");
  if (params.get("acao") === "senha") {
    const r = await novaSenhaVitrine(getSql(), senha);
    return NextResponse.json(r ? { ...r, senha } : { status: "nao_existe" }, { headers: { "cache-control": "no-store" } });
  }
  const reset = params.get("reset") === "1";
  if (!reset && (await vitrineExiste(getSql())))
    return NextResponse.json({ status: "ja_existe", email: EMAIL_VITRINE }, { headers: { "cache-control": "no-store" } });
  // A criação leva ~30 s: responde na hora com a senha e continua no servidor depois da resposta.
  // O andamento aparece em `&acao=senha` (contagens de clientes e atendimentos).
  after(async () => { await criarContaVitrine(getSql(), { password: senha, reset }); });
  return NextResponse.json({ status: "em_andamento", email: EMAIL_VITRINE, senha }, { headers: { "cache-control": "no-store" } });
}
