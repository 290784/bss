import type { Tx } from "@/server/db";
import { DomainError } from "@/server/errors";
import { formatDateBR, localDateKey, localTime } from "@/lib/time";
import { notifyStaff } from "@/server/modules/notifications";
import { suggestRelatedServices, upsellLine } from "@/server/modules/upsell";
import { trackEvent } from "@/server/modules/audit";

/**
 * Comprovante público do agendamento (contexto de sistema). O acesso é pelo par slug + token
 * aleatório do agendamento; expõe só o que a própria cliente precisa ver.
 */

export const TOKEN_RE = /^[a-f0-9]{64}$/;

export function receiptPath(slug: string, token: string) {
  return `/b/${slug}/agendamento/${token}`;
}
export function receiptUrl(slug: string, token: string) {
  return `${(process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}${receiptPath(slug, token)}`;
}

export type Receipt = {
  id: string; orgId: string; token: string; status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
  startsAt: Date; endsAt: Date; clientFirstName: string; clientConfirmedAt: Date | null;
  professionalName: string; priceCents: number; discountCents: number; clientNotes: string | null;
  services: { name: string; minutes: number; priceCents: number }[];
  business: { name: string; slug: string; timezone: string; phone: string | null; address: string | null; instagram: string | null;
    cancellationNoticeHours: number; policyText: string | null };
};

export async function getReceipt(tx: Tx, slug: string, token: string): Promise<Receipt | null> {
  if (!TOKEN_RE.test(token)) return null;
  const [r] = await tx<{
    id: string; organization_id: string; public_token: string; status: Receipt["status"]; starts_at: Date; ends_at: Date;
    client_name: string; client_confirmed_at: Date | null; professional_name: string; price_cents: number; discount_cents: number;
    client_notes: string | null; org_name: string; slug: string; timezone: string; phone: string | null; address: string | null;
    instagram: string | null; cancellation_notice_hours: number; booking_policy_text: string | null;
  }[]>`
    select a.id, a.organization_id, a.public_token, a.status, a.starts_at, a.ends_at, c.full_name as client_name,
      a.client_confirmed_at, p.display_name as professional_name, a.price_cents, a.discount_cents, a.client_notes,
      o.name as org_name, o.slug, o.timezone, o.phone, o.address, o.instagram, o.cancellation_notice_hours, o.booking_policy_text
    from app.appointments a
    join app.organizations o on o.id = a.organization_id
    join app.clients c on c.id = a.client_id
    join app.professionals p on p.id = a.professional_id
    where a.public_token = ${token} and o.slug = ${slug}`;
  if (!r) return null;
  const services = await tx<{ name: string; minutes: number; priceCents: number }[]>`
    select service_name as name, duration_minutes as minutes, price_cents as "priceCents"
    from app.appointment_services where organization_id = ${r.organization_id} and appointment_id = ${r.id} order by position`;
  return {
    id: r.id, orgId: r.organization_id, token: r.public_token, status: r.status, startsAt: r.starts_at, endsAt: r.ends_at,
    clientFirstName: r.client_name.split(" ")[0] ?? r.client_name, clientConfirmedAt: r.client_confirmed_at,
    professionalName: r.professional_name, priceCents: r.price_cents, discountCents: r.discount_cents, clientNotes: r.client_notes,
    services,
    business: { name: r.org_name, slug: r.slug, timezone: r.timezone, phone: r.phone, address: r.address, instagram: r.instagram,
      cancellationNoticeHours: r.cancellation_notice_hours, policyText: r.booking_policy_text },
  };
}

/** A cliente confirma presença pelo comprovante: registra, avisa a equipe e sugere serviços para oferecer. */
export async function confirmAttendance(tx: Tx, slug: string, token: string, now = new Date()) {
  const r = await getReceipt(tx, slug, token);
  if (!r) throw new DomainError("Agendamento não encontrado.");
  if (r.status !== "confirmed") throw new DomainError(r.status === "pending"
    ? "Seu horário ainda aguarda a confirmação do estabelecimento."
    : "Este agendamento não pode mais ser confirmado.");
  if (r.startsAt <= now) throw new DomainError("Este horário já passou.");
  const [updated] = await tx<{ id: string; professional_id: string }[]>`
    update app.appointments set client_confirmed_at = ${now}, updated_at = now()
    where id = ${r.id} and client_confirmed_at is null
    returning id, professional_id`;
  if (!updated) return r; // já confirmado antes: nada a repetir
  await tx`insert into app.appointment_events (organization_id, appointment_id, actor_user_id, type, data)
           values (${r.orgId}, ${r.id}, null, 'client_confirmed', ${tx.json({ at: now.toISOString() })})`;
  const tz = r.business.timezone;
  const suggestions = await suggestRelatedServices(tx, r.orgId, r.id);
  await notifyStaff(tx, r.orgId, {
    type: "client_confirmed",
    title: `${r.clientFirstName} confirmou presença`,
    body: `${r.services.map((s) => s.name).join(" + ")} · ${formatDateBR(localDateKey(r.startsAt, tz))} às ${localTime(r.startsAt, tz)}` +
      ` com ${r.professionalName}.${upsellLine(suggestions)}`,
    link: `/app/agenda?data=${localDateKey(r.startsAt, tz)}&agendamento=${r.id}`,
    professionalId: updated.professional_id,
  });
  await trackEvent(tx, "booking.client_confirmed", r.orgId, null, {});
  return { ...r, clientConfirmedAt: now };
}

/** Arquivo .ics para a cliente salvar o horário na agenda do celular. */
export function receiptIcs(r: Receipt, url: string) {
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (m) => `\\${m}`);
  const services = r.services.map((s) => s.name).join(" + ");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ge//Agendamento//PT-BR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${r.id}@ge`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(r.startsAt)}`,
    `DTEND:${stamp(r.endsAt)}`,
    `SUMMARY:${esc(`${services} · ${r.business.name}`)}`,
    `DESCRIPTION:${esc(`Com ${r.professionalName}. Comprovante: ${url}`)}`,
    ...(r.business.address ? [`LOCATION:${esc(r.business.address)}`] : []),
    `URL:${url}`,
    "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Lembrete do seu horário", "TRIGGER:-PT2H", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR", "",
  ].join("\r\n");
}
