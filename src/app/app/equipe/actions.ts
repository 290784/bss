"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionContext, tenant } from "@/server/context";
import {
  addTimeOff, hoursSchema, professionalSchema, removeTimeOff, saveProfessional, setProfessionalActive, setWorkingHours, timeOffSchema,
} from "@/server/modules/team";
import { DomainError, type ActionState } from "@/server/errors";

const fail = (err: unknown): ActionState => {
  if (err instanceof DomainError) return { ok: false, message: err.message };
  if (err instanceof z.ZodError) return { ok: false, message: err.issues[0]?.message ?? "Algo não ficou certinho. Confere os dados?" };
  throw err;
};
const actorOf = (ctx: Awaited<ReturnType<typeof actionContext>>) => ({ userId: ctx.user.userId, organizationId: ctx.org.id });

export async function saveProfessionalAction(input: unknown, id?: string): Promise<ActionState> {
  try {
    const ctx = await actionContext("team.manage");
    const data = professionalSchema.parse(input);
    await tenant(ctx, (tx) => saveProfessional(tx, actorOf(ctx), ctx.plan, data, id));
    revalidatePath("/app", "layout");
    return { ok: true, message: id ? "Profissional atualizada! 💜" : "Profissional adicionada! Bem-vinda ao time ✨" };
  } catch (err) { return fail(err); }
}

export async function toggleProfessionalAction(id: string, active: boolean): Promise<ActionState> {
  try {
    const ctx = await actionContext("team.manage");
    await tenant(ctx, (tx) => setProfessionalActive(tx, actorOf(ctx), ctx.plan, id, active));
    revalidatePath("/app", "layout");
    return { ok: true, message: active ? "Profissional de volta ao time!" : "Profissional pausada. A agenda e o histórico continuam guardados." };
  } catch (err) { return fail(err); }
}

export async function saveHoursAction(professionalId: string, hours: unknown): Promise<ActionState> {
  try {
    const ctx = await actionContext("team.manage");
    const data = hoursSchema.parse(hours);
    await tenant(ctx, (tx) => setWorkingHours(tx, actorOf(ctx), professionalId, data));
    revalidatePath("/app", "layout");
    return { ok: true, message: "Horários salvos! O que já estava marcado continua igual." };
  } catch (err) { return fail(err); }
}

export async function addTimeOffAction(input: unknown): Promise<ActionState> {
  try {
    const ctx = await actionContext("team.manage");
    const data = timeOffSchema.parse(input);
    const r = await tenant(ctx, (tx) => addTimeOff(tx, actorOf(ctx), ctx.org.timezone, data));
    revalidatePath("/app", "layout");
    return { ok: true, message: r.conflicts ? `Bloqueio criado. Atenção: ${r.conflicts} agendamento(s) já marcado(s) neste período — reagende ou cancele pela agenda.` : "Bloqueio marcado na agenda." };
  } catch (err) { return fail(err); }
}

export async function removeTimeOffAction(id: string): Promise<ActionState> {
  try {
    const ctx = await actionContext("team.manage");
    await tenant(ctx, (tx) => removeTimeOff(tx, actorOf(ctx), id));
    revalidatePath("/app", "layout");
    return { ok: true, message: "Bloqueio removido: os horários estão livres de novo." };
  } catch (err) { return fail(err); }
}
