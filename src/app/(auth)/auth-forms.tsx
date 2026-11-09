"use client";
import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { CONHECEU } from "@/domain/canal";
import { requestPasswordReset, resetPassword, signIn, signUp } from "./actions";
import { ActionForm, Checkbox, Field, FormMessage, Input, SubmitButton } from "@/components/ui/form";

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, null);
  return (
    <ActionForm action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <FormMessage state={state} />
      <Field label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </Field>
      <Field label="Senha" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <p className="-mt-2 text-right text-sm"><Link href="/esqueci-a-senha" className="font-medium text-accent-text hover:underline">Esqueci minha senha</Link></p>
      <SubmitButton size="lg" pending={pending} pendingLabel="Entrando…">Entrar</SubmitButton>
      <p className="text-center text-sm text-muted">
        Ainda não tem conta? <Link href="/cadastro" className="font-medium text-accent-text hover:underline">Comece grátis</Link>
      </p>
    </ActionForm>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  const canalRef = useRef<HTMLInputElement>(null);
  useEffect(() => { try { if (canalRef.current) canalRef.current.value = localStorage.getItem("ge-canal") ?? ""; } catch { /* sem canal */ } }, []);
  return (
    <ActionForm action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <Field label="Seu nome" htmlFor="fullName" error={fe?.fullName}>
        <Input id="fullName" name="fullName" autoComplete="name" required autoFocus aria-invalid={!!fe?.fullName} />
      </Field>
      <Field label="E-mail" htmlFor="email" error={fe?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!fe?.email} />
      </Field>
      <Field label="Senha" htmlFor="password" error={fe?.password} hint="Pelo menos 10 caracteres, tá?">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} aria-invalid={!!fe?.password} />
      </Field>
      <Field label="Como você conheceu a Gê? (opcional)" htmlFor="conheceu">
        <select id="conheceu" name="conheceu" defaultValue="" className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-[15px]">
          <option value="">Prefiro não dizer</option>
          {CONHECEU.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </Field>
      <input type="hidden" name="canal" ref={canalRef} />
      <Checkbox
        name="acceptTerms"
        label={<>Li e aceito os <Link href="/termos" className="text-accent-text underline" target="_blank">termos de uso</Link> e a <Link href="/privacidade" className="text-accent-text underline" target="_blank">política de privacidade</Link>.</>}
      />
      {fe?.acceptTerms && <p role="alert" className="-mt-2 text-[13px] text-danger">{fe.acceptTerms[0]}</p>}
      <SubmitButton size="lg" pending={pending} pendingLabel="Criando sua conta…">Criar conta grátis</SubmitButton>
      <p className="text-center text-sm text-muted">
        Já tem conta? <Link href="/entrar" className="font-medium text-accent-text hover:underline">Entrar</Link>
      </p>
    </ActionForm>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  if (state?.ok) return <p role="status" className="rounded-2xl bg-highlight-subtle p-4 text-sm text-highlight-text">{state.message}</p>;
  return (
    <ActionForm action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <Field label="E-mail da sua conta" htmlFor="email" error={fe?.email}><Input id="email" name="email" type="email" autoComplete="email" required autoFocus aria-invalid={!!fe?.email} /></Field>
      <SubmitButton size="lg" pending={pending} pendingLabel="Enviando…">Enviar o link</SubmitButton>
      <p className="text-center text-sm text-muted"><Link href="/entrar" className="font-medium text-accent-text hover:underline">Voltar para entrar</Link></p>
    </ActionForm>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <ActionForm action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <FormMessage state={state} />
      <Field label="Nova senha" htmlFor="password" error={fe?.password} hint="Pelo menos 10 caracteres, tá?"><Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} autoFocus aria-invalid={!!fe?.password} /></Field>
      <Field label="Repita a nova senha" htmlFor="confirm" error={fe?.confirm}><Input id="confirm" name="confirm" type="password" autoComplete="new-password" required aria-invalid={!!fe?.confirm} /></Field>
      <SubmitButton size="lg" pending={pending} pendingLabel="Salvando…">Salvar nova senha</SubmitButton>
    </ActionForm>
  );
}
