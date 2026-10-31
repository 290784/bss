import { z } from "zod";
import type { Tx } from "@/server/db";
import { DomainError } from "@/server/errors";
import { parseMoneyToCents } from "@/lib/money";
import type { Actor } from "@/server/modules/appointments";

export const serviceSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do serviço.").max(100),
  categoryName: z.string().trim().max(60).optional(),
  description: z.string().trim().max(1000).optional(),
  price: z.string().transform((v, ctx) => {
    const cents = parseMoneyToCents(v);
    if (cents === null) {
      ctx.addIssue({ code: "custom", message: "Preço inválido. Ex.: 80,00" });
      return z.NEVER;
    }
    return cents;
  }),
  durationMinutes: z.coerce.number().int().min(5, "Duração mínima de 5 minutos.").max(720),
  bufferAfterMinutes: z.coerce.number().int().min(0).max(120).default(0),
  returnIntervalDays: z.coerce.number().int().min(1).max(730).optional(),
  onlineBookable: z.boolean().default(true),
  professionalIds: z.array(z.uuid()).default([]),
});
export type ServiceInput = z.infer<typeof serviceSchema>;

async function ensureCategory(tx: Tx, orgId: string, name?: string) {
  if (!name) return null;
  const [c] = await tx<{ id: string }[]>`
    insert into app.service_categories (organization_id, name) values (${orgId}, ${name})
    on conflict (organization_id, name) do update set name = excluded.name returning id`;
  return c!.id;
}

export async function saveService(tx: Tx, actor: Actor, input: ServiceInput, id?: string) {
  const orgId = actor.organizationId;
  const categoryId = await ensureCategory(tx, orgId, input.categoryName);
  let serviceId = id;
  if (id) {
    const r = await tx`
      update app.services set name = ${input.name}, category_id = ${categoryId}, description = ${input.description ?? null},
        price_cents = ${input.price}, duration_minutes = ${input.durationMinutes}, buffer_after_minutes = ${input.bufferAfterMinutes},
        return_interval_days = ${input.returnIntervalDays ?? null}, online_bookable = ${input.onlineBookable}
      where organization_id = ${orgId} and id = ${id}`;
    if (r.count === 0) throw new DomainError("Não achei esse serviço.");
  } else {
    const [s] = await tx<{ id: string }[]>`
      insert into app.services (organization_id, category_id, name, description, price_cents, duration_minutes,
        buffer_after_minutes, return_interval_days, online_bookable)
      values (${orgId}, ${categoryId}, ${input.name}, ${input.description ?? null}, ${input.price}, ${input.durationMinutes},
        ${input.bufferAfterMinutes}, ${input.returnIntervalDays ?? null}, ${input.onlineBookable})
      returning id`;
    serviceId = s!.id;
  }
  await tx`delete from app.professional_services where organization_id = ${orgId} and service_id = ${serviceId!}`;
  for (const pid of input.professionalIds) {
    await tx`insert into app.professional_services (organization_id, professional_id, service_id) values (${orgId}, ${pid}, ${serviceId!})`;
  }
  return serviceId!;
}

export async function setServiceActive(tx: Tx, actor: Actor, id: string, active: boolean) {
  await tx`update app.services set is_active = ${active} where organization_id = ${actor.organizationId} and id = ${id}`;
}

export type ServiceRow = {
  id: string; name: string; category: string | null; description: string | null; price_cents: number; duration_minutes: number;
  buffer_after_minutes: number; return_interval_days: number | null; online_bookable: boolean; is_active: boolean; professional_ids: string[];
};

export async function listServices(tx: Tx, orgId: string, opts: { activeOnly?: boolean } = {}) {
  return tx<ServiceRow[]>`
    select s.id, s.name, c.name as category, s.description, s.price_cents, s.duration_minutes, s.buffer_after_minutes,
      s.return_interval_days, s.online_bookable, s.is_active,
      coalesce(array_agg(ps.professional_id) filter (where ps.professional_id is not null), '{}') as professional_ids
    from app.services s
    left join app.service_categories c on c.id = s.category_id
    left join app.professional_services ps on ps.service_id = s.id
    where s.organization_id = ${orgId} and (${!opts.activeOnly} or s.is_active)
    group by s.id, c.name, c.position
    order by s.is_active desc, c.position nulls last, c.name nulls last, s.name`;
}

/** Sugestões editáveis por segmento — ponto de partida do onboarding, não dados fictícios. */
export const SERVICE_PRESETS: Record<string, { name: string; category: string; price: number; minutes: number; buffer: number; returnDays?: number }[]> = {
  hair: [
    { name: "Corte feminino", category: "Cabelo", price: 9000, minutes: 60, buffer: 10, returnDays: 60 },
    { name: "Escova", category: "Cabelo", price: 6000, minutes: 45, buffer: 10 },
    { name: "Coloração", category: "Cabelo", price: 18000, minutes: 120, buffer: 15, returnDays: 45 },
    { name: "Hidratação", category: "Cabelo", price: 8000, minutes: 45, buffer: 10, returnDays: 30 },
  ],
  nails: [
    { name: "Manicure", category: "Unhas", price: 3500, minutes: 45, buffer: 10, returnDays: 10 },
    { name: "Pedicure", category: "Unhas", price: 4000, minutes: 50, buffer: 10, returnDays: 15 },
    { name: "Alongamento em gel", category: "Unhas", price: 15000, minutes: 120, buffer: 15, returnDays: 21 },
    { name: "Manutenção do alongamento", category: "Unhas", price: 9000, minutes: 90, buffer: 15, returnDays: 21 },
  ],
  lashes: [
    { name: "Extensão fio a fio", category: "Cílios", price: 16000, minutes: 120, buffer: 15, returnDays: 20 },
    { name: "Volume russo", category: "Cílios", price: 20000, minutes: 150, buffer: 15, returnDays: 20 },
    { name: "Manutenção de cílios", category: "Cílios", price: 9000, minutes: 75, buffer: 15, returnDays: 20 },
    { name: "Lash lifting", category: "Cílios", price: 12000, minutes: 60, buffer: 10, returnDays: 45 },
  ],
  brows: [
    { name: "Design de sobrancelhas", category: "Sobrancelhas", price: 5000, minutes: 30, buffer: 10, returnDays: 20 },
    { name: "Design com henna", category: "Sobrancelhas", price: 7000, minutes: 45, buffer: 10, returnDays: 20 },
    { name: "Brow lamination", category: "Sobrancelhas", price: 13000, minutes: 60, buffer: 10, returnDays: 45 },
  ],
  aesthetics: [
    { name: "Limpeza de pele", category: "Facial", price: 15000, minutes: 75, buffer: 15, returnDays: 30 },
    { name: "Drenagem linfática", category: "Corporal", price: 12000, minutes: 60, buffer: 15, returnDays: 7 },
    { name: "Peeling", category: "Facial", price: 18000, minutes: 60, buffer: 15, returnDays: 30 },
  ],
  makeup: [
    { name: "Maquiagem social", category: "Maquiagem", price: 15000, minutes: 60, buffer: 15 },
    { name: "Maquiagem para noivas", category: "Maquiagem", price: 45000, minutes: 120, buffer: 15 },
  ],
  waxing: [
    { name: "Depilação pernas inteiras", category: "Depilação", price: 7000, minutes: 45, buffer: 10, returnDays: 30 },
    { name: "Depilação axilas", category: "Depilação", price: 2500, minutes: 15, buffer: 5, returnDays: 30 },
    { name: "Depilação virilha", category: "Depilação", price: 5000, minutes: 30, buffer: 10, returnDays: 30 },
  ],
  massage: [
    { name: "Massagem relaxante", category: "Massoterapia", price: 13000, minutes: 60, buffer: 15, returnDays: 15 },
    { name: "Massagem modeladora", category: "Massoterapia", price: 12000, minutes: 60, buffer: 15, returnDays: 7 },
  ],
};

export const BUSINESS_TYPES: { id: string; label: string; presets: string[] }[] = [
  { id: "salon", label: "Salão de beleza", presets: ["hair", "nails"] },
  { id: "hair", label: "Cabeleireira", presets: ["hair"] },
  { id: "nails", label: "Manicure / nail designer", presets: ["nails"] },
  { id: "lashes", label: "Lash designer", presets: ["lashes"] },
  { id: "brows", label: "Designer de sobrancelhas", presets: ["brows"] },
  { id: "aesthetics", label: "Estética facial e corporal", presets: ["aesthetics"] },
  { id: "makeup", label: "Maquiadora", presets: ["makeup"] },
  { id: "waxing", label: "Depilação", presets: ["waxing"] },
  { id: "massage", label: "Massoterapia", presets: ["massage"] },
  { id: "clinic", label: "Clínica de estética", presets: ["aesthetics", "massage"] },
];

export function presetsFor(businessType: string) {
  const t = BUSINESS_TYPES.find((b) => b.id === businessType) ?? BUSINESS_TYPES[0]!;
  return t.presets.flatMap((p) => SERVICE_PRESETS[p] ?? []);
}
