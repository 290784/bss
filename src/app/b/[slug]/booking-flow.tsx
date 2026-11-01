"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarCheck, Check, Clock, Flame, Moon, Search, Sparkles, Sun, Sunrise } from "lucide-react";
import { Card } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { ActionForm, Checkbox, Field, FormMessage, Input, Textarea } from "@/components/ui/form";
import { formatMoney } from "@/lib/money";
import { formatInTz, zonedDateTime, localWeekday } from "@/lib/time";
import { cn } from "@/lib/cn";
import { bookAction, publicSlotsAction } from "./actions";

type Service = { id: string; name: string; description: string | null; priceCents: number; minutes: number; category: string | null; professionalIds: string[] };
type Professional = { id: string; name: string; specialty: string | null };

/** Dados da cliente guardados só neste aparelho, se ela pedir ("Lembrar meus dados"). */
const SAVED_KEY = "ge-cliente";
type Saved = { fullName: string; phone: string; email: string };
function readSaved(): Saved | null {
  try {
    const v = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "null");
    return v && typeof v.fullName === "string" && typeof v.phone === "string" ? { fullName: v.fullName, phone: v.phone, email: typeof v.email === "string" ? v.email : "" } : null;
  } catch { return null; }
}
function writeSaved(v: Saved | null) {
  try { if (v) localStorage.setItem(SAVED_KEY, JSON.stringify(v)); else localStorage.removeItem(SAVED_KEY); } catch { /* sem armazenamento: segue sem lembrar */ }
}
const WD = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** Manhã / Tarde / Noite, para não virar uma parede de horários. */
const PERIODS = [
  { label: "Manhã", icon: Sunrise, test: (t: string) => t < "12:00" },
  { label: "Tarde", icon: Sun, test: (t: string) => t >= "12:00" && t < "18:00" },
  { label: "Noite", icon: Moon, test: (t: string) => t >= "18:00" },
];
const norm = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function BookingFlow({ slug, timeZone, days, requiresApproval, cancellationNoticeHours, policyText, services, professionals, firstSlots = {}, openWeekdays, popularIds = [] }: {
  slug: string; timeZone: string; days: string[]; requiresApproval: boolean; cancellationNoticeHours: number; policyText: string | null;
  services: Service[]; professionals: Professional[]; firstSlots?: Record<string, { date: string; time: string }>;
  /** Dias da semana em que alguém atende (os outros aparecem como "fechado"). Sem a lista, todos abertos. */
  openWeekdays?: number[]; popularIds?: string[];
}) {
  const [cat, setCat] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [service, setService] = useState<Service | null>(null);
  const [pro, setPro] = useState<string | null | undefined>(undefined); // null = sem preferência
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [slotResult, setSlotResult] = useState<{ key: string; list: { time: string }[]; message?: string } | null>(null);
  const [done, setDone] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  const prosForService = service ? professionals.filter((p) => service.professionalIds.includes(p.id)) : [];
  const categories = [...new Set(services.map((s) => s.category ?? "Outros"))];
  const shown = services.filter((s) => (query ? norm(`${s.name} ${s.category ?? ""} ${s.description ?? ""}`).includes(norm(query)) : !cat || (s.category ?? "Outros") === cat));
  const isOpen = (d: string) => !openWeekdays || openWeekdays.length === 0 || openWeekdays.includes(localWeekday(d));
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

  // Atalho: o primeiro horário livre do serviço leva direto para "Seus dados".
  const quickBook = (s: Service, slot: { date: string; time: string }) => {
    const pros = professionals.filter((p) => s.professionalIds.includes(p.id));
    setService(s);
    setPro(pros.length === 1 ? pros[0]!.id : null);
    setDate(slot.date);
    setTime(slot.time);
  };
  const dayLabel = (d: string) => d === days[0] ? "hoje" : d === days[1] ? "amanhã"
    : `${WD[localWeekday(d)]}, ${d.slice(8)}/${d.slice(5, 7)}`;

  const chooseService = (s: Service) => {
    const pros = professionals.filter((p) => s.professionalIds.includes(p.id));
    setService(s);
    setPro(pros.length === 1 ? pros[0]!.id : undefined); // uma só profissional: pula a etapa
    setDate(null);
    setTime(null);
  };

  if (services.length === 0)
    return <Card className="p-8 text-center text-sm text-muted">Nenhum serviço disponível para agendamento online no momento.</Card>;

  // Concluído: o comprovante completo abre em seguida (DetailsForm navega para ele).
  if (done)
    return (
      <Card className="p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-st-completed-bg text-st-completed"><Check className="h-7 w-7" /></div>
        <h2 className="mt-4 font-tight tracking-[-0.02em] text-2xl font-extrabold">Tudo certo!</h2>
        <p className="mt-2 text-sm text-ink-soft">Abrindo o seu comprovante…</p>
      </Card>
    );

  return (
    <Card className="overflow-hidden">
      <ol className="flex border-b border-line text-[12px] font-medium" aria-label="Etapas">
        {["Serviço", "Profissional", "Horário", "Seus dados"].map((l, i) => (
          <li key={l} className={cn("flex-1 py-3 text-center", step === i + 1 ? "text-ink" : step > i + 1 ? "text-ink-soft" : "text-muted")}>
            <span className={cn("mx-auto mb-1 block h-1 w-10 rounded-full", step >= i + 1 ? "btn-glow" : "bg-line")} aria-hidden />{l}
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
            {services.length > 8 && (
              <label className="relative mb-3 block">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Procurar serviço" aria-label="Procurar serviço"
                  className="h-11 w-full rounded-xl border border-line-strong bg-surface pr-3 pl-9 text-[15px] focus:border-accent focus:ring-2 focus:ring-accent-muted focus:outline-none" />
              </label>
            )}
            {categories.length > 1 && !query && (
              <div className="-mx-5 mb-3 flex gap-1.5 overflow-x-auto px-5 pb-1 sm:-mx-6 sm:px-6" role="tablist" aria-label="Categorias">
                {[null, ...categories].map((c) => (
                  <button key={c ?? "todas"} type="button" role="tab" aria-selected={cat === c} onClick={() => setCat(c)}
                    className={cn("h-9 shrink-0 rounded-full border px-3.5 text-[13px] font-medium transition",
                      cat === c ? "border-transparent btn-glow text-white" : "border-line bg-surface text-ink-soft hover:text-ink")}>
                    {c ?? "Todos"}
                  </button>
                ))}
              </div>
            )}
            {shown.length === 0 && <p className="rounded-xl bg-sunken px-4 py-6 text-center text-sm text-muted">Não achei esse serviço. Tenta outro nome?</p>}
            <ul className="flex flex-col gap-2">
              {shown.map((s, i) => {
                const first = firstSlots[s.id];
                const header = categories.length > 1 && !cat && !query && s.category !== shown[i - 1]?.category;
                return (
                  <li key={s.id} className="contents">
                  {header && <h3 className={cn("px-1 text-xs font-semibold tracking-wide text-muted uppercase", i > 0 && "mt-3")}>{s.category ?? "Outros"}</h3>}
                  <div className="lift overflow-hidden rounded-2xl border border-line bg-surface">
                    <button onClick={() => chooseService(s)} className="flex w-full items-start justify-between gap-4 p-4 text-left">
                      <span>
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">{s.name}
                          {popularIds.includes(s.id) && <span className="inline-flex items-center gap-0.5 rounded-full bg-highlight-subtle px-2 py-0.5 text-[11px] font-semibold text-highlight-text"><Flame className="h-3 w-3" />Mais pedido</span>}
                        </span>
                        {s.description && <span className="mt-0.5 block text-[13px] text-muted">{s.description}</span>}
                        <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted"><Clock className="h-3 w-3" />{s.minutes} min</span>
                      </span>
                      <span className="shrink-0 font-semibold tabular">{formatMoney(s.priceCents)}</span>
                    </button>
                    {first && (
                      <button onClick={() => quickBook(s, first)} data-testid="first-slot"
                        className="flex min-h-11 w-full items-center justify-between gap-3 border-t border-line bg-accent-subtle/60 px-4 py-2 text-left text-[13px] transition hover:bg-accent-subtle">
                        <span className="text-ink-soft">Próximo horário livre: <strong className="font-semibold text-ink">{dayLabel(first.date)} às {first.time}</strong></span>
                        <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-accent-text">Agendar<ArrowRight className="h-3.5 w-3.5" /></span>
                      </button>
                    )}
                  </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {step === 2 && service && (
          <>
            <h2 className="mb-3 text-lg font-semibold">Com quem?</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              <li><button onClick={() => setPro(null)} className="lift flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-left"><span className="grid h-10 w-10 place-items-center rounded-full bg-highlight-subtle text-highlight-text"><Sparkles className="h-4 w-4" /></span><span><span className="block font-medium">Sem preferência</span><span className="text-xs text-muted">Mais horários disponíveis</span></span></button></li>
              {prosForService.map((p) => (
                <li key={p.id}>
                  <button onClick={() => setPro(p.id)} className="lift flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-left">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-accent-muted text-sm font-semibold text-accent-text">{p.name.slice(0, 1)}</span>
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
              {days.map((d) => {
                const open = isOpen(d);
                return (
                  <button key={d} onClick={() => { setDate(d); setTime(null); }} aria-pressed={date === d} disabled={!open}
                    aria-label={`${dayLabel(d)}${open ? "" : " (fechado)"}`}
                    className={cn("flex w-14 shrink-0 snap-start flex-col items-center rounded-xl border py-2.5",
                      !open ? "cursor-not-allowed border-dashed border-line opacity-45" : date === d ? "lift border-violet-300 btn-glow text-white" : "lift border-line hover:border-accent")}>
                    <span className={cn("text-[11px] uppercase", date === d ? "text-accent-muted" : "text-muted")}>{d === days[0] ? "hoje" : WD[localWeekday(d)]}</span>
                    <span className="text-lg font-semibold tabular">{Number(d.slice(8))}</span>
                    {!open && <span className="text-[9px] text-muted">fechado</span>}
                  </button>
                );
              })}
            </div>
            {!date ? <p className="text-sm text-muted">Selecione um dia para ver os horários livres.</p>
              : slots.loading ? <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">{Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton h-10" />)}</div>
              : slots.message ? <p className="text-sm text-danger">{slots.message}</p>
              : slots.list.length === 0 ? <p className="rounded-xl bg-sunken px-4 py-6 text-center text-sm text-muted">Nenhum horário livre neste dia. Tente outra data.</p>
              : (
                <div className="flex flex-col gap-4">
                  {PERIODS.map((p) => {
                    const list = slots.list.filter((s) => p.test(s.time));
                    if (list.length === 0) return null;
                    return (
                      <div key={p.label}>
                        <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-ink-soft"><p.icon className="h-4 w-4 text-accent-text" />{p.label}<span className="text-xs text-muted">· {list.length}</span></h3>
                        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                          {list.map((s) => (
                            <button key={s.time} onClick={() => { setTime(s.time); setNotice(null); }} className="lift h-11 rounded-lg border border-line bg-surface text-sm font-medium tabular hover:border-violet-300 hover:bg-sunken">{s.time}</button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </>
        )}

        {step === 4 && service && date && time && (
          <DetailsForm slug={slug} serviceId={service.id} professionalId={pro ?? null} date={date} time={time}
            summary={{
              service: service.name,
              when: `${formatInTz(zonedDateTime(date, "12:00", timeZone), timeZone, { weekday: "long", day: "numeric", month: "long" })} às ${time}`,
              who: pro ? professionals.find((p) => p.id === pro)?.name ?? null : null,
              minutes: service.minutes, price: formatMoney(service.priceCents),
            }}
            requiresApproval={requiresApproval} cancellationNoticeHours={cancellationNoticeHours} policyText={policyText}
            onConflict={() => { setTime(null); setRefresh((n) => n + 1); setNotice("Esse horário acabou de ser reservado por outra pessoa. Escolha outro, por favor."); }} onDone={() => setDone(true)} />
        )}
      </div>
    </Card>
  );
}

function DetailsForm({ slug, serviceId, professionalId, date, time, summary, requiresApproval, cancellationNoticeHours, policyText, onConflict, onDone }: {
  slug: string; serviceId: string; professionalId: string | null; date: string; time: string;
  summary: { service: string; when: string; who: string | null; minutes: number; price: string };
  requiresApproval: boolean; cancellationNoticeHours: number; policyText: string | null;
  onConflict: () => void; onDone: () => void;
}) {
  const router = useRouter();
  // O formulário só aparece depois de escolher o horário (nunca no HTML do servidor), então ler o aparelho aqui é seguro.
  const [saved, setSaved] = useState<Saved | null>(() => readSaved());
  const [formKey, setFormKey] = useState(0);
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
    if (r.ok) {
      writeSaved(form.get("remember") === "on"
        ? { fullName: String(form.get("fullName") ?? ""), phone: String(form.get("phone") ?? ""), email: String(form.get("email") ?? "") }
        : null);
      onDone(); router.replace(`/b/${slug}/agendamento/${r.token}?novo=1`);
    }
    else {
      const fieldErrors = ("fieldErrors" in r && r.fieldErrors) || {};
      setError(Object.keys(fieldErrors).length ? "Revise os campos destacados." : r.message);
      setFe(fieldErrors);
      if ("conflict" in r && r.conflict) onConflict();
    }
  });
  return (
    <ActionForm key={formKey} action={submit} className="flex flex-col gap-4" noValidate>
      <div className="rounded-2xl border border-accent/25 bg-accent-subtle/50 p-4" data-testid="booking-summary">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface text-accent-text"><CalendarCheck className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{summary.service}</div>
            <div className="text-sm text-ink-soft first-letter:uppercase">{summary.when}</div>
            <div className="mt-1 text-xs text-muted">{summary.who ? `com ${summary.who}` : "com a profissional disponível"} · {summary.minutes} min</div>
          </div>
          <div className="shrink-0 text-right font-semibold tabular">{summary.price}</div>
        </div>
      </div>
      {error && <FormMessage state={{ ok: false, message: error }} />}
      {saved && (
        <p className="-mb-1 flex flex-wrap items-center justify-between gap-2 text-[13px] text-ink-soft" data-testid="saved-client">
          <span>Olá de novo, <strong className="text-ink">{saved.fullName.split(" ")[0]}</strong>! Seus dados já estão preenchidos.</span>
          <button type="button" className="min-h-10 font-medium text-accent-text underline" onClick={() => { writeSaved(null); setSaved(null); setFormKey((k) => k + 1); }}>Não sou eu</button>
        </p>
      )}
      <Field label="Seu nome" htmlFor="fullName" error={fe.fullName}><Input id="fullName" name="fullName" autoComplete="name" defaultValue={saved?.fullName} required /></Field>
      <Field label="WhatsApp" htmlFor="phone" error={fe.phone} hint="Usado para confirmar o horário."><Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 90000-0000" defaultValue={saved?.phone} required /></Field>
      <Field label="E-mail" htmlFor="email" error={fe.email} optional><Input id="email" name="email" type="email" autoComplete="email" defaultValue={saved?.email} /></Field>
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
      <Checkbox name="remember" defaultChecked={!!saved} label="Lembrar meus dados neste celular" description="Seus dados ficam só neste aparelho, para agendar mais rápido da próxima vez." />
      <Button type="submit" size="lg" disabled={pending}>{pending ? "Enviando…" : requiresApproval ? "Solicitar agendamento" : "Confirmar agendamento"}</Button>
    </ActionForm>
  );
}
