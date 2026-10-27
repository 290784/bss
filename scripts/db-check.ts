/**
 * Diagnóstico do banco: `npm run db:check`.
 * Testa a conexão que o app usa em produção, as migrações e o papel restrito (RLS).
 */
import postgres from "postgres";
import { explainDatabaseError, missingDatabaseMessage, normalizeDatabaseUrl, pickDatabaseUrl } from "../src/server/db-url";

async function main() {
  const found = pickDatabaseUrl(["DATABASE_URL", "POSTGRES_URL"]);
  if (!found) return fail(missingDatabaseMessage());
  const { url, ssl, host } = normalizeDatabaseUrl(found.value);
  console.log(`• Usando ${found.name} → ${host} (SSL: ${ssl ? "sim" : "não"})`);
  const sql = postgres(url, { ssl, max: 1, connect_timeout: 15, prepare: false, onnotice: () => {} });
  try {
    const [v] = await sql<{ version: string }[]>`select split_part(version(), ' ', 2) as version`;
    ok(`Conectou: PostgreSQL ${v!.version}`);
    const migrations = await sql<{ name: string }[]>`
      select name from app.schema_migrations order by name`.catch(() => null);
    if (!migrations) return fail("Tabelas não encontradas: rode `npm run db:migrate` (no deploy da Vercel é automático).");
    ok(`Migrações aplicadas: ${migrations.map((m) => m.name).join(", ")}`);
    await sql.begin(async (tx) => {
      await tx`set local role app_tenant`;
      await tx`select count(*) from app.organizations`;
    }).catch((err) => { throw new Error(`Papel restrito (RLS) indisponível para este usuário: ${explainDatabaseError(err)}`); });
    ok("Papel restrito app_tenant funcionando (isolamento entre empresas ativo).");
    const [c] = await sql<{ users: number; orgs: number }[]>`
      select (select count(*) from app.users)::int as users, (select count(*) from app.organizations)::int as orgs`;
    ok(`Dados: ${c!.users} usuária(s), ${c!.orgs} negócio(s).`);
    console.log("\nTudo certo com o banco.");
  } catch (err) {
    fail(err instanceof Error && !("code" in err) ? err.message : explainDatabaseError(err));
  } finally {
    await sql.end();
  }
}

const ok = (m: string) => console.log(`✔ ${m}`);
function fail(m: string) {
  console.error(`✘ ${m}`);
  process.exitCode = 1;
}

main();
