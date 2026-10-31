"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarOff, Clock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Checkbox, Field, FormMessage, Input, Select } from "@/components/ui/form";
import { Avatar, Badge, Card, CardHeader, EmptyState } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { formatInTz } from "@/lib/time";
import { cn } from "@/lib/cn";
import { addTimeOffAction, removeTimeOffAction, saveHoursAction, saveProfessionalAction, toggleProfessionalAction } from "./actions";
import { plural } from "@/lib/text";

const COLORS = ["#7c3a5c", "#3f6f6a", "#8a5a2b", "#4b5aa8", "#a0466b", "#5f7a3a", "#6b4fa0", "#2f6f8f"];
const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

type Pro = { id: string; display_name: string; specialty: string | null; color: string; commission_percent: number; accepts_online: boolean; is_active: boolean; service_ids: string[]; hours: { weekday: number; start: string; end: string }[] };
type TimeOff = { id: string; professional_id: string | null; professional_name: string | null; starts_at: string; ends_at: string; reason: string | null };

export function TeamManager({ professionals, services, timeOff, timeZone, atLimit, readOnly }: { professionals: Pro[]; services: { id: string; name: string }[]; timeOff: TimeOff[]; timeZone: string; atLimit: boolean; readOnly: boolean }) {
  const [editing, setEditing] = useState<Pro | "new" | null>(null);
  const [hoursFor, setHoursFor] = useState<Pro | null>(null);
  const [blocking, setBlocking] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const act = (p: Promise<{ ok: boolean; message?: string } | null>) => start(async () => {
    const r = await p;
    if (r?.ok) { toast(r.message!); router.refresh(); } else if (r) toast(r.message ?? "Erro", "error");
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Profissionais</h2>
          {!readOnly && <Button size="sm" onClick={() => setEditing("new")} disabled={atLimit} title={atLimit ? "Sua equipe chegou ao limite do plano" : undefined}><Plus className="h-4 w-4" />Adicionar</Button>}
        </div>
        {atLimit && !readOnly && <p className="mb-3 rounded-lg bg-highlight-subtle px-3 py-2 text-[13px] text-highlight-text">Para trazer mais gente para o time, é só mudar de plano. 💜</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {professionals.map((p) => (
            <Card key={p.id} className={cn("p-4", !p.is_active && "opacity-60")}>
              <div className="flex items-start gap-3">
                <Avatar name={p.display_name} color={p.color} className="h-10 w-10 text-sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-medium">{p.display_name}{!p.is_active && <Badge>Inativa</Badge>}</div>
                  <div className="text-[13px] text-muted">{p.specialty || "Sem especialidade"} · {plural(p.service_ids.length, "serviço")}{p.commission_percent ? ` · comissão ${p.commission_percent}%` : ""}</div>
                </div>
              </div>
              <ul className="mt-3 grid grid-cols-1 gap-0.5 text-xs text-ink-soft">
                {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                  const h = p.hours.filter((x) => x.weekday === d);
                  return <li key={d} className="flex justify-between"><span className="text-muted">{DAYS[d]}</span><span className="tabular">{h.length ? h.map((x) => `${x.start}–${x.end}`).join(", ") : "folga"}</span></li>;
                })}
              </ul>
              {!readOnly && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                  <Button size="sm" variant="secondary" onClick={() => setEditing(p)}>Editar</Button>
                  <Button size="sm" variant="secondary" onClick={() => setHoursFor(p)}><Clock className="h-3.5 w-3.5" />Horários</Button>
                  <Button size="sm" variant="ghost" onClick={() => act(toggleProfessionalAction(p.id, !p.is_active))}>{p.is_active ? "Desativar" : "Reativar"}</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      </section>

      <Card>
        <CardHeader title="Folgas, férias e feriados" description="Quando alguém (ou o salão todo) não vai atender"
          action={!readOnly ? <Button size="sm" variant="secondary" onClick={() => setBlocking(true)}><Plus className="h-3.5 w-3.5" />Bloquear</Button> : undefined} />
        <div className="px-5 pt-3 pb-5">
          {timeOff.length === 0 ? (
            <EmptyState className="py-6" icon={CalendarOff} title="Nenhuma folga marcada" description="Os dias bloqueados somem da agenda e do seu link de agendamento." />
          ) : (
            <ul className="divide-y divide-line">
              {timeOff.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{t.professional_name ?? "O salão todo"}{t.reason ? <span className="font-normal text-muted"> · {t.reason}</span> : null}</div>
                    <div className="text-xs text-muted tabular">
                      {formatInTz(new Date(t.starts_at), timeZone, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} → {formatInTz(new Date(t.ends_at), timeZone, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  {!readOnly && <button onClick={() => setRemoveId(t.id)} className="rounded p-1.5 text-muted hover:bg-sunken hover:text-danger" aria-label="Remover bloqueio"><Trash2 className="h-4 w-4" /></button>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {editing && <ProfessionalDialog pro={editing === "new" ? null : editing} services={services} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); router.refresh(); }} />}
      {hoursFor && <HoursDialog pro={hoursFor} onClose={() => setHoursFor(null)} onSaved={() => { setHoursFor(null); router.refresh(); }} />}
      {blocking && <TimeOffDialog professionals={professionals.filter((p) => p.is_active)} onClose={() => setBlocking(false)} onSaved={() => { setBlocking(false); router.refresh(); }} />}
      <ConfirmDialog open={!!removeId} onClose={() => setRemoveId(null)} title="Remover bloqueio?" confirmLabel="Remover" danger
        description="Os horários voltam a ficar livres na agenda e no seu link."
        onConfirm={() => { const id = removeId!; setRemoveId(null); act(removeTimeOffAction(id)); }} />
    </div>
  );
}

function ProfessionalDialog({ pro, services, onClose, onSaved }: { pro: Pro | null; services: { id: string; name: string }[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(pro?.display_name ?? "");
  const [specialty, setSpecialty] = useState(pro?.specialty ?? "");
  const [color, setColor] = useState(pro?.color ?? COLORS[1]!);
  const [commission, setCommission] = useState(String(pro?.commission_percent ?? 0));
  const [online, setOnline] = useState(pro?.accepts_online ?? true);
  const [serviceIds, setServiceIds] = useState<string[]>(pro?.service_ids ?? services.map((s) => s.id));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const save = () => start(async () => {
    const r = await saveProfessionalAction({ displayName: name, specialty: specialty || undefined, color, commissionPercent: commission, acceptsOnline: online, serviceIds }, pro?.id);
    if (r?.ok) { toast(r.message!); onSaved(); } else if (r) setError(r.message);
  });
  return (
    <Dialog open onClose={onClose} title={pro ? "Editar profissional" : "Nova profissional"} side="right"
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={save} disabled={pending}>{pending ? "Salvando…" : "Salvar"}</Button></>}>
      <div className="flex flex-col gap-4">
        {error && <FormMessage state={{ ok: false, message: error }} />}
        <Field label="Nome de exibição" htmlFor="pn"><Input id="pn" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Especialidade" htmlFor="ps" optional><Input id="ps" value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Ex.: Nail designer, lash, cabeleireira" /></Field>
        <fieldset>
          <legend className="mb-1.5 text-[13px] font-medium text-ink-soft">Cor na agenda</legend>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Cor ${c}`} aria-pressed={color === c}
                className={cn("h-8 w-8 rounded-full ring-offset-2", color === c && "ring-2 ring-ink")} style={{ background: c }} />
            ))}
          </div>
        </fieldset>
        <Field label="Comissão padrão (%)" htmlFor="pc" hint="Vai ser usada nos relatórios de comissão (em breve!)."><Input id="pc" type="number" min={0} max={100} value={commission} onChange={(e) => setCommission(e.target.value)} /></Field>
        <Checkbox checked={online} onChange={(e) => setOnline(e.target.checked)} label="Aparece no seu link de agendamento" />
        <fieldset>
          <legend className="mb-1.5 text-[13px] font-medium text-ink-soft">Serviços que ela faz</legend>
          <div className="flex flex-col gap-2">
            {services.map((s) => (
              <Checkbox key={s.id} checked={serviceIds.includes(s.id)} label={s.name}
                onChange={(e) => setServiceIds(e.target.checked ? [...serviceIds, s.id] : serviceIds.filter((x) => x !== s.id))} />
            ))}
          </div>
        </fieldset>
        {!pro && <p className="text-xs text-muted">Ela começa com os mesmos horários da primeira profissional; dá para ajustar em “Horários”.</p>}
      </div>
    </Dialog>
  );
}

function HoursDialog({ pro, onClose, onSaved }: { pro: Pro; onClose: () => void; onSaved: () => void }) {
  const [rows, setRows] = useState(() => [0, 1, 2, 3, 4, 5, 6].map((d) => {
    const h = pro.hours.filter((x) => x.weekday === d);
    return { weekday: d, on: h.length > 0, periods: h.length ? h.map((x) => ({ start: x.start, end: x.end })) : [{ start: "09:00", end: "18:00" }] };
  }));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const upd = (d: number, fn: (r: (typeof rows)[number]) => (typeof rows)[number]) => setRows((rs) => rs.map((r) => (r.weekday === d ? fn(r) : r)));
  const save = () => start(async () => {
    const hours = rows.filter((r) => r.on).flatMap((r) => r.periods.map((p) => ({ weekday: r.weekday, ...p })));
    const r = await saveHoursAction(pro.id, hours);
    if (r?.ok) { toast(r.message!); onSaved(); } else if (r) setError(r.message);
  });
  return (
    <Dialog open onClose={onClose} title={`Horários de ${pro.display_name}`} description="Coloque um segundo período para registrar o almoço ou outras pausas." side="right"
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={save} disabled={pending}>{pending ? "Salvando…" : "Salvar horários"}</Button></>}>
      {error && <div className="mb-3"><FormMessage state={{ ok: false, message: error }} /></div>}
      <ul className="flex flex-col divide-y divide-line">
        {[1, 2, 3, 4, 5, 6, 0].map((d) => {
          const r = rows.find((x) => x.weekday === d)!;
          return (
            <li key={d} className="py-3">
              <div className="flex items-center justify-between">
                <Checkbox checked={r.on} onChange={(e) => upd(d, (x) => ({ ...x, on: e.target.checked }))} label={DAYS[d]} />
                {r.on && r.periods.length < 2 && <button className="text-xs font-medium text-accent-text" onClick={() => upd(d, (x) => ({ ...x, periods: [...x.periods, { start: "14:00", end: "18:00" }] }))}>+ período</button>}
              </div>
              {r.on && (
                <div className="mt-2 flex flex-col gap-2 pl-8">
                  {r.periods.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input type="time" value={p.start} className="h-9 w-28" aria-label={`${DAYS[d]} início ${i + 1}`} onChange={(e) => upd(d, (x) => ({ ...x, periods: x.periods.map((q, j) => (j === i ? { ...q, start: e.target.value } : q)) }))} />
                      <span className="text-muted">–</span>
                      <Input type="time" value={p.end} className="h-9 w-28" aria-label={`${DAYS[d]} fim ${i + 1}`} onChange={(e) => upd(d, (x) => ({ ...x, periods: x.periods.map((q, j) => (j === i ? { ...q, end: e.target.value } : q)) }))} />
                      {i > 0 && <button className="rounded p-1 text-muted hover:text-danger" aria-label="Remover período" onClick={() => upd(d, (x) => ({ ...x, periods: x.periods.filter((_, j) => j !== i) }))}><Trash2 className="h-4 w-4" /></button>}
                    </div>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}

function TimeOffDialog({ professionals, onClose, onSaved }: { professionals: Pro[]; onClose: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [pro, setPro] = useState<string>(professionals.length === 1 ? professionals[0]!.id : "all");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("13:00");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const save = () => start(async () => {
    const r = await addTimeOffAction({
      professionalId: pro === "all" ? null : pro, startDate, endDate, reason: reason || undefined,
      startTime: allDay ? "00:00" : startTime, endTime: allDay ? "23:59" : endTime,
    });
    if (r?.ok) { toast(r.message!); onSaved(); } else if (r) setError(r.message);
  });
  return (
    <Dialog open onClose={onClose} title="Bloquear agenda"
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={save} disabled={pending}>{pending ? "Salvando…" : "Bloquear"}</Button></>}>
      <div className="flex flex-col gap-4">
        {error && <FormMessage state={{ ok: false, message: error }} />}
        <Field label="Quem" htmlFor="tp">
          <Select id="tp" value={pro} onChange={(e) => setPro(e.target.value)}>
            <option value="all">O salão todo (feriado, reforma…)</option>
            {professionals.map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="De" htmlFor="sd"><Input id="sd" type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); if (e.target.value > endDate) setEndDate(e.target.value); }} /></Field>
          <Field label="Até" htmlFor="ed"><Input id="ed" type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} /></Field>
        </div>
        <Checkbox checked={allDay} onChange={(e) => setAllDay(e.target.checked)} label="Dia inteiro" />
        {!allDay && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Das" htmlFor="st"><Input id="st" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></Field>
            <Field label="Às" htmlFor="et"><Input id="et" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></Field>
          </div>
        )}
        <Field label="Motivo" htmlFor="rs" optional><Input id="rs" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: férias, curso, feriado" /></Field>
      </div>
    </Dialog>
  );
}
