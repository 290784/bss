"use client";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, Copy, Flame, Globe, Percent, Plus, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ActionForm, Checkbox, Field, FormMessage, Input, SubmitButton, Textarea } from "@/components/ui/form";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { formatMoney } from "@/lib/money";
import type { ServiceRow, ServiceStats } from "@/server/modules/catalog";
import { adjustedPrice, perHour } from "@/domain/pricing";
import { cn } from "@/lib/cn";
import { adjustPricesAction, saveServiceAction, toggleServiceAction } from "./actions";

export function ServicesManager({ services, professionals, readOnly, stats = {} }: { services: ServiceRow[]; professionals: { id: string; name: string }[]; readOnly: boolean; stats?: Record<string, ServiceStats> }) {
  const [editing, setEditing] = useState<{ service: ServiceRow | null; copy?: boolean } | null>(null);
  const [adjusting, setAdjusting] = useState(false);
  const [, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const groups = new Map<string, ServiceRow[]>();
  for (const s of services) {
    const k = s.is_active ? s.category ?? "Sem categoria" : "Pausados";
    groups.set(k, [...(groups.get(k) ?? []), s]);
  }
  const active = services.filter((s) => s.is_active);
  const topId = active.map((s) => [s.id, stats[s.id]?.count30 ?? 0] as const).filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1])[0]?.[0];
  const noPro = active.filter((s) => s.professional_ids.length === 0).length;
  const noReturn = active.filter((s) => !s.return_interval_days).length;
  const online = active.filter((s) => s.online_bookable).length;
  const revenue30 = active.reduce((t, s) => t + (stats[s.id]?.revenue30 ?? 0), 0);

  return (
    <>
      {services.length > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card className="p-4"><div className="text-[13px] text-muted">No cardápio</div><div className="mt-1 text-xl font-semibold tabular">{active.length}</div><div className="text-xs text-muted">{online} no seu link</div></Card>
          <Card className="p-4"><div className="text-[13px] text-muted">Rendeu em 30 dias</div><div className="mt-1 text-xl font-semibold tabular">{formatMoney(revenue30)}</div><div className="text-xs text-muted">em serviços feitos</div></Card>
          <Card className={cn("p-4", noPro > 0 && "border-st-pending/40")}><div className="text-[13px] text-muted">Sem ninguém para fazer</div><div className={cn("mt-1 text-xl font-semibold tabular", noPro > 0 && "text-st-pending")}>{noPro}</div><div className="text-xs text-muted">{noPro ? "não aparecem para marcar" : "tudo certo"}</div></Card>
          <Card className="p-4"><div className="text-[13px] text-muted">Sem tempo de retorno</div><div className="mt-1 text-xl font-semibold tabular">{noReturn}</div><div className="text-xs text-muted">{noReturn ? "complete para eu avisar quem precisa voltar" : "tudo certo"}</div></Card>
        </div>
      )}
      {!readOnly && (
        <div className="mb-4 flex flex-wrap justify-end gap-2">
          {active.length > 0 && <Button variant="secondary" onClick={() => setAdjusting(true)}><Percent className="h-4 w-4" />Reajustar preços</Button>}
          <Button onClick={() => setEditing({ service: null })}><Plus className="h-4 w-4" />Novo serviço</Button>
        </div>
      )}
      {services.length === 0 ? (
        <Card><EmptyState icon={Scissors} title="Nenhum serviço por aqui ainda" description="Cadastre seus serviços para começar a marcar horários e liberar o seu link de agendamento." /></Card>
      ) : (
        <div className="flex flex-col gap-6">
          {[...groups.entries()].map(([cat, list]) => (
            <section key={cat}>
              <h2 className="mb-2 text-[13px] font-semibold tracking-wide text-muted uppercase">{cat}</h2>
              <Card className="divide-y divide-line">
                {list.map((s) => {
                  const st = stats[s.id];
                  const change = st && st.countPrev30 > 0 ? Math.round(((st.count30 - st.countPrev30) / st.countPrev30) * 100) : null;
                  return (
                    <div key={s.id} className="flex flex-col gap-2 px-4 py-3 transition hover:bg-hover-tint sm:flex-row sm:items-center">
                      <button className="min-w-0 flex-1 text-left" onClick={() => !readOnly && setEditing({ service: s })} disabled={readOnly}>
                        <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                          {s.name}
                          {s.id === topId && <Badge variant="champagne"><Flame className="h-3 w-3" />Mais vendido</Badge>}
                          {s.online_bookable && s.is_active && <Badge variant="plum"><Globe className="h-3 w-3" />Online</Badge>}
                          {s.professional_ids.length === 0 && s.is_active && <Badge variant="warning">Ninguém faz ainda</Badge>}
                        </div>
                        <div className="mt-0.5 text-[13px] text-muted">
                          {s.duration_minutes} min{s.buffer_after_minutes ? ` + ${s.buffer_after_minutes} min de preparo` : ""}
                          {s.return_interval_days ? ` · ideal voltar em ${s.return_interval_days} dias` : ""}
                        </div>
                        {s.is_active && (
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-soft">
                            <span className="tabular">{st?.count30 ? `${st.count30}× nos últimos 30 dias` : "Nenhum nos últimos 30 dias"}</span>
                            {change !== null && change !== 0 && (
                              <span className={cn("inline-flex items-center gap-0.5 font-medium tabular", change > 0 ? "text-st-completed" : "text-st-noshow")}>
                                {change > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{Math.abs(change)}%
                              </span>
                            )}
                            <span className="text-muted tabular" title="Preço dividido pelo tempo de agenda que ele ocupa (atendimento + preparo)">{formatMoney(perHour(s.price_cents, s.duration_minutes, s.buffer_after_minutes))}/hora</span>
                          </div>
                        )}
                      </button>
                      <div className="flex items-center gap-1.5">
                        <span className="mr-1 text-sm font-semibold tabular">{formatMoney(s.price_cents)}</span>
                        {!readOnly && (
                          <>
                            <Button size="icon" variant="ghost" className="h-9 w-9" aria-label={`Duplicar ${s.name}`} title="Duplicar" onClick={() => setEditing({ service: s, copy: true })}><Copy className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => start(async () => {
                              const r = await toggleServiceAction(s.id, !s.is_active);
                              if (r?.ok) { toast(r.message!); router.refresh(); } else if (r) toast(r.message, "error");
                            })}>{s.is_active ? "Pausar" : "Reativar"}</Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </Card>
            </section>
          ))}
        </div>
      )}
      {editing && (
        <ServiceDialog key={editing.service ? `${editing.service.id}-${editing.copy ? "c" : "e"}` : "new"} service={editing.service} copy={editing.copy} professionals={professionals}
          categories={[...new Set(services.map((s) => s.category).filter(Boolean) as string[])]} onClose={() => setEditing(null)} />
      )}
      {adjusting && <AdjustPricesDialog services={active} onClose={() => setAdjusting(false)} />}
    </>
  );
}

/** Reajuste em lote: escolhe serviços (por categoria), porcentagem e arredondamento, vê a prévia e aplica. */
function AdjustPricesDialog({ services, onClose }: { services: ServiceRow[]; onClose: () => void }) {
  const toast = useToast();
  const router = useRouter();
  const [percent, setPercent] = useState("8");
  const [roundTo, setRoundTo] = useState(500);
  const [cat, setCat] = useState<string>("todas");
  const [picked, setPicked] = useState<Set<string>>(() => new Set(services.map((s) => s.id)));
  const [pending, start] = useTransition();
  const cats = [...new Set(services.map((s) => s.category ?? "Sem categoria"))];
  const pct = Number(percent.replace(",", "."));
  const valid = Number.isFinite(pct) && pct > -50 && pct <= 100 && pct !== 0;
  const list = services.filter((s) => cat === "todas" || (s.category ?? "Sem categoria") === cat);
  const chosen = list.filter((s) => picked.has(s.id));
  const pickCat = (c: string) => { setCat(c); setPicked(new Set(services.filter((s) => c === "todas" || (s.category ?? "Sem categoria") === c).map((s) => s.id))); };
  return (
    <Dialog open onClose={onClose} title="Reajustar preços" side="right">
      <p className="-mt-1 mb-4 text-sm text-ink-soft">Um reajuste de 5 a 10% por ano costuma passar despercebido. Avise as clientes fiéis com antecedência: elas adoram esse cuidado. 💜</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Reajuste (%)" htmlFor="pct" hint="Use negativo para baixar.">
          <Input id="pct" inputMode="decimal" value={percent} onChange={(e) => setPercent(e.target.value)} />
        </Field>
        <Field label="Arredondar para" htmlFor="round">
          <select id="round" value={roundTo} onChange={(e) => setRoundTo(Number(e.target.value))}
            className="h-10 w-full rounded-[10px] border border-line-strong bg-surface px-2.5 text-sm focus:border-accent focus:outline-none">
            <option value={0}>Não arredondar</option><option value={100}>R$ 1 acima</option><option value={500}>R$ 5 acima</option><option value={1000}>R$ 10 acima</option>
          </select>
        </Field>
      </div>
      {cats.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {["todas", ...cats].map((c) => (
            <button key={c} type="button" onClick={() => pickCat(c)} aria-pressed={cat === c}
              className={cn("h-9 rounded-full border px-3 text-[13px] font-medium", cat === c ? "border-transparent bg-accent text-white" : "border-line bg-surface text-ink-soft")}>
              {c === "todas" ? "Todos" : c}
            </button>
          ))}
        </div>
      )}
      <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
        {list.map((s) => {
          const next = valid ? adjustedPrice(s.price_cents, pct, roundTo) : s.price_cents;
          return (
            <li key={s.id}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-[var(--color-accent)]" checked={picked.has(s.id)}
                  onChange={() => setPicked((cur) => { const n = new Set(cur); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); return n; })} />
                <span className="min-w-0 flex-1 truncate">{s.name}</span>
                <span className="text-xs text-muted tabular line-through">{formatMoney(s.price_cents)}</span>
                <span className={cn("w-24 text-right font-semibold tabular", picked.has(s.id) ? "text-ink" : "text-muted")}>{formatMoney(picked.has(s.id) ? next : s.price_cents)}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button disabled={!valid || chosen.length === 0 || pending} onClick={() => start(async () => {
          const r = await adjustPricesAction({ serviceIds: chosen.map((s) => s.id), percent: pct, roundTo });
          if (r?.ok) { toast(r.message!); router.refresh(); onClose(); } else if (r) toast(r.message, "error");
        })}>{pending ? "Aplicando…" : `Aplicar em ${chosen.length} ${chosen.length === 1 ? "serviço" : "serviços"}`}</Button>
      </div>
    </Dialog>
  );
}

function ServiceDialog({ service, copy, professionals, categories, onClose }: { service: ServiceRow | null; copy?: boolean; professionals: { id: string; name: string }[]; categories: string[]; onClose: () => void }) {
  const [state, action, pending] = useActionState(saveServiceAction, null);
  const toast = useToast();
  const router = useRouter();
  useEffect(() => { if (state?.ok) { toast(state.message!); router.refresh(); onClose(); } }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <Dialog open onClose={onClose} title={copy ? "Duplicar serviço" : service ? "Editar serviço" : "Novo serviço"} side="right">
      <ActionForm action={action} className="flex flex-col gap-4" noValidate>
        {service && !copy && <input type="hidden" name="id" value={service.id} />}
        {copy && <p className="rounded-xl bg-accent-subtle/60 px-3 py-2 text-[13px] text-ink-soft">Uma cópia com tudo preenchido: é só mudar o que for diferente (ex.: “Manicure + esmaltação em gel”).</p>}
        <FormMessage state={state} />
        <Field label="Nome" htmlFor="name" error={fe?.name}><Input id="name" name="name" defaultValue={copy && service ? `${service.name} (cópia)` : service?.name} required /></Field>
        <Field label="Categoria" htmlFor="categoryName" optional>
          <Input id="categoryName" name="categoryName" defaultValue={service?.category ?? ""} list="cats" />
          <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Preço (R$)" htmlFor="price" error={fe?.price}><Input id="price" name="price" inputMode="decimal" defaultValue={service ? (service.price_cents / 100).toFixed(2).replace(".", ",") : ""} required /></Field>
          <Field label="Duração (min)" htmlFor="durationMinutes" error={fe?.durationMinutes}><Input id="durationMinutes" name="durationMinutes" type="number" min={5} step={5} defaultValue={service?.duration_minutes ?? 60} /></Field>
          <Field label="Preparo e limpeza (min)" htmlFor="bufferAfterMinutes" hint="Fica reservado depois do atendimento."><Input id="bufferAfterMinutes" name="bufferAfterMinutes" type="number" min={0} step={5} defaultValue={service?.buffer_after_minutes ?? 0} /></Field>
          <Field label="Ideal voltar em (dias)" htmlFor="returnIntervalDays" optional><Input id="returnIntervalDays" name="returnIntervalDays" type="number" min={1} defaultValue={service?.return_interval_days ?? ""} /></Field>
        </div>
        <Field label="Descrição" htmlFor="description" optional hint="Aparece no seu link de agendamento."><Textarea id="description" name="description" defaultValue={service?.description ?? ""} maxLength={1000} /></Field>
        <fieldset>
          <legend className="mb-1.5 text-[13px] font-medium text-ink-soft">Quem faz</legend>
          <div className="flex flex-col gap-2">
            {professionals.map((p) => <Checkbox key={p.id} name="professionalIds" value={p.id} defaultChecked={service ? service.professional_ids.includes(p.id) : true} label={p.name} />)}
          </div>
        </fieldset>
        <Checkbox name="onlineBookable" defaultChecked={service?.online_bookable ?? true} label="Aparece no seu link de agendamento" />
        <Checkbox name="offerAsExtra" defaultChecked={service?.offer_as_extra ?? true} label="Pode ser oferecido como extra no WhatsApp"
          description="Depois que a cliente confirma o horário, a Gê pode sugerir este serviço se ele couber logo depois." />
        <div className="flex justify-end pt-2"><SubmitButton pending={pending}>Salvar serviço</SubmitButton></div>
      </ActionForm>
    </Dialog>
  );
}
