import { after, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getSql } from "@/server/db";
import { configuredProviders, dispatchDueMessages } from "@/server/modules/messaging";
import { handleInbound } from "@/server/modules/whatsapp";
import { parseMetaWebhook, validMetaSignature } from "@/server/modules/whatsapp-meta";

/**
 * Webhook do WhatsApp (Meta Cloud API).
 * GET: verificação do endereço pela Meta (hub.challenge), com WHATSAPP_VERIFY_TOKEN.
 * POST: mensagens recebidas, assinadas com WHATSAPP_APP_SECRET. Responde 200 rápido e
 * despacha as respostas da conversa logo depois.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const token = process.env.WHATSAPP_VERIFY_TOKEN ?? "";
  const given = p.get("hub.verify_token") ?? "";
  if (p.get("hub.mode") === "subscribe" && token && given.length === token.length && timingSafeEqual(Buffer.from(given), Buffer.from(token)))
    return new NextResponse(p.get("hub.challenge") ?? "", { status: 200 });
  return new NextResponse(null, { status: 403 });
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (!validMetaSignature(raw, request.headers.get("x-hub-signature-256"), process.env.WHATSAPP_APP_SECRET))
    return new NextResponse(null, { status: 401 });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return new NextResponse(null, { status: 400 }); }
  const sql = getSql();
  for (const msg of parseMetaWebhook(body)) await handleInbound(sql, msg);
  after(async () => { await dispatchDueMessages(sql, configuredProviders()); });
  return NextResponse.json({ ok: true });
}
