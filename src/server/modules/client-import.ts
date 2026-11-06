import type { Tx } from "@/server/db";
import { DomainError } from "@/server/errors";
import { dedupeInFile, ImportFileError, parseClientImport, type FileDuplicate, type ImportIssue, type ImportRow } from "@/domain/client-import";
import type { Actor } from "@/server/modules/appointments";
import { audit } from "@/server/modules/audit";

export type ExistingDuplicate = { line: number; reason: "mesmo telefone" | "mesmo e-mail" | "mesmo nome" };
export type ImportPlan = {
  total: number;
  toCreate: ImportRow[];
  existing: ExistingDuplicate[];
  inFile: FileDuplicate[];
  errors: ImportIssue[];
  warnings: ImportIssue[];
};

const plainName = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Confere o arquivo contra o que a empresa já tem. Só lê: usado na prévia e de novo na confirmação. */
export async function planClientImport(tx: Tx, orgId: string, csv: string): Promise<ImportPlan> {
  let parsed;
  try { parsed = parseClientImport(csv); }
  catch (e) { if (e instanceof ImportFileError) throw new DomainError(e.message); throw e; }
  const { unique, duplicates } = dedupeInFile(parsed.rows);

  const phones = unique.map((r) => r.phoneNormalized).filter((v): v is string => !!v);
  const emails = unique.map((r) => r.email).filter((v): v is string => !!v);
  const hasNameOnly = unique.some((r) => !r.phoneNormalized && !r.email);
  const found = await tx<{ phone_normalized: string | null; email: string | null; name_key: string }[]>`
    select phone_normalized, lower(email) as email, lower(full_name) as name_key
    from app.clients
    where organization_id = ${orgId} and archived_at is null
      and ((phone_normalized is not null and phone_normalized = any(${tx.array(phones, 25)}))
        or (email is not null and lower(email) = any(${tx.array(emails, 25)}))
        or (${hasNameOnly} and phone_normalized is null and email is null))`;
  const havePhone = new Set(found.map((f) => f.phone_normalized).filter(Boolean));
  const haveEmail = new Set(found.map((f) => f.email).filter(Boolean));
  const haveNameOnly = new Set(found.filter((f) => !f.phone_normalized && !f.email).map((f) => plainName(f.name_key)));

  const toCreate: ImportRow[] = [], existing: ExistingDuplicate[] = [];
  for (const r of unique) {
    if (r.phoneNormalized && havePhone.has(r.phoneNormalized)) existing.push({ line: r.line, reason: "mesmo telefone" });
    else if (r.email && haveEmail.has(r.email)) existing.push({ line: r.line, reason: "mesmo e-mail" });
    else if (!r.phoneNormalized && !r.email && haveNameOnly.has(plainName(r.fullName))) existing.push({ line: r.line, reason: "mesmo nome" });
    else toCreate.push(r);
  }
  return { total: parsed.totalLines, toCreate, existing, inFile: duplicates, errors: parsed.errors, warnings: parsed.warnings };
}

/**
 * Cria as clientes. Entram como origem "import", sem consentimento de marketing (a importação não prova consentimento) e
 * com preferência de contato WhatsApp, como no cadastro manual. Refaz o plano dentro da transação e trava a empresa
 * para duas importações simultâneas não duplicarem.
 */
export async function commitClientImport(tx: Tx, actor: Actor, csv: string) {
  await tx`select pg_advisory_xact_lock(hashtext(${"client-import:" + actor.organizationId}))`;
  const plan = await planClientImport(tx, actor.organizationId, csv);
  for (let i = 0; i < plan.toCreate.length; i += 500) {
    const chunk = plan.toCreate.slice(i, i + 500).map((r) => ({
      organization_id: actor.organizationId, full_name: r.fullName, phone: r.phone, phone_normalized: r.phoneNormalized,
      email: r.email, birth_date: r.birthDate, preferences: r.preferences, source: "import", contact_preference: "whatsapp", marketing_consent: false,
    }));
    await tx`insert into app.clients ${tx(chunk)}`;
  }
  const counts = {
    created: plan.toCreate.length, existing: plan.existing.length, inFile: plan.inFile.length, errors: plan.errors.length, warnings: plan.warnings.length, total: plan.total,
  };
  await audit(tx, actor, "clients.imported", "client", null, counts);
  return counts;
}
