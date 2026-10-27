"use client";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveClientAction } from "./actions";
import { ActionForm, Checkbox, Field, FormMessage, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";

export type ClientFormValues = {
  id?: string; fullName?: string; phone?: string | null; email?: string | null; birthDate?: string | null;
  contactPreference?: string; marketingConsent?: boolean; preferences?: string | null; internalNotes?: string | null;
};

export function ClientForm({ initial, canInternal, onSaved }: { initial?: ClientFormValues; canInternal: boolean; onSaved?: (id: string) => void }) {
  const [state, action, pending] = useActionState(saveClientAction, null);
  const toast = useToast();
  const router = useRouter();
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  const dupWarn = !!fe?.duplicate;
  useEffect(() => {
    if (state?.ok) { toast(state.message ?? "Salvo."); router.refresh(); onSaved?.(state.data!.id); }
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <ActionForm action={action} className="flex flex-col gap-4" noValidate>
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      {dupWarn && <input type="hidden" name="ignoreDuplicates" value="1" />}
      <FormMessage state={state} />
      <Field label="Nome completo" htmlFor="fullName" error={fe?.fullName}>
        <Input id="fullName" name="fullName" defaultValue={initial?.fullName} required autoFocus={!initial?.id} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="WhatsApp / telefone" htmlFor="phone" error={fe?.phone} optional>
          <Input id="phone" name="phone" type="tel" inputMode="tel" defaultValue={initial?.phone ?? ""} placeholder="(11) 90000-0000" />
        </Field>
        <Field label="E-mail" htmlFor="email" error={fe?.email} optional>
          <Input id="email" name="email" type="email" defaultValue={initial?.email ?? ""} />
        </Field>
        <Field label="Data de nascimento" htmlFor="birthDate" error={fe?.birthDate} optional hint="Usada apenas para mensagens de aniversário, se houver consentimento.">
          <Input id="birthDate" name="birthDate" type="date" defaultValue={initial?.birthDate ?? ""} />
        </Field>
        <Field label="Prefere ser contatada por" htmlFor="contactPreference">
          <Select id="contactPreference" name="contactPreference" defaultValue={initial?.contactPreference ?? "whatsapp"}>
            <option value="whatsapp">WhatsApp</option><option value="email">E-mail</option><option value="phone">Ligação</option><option value="none">Não contatar</option>
          </Select>
        </Field>
      </div>
      <Field label="Preferências de atendimento" htmlFor="preferences" optional hint="Visível para toda a equipe. Ex.: prefere esmalte claro, gosta de café.">
        <Textarea id="preferences" name="preferences" defaultValue={initial?.preferences ?? ""} maxLength={1000} />
      </Field>
      {canInternal && (
        <Field label="Observações internas" htmlFor="internalNotes" optional hint="Restrito a proprietária, gerência e recepção. Não registre dados de saúde sem necessidade e consentimento.">
          <Textarea id="internalNotes" name="internalNotes" defaultValue={initial?.internalNotes ?? ""} maxLength={2000} />
        </Field>
      )}
      <Checkbox name="marketingConsent" defaultChecked={initial?.marketingConsent}
        label="Aceita receber novidades e promoções"
        description="Registre apenas com autorização da cliente. Lembretes de agendamento não dependem deste consentimento." />
      <div className="flex justify-end pt-2"><SubmitButton pending={pending}>{dupWarn ? "Salvar mesmo assim" : "Salvar"}</SubmitButton></div>
    </ActionForm>
  );
}
