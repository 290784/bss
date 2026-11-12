import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Sql } from "@/server/db";
import { withSystem } from "@/server/db";
import { createUser, freshDatabase } from "../support/db";
import { removeWaitlistEntry } from "@/server/modules/waitlist";

let sql: Sql;
beforeAll(async () => { sql = await freshDatabase(); });
afterAll(() => sql.end());

describe("lista de espera: remover pessoa (admin)", () => {
  it("apaga a pessoa, registra só o código na auditoria e devolve false na segunda vez", async () => {
    const admin = await createUser(sql, "Admin");
    const [p] = await sql<{ id: string }[]>`insert into app.waitlist (full_name, phone, business_type) values ('Maria Sigilosa', '5521988887777', 'lashes') returning id`;
    await sql`insert into app.waitlist (full_name, phone, business_type) values ('Outra Pessoa', '5521977776666', 'nails')`;

    expect(await withSystem((tx) => removeWaitlistEntry(tx, admin, p!.id), sql)).toBe(true);
    expect((await sql`select 1 from app.waitlist where id = ${p!.id}`).length).toBe(0);
    expect((await sql`select 1 from app.waitlist`).length).toBe(1); // a outra pessoa continua
    expect(await withSystem((tx) => removeWaitlistEntry(tx, admin, p!.id), sql)).toBe(false);

    const [log] = await sql<{ action: string; entity_id: string; data: object }[]>`select action, entity_id, data from app.audit_log where action = 'admin.waitlist_removed'`;
    expect(log!.entity_id).toBe(p!.id);
    expect(JSON.stringify(log)).not.toMatch(/Maria|Sigilosa|5521988887777/); // nada de dado pessoal na auditoria
  });
});
