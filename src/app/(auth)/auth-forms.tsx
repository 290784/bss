"use client";
import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp } from "./actions";
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
  return (
    <ActionForm action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <Field label="Seu nome" htmlFor="fullName" error={fe?.fullName}>
        <Input id="fullName" name="fullName" autoComplete="name" required autoFocus aria-invalid={!!fe?.fullName} />
      </Field>
      <Field label="E-mail" htmlFor="email" error={fe?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!fe?.email} />
      </Field>
      <Field label="Senha" htmlFor="password" error={fe?.password} hint="Mínimo de 10 caracteres.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} aria-invalid={!!fe?.password} />
      </Field>
      <Checkbox
        name="acceptTerms"
        label={<>Li e aceito os <Link href="/termos" className="text-accent-text underline" target="_blank">termos de uso</Link> e a <Link href="/privacidade" className="text-accent-text underline" target="_blank">política de privacidade</Link>.</>}
      />
      {fe?.acceptTerms && <p role="alert" className="-mt-2 text-[13px] text-danger">{fe.acceptTerms[0]}</p>}
      <SubmitButton size="lg" pending={pending} pendingLabel="Criando conta…">Criar conta grátis</SubmitButton>
      <p className="text-center text-sm text-muted">
        Já tem conta? <Link href="/entrar" className="font-medium text-accent-text hover:underline">Entrar</Link>
      </p>
    </ActionForm>
  );
}
