import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Sql } from "@/server/db";
import { asTenant, createOrg, freshDatabase } from "../support/db";
import { commitClientImport, planClientImport } from "@/server/modules/client-import";
import { DomainError } from "@/server/errors";

let sql: Sql;
let A: Awaited<ReturnType<typeof createOrg>>;
let B: Awaited<ReturnType<typeof createOrg>>;
const actor = (o: typeof A) => ({ userId: o.ownerId, organizationId: o.orgId });
const plan = (o: typeof A, csv: string) => asTenant(sql, o.ownerId, o.orgId, (tx) => planClientImport(tx, o.orgId, csv));
const run = (o: typeof A, csv: string) => asTenant(sql, o.ownerId, o.orgId, (tx) => commitClientImport(tx, actor(o), csv));
const count = async (o: typeof A) => Number((await sql`select count(*)::int as n from app.clients where organization_id = ${o.orgId}`)[0]!.n);

beforeAll(async () => {
  sql = await freshDatabase();
  A = await createOrg(sql, "Studio Importa");
  B = await createOrg(sql, "Studio Outro");
  // A já tem "Cliente Studio Importa" (11 99999-0000, sem e-mail). Mais uma com e-mail e uma arquivada.
  await sql`insert into app.clients (organization_id, full_name, phone, phone_normalized, email) values (${A.orgId}, 'Fernanda Mail', '11988887777', '5511988887777', 'fernanda@exemplo.com')`;
  await sql`insert into app.clients (organization_id, full_name, phone, phone_normalized, archived_at) values (${A.orgId}, 'Arquivada Antiga', '11977776666', '5511977776666', now())`;
  await sql`insert into app.clients (organization_id, full_name) values (${A.orgId}, 'Só Nome Existente')`;
});
afterAll(() => sql.end());

const CSV = [
  "nome;telefone;email;nascimento;observacoes",
  "Nova Cliente;(11) 91111-0001;nova@exemplo.com;10/05/1995;Gosta de café",   // 2: entra
  "Mesmo Telefone;(11) 99999-0000;;;",                                         // 3: já existe (telefone formatado diferente)
  "Outro Nome;11 90000 1234;fernanda@EXEMPLO.com;;",                           // 4: já existe (e-mail)
  "Nova Cliente Repetida;11911110001;;;",                                      // 5: repetida no arquivo (telefone)
  ";11922220000;;;",                                                           // 6: erro (sem nome)
  "Só Nome Novo;;;;",                                                          // 7: entra (só nome)
  "só nome existente;;;;",                                                     // 8: já existe (nome, sem telefone nem e-mail)
  "Arquivada Antiga;(11) 97777-6666;;;",                                       // 9: entra (a arquivada não bloqueia)
  "Telefone Ruim;123;;;",                                                      // 10: entra sem telefone + aviso
].join("\n");

describe("importação de clientes: prévia", () => {
  it("separa o que entra, o que já existe, o que repete no arquivo e o que tem erro; não grava nada", async () => {
    const before = await count(A);
    const p = await plan(A, CSV);
    expect(p.total).toBe(9);
    expect(p.toCreate.map((r) => r.line)).toEqual([2, 7, 9, 10]);
    expect(p.existing).toEqual([{ line: 3, reason: "mesmo telefone" }, { line: 4, reason: "mesmo e-mail" }, { line: 8, reason: "mesmo nome" }]);
    expect(p.inFile).toEqual([{ line: 5, of: 2, reason: "mesmo telefone" }]);
    expect(p.errors).toEqual([{ line: 6, message: "Sem nome." }]);
    expect(p.warnings).toHaveLength(1);
    expect(await count(A)).toBe(before);
  });
  it("arquivo inválido vira DomainError com mensagem para a pessoa", async () => {
    await expect(plan(A, "telefone\n11999990000")).rejects.toBeInstanceOf(DomainError);
    await expect(plan(A, "telefone\n11999990000")).rejects.toThrow(/coluna do nome/);
  });
});

describe("importação de clientes: gravação", () => {
  it("cria só as que entram, com origem import, SEM consentimento de marketing e com contato por WhatsApp; não mexe nas existentes", async () => {
    const before = await count(A);
    const existingBefore = await sql`select id, full_name, phone, email, marketing_consent from app.clients where organization_id = ${A.orgId} and full_name in ('Fernanda Mail', 'Só Nome Existente') order by full_name`;
    const r = await run(A, CSV);
    expect(r).toMatchObject({ created: 4, existing: 3, inFile: 1, errors: 1, warnings: 1, total: 9 });
    expect(await count(A)).toBe(before + 4);
    const novas = await sql`select full_name, phone_normalized, email, birth_date::text as birth, preferences, source, marketing_consent, marketing_consent_at, contact_preference
      from app.clients where organization_id = ${A.orgId} and source = 'import' order by full_name`;
    expect(novas.map((c) => c.full_name)).toEqual(["Arquivada Antiga", "Nova Cliente", "Só Nome Novo", "Telefone Ruim"]);
    expect(novas.every((c) => c.marketing_consent === false && c.marketing_consent_at === null && c.contact_preference === "whatsapp")).toBe(true);
    expect(novas.find((c) => c.full_name === "Nova Cliente")).toMatchObject({ phone_normalized: "5511911110001", email: "nova@exemplo.com", birth: "1995-05-10", preferences: "Gosta de café" });
    expect(novas.find((c) => c.full_name === "Telefone Ruim")).toMatchObject({ phone_normalized: null });
    const existingAfter = await sql`select id, full_name, phone, email, marketing_consent from app.clients where organization_id = ${A.orgId} and full_name in ('Fernanda Mail', 'Só Nome Existente') order by full_name`;
    expect(existingAfter).toEqual(existingBefore);
  });
  it("deixa registro na auditoria, com as contagens e sem dados das clientes", async () => {
    const [a] = await sql`select action, data from app.audit_log where organization_id = ${A.orgId} and action = 'clients.imported' order by created_at desc limit 1`;
    expect(a!.data).toMatchObject({ created: 4, existing: 3, errors: 1 });
    expect(JSON.stringify(a!.data)).not.toMatch(/Nova Cliente|nova@exemplo/);
  });
  it("rodar o mesmo arquivo de novo não duplica ninguém", async () => {
    const before = await count(A);
    const r = await run(A, CSV);
    expect(r.created).toBe(0);
    expect(await count(A)).toBe(before);
  });
  it("duas importações ao mesmo tempo do mesmo arquivo não duplicam (trava por empresa)", async () => {
    const csv = "nome;telefone\nSimultânea Um;11955550001\nSimultânea Dois;11955550002";
    const [r1, r2] = await Promise.all([run(A, csv), run(A, csv)]);
    expect(r1.created + r2.created).toBe(2);
    expect(Number((await sql`select count(*)::int as n from app.clients where organization_id = ${A.orgId} and phone_normalized in ('5511955550001', '5511955550002')`)[0]!.n)).toBe(2);
  });
  it("um estabelecimento não enxerga nem é bloqueado pelas clientes do outro", async () => {
    // 11 98888-7777 e 11 91111-0001 já existem em A; em B não existem, então entram (só as clientes da própria empresa contam)
    const r = await run(B, "nome;telefone\nFernanda Em Outra;(11) 98888-7777\nNova Cliente;(11) 91111-0001");
    expect(r.created).toBe(2);
    const p = await plan(A, "nome;telefone\nQualquer;(11) 98000-0000");
    expect(p.toCreate).toHaveLength(1);
    expect(await sql`select 1 from app.clients where organization_id = ${B.orgId} and source = 'import'`).toHaveLength(2);
  });
  it("arquivo grande entra inteiro, em lotes", async () => {
    const lines = ["nome;telefone", ...Array.from({ length: 1200 }, (_, i) => `Lote ${i};119${String(10_000_000 + i)}`)];
    const r = await run(A, lines.join("\n"));
    expect(r.created).toBe(1200);
    expect(await sql`select 1 from app.clients where organization_id = ${A.orgId} and full_name like 'Lote %'`).toHaveLength(1200);
  });
  it("a empresa certa é sempre a do contexto: não dá para importar para outra pelo conteúdo do arquivo", async () => {
    const before = await count(B);
    await run(A, `nome;telefone;organization_id\nInjetada;11944440000;${B.orgId}`);
    expect(await count(B)).toBe(before);
  });
});
