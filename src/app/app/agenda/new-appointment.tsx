"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Search, UserPlus, X } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { formatMoney } from "@/lib/money";
import { formatPhone } from "@/lib/text";
import { cn } from "@/lib/cn";
import type { AgendaProfessional, AgendaService } from "./agenda-view";
import { createAppointmentAction, findSlotsAction, quickCreateClientAction, searchClientsAction } from "./actions";

export type NewDraft = { date: string; time: string; professionalId: string; clientId?: string; clientName?: string };

export function NewAppointmentDialog({
  draft, onClose, onCreated, professionals, services, canCreateClients,
}: {
  draft: NewDraft; onClose: () => void; onCreated: (id: string) => void;
  professionals: AgendaProfessional[]; services: AgendaService[]; canCreateClients: boolean;
}) {
  const toast = useToast();
  const [professionalId, setProfessionalId] = useState(draft.professionalId || professionals[0]?.id || "");
  const [date, setDate] = useState(draft.date);
  const [time, setTime] = useState(draft.time);
  const [pickedServiceIds, setServiceIds] = useState<string[]>([]);
  const [client, setClient] = useState<{ id: string; name: string } | null>(draft.clientId ? { id: draft.clientId, name: draft.clientName ?? "" } : null);
  const [squeezeIn, setSqueezeIn] = useState(false);
  const [status, setStatus] = useState<"confirmed" | "pending">("confirmed");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [slotResult, setSlotResult] = useState<{ key: string; times: string[]; message?: string } | null>(null);
  const [pending, start] = useTransition();

  const pro = professionals.find((p) => p.id === professionalId);
  // Serviços que a profissional atual não realiza são descartados da seleção.
  const serviceIds = useMemo(() => pickedServiceIds.filter((id) => pro?.serviceIds.includes(id)), [pickedServiceIds, pro]);
  const slotKey = professionalId && date && serviceIds.length ? JSON.stringify([professionalId, date, serviceIds]) : null;
  const slots = slotKey === null ? { loading: false, times: [] as string[], message: undefined }
    : slotResult?.key === slotKey ? { loading: false, ...slotResult } : { loading: true, times: [] as string[], message: undefined };
  const available = services.filter((s) => pro?.serviceIds.includes(s.id));
  const chosen = serviceIds.map((id) => services.find((s) => s.id === id)!).filter(Boolean);
  const totalMin = chosen.reduce((a, s) => a + s.minutes, 0);
  const totalPrice = chosen.reduce((a, s) => a + s.priceCents, 0);

  useEffect(() => {
    if (!slotKey) return;
    let cancelled = false;
    const [pid, d, ids] = JSON.parse(slotKey) as [string, string, string[]];
    findSlotsAction({ professionalId: pid, date: d, serviceIds: ids }).then((r) => { if (!cancelled) setSlotResult({ key: slotKey, times: r.times, message: r.message }); });
    return () => { cancelled = true; };
  }, [slotKey]);

  const timeIsFree = !time || slots.times.includes(time);

  const submit = () => {
    setError(null);
    if (!client) return setError("Escolha ou cadastre a cliente.");
    if (serviceIds.length === 0) return setError("Escolha pelo menos um serviço.");
    if (!time) return setError("Escolha o horário.");
    start(async () => {
      const r = await createAppointmentAction({ professionalId, clientId: client.id, date, time, serviceIds, squeezeIn, status, internalNotes: notes || undefined });
      if (r?.ok) { toast(r.message ?? "Agendamento criado."); onCreated(r.data!.id); }
      else if (r) setError(r.message);
    });
  };

  return (
    <Dialog open onClose={onClose} title="Novo agendamento" side="right"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit} disabled={pending}>{pending ? "Agendando…" : "Agendar"}</Button>
      </>}>
      <div className="flex flex-col gap-5">
        {error && <FormMessage state={{ ok: false, message: error }} />}
        <ClientPicker value={client} onChange={setClient} canCreate={canCreateClients} />

        {professionals.length > 1 && (
          <Field label="Profissional" htmlFor="pro">
            <Select id="pro" value={professionalId} onChange={(e) => setProfessionalId(e.target.value)}>
              {professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
        )}

        <fieldset>
          <legend className="mb-1.5 text-[13px] font-medium text-ink-soft">Serviços</legend>
          {available.length === 0 ? (
            <p className="rounded-lg bg-sunken px-3 py-2 text-sm text-muted">Nenhum serviço vinculado a esta profissional. Vincule em Serviços.</p>
          ) : (
            <div className="flex flex-col divide-y divide-line rounded-xl border border-line">
              {available.map((s) => {
                const on = serviceIds.includes(s.id);
                return (
                  <label key={s.id} className={cn("flex cursor-pointer items-center gap-3 px-3 py-2.5 transition hover:bg-hover-tint active:bg-sunken", on && "bg-accent-subtle/60")}>
                    <input type="checkbox" checked={on} className="h-[18px] w-[18px] accent-accent-strong"
                      onChange={() => setServiceIds(on ? serviceIds.filter((x) => x !== s.id) : [...serviceIds, s.id])} />
                    <span className="flex-1 text-sm">{s.name}</span>
                    <span className="text-[13px] text-muted tabular">{s.minutes} min · {formatMoney(s.priceCents)}</span>
                  </label>
                );
              })}
            </div>
          )}
          {chosen.length > 0 && <p className="mt-2 text-[13px] text-ink-soft">Total: <strong className="tabular">{totalMin} min</strong> · <strong className="tabular">{formatMoney(totalPrice)}</strong></p>}
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Data" htmlFor="date"><Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Horário" htmlFor="time"><Input id="time" type="time" step={300} value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        </div>

        {serviceIds.length > 0 && (
          <div>
            <div className="mb-1.5 text-[13px] font-medium text-ink-soft">Horários livres</div>
            {slots.loading ? (
              <div className="flex gap-2">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-8 w-16" />)}</div>
            ) : slots.message ? (
              <p className="text-sm text-danger">{slots.message}</p>
            ) : slots.times.length === 0 ? (
              <p className="text-sm text-muted">Sem horários livres neste dia para essa duração. Escolha outra data ou marque como encaixe.</p>
            ) : (
              <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                {slots.times.map((t) => (
                  <button key={t} type="button" onClick={() => setTime(t)}
                    className={cn("lift h-8 rounded-lg border px-2.5 text-[13px] tabular", t === time ? "border-violet-300 btn-glow text-white" : "border-line-strong bg-surface hover:border-accent")}>
                    {t}
                  </button>
                ))}
              </div>
            )}
            {time && !slots.loading && !timeIsFree && !squeezeIn && (
              <p className="mt-2 rounded-lg bg-st-pending-bg px-3 py-2 text-[13px] text-st-pending">Este horário está ocupado ou fora do expediente. Para agendar mesmo assim, marque como encaixe.</p>
            )}
          </div>
        )}

        <Checkbox checked={squeezeIn} onChange={(e) => setSqueezeIn(e.target.checked)} label="Encaixe"
          description="Permite sobrepor outro atendimento ou agendar fora do expediente. Use com cuidado." />

        <Field label="Status inicial" htmlFor="status">
          <Select id="status" value={status} onChange={(e) => setStatus(e.target.value as "confirmed" | "pending")}>
            <option value="confirmed">Confirmado</option>
            <option value="pending">Aguardando confirmação da cliente</option>
          </Select>
        </Field>
        <Field label="Observação interna" htmlFor="notes" optional>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} placeholder="Visível apenas para a equipe" />
        </Field>
      </div>
    </Dialog>
  );
}

function ClientPicker({ value, onChange, canCreate }: { value: { id: string; name: string } | null; onChange: (c: { id: string; name: string } | null) => void; canCreate: boolean }) {
  const [q, setQ] = useState("");
  const [found, setResults] = useState<{ q: string; rows: { id: string; full_name: string; phone_normalized: string | null }[] }>({ q: "", rows: [] });
  const [creating, setCreating] = useState(false);
  const [phone, setPhone] = useState("");
  const [dups, setDups] = useState<{ id: string; full_name: string; reason: string }[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(() => searchClientsAction(q).then((rows) => setResults({ q, rows })), 200);
    return () => clearTimeout(t);
  }, [q]);
  const results = q.trim().length >= 2 && found.q === q ? found.rows : [];

  const create = (force = false) => start(async () => {
    setErr(null);
    const r = await quickCreateClientAction({ fullName: q, phone, force });
    if (r?.ok && r.data) { onChange({ id: r.data.id, name: r.data.full_name }); setCreating(false); setDups([]); }
    else if (r && !r.ok) {
      const d = r.fieldErrors?.duplicates?.map((x) => JSON.parse(x)) ?? [];
      setDups(d);
      setErr(r.message);
    }
  });

  const showCreate = useMemo(() => canCreate && q.trim().length >= 2, [canCreate, q]);

  if (value)
    return (
      <Field label="Cliente">
        <div className="flex h-10 items-center justify-between rounded-[10px] border border-accent-border bg-accent-subtle px-3">
          <span className="text-sm font-medium text-accent-text">{value.name}</span>
          <button onClick={() => onChange(null)} className="rounded p-1 text-accent-text hover:bg-accent-muted" aria-label="Trocar cliente"><X className="h-4 w-4" /></button>
        </div>
      </Field>
    );

  return (
    <Field label="Cliente" htmlFor="client-q">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input id="client-q" value={q} onChange={(e) => { setQ(e.target.value); setCreating(false); setDups([]); }} placeholder="Nome ou telefone" className="pl-9" autoComplete="off" autoFocus />
      </div>
      {results.length > 0 && !creating && (
        <ul className="mt-1 divide-y divide-line overflow-hidden rounded-xl border border-line">
          {results.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => onChange({ id: c.id, name: c.full_name })} className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-sunken">
                <span className="text-sm">{c.full_name}</span>
                <span className="text-xs text-muted tabular">{formatPhone(c.phone_normalized)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {showCreate && !creating && (
        <button type="button" onClick={() => setCreating(true)} className="mt-1 inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-accent-text hover:underline">
          <UserPlus className="h-3.5 w-3.5" /> Cadastrar “{q.trim()}”
        </button>
      )}
      {creating && (
        <div className="mt-2 flex flex-col gap-2 rounded-xl border border-line bg-canvas p-3">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="WhatsApp com DDD (opcional)" type="tel" inputMode="tel" aria-label="Telefone da nova cliente" />
          {err && <p className="text-[13px] text-danger">{err}</p>}
          {dups.length > 0 && (
            <ul className="flex flex-col gap-1">
              {dups.map((d) => (
                <li key={d.id}>
                  <button type="button" onClick={() => onChange({ id: d.id, name: d.full_name })} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-left text-sm hover:border-accent">
                    Usar <strong>{d.full_name}</strong> <span className="text-xs text-muted">({d.reason})</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>Cancelar</Button>
            <Button size="sm" onClick={() => create(dups.length > 0)} disabled={pending}>{dups.length ? "Criar mesmo assim" : "Cadastrar"}</Button>
          </div>
        </div>
      )}
    </Field>
  );
}
