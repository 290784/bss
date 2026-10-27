"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { withSystem } from "@/server/db";
import { getSession, setActiveOrganization } from "@/server/auth/session";
import { actionContext, getAppContext, tenant } from "@/server/context";
import { businessSchema, createOrganizationForUser } from "@/server/modules/onboarding";
import { setWorkingHours, type HourWindow } from "@/server/modules/team";
import { saveService } from "@/server/modules/catalog";
import { trackEvent } from "@/server/modules/audit";
import { DomainError, type ActionState } from "@/server/errors";

export async function createBusiness(_: ActionState, form: FormData): Promise<ActionState> {
  const session = await getSession();
  if (!session) redirect("/entrar");
  if (await getAppContext()) return { ok: true }; // já criada: segue para o próximo passo
  const parsed = businessSchema.safeParse({
    name: form.get("name"),
    businessType: form.get("businessType"),
    phone: form.get("phone") || undefined,
    attends: form.get("attends") === "on",
    ownerDisplayName: session.fullName,
    timezone: process.env.DEFAULT_TIMEZONE ?? "America/Sao_Paulo",
  });
  if (!parsed.success) return { ok: false, message: "Revise os campos.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const org = await withSystem((tx) => createOrganizationForUser(tx, session.userId, parsed.data));
  await setActiveOrganization(session.sessionId, org.organizationId);
  return { ok: true };
}

const hoursPayload = z.object({
  days: z.array(z.number().int().min(0).max(6)).min(1, "Escolha pelo menos um dia de atendimento."),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
  breakStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  breakEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export async function saveOnboardingHours(input: z.infer<typeof hoursPayload>): Promise<ActionState> {
  try {
    const ctx = await actionContext("settings.manage");
    const h = hoursPayload.parse(input);
    if (h.end <= h.start) throw new DomainError("O horário de término deve ser depois do início.");
    const windows: HourWindow[] = h.days.flatMap((weekday) =>
      h.breakStart && h.breakEnd && h.breakStart > h.start && h.breakEnd < h.end && h.breakEnd > h.breakStart
        ? [{ weekday, start: h.start, end: h.breakStart }, { weekday, start: h.breakEnd, end: h.end }]
        : [{ weekday, start: h.start, end: h.end }],
    );
    await tenant(ctx, async (tx) => {
      const pros = await tx<{ id: string }[]>`select id from app.professionals where organization_id = ${ctx.org.id}`;
      for (const p of pros) await setWorkingHours(tx, { userId: ctx.user.userId, organizationId: ctx.org.id }, p.id, windows);
    });
    return { ok: true };
  } catch (err) {
    return toState(err);
  }
}

const servicesPayload = z.array(z.object({
  name: z.string().trim().min(2).max(100),
  category: z.string().trim().max(60),
  price: z.string(),
  minutes: z.number().int().min(5).max(720),
  buffer: z.number().int().min(0).max(120),
  returnDays: z.number().int().optional(),
})).min(1, "Escolha pelo menos um serviço.").max(30);

export async function finishOnboarding(input: z.infer<typeof servicesPayload>): Promise<ActionState> {
  try {
    const ctx = await actionContext("settings.manage");
    const services = servicesPayload.parse(input);
    await tenant(ctx, async (tx) => {
      const actor = { userId: ctx.user.userId, organizationId: ctx.org.id };
      const pros = (await tx<{ id: string }[]>`select id from app.professionals where organization_id = ${ctx.org.id}`).map((p) => p.id);
      const [existing] = await tx<{ n: number }[]>`select count(*)::int as n from app.services where organization_id = ${ctx.org.id}`;
      if (existing!.n === 0) {
        for (const s of services) {
          await saveService(tx, actor, {
            name: s.name, categoryName: s.category, price: parsePrice(s.price), durationMinutes: s.minutes,
            bufferAfterMinutes: s.buffer, returnIntervalDays: s.returnDays, onlineBookable: true, professionalIds: pros,
          });
        }
      }
      await tx`update app.organizations set onboarding_completed_at = coalesce(onboarding_completed_at, now()) where id = ${ctx.org.id}`;
    });
    await withSystem((tx) => trackEvent(tx, "onboarding.completed", ctx.org.id, ctx.user.userId, { services: services.length }));
  } catch (err) {
    return toState(err);
  }
  redirect("/app?bem-vinda=1");
}

function parsePrice(v: string) {
  const n = Math.round(Number(v.replace(/\./g, "").replace(",", ".")) * 100);
  if (!Number.isFinite(n) || n < 0) throw new DomainError("Preço inválido em um dos serviços.");
  return n;
}

function toState(err: unknown): ActionState {
  if (err instanceof DomainError) return { ok: false, message: err.message };
  if (err instanceof z.ZodError) return { ok: false, message: err.issues[0]?.message ?? "Dados inválidos." };
  throw err;
}
