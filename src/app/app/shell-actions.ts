"use server";
import { getAppContext, tenant } from "@/server/context";
import { getSession, setActiveOrganization } from "@/server/auth/session";
import { markAllRead } from "@/server/modules/notifications";

export async function markNotificationsRead() {
  const ctx = await getAppContext();
  if (!ctx) return;
  await tenant(ctx, (tx) => markAllRead(tx, ctx.org.id, ctx.user.userId));
}

export async function switchOrganization(organizationId: string) {
  const session = await getSession();
  const ctx = await getAppContext();
  if (!session || !ctx) return;
  // Só troca para organizações das quais a usuária é membro ativo.
  if (!ctx.memberships.some((m) => m.organizationId === organizationId)) return;
  await setActiveOrganization(session.sessionId, organizationId);
}
