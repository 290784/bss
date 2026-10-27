import { z } from "zod";
import type { Tx } from "@/server/db";
import { DomainError } from "@/server/errors";
import { normalizePhone } from "@/lib/text";
import { isDateKey, localTime } from "@/lib/time";
import { createAppointment } from "@/server/modules/appointments";
import { loadPolicy, loadServices, slotsForProfessional, totals } from "@/server/modules/scheduling";
import { notifyStaff } from "@/server/modules/notifications";
import { trackEvent } from "@/server/modules/audit";

/**
 * Página pública de agendamento. Executa em contexto de sistema, mas expõe somente
 * dados públicos (nome, serviços online, primeiro nome das profissionais) e sempre
 * filtra pela organização resolvida a partir do slug.
 */

export type PublicBusiness = {
  id: string; name: string; slug: string; timezone: string; phone: string | null; instagram: string | null; address: string | null;
  bookingPolicyText: string | null; requiresApproval: boolean; cancellationNoticeHours: number; maxAdvanceDays: number;
  services: { id: string; name: string; description: string | null; price_cents: number; duration_minutes: number; category: string | null; professional_ids: string[] }[];
  professionals: { id: string; display_name: string; specialty: string | null }[];
};

export async function getPublicBusiness(tx: Tx, slug: string): Promise<PublicBusiness | null> {
  const [o] = await tx<{
    id: string; name: string; slug: string; timezone: string; phone: string | null; instagram: string | null; address: string | null;
    booking_policy_text: string | null; online_requires_approval: boolean; cancellation_notice_hours: number; max_advance_days: number;
  }[]>`select id, name, slug, timezone, phone, instagram, address, booking_policy_text, online_requires_approval,
         cancellation_notice_hours, max_advance_days
       from app.organizations
       where slug = ${slug} and online_booking_enabled and onboarding_completed_at is not null`;
  if (!o) return null;
  const professionals = await tx<{ id: string; display_name: string; specialty: string | null }[]>`
    select id, display_name, specialty from app.professionals
    where organization_id = ${o.id} and is_active and accepts_online order by created_at`;
  const profIds = professionals.map((p) => p.id);
  const services = profIds.length
    ? await tx<PublicBusiness["services"]>`
        select s.id, s.name, s.description, s.price_cents, s.duration_minutes, c.name as category,
          array_agg(ps.professional_id) as professional_ids
        from app.services s
        join app.professional_services ps on ps.service_id = s.id and ps.professional_id in ${tx(profIds)}
        left join app.service_categories c on c.id = s.category_id
        where s.organization_id = ${o.id} and s.is_active and s.online_bookable
        group by s.id, c.name, c.position
        order by c.position nulls last, c.name nulls last, s.name`
    : [];
  return {
    id: o.id, name: o.name, slug: o.slug, timezone: o.timezone, phone: o.phone, instagram: o.instagram, address: o.address,
    bookingPolicyText: o.booking_policy_text, requiresApproval: o.online_requires_approval,
    cancellationNoticeHours: o.cancellation_notice_hours, maxAdvanceDays: o.max_advance_days,
    services, professionals,
  };
}

export type PublicSlot = { time: string; professionalIds: string[] };

export async function publicSlots(tx: Tx, biz: PublicBusiness, serviceId: string, professionalId: string | null, date: string, now = new Date()): Promise<PublicSlot[]> {
  if (!isDateKey(date)) return [];
  const service = biz.services.find((s) => s.id === serviceId);
  if (!service) return [];
  const candidates = service.professional_ids.filter((id) => !professionalId || id === professionalId);
  const policy = await loadPolicy(tx, biz.id);
  const [svc] = await loadServices(tx, biz.id, [serviceId], { onlineOnly: true });
  const t = totals([svc!]);
  const byTime = new Map<string, string[]>();
  for (const pid of candidates) {
    const slots = await slotsForProfessional(tx, biz.id, pid, date, policy, t.minutes, t.bufferAfter, now);
    for (const s of slots) {
      const key = localTime(s, policy.timezone);
      byTime.set(key, [...(byTime.get(key) ?? []), pid]);
    }
  }
  return [...byTime.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([time, professionalIds]) => ({ time, professionalIds }));
}

export const onlineBookingSchema = z.object({
  serviceId: z.uuid(),
  professionalId: z.uuid().nullable(),
  date: z.string().refine(isDateKey),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  fullName: z.string().trim().min(2, "Informe seu nome.").max(120),
  phone: z.string().trim().refine((v) => normalizePhone(v) !== null, "Informe um WhatsApp válido com DDD."),
  email: z.union([z.literal(""), z.email("E-mail inválido.")]).optional(),
  notes: z.string().trim().max(500).optional(),
  acceptPolicy: z.literal(true, { error: "É preciso aceitar a política de agendamento." }),
  marketingConsent: z.boolean().default(false),
});

export async function bookOnline(tx: Tx, biz: PublicBusiness, input: z.infer<typeof onlineBookingSchema>, now = new Date()) {
  const service = biz.services.find((s) => s.id === input.serviceId);
  if (!service) throw new DomainError("Serviço indisponível para agendamento online.");
  if (input.professionalId && !service.professional_ids.includes(input.professionalId))
    throw new DomainError("Profissional indisponível para este serviço.");

  // Revalida no servidor: o horário precisa estar disponível agora, não quando a página carregou.
  const slots = await publicSlots(tx, biz, input.serviceId, input.professionalId, input.date, now);
  const slot = slots.find((s) => s.time === input.time);
  if (!slot) throw new DomainError("Este horário não está mais disponível. Escolha outro.", "conflict");

  const phone = normalizePhone(input.phone)!;
  const email = input.email || null;
  const [existing] = await tx<{ id: string; email: string | null }[]>`
    select id, email from app.clients where organization_id = ${biz.id} and phone_normalized = ${phone} and archived_at is null
    order by created_at limit 1`;
  let clientId: string;
  if (existing) {
    clientId = existing.id;
    if (!existing.email && email) await tx`update app.clients set email = ${email} where id = ${clientId}`;
    if (input.marketingConsent)
      await tx`update app.clients set marketing_consent = true, marketing_consent_at = coalesce(marketing_consent_at, now()) where id = ${clientId}`;
  } else {
    const [c] = await tx<{ id: string }[]>`
      insert into app.clients (organization_id, full_name, phone, phone_normalized, email, marketing_consent, marketing_consent_at, source)
      values (${biz.id}, ${input.fullName}, ${input.phone}, ${phone}, ${email}, ${input.marketingConsent},
              ${input.marketingConsent ? now : null}, 'online')
      returning id`;
    clientId = c!.id;
  }

  const actor = { userId: null, organizationId: biz.id };
  const status = biz.requiresApproval ? "pending" : "confirmed";
  let lastError: unknown;
  // "Sem preferência": tenta cada profissional livre naquele horário.
  for (const pid of slot.professionalIds) {
    try {
      const appt = await tx.savepoint((sp) =>
        createAppointment(sp as unknown as Tx, actor, {
          professionalId: pid, clientId, date: input.date, time: input.time, serviceIds: [input.serviceId],
          squeezeIn: false, status,
        }, { source: "online", clientNotes: input.notes, now }),
      );
      const prof = biz.professionals.find((p) => p.id === pid);
      await notifyStaff(tx, biz.id, {
        type: "online_booking",
        title: status === "pending" ? "Nova solicitação de agendamento" : "Novo agendamento online",
        body: `${input.fullName.split(" ")[0]} · ${service.name} · ${input.date.split("-").reverse().join("/")} às ${input.time}${prof ? ` com ${prof.display_name}` : ""}`,
        link: `/app/agenda?data=${input.date}&agendamento=${appt.id}`,
        professionalId: pid,
      });
      await trackEvent(tx, "booking.online_created", biz.id, null, { status });
      return { appointmentId: appt.id, status, professionalName: prof?.display_name ?? null };
    } catch (err) {
      lastError = err;
      if (!(err instanceof DomainError)) throw err;
    }
  }
  throw lastError ?? new DomainError("Este horário não está mais disponível.");
}
