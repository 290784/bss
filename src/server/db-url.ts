/**
 * Normaliza a URL do PostgreSQL vinda de provedores (Neon, Supabase, Vercel Postgres).
 *
 * O driver `postgres` repassa parâmetros desconhecidos da URL ao servidor como configurações
 * de sessão — e o servidor recusa a conexão (ex.: `unrecognized configuration parameter
 * "channel_binding"`). Por isso removemos parâmetros que são de outros clientes:
 * - `channel_binding` (Neon inclui por padrão; o driver negocia SCRAM sozinho)
 * - `pgbouncer`, `connection_limit`, `pool_timeout`, `schema` (convenções do Prisma)
 * e garantimos SSL fora do ambiente local.
 */
const CLIENT_ONLY_PARAMS = ["channel_binding", "pgbouncer", "connection_limit", "pool_timeout", "schema", "statement_cache_size"];

export function normalizeDatabaseUrl(raw: string): { url: string; ssl: false | "require"; host: string } {
  const trimmed = raw.trim().replace(/^["']|["']$/g, "");
  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    throw new Error("DATABASE_URL inválida: confira se copiou a connection string completa (começa com postgres:// ou postgresql://).");
  }
  if (u.protocol !== "postgres:" && u.protocol !== "postgresql:")
    throw new Error(`DATABASE_URL com protocolo inesperado (${u.protocol}). Use a connection string do PostgreSQL.`);
  for (const p of CLIENT_ONLY_PARAMS) u.searchParams.delete(p);
  const local = ["localhost", "127.0.0.1", "::1"].includes(u.hostname) || u.hostname.endsWith(".local");
  const sslmode = u.searchParams.get("sslmode");
  u.searchParams.delete("sslmode"); // o SSL vai pela opção do driver, de forma explícita
  const ssl = sslmode === "disable" || (local && !sslmode) ? false : "require";
  return { url: u.toString(), ssl, host: u.hostname };
}

/** Primeira URL configurada, na ordem de preferência. */
export function pickDatabaseUrl(names: string[]): { name: string; value: string } | null {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim()) return { name, value };
  }
  return null;
}

/** Traduz erros comuns de conexão/permissão em instruções compreensíveis. */
export function explainDatabaseError(err: unknown): string {
  const e = err as { code?: string; message?: string };
  const msg = e?.message ?? String(err);
  switch (e?.code) {
    case "28P01": return "Usuário ou senha do banco incorretos. Copie de novo a connection string no painel do provedor.";
    case "3D000": return "O banco de dados indicado na URL não existe. Confira o nome do banco no final da connection string.";
    case "42704": return `Parâmetro não suportado na URL do banco (${msg}). Remova-o da DATABASE_URL.`;
    case "42501": return `Permissão insuficiente no banco (${msg}). Use o usuário dono do banco (Neon: o "owner"; Supabase: "postgres").`;
    case "ENOTFOUND": return "Endereço do banco não encontrado. Confira o host na DATABASE_URL.";
    case "ECONNREFUSED": return "O banco recusou a conexão. Confira host e porta, e se o banco está ativo.";
    case "ETIMEDOUT": case "CONNECT_TIMEOUT": return "Tempo esgotado ao conectar no banco. Confira se o banco está ativo e acessível pela internet.";
    case "42P01": return "Tabelas não encontradas: as migrações ainda não foram aplicadas. Rode `npm run db:migrate` (no deploy isso é automático).";
    default: return msg;
  }
}
