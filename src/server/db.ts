import "server-only";
import postgres from "postgres";
import { missingDatabaseMessage, normalizeDatabaseUrl, pickDatabaseUrl } from "@/server/db-url";

/**
 * Duas formas de acesso ao banco:
 *
 * - `withTenant(ctx, fn)`: transação com `SET LOCAL ROLE app_tenant` e contexto
 *   (usuário + organização). Toda leitura/escrita de dados de negócio passa por aqui,
 *   e o RLS do PostgreSQL garante o isolamento entre empresas.
 * - `withSystem(fn)`: privilégios do dono das tabelas. Uso restrito a autenticação,
 *   página pública de agendamento e jobs — sempre filtrando organização explicitamente.
 */
export type Sql = postgres.Sql;
export type Tx = postgres.TransactionSql;

const globalForDb = globalThis as unknown as { __beautyDb?: Sql };

export function getSql(): Sql {
  if (!globalForDb.__beautyDb) {
    // DATABASE_URL (padrão) ou POSTGRES_URL (nome usado pela integração Supabase/Vercel).
    const found = pickDatabaseUrl(["DATABASE_URL", "POSTGRES_URL"]);
    if (!found) throw new Error(missingDatabaseMessage());
    const { url, ssl } = normalizeDatabaseUrl(found.value);
    globalForDb.__beautyDb = postgres(url, {
      ssl,
      max: Number(process.env.DATABASE_POOL_SIZE ?? 5),
      idle_timeout: 20,
      connect_timeout: 15,
      prepare: false, // compatível com poolers em modo transação (ex.: Supabase/PgBouncer, Neon pooled)
      onnotice: () => {},
    });
  }
  return globalForDb.__beautyDb;
}

export type TenantContext = { userId: string; organizationId: string };

export async function withTenant<T>(ctx: TenantContext, fn: (tx: Tx) => Promise<T>, sql: Sql = getSql()): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`select set_config('app.user_id', ${ctx.userId}, true), set_config('app.org_id', ${ctx.organizationId}, true)`;
    await tx`set local role app_tenant`;
    return fn(tx);
  }) as Promise<T>;
}

export async function withSystem<T>(fn: (tx: Tx) => Promise<T>, sql: Sql = getSql()): Promise<T> {
  return sql.begin(fn) as Promise<T>;
}

/** Erros do PostgreSQL relevantes para regras de negócio. */
export function pgErrorCode(err: unknown): string | undefined {
  return typeof err === "object" && err !== null && "code" in err ? String((err as { code: unknown }).code) : undefined;
}
export const PG_EXCLUSION_VIOLATION = "23P01";
export const PG_UNIQUE_VIOLATION = "23505";
export const PG_INSUFFICIENT_PRIVILEGE = "42501";
