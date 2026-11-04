import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "node:crypto";

/**
 * Criptografia de segredos guardados no banco (tokens de WhatsApp dos salões): AES-256-GCM.
 * A chave vem de WHATSAPP_ENCRYPTION_KEY (texto longo e aleatório, mínimo 16 caracteres).
 *
 * Formatos (tudo em base64, separado por ":"):
 * - v2:<sal>:<iv>:<tag>:<cifrado>  (atual) a chave de 32 bytes sai do texto com scrypt e um sal novo por segredo,
 *   então um texto fraco custa caro para quem tentar adivinhar e dois segredos nunca compartilham a mesma chave.
 * - v1:<iv>:<tag>:<cifrado>        (antigo) SHA-256 direto do texto. Continua sendo lido; é regravado em v2 na próxima
 *   vez que o salão salvar a conexão.
 */
function raw(env: Record<string, string | undefined> = process.env) {
  const k = env.WHATSAPP_ENCRYPTION_KEY;
  if (!k || k.length < 16) throw new Error("WHATSAPP_ENCRYPTION_KEY não configurada (mínimo 16 caracteres).");
  return k;
}

export const encryptionConfigured = (env: Record<string, string | undefined> = process.env) => (env.WHATSAPP_ENCRYPTION_KEY?.length ?? 0) >= 16;

export function encryptSecret(plain: string, env?: Record<string, string | undefined>) {
  const salt = randomBytes(16), iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", scryptSync(raw(env), salt, 32), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v2", salt.toString("base64"), iv.toString("base64"), c.getAuthTag().toString("base64"), enc.toString("base64")].join(":");
}

export function decryptSecret(stored: string, env?: Record<string, string | undefined>) {
  const parts = stored.split(":");
  let key: Buffer, iv: string | undefined, tag: string | undefined, enc: string | undefined;
  if (parts[0] === "v2" && parts.length === 5) {
    key = scryptSync(raw(env), Buffer.from(parts[1]!, "base64"), 32);
    [, , iv, tag, enc] = parts;
  } else if (parts[0] === "v1" && parts.length === 4) {
    key = createHash("sha256").update(raw(env)).digest();
    [, iv, tag, enc] = parts;
  } else throw new Error("Segredo guardado em formato desconhecido.");
  if (!iv || !tag || !enc) throw new Error("Segredo guardado em formato desconhecido.");
  const d = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(enc, "base64")), d.final()]).toString("utf8");
}
