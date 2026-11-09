import { createHash, randomBytes } from "node:crypto";
import type { Tx } from "@/server/db";
import { hashPassword } from "@/server/auth/password";

export type TokenKind = "verify" | "reset";
const TTL_MS: Record<TokenKind, number> = { reset: 60 * 60_000, verify: 7 * 86_400_000 };
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Gera um token novo (o valor puro só existe aqui e no e-mail). Os anteriores ainda não usados do mesmo tipo deixam de valer. */
export async function issueToken(tx: Tx, userId: string, kind: TokenKind, now = new Date()): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await tx`update app.email_tokens set used_at = ${now} where user_id = ${userId} and kind = ${kind} and used_at is null`;
  await tx`insert into app.email_tokens (user_id, kind, token_hash, expires_at) values (${userId}, ${kind}, ${hash(token)}, ${new Date(now.getTime() + TTL_MS[kind])})`;
  return token;
}

/** Consome o token (uso único, dentro da validade): devolve a conta dele ou null. Atômico: dois cliques não passam os dois. */
export async function consumeToken(tx: Tx, token: string, kind: TokenKind, now = new Date()): Promise<string | null> {
  if (!token || token.length > 100) return null;
  const [row] = await tx<{ user_id: string }[]>`
    update app.email_tokens set used_at = ${now}
    where token_hash = ${hash(token)} and kind = ${kind} and used_at is null and expires_at > ${now}
    returning user_id`;
  return row?.user_id ?? null;
}

/** Só confere (sem gastar) se o token de redefinição ainda vale: para mostrar o formulário ou o aviso de link vencido. */
export async function tokenIsValid(tx: Tx, token: string, kind: TokenKind, now = new Date()): Promise<boolean> {
  if (!token || token.length > 100) return false;
  const [row] = await tx<{ id: string }[]>`select id from app.email_tokens where token_hash = ${hash(token)} and kind = ${kind} and used_at is null and expires_at > ${now}`;
  return !!row;
}

/** Troca a senha com o token de redefinição e derruba todas as sessões abertas dessa conta (quem tinha a senha antiga é desconectada). */
export async function resetPasswordWithToken(tx: Tx, token: string, newPassword: string, now = new Date()): Promise<boolean> {
  const userId = await consumeToken(tx, token, "reset", now);
  if (!userId) return false;
  await tx`update app.users set password_hash = ${await hashPassword(newPassword)}, email_verified_at = coalesce(email_verified_at, ${now}) where id = ${userId}`;
  await tx`delete from app.sessions where user_id = ${userId}`;
  return true;
}

export async function verifyEmailWithToken(tx: Tx, token: string, now = new Date()): Promise<boolean> {
  const userId = await consumeToken(tx, token, "verify", now);
  if (!userId) return false;
  await tx`update app.users set email_verified_at = coalesce(email_verified_at, ${now}) where id = ${userId}`;
  return true;
}
