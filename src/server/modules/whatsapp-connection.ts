import { randomBytes } from "node:crypto";
import type { Sql, Tx } from "@/server/db";
import { PG_UNIQUE_VIOLATION, pgErrorCode } from "@/server/db";
import { DomainError } from "@/server/errors";
import { decryptSecret, encryptSecret, encryptionConfigured } from "@/server/secrets";
import { createMetaTemplates, metaProviderFor, verifyMetaNumber } from "@/server/modules/whatsapp-meta";
import type { MessageProvider } from "@/server/modules/messaging";

/**
 * Cada estabelecimento conecta o próprio número de WhatsApp (API oficial da Meta).
 * Guardamos o id do número, o token (criptografado) e, se o app da Meta for da própria cliente, o segredo do app.
 * O envio usa a conexão do estabelecimento; o webhook descobre de quem é a mensagem pelo número que a recebeu.
 */

type Row = {
  organization_id: string; phone_number_id: string; waba_id: string | null; display_phone: string | null; verified_name: string | null;
  token_enc: string; app_secret_enc: string | null; verify_token: string; templates: Record<string, string>; connected_at: Date;
};

export type WhatsAppConnection = {
  organizationId: string; phoneNumberId: string; wabaId: string | null; displayPhone: string | null; verifiedName: string | null;
  token: string; appSecret: string | null; verifyToken: string; templates: Record<string, string>;
};

const open = (r: Row): WhatsAppConnection => ({
  organizationId: r.organization_id, phoneNumberId: r.phone_number_id, wabaId: r.waba_id, displayPhone: r.display_phone,
  verifiedName: r.verified_name, token: decryptSecret(r.token_enc), appSecret: r.app_secret_enc ? decryptSecret(r.app_secret_enc) : null,
  verifyToken: r.verify_token, templates: r.templates ?? {},
});

export type ConnectInput = { phoneNumberId: string; wabaId?: string; token: string; appSecret?: string };

/** Confere com a Meta, guarda a conexão do estabelecimento e cria os modelos de mensagem na conta dele. */
export async function connectWhatsApp(sql: Sql | Tx, organizationId: string, input: ConnectInput, fetchImpl: typeof fetch = fetch) {
  if (!encryptionConfigured()) throw new DomainError("A conexão de WhatsApp ainda não foi habilitada neste servidor. Fale com o suporte da Gê.");
  const phoneNumberId = input.phoneNumberId.trim(), token = input.token.trim();
  const wabaId = input.wabaId?.trim() || null, appSecret = input.appSecret?.trim() || null;
  let info: Awaited<ReturnType<typeof verifyMetaNumber>>;
  try { info = await verifyMetaNumber(token, phoneNumberId, fetchImpl); }
  catch (e) { throw new DomainError(`A Meta não aceitou esses dados: ${e instanceof Error ? e.message : "falha na conferência"}. Confira o ID do número e o token.`); }
  const templates = wabaId ? await createMetaTemplates(wabaId, token, "pt_BR", fetchImpl) : {};
  const verifyToken = randomBytes(18).toString("hex");
  try {
    await sql`
      insert into app.whatsapp_connections (organization_id, phone_number_id, waba_id, display_phone, verified_name, token_enc, app_secret_enc, verify_token, templates)
      values (${organizationId}, ${phoneNumberId}, ${wabaId}, ${info.displayPhone}, ${info.verifiedName}, ${encryptSecret(token)},
              ${appSecret ? encryptSecret(appSecret) : null}, ${verifyToken}, ${sql.json(templates)})
      on conflict (organization_id) do update set phone_number_id = excluded.phone_number_id, waba_id = excluded.waba_id,
        display_phone = excluded.display_phone, verified_name = excluded.verified_name, token_enc = excluded.token_enc,
        app_secret_enc = excluded.app_secret_enc, templates = excluded.templates, updated_at = now()`;
  } catch (e) {
    if (pgErrorCode(e) === PG_UNIQUE_VIOLATION) throw new DomainError("Esse número de WhatsApp já está conectado a outro estabelecimento.");
    throw e;
  }
  return { displayPhone: info.displayPhone, verifiedName: info.verifiedName, templates };
}

export async function disconnectWhatsApp(sql: Sql | Tx, organizationId: string) {
  await sql`delete from app.whatsapp_connections where organization_id = ${organizationId}`;
}

export async function loadConnection(sql: Sql | Tx, organizationId: string): Promise<WhatsAppConnection | null> {
  const [r] = await sql<Row[]>`select * from app.whatsapp_connections where organization_id = ${organizationId}`;
  return r ? open(r) : null;
}

export async function findConnectionByPhoneId(sql: Sql | Tx, phoneNumberId: string): Promise<WhatsAppConnection | null> {
  const [r] = await sql<Row[]>`select * from app.whatsapp_connections where phone_number_id = ${phoneNumberId}`;
  return r ? open(r) : null;
}

/** O texto de verificação que a Meta mandou no cadastro do webhook pertence a alguma conexão? */
export async function verifyTokenExists(sql: Sql | Tx, token: string) {
  if (!token) return false;
  const [r] = await sql<{ ok: boolean }[]>`select exists(select 1 from app.whatsapp_connections where verify_token = ${token}) as ok`;
  return !!r?.ok;
}

/**
 * Provedores de envio por estabelecimento, para um lote de mensagens. Quem não conectou o próprio número fica de fora
 * (e usa o número da plataforma, se existir). Uma conexão ilegível (chave trocada) vira erro só daquele estabelecimento.
 */
export async function providersByOrg(sql: Sql | Tx, orgIds: string[]) {
  const out = new Map<string, MessageProvider | Error>();
  if (orgIds.length === 0) return out;
  const rows = await sql<Row[]>`select * from app.whatsapp_connections where organization_id in ${sql(orgIds)}`;
  for (const r of rows) {
    try { const c = open(r); out.set(r.organization_id, metaProviderFor({ token: c.token, phoneId: c.phoneNumberId })); }
    catch (e) { out.set(r.organization_id, e instanceof Error ? e : new Error("Conexão ilegível")); }
  }
  return out;
}
