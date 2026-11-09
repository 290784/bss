import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Sql } from "@/server/db";
import { withSystem } from "@/server/db";
import { createUser, freshDatabase } from "../support/db";
import { consumeToken, issueToken, resetPasswordWithToken, tokenIsValid, verifyEmailWithToken } from "@/server/modules/email-tokens";
import { hashPassword, verifyPassword } from "@/server/auth/password";

let sql: Sql;
beforeAll(async () => { sql = await freshDatabase(); });
afterAll(() => sql.end());
const sys = <T,>(fn: Parameters<typeof withSystem<T>>[0]) => withSystem(fn, sql);

describe("tokens de e-mail (P-08)", () => {
  it("o token é guardado só como hash, vale uma vez e depois não serve mais", async () => {
    const u = await createUser(sql, "Ana");
    const t = await sys((tx) => issueToken(tx, u, "reset"));
    const [row] = await sql<{ token_hash: string }[]>`select token_hash from app.email_tokens where user_id = ${u}`;
    expect(row!.token_hash).not.toContain(t);
    expect(await sys((tx) => tokenIsValid(tx, t, "reset"))).toBe(true);
    expect(await sys((tx) => consumeToken(tx, t, "reset"))).toBe(u);
    expect(await sys((tx) => consumeToken(tx, t, "reset"))).toBeNull();
    expect(await sys((tx) => tokenIsValid(tx, t, "reset"))).toBe(false);
  });

  it("não serve para o outro tipo, nem vencido, nem inventado", async () => {
    const u = await createUser(sql, "Bia");
    const t = await sys((tx) => issueToken(tx, u, "reset", new Date("2027-01-01T10:00:00Z")));
    expect(await sys((tx) => consumeToken(tx, t, "verify", new Date("2027-01-01T10:05:00Z")))).toBeNull();
    expect(await sys((tx) => consumeToken(tx, t, "reset", new Date("2027-01-01T11:00:01Z")))).toBeNull(); // 1 h e 1 s depois
    expect(await sys((tx) => consumeToken(tx, "inventado", "reset"))).toBeNull();
    expect(await sys((tx) => consumeToken(tx, "", "reset"))).toBeNull();
  });

  it("um pedido novo invalida o anterior", async () => {
    const u = await createUser(sql, "Cris");
    const antigo = await sys((tx) => issueToken(tx, u, "reset"));
    const novo = await sys((tx) => issueToken(tx, u, "reset"));
    expect(await sys((tx) => consumeToken(tx, antigo, "reset"))).toBeNull();
    expect(await sys((tx) => consumeToken(tx, novo, "reset"))).toBe(u);
  });

  it("dois cliques ao mesmo tempo: só um passa", async () => {
    const u = await createUser(sql, "Dani");
    const t = await sys((tx) => issueToken(tx, u, "reset"));
    const r = await Promise.all([sys((tx) => consumeToken(tx, t, "reset")), sys((tx) => consumeToken(tx, t, "reset"))]);
    expect(r.filter((x) => x !== null)).toHaveLength(1);
  });

  it("redefinir a senha troca o hash e derruba todas as sessões", async () => {
    const u = await createUser(sql, "Eva");
    await sql`update app.users set password_hash = ${await hashPassword("senha-antiga-123")} where id = ${u}`;
    await sql`insert into app.sessions (user_id, token_hash, expires_at) values (${u}, 'h1', now() + interval '1 day'), (${u}, 'h2', now() + interval '1 day')`;
    const t = await sys((tx) => issueToken(tx, u, "reset"));
    expect(await sys((tx) => resetPasswordWithToken(tx, t, "senha-nova-456"))).toBe(true);
    const [row] = await sql<{ password_hash: string; email_verified_at: Date | null }[]>`select password_hash, email_verified_at from app.users where id = ${u}`;
    expect(await verifyPassword("senha-nova-456", row!.password_hash)).toBe(true);
    expect(await verifyPassword("senha-antiga-123", row!.password_hash)).toBe(false);
    expect(row!.email_verified_at).not.toBeNull(); // quem recebeu o e-mail provou que ele é dela
    expect((await sql`select 1 from app.sessions where user_id = ${u}`).length).toBe(0);
    expect(await sys((tx) => resetPasswordWithToken(tx, t, "outra-senha-789"))).toBe(false);
  });

  it("verificar o e-mail marca a conta; um token de redefinição não verifica", async () => {
    const u = await createUser(sql, "Fê");
    const reset = await sys((tx) => issueToken(tx, u, "reset"));
    expect(await sys((tx) => verifyEmailWithToken(tx, reset))).toBe(false);
    const v = await sys((tx) => issueToken(tx, u, "verify"));
    expect(await sys((tx) => verifyEmailWithToken(tx, v))).toBe(true);
    const [row] = await sql<{ email_verified_at: Date | null }[]>`select email_verified_at from app.users where id = ${u}`;
    expect(row!.email_verified_at).not.toBeNull();
  });
});
