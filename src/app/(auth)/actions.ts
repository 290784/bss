"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { withSystem, pgErrorCode, PG_UNIQUE_VIOLATION } from "@/server/db";
import { hashPassword, verifyPassword, DUMMY_HASH } from "@/server/auth/password";
import { clientIp, createSession } from "@/server/auth/session";
import { rateLimit } from "@/server/rate-limit";
import { trackEvent } from "@/server/modules/audit";
import type { ActionState } from "@/server/errors";

const safeNext = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/app";
};

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Informe seu nome.").max(120),
  email: z.email("E-mail inválido.").max(160).transform((v) => v.toLowerCase().trim()),
  password: z.string().min(10, "Use pelo menos 10 caracteres.").max(200),
  acceptTerms: z.literal("on", { error: "É preciso aceitar os termos e a política de privacidade." }),
});

export async function signUp(_: ActionState, form: FormData): Promise<ActionState> {
  const ip = await clientIp();
  if (!(await rateLimit(`signup:${ip}`, 10, 3600))) return { ok: false, message: "Muitas tentativas. Tente novamente mais tarde." };
  const parsed = signupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "Revise os campos destacados.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { fullName, email, password } = parsed.data;
  const hash = await hashPassword(password);
  let userId: string;
  try {
    const [u] = await withSystem((tx) => tx<{ id: string }[]>`
      insert into app.users (email, password_hash, full_name) values (${email}, ${hash}, ${fullName}) returning id`);
    userId = u!.id;
    await withSystem((tx) => trackEvent(tx, "signup.completed", null, userId));
  } catch (err) {
    if (pgErrorCode(err) === PG_UNIQUE_VIOLATION)
      return { ok: false, message: "Já existe uma conta com este e-mail. Entre ou recupere o acesso.", fieldErrors: { email: ["E-mail já cadastrado."] } };
    throw err;
  }
  await createSession(userId);
  redirect("/onboarding");
}

export async function signIn(_: ActionState, form: FormData): Promise<ActionState> {
  const email = String(form.get("email") ?? "").toLowerCase().trim();
  const password = String(form.get("password") ?? "");
  const ip = await clientIp();
  const allowed = (await rateLimit(`login:ip:${ip}`, 30, 900)) && (await rateLimit(`login:email:${email}`, 8, 900));
  if (!allowed) return { ok: false, message: "Muitas tentativas de acesso. Aguarde alguns minutos." };
  const [u] = await withSystem((tx) => tx<{ id: string; password_hash: string }[]>`
    select id, password_hash from app.users where lower(email) = ${email}`);
  const ok = await verifyPassword(password, u?.password_hash ?? DUMMY_HASH);
  if (!u || !ok) return { ok: false, message: "E-mail ou senha incorretos." };
  await createSession(u.id);
  redirect(safeNext(form.get("next")));
}
