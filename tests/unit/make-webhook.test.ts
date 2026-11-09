import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { notifyWaitlistToMake } = await import("@/server/make-webhook");

const lead = { nome: "Maria", whatsapp: "(21) 98888-7777", atividade: "Lash designer", canal: "ig-dm", quando: "2027-01-01T10:00:00.000Z" };
const ok = () => vi.fn(async () => new Response("Accepted", { status: 200 })) as unknown as typeof fetch;

describe("aviso da lista de espera para o Make", () => {
  it("sem a variável, não envia nada", async () => {
    const f = ok();
    expect(await notifyWaitlistToMake(lead, {}, f)).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });

  it("envia só os campos da lista, por POST em JSON, para o endereço configurado", async () => {
    const f = ok();
    expect(await notifyWaitlistToMake(lead, { MAKE_WAITLIST_WEBHOOK_URL: "https://hook.us2.make.com/abc123" }, f)).toBe(true);
    const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://hook.us2.make.com/abc123");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ evento: "waitlist.joined", ...lead });
  });

  it("recusa endereço que não é https do Make", async () => {
    const f = ok();
    for (const url of ["http://hook.us2.make.com/abc", "https://exemplo.com/abc", "https://make.com.evil.com/x", "lixo"])
      expect(await notifyWaitlistToMake(lead, { MAKE_WAITLIST_WEBHOOK_URL: url }, f)).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });

  it("falha de rede ou resposta de erro não derruba o cadastro", async () => {
    const env = { MAKE_WAITLIST_WEBHOOK_URL: "https://hook.us2.make.com/abc" };
    expect(await notifyWaitlistToMake(lead, env, vi.fn(async () => { throw new Error("rede"); }) as unknown as typeof fetch)).toBe(false);
    expect(await notifyWaitlistToMake(lead, env, vi.fn(async () => new Response("x", { status: 500 })) as unknown as typeof fetch)).toBe(false);
  });
});
