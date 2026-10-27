import "server-only";
import { withSystem } from "@/server/db";

/**
 * Limite por janela fixa, persistido no banco (funciona com várias instâncias serverless).
 * Retorna true se a requisição pode seguir.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const rows = await withSystem(
    (tx) => tx<{ hits: number }[]>`
      insert into app.rate_limits (key, window_start, hits) values (${key}, now(), 1)
      on conflict (key) do update set
        hits = case when app.rate_limits.window_start < now() - make_interval(secs => ${windowSeconds}) then 1 else app.rate_limits.hits + 1 end,
        window_start = case when app.rate_limits.window_start < now() - make_interval(secs => ${windowSeconds}) then now() else app.rate_limits.window_start end
      returning hits`,
  );
  return (rows[0]?.hits ?? 0) <= limit;
}
