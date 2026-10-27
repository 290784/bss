"use client";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveOrganizationAction } from "./actions";
import { Card, CardHeader } from "@/components/ui/primitives";
import { ActionForm, Checkbox, Field, FormMessage, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";

type Org = {
  name: string; phone: string | null; instagram: string | null; address: string | null; online_booking_enabled: boolean; online_requires_approval: boolean;
  min_advance_minutes: number; max_advance_days: number; slot_interval_minutes: number; cancellation_notice_hours: number; booking_policy_text: string | null;
};

export function OrganizationForm({ org, readOnly }: { org: Org; readOnly: boolean }) {
  const [state, action, pending] = useActionState(saveOrganizationAction, null);
  const toast = useToast();
  const router = useRouter();
  useEffect(() => { if (state?.ok) { toast(state.message!); router.refresh(); } }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <ActionForm action={action} className="flex flex-col gap-6">
      <FormMessage state={state} />
      <Card>
        <CardHeader title="Dados do negócio" />
        <fieldset disabled={readOnly} className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Nome" htmlFor="name" error={fe?.name} className="sm:col-span-2"><Input id="name" name="name" defaultValue={org.name} /></Field>
          <Field label="WhatsApp" htmlFor="phone" optional><Input id="phone" name="phone" type="tel" defaultValue={org.phone ?? ""} /></Field>
          <Field label="Instagram" htmlFor="instagram" optional><Input id="instagram" name="instagram" defaultValue={org.instagram ? `@${org.instagram}` : ""} placeholder="@seunegocio" /></Field>
          <Field label="Endereço" htmlFor="address" optional className="sm:col-span-2"><Input id="address" name="address" defaultValue={org.address ?? ""} /></Field>
        </fieldset>
      </Card>
      <Card>
        <CardHeader title="Regras de agendamento" description="Valem para a agenda e para a página pública" />
        <fieldset disabled={readOnly} className="grid gap-4 p-5 sm:grid-cols-2">
          <Checkbox name="onlineBookingEnabled" defaultChecked={org.online_booking_enabled} label="Agendamento online ativo" className="sm:col-span-2" />
          <Checkbox name="onlineRequiresApproval" defaultChecked={org.online_requires_approval} className="sm:col-span-2"
            label="Revisar solicitações online antes de confirmar" description="Desmarcado, os horários escolhidos online já entram como confirmados." />
          <Field label="Antecedência mínima" htmlFor="minAdvanceMinutes" hint="Para agendamentos online.">
            <Select id="minAdvanceMinutes" name="minAdvanceMinutes" defaultValue={String(org.min_advance_minutes)}>
              {[[0, "Sem mínimo"], [60, "1 hora"], [120, "2 horas"], [240, "4 horas"], [720, "12 horas"], [1440, "1 dia"], [2880, "2 dias"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Abrir agenda com até" htmlFor="maxAdvanceDays" error={fe?.maxAdvanceDays}>
            <Select id="maxAdvanceDays" name="maxAdvanceDays" defaultValue={String(org.max_advance_days)}>
              {[7, 14, 30, 60, 90, 180].map((v) => <option key={v} value={v}>{v} dias</option>)}
            </Select>
          </Field>
          <Field label="Intervalo entre horários" htmlFor="slotIntervalMinutes">
            <Select id="slotIntervalMinutes" name="slotIntervalMinutes" defaultValue={String(org.slot_interval_minutes)}>
              {[5, 10, 15, 20, 30, 60].map((v) => <option key={v} value={v}>A cada {v} min</option>)}
            </Select>
          </Field>
          <Field label="Cancelamento sem custo até" htmlFor="cancellationNoticeHours" hint="Exibido na política para a cliente.">
            <Select id="cancellationNoticeHours" name="cancellationNoticeHours" defaultValue={String(org.cancellation_notice_hours)}>
              {[0, 2, 6, 12, 24, 48, 72].map((v) => <option key={v} value={v}>{v === 0 ? "Qualquer momento" : `${v}h antes`}</option>)}
            </Select>
          </Field>
          <Field label="Política de agendamento" htmlFor="bookingPolicyText" optional className="sm:col-span-2" hint="Ex.: tolerância de atraso, sinal, regras de remarcação.">
            <Textarea id="bookingPolicyText" name="bookingPolicyText" defaultValue={org.booking_policy_text ?? ""} maxLength={2000} />
          </Field>
        </fieldset>
      </Card>
      {!readOnly && <div className="flex justify-end"><SubmitButton pending={pending}>Salvar configurações</SubmitButton></div>}
    </ActionForm>
  );
}
