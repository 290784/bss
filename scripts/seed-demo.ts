/**
 * Cria UMA organização de demonstração, marcada com is_demo = true (a interface exibe um aviso).
 * Dados fictícios, isolados das contas reais pelo mesmo RLS de qualquer tenant.
 *
 * Uso: DATABASE_URL=... DEMO_PASSWORD=... npm run db:seed-demo
 */
import postgres from "postgres";
import { randomBytes } from "node:crypto";
import { hashPassword } from "../src/server/auth/password";
import { createOrganizationForUser } from "../src/server/modules/onboarding";
import { presetsFor, saveService } from "../src/server/modules/catalog";
import { createAppointment, changeStatus } from "../src/server/modules/appointments";
import { recordPayment } from "../src/server/modules/payments";
import { withSystem, withTenant, type Tx } from "../src/server/db";
import { addDaysToKey, localDateKey } from "../src/lib/time";
import { normalizeDatabaseUrl, pickDatabaseUrl } from "../src/server/db-url";

const EMAIL = "demo@beautyos.dev";

async function main() {
  const found = pickDatabaseUrl(["DATABASE_URL", "POSTGRES_URL"]);
  if (!found) throw new Error("DATABASE_URL não definida");
  const { url, ssl } = normalizeDatabaseUrl(found.value);
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "1")
    throw new Error("Seed de demonstração bloqueado em produção (defina ALLOW_DEMO_SEED=1 conscientemente).");
  const sql = postgres(url, { ssl, max: 4, prepare: false, onnotice: () => {} });
  const password = process.env.DEMO_PASSWORD ?? randomBytes(9).toString("base64url");

  const [exists] = await sql`select id from app.users where lower(email) = ${EMAIL}`;
  if (exists) { console.log("Demo já existe. Nada a fazer."); await sql.end(); return; }

  const [user] = await sql<{ id: string }[]>`
    insert into app.users (email, password_hash, full_name) values (${EMAIL}, ${await hashPassword(password)}, 'Conta Demonstração') returning id`;
  const org = await withSystem((tx) => createOrganizationForUser(tx, user!.id,
    { name: "Studio Demonstração", businessType: "salon", attends: true, ownerDisplayName: "Profissional Demo 1", timezone: "America/Sao_Paulo" },
    { isDemo: true }), sql);
  await sql`update app.organizations set onboarding_completed_at = now(), min_advance_minutes = 60 where id = ${org.organizationId}`;
  await sql`update app.subscriptions set plan = 'studio' where organization_id = ${org.organizationId}`;
  const [p2] = await sql<{ id: string }[]>`
    insert into app.professionals (organization_id, display_name, specialty, color) values (${org.organizationId}, 'Profissional Demo 2', 'Nail designer', '#3f6f6a') returning id`;
  for (const wd of [1, 2, 3, 4, 5, 6]) {
    await sql`delete from app.working_hours where professional_id = ${org.professionalId!} and weekday = ${wd}`;
    for (const pid of [org.professionalId!, p2!.id]) {
      await sql`insert into app.working_hours (organization_id, professional_id, weekday, start_time, end_time) values (${org.organizationId}, ${pid}, ${wd}, '09:00', '12:00'), (${org.organizationId}, ${pid}, ${wd}, '13:00', '19:00')`;
    }
  }

  const actor = { userId: user!.id, organizationId: org.organizationId };
  await withTenant({ userId: user!.id, organizationId: org.organizationId }, async (tx: Tx) => {
    const serviceIds: string[] = [];
    for (const s of presetsFor("salon"))
      serviceIds.push(await saveService(tx, actor, { name: s.name, categoryName: s.category, price: s.price, durationMinutes: s.minutes, bufferAfterMinutes: s.buffer, returnIntervalDays: s.returnDays, onlineBookable: true, professionalIds: [org.professionalId!, p2!.id] }));

    const clients: string[] = [];
    for (let i = 1; i <= 24; i++) {
      const [c] = await tx<{ id: string }[]>`
        insert into app.clients (organization_id, full_name, phone, phone_normalized, marketing_consent, source)
        values (${org.organizationId}, ${`Cliente Demo ${String(i).padStart(2, "0")}`}, ${`(11) 90000-${String(1000 + i)}`}, ${`55119000${String(1000 + i).padStart(5, "0")}`}, ${i % 3 === 0}, 'staff')
        returning id`;
      clients.push(c!.id);
    }

    // Histórico: ~70 dias para trás e 10 para frente, em horários sem conflito.
    const today = localDateKey(new Date(), "America/Sao_Paulo");
    let n = 0;
    for (let d = -70; d <= 10; d++) {
      const date = addDaysToKey(today, d);
      const wd = new Date(date + "T12:00:00Z").getUTCDay();
      if (wd === 0) continue;
      const times = ["09:00", "10:30", "14:00", "16:00"];
      for (const [k, time] of times.entries()) {
        if ((d * 7 + k) % 3 === 0) continue;
        const pro = k % 2 === 0 ? org.professionalId! : p2!.id;
        const client = clients[(n++ * 5) % (d < -60 ? 6 : clients.length)]!;
        const svc = serviceIds[(n + k) % serviceIds.length]!;
        const past = d < 0;
        // Passado: registrado como encaixe (histórico). Futuro: só entra se respeitar expediente e conflitos.
        const appt = await tx.savepoint((sp) =>
          createAppointment(sp as unknown as Tx, actor, { professionalId: pro, clientId: client, date, time, serviceIds: [svc], squeezeIn: past, status: past || d === 0 || n % 4 ? "confirmed" : "pending" }),
        ).catch(() => null);
        if (!appt) continue;
        if (past) {
          const outcome = n % 11 === 0 ? "no_show" : n % 13 === 0 ? "cancelled" : "completed";
          await changeStatus(tx, actor, appt.id, outcome);
          if (outcome === "completed" && n % 7 !== 0) {
            const [{ price } = { price: 0 }] = await tx<{ price: number }[]>`select price_cents as price from app.appointments where id = ${appt.id}`;
            await recordPayment(tx, actor, { appointmentId: appt.id, amountCents: price, method: n % 2 ? "pix" : "credit_card", isDeposit: false });
          }
        }
      }
    }
    // Lembretes de dados fictícios não devem ficar pendentes.
    await tx`update app.message_jobs set status = 'cancelled' where organization_id = ${org.organizationId}`;
  }, sql);

  // Pagamentos fictícios na data do próprio atendimento (não "hoje"). Contexto de sistema:
  // no papel de tenant, lançamentos financeiros são imutáveis.
  await sql`update app.payments p set paid_at = a.ends_at, created_at = a.ends_at from app.appointments a
            where a.id = p.appointment_id and p.organization_id = ${org.organizationId}`;

  console.log(`Demo criada: ${EMAIL} / ${password}  (organização marcada como demonstração)`);
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
