import "server-only";

export type EmailMessage = { to: string; subject: string; text: string; html: string };
export type EmailResult = { ok: true } | { ok: false; error: string };
export type EmailProvider = { name: string; send(msg: EmailMessage): Promise<EmailResult> };

/** Provedor Resend (https://resend.com): ativo quando RESEND_API_KEY e EMAIL_FROM existem. Só vale se a F-02 escolher esse provedor. */
function resendProvider(apiKey: string, from: string): EmailProvider {
  return {
    name: "resend",
    async send(msg) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, text: msg.text, html: msg.html }),
        signal: AbortSignal.timeout(10_000),
      }).catch((e: unknown) => e as Error);
      if (r instanceof Error) return { ok: false, error: r.message };
      return r.ok ? { ok: true } : { ok: false, error: `HTTP ${r.status}` };
    },
  };
}

/** Em desenvolvimento e nos testes, o "envio" só guarda a mensagem numa lista (e mostra no terminal fora dos testes). */
export const outbox: EmailMessage[] = [];
const devProvider: EmailProvider = {
  name: "dev",
  async send(msg) {
    outbox.push(msg);
    if (process.env.NODE_ENV === "development") console.log(`[e-mail de desenvolvimento] para ${msg.to}: ${msg.subject}\n${msg.text}`);
    return { ok: true };
  },
};

type Env = Record<string, string | undefined>;
/** Provedor ativo: o real quando configurado; o de desenvolvimento fora de produção; em produção sem configuração, nenhum (null). */
export function getEmailProvider(env: Env = process.env): EmailProvider | null {
  if (env.RESEND_API_KEY && env.EMAIL_FROM) return resendProvider(env.RESEND_API_KEY, env.EMAIL_FROM);
  return env.NODE_ENV === "production" ? null : devProvider;
}

export async function sendEmail(msg: EmailMessage, env: Env = process.env): Promise<EmailResult> {
  const p = getEmailProvider(env);
  if (!p) return { ok: false, error: "provedor de e-mail não configurado" };
  return p.send(msg);
}
