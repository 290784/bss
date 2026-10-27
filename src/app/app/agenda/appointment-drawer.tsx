"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { CalendarClock, Globe, MessageCircle, Phone, Receipt, Undo2, Zap } from "lucide-react";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormMessage, Input, Select } from "@/components/ui/form";
import { Badge, Skeleton, StatusBadge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { formatInTz, localDateKey, localTime } from "@/lib/time";
import { formatMoney, parseMoneyToCents } from "@/lib/money";
import { formatPhone } from "@/lib/text";
import { canReschedule, nextStatuses, STATUS_LABEL, type AppointmentStatus } from "@/domain/appointment-status";
import type { AgendaProfessional } from "./agenda-view";
import { changeStatusAction, getAppointmentAction, recordPaymentAction, refundAction, rescheduleAction, type AppointmentDetailDTO } from "./actions";

const METHOD_LABEL: Record<string, string> = { pix: "PIX", cash: "Dinheiro", credit_card: "Crédito", debit_card: "Débito", bank_transfer: "Transferência", other: "Outro" };
const MSG_STATUS: Record<string, { label: string; variant: "neutral" | "success" | "warning" | "danger" }> = {
  pending: { label: "Agendada", variant: "neutral" }, processing: { label: "Enviando", variant: "warning" }, sent: { label: "Enviada", variant: "success" },
  failed: { label: "Falhou", variant: "danger" }, cancelled: { label: "Cancelada", variant: "neutral" }, skipped: { label: "Não enviada", variant: "warning" },
};
const TEMPLATE_LABEL: Record<string, string> = { appointment_confirmation: "Confirmação", appointment_reminder: "Lembrete 24h antes", appointment_cancelled: "Aviso de cancelamento" };
const ACTION_LABEL: Partial<Record<AppointmentStatus, string>> = { confirmed: "Confirmar", completed: "Concluir atendimento", no_show: "Marcar falta", pending: "Voltar para aguardando", cancelled: "Cancelar" };

export function AppointmentDrawer({ id, timeZone, professionals, readOnly, onClose, onChanged }: {
  id: string; timeZone: string; professionals: AgendaProfessional[]; readOnly: boolean; onClose: () => void; onChanged: () => void;
}) {
  const toast = useToast();
  const [data, setData] = useState<AppointmentDetailDTO | null | undefined>(undefined);
  const [mode, setMode] = useState<"view" | "reschedule" | "pay">("view");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const load = useCallback(() => getAppointmentAction(id).then(setData), [id]);
  useEffect(() => { load(); }, [load]);

  const run = (fn: () => Promise<{ ok: boolean; message?: string } | null>) => start(async () => {
    setError(null);
    const r = await fn();
    if (r?.ok) { toast(r.message ?? "Atualizado."); setMode("view"); await load(); onChanged(); }
    else if (r) setError(r.message ?? "Erro.");
  });

  if (data === null)
    return <Dialog open onClose={onClose} title="Agendamento" side="right"><p className="text-sm text-muted">Agendamento não encontrado ou sem permissão de acesso.</p></Dialog>;

  const start_ = data ? new Date(data.startsAt) : null;
  const due = data ? data.priceCents - data.discountCents : 0;
  const paid = data ? data.payments.reduce((a, p) => a + (p.kind === "payment" ? p.amount_cents : -p.amount_cents), 0) : 0;

  return (
    <>
      <Dialog open onClose={onClose} side="right"
        title={data ? data.clientName : "Carregando…"}
        description={data && start_ ? <span className="first-letter:uppercase">{formatInTz(start_, timeZone, { weekday: "long", day: "2-digit", month: "long" })} · {localTime(start_, timeZone)}–{localTime(new Date(data.endsAt), timeZone)}</span> : undefined}
        footer={data && !readOnly && mode === "view" ? (
          <div className="flex w-full flex-wrap gap-2">
            {nextStatuses(data.status).filter((s) => s !== "cancelled").map((s) => (
              <Button key={s} variant={s === "completed" || s === "confirmed" ? "primary" : "secondary"} size="sm" disabled={pending}
                onClick={() => run(() => changeStatusAction({ appointmentId: data.id, status: s }))}>
                {ACTION_LABEL[s]}
              </Button>
            ))}
            {canReschedule(data.status) && <Button variant="secondary" size="sm" onClick={() => setMode("reschedule")}><CalendarClock className="h-3.5 w-3.5" />Reagendar</Button>}
            {data.canRecordPayment && data.status !== "cancelled" && paid < due && <Button variant="secondary" size="sm" onClick={() => setMode("pay")}><Receipt className="h-3.5 w-3.5" />Registrar pagamento</Button>}
            {nextStatuses(data.status).includes("cancelled") && <Button variant="danger" size="sm" className="ml-auto" onClick={() => setConfirmCancel(true)}>Cancelar</Button>}
          </div>
        ) : undefined}>
        {!data ? (
          <div className="flex flex-col gap-3"><Skeleton className="h-6 w-40" /><Skeleton className="h-20 w-full" /><Skeleton className="h-32 w-full" /></div>
        ) : (
          <div className="flex flex-col gap-6">
            {error && <FormMessage state={{ ok: false, message: error }} />}
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={data.status} />
              {data.source === "online" && <Badge variant="plum"><Globe className="h-3 w-3" />Online</Badge>}
              {data.squeezeIn && <Badge variant="champagne"><Zap className="h-3 w-3" />Encaixe</Badge>}
            </div>

            {mode === "reschedule" && (
              <RescheduleForm data={data} timeZone={timeZone} professionals={professionals} pending={pending} onCancel={() => setMode("view")}
                onSubmit={(v) => run(() => rescheduleAction({ appointmentId: data.id, expectedVersion: data.version, ...v }))} />
            )}
            {mode === "pay" && (
              <PaymentForm remaining={due - paid} pending={pending} onCancel={() => setMode("view")}
                onSubmit={(v) => run(() => recordPaymentAction({ appointmentId: data.id, ...v }))} />
            )}

            <section className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Profissional" value={data.professionalName} />
              <Info label="Contato" value={data.clientPhone ? (
                <span className="flex items-center gap-2">
                  <span className="tabular">{formatPhone(data.clientPhone)}</span>
                  <a href={`https://wa.me/${data.clientPhone}`} target="_blank" rel="noreferrer" className="text-accent-text" aria-label="Abrir WhatsApp"><MessageCircle className="h-4 w-4" /></a>
                  <a href={`tel:+${data.clientPhone}`} className="text-accent-text" aria-label="Ligar"><Phone className="h-4 w-4" /></a>
                </span>) : "—"} />
              <Info label="Ficha" value={<Link href={`/app/clientes/${data.clientId}`} className="font-medium text-accent-text hover:underline">Ver histórico da cliente</Link>} />
            </section>

            <section>
              <h3 className="mb-2 text-[13px] font-semibold text-ink-soft">Serviços</h3>
              <ul className="divide-y divide-line rounded-xl border border-line text-sm">
                {data.services.map((s, i) => (
                  <li key={i} className="flex justify-between px-3 py-2"><span>{s.service_name}</span><span className="text-muted tabular">{s.duration_minutes} min · {formatMoney(s.price_cents)}</span></li>
                ))}
                <li className="flex justify-between bg-canvas/60 px-3 py-2 font-medium"><span>Total</span><span className="tabular">{formatMoney(due)}</span></li>
              </ul>
            </section>

            {data.canSeeFinance && (
              <section>
                <h3 className="mb-2 flex items-center justify-between text-[13px] font-semibold text-ink-soft">
                  Pagamentos
                  <span className="font-normal text-muted">Pago <strong className="text-ink tabular">{formatMoney(paid)}</strong> de <span className="tabular">{formatMoney(due)}</span></span>
                </h3>
                {data.payments.length === 0 ? <p className="text-sm text-muted">Nenhum pagamento registrado.</p> : (
                  <ul className="divide-y divide-line rounded-xl border border-line text-sm">
                    {data.payments.map((p) => (
                      <PaymentRow key={p.id} p={p} timeZone={timeZone} refunded={data.payments.filter((r) => r.refund_of === p.id).reduce((a, r) => a + r.amount_cents, 0)}
                        canRefund={data.canRecordPayment && !readOnly} onRefund={(amountCents, reason) => run(() => refundAction({ paymentId: p.id, amountCents, reason }))} />
                    ))}
                  </ul>
                )}
              </section>
            )}

            {(data.clientNotes || data.internalNotes || data.cancelReason) && (
              <section className="space-y-2 text-sm">
                {data.clientNotes && <Info label="Observação da cliente" value={data.clientNotes} />}
                {data.internalNotes && <Info label="Observação interna" value={data.internalNotes} />}
                {data.cancelReason && <Info label="Motivo do cancelamento" value={data.cancelReason} />}
              </section>
            )}

            <section>
              <h3 className="mb-2 text-[13px] font-semibold text-ink-soft">Mensagens automáticas</h3>
              {data.messages.length === 0 ? (
                <p className="text-sm text-muted">Nenhuma mensagem prevista (cliente sem contato ou prefere não receber).</p>
              ) : (
                <ul className="flex flex-col gap-1.5 text-sm">
                  {data.messages.map((m, i) => (
                    <li key={i} className="flex items-center justify-between gap-2">
                      <span>{TEMPLATE_LABEL[m.template] ?? m.template} <span className="text-xs text-muted">· {m.channel === "whatsapp" ? "WhatsApp" : "E-mail"}</span></span>
                      <Badge variant={MSG_STATUS[m.status]?.variant}>{MSG_STATUS[m.status]?.label ?? m.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
              {data.messages.some((m) => m.last_error === "Canal não conectado") && (
                <p className="mt-2 text-xs text-muted">O canal de envio ainda não está conectado. Nenhuma mensagem foi enviada à cliente.</p>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-[13px] font-semibold text-ink-soft">Histórico</h3>
              <ol className="relative flex flex-col gap-3 border-l border-line pl-4 text-[13px]">
                {data.events.map((e, i) => (
                  <li key={i}>
                    <span className="absolute -left-[4.5px] mt-1.5 h-2 w-2 rounded-full bg-line-strong" aria-hidden />
                    <div className="text-ink">{describeEvent(e, timeZone)}</div>
                    <div className="text-xs text-muted">{formatInTz(new Date(e.created_at), timeZone, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        )}
      </Dialog>
      <ConfirmDialog open={confirmCancel} onClose={() => setConfirmCancel(false)} danger title="Cancelar agendamento?" confirmLabel="Cancelar agendamento"
        description="O horário será liberado e os lembretes pendentes serão cancelados. Pagamentos já registrados continuam no histórico."
        onConfirm={() => { setConfirmCancel(false); if (data) run(() => changeStatusAction({ appointmentId: data.id, status: "cancelled", reason: cancelReason || undefined })); }}>
        <Field label="Motivo" htmlFor="reason" optional className="mt-4">
          <Input id="reason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} maxLength={300} />
        </Field>
      </ConfirmDialog>
    </>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><div className="text-xs text-muted">{label}</div><div className="mt-0.5 text-ink">{value}</div></div>;
}

function describeEvent(e: { type: string; data: Record<string, unknown> }, tz: string) {
  const d = e.data;
  switch (e.type) {
    case "created": return d.source === "online" ? "Solicitado pela página de agendamento online" : "Agendamento criado pela equipe";
    case "rescheduled": return `Reagendado de ${fmt(String(d.from), tz)} para ${fmt(String(d.to), tz)}`;
    case "status_changed": return `Status: ${STATUS_LABEL[d.from as AppointmentStatus]} → ${STATUS_LABEL[d.to as AppointmentStatus]}${d.reason ? ` (${d.reason})` : ""}`;
    case "payment_recorded": return `Pagamento de ${formatMoney(Number(d.amountCents))} registrado${d.isDeposit ? " (sinal)" : ""}`;
    case "payment_refunded": return `Estorno de ${formatMoney(Number(d.amountCents))}: ${d.reason}`;
    default: return e.type;
  }
}
const fmt = (iso: string, tz: string) => formatInTz(new Date(iso), tz, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

function RescheduleForm({ data, timeZone, professionals, pending, onCancel, onSubmit }: {
  data: AppointmentDetailDTO; timeZone: string; professionals: AgendaProfessional[]; pending: boolean; onCancel: () => void;
  onSubmit: (v: { professionalId: string; date: string; time: string; squeezeIn: boolean }) => void;
}) {
  const s = new Date(data.startsAt);
  const [date, setDate] = useState(localDateKey(s, timeZone));
  const [time, setTime] = useState(localTime(s, timeZone));
  const [pro, setPro] = useState(data.professionalId);
  const [squeezeIn, setSqueezeIn] = useState(data.squeezeIn);
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-accent-border bg-accent-subtle/50 p-4">
      <div className="text-sm font-semibold">Reagendar</div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nova data" htmlFor="rd"><Input id="rd" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Novo horário" htmlFor="rt"><Input id="rt" type="time" step={300} value={time} onChange={(e) => setTime(e.target.value)} /></Field>
      </div>
      {professionals.length > 1 && (
        <Field label="Profissional" htmlFor="rp">
          <Select id="rp" value={pro} onChange={(e) => setPro(e.target.value)}>{professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
        </Field>
      )}
      <Checkbox checked={squeezeIn} onChange={(e) => setSqueezeIn(e.target.checked)} label="Encaixe (permitir sobreposição)" />
      <p className="text-xs text-muted">Lembretes pendentes serão cancelados e recriados para o novo horário.</p>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>Voltar</Button>
        <Button size="sm" disabled={pending} onClick={() => onSubmit({ professionalId: pro, date, time, squeezeIn })}>Salvar novo horário</Button>
      </div>
    </div>
  );
}

function PaymentForm({ remaining, pending, onCancel, onSubmit }: {
  remaining: number; pending: boolean; onCancel: () => void; onSubmit: (v: { amountCents: number; method: string; isDeposit: boolean }) => void;
}) {
  const [amount, setAmount] = useState((remaining / 100).toFixed(2).replace(".", ","));
  const [method, setMethod] = useState("pix");
  const [isDeposit, setIsDeposit] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-canvas p-4">
      <div className="text-sm font-semibold">Registrar pagamento <span className="font-normal text-muted">· em aberto {formatMoney(remaining)}</span></div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor (R$)" htmlFor="pa" error={err ?? undefined}><Input id="pa" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Forma" htmlFor="pm">
          <Select id="pm" value={method} onChange={(e) => setMethod(e.target.value)}>
            {Object.entries(METHOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
      </div>
      <Checkbox checked={isDeposit} onChange={(e) => setIsDeposit(e.target.checked)} label="É um sinal (pagamento antecipado)" />
      <p className="text-xs text-muted">Registro manual. Nenhuma cobrança é feita pelo sistema.</p>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>Voltar</Button>
        <Button size="sm" disabled={pending} onClick={() => {
          const cents = parseMoneyToCents(amount);
          if (!cents) return setErr("Valor inválido.");
          onSubmit({ amountCents: cents, method, isDeposit });
        }}>Registrar</Button>
      </div>
    </div>
  );
}

function PaymentRow({ p, refunded, timeZone, canRefund, onRefund }: {
  p: AppointmentDetailDTO["payments"][number]; refunded: number; timeZone: string; canRefund: boolean; onRefund: (cents: number, reason: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(((p.amount_cents - refunded) / 100).toFixed(2).replace(".", ","));
  const [reason, setReason] = useState("");
  const isRefund = p.kind === "refund";
  return (
    <li className="px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className={isRefund ? "text-st-noshow" : ""}>
          {isRefund ? "Estorno" : p.is_deposit ? "Sinal" : "Pagamento"} · {METHOD_LABEL[p.method]}
          <span className="ml-1 text-xs text-muted">{formatInTz(new Date(p.paid_at), timeZone, { day: "2-digit", month: "2-digit" })}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className={`tabular ${isRefund ? "text-st-noshow" : ""}`}>{isRefund ? "−" : ""}{formatMoney(p.amount_cents)}</span>
          {!isRefund && canRefund && refunded < p.amount_cents && (
            <button onClick={() => setOpen(!open)} className="rounded p-1 text-muted hover:bg-sunken hover:text-ink" aria-label="Estornar" title="Estornar"><Undo2 className="h-3.5 w-3.5" /></button>
          )}
        </span>
      </div>
      {open && (
        <div className="mt-2 flex flex-col gap-2">
          <div className="grid grid-cols-[110px_1fr] gap-2">
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" aria-label="Valor do estorno" className="h-9" />
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo (obrigatório)" aria-label="Motivo do estorno" className="h-9" />
          </div>
          <div className="flex justify-end">
            <Button size="sm" variant="danger" disabled={reason.trim().length < 3} onClick={() => { const c = parseMoneyToCents(amount); if (c) onRefund(c, reason); }}>Confirmar estorno</Button>
          </div>
        </div>
      )}
    </li>
  );
}
