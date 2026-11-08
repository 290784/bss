import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Sql } from "@/server/db";
import { addMember, asTenant, createOrg, freshDatabase } from "../support/db";
import { dailyGreeting } from "@/server/modules/greetings";
import { GREETINGS } from "@/domain/greetings";

let sql: Sql;
let A: Awaited<ReturnType<typeof createOrg>>;
let B: Awaited<ReturnType<typeof createOrg>>;

const at = (iso: string) => new Date(iso);
const greet = (org: typeof A, userId: string, now: Date, timeZone = "America/Sao_Paulo", random?: () => number) =>
  asTenant(sql, userId, org.orgId, (tx) => dailyGreeting(tx, { organizationId: org.orgId, userId, timeZone }, { now, random }));

beforeAll(async () => {
  sql = await freshDatabase();
  A = await createOrg(sql, "Studio Alfa");
  B = await createOrg(sql, "Studio Beta");
});
afterAll(() => sql.end());

describe("saudação do dia", () => {
  it("é uma das oito frases e fica a mesma o dia todo (atualizar, reabrir, sair e entrar de novo)", async () => {
    const manha = await greet(A, A.ownerId, at("2026-11-03T11:00:00Z"));
    expect(GREETINGS).toContain(manha.text);
    // Cada chamada é uma nova abertura do painel (nova transação), com horários e sorteios diferentes.
    for (const h of ["11:00:05", "13:30:00", "20:15:00", "23:59:00"])
      expect((await greet(A, A.ownerId, at(`2026-11-03T${h}Z`), "America/Sao_Paulo", () => 0.99)).index).toBe(manha.index);
  });

  it("guarda uma linha por usuária por dia", async () => {
    const rows = await sql`select count(*)::int as n from app.user_greetings where user_id = ${A.ownerId} and local_date = '2026-11-03'`;
    expect(rows[0]!.n).toBe(1);
  });

  it("não repete a saudação em dias seguidos, nem com o pior sorteio possível", async () => {
    let prev: number | null = null;
    for (let d = 0; d < 60; d++) {
      const now = new Date(Date.UTC(2027, 0, 1 + d, 15));
      // Sempre o mesmo número "sorteado" (0): se a regra falhasse, repetiria a cada dia.
      const g = await greet(A, A.ownerId, now, "America/Sao_Paulo", () => 0);
      if (prev !== null) expect(g.index).not.toBe(prev);
      prev = g.index;
    }
  });

  it("com sorteio de verdade, 40 dias seguidos nunca repetem e usam várias frases", async () => {
    const user = await addMember(sql, A.orgId, "manager");
    const seen: number[] = [];
    for (let d = 0; d < 40; d++) seen.push((await greet(A, user, new Date(Date.UTC(2027, 3, 1 + d, 15)))).index);
    for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1]);
    expect(new Set(seen).size).toBeGreaterThanOrEqual(5);
  });

  it("usuárias diferentes têm saudações independentes", async () => {
    const outra = await addMember(sql, A.orgId, "receptionist");
    const doDia = (u: string, d: number) => greet(A, u, new Date(Date.UTC(2027, 5, 1 + d, 15)));
    let diferentes = 0;
    for (let d = 0; d < 30; d++) if ((await doDia(A.ownerId, d)).index !== (await doDia(outra, d)).index) diferentes++;
    expect(diferentes).toBeGreaterThan(0);
    // E uma não mexe na outra: cada uma tem exatamente as suas 30 linhas nesse período.
    const n = await sql`select user_id, count(*)::int as n from app.user_greetings where organization_id = ${A.orgId} and local_date >= '2027-06-01' and local_date < '2027-07-01' group by user_id`;
    expect(Object.fromEntries(n.map((r) => [r.user_id, r.n]))).toMatchObject({ [A.ownerId]: 30, [outra]: 30 });
  });

  it("o dia muda na meia-noite do fuso da empresa, não na do UTC", async () => {
    const user = await addMember(sql, A.orgId, "manager");
    const tz = "America/Sao_Paulo"; // UTC-3
    const noite = await greet(A, user, at("2026-12-10T02:00:00Z"), tz, () => 0); // 09/12 23:00 em São Paulo
    expect(noite.date).toBe("2026-12-09");
    const quase = await greet(A, user, at("2026-12-10T02:59:00Z"), tz, () => 0.9); // 09/12 23:59: ainda o mesmo dia
    expect(quase.index).toBe(noite.index);
    const meiaNoite = await greet(A, user, at("2026-12-10T03:00:00Z"), tz, () => 0.9); // 10/12 00:00: dia novo
    expect(meiaNoite.date).toBe("2026-12-10");
    expect(meiaNoite.index).not.toBe(noite.index);
  });

  it("o mesmo instante cai em dias diferentes conforme o fuso da empresa", async () => {
    const sp = await addMember(sql, A.orgId, "manager");
    const tokyo = await addMember(sql, B.orgId, "manager");
    const instante = at("2026-12-10T05:00:00Z");
    expect((await greet(A, sp, instante, "America/Sao_Paulo")).date).toBe("2026-12-10");
    expect((await greet(B, tokyo, instante, "Pacific/Kiritimati")).date).toBe("2026-12-10");
    expect((await greet(A, sp, at("2026-12-10T02:00:00Z"), "America/Sao_Paulo")).date).toBe("2026-12-09");
    expect((await greet(B, tokyo, at("2026-12-10T02:00:00Z"), "Asia/Tokyo")).date).toBe("2026-12-10");
  });

  it("duas aberturas ao mesmo tempo não criam duas saudações", async () => {
    const user = await addMember(sql, A.orgId, "manager");
    const now = at("2027-02-10T15:00:00Z");
    const todas = await Promise.all(Array.from({ length: 6 }, (_, i) => greet(A, user, now, "America/Sao_Paulo", () => i / 6)));
    expect(new Set(todas.map((g) => g.index)).size).toBe(1);
    const n = await sql`select count(*)::int as n from app.user_greetings where user_id = ${user} and local_date = '2027-02-10'`;
    expect(n[0]!.n).toBe(1);
  });
});

describe("isolamento entre usuárias e empresas", () => {
  it("cada usuária só enxerga a própria saudação", async () => {
    const outra = await addMember(sql, A.orgId, "manager");
    await greet(A, A.ownerId, at("2027-03-01T15:00:00Z"));
    await greet(A, outra, at("2027-03-01T15:00:00Z"));
    const minhas = await asTenant(sql, outra, A.orgId, (tx) => tx<{ user_id: string }[]>`select user_id from app.user_greetings`);
    expect(minhas.length).toBeGreaterThan(0);
    expect(minhas.every((r) => r.user_id === outra)).toBe(true);
  });

  it("uma usuária não grava saudação em nome de outra", async () => {
    const outra = await addMember(sql, A.orgId, "manager");
    await expect(asTenant(sql, outra, A.orgId, (tx) => tx`
      insert into app.user_greetings (organization_id, user_id, local_date, greeting_index) values (${A.orgId}, ${A.ownerId}, '2030-01-01', 1)`)).rejects.toThrow();
  });

  it("outra empresa não enxerga nem grava na empresa alheia", async () => {
    const deB = await asTenant(sql, B.ownerId, B.orgId, (tx) => tx`select * from app.user_greetings`);
    expect(deB.every((r) => r.organization_id === B.orgId)).toBe(true);
    await expect(asTenant(sql, B.ownerId, B.orgId, (tx) => tx`
      insert into app.user_greetings (organization_id, user_id, local_date, greeting_index) values (${A.orgId}, ${B.ownerId}, '2030-01-02', 1)`)).rejects.toThrow();
  });

  it("a saudação do dia não pode ser trocada nem apagada pelo app", async () => {
    await greet(A, A.ownerId, at("2027-04-01T15:00:00Z"));
    await expect(asTenant(sql, A.ownerId, A.orgId, (tx) => tx`update app.user_greetings set greeting_index = 0 where user_id = ${A.ownerId}`)).rejects.toThrow();
    await expect(asTenant(sql, A.ownerId, A.orgId, (tx) => tx`delete from app.user_greetings where user_id = ${A.ownerId}`)).rejects.toThrow();
  });

  it("o 'Bom dia' segue a hora de Brasília, não a do servidor (UTC)", async () => {
    const u = await addMember(sql, A.orgId, "manager");
    // Mesma frase no mesmo dia (sorteio fixo): 09h de Brasília (12h UTC), 15h (18h UTC) e 20h (23h UTC).
    const manha = await greet(A, u, at("2027-05-10T12:00:00Z"), "America/Sao_Paulo", () => 0);
    const tarde = await greet(A, u, at("2027-05-10T18:00:00Z"), "America/Sao_Paulo", () => 0);
    const noite = await greet(A, u, at("2027-05-10T23:00:00Z"), "America/Sao_Paulo", () => 0);
    expect([manha.index, tarde.index, noite.index]).toEqual([manha.index, manha.index, manha.index]);
    expect(manha.text).toBe("Bom dia, visionária! ✨");
    expect(tarde.text).toBe("Boa tarde, visionária! ✨");
    expect(noite.text).toBe("Boa noite, visionária! ✨");
  });
});
