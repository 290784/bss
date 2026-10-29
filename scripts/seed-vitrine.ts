/**
 * Cria a conta vitrine (ver src/server/modules/vitrine.ts) no banco de DATABASE_URL.
 * Uso: DATABASE_URL=... VITRINE_PASSWORD=... npm run db:seed-vitrine   (RESET=1 recria do zero)
 */
import postgres from "postgres";
import { randomBytes } from "node:crypto";
import { criarContaVitrine } from "../src/server/modules/vitrine";
import { normalizeDatabaseUrl, pickDatabaseUrl } from "../src/server/db-url";

async function main() {
  const found = pickDatabaseUrl(["DATABASE_URL", "POSTGRES_URL"]);
  if (!found) throw new Error("DATABASE_URL não definida");
  const { url, ssl } = normalizeDatabaseUrl(found.value);
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "1")
    throw new Error("Seed de demonstração bloqueado em produção (defina ALLOW_DEMO_SEED=1 conscientemente).");
  const sql = postgres(url, { ssl, max: 4, prepare: false, onnotice: () => {} });
  const password = process.env.VITRINE_PASSWORD ?? randomBytes(9).toString("base64url");
  try {
    const r = await criarContaVitrine(sql, { password, reset: process.env.RESET === "1" });
    for (const l of r.linhas) console.log(l);
    if (r.status === "criada") console.log(`\nConta vitrine criada: ${r.email} / ${password}  (organização marcada como demonstração)`);
  } finally {
    await sql.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
