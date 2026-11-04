import type { Tx } from "@/server/db";
import { GREETINGS, pickGreetingIndex } from "@/domain/greetings";
import { localDateKey } from "@/lib/time";

export type DailyGreeting = { text: string; index: number; date: string };

/**
 * Saudação do dia da usuária na empresa ativa. A primeira chamada do dia sorteia (diferente da última que ela viu)
 * e grava; as seguintes, inclusive depois de sair e entrar de novo, devolvem a mesma. O "dia" é o do fuso da empresa.
 * Precisa rodar em `tenant()`: a regra de acesso do banco garante que cada usuária só lê e grava a própria.
 */
export async function dailyGreeting(
  tx: Tx,
  who: { organizationId: string; userId: string; timeZone: string },
  opts: { now?: Date; random?: () => number } = {},
): Promise<DailyGreeting> {
  const date = localDateKey(opts.now ?? new Date(), who.timeZone);
  const existing = await readToday(tx, who, date);
  if (existing !== null) return result(existing, date);

  // Evita repetir a última saudação que ela viu (a do dia anterior, quando abriu o painel naquele dia).
  const [prev] = await tx<{ greeting_index: number }[]>`
    select greeting_index from app.user_greetings
    where organization_id = ${who.organizationId} and user_id = ${who.userId} and local_date < ${date}::date
    order by local_date desc limit 1`;
  const chosen = pickGreetingIndex(prev?.greeting_index ?? null, opts.random);

  // Duas abas abrindo ao mesmo tempo: quem perde a corrida lê a saudação que ganhou.
  const [inserted] = await tx<{ greeting_index: number }[]>`
    insert into app.user_greetings (organization_id, user_id, local_date, greeting_index)
    values (${who.organizationId}, ${who.userId}, ${date}::date, ${chosen})
    on conflict (organization_id, user_id, local_date) do nothing
    returning greeting_index`;
  return result(inserted?.greeting_index ?? (await readToday(tx, who, date)) ?? chosen, date);
}

async function readToday(tx: Tx, who: { organizationId: string; userId: string }, date: string) {
  const [row] = await tx<{ greeting_index: number }[]>`
    select greeting_index from app.user_greetings
    where organization_id = ${who.organizationId} and user_id = ${who.userId} and local_date = ${date}::date`;
  return row?.greeting_index ?? null;
}

const result = (index: number, date: string): DailyGreeting => ({ text: GREETINGS[index]!, index, date });
