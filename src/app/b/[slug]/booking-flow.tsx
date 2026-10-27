"use client";
import { useEffect, useState, useTransition } from "react";
import { ArrowLeft, CalendarCheck, Check, Clock, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { ActionForm, Checkbox, Field, FormMessage, Input, Textarea } from "@/components/ui/form";
import { formatMoney } from "@/lib/money";
import { formatInTz, zonedDateTime, localWeekday } from "@/lib/time";
import { cn } from "@/lib/cn";
import { bookAction, publicSlotsAction } from "./actions";

type Service = { id: string; name: string; description: string | null; priceCents: number; minutes: number; category: string | null; professionalIds: string[] };
type Professional = { id: string; name: string; specialty: string | null };
const WD = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function BookingFlow({ slug, timeZone, days, requiresApproval, cancellationNoticeHours, policyText, services, professionals }: {
  slug: string; timeZone: string; days: string[]; requiresApproval: boolean; cancellationNoticeHours: number; policyText: string | null;
  services: Service[]; professionals: Professional[];
}) {
  const [service, setService] = useState<Service | null>(null);
  const [pro, setPro] = useState<string | null | undefined>(undefined); // null = sem preferência
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [slotResult, setSlotResult] = useState<{ key: string; list: { time: string }[]; message?: string } | null>(null);
  const [done, setDone] = useState<{ status: string; professionalName: string | null } | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  const prosForService = service ? professionals.filter((p) => service.professionalIds.includes(p.id)) : [];
  const step = !service ? 1 : pro === undefined ? 2 : !date || !time ? 3 : 4;

  const slotKey = service && pro !== undefined && date ? JSON.stringify([service.id, pro, date, refresh]) : null;
  const slots = slotResult && slotResult.key === slotKey ? { loading: false, ...slotResult } : { loading: true, list: [] as { time: string }[], message: undefined };
  useEffect(() => {
    if (!slotKey) return;
    let cancel = false;
    const [sid, pid, d] = JSON.parse(slotKey) as [string, string | null, string];
    publicSlotsAction(slug, sid, pid, d).then((r) => { if (!cancel) setSlotResult({ key: slotKey, list: r.slots, message: r.ok ? undefined : r.message }); });
    return () => { cancel = true; };
  }, [slug, slotKey]);

  const chooseService = (s: Service) => {
    const pros = professionals.filter((p) => s.professionalIds.includes(p.id));
    setService(s);
    setPro(pros.length === 1 ? pros[0]!.id : undefined); // uma só profissional: pula a etapa
    setDate(null);
    setTime(null);
  };

  if (services.length === 0)
    return <Card className="p-8 text-center text-sm text-muted">Nenhum serviço disponível para agendamento online no momento.</Card>;

  if (done)
    return (
      <Card className="p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-st-completed-bg text-st-completed"><Check className="h-7 w-7" /></div>
        <h2 className="mt-4 font-display text-2xl font-medium">{done.status === "pending" ? "Solicitação enviada!" : "Horário reservado!"}</h2>
        <p className="mt-2 text-sm text-ink-soft">
          {service?.name} · <span className="first-letter:uppercase">{date && formatInTz(zonedDateTime(date, "12:00", timeZone), timeZone, { weekday: "long", day: "numeric", month: "long" })}</span> às {time}
          {done.professionalName ? ` com ${done.professionalName}` : ""}.
        </p>
        <p className="mt-3 text-sm text-muted">
          {done.status === "pending"
            ? "O estabelecimento vai revisar e confirmar seu horário pelo contato informado."
            : "Seu horário está confirmado. Se precisar remarcar, fale diretamente com o estabelecimento."}
        </p>
      </Card>
    );

  return (
    <Card className="overflow-hidden">
      <ol className="flex border-b border-line text-[12px] font-medium" aria-label="Etapas">
        {["Serviço", "Profissional", "Horário", "Seus dados"].map((l, i) => (
          <li key={l} className={cn("flex-1 py-3 text-center", step === i + 1 ? "text-plum-700" : step > i + 1 ? "text-ink-soft" : "text-muted")}>
            <span className={cn("mx-auto mb-1 block h-1 w-10 rounded-full", step >= i + 1 ? "bg-plum-500" : "bg-line")} aria-hidden />{l}
          </li>
        ))}
      </ol>

      <div className="p-5 sm:p-6">
        {step > 1 && (
          <button className="mb-4 inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink"
            onClick={() => { if (step === 4) setTime(null); else if (step === 3) { setDate(null); setTime(null); if (prosForService.length > 1) setPro(undefined); else { setPro(undefined); setService(null); } } else { setService(null); setPro(undefined); } }}>
            <ArrowLeft className="h-4 w-4" />Voltar
          </button>
        )}

        {step === 1 && (
          <>
            <h2 className="mb-3 text-lg font-semibold">Escolha o serviço</h2>
            <ul className="flex flex-col gap-2">
              {services.map((s) => (
                <li key={s.id}>
                  <button onClick={() => chooseService(s)}
                    className="flex w-full items-start justify-between gap-4 rounded-xl border border-line p-4 text-left transition-colors hover:border-plum-500 hover:bg-plum-50/40">
                    <span>
                      <span className="block font-medium">{s.name}</span>
                      {s.description && <span className="mt-0.5 block text-[13px] text-muted">{s.description}</span>}
                      <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted"><Clock className="h-3 w-3" />{s.minutes} min</span>
                    </span>
                    <span className="shrink-0 font-semibold tabular">{formatMoney(s.priceCents)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {step === 2 && service && (
          <>
            <h2 className="mb-3 text-lg font-semibold">Com quem?</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              <li><button onClick={() => setPro(null)} className="flex w-full items-center gap-3 rounded-xl border border-line p-4 text-left hover:border-plum-500"><span className="grid h-10 w-10 place-items-center rounded-full bg-champagne-100 text-champagne-600"><Sparkles className="h-4 w-4" /></span><span><span className="block font-medium">Sem preferência</span><span className="text-xs text-muted">Mais horários disponíveis</span></span></button></li>
              {prosForService.map((p) => (
                <li key={p.id}>
                  <button onClick={() => setPro(p.id)} className="flex w-full items-center gap-3 rounded-xl border border-line p-4 text-left hover:border-plum-500">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-plum-100 text-sm font-semibold text-plum-700">{p.name.slice(0, 1)}</span>
                    <span><span className="block font-medium">{p.name}</span>{p.specialty && <span className="text-xs text-muted">{p.specialty}</span>}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {step === 3 && service && (
          <>
            <h2 className="mb-1 text-lg font-semibold">Escolha o dia e o horário</h2>
            <p className="mb-4 text-[13px] text-muted">{service.name} · {service.minutes} min · horários no fuso do estabelecimento</p>
            {notice && <div className="mb-4"><FormMessage state={{ ok: false, message: notice }} /></div>}
            <div className="-mx-5 mb-5 flex snap-x gap-2 overflow-x-auto px-5 pb-1 sm:-mx-6 sm:px-6">
              {days.map((d) => (
                <button key={d} onClick={() => { setDate(d); setTime(null); }} aria-pressed={date === d}
                  className={cn("flex w-14 shrink-0 snap-start flex-col items-center rounded-xl border py-2.5", date === d ? "border-plum-600 bg-plum-600 text-white" : "border-line hover:border-plum-500")}>
                  <span className={cn("text-[11px] uppercase", date === d ? "text-plum-100" : "text-muted")}>{WD[localWeekday(d)]}</span>
                  <span className="text-lg font-semibold tabular">{Number(d.slice(8))}</span>
                </button>
              ))}
            </div>
            {!date ? <p className="text-sm text-muted">Selecione um dia para ver os horários livres.</p>
              : slots.loading ? <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">{Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton h-10" />)}</div>
              : slots.message ? <p className="text-sm text-danger">{slots.message}</p>
              : slots.list.length === 0 ? <p className="rounded-xl bg-sunken px-4 py-6 text-center text-sm text-muted">Nenhum horário livre neste dia. Tente outra data.</p>
              : (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {slots.list.map((s) => (
                    <button key={s.time} onClick={() => { setTime(s.time); setNotice(null); }} className="h-10 rounded-lg border border-line text-sm font-medium tabular hover:border-plum-600 hover:bg-plum-50">{s.time}</button>
                  ))}
                </div>
              )}
          </>
        )}

        {step === 4 && service && date && time && (
          <DetailsForm slug={slug} serviceId={service.id} professionalId={pro ?? null} date={date} time={time}
            summary={`${service.name} · ${formatInTz(zonedDateTime(date, "12:00", timeZone), timeZone, { weekday: "short", day: "numeric", month: "short" })} às ${time} · ${formatMoney(service.priceCents)}`}
            requiresApproval={requiresApproval} cancellationNoticeHours={cancellationNoticeHours} policyText={policyText}
            onConflict={() => { setTime(null); setRefresh((n) => n + 1); setNotice("Esse horário acabou de ser reservado por outra pessoa. Escolha outro, por favor."); }} onDone={setDone} />
        )}
      </div>
    </Card>
  );
}

function DetailsForm({ slug, serviceId, professionalId, date, time, summary, requiresApproval, cancellationNoticeHours, policyText, onConflict, onDone }: {
  slug: string; serviceId: string; professionalId: string | null; date: string; time: string; summary: string;
  requiresApproval: boolean; cancellationNoticeHours: number; policyText: string | null;
  onConflict: () => void; onDone: (r: { status: string; professionalName: string | null }) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [fe, setFe] = useState<Record<string, string[] | undefined>>({});
  const [pending, start] = useTransition();
  const submit = (form: FormData) => start(async () => {
    setError(null);
    const r = await bookAction(slug, {
      serviceId, professionalId, date, time,
      fullName: form.get("fullName"), phone: form.get("phone"), email: form.get("email") ?? "", notes: form.get("notes") || undefined,
      acceptPolicy: form.get("acceptPolicy") === "on", marketingConsent: form.get("marketingConsent") === "on", website: form.get("website"),
    });
    if (r.ok) onDone({ status: r.status, professionalName: r.professionalName });
    else {
      const fieldErrors = ("fieldErrors" in r && r.fieldErrors) || {};
      setError(Object.keys(fieldErrors).length ? "Revise os campos destacados." : r.message);
      setFe(fieldErrors);
      if ("conflict" in r && r.conflict) onConflict();
    }
  });
  return (
    <ActionForm action={submit} className="flex flex-col gap-4" noValidate>
      <div className="flex items-center gap-2 rounded-xl bg-plum-50 px-4 py-3 text-sm text-plum-700"><CalendarCheck className="h-4 w-4 shrink-0" />{summary}</div>
      {error && <FormMessage state={{ ok: false, message: error }} />}
      <Field label="Seu nome" htmlFor="fullName" error={fe.fullName}><Input id="fullName" name="fullName" autoComplete="name" required /></Field>
      <Field label="WhatsApp" htmlFor="phone" error={fe.phone} hint="Usado para confirmar o horário."><Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 90000-0000" required /></Field>
      <Field label="E-mail" htmlFor="email" error={fe.email} optional><Input id="email" name="email" type="email" autoComplete="email" /></Field>
      <Field label="Observação" htmlFor="notes" optional><Textarea id="notes" name="notes" maxLength={500} placeholder="Algo que o estabelecimento precise saber?" /></Field>
      {/* honeypot */}
      <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden"><label>Site<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <div className="rounded-xl border border-line bg-canvas p-4 text-[13px] text-ink-soft">
        <div className="mb-1 font-medium text-ink">Política de agendamento</div>
        <ul className="list-disc space-y-1 pl-4">
          <li>{requiresApproval ? "Sua solicitação será confirmada pelo estabelecimento." : "O horário é confirmado na hora."}</li>
          {cancellationNoticeHours > 0 && <li>Cancelamentos ou remarcações com pelo menos {cancellationNoticeHours}h de antecedência.</li>}
          {policyText && <li className="whitespace-pre-line">{policyText}</li>}
          <li>Seus dados são usados apenas para este agendamento e o relacionamento com o estabelecimento. <a href="/privacidade" target="_blank" className="underline">Privacidade</a>.</li>
        </ul>
      </div>
      <Checkbox name="acceptPolicy" label="Li e concordo com a política de agendamento" />
      {fe.acceptPolicy && <p role="alert" className="-mt-2 text-[13px] text-danger">{fe.acceptPolicy[0]}</p>}
      <Checkbox name="marketingConsent" label="Quero receber novidades e promoções deste estabelecimento" description="Opcional. Você pode cancelar quando quiser." />
      <Button type="submit" size="lg" disabled={pending}>{pending ? "Enviando…" : requiresApproval ? "Solicitar agendamento" : "Confirmar agendamento"}</Button>
    </ActionForm>
  );
}
