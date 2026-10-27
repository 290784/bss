import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Sql } from "@/server/db";
import { addMember, asTenant, createOrg, freshDatabase, futureDate } from "../support/db";
import { createAppointment } from "@/server/modules/appointments";
import { recordPayment } from "@/server/modules/payments";
import { listClients } from "@/server/modules/clients";

let sql: Sql;
let A: Awaited<ReturnType<typeof createOrg>>;
let B: Awaited<ReturnType<typeof createOrg>>;

beforeAll(async () => {
  sql = await freshDatabase();
  A = await createOrg(sql, "Studio Alfa");
  B = await createOrg(sql, "Studio Beta");
});
afterAll(() => sql.end());

describe("isolamento entre empresas (RLS)", () => {
  it("uma empresa não lista clientes de outra", async () => {
    const rows = await asTenant(sql, A.ownerId, A.orgId, (tx) => tx`select id, organization_id from app.clients`);
    expect(rows.length).toBe(1);
    expect(rows.every((r) => r.organization_id === A.orgId)).toBe(true);
  });

  it("filtrar explicitamente pelo id da outra empresa não retorna nada", async () => {
    const rows = await asTenant(sql, A.ownerId, A.orgId, (tx) => tx`select id from app.clients where id = ${B.clientId}`);
    expect(rows).toEqual([]);
    const listed = await asTenant(sql, A.ownerId, A.orgId, (tx) => listClients(tx, B.orgId, { includeSpent: true }));
    expect(listed).toEqual([]);
  });

  it("forjar o contexto de uma organização da qual não é membro não dá acesso", async () => {
    const rows = await asTenant(sql, A.ownerId, B.orgId, (tx) => tx`select id from app.clients`);
    expect(rows).toEqual([]);
  });

  it("não é possível inserir dados na outra empresa", async () => {
    await expect(
      asTenant(sql, A.ownerId, A.orgId, (tx) => tx`insert into app.clients (organization_id, full_name) values (${B.orgId}, 'Invasora')`),
    ).rejects.toMatchObject({ code: "42501" });
  });

  it("não é possível alterar dados da outra empresa", async () => {
    const r = await asTenant(sql, A.ownerId, A.orgId, (tx) => tx`update app.clients set full_name = 'X' where id = ${B.clientId}`);
    expect(r.count).toBe(0);
  });

  it("tabelas de identidade não são acessíveis no contexto de tenant", async () => {
    const users = await asTenant(sql, A.ownerId, A.orgId, (tx) => tx`select id from app.users`).catch((e) => e);
    // Sem GRANT: erro de permissão.
    expect(users).toMatchObject({ code: "42501" });
  });

  it("agendamentos não podem apagar histórico (sem DELETE)", async () => {
    await expect(asTenant(sql, A.ownerId, A.orgId, (tx) => tx`delete from app.appointments`)).rejects.toMatchObject({ code: "42501" });
  });
});

describe("permissões por papel", () => {
  it("profissional não vê pagamentos nem altera serviços", async () => {
    const date = futureDate(3);
    const appt = await asTenant(sql, A.ownerId, A.orgId, (tx) =>
      createAppointment(tx, { userId: A.ownerId, organizationId: A.orgId }, {
        professionalId: A.professionalId, clientId: A.clientId, date, time: "10:00", serviceIds: [A.serviceId], squeezeIn: false, status: "confirmed",
      }),
    );
    await asTenant(sql, A.ownerId, A.orgId, (tx) =>
      recordPayment(tx, { userId: A.ownerId, organizationId: A.orgId }, { appointmentId: appt.id, amountCents: 1000, method: "pix", isDeposit: true }),
    );

    const [other] = await sql<{ id: string }[]>`
      insert into app.professionals (organization_id, display_name) values (${A.orgId}, 'Outra') returning id`;
    const otherProf = other!.id;
    const proUser = await addMember(sql, A.orgId, "professional", otherProf);

    const payments = await asTenant(sql, proUser, A.orgId, (tx) => tx`select id from app.payments`);
    expect(payments).toEqual([]);
    const upd = await asTenant(sql, proUser, A.orgId, (tx) => tx`update app.services set price_cents = 1 where organization_id = ${A.orgId}`);
    expect(upd.count).toBe(0);
    // Só enxerga a própria agenda.
    const appts = await asTenant(sql, proUser, A.orgId, (tx) => tx`select id from app.appointments`);
    expect(appts).toEqual([]);
    await expect(
      asTenant(sql, proUser, A.orgId, (tx) => tx`insert into app.payments (organization_id, appointment_id, amount_cents, method) values (${A.orgId}, ${appt.id}, 100, 'pix')`),
    ).rejects.toMatchObject({ code: "42501" });
  });

  it("recepção registra pagamento, mas não altera configurações", async () => {
    const rec = await addMember(sql, A.orgId, "receptionist");
    const r = await asTenant(sql, rec, A.orgId, (tx) => tx`update app.organizations set name = 'Hack' where id = ${A.orgId}`);
    expect(r.count).toBe(0);
    const pays = await asTenant(sql, rec, A.orgId, (tx) => tx`select id from app.payments`);
    expect(pays.length).toBe(1);
  });

  it("membro desativado perde acesso imediatamente", async () => {
    const mgr = await addMember(sql, A.orgId, "manager");
    expect((await asTenant(sql, mgr, A.orgId, (tx) => tx`select id from app.clients`)).length).toBe(1);
    await sql`update app.memberships set status = 'disabled' where user_id = ${mgr}`;
    expect(await asTenant(sql, mgr, A.orgId, (tx) => tx`select id from app.clients`)).toEqual([]);
  });
});

describe("limites do plano", () => {
  it("não permite exceder o número de profissionais do plano", async () => {
    const { saveProfessional } = await import("@/server/modules/team");
    const { PLANS } = await import("@/domain/plans");
    const input = { displayName: "Nova Profissional", color: "#3f6f6a", commissionPercent: 0, acceptsOnline: true, serviceIds: [] };
    // B tem 1 profissional ativa; o plano Solo permite 1.
    await expect(
      asTenant(sql, B.ownerId, B.orgId, (tx) => saveProfessional(tx, { userId: B.ownerId, organizationId: B.orgId }, PLANS.solo, input)),
    ).rejects.toThrow(/permite até 1/);
    const id = await asTenant(sql, B.ownerId, B.orgId, (tx) => saveProfessional(tx, { userId: B.ownerId, organizationId: B.orgId }, PLANS.studio, input));
    expect(id).toBeTruthy();
  });
});
