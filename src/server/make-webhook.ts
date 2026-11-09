import "server-only";

export type WaitlistLead = { nome: string; whatsapp: string; atividade: string; canal: string | null; quando: string };

/**
 * Avisa o Make (automação) de que alguém entrou na lista de espera. Só age quando MAKE_WAITLIST_WEBHOOK_URL existe.
 * Nunca atrapalha o cadastro: falha de rede ou erro do Make não aparece para a pessoa, e o dado já está salvo no banco.
 * Só vai para o endereço do Make (https) com os campos da lista; o endereço é secreto e fica só na variável de ambiente.
 */
export async function notifyWaitlistToMake(lead: WaitlistLead, env: Record<string, string | undefined> = process.env, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const url = env.MAKE_WAITLIST_WEBHOOK_URL;
  if (!url) return false;
  let host: string;
  try { const u = new URL(url); if (u.protocol !== "https:") return false; host = u.hostname; } catch { return false; }
  if (!host.endsWith(".make.com") && !host.endsWith(".integromat.com")) return false;
  try {
    const r = await fetchImpl(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ evento: "waitlist.joined", ...lead }), signal: AbortSignal.timeout(5000) });
    return r.ok;
  } catch {
    return false;
  }
}
