/**
 * Aplica migrações SQL versionadas de db/migrations em ordem, uma única vez cada.
 * Uso: DATABASE_URL=... npm run db:migrate   (no deploy da Vercel roda automaticamente no build)
 *
 * Antes de migrar, confere os pré-requisitos e explica o problema em português quando algo falta.
 */
import postgres from "postgres";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { explainDatabaseError, normalizeDatabaseUrl, pickDatabaseUrl } from "../src/server/db-url";

/** Migrações preferem a conexão direta (sem pooler), quando o provedor oferece uma. */
export const MIGRATION_URL_VARS = ["MIGRATION_DATABASE_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING", "DATABASE_URL", "POSTGRES_URL"];

export async function migrate(rawUrl: string, log = console.log) {
  const { url, ssl } = normalizeDatabaseUrl(rawUrl);
  const sql = postgres(url, { ssl, max: 1, connect_timeout: 20, prepare: false, onnotice: () => {} });
  try {
    await preflight(sql, log);
    await sql`create schema if not exists app`;
    await sql`create table if not exists app.schema_migrations (
      name text primary key, applied_at timestamptz not null default now())`;
    const dir = path.join(process.cwd(), "db", "migrations");
    const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
    const applied = new Set((await sql<{ name: string }[]>`select name from app.schema_migrations`).map((r) => r.name));
    let count = 0;
    for (const file of files) {
      if (applied.has(file)) continue;
      const body = await readFile(path.join(dir, file), "utf8");
      try {
        await sql.begin(async (tx) => {
          await tx.unsafe(body);
          await tx`insert into app.schema_migrations (name) values (${file})`;
        });
      } catch (err) {
        throw new Error(`Falha ao aplicar ${file}: ${explainDatabaseError(err)}`);
      }
      log(`✔ ${file}`);
      count++;
    }
    log(count ? `${count} migração(ões) aplicada(s).` : "Banco já está atualizado.");
  } finally {
    await sql.end();
  }
}

/** Conexão, versão e permissões necessárias (criar papel restrito e extensões). */
async function preflight(sql: postgres.Sql, log: (m: string) => void) {
  let info: { version: string; num: number; user: string; db: string; createrole: boolean; superuser: boolean; has_role: boolean; can_use_role: boolean };
  try {
    const [r] = await sql<typeof info[]>`
      select split_part(version(), ' ', 2) as version, current_setting('server_version_num')::int as num,
        current_user as user, current_database() as db,
        coalesce((select rolcreaterole from pg_roles where rolname = current_user), false) as createrole,
        coalesce((select rolsuper from pg_roles where rolname = current_user), false) as superuser,
        exists (select 1 from pg_roles where rolname = 'app_tenant') as has_role,
        exists (select 1 from pg_roles where rolname = 'app_tenant')
          and (pg_has_role(current_user, 'app_tenant', 'MEMBER') or pg_has_role(current_user, 'app_tenant', 'USAGE WITH ADMIN OPTION')) as can_use_role`;
    info = r!;
  } catch (err) {
    throw new Error(`Não foi possível conectar ao banco: ${explainDatabaseError(err)}`);
  }
  log(`Banco: PostgreSQL ${info.version} · usuário ${info.user} · base ${info.db}`);
  if (info.num < 150000) throw new Error(`PostgreSQL ${info.version} é antigo demais: use a versão 15 ou mais nova.`);
  if (!info.has_role && !info.createrole && !info.superuser)
    throw new Error(
      `O usuário "${info.user}" não pode criar papéis (CREATEROLE), necessário para o isolamento entre empresas (RLS). ` +
        `Use o usuário dono do banco (Neon: o "owner" da connection string padrão; Supabase: "postgres").`,
    );
  if (info.has_role && !info.can_use_role && !info.superuser)
    throw new Error(
      `O papel "app_tenant" já existe neste servidor, criado por outro usuário, e "${info.user}" não tem acesso a ele. ` +
        `Peça a quem administra o servidor para executar: GRANT app_tenant TO "${info.user}" WITH ADMIN OPTION; — ou use um banco novo.`,
    );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const found = pickDatabaseUrl(MIGRATION_URL_VARS);
  if (!found) {
    console.error("✘ Nenhuma URL de banco definida. Configure DATABASE_URL (ou conecte um banco Neon/Supabase ao projeto na Vercel).");
    process.exit(1);
  }
  console.log(`Usando ${found.name} para migrar.`);
  migrate(found.value).then(
    () => console.log("Migrações concluídas."),
    (err) => {
      console.error(`✘ ${err instanceof Error ? err.message : explainDatabaseError(err)}`);
      process.exit(1);
    },
  );
}
