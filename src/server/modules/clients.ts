import { z } from "zod";
import type { Tx } from "@/server/db";
import { DomainError } from "@/server/errors";
import { normalizePhone } from "@/lib/text";
import { isDateKey } from "@/lib/time";
import type { Actor } from "@/server/modules/appointments";
import { audit } from "@/server/modules/audit";

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((v) => (v ? v : null));

export const clientSchema = z.object({
  fullName: z.string().trim().min(2, "Informe o nome completo.").max(120),
  phone: optionalText(30).refine((v) => v === null || normalizePhone(v) !== null, "Telefone inválido. Use DDD + número."),
  email: optionalText(160).refine((v) => v === null || z.email().safeParse(v).success, "E-mail inválido."),
  birthDate: optionalText(10).refine((v) => v === null || isDateKey(v), "Data inválida."),
  contactPreference: z.enum(["whatsapp", "email", "phone", "none"]).default("whatsapp"),
  marketingConsent: z.boolean().default(false),
  preferences: optionalText(1000),
  internalNotes: optionalText(2000),
});
export type ClientInput = z.infer<typeof clientSchema>;

export type ClientDuplicate = { id: string; full_name: string; reason: string };

/** Possíveis duplicados: mesmo telefone, mesmo e-mail ou mesmo nome (sem acentos/caixa). */
export async function findPossibleDuplicates(tx: Tx, orgId: string, input: { fullName: string; phone: string | null; email: string | null }, excludeId?: string) {
  const phone = normalizePhone(input.phone);
  return tx<ClientDuplicate[]>`
    select id, full_name,
      case when ${phone}::text is not null and phone_normalized = ${phone} then 'mesmo telefone'
           when ${input.email}::text is not null and lower(email) = lower(${input.email}) then 'mesmo e-mail'
           else 'mesmo nome' end as reason
    from app.clients
    where organization_id = ${orgId} and archived_at is null
      and (${excludeId ?? null}::uuid is null or id <> ${excludeId ?? null}::uuid)
      and ((${phone}::text is not null and phone_normalized = ${phone})
        or (${input.email}::text is not null and lower(email) = lower(${input.email}))
        or lower(full_name) = lower(${input.fullName}))
    limit 5`;
}

export async function createClient(tx: Tx, actor: Actor, input: ClientInput, source: "staff" | "online" | "import" = "staff") {
  const [c] = await tx<{ id: string }[]>`
    insert into app.clients (organization_id, full_name, phone, phone_normalized, email, birth_date, contact_preference,
      marketing_consent, marketing_consent_at, preferences, internal_notes, source)
    values (${actor.organizationId}, ${input.fullName}, ${input.phone}, ${normalizePhone(input.phone)}, ${input.email},
      ${input.birthDate}, ${input.contactPreference}, ${input.marketingConsent}, ${input.marketingConsent ? new Date() : null},
      ${input.preferences}, ${input.internalNotes}, ${source})
    returning id`;
  return c!;
}

export async function updateClient(tx: Tx, actor: Actor, id: string, input: ClientInput, opts: { canEditInternalNotes: boolean }) {
  const [prev] = await tx<{ marketing_consent: boolean; internal_notes: string | null }[]>`
    select marketing_consent, internal_notes from app.clients where organization_id = ${actor.organizationId} and id = ${id} for update`;
  if (!prev) throw new DomainError("Cliente não encontrada.");
  const notes = opts.canEditInternalNotes ? input.internalNotes : prev.internal_notes;
  await tx`
    update app.clients set full_name = ${input.fullName}, phone = ${input.phone}, phone_normalized = ${normalizePhone(input.phone)},
      email = ${input.email}, birth_date = ${input.birthDate}, contact_preference = ${input.contactPreference},
      marketing_consent = ${input.marketingConsent},
      marketing_consent_at = case when ${input.marketingConsent} and not marketing_consent then now()
                                  when not ${input.marketingConsent} then null else marketing_consent_at end,
      preferences = ${input.preferences}, internal_notes = ${notes}
    where id = ${id}`;
  if (prev.marketing_consent !== input.marketingConsent)
    await audit(tx, actor, input.marketingConsent ? "client.consent_given" : "client.consent_revoked", "client", id);
}

export async function archiveClient(tx: Tx, actor: Actor, id: string, archived: boolean) {
  await tx`update app.clients set archived_at = ${archived ? new Date() : null} where organization_id = ${actor.organizationId} and id = ${id}`;
  await audit(tx, actor, archived ? "client.archived" : "client.restored", "client", id);
}

export const SEGMENTS = {
  all: "Todas",
  new: "Novas (30 dias)",
  recurring: "Recorrentes",
  inactive: "Inativas (+60 dias)",
  high_value: "Alto valor",
  archived: "Arquivadas",
} as const;
export type Segment = keyof typeof SEGMENTS;

export type ClientRow = {
  id: string; full_name: string; phone_normalized: string | null; email: string | null;
  visits: number; last_visit: Date | null; next_visit: Date | null; total_spent_cents: number; created_at: Date;
};

/**
 * Lista com métricas calculadas a partir dos dados reais:
 * - visits / last_visit: atendimentos concluídos;
 * - total_spent: pagamentos menos estornos (não valores agendados).
 */
export async function listClients(tx: Tx, orgId: string, opts: { q?: string; segment?: Segment; limit?: number; offset?: number; includeSpent: boolean }) {
  const q = opts.q?.trim() ?? "";
  const qPhone = q.replace(/\D/g, "");
  const seg = opts.segment ?? "all";
  return tx<ClientRow[]>`
    with stats as (
      select c.id,
        count(a.id) filter (where a.status = 'completed')::int as visits,
        max(a.starts_at) filter (where a.status = 'completed') as last_visit,
        min(a.starts_at) filter (where a.status = 'completed') as first_visit,
        min(a.starts_at) filter (where a.status in ('pending', 'confirmed') and a.starts_at > now()) as next_visit
      from app.clients c left join app.appointments a on a.client_id = c.id
      where c.organization_id = ${orgId}
      group by c.id
    ), spent as (
      select client_id, sum(case when kind = 'payment' then amount_cents else -amount_cents end)::int as total
      from app.payments where organization_id = ${orgId} and ${opts.includeSpent} group by client_id
    ), ranked as (
      select percentile_cont(0.8) within group (order by total) as p80 from spent where total > 0
    )
    select c.id, c.full_name, c.phone_normalized, c.email, s.visits, s.last_visit, s.next_visit,
      coalesce(sp.total, 0) as total_spent_cents, c.created_at
    from app.clients c join stats s on s.id = c.id left join spent sp on sp.client_id = c.id, ranked
    where c.organization_id = ${orgId}
      and (${seg} = 'archived') = (c.archived_at is not null)
      and (${q} = '' or c.full_name ilike ${"%" + q + "%"} or c.email ilike ${"%" + q + "%"}
           or (${qPhone} <> '' and length(${qPhone}) >= 4 and c.phone_normalized like ${"%" + qPhone + "%"}))
      and case ${seg}
        when 'new' then s.first_visit >= now() - interval '30 days' or (s.visits = 0 and c.created_at >= now() - interval '30 days')
        when 'recurring' then s.visits >= 2
        when 'inactive' then s.visits >= 1 and s.last_visit < now() - interval '60 days' and s.next_visit is null
        when 'high_value' then ranked.p80 is not null and coalesce(sp.total, 0) >= ranked.p80 and coalesce(sp.total, 0) > 0
        else true end
    order by c.full_name
    limit ${opts.limit ?? 50} offset ${opts.offset ?? 0}`;
}

export async function getClientProfile(tx: Tx, orgId: string, id: string, opts: { includeFinance: boolean; includeInternal: boolean }) {
  const [client] = await tx<{
    id: string; full_name: string; phone: string | null; phone_normalized: string | null; email: string | null; birth_date: string | null;
    contact_preference: string; marketing_consent: boolean; marketing_consent_at: Date | null; preferences: string | null;
    internal_notes: string | null; source: string; archived_at: Date | null; created_at: Date;
  }[]>`select id, full_name, phone, phone_normalized, email, to_char(birth_date, 'YYYY-MM-DD') as birth_date, contact_preference,
         marketing_consent, marketing_consent_at, preferences, internal_notes, source, archived_at, created_at
       from app.clients where organization_id = ${orgId} and id = ${id}`;
  if (!client) return null;
  if (!opts.includeInternal) client.internal_notes = null;
  const history = await tx<{ id: string; starts_at: Date; status: string; services: string; professional_name: string; price_cents: number; discount_cents: number }[]>`
    select a.id, a.starts_at, a.status, a.price_cents, a.discount_cents, p.display_name as professional_name,
      coalesce((select string_agg(s.service_name, ' + ' order by s.position) from app.appointment_services s where s.appointment_id = a.id), '') as services
    from app.appointments a join app.professionals p on p.id = a.professional_id
    where a.organization_id = ${orgId} and a.client_id = ${id}
    order by a.starts_at desc limit 100`;
  const [spent] = opts.includeFinance
    ? await tx<{ total: number }[]>`
        select coalesce(sum(case when kind = 'payment' then amount_cents else -amount_cents end), 0)::int as total
        from app.payments where organization_id = ${orgId} and client_id = ${id}`
    : [{ total: 0 }];
  const completed = history.filter((h) => h.status === "completed");
  const professionals = new Map<string, number>();
  for (const h of completed) professionals.set(h.professional_name, (professionals.get(h.professional_name) ?? 0) + 1);
  const now = Date.now();
  const lastVisit = completed[0]?.starts_at ?? null;
  const firstVisit = completed.at(-1)?.starts_at ?? null;
  const avgIntervalDays =
    completed.length >= 2 && lastVisit && firstVisit
      ? Math.round((lastVisit.getTime() - firstVisit.getTime()) / 86_400_000 / (completed.length - 1))
      : null;
  return {
    client,
    history,
    stats: {
      visits: completed.length,
      noShows: history.filter((h) => h.status === "no_show").length,
      cancellations: history.filter((h) => h.status === "cancelled").length,
      lastVisit,
      nextVisit: history.filter((h) => (h.status === "confirmed" || h.status === "pending") && h.starts_at.getTime() > now).at(-1)?.starts_at ?? null,
      totalSpentCents: opts.includeFinance ? spent!.total : null,
      averageTicketCents: opts.includeFinance && completed.length > 0 ? Math.round(spent!.total / completed.length) : null,
      avgIntervalDays,
      favoriteProfessional: [...professionals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    },
  };
}
