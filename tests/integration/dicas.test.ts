import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Sql } from "@/server/db";
import { asTenant, createOrg, freshDatabase } from "../support/db";
import { loadDicas } from "@/server/modules/dicas";

let sql: Sql;
let A: Awaited<ReturnType<typeof createOrg>>;
const DAY = 86_400_000;

/** Insere um atendimento direto no banco (encaixe, para não esbarrar em conflitos de horário). */
async function appt(clientId: string, startsAt: Date, status: string, serviceId = A.serviceId, price = 5000) {
  const ends = new Date(startsAt.getTime() + 3_600_000);
  const [a] = await sql<{ id: string }[]>`
    insert into app.appointments (organization_id, professional_id, client_id, starts_at, ends_at, blocked_until, status, allow_overlap, price_cents)
    values (${A.orgId}, ${A.professionalId}, ${clientId}, ${startsAt}, ${ends}, ${ends}, ${status}, true, ${price}) returning id`;
  await sql`insert into app.appointment_services (organization_id, appointment_id, service_id, service_name, price_cents, duration_minutes, position)
    values (${A.orgId}, ${a!.id}, ${serviceId}, 'Manicure', ${price}, 60, 0)`;
  return a!.id;
}
async function client(name: string, phone: string, birth: string | null = null) {
  const [c] = await sql<{ id: string }[]>`insert into app.clients (organization_id, full_name, phone, phone_normalized, birth_date)
    values (${A.orgId}, ${name}, ${phone}, ${phone}, ${birth}) returning id`;
  return c!.id;
}
const load = (finance = true) => asTenant(sql, A.ownerId, A.orgId, (tx) => loadDicas(tx, A.orgId, "America/Sao_Paulo", { finance, bookingUrl: "https://ge.app/b/x" }));

beforeAll(async () => {
  sql = await freshDatabase();
  A = await createOrg(sql, "Studio Dicas");
  await sql`update app.services set return_interval_days = 15 where id = ${A.serviceId}`;
});
afterAll(async () => { await sql?.end(); });

describe("dicas da Gê", () => {
  it("avisa quem passou do tempo de voltar, com mensagem pronta, e some quando ela marca", async () => {
    const bia = await client("Bia Retorno", "5511911110000");
    await appt(bia, new Date(Date.now() - 25 * DAY), "completed");
    let dicas = await load();
    const retorno = dicas.find((d) => d.id.startsWith("retorno-"));
    expect(retorno?.title).toContain("Bia já passou do tempo de voltar");
    expect(retorno?.clients?.[0]?.message).toMatch(/Oi, Bia!.*https:\/\/ge\.app\/b\/x/s);
    expect(retorno?.value?.cents).toBe(5000);
    await appt(bia, new Date(Date.now() + 2 * DAY), "confirmed");
    dicas = await load();
    expect(dicas.find((d) => d.id.startsWith("retorno-"))).toBeUndefined();
  });

  it("mimos: aniversária nas próximas 2 semanas e cliente nova chegando", async () => {
    const soon = new Date(Date.now() + 5 * DAY);
    const md = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", month: "2-digit", day: "2-digit" }).format(soon);
    const ani = await client("Carla Niver", "5511922220000", `1990-${md}`);
    await appt(ani, new Date(Date.now() - 40 * DAY), "completed");
    const nova = await client("Duda Nova", "5511933330000");
    await appt(nova, new Date(Date.now() + 3 * DAY), "pending");
    const dicas = await load();
    const niver = dicas.find((d) => d.id.startsWith("aniversario-"));
    expect(niver?.kind).toBe("mimos");
    expect(niver?.clients?.map((c) => c.name)).toContain("Carla Niver");
    expect(dicas.find((d) => d.id.startsWith("boas-vindas-"))?.title).toContain("Duda vem pela primeira vez");
  });

  it("estoque pelo que está marcado e avisos de confirmação e pagamento", async () => {
    const dicas = await load();
    const estoque = dicas.find((d) => d.id.startsWith("estoque-"));
    expect(estoque?.checklist?.some((i) => /esmalte/i.test(i))).toBe(true);
    expect(dicas.some((d) => d.id.startsWith("inventario-"))).toBe(true);
    // Atendimentos feitos sem pagamento anotado (as duas visitas acima) aparecem com o valor.
    expect(dicas.find((d) => d.id.startsWith("receber-"))?.value?.cents).toBeGreaterThan(0);
    // Sem acesso ao financeiro: nada de valores nem da dica de pagamentos.
    const semFinanceiro = await load(false);
    expect(semFinanceiro.some((d) => d.id.startsWith("receber-") || d.id.startsWith("vips-"))).toBe(false);
    expect(semFinanceiro.every((d) => !d.value)).toBe(true);
  });

  it("quem já faltou e vem logo aparece como urgente, no topo, e a lista vem por importância", async () => {
    const eva = await client("Eva Faltosa", "5511944440000");
    await appt(eva, new Date(Date.now() - 20 * DAY), "no_show");
    await appt(eva, new Date(Date.now() + 1.5 * DAY), "pending");
    const dicas = await load();
    const risco = dicas.find((d) => d.id.startsWith("risco-falta-"));
    expect(risco?.urgent).toBe(true);
    expect(risco?.clients?.[0]?.message).toMatch(/Oi, Eva!/);
    expect(dicas[0]!.urgent).toBe(true);
    for (let i = 1; i < dicas.length; i++) expect(dicas[i - 1]!.priority).toBeGreaterThanOrEqual(dicas[i]!.priority);
  });
});
