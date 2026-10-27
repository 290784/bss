import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession, type SessionUser } from "@/server/auth/session";
import { withSystem, withTenant, type Tx } from "@/server/db";
import { can, type Permission, type Role } from "@/domain/permissions";
import { effectiveAccess, effectivePlan, type Access, type Plan, type PlanId, type SubscriptionState } from "@/domain/plans";
import { DomainError } from "@/server/errors";

export type OrgSummary = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  isDemo: boolean;
  onboardingCompleted: boolean;
};

export type AppContext = {
  user: SessionUser;
  org: OrgSummary;
  role: Role;
  professionalId: string | null;
  subscription: SubscriptionState;
  access: Access;
  plan: Plan;
  memberships: { organizationId: string; name: string; role: Role }[];
};

export async function requireUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/entrar");
  return session;
}

/**
 * Resolve a organização ativa a partir da sessão e confirma a associação no banco.
 * Nunca confia em um id de organização vindo do cliente.
 */
export const getAppContext = cache(async (): Promise<AppContext | null> => {
  const user = await getSession();
  if (!user) return null;
  const memberships = await withSystem(
    (tx) => tx<{ organization_id: string; name: string; role: Role; professional_id: string | null; slug: string; timezone: string; is_demo: boolean; onboarding_completed_at: Date | null }[]>`
      select m.organization_id, o.name, m.role, m.professional_id, o.slug, o.timezone, o.is_demo, o.onboarding_completed_at
      from app.memberships m join app.organizations o on o.id = m.organization_id
      where m.user_id = ${user.userId} and m.status = 'active'
      order by m.created_at`,
  );
  if (memberships.length === 0) return null;
  const current = memberships.find((m) => m.organization_id === user.activeOrganizationId) ?? memberships[0]!;
  const sub = await withSystem(
    (tx) => tx<{ plan: PlanId; status: SubscriptionState["status"]; trial_ends_at: Date | null; grace_until: Date | null }[]>`
      select plan, status, trial_ends_at, grace_until from app.subscriptions where organization_id = ${current.organization_id}`,
  );
  const subscription: SubscriptionState = sub[0]
    ? { plan: sub[0].plan, status: sub[0].status, trialEndsAt: sub[0].trial_ends_at, graceUntil: sub[0].grace_until }
    : { plan: "solo", status: "canceled", trialEndsAt: null, graceUntil: null };
  const now = new Date();
  return {
    user,
    org: {
      id: current.organization_id,
      name: current.name,
      slug: current.slug,
      timezone: current.timezone,
      isDemo: current.is_demo,
      onboardingCompleted: current.onboarding_completed_at !== null,
    },
    role: current.role,
    professionalId: current.professional_id,
    subscription,
    access: effectiveAccess(subscription, now),
    plan: effectivePlan(subscription, now),
    memberships: memberships.map((m) => ({ organizationId: m.organization_id, name: m.name, role: m.role })),
  };
});

/** Para páginas: redireciona para login/onboarding quando necessário. */
export async function requireAppContext(permission?: Permission): Promise<AppContext> {
  const user = await requireUser();
  const ctx = await getAppContext();
  if (!ctx) redirect("/onboarding");
  if (!ctx.org.onboardingCompleted && ctx.role === "owner") redirect("/onboarding");
  if (permission && !can(ctx.role, permission)) redirect("/app/agenda?sem-permissao=1");
  void user;
  return ctx;
}

/** Para server actions: lança DomainError em vez de redirecionar. */
export async function actionContext(permission?: Permission, opts: { write?: boolean } = { write: true }): Promise<AppContext> {
  const ctx = await getAppContext();
  if (!ctx) throw new DomainError("Sua sessão expirou. Entre novamente.", "unauthenticated");
  if (permission && !can(ctx.role, permission)) throw new DomainError("Você não tem permissão para esta ação.", "forbidden");
  if (opts.write !== false && ctx.access === "read_only")
    throw new DomainError("Sua assinatura está inativa. Os dados continuam disponíveis para consulta e exportação.", "read_only");
  return ctx;
}

export function trialDaysLeft(s: SubscriptionState, now = new Date()): number | null {
  return s.status === "trialing" && s.trialEndsAt ? Math.ceil((s.trialEndsAt.getTime() - now.getTime()) / 86_400_000) : null;
}

export function tenant<T>(ctx: AppContext, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return withTenant({ userId: ctx.user.userId, organizationId: ctx.org.id }, fn);
}
