"use client";
import { useActionState, useEffect, useRef } from "react";
import { joinWaitlist } from "./lista-espera-actions";
import { ActionForm, Checkbox, Field, FormMessage, Input, Select, SubmitButton } from "@/components/ui/form";

export function WaitlistForm({ tipos }: { tipos: { id: string; label: string }[] }) {
  const [state, action, pending] = useActionState(joinWaitlist, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  const canalRef = useRef<HTMLInputElement>(null);
  useEffect(() => { try { if (canalRef.current) canalRef.current.value = localStorage.getItem("ge-canal") ?? ""; } catch { /* sem canal */ } }, []);
  if (state?.ok) return <p role="status" className="rounded-2xl bg-white/10 p-5 text-center text-[16px] text-white">{state.message}</p>;
  return (
    <ActionForm action={action} className="mx-auto flex max-w-md flex-col gap-4 text-left" noValidate>
      <FormMessage state={state} />
      <Field label="Seu nome" htmlFor="wl-nome" error={fe?.fullName}><Input id="wl-nome" name="fullName" autoComplete="name" required aria-invalid={!!fe?.fullName} /></Field>
      <Field label="Seu WhatsApp (com DDD)" htmlFor="wl-fone" error={fe?.phone}><Input id="wl-fone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(21) 90000-0000" required aria-invalid={!!fe?.phone} /></Field>
      <Field label="O que você faz?" htmlFor="wl-tipo" error={fe?.businessType}>
        <Select id="wl-tipo" name="businessType" defaultValue="" required aria-invalid={!!fe?.businessType}>
          <option value="" disabled>Escolha…</option>
          {tipos.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
        </Select>
      </Field>
      <input type="hidden" name="canal" ref={canalRef} />
      <Checkbox name="accept" className="text-white/90" label="Aceito que a Gê me chame no WhatsApp sobre o teste. Posso sair da lista quando quiser." />
      {fe?.accept && <p role="alert" className="-mt-2 text-[13px] text-danger">{fe.accept[0]}</p>}
      <SubmitButton size="lg" pending={pending} pendingLabel="Entrando na lista…">Quero testar</SubmitButton>
    </ActionForm>
  );
}
