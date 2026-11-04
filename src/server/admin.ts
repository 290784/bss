import "server-only";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/context";

type Env = Record<string, string | undefined>;
const list = (v: string | undefined) => (v ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

/**
 * Quem administra a plataforma. O jeito seguro é PLATFORM_ADMIN_USER_IDS (códigos de conta, separados por vírgula):
 * o código é gerado pelo sistema e ninguém consegue "se cadastrar" com ele. O cadastro ainda não confirma o e-mail,
 * então a lista por e-mail (PLATFORM_ADMIN_EMAILS) só vale enquanto PLATFORM_ADMIN_USER_IDS não existe, e só para um
 * e-mail que já tem conta. Sem nenhuma das duas variáveis, ninguém é administrador.
 */
export function isPlatformAdmin(user: { email: string; userId: string }, env: Env = process.env) {
  const ids = list(env.PLATFORM_ADMIN_USER_IDS);
  if (ids.length > 0) return ids.includes(user.userId.toLowerCase());
  return list(env.PLATFORM_ADMIN_EMAILS).includes(user.email.trim().toLowerCase());
}

/** Áreas da equipe da Gê. Para qualquer outra pessoa a página simplesmente não existe (404). */
export async function requirePlatformAdmin() {
  const user = await requireUser();
  if (!isPlatformAdmin(user)) notFound();
  return user;
}
