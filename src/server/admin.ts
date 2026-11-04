import "server-only";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/context";

/** Quem administra a plataforma: e-mails separados por vírgula em PLATFORM_ADMIN_EMAILS. Sem a variável, ninguém. */
export function isPlatformAdmin(email: string, env: Record<string, string | undefined> = process.env) {
  const list = (env.PLATFORM_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

/** Áreas da equipe da Gê. Para qualquer outra pessoa a página simplesmente não existe (404). */
export async function requirePlatformAdmin() {
  const user = await requireUser();
  if (!isPlatformAdmin(user.email)) notFound();
  return user;
}
