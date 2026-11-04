import { afterEach, describe, expect, it, vi } from "vitest";
import { META_TEMPLATES, metaCloudProvider } from "@/server/modules/whatsapp-meta";
import type { OutgoingMessage } from "@/server/modules/messaging";

/** O que sai de verdade para a API oficial do WhatsApp (Meta Cloud API): endereço, cabeçalhos e corpo de cada tipo de mensagem. */

const ENV = { WHATSAPP_TOKEN: "tok-secreto", WHATSAPP_PHONE_NUMBER_ID: "1234567890" } as unknown as NodeJS.ProcessEnv;
const msg = (over: Partial<OutgoingMessage> = {}): OutgoingMessage => ({
  idempotencyKey: "k1", channel: "whatsapp", template: "appointment_confirmation", to: "5511999990000", variables: {}, ...over,
});

type Chamada = { url: string; init: RequestInit; body: Record<string, unknown> };
function fakeFetch(resposta: { ok?: boolean; status?: number; json?: unknown } = {}) {
  const chamadas: Chamada[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
    chamadas.push({ url, init, body: JSON.parse(String(init.body)) });
    return { ok: resposta.ok ?? true, status: resposta.status ?? 200, json: async () => resposta.json ?? { messages: [{ id: "wamid.OK" }] } };
  }));
  return chamadas;
}
afterEach(() => vi.unstubAllGlobals());

describe("ligar o provedor", () => {
  it("sem as credenciais não existe provedor (a fila marca “canal não conectado”)", () => {
    expect(metaCloudProvider({} as NodeJS.ProcessEnv)).toBeNull();
    expect(metaCloudProvider({ WHATSAPP_TOKEN: "x" } as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(metaCloudProvider({ WHATSAPP_PHONE_NUMBER_ID: "1" } as unknown as NodeJS.ProcessEnv)).toBeNull();
  });
  it("com token e número, atende o canal WhatsApp", () => {
    expect(metaCloudProvider(ENV)?.channel).toBe("whatsapp");
  });
});

describe("modelo aprovado (inicia a conversa)", () => {
  it("manda para o número certo, com o token e o modelo na ordem dos parâmetros", async () => {
    const c = fakeFetch();
    const r = await metaCloudProvider(ENV)!.send(msg({ variables: { cliente: "Ana", servicos: "Manicure", quando: "amanhã às 10h", profissional: "Bia", link: "https://ge.app/x" } }));
    expect(r.providerMessageId).toBe("wamid.OK");
    expect(c).toHaveLength(1);
    expect(c[0]!.url).toBe("https://graph.facebook.com/v21.0/1234567890/messages");
    expect((c[0]!.init.headers as Record<string, string>).authorization).toBe("Bearer tok-secreto");
    expect(c[0]!.body).toMatchObject({ messaging_product: "whatsapp", to: "5511999990000", type: "template" });
    const t = c[0]!.body.template as { name: string; language: { code: string }; components: { type: string; parameters: { type: string; text: string }[] }[] };
    expect(t.name).toBe("ge_confirmacao");
    expect(t.language.code).toBe("pt_BR");
    expect(t.components[0]!.parameters.map((p) => p.text)).toEqual(["Ana", "Manicure", "amanhã às 10h", "Bia", "https://ge.app/x"]);
  });

  it("os três modelos usam o nome aprovado e a quantidade certa de parâmetros", () => {
    expect(META_TEMPLATES.appointment_confirmation).toEqual({ name: "ge_confirmacao", params: ["cliente", "servicos", "quando", "profissional", "link"] });
    expect(META_TEMPLATES.appointment_reminder).toEqual({ name: "ge_lembrete", params: ["cliente", "quando", "servicos", "profissional", "negocio"] });
    expect(META_TEMPLATES.appointment_cancelled).toEqual({ name: "ge_cancelamento", params: ["cliente", "servicos", "quando", "negocio"] });
  });

  it("variável que falta vai como “-” (a Meta recusa parâmetro vazio)", async () => {
    const c = fakeFetch();
    await metaCloudProvider(ENV)!.send(msg({ template: "appointment_cancelled", variables: { cliente: "Ana", servicos: "", quando: "", negocio: "Studio" } }));
    const t = c[0]!.body.template as { components: { parameters: { text: string }[] }[] };
    expect(t.components[0]!.parameters.map((p) => p.text)).toEqual(["Ana", "-", "-", "Studio"]);
  });

  it("o idioma do modelo pode ser trocado pela configuração", async () => {
    const c = fakeFetch();
    await metaCloudProvider({ ...ENV, WHATSAPP_TEMPLATE_LANG: "pt_PT" } as unknown as NodeJS.ProcessEnv)!.send(msg());
    expect((c[0]!.body.template as { language: { code: string } }).language.code).toBe("pt_PT");
  });

  it("mensagem de resposta sem texto pronto e sem modelo aprovado é recusada antes de chamar a API", async () => {
    const c = fakeFetch();
    await expect(metaCloudProvider(ENV)!.send(msg({ template: "upsell_offer" }))).rejects.toThrow(/Sem modelo aprovado para upsell_offer/);
    expect(c).toHaveLength(0);
  });
});

describe("texto livre (resposta dentro da conversa de 24 h)", () => {
  it("texto simples", async () => {
    const c = fakeFetch();
    await metaCloudProvider(ENV)!.send(msg({ template: "reply_confirmed", body: "Oba, confirmado! Te esperamos 💜" }));
    expect(c[0]!.body).toMatchObject({ type: "text", text: { body: "Oba, confirmado! Te esperamos 💜", preview_url: true } });
  });

  it("com botões: mensagem interativa, no máximo 3 botões e título de até 20 letras", async () => {
    const c = fakeFetch();
    await metaCloudProvider(ENV)!.send(msg({
      template: "upsell_offer", body: "Quer adicionar?",
      buttons: [{ id: "offer_yes", title: "Quero sim" }, { id: "offer_no", title: "Agora não, obrigada de qualquer jeito" }, { id: "c", title: "C" }, { id: "d", title: "D" }],
    }));
    const i = (c[0]!.body as { interactive: { type: string; body: { text: string }; action: { buttons: { type: string; reply: { id: string; title: string } }[] } } }).interactive;
    expect(c[0]!.body.type).toBe("interactive");
    expect(i.type).toBe("button");
    expect(i.body.text).toBe("Quer adicionar?");
    expect(i.action.buttons).toHaveLength(3);
    expect(i.action.buttons[0]).toEqual({ type: "reply", reply: { id: "offer_yes", title: "Quero sim" } });
    expect(i.action.buttons[1]!.reply.title).toHaveLength(20);
  });
});

describe("erros da API", () => {
  it("resposta de erro vira exceção com o motivo da Meta (a fila tenta de novo)", async () => {
    fakeFetch({ ok: false, status: 400, json: { error: { message: "Template não aprovado" } } });
    await expect(metaCloudProvider(ENV)!.send(msg())).rejects.toThrow("WhatsApp 400: Template não aprovado");
  });
  it("erro sem detalhe também é tratado", async () => {
    fakeFetch({ ok: false, status: 500, json: {} });
    await expect(metaCloudProvider(ENV)!.send(msg())).rejects.toThrow("WhatsApp 500: falha ao enviar");
  });
  it("resposta “ok” sem id de mensagem não conta como enviada", async () => {
    fakeFetch({ ok: true, status: 200, json: { messages: [] } });
    await expect(metaCloudProvider(ENV)!.send(msg())).rejects.toThrow(/WhatsApp 200/);
  });
  it("resposta que não é JSON não derruba o envio com erro estranho", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 502, json: async () => { throw new Error("html"); } })));
    await expect(metaCloudProvider(ENV)!.send(msg())).rejects.toThrow("WhatsApp 502: falha ao enviar");
  });
  it("falha de rede propaga o erro (a fila registra e tenta de novo)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));
    await expect(metaCloudProvider(ENV)!.send(msg())).rejects.toThrow("fetch failed");
  });
});
