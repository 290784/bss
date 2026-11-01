import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Sql } from "@/server/db";
import { asTenant, createOrg, freshDatabase } from "../support/db";
import { teamStats } from "@/server/modules/team";

let sql: Sql;
let A: Awaited<ReturnType<typeof createOrg>>;
const TZ = "America/Sao_Paulo";

async function done(serviceId: string, price: number, discount = 0, hoursAgo = 2) {
  const s = new Date(Date.now() - hoursAgo * 3_600_000), e = new Date(s.getTime() + 3_600_000);
  const [a] = await sql<{ id: string }[]>`
    insert into app.appointments (organization_id, professional_id, client_id, starts_at, ends_at, blocked_until, status, allow_overlap, price_cents, discount_cents)
    values (${A.orgId}, ${A.professionalId}, ${A.clientId}, ${s}, ${e}, ${e}, 'completed', true, ${price}, ${discount}) returning id`;
  await sql`insert into app.appointment_services (organization_id, appointment_id, service_id, service_name, price_cents, duration_minutes, position)
    values (${A.orgId}, ${a!.id}, ${serviceId}, 'x', ${price}, 60, 0)`;
}

beforeAll(async () => {
  sql = await freshDatabase();
  A = await createOrg(sql, "Studio Equipe");
});
afterAll(async () => { await sql?.end(); });

describe("números da equipe", () => {
  it("comissão: a do serviço quando existe, senão a da profissional, já descontado o desconto", async () => {
    await sql`update app.professionals set commission_percent = 40 where id = ${A.professionalId}`;
    const [especial] = await sql<{ id: string }[]>`
      insert into app.services (organization_id, name, price_cents, duration_minutes, commission_percent) values (${A.orgId}, 'Especial', 10000, 60, 50) returning id`;
    // Só conta o que é do mês atual: usa horas atrás que caem hoje (o teste roda depois da 1h da manhã).
    const h = Math.min(1, new Date().getHours() / 4);
    await done(A.serviceId, 5000, 0, h);          // 40% de 50,00 = 20,00
    await done(especial!.id, 10000, 2000, h);     // 50% de 80,00 = 40,00
    const st = (await asTenant(sql, A.ownerId, A.orgId, (tx) => teamStats(tx, A.orgId, TZ)))[A.professionalId]!;
    expect(st.completed).toBe(2);
    expect(st.revenue).toBe(13000);
    expect(st.commission).toBe(6000);
    expect(st.weekAvailable).toBe(7 * 12 * 60); // expediente 08–20 todos os dias (createOrg)
  });
});
