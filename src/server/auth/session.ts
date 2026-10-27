import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { withSystem } from "@/server/db";

export const SESSION_COOKIE = "bos_session";
const SESSION_DAYS = 30;

export type SessionUser = {
  sessionId: string;
  userId: string;
  email: string;
  fullName: string;
  activeOrganizationId: string | null;
};

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string, activeOrganizationId: string | null = null) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const ua = (await headers()).get("user-agent")?.slice(0, 200) ?? null;
  await withSystem(async (tx) => {
    await tx`insert into app.sessions (user_id, token_hash, expires_at, user_agent, active_organization_id)
             values (${userId}, ${hashToken(token)}, ${expires}, ${ua}, ${activeOrganizationId})`;
    await tx`update app.users set last_login_at = now() where id = ${userId}`;
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export const getSession = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const rows = await withSystem(
    (tx) => tx<{ id: string; user_id: string; email: string; full_name: string; active_organization_id: string | null; last_seen_at: Date }[]>`
      select s.id, s.user_id, u.email, u.full_name, s.active_organization_id, s.last_seen_at
      from app.sessions s join app.users u on u.id = s.user_id
      where s.token_hash = ${hashToken(token)} and s.expires_at > now()`,
  );
  const row = rows[0];
  if (!row) return null;
  if (Date.now() - row.last_seen_at.getTime() > 3_600_000) {
    await withSystem((tx) => tx`update app.sessions set last_seen_at = now() where id = ${row.id}`);
  }
  return {
    sessionId: row.id,
    userId: row.user_id,
    email: row.email,
    fullName: row.full_name,
    activeOrganizationId: row.active_organization_id,
  };
});

export async function setActiveOrganization(sessionId: string, organizationId: string) {
  await withSystem((tx) => tx`update app.sessions set active_organization_id = ${organizationId} where id = ${sessionId}`);
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await withSystem((tx) => tx`delete from app.sessions where token_hash = ${hashToken(token)}`);
  jar.delete(SESSION_COOKIE);
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
