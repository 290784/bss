import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Criptografia de segredos guardados no banco (tokens de WhatsApp das clientes): AES-256-GCM.
 * A chave vem de WHATSAPP_ENCRYPTION_KEY (qualquer texto longo e aleatório; derivamos 32 bytes dele).
 * Formato: v1:<iv>:<tag>:<texto cifrado>, tudo em base64.
 */
function key(env: NodeJS.ProcessEnv = process.env) {
  const raw = env.WHATSAPP_ENCRYPTION_KEY;
  if (!raw || raw.length < 16) throw new Error("WHATSAPP_ENCRYPTION_KEY não configurada (mínimo 16 caracteres).");
  return createHash("sha256").update(raw).digest();
}

export const encryptionConfigured = (env: NodeJS.ProcessEnv = process.env) => (env.WHATSAPP_ENCRYPTION_KEY?.length ?? 0) >= 16;

export function encryptSecret(plain: string, env?: NodeJS.ProcessEnv) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(env), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), enc.toString("base64")].join(":");
}

export function decryptSecret(stored: string, env?: NodeJS.ProcessEnv) {
  const [v, iv, tag, enc] = stored.split(":");
  if (v !== "v1" || !iv || !tag || !enc) throw new Error("Segredo guardado em formato desconhecido.");
  const d = createDecipheriv("aes-256-gcm", key(env), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(enc, "base64")), d.final()]).toString("utf8");
}
