"use client";
import { useActionState, useEffect, useState, useTransition } from "react";
import { Check, Scissors, Sparkles, Clock } from "lucide-react";
import { createBusiness, finishOnboarding, saveOnboardingHours } from "./actions";
import { Card } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { ActionForm, Checkbox, Field, FormMessage, Input, Select, SubmitButton } from "@/components/ui/form";
import { cn } from "@/lib/cn";

type Preset = { name: string; category: string; price: number; minutes: number; buffer: number; returnDays?: number };
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function OnboardingFlow({
  initialStep, businessTypes, presets, createdBusinessType,
}: { initialStep: number; businessTypes: { id: string; label: string }[]; presets: Record<string, Preset[]>; createdBusinessType: string | null }) {
  const [step, setStep] = useState(initialStep);
  const [businessType, setBusinessType] = useState(createdBusinessType ?? "salon");
  const steps = [
    { n: 1, label: "Seu negócio", icon: Sparkles },
    { n: 2, label: "Horários", icon: Clock },
    { n: 3, label: "Serviços", icon: Scissors },
  ];
  return (
    <div>
      <ol className="mb-8 flex items-center gap-2" aria-label="Etapas">
        {steps.map((s, i) => (
          <li key={s.n} className="flex flex-1 items-center gap-2">
            <span className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] font-semibold",
              step > s.n ? "bg-ink-warm text-white" : step === s.n ? "bg-plum-100 text-plum-700 ring-2 ring-plum-500" : "bg-sunken text-muted",
            )} aria-current={step === s.n ? "step" : undefined}>
              {step > s.n ? <Check className="h-4 w-4" /> : s.n}
            </span>
            <span className={cn("hidden text-sm sm:inline", step === s.n ? "font-medium text-ink" : "text-muted")}>{s.label}</span>
            {i < steps.length - 1 && <span className="h-px flex-1 bg-line" aria-hidden />}
          </li>
        ))}
      </ol>
      {step === 1 && <BusinessStep businessTypes={businessTypes} value={businessType} onType={setBusinessType} onDone={() => setStep(2)} />}
      {step === 2 && <HoursStep onDone={() => setStep(3)} />}
      {step === 3 && <ServicesStep presets={presets[businessType] ?? []} onBack={() => setStep(2)} />}
    </div>
  );
}

function BusinessStep({ businessTypes, value, onType, onDone }: { businessTypes: { id: string; label: string }[]; value: string; onType: (v: string) => void; onDone: () => void }) {
  const [state, action, pending] = useActionState(createBusiness, null);
  useEffect(() => { if (state?.ok) onDone(); }, [state, onDone]);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <Card className="p-6 sm:p-8">
      <h1 className="font-tight tracking-[-0.02em] text-[26px] font-extrabold">Vamos montar seu espaço</h1>
      <p className="mt-1 mb-6 text-sm text-muted">Três passos rápidos. Tudo pode ser ajustado depois.</p>
      <ActionForm action={action} className="flex flex-col gap-5">
        <FormMessage state={state} />
        <Field label="Nome do negócio" htmlFor="name" error={fe?.name} hint="Aparece na sua página de agendamento.">
          <Input id="name" name="name" required placeholder="Ex.: Studio Ana Lima" autoFocus />
        </Field>
        <Field label="O que você faz?" htmlFor="businessType" error={fe?.businessType}>
          <Select id="businessType" name="businessType" value={value} onChange={(e) => onType(e.target.value)}>
            {businessTypes.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
          </Select>
        </Field>
        <Field label="WhatsApp do negócio" htmlFor="phone" optional>
          <Input id="phone" name="phone" type="tel" inputMode="tel" placeholder="(11) 90000-0000" />
        </Field>
        <Checkbox name="attends" defaultChecked label="Eu também atendo clientes" description="Criamos sua agenda de profissional automaticamente." />
        <div className="flex justify-end pt-2"><SubmitButton size="lg" pending={pending} pendingLabel="Criando…">Continuar</SubmitButton></div>
      </ActionForm>
    </Card>
  );
}

function HoursStep({ onDone }: { onDone: () => void }) {
  const [days, setDays] = useState([1, 2, 3, 4, 5, 6]);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("18:00");
  const [hasBreak, setHasBreak] = useState(true);
  const [breakStart, setBreakStart] = useState("12:00");
  const [breakEnd, setBreakEnd] = useState("13:00");
  const [error, setError] = useState<string | null>(null);
  const [pending, start_] = useTransition();
  const submit = () => start_(async () => {
    const r = await saveOnboardingHours({ days, start, end, ...(hasBreak ? { breakStart, breakEnd } : {}) });
    if (r && !r.ok) setError(r.message); else onDone();
  });
  return (
    <Card className="p-6 sm:p-8">
      <h1 className="font-tight tracking-[-0.02em] text-[26px] font-extrabold">Quando você atende?</h1>
      <p className="mt-1 mb-6 text-sm text-muted">Usamos isso para mostrar apenas horários reais na sua agenda e na página de agendamento.</p>
      {error && <div className="mb-4"><FormMessage state={{ ok: false, message: error }} /></div>}
      <fieldset className="mb-6">
        <legend className="mb-2 text-[13px] font-medium text-ink-soft">Dias de atendimento</legend>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((d, i) => {
            const on = days.includes(i);
            return (
              <button key={d} type="button" aria-pressed={on}
                onClick={() => setDays(on ? days.filter((x) => x !== i) : [...days, i].sort())}
                className={cn("h-10 min-w-12 rounded-[10px] border px-3 text-sm font-medium transition-colors",
                  on ? "border-ink-warm bg-ink-warm text-white" : "border-line-strong bg-surface text-ink-soft hover:bg-sunken")}>
                {d}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Início" htmlFor="start"><Input id="start" type="time" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
        <Field label="Término" htmlFor="end"><Input id="end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
      </div>
      <Checkbox className="mt-5" checked={hasBreak} onChange={(e) => setHasBreak(e.target.checked)} label="Tenho pausa para almoço" />
      {hasBreak && (
        <div className="mt-3 grid grid-cols-2 gap-4">
          <Field label="Pausa de" htmlFor="bs"><Input id="bs" type="time" value={breakStart} onChange={(e) => setBreakStart(e.target.value)} /></Field>
          <Field label="até" htmlFor="be"><Input id="be" type="time" value={breakEnd} onChange={(e) => setBreakEnd(e.target.value)} /></Field>
        </div>
      )}
      <div className="mt-8 flex justify-end"><Button size="lg" onClick={submit} disabled={pending}>{pending ? "Salvando…" : "Continuar"}</Button></div>
    </Card>
  );
}

function ServicesStep({ presets, onBack }: { presets: Preset[]; onBack: () => void }) {
  const [items, setItems] = useState(() => presets.map((p) => ({ ...p, on: true, priceText: (p.price / 100).toFixed(2).replace(".", ",") })));
  const [custom, setCustom] = useState({ name: "", price: "", minutes: "60" });
  const [error, setError] = useState<string | null>(null);
  const [pending, startT] = useTransition();
  const update = (i: number, patch: Partial<(typeof items)[number]>) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const addCustom = () => {
    if (custom.name.trim().length < 2 || !custom.price) return;
    setItems((xs) => [...xs, { name: custom.name.trim(), category: xs[0]?.category ?? "Serviços", price: 0, priceText: custom.price, minutes: Number(custom.minutes) || 60, buffer: 10, on: true }]);
    setCustom({ name: "", price: "", minutes: "60" });
  };
  const submit = () => startT(async () => {
    const selected = items.filter((i) => i.on).map((i) => ({ name: i.name, category: i.category, price: i.priceText, minutes: i.minutes, buffer: i.buffer, returnDays: i.returnDays }));
    const r = await finishOnboarding(selected);
    if (r && !r.ok) setError(r.message);
  });
  return (
    <Card className="p-6 sm:p-8">
      <h1 className="font-tight tracking-[-0.02em] text-[26px] font-extrabold">Seus serviços</h1>
      <p className="mt-1 mb-6 text-sm text-muted">Sugestões comuns para o seu segmento. Ajuste preço e duração ou desmarque o que não oferece — os valores são só ponto de partida.</p>
      {error && <div className="mb-4"><FormMessage state={{ ok: false, message: error }} /></div>}
      <ul className="divide-y divide-line rounded-xl border border-line">
        {items.map((s, i) => (
          <li key={i} className={cn("grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 p-3 sm:grid-cols-[auto_1fr_120px_110px]", !s.on && "opacity-50")}>
            <input type="checkbox" checked={s.on} onChange={(e) => update(i, { on: e.target.checked })} className="h-[18px] w-[18px] accent-plum-600" aria-label={`Oferecer ${s.name}`} />
            <span className="text-sm font-medium">{s.name}</span>
            <label className="col-start-2 flex items-center gap-1.5 text-[13px] text-muted sm:col-start-auto">
              R$ <Input value={s.priceText} onChange={(e) => update(i, { priceText: e.target.value })} inputMode="decimal" className="h-9" aria-label={`Preço de ${s.name}`} />
            </label>
            <label className="col-start-2 flex items-center gap-1.5 text-[13px] text-muted sm:col-start-auto">
              <Input value={s.minutes} onChange={(e) => update(i, { minutes: Number(e.target.value) || 0 })} inputMode="numeric" className="h-9" aria-label={`Duração de ${s.name} em minutos`} /> min
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-4 grid gap-2 rounded-xl bg-sunken/60 p-3 sm:grid-cols-[1fr_120px_110px_auto]">
        <Input placeholder="Outro serviço" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} aria-label="Nome do novo serviço" />
        <Input placeholder="Preço" inputMode="decimal" value={custom.price} onChange={(e) => setCustom({ ...custom, price: e.target.value })} aria-label="Preço do novo serviço" />
        <Input placeholder="min" inputMode="numeric" value={custom.minutes} onChange={(e) => setCustom({ ...custom, minutes: e.target.value })} aria-label="Duração em minutos" />
        <Button variant="secondary" onClick={addCustom}>Adicionar</Button>
      </div>
      <div className="mt-8 flex justify-between">
        <Button variant="ghost" onClick={onBack}>Voltar</Button>
        <Button size="lg" onClick={submit} disabled={pending || !items.some((i) => i.on)}>{pending ? "Finalizando…" : "Abrir minha agenda"}</Button>
      </div>
    </Card>
  );
}
