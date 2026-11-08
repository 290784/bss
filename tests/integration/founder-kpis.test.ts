import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Sql } from "@/server/db";
import { withSystem } from "@/server/db";
import { createOrg, createUser, freshDatabase } from "../support/db";
import { trackEvent } from "@/server/modules/audit";
import { loadFounderKpis } from "@/server/modules/founder-kpis";

let sql: Sql;
beforeAll(async () => { sql = await freshDatabase(); });
afterAll(() => sql.end());

describe("painel do fundador (P-12)", () => {
  it("vazio: tudo zerado, sem erro", async () => {
    const k = await withSystem((tx) => loadFounderKpis(tx), sql);
    expect(k.cadastros).toEqual({ total: 0, ultimos7: 0, ultimos30: 0 });
    expect(k.funil).toEqual({ cadastros: 0, criaramNegocio: 0, concluiramOnboarding: 0, ativadas: 0 });
    expect(k.contasEmRisco).toEqual([]);
  });

  it("conta cadastros por canal, funil, ativação, lista de espera e contas em risco", async () => {
    // Ana: cadastrou com ig-bio, criou negócio, concluiu e já tem atendimento. Bia: wa-direto, parou no negócio criado. Cris: sem código, só cadastro.
    const ana = await createOrg(sql, "Studio Ana");
    const bia = await createOrg(sql, "Studio Bia");
    const cris = await createUser(sql, "Cris");
    await withSystem(async (tx) => {
      await trackEvent(tx, "signup.completed", null, ana.ownerId, { canal: "ig-bio", conheceu: "instagram" });
      await trackEvent(tx, "onboarding.business_created", ana.orgId, ana.ownerId, {});
      await trackEvent(tx, "onboarding.completed", ana.orgId, ana.ownerId, {});
      await trackEvent(tx, "signup.completed", null, bia.ownerId, { canal: "wa-direto" });
      await trackEvent(tx, "onboarding.business_created", bia.orgId, bia.ownerId, {});
      await trackEvent(tx, "signup.completed", null, cris, {});
      await trackEvent(tx, "booking.online_created", ana.orgId, null, {});
    }, sql);
    await sql`insert into app.appointments (organization_id, professional_id, client_id, starts_at, ends_at, blocked_until, status)
      values (${ana.orgId}, ${ana.professionalId}, ${ana.clientId}, now() + interval '1 day', now() + interval '1 day 1 hour', now() + interval '1 day 1 hour 15 minutes', 'confirmed')`;
    await sql`insert into app.waitlist (full_name, phone, business_type, canal) values ('Dani', '5521999990001', 'lashes', 'ig-dm'), ('Eva', '5521999990002', 'nails', null)`;
    // A Bia (sem atendimentos) se cadastrou há 5 dias: entra em risco. A Ana tem atendimento: não.
    await sql`update app.organizations set created_at = now() - interval '5 days' where id in (${ana.orgId}, ${bia.orgId})`;

    const k = await withSystem((tx) => loadFounderKpis(tx), sql);
    expect(k.cadastros).toEqual({ total: 3, ultimos7: 3, ultimos30: 3 });
    expect(k.porCanal.map((x) => [x.canal, x.conheceu, x.cadastros]).sort()).toEqual([
      ["ig-bio", "instagram", 1], ["sem código", "não respondeu", 1], ["wa-direto", "não respondeu", 1]]);
    expect(k.funil).toEqual({ cadastros: 3, criaramNegocio: 2, concluiramOnboarding: 1, ativadas: 1 });
    expect(k.listaEspera.total).toBe(2);
    expect(k.listaEspera.porTipo.map((t) => t.tipo).sort()).toEqual(["lashes", "nails"]);
    expect(k.reservasOnline).toEqual({ ultimos7: 1, ultimos30: 1 });
    expect(k.contasEmRisco.map((o) => o.nome)).toEqual(["Studio Bia"]);
    expect(k.contasEmRisco[0]!.diasDesdeCadastro).toBe(5);
  });
});
