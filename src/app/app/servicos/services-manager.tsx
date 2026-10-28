"use client";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe, Plus, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ActionForm, Checkbox, Field, FormMessage, Input, SubmitButton, Textarea } from "@/components/ui/form";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { formatMoney } from "@/lib/money";
import type { ServiceRow } from "@/server/modules/catalog";
import { saveServiceAction, toggleServiceAction } from "./actions";

export function ServicesManager({ services, professionals, readOnly }: { services: ServiceRow[]; professionals: { id: string; name: string }[]; readOnly: boolean }) {
  const [editing, setEditing] = useState<ServiceRow | "new" | null>(null);
  const [, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const groups = new Map<string, ServiceRow[]>();
  for (const s of services) {
    const k = s.is_active ? s.category ?? "Sem categoria" : "Inativos";
    groups.set(k, [...(groups.get(k) ?? []), s]);
  }
  return (
    <>
      {!readOnly && <div className="mb-4 flex justify-end"><Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" />Novo serviço</Button></div>}
      {services.length === 0 ? (
        <Card><EmptyState icon={Scissors} title="Nenhum serviço cadastrado" description="Cadastre seus serviços para poder agendar e abrir o agendamento online." /></Card>
      ) : (
        <div className="flex flex-col gap-6">
          {[...groups.entries()].map(([cat, list]) => (
            <section key={cat}>
              <h2 className="mb-2 text-[13px] font-semibold tracking-wide text-muted uppercase">{cat}</h2>
              <Card className="divide-y divide-line">
                {list.map((s) => (
                  <div key={s.id} className="flex flex-col gap-2 px-4 py-3 transition hover:bg-hover-tint sm:flex-row sm:items-center">
                    <button className="min-w-0 flex-1 text-left" onClick={() => !readOnly && setEditing(s)} disabled={readOnly}>
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {s.name}
                        {s.online_bookable && s.is_active && <Badge variant="plum"><Globe className="h-3 w-3" />Online</Badge>}
                        {s.professional_ids.length === 0 && s.is_active && <Badge variant="warning">Sem profissional</Badge>}
                      </div>
                      <div className="mt-0.5 text-[13px] text-muted">
                        {s.duration_minutes} min{s.buffer_after_minutes ? ` + ${s.buffer_after_minutes} min de preparação` : ""}
                        {s.return_interval_days ? ` · retorno sugerido em ${s.return_interval_days} dias` : ""}
                      </div>
                    </button>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold tabular">{formatMoney(s.price_cents)}</span>
                      {!readOnly && (
                        <Button size="sm" variant="ghost" onClick={() => start(async () => {
                          const r = await toggleServiceAction(s.id, !s.is_active);
                          if (r?.ok) { toast(r.message!); router.refresh(); } else if (r) toast(r.message, "error");
                        })}>{s.is_active ? "Desativar" : "Reativar"}</Button>
                      )}
                    </div>
                  </div>
                ))}
              </Card>
            </section>
          ))}
        </div>
      )}
      {editing && (
        <ServiceDialog key={editing === "new" ? "new" : editing.id} service={editing === "new" ? null : editing} professionals={professionals}
          categories={[...new Set(services.map((s) => s.category).filter(Boolean) as string[])]} onClose={() => setEditing(null)} />
      )}
    </>
  );
}

function ServiceDialog({ service, professionals, categories, onClose }: { service: ServiceRow | null; professionals: { id: string; name: string }[]; categories: string[]; onClose: () => void }) {
  const [state, action, pending] = useActionState(saveServiceAction, null);
  const toast = useToast();
  const router = useRouter();
  useEffect(() => { if (state?.ok) { toast(state.message!); router.refresh(); onClose(); } }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <Dialog open onClose={onClose} title={service ? "Editar serviço" : "Novo serviço"} side="right">
      <ActionForm action={action} className="flex flex-col gap-4" noValidate>
        {service && <input type="hidden" name="id" value={service.id} />}
        <FormMessage state={state} />
        <Field label="Nome" htmlFor="name" error={fe?.name}><Input id="name" name="name" defaultValue={service?.name} required /></Field>
        <Field label="Categoria" htmlFor="categoryName" optional>
          <Input id="categoryName" name="categoryName" defaultValue={service?.category ?? ""} list="cats" />
          <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Preço (R$)" htmlFor="price" error={fe?.price}><Input id="price" name="price" inputMode="decimal" defaultValue={service ? (service.price_cents / 100).toFixed(2).replace(".", ",") : ""} required /></Field>
          <Field label="Duração (min)" htmlFor="durationMinutes" error={fe?.durationMinutes}><Input id="durationMinutes" name="durationMinutes" type="number" min={5} step={5} defaultValue={service?.duration_minutes ?? 60} /></Field>
          <Field label="Preparação/limpeza (min)" htmlFor="bufferAfterMinutes" hint="Bloqueado após o atendimento."><Input id="bufferAfterMinutes" name="bufferAfterMinutes" type="number" min={0} step={5} defaultValue={service?.buffer_after_minutes ?? 0} /></Field>
          <Field label="Retorno sugerido (dias)" htmlFor="returnIntervalDays" optional><Input id="returnIntervalDays" name="returnIntervalDays" type="number" min={1} defaultValue={service?.return_interval_days ?? ""} /></Field>
        </div>
        <Field label="Descrição" htmlFor="description" optional hint="Aparece na página de agendamento online."><Textarea id="description" name="description" defaultValue={service?.description ?? ""} maxLength={1000} /></Field>
        <fieldset>
          <legend className="mb-1.5 text-[13px] font-medium text-ink-soft">Quem realiza</legend>
          <div className="flex flex-col gap-2">
            {professionals.map((p) => <Checkbox key={p.id} name="professionalIds" value={p.id} defaultChecked={service ? service.professional_ids.includes(p.id) : true} label={p.name} />)}
          </div>
        </fieldset>
        <Checkbox name="onlineBookable" defaultChecked={service?.online_bookable ?? true} label="Disponível no agendamento online" />
        <div className="flex justify-end pt-2"><SubmitButton pending={pending}>Salvar serviço</SubmitButton></div>
      </ActionForm>
    </Dialog>
  );
}
