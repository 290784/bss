import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Sql } from "@/server/db";
import { asTenant, createOrg, freshDatabase } from "../support/db";
import { exportarAgenda, exportarPagamentos, periodoDaExportacao } from "@/server/modules/exports";
import { csvBody, csvCell } from "@/server/csv";

let sql: Sql;
let A: Awaited<ReturnType<typeof createOrg>>;
let B: Awaited<ReturnType<typeof createOrg>>;
const TZ = "America/Sao_Paulo";

beforeAll(async () => {
  sql = await freshDatabase();
  A = await createOrg(sql, "Studio Exporta");
  B = await createOrg(sql, "Studio Outro");
  // Atendimento da A: 2027-03-10 22:30 em Brasília (= 01:30 UTC do dia 11): precisa contar como dia 10, no fuso da empresa.
  const [ap] = await sql<{ id: string }[]>`
    insert into app.appointments (organization_id, professional_id, client_id, starts_at, ends_at, blocked_until, status, price_cents, discount_cents, source, cancel_reason)
    values (${A.orgId}, ${A.professionalId}, ${A.clientId}, '2027-03-11T01:30:00Z', '2027-03-11T02:30:00Z', '2027-03-11T02:45:00Z', 'completed', 5000, 500, 'online', null) returning id`;
  await sql`insert into app.appointment_services (organization_id, appointment_id, service_id, service_name, price_cents, duration_minutes, position)
            values (${A.orgId}, ${ap!.id}, ${A.serviceId}, 'Manicure', 5000, 60, 0)`;
  // Um atendimento fora do período e um da outra empresa.
  await sql`insert into app.appointments (organization_id, professional_id, client_id, starts_at, ends_at, blocked_until, status)
            values (${A.orgId}, ${A.professionalId}, ${A.clientId}, '2027-06-01T15:00:00Z', '2027-06-01T16:00:00Z', '2027-06-01T16:15:00Z', 'confirmed')`;
  await sql`insert into app.appointments (organization_id, professional_id, client_id, starts_at, ends_at, blocked_until, status)
            values (${B.orgId}, ${B.professionalId}, ${B.clientId}, '2027-03-11T15:00:00Z', '2027-03-11T16:00:00Z', '2027-03-11T16:15:00Z', 'confirmed')`;
  const [pg] = await sql<{ id: string }[]>`
    insert into app.payments (organization_id, appointment_id, client_id, kind, amount_cents, method, is_deposit, paid_at)
    values (${A.orgId}, ${ap!.id}, ${A.clientId}, 'payment', 4500, 'pix', false, '2027-03-11T02:40:00Z') returning id`;
  await sql`insert into app.payments (organization_id, appointment_id, client_id, kind, amount_cents, method, refund_of, paid_at, notes)
            values (${A.orgId}, ${ap!.id}, ${A.clientId}, 'refund', 1000, 'pix', ${pg!.id}, '2027-03-12T15:00:00Z', '=cmd|calc')`;
});
afterAll(() => sql.end());
const tenantA = <T,>(fn: Parameters<typeof asTenant<T>>[3]) => asTenant(sql, A.ownerId, A.orgId, fn);

describe("exportação de agenda e pagamentos (P-14)", () => {
  it("agenda: só a empresa certa, só o período, com data no fuso da empresa e valor com desconto", async () => {
    const rows = await tenantA((tx) => exportarAgenda(tx, A.orgId, TZ, "2027-03-01", "2027-03-31"));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ data: "2027-03-10", inicio: "22:30", fim: "23:30", status: "concluído", servicos: "Manicure", valorCents: 4500, origem: "online" });
    expect(rows[0]!.cliente).toContain("Studio Exporta");
    const tudo = await tenantA((tx) => exportarAgenda(tx, A.orgId, TZ, "2027-01-01", "2027-12-31"));
    expect(tudo.map((r) => r.data)).toEqual(["2027-03-10", "2027-06-01"]);
  });

  it("pagamentos: estorno sai negativo e a data segue o fuso da empresa", async () => {
    const rows = await tenantA((tx) => exportarPagamentos(tx, A.orgId, TZ, "2027-03-01", "2027-03-31"));
    expect(rows.map((r) => [r.data, r.tipo, r.valorCents, r.forma])).toEqual([["2027-03-10", "pagamento", 4500, "Pix"], ["2027-03-12", "estorno", -1000, "Pix"]]);
  });

  it("a outra empresa não enxerga os dados da A", async () => {
    const rows = await asTenant(sql, B.ownerId, B.orgId, (tx) => exportarPagamentos(tx, B.orgId, TZ, "2027-01-01", "2027-12-31"));
    expect(rows).toEqual([]);
  });

  it("sem período, vale os últimos 12 meses até hoje; datas inválidas são ignoradas", () => {
    const now = new Date("2027-05-20T15:00:00Z");
    expect(periodoDaExportacao(new URLSearchParams(), TZ, now)).toEqual({ de: "2026-05-20", ate: "2027-05-20" });
    expect(periodoDaExportacao(new URLSearchParams("de=lixo&ate=2027-01-31"), TZ, now)).toEqual({ de: "2026-01-31", ate: "2027-01-31" });
  });

  it("o CSV protege contra fórmulas de planilha e usa BOM", () => {
    expect(csvCell("=cmd|calc")).toBe("'=cmd|calc");
    expect(csvCell("a;b")).toBe('"a;b"');
    expect(csvBody(["x"], [["=1+1"]]).startsWith("﻿x\n'=1+1")).toBe(true);
  });
});
