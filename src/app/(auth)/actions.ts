"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { withSystem, pgErrorCode, PG_UNIQUE_VIOLATION } from "@/server/db";
import { hashPassword, verifyPassword, DUMMY_HASH } from "@/server/auth/password";
import { clientIp, createSession } from "@/server/auth/session";
import { rateLimit } from "@/server/rate-limit";
import { trackEvent } from "@/server/modules/audit";
import { getEmailProvider, sendEmail } from "@/server/email";
import { resetPasswordEmail, verifyEmailEmail } from "@/server/email-templates";
import { issueToken, resetPasswordWithToken } from "@/server/modules/email-tokens";
import { normalizeCanal, normalizeConheceu } from "@/domain/canal";
import type { ActionState } from "@/server/errors";

const safeNext = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/app";
};

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Como você se chama?").max(120),
  email: z.email("Esse e-mail não parece certo. Confere?").max(160).transform((v) => v.toLowerCase().trim()),
  password: z.string().min(10, "A senha precisa de pelo menos 10 caracteres.").max(200),
  acceptTerms: z.literal("on", { error: "Para continuar, é só aceitar os termos e a política de privacidade." }),
});

export async function signUp(_: ActionState, form: FormData): Promise<ActionState> {
  const ip = await clientIp();
  if (!(await rateLimit(`signup:${ip}`, 10, 3600))) return { ok: false, message: "Muitas tentativas seguidas. Respira e tenta de novo daqui a pouquinho." };
  const parsed = signupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "Dá uma olhadinha nos campos destacados.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { fullName, email, password } = parsed.data;
  const hash = await hashPassword(password);
  let userId: string;
  try {
    const [u] = await withSystem((tx) => tx<{ id: string }[]>`
      insert into app.users (email, password_hash, full_name) values (${email}, ${hash}, ${fullName}) returning id`);
    userId = u!.id;
    // Origem do cadastro (sem dados pessoais): código do canal do link e a resposta de "como conheceu".
    const canal = normalizeCanal(form.get("canal")), conheceu = normalizeConheceu(form.get("conheceu"));
    await withSystem((tx) => trackEvent(tx, "signup.completed", null, userId, { ...(canal ? { canal } : {}), ...(conheceu ? { conheceu } : {}) }));
  } catch (err) {
    if (pgErrorCode(err) === PG_UNIQUE_VIOLATION)
      return { ok: false, message: "Você já tem conta com esse e-mail! É só entrar.", fieldErrors: { email: ["Esse e-mail já tem conta."] } };
    throw err;
  }
  // Pede a confirmação do e-mail sem travar o cadastro: se o envio falhar, ela segue e pode confirmar depois.
  if (getEmailProvider()) {
    try {
      const token = await withSystem((tx) => issueToken(tx, userId, "verify"));
      await sendEmail(verifyEmailEmail(email, `${process.env.APP_URL ?? "http://localhost:3000"}/verificar-email?token=${token}`));
    } catch { /* segue sem o e-mail de confirmação */ }
  }
  await createSession(userId);
  redirect("/onboarding");
}

export async function signIn(_: ActionState, form: FormData): Promise<ActionState> {
  const email = String(form.get("email") ?? "").toLowerCase().trim();
  const password = String(form.get("password") ?? "");
  const ip = await clientIp();
  const allowed = (await rateLimit(`login:ip:${ip}`, 30, 900)) && (await rateLimit(`login:email:${email}`, 8, 900));
  if (!allowed) return { ok: false, message: "Muitas tentativas seguidas. Espera uns minutinhos e tenta de novo." };
  const [u] = await withSystem((tx) => tx<{ id: string; password_hash: string }[]>`
    select id, password_hash from app.users where lower(email) = ${email}`);
  const ok = await verifyPassword(password, u?.password_hash ?? DUMMY_HASH);
  if (!u || !ok) return { ok: false, message: "E-mail ou senha não batem. Tenta de novo?" };
  await createSession(u.id);
  redirect(safeNext(form.get("next")));
}

const SEM_EMAIL = "A recuperação de senha por e-mail ainda não está ativa. Fale com o suporte para redefinir a sua senha.";

/** Pede o link de redefinição. A resposta é sempre a mesma, exista a conta ou não (ninguém descobre quem tem conta). */
export async function requestPasswordReset(_: ActionState, form: FormData): Promise<ActionState> {
  const email = String(form.get("email") ?? "").toLowerCase().trim();
  if (!z.email().safeParse(email).success) return { ok: false, message: "Esse e-mail não parece certo. Confere?", fieldErrors: { email: ["Esse e-mail não parece certo."] } };
  const ip = await clientIp();
  if (!(await rateLimit(`reset:ip:${ip}`, 10, 3600)) || !(await rateLimit(`reset:email:${email}`, 3, 3600)))
    return { ok: false, message: "Muitas tentativas seguidas. Espera um pouquinho e tenta de novo." };
  if (!getEmailProvider()) return { ok: false, message: SEM_EMAIL };
  const [u] = await withSystem((tx) => tx<{ id: string }[]>`select id from app.users where lower(email) = ${email}`);
  if (u) {
    try {
      const token = await withSystem((tx) => issueToken(tx, u.id, "reset"));
      await sendEmail(resetPasswordEmail(email, `${process.env.APP_URL ?? "http://localhost:3000"}/redefinir-senha?token=${token}`));
      await withSystem((tx) => trackEvent(tx, "password.reset_requested", null, u.id));
    } catch { /* a resposta continua igual: não revela se deu certo */ }
  }
  return { ok: true, message: "Se esse e-mail tem conta na Gê, o link de redefinição já está a caminho. Ele vale por 1 hora." };
}

const resetSchema = z.object({
  token: z.string().min(10).max(100),
  password: z.string().min(10, "A senha precisa de pelo menos 10 caracteres.").max(200),
  confirm: z.string(),
}).refine((v) => v.password === v.confirm, { message: "As senhas não são iguais.", path: ["confirm"] });

/** Define a nova senha com o link do e-mail. Funciona uma vez; derruba as sessões abertas. */
export async function resetPassword(_: ActionState, form: FormData): Promise<ActionState> {
  const ip = await clientIp();
  if (!(await rateLimit(`reset-use:${ip}`, 20, 3600))) return { ok: false, message: "Muitas tentativas seguidas. Espera um pouquinho e tenta de novo." };
  const parsed = resetSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "Dá uma olhadinha nos campos destacados.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const ok = await withSystem((tx) => resetPasswordWithToken(tx, parsed.data.token, parsed.data.password));
  if (!ok) return { ok: false, message: "Esse link venceu ou já foi usado. Peça um novo." };
  redirect("/entrar?senha=redefinida");
}
