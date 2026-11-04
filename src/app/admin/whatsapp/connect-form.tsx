"use client";
import { useActionState, useTransition } from "react";
import { ActionForm, Field, FormMessage, Input, SubmitButton } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { adminConnectWhatsAppAction, adminDisconnectWhatsAppAction } from "./actions";

export function AdminConnectForm({ org }: { org?: string }) {
  const [state, action] = useActionState(adminConnectWhatsAppAction, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <ActionForm action={action} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2"><FormMessage state={state} /></div>
      <Field label="Estabelecimento (código do link)" htmlFor={`org-${org ?? "novo"}`} error={fe?.org} className="sm:col-span-2">
        <Input id={`org-${org ?? "novo"}`} name="org" defaultValue={org} readOnly={!!org} />
      </Field>
      <Field label="ID do número" htmlFor={`pn-${org ?? "novo"}`} error={fe?.phoneNumberId}><Input id={`pn-${org ?? "novo"}`} name="phoneNumberId" inputMode="numeric" autoComplete="off" /></Field>
      <Field label="ID da conta (WABA)" htmlFor={`wb-${org ?? "novo"}`} error={fe?.wabaId} optional><Input id={`wb-${org ?? "novo"}`} name="wabaId" inputMode="numeric" autoComplete="off" /></Field>
      <Field label="Token de acesso" htmlFor={`tk-${org ?? "novo"}`} error={fe?.token} className="sm:col-span-2"><Input id={`tk-${org ?? "novo"}`} name="token" type="password" autoComplete="off" /></Field>
      <Field label="Segredo do app" htmlFor={`sc-${org ?? "novo"}`} optional className="sm:col-span-2"><Input id={`sc-${org ?? "novo"}`} name="appSecret" type="password" autoComplete="off" /></Field>
      <div className="sm:col-span-2"><SubmitButton pendingLabel="Conferindo com a Meta…">Conectar</SubmitButton></div>
    </ActionForm>
  );
}

export function AdminDisconnect({ orgId }: { orgId: string }) {
  const [pending, start] = useTransition();
  return <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => start(async () => { await adminDisconnectWhatsAppAction(orgId); })}>Desconectar</Button>;
}
