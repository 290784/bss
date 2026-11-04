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

/** Provedor do número da plataforma (variáveis de ambiente). Cada estabelecimento usa o próprio número: ver whatsapp-connection.ts. */
export function metaCloudProvider(env: NodeJS.ProcessEnv = process.env): MessageProvider | null {
  const token = env.WHATSAPP_TOKEN, phoneId = env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return null;
  return metaProviderFor({ token, phoneId, lang: env.WHATSAPP_TEMPLATE_LANG || "pt_BR" });
}

/** Provedor para um número específico (token + id do número na Meta). */
export function metaProviderFor({ token, phoneId, lang = "pt_BR" }: { token: string; phoneId: string; lang?: string }): MessageProvider {
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

/** Texto dos modelos (categoria Utilidade, pt_BR), com as variáveis na ordem de META_TEMPLATES. Criados na conta de cada cliente ao conectar. */
export const META_TEMPLATE_BODIES: Record<string, { text: string; example: string[] }> = {
  ge_confirmacao: {
    text: "Oi, {{1}}! Seu horário de {{2}} está marcado para {{3}}, com {{4}}. Endereço e confirmação de presença: {{5}} Até lá!",
    example: ["Ana", "Manicure", "sexta, 12/12 às 14:00", "Bia", "https://gee.app/b/studio/agendamento/abc"],
  },
  ge_lembrete: {
    text: "Oi, {{1}}! Passando para lembrar: {{2}} tem {{3}} com {{4}}, no {{5}}. Responda Confirmo ou Preciso remarcar. Até breve!",
    example: ["Ana", "amanhã às 14:00", "Manicure", "Bia", "Studio Bia"],
  },
  ge_cancelamento: {
    text: "Oi, {{1}}. Seu horário de {{2}} em {{3}} no {{4}} foi cancelado. Se quiser remarcar, é só responder aqui. Um abraço!",
    example: ["Ana", "Manicure", "sexta, 12/12 às 14:00", "Studio Bia"],
  },
};

type FetchLike = typeof fetch;

/** Confere o token e o id do número na Meta e devolve o número e o nome verificado do negócio. */
export async function verifyMetaNumber(token: string, phoneId: string, fetchImpl: FetchLike = fetch) {
  const res = await fetchImpl(`${GRAPH}/${encodeURIComponent(phoneId)}?fields=display_phone_number,verified_name`, { headers: { authorization: `Bearer ${token}` } });
  const data = (await res.json().catch(() => ({}))) as { display_phone_number?: string; verified_name?: string; error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message ?? `A Meta respondeu ${res.status}`);
  return { displayPhone: data.display_phone_number ?? null, verifiedName: data.verified_name ?? null };
}

/** Cria os 3 modelos na conta de WhatsApp Business da cliente (WABA). Devolve a situação de cada um; "EXISTS" se já havia. */
export async function createMetaTemplates(wabaId: string, token: string, lang = "pt_BR", fetchImpl: FetchLike = fetch) {
  const out: Record<string, string> = {};
  for (const [name, t] of Object.entries(META_TEMPLATE_BODIES)) {
    try {
      const res = await fetchImpl(`${GRAPH}/${encodeURIComponent(wabaId)}/message_templates`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ name, language: lang, category: "UTILITY", components: [{ type: "BODY", text: t.text, example: { body_text: [t.example] } }] }),
      });
      const data = (await res.json().catch(() => ({}))) as { status?: string; error?: { message?: string; error_subcode?: number } };
      out[name] = res.ok ? (data.status ?? "PENDING") : data.error?.error_subcode === 2388023 ? "EXISTS" : "ERROR";
    } catch { out[name] = "ERROR"; }
  }
  return out;
}

/** Confere a assinatura X-Hub-Signature-256 do webhook (HMAC-SHA256 do corpo com o segredo do app). */
export function validMetaSignature(rawBody: string, header: string | null, secret: string | undefined) {
  if (!secret || !header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const given = header.slice(7);
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

type MetaWebhook = { entry?: { changes?: { value?: { metadata?: { phone_number_id?: string }; messages?: MetaMessage[] } }[] }[] };
type MetaMessage = {
  id: string; from: string; type: string;
  text?: { body?: string };
  button?: { text?: string; payload?: string };
  interactive?: { button_reply?: { id?: string; title?: string }; list_reply?: { id?: string; title?: string } };
};

/** Números da Meta citados no webhook (mensagens e recibos de entrega). */
export function phoneIdsIn(body: unknown): string[] {
  const ids = new Set<string>();
  for (const e of (body as MetaWebhook)?.entry ?? []) for (const c of e.changes ?? []) { const id = c.value?.metadata?.phone_number_id; if (id) ids.add(id); }
  return [...ids];
}

/** Extrai as mensagens recebidas do formato da Meta (texto, botão de modelo ou botão interativo). */
export function parseMetaWebhook(body: unknown): InboundMessage[] {
  const out: InboundMessage[] = [];
  for (const e of (body as MetaWebhook)?.entry ?? [])
    for (const c of e.changes ?? [])
      for (const m of c.value?.messages ?? []) {
        if (!m?.id || !m.from) continue;
        // Em qual número da Meta a mensagem chegou: é o que diz de qual estabelecimento ela é.
        const phoneNumberId = c.value?.metadata?.phone_number_id;
        const base = { providerMessageId: m.id, from: m.from, ...(phoneNumberId ? { phoneNumberId } : {}) };
        if (m.type === "text") out.push({ ...base, text: m.text?.body ?? "" });
        else if (m.type === "button") out.push({ ...base, text: m.button?.text ?? m.button?.payload ?? "" });
        else if (m.type === "interactive") {
          const r = m.interactive?.button_reply ?? m.interactive?.list_reply;
          out.push({ ...base, text: r?.title ?? "", buttonId: r?.id ?? null });
        } else out.push({ ...base, text: "" }); // áudio, foto…: vai para a profissional
      }
  return out;
}
