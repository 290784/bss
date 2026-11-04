import { after, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getSql } from "@/server/db";
import { configuredProviders, dispatchDueMessages } from "@/server/modules/messaging";
import { handleInbound } from "@/server/modules/whatsapp";
import { findConnectionByPhoneId, verifyTokenExists } from "@/server/modules/whatsapp-connection";
import { parseMetaWebhook, phoneIdsIn, validMetaSignature } from "@/server/modules/whatsapp-meta";

/**
 * Webhook do WhatsApp (Meta Cloud API).
 * Um endereço só para todos. Cada mensagem traz o número da Meta que a recebeu (metadata.phone_number_id): é ele que
 * diz de qual estabelecimento ela é.
 * GET: verificação do endereço pela Meta (hub.challenge): vale o WHATSAPP_VERIFY_TOKEN da plataforma ou o texto de
 * verificação de algum estabelecimento.
 * POST: assinatura conferida com o segredo do app do próprio estabelecimento (se ele tem app próprio) ou com
 * WHATSAPP_APP_SECRET. Responde 200 rápido e despacha as respostas da conversa logo depois.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const token = process.env.WHATSAPP_VERIFY_TOKEN ?? "";
  const given = p.get("hub.verify_token") ?? "";
  const platform = !!token && given.length === token.length && timingSafeEqual(Buffer.from(given), Buffer.from(token));
  if (p.get("hub.mode") === "subscribe" && (platform || (await verifyTokenExists(getSql(), given))))
    return new NextResponse(p.get("hub.challenge") ?? "", { status: 200 });
  return new NextResponse(null, { status: 403 });
}

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return new NextResponse(null, { status: validMetaSignature(raw, signature, process.env.WHATSAPP_APP_SECRET) ? 400 : 401 }); }
  const sql = getSql();
  // Cada mensagem é conferida com o segredo do número que a recebeu: um estabelecimento não consegue falar pelo outro.
  const incoming = parseMetaWebhook(body);
  const accepted = [];
  const byPhone = new Map<string, Awaited<ReturnType<typeof findConnectionByPhoneId>>>();
  for (const msg of incoming) {
    const id = msg.phoneNumberId ?? "";
    if (!byPhone.has(id)) byPhone.set(id, id ? await findConnectionByPhoneId(sql, id).catch(() => null) : null);
    const conn = byPhone.get(id) ?? null;
    if (!validMetaSignature(raw, signature, conn?.appSecret ?? process.env.WHATSAPP_APP_SECRET)) continue;
    accepted.push(conn ? { ...msg, organizationId: conn.organizationId } : msg);
  }
  if (accepted.length === 0) {
    // Sem mensagens (ex.: só recibos de entrega) nada é processado; ainda assim a assinatura precisa ser de alguém conhecido.
    let known = incoming.length === 0 && validMetaSignature(raw, signature, process.env.WHATSAPP_APP_SECRET);
    if (!known && incoming.length === 0)
      for (const id of phoneIdsIn(body)) {
        const conn = await findConnectionByPhoneId(sql, id).catch(() => null);
        if (conn?.appSecret && validMetaSignature(raw, signature, conn.appSecret)) { known = true; break; }
      }
    if (!known) return new NextResponse(null, { status: 401 });
  }
  for (const msg of accepted) await handleInbound(sql, msg);
  after(async () => { await dispatchDueMessages(sql, configuredProviders()); });
  return NextResponse.json({ ok: true });
}
