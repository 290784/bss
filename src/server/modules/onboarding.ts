import { z } from "zod";
import type { Tx } from "@/server/db";
import { slugify } from "@/lib/text";
import { BUSINESS_TYPES } from "@/server/modules/catalog";
import { TRIAL_DAYS } from "@/domain/plans";
import { audit, trackEvent } from "@/server/modules/audit";

export const RESERVED_SLUGS = new Set(["app", "api", "admin", "entrar", "cadastro", "onboarding", "b", "privacidade", "termos", "suporte", "precos"]);

export const businessSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do negócio.").max(120),
  businessType: z.enum(BUSINESS_TYPES.map((b) => b.id) as [string, ...string[]]),
  phone: z.string().trim().max(30).optional(),
  attends: z.boolean().default(true), // a proprietária também atende?
  ownerDisplayName: z.string().trim().min(2).max(80),
  timezone: z.string().default("America/Sao_Paulo"),
});

async function uniqueSlug(tx: Tx, base: string) {
  let root = slugify(base);
  if (root.length < 3 || RESERVED_SLUGS.has(root)) root = `${root || "agenda"}-beauty`.slice(0, 40);
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root.slice(0, 44)}-${i + 1}`;
    const [r] = await tx`select 1 from app.organizations where slug = ${candidate}`;
    if (!r) return candidate;
  }
  return `${root.slice(0, 36)}-${Date.now().toString(36)}`;
}

/** Executa em contexto de sistema: a usuária ainda não é membro de nenhuma organização. */
export async function createOrganizationForUser(tx: Tx, userId: string, input: z.infer<typeof businessSchema>, opts: { isDemo?: boolean } = {}) {
  const slug = await uniqueSlug(tx, input.name);
  const [org] = await tx<{ id: string; slug: string }[]>`
    insert into app.organizations (name, slug, business_type, timezone, phone, created_by, is_demo)
    values (${input.name}, ${slug}, ${input.businessType}, ${input.timezone}, ${input.phone ?? null}, ${userId}, ${opts.isDemo ?? false})
    returning id, slug`;
  const [unit] = await tx<{ id: string }[]>`
    insert into app.units (organization_id, name, timezone) values (${org!.id}, 'Unidade principal', ${input.timezone}) returning id`;
  let professionalId: string | null = null;
  if (input.attends) {
    const [p] = await tx<{ id: string }[]>`
      insert into app.professionals (organization_id, unit_id, user_id, display_name)
      values (${org!.id}, ${unit!.id}, ${userId}, ${input.ownerDisplayName}) returning id`;
    professionalId = p!.id;
    for (const weekday of [1, 2, 3, 4, 5, 6])
      await tx`insert into app.working_hours (organization_id, professional_id, weekday, start_time, end_time)
               values (${org!.id}, ${professionalId}, ${weekday}, '09:00', '18:00')`;
  }
  await tx`insert into app.memberships (organization_id, user_id, role, professional_id)
           values (${org!.id}, ${userId}, 'owner', ${professionalId})`;
  await tx`insert into app.subscriptions (organization_id, plan, status, trial_ends_at)
           values (${org!.id}, 'solo', 'trialing', now() + make_interval(days => ${TRIAL_DAYS}))`;
  await audit(tx, { userId, organizationId: org!.id }, "organization.created", "organization", org!.id);
  await trackEvent(tx, "onboarding.business_created", org!.id, userId, { businessType: input.businessType, attends: input.attends });
  return { organizationId: org!.id, slug: org!.slug, professionalId };
}
