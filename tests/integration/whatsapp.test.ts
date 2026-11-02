import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Sql } from "@/server/db";
import { asTenant, createOrg, freshDatabase, futureDate } from "../support/db";
import { createAppointment } from "@/server/modules/appointments";
import { dispatchDueMessages, type OutgoingMessage } from "@/server/modules/messaging";
import { handleInbound } from "@/server/modules/whatsapp";

let sql: Sql;
let A: Awaited<ReturnType<typeof createOrg>>;
let gel = "";
const actor = () => ({ userId: A.ownerId, organizationId: A.orgId });
let seq = 0;
const inbound = (from: string, text: string, buttonId?: string, id = `wamid.${++seq}`) => handleInbound(sql, { providerMessageId: id, from, text, buttonId });

/** Provedor de mentira: guarda o que seria enviado. */
const sent: OutgoingMessage[] = [];
const fake = [{ channel: "whatsapp" as const, send: async (m: OutgoingMessage) => { sent.push(m); return { providerMessageId: `out.${sent.length}` }; } }];
const flush = async () => { sent.length = 0; await dispatchDueMessages(sql, fake); return [...sent]; };

async function client(name: string, phone: string) {
  const [c] = await sql<{ id: string }[]>`insert into app.clients (organization_id, full_name, phone, phone_normalized) values (${A.orgId}, ${name}, ${phone}, ${phone}) returning id`;
  return c!.id;
}
/** Marca um horário e já dispara o lembrete (como se fosse a véspera às 9h). */
async function bookAndRemind(clientId: string, date: string, time: string) {
  const a = await asTenant(sql, A.ownerId, A.orgId, (tx) => createAppointment(tx, actor(), {
    professionalId: A.professionalId, clientId, serviceIds: [A.serviceId], date, time, squeezeIn: false, status: "confirmed",
  }));
  await sql`update app.message_jobs set scheduled_for = now() where appointment_id = ${a.id}`;
  return { id: a.id, out: await flush() };
}
const appt = async (id: string) => (await sql<{ price_cents: number; ends_at: Date; starts_at: Date; client_confirmed_at: Date | null; n: number }[]>`
  select price_cents, ends_at, starts_at, client_confirmed_at, (select count(*)::int from app.appointment_services s where s.appointment_id = a.id) as n
  from app.appointments a where id = ${id}`)[0]!;
const notes = async (type: string) => sql<{ title: string; body: string | null }[]>`
  select distinct title, body from app.notifications where organization_id = ${A.orgId} and type = ${type} order by title`;

beforeAll(async () => {
  sql = await freshDatabase();
  A = await createOrg(sql, "Studio Zap");
  const [cat] = await sql<{ id: string }[]>`insert into app.service_categories (organization_id, name) values (${A.orgId}, 'Unhas') returning id`;
  await sql`update app.services set category_id = ${cat!.id} where id = ${A.serviceId}`;
  const [g] = await sql<{ id: string }[]>`insert into app.services (organization_id, name, price_cents, duration_minutes, category_id)
    values (${A.orgId}, 'Esmaltação em gel', 2500, 30, ${cat!.id}) returning id`;
  gel = g!.id;
  await sql`insert into app.professional_services (organization_id, professional_id, service_id) values (${A.orgId}, ${A.professionalId}, ${gel})`;
});
afterAll(() => sql.end());

describe("automação do WhatsApp: lembrete → confirmação → serviço extra", () => {
  let anaAppt = "";

  it("o lembrete sai com os botões e abre a conversa", async () => {
    const ana = await client("Ana Zap", "5511911110001");
    const { id, out } = await bookAndRemind(ana, futureDate(10), "10:00");
    anaAppt = id;
    const rem = out.find((m) => m.template === "appointment_reminder");
    expect(rem?.variables.mensagem).toMatch(/^Oi, Ana! 💜 Passando pra lembrar: .* às 10h tem manicure com a .*Posso confirmar\?$/);
    expect(rem?.buttons?.map((b) => b.title)).toEqual(["Confirmo", "Preciso remarcar"]);
    const [t] = await sql`select stage from app.whatsapp_threads where appointment_id = ${id}`;
    expect(t?.stage).toBe("awaiting_confirmation");
  });

  it("“Confirmo” confirma a presença e oferece 1 serviço que cabe logo depois", async () => {
    expect(await inbound("5511911110001", "Confirmo")).toBe("offered");
    expect((await appt(anaAppt)).client_confirmed_at).toBeInstanceOf(Date);
    const offer = (await flush()).find((m) => m.template === "upsell_offer");
    expect(offer?.body).toMatch(/^Oba, confirmado! 💜 .*fazer esmaltação em gel\? Fica \+R\$ 25\. É só responder SIM 😉$/);
    expect(offer?.buttons?.map((b) => b.id)).toEqual(["offer_yes", "offer_no"]);
    expect((await notes("client_confirmed")).map((n) => n.title)).toContain("Ana confirmou pelo WhatsApp");
  });

  it("“SIM” reserva os dois serviços em sequência, soma o valor, responde e avisa a profissional", async () => {
    const before = await appt(anaAppt);
    expect(await inbound("5511911110001", "sim")).toBe("upsell_added");
    const after = await appt(anaAppt);
    expect(after.n).toBe(2);
    expect(after.price_cents).toBe(before.price_cents + 2500);
    expect(after.ends_at.getTime() - before.ends_at.getTime()).toBe(30 * 60_000);
    const done = (await flush()).find((m) => m.template === "upsell_done");
    expect(done?.body).toMatch(/^Prontinho! Manicure às 10h e esmaltação em gel às 11h, total R\$ 75\. Te esperamos 💜$/);
    expect((await notes("upsell_accepted"))[0]?.title).toMatch(/^Ana adicionou Esmaltação em gel! \+R\$\s25,00$/);
    const [ev] = await sql`select data from app.appointment_events where appointment_id = ${anaAppt} and type = 'upsell_accepted'`;
    expect(ev?.data).toMatchObject({ via: "whatsapp", priceCents: 2500 });
  });

  it("a mesma mensagem reenviada pelo provedor não é processada duas vezes", async () => {
    expect(await inbound("5511911110001", "sim", undefined, "wamid.repetida")).toBe("ignored");
    expect(await inbound("5511911110001", "sim", undefined, "wamid.repetida")).toBe("duplicate");
  });

  it("o horário extra foi ocupado entre a oferta e o SIM: avisa a cliente e passa para a profissional", async () => {
    const bia = await client("Bia Zap", "5511911110002");
    const date = futureDate(11);
    const { id } = await bookAndRemind(bia, date, "14:00");
    expect(await inbound("5511911110002", "", "confirm")).toBe("offered");
    // Alguém marca logo depois das 15h (manicure de 60 min + 15 de preparo termina 15:15).
    const outra = await client("Outra Cliente", "5511911119999");
    await asTenant(sql, A.ownerId, A.orgId, (tx) => createAppointment(tx, actor(), {
      professionalId: A.professionalId, clientId: outra, serviceIds: [gel], date, time: "15:15", squeezeIn: false, status: "confirmed",
    }));
    expect(await inbound("5511911110002", "", "offer_yes")).toBe("upsell_taken");
    expect((await appt(id)).n).toBe(1);
    const out = await flush();
    expect(out.find((m) => m.template === "upsell_taken")?.body).toMatch(/acabou de ser ocupado/);
  });

  it("“Agora não” encerra com carinho; “Preciso remarcar” avisa a profissional", async () => {
    const cris = await client("Cris Zap", "5511911110003");
    await bookAndRemind(cris, futureDate(12), "09:00");
    expect(await inbound("5511911110003", "ok")).toBe("offered");
    expect(await inbound("5511911110003", "agora não, obrigada")).toBe("declined");
    expect((await flush()).find((m) => m.template === "reply_declined")?.body).toBe("Tudo bem! Te esperamos 💜");

    const duda = await client("Duda Zap", "5511911110004");
    await bookAndRemind(duda, futureDate(13), "09:00");
    expect(await inbound("5511911110004", "Preciso remarcar")).toBe("reschedule");
    expect((await notes("whatsapp_reschedule")).map((n) => n.title)).toContain("Duda precisa remarcar");
  });

  it("fora do roteiro: avisa a profissional, responde uma vez e para de responder sozinha", async () => {
    const eva = await client("Eva Zap", "5511911110005");
    await bookAndRemind(eva, futureDate(14), "09:00");
    expect(await inbound("5511911110005", "Oi! Posso levar minha filha junto? Ela também quer fazer a unha")).toBe("handoff");
    expect((await flush()).find((m) => m.template === "reply_handoff")?.body).toMatch(/ela já te responde/);
    expect(await inbound("5511911110005", "?")).toBe("ignored");
    expect((await flush()).length).toBe(0);
  });

  it("celular salvo sem o 9 também é encontrado; com a oferta desligada, só confirma", async () => {
    await sql`update app.organizations set whatsapp_upsell_enabled = false where id = ${A.orgId}`;
    const fia = await client("Fia Zap", "5511981110006");
    await bookAndRemind(fia, futureDate(15), "09:00");
    expect(await inbound("551181110006", "Confirmo")).toBe("confirmed"); // mesmo número, sem o 9
    expect((await flush()).find((m) => m.template === "reply_confirmed")?.body).toBe("Oba, confirmado! Te esperamos 💜");
    await sql`update app.organizations set whatsapp_upsell_enabled = true where id = ${A.orgId}`;
  });

  it("número sem conversa aberta não dispara nada", async () => {
    expect(await inbound("5521900000000", "oi")).toBe("no_thread");
  });
});
