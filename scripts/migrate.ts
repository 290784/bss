/**
 * Aplica migrações SQL versionadas de db/migrations em ordem, uma única vez cada.
 * Uso: DATABASE_URL=... npm run db:migrate
 */
import postgres from "postgres";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export async function migrate(url: string, log = console.log) {
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await sql`create schema if not exists app`;
    await sql`create table if not exists app.schema_migrations (
      name text primary key, applied_at timestamptz not null default now())`;
    const dir = path.join(process.cwd(), "db", "migrations");
    const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
    const applied = new Set((await sql<{ name: string }[]>`select name from app.schema_migrations`).map((r) => r.name));
    for (const file of files) {
      if (applied.has(file)) continue;
      const body = await readFile(path.join(dir, file), "utf8");
      await sql.begin(async (tx) => {
        await tx.unsafe(body);
        await tx`insert into app.schema_migrations (name) values (${file})`;
      });
      log(`✔ ${file}`);
    }
  } finally {
    await sql.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // Migrações preferem a conexão direta (sem pooler), quando o provedor oferece uma.
  const url = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;
  if (!url) throw new Error("Nenhuma URL de banco definida (DATABASE_URL).");
  migrate(url).then(() => console.log("Migrações aplicadas."));
}
