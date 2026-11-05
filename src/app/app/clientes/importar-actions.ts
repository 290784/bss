"use server";
import { revalidatePath } from "next/cache";
import { IMPORT_MAX_CHARS } from "@/domain/client-import";
import { actionContext, tenant } from "@/server/context";
import { withSystem } from "@/server/db";
import { trackEvent } from "@/server/modules/audit";
import { commitClientImport, planClientImport } from "@/server/modules/client-import";
import { DomainError, type ActionState } from "@/server/errors";

export type ImportPreview = {
  total: number;
  willCreate: number;
  existing: number;
  inFile: number;
  errorCount: number;
  warningCount: number;
  errors: { line: number; message: string }[];
  warnings: { line: number; message: string }[];
  sample: { line: number; fullName: string; phone: string | null; email: string | null }[];
};

const check = (csv: unknown) => {
  if (typeof csv !== "string" || csv.length === 0) throw new DomainError("Escolha um arquivo CSV.");
  if (csv.length > IMPORT_MAX_CHARS) throw new DomainError("O arquivo é grande demais. Divida em partes de até 5.000 clientes.");
  return csv;
};

/** Passo 1: lê o arquivo e mostra o que vai acontecer, sem gravar nada. */
export async function previewClientImportAction(csv: string): Promise<ActionState<ImportPreview>> {
  try {
    const ctx = await actionContext("clients.manage");
    const plan = await tenant(ctx, (tx) => planClientImport(tx, ctx.org.id, check(csv)));
    return {
      ok: true,
      data: {
        total: plan.total, willCreate: plan.toCreate.length, existing: plan.existing.length, inFile: plan.inFile.length,
        errorCount: plan.errors.length, warningCount: plan.warnings.length,
        errors: plan.errors.slice(0, 20), warnings: plan.warnings.slice(0, 20),
        sample: plan.toCreate.slice(0, 5).map((r) => ({ line: r.line, fullName: r.fullName, phone: r.phone, email: r.email })),
      },
    };
  } catch (err) {
    if (err instanceof DomainError) return { ok: false, message: err.message };
    throw err;
  }
}

/** Passo 2: grava. Refaz toda a conferência no servidor; nada do que a prévia mostrou é "confiado". */
export async function confirmClientImportAction(csv: string): Promise<ActionState<{ created: number; skipped: number }>> {
  try {
    const ctx = await actionContext("clients.manage");
    const counts = await tenant(ctx, (tx) => commitClientImport(tx, { userId: ctx.user.userId, organizationId: ctx.org.id }, check(csv)));
    // Evento de funil (ativação): o papel do aplicativo não escreve em product_events, então vai pelo sistema. Só contagens.
    await withSystem((tx) => trackEvent(tx, "clients.imported", ctx.org.id, ctx.user.userId, { created: counts.created, total: counts.total })).catch(() => {});
    revalidatePath("/app/clientes");
    revalidatePath("/app");
    return { ok: true, message: `${counts.created} ${counts.created === 1 ? "cliente importada" : "clientes importadas"}.`, data: { created: counts.created, skipped: counts.existing + counts.inFile + counts.errors } };
  } catch (err) {
    if (err instanceof DomainError) return { ok: false, message: err.message };
    throw err;
  }
}
