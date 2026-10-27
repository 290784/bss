import postgres from "postgres";
import { migrate } from "../../scripts/migrate";
import { withSystem, withTenant, type Sql, type Tx } from "@/server/db";
import { createOrganizationForUser } from "@/server/modules/onboarding";

export const TEST_URL = process.env.TEST_DATABASE_URL ?? "postgres://postgres@127.0.0.1:5432/beauty_os_test";

export async function freshDatabase(): Promise<Sql> {
  const admin = postgres(TEST_URL, { max: 1, onnotice: () => {} });
  await admin.unsafe("drop schema if exists app cascade");
  await admin.end();
  await migrate(TEST_URL, () => {});
  return postgres(TEST_URL, { max: 10, prepare: false, onnotice: () => {} });
}

let n = 0;
export async function createUser(sql: Sql, name = "Usuária") {
  n++;
  const [u] = await sql<{ id: string }[]>`
    insert into app.users (email, password_hash, full_name) values (${`u${n}-${Date.now()}@teste.dev`}, 'x', ${name}) returning id`;
  return u!.id;
}

export async function createOrg(sql: Sql, name: string) {
  const owner = await createUser(sql, `Dona ${name}`);
  const org = await withSystem(
    (tx) => createOrganizationForUser(tx, owner, { name, businessType: "nails", attends: true, ownerDisplayName: `Dona ${name}`, timezone: "America/Sao_Paulo" }),
    sql,
  );
  await sql`update app.organizations set onboarding_completed_at = now(), min_advance_minutes = 0 where id = ${org.organizationId}`;
  // Expediente todos os dias 08:00–20:00 para testes independentes do dia da semana.
  await sql`delete from app.working_hours where professional_id = ${org.professionalId!}`;
  for (let d = 0; d < 7; d++)
    await sql`insert into app.working_hours (organization_id, professional_id, weekday, start_time, end_time)
              values (${org.organizationId}, ${org.professionalId!}, ${d}, '08:00', '20:00')`;
  const [svc] = await sql<{ id: string }[]>`
    insert into app.services (organization_id, name, price_cents, duration_minutes, buffer_after_minutes)
    values (${org.organizationId}, 'Manicure', 5000, 60, 15) returning id`;
  await sql`insert into app.professional_services (organization_id, professional_id, service_id)
            values (${org.organizationId}, ${org.professionalId!}, ${svc!.id})`;
  const [client] = await sql<{ id: string }[]>`
    insert into app.clients (organization_id, full_name, phone, phone_normalized)
    values (${org.organizationId}, ${`Cliente ${name}`}, '11999990000', '5511999990000') returning id`;
  return { orgId: org.organizationId, ownerId: owner, professionalId: org.professionalId!, serviceId: svc!.id, clientId: client!.id, slug: org.slug };
}

export function asTenant<T>(sql: Sql, userId: string, orgId: string, fn: (tx: Tx) => Promise<T>) {
  return withTenant({ userId, organizationId: orgId }, fn, sql);
}

export async function addMember(sql: Sql, orgId: string, role: "manager" | "receptionist" | "professional", professionalId: string | null = null) {
  const userId = await createUser(sql, role);
  await sql`insert into app.memberships (organization_id, user_id, role, professional_id) values (${orgId}, ${userId}, ${role}, ${professionalId})`;
  return userId;
}

/** Uma data futura (YYYY-MM-DD) estável para os testes. */
export function futureDate(daysAhead = 7) {
  return new Date(Date.now() + daysAhead * 86_400_000).toISOString().slice(0, 10);
}
