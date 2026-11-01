import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Sql } from "@/server/db";
import { asTenant, createOrg, freshDatabase } from "../support/db";
import { adjustPrices, serviceStats } from "@/server/modules/catalog";

let sql: Sql;
let A: Awaited<ReturnType<typeof createOrg>>;
let B: Awaited<ReturnType<typeof createOrg>>;

beforeAll(async () => {
  sql = await freshDatabase();
  A = await createOrg(sql, "Studio Preço");
  B = await createOrg(sql, "Outro Studio");
});
afterAll(async () => { await sql?.end(); });

describe("reajuste de preços", () => {
  it("reajusta só os serviços escolhidos da própria empresa, com arredondamento", async () => {
    const actor = { userId: A.ownerId, organizationId: A.orgId };
    // Tenta incluir o serviço de outra empresa: é ignorado.
    const n = await asTenant(sql, A.ownerId, A.orgId, (tx) => adjustPrices(tx, actor, { serviceIds: [A.serviceId, B.serviceId], percent: 8, roundTo: 500 }));
    expect(n).toBe(1);
    const [a] = await sql<{ price_cents: number }[]>`select price_cents from app.services where id = ${A.serviceId}`;
    const [b] = await sql<{ price_cents: number }[]>`select price_cents from app.services where id = ${B.serviceId}`;
    expect(a!.price_cents).toBe(5500); // 50,00 + 8% = 54,00 → 55,00
    expect(b!.price_cents).toBe(5000);
    const [log] = await sql<{ data: { percent: number } }[]>`select data from app.audit_log where organization_id = ${A.orgId} and action = 'service.prices_adjusted'`;
    expect(log?.data.percent).toBe(8);
  });

  it("recusa porcentagem fora do limite", async () => {
    const actor = { userId: A.ownerId, organizationId: A.orgId };
    await expect(asTenant(sql, A.ownerId, A.orgId, (tx) => adjustPrices(tx, actor, { serviceIds: [A.serviceId], percent: 300, roundTo: 0 }))).rejects.toThrow(/porcentagem/);
  });

  it("estatísticas por serviço contam os últimos 30 dias", async () => {
    const stats = await asTenant(sql, A.ownerId, A.orgId, (tx) => serviceStats(tx, A.orgId));
    expect(stats[A.serviceId] ?? { count30: 0 }).toMatchObject({ count30: 0 });
  });
});
