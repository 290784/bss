import { createHmac, timingSafeEqual } from "node:crypto";
import type { MessageProvider, OutgoingMessage } from "@/server/modules/messaging";
import type { InboundMessage } from "@/server/modules/whatsapp";

/**
 * Provedor WhatsApp pela API oficial da Meta (Cloud API), sem intermediário.
 * Liga sozinho quando as variáveis existem (ver docs/INTEGRACOES.md):
 *   WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_APP_SECRET, WHATSAPP_VERIFY_TOKEN
 *   WHATSAPP_TEMPLATE_LANG (padrão pt_BR)
 *
 * - Mensagem com `body` = resposta livre dentro da conversa de 24h (texto ou botões).
 * - Sem `body` = modelo aprovado pela Meta (é o que pode iniciar a conversa).
 */

const GRAPH = "https://graph.facebook.com/v21.0";

/** Nome do modelo aprovado na Meta e a ordem das variáveis {{1}}, {{2}}… */
export const META_TEMPLATES: Partial<Record<OutgoingMessage["template"], { name: string; params: string[] }>> = {
  appointment_confirmation: { name: "ge_confirmacao", params: ["cliente", "servicos", "quando", "profissional", "link"] },
  appointment_reminder: { name: "ge_lembrete", params: ["cliente", "quando", "servicos", "profissional", "negocio"] },
  appointment_cancelled: { name: "ge_cancelamento", params: ["cliente", "servicos", "quando", "negocio"] },
};

export function metaCloudProvider(env: NodeJS.ProcessEnv = process.env): MessageProvider | null {
  const token = env.WHATSAPP_TOKEN, phoneId = env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return null;
  const lang = env.WHATSAPP_TEMPLATE_LANG || "pt_BR";
  return {
    channel: "whatsapp",
    async send(msg) {
      let payload: Record<string, unknown>;
      if (msg.body) {
        payload = msg.buttons?.length
          ? { type: "interactive", interactive: { type: "button", body: { text: msg.body },
              action: { buttons: msg.buttons.slice(0, 3).map((b) => ({ type: "reply", reply: { id: b.id, title: b.title.slice(0, 20) } })) } } }
          : { type: "text", text: { body: msg.body, preview_url: true } };
      } else {
        const t = META_TEMPLATES[msg.template];
        if (!t) throw new Error(`Sem modelo aprovado para ${msg.template}`);
        payload = { type: "template", template: { name: t.name, language: { code: lang },
          components: [{ type: "body", parameters: t.params.map((p) => ({ type: "text", text: msg.variables[p] || "-" })) }] } };
      }
      const res = await fetch(`${GRAPH}/${phoneId}/messages`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", to: msg.to, ...payload }),
      });
      const data = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string } };
      if (!res.ok || !data.messages?.[0]?.id) throw new Error(`WhatsApp ${res.status}: ${data.error?.message ?? "falha ao enviar"}`);
      return { providerMessageId: data.messages[0].id };
    },
  };
}

/** Confere a assinatura X-Hub-Signature-256 do webhook (HMAC-SHA256 do corpo com o segredo do app). */
export function validMetaSignature(rawBody: string, header: string | null, secret: string | undefined) {
  if (!secret || !header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const given = header.slice(7);
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

type MetaWebhook = { entry?: { changes?: { value?: { messages?: MetaMessage[] } }[] }[] };
type MetaMessage = {
  id: string; from: string; type: string;
  text?: { body?: string };
  button?: { text?: string; payload?: string };
  interactive?: { button_reply?: { id?: string; title?: string }; list_reply?: { id?: string; title?: string } };
};

/** Extrai as mensagens recebidas do formato da Meta (texto, botão de modelo ou botão interativo). */
export function parseMetaWebhook(body: unknown): InboundMessage[] {
  const out: InboundMessage[] = [];
  for (const e of (body as MetaWebhook)?.entry ?? [])
    for (const c of e.changes ?? [])
      for (const m of c.value?.messages ?? []) {
        if (!m?.id || !m.from) continue;
        if (m.type === "text") out.push({ providerMessageId: m.id, from: m.from, text: m.text?.body ?? "" });
        else if (m.type === "button") out.push({ providerMessageId: m.id, from: m.from, text: m.button?.text ?? m.button?.payload ?? "" });
        else if (m.type === "interactive") {
          const r = m.interactive?.button_reply ?? m.interactive?.list_reply;
          out.push({ providerMessageId: m.id, from: m.from, text: r?.title ?? "", buttonId: r?.id ?? null });
        } else out.push({ providerMessageId: m.id, from: m.from, text: "" }); // áudio, foto…: vai para a profissional
      }
  return out;
}
