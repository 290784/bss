import { describe, expect, it } from "vitest";
import { explainDatabaseError, normalizeDatabaseUrl } from "@/server/db-url";

describe("normalizeDatabaseUrl", () => {
  it("remove channel_binding (padrão do Neon) e força SSL", () => {
    const r = normalizeDatabaseUrl("postgresql://neondb_owner:senha@ep-x-123-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require");
    expect(r.url).not.toContain("channel_binding");
    expect(r.url).not.toContain("sslmode");
    expect(r.ssl).toBe("require");
    expect(r.host).toBe("ep-x-123-pooler.sa-east-1.aws.neon.tech");
  });
  it("remove parâmetros do Prisma usados em URLs do Supabase", () => {
    const r = normalizeDatabaseUrl("postgres://postgres.abc:senha@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1");
    expect(r.url).toBe("postgres://postgres.abc:senha@aws-0-sa-east-1.pooler.supabase.com:6543/postgres");
    expect(r.ssl).toBe("require");
  });
  it("mantém senha com caracteres especiais", () => {
    const r = normalizeDatabaseUrl("postgresql://u:p%40ss%23word@host.com/db");
    expect(r.url).toContain("p%40ss%23word");
  });
  it("sem SSL no ambiente local e quando sslmode=disable", () => {
    expect(normalizeDatabaseUrl("postgres://postgres@127.0.0.1:5432/x").ssl).toBe(false);
    expect(normalizeDatabaseUrl("postgres://u@db.interno:5432/x?sslmode=disable").ssl).toBe(false);
  });
  it("tolera aspas e espaços colados por engano", () => {
    expect(normalizeDatabaseUrl(' "postgres://u:p@h.com/db" ').host).toBe("h.com");
  });
  it("explica URL inválida", () => {
    expect(() => normalizeDatabaseUrl("neondb_owner:senha@host/db")).toThrow(/connection string completa/);
    expect(() => normalizeDatabaseUrl("mysql://u@h/db")).toThrow(/protocolo/);
  });
  it("traduz erros comuns", () => {
    expect(explainDatabaseError({ code: "28P01" })).toMatch(/senha/);
    expect(explainDatabaseError({ code: "42P01" })).toMatch(/migrações/);
  });
});
