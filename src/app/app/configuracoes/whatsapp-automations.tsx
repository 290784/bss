"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Sparkles } from "lucide-react";
import { Badge, Card, CardHeader } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { saveAutomationsAction } from "./actions";

type Bubble = { from: "ge" | "cliente" | "app"; text: string; buttons?: string[] };

/** Liga/desliga as automações do WhatsApp e mostra como a conversa acontece. */
export function WhatsAppAutomations({ connected, planHasAutomations, reminder, upsell, readOnly, preview, stats }: {
  connected: boolean; planHasAutomations: boolean; reminder: boolean; upsell: boolean; readOnly: boolean;
  preview: Bubble[]; stats: { reminders: number; confirmed: number; offers: number; accepted: number; extraCents: number };
}) {
  const [state, setState] = useState({ reminder, upsell });
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const save = (next: { reminder: boolean; upsell: boolean }) => {
    setState(next);
    start(async () => {
      const r = await saveAutomationsAction(next);
      if (r?.ok) { toast(r.message!); router.refresh(); } else if (r) toast(r.message, "error");
    });
  };
  const money = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return (
    <Card id="automacoes" className="scroll-mt-24">
      <CardHeader title={<span className="inline-flex items-center gap-2"><MessageCircle className="h-4.5 w-4.5 text-st-completed" />Automações do WhatsApp</span>}
        description="Lembrete na véspera, confirmação com um toque e oferta de serviço extra dentro da conversa"
        action={<Badge variant={connected ? "success" : "neutral"}>{connected ? "WhatsApp conectado" : "WhatsApp não conectado"}</Badge>} />
      <div className="grid gap-5 px-5 pt-3 pb-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-3">
          {!planHasAutomations && <p className="rounded-xl bg-highlight-subtle px-3 py-2 text-[13px] text-highlight-text">As automações fazem parte do plano Pro. No seu plano atual, as confirmações continuam pelo botão de WhatsApp da agenda.</p>}
          {!connected && <p className="rounded-xl bg-sunken px-3 py-2 text-[13px] text-ink-soft">Tudo pronto para quando o WhatsApp for conectado. Até lá, nada é enviado sozinho.</p>}
          <Toggle checked={state.reminder} disabled={readOnly || pending} onChange={(v) => save({ reminder: v, upsell: v ? state.upsell : false })}
            title="Lembrete na véspera, com confirmação" text="Sai às 9h do dia anterior. A cliente toca em “Confirmo” e o horário fica confirmado na agenda; “Preciso remarcar” avisa você." />
          <Toggle checked={state.upsell && state.reminder} disabled={readOnly || pending || !state.reminder} onChange={(v) => save({ reminder: state.reminder, upsell: v })}
            title="Oferecer um serviço extra depois do “Confirmo”" icon={<Sparkles className="h-3.5 w-3.5 text-gold-600" />}
            text="Só um serviço por atendimento, que outras clientes costumam fazer junto e que cabe logo depois, com a mesma profissional. Se ela disser SIM, a Gê reserva, soma o valor e te avisa." />
          <p className="text-xs text-muted">Se a cliente escrever qualquer outra coisa, a automação para e você recebe um aviso para responder. Em Serviços, dá para escolher quais podem ser oferecidos.</p>
          <div className="mt-1">
            <div className="mb-1.5 text-xs font-medium text-muted">Últimos 30 dias</div>
            <dl className="grid grid-cols-2 gap-2">
              {[["Lembretes enviados", String(stats.reminders)], ["Confirmaram pelo WhatsApp", String(stats.confirmed)], ["Ofertas de extra", String(stats.offers)], ["Extras vendidos", stats.accepted ? `${stats.accepted} · ${money(stats.extraCents)}` : "0"]].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-sunken px-3 py-2"><dt className="text-[11px] text-muted">{k}</dt><dd className="text-sm font-semibold tabular">{v}</dd></div>
              ))}
            </dl>
          </div>
        </div>
        <div className="rounded-2xl bg-[#efeae2] p-3 dark:bg-[#0b141a]" aria-label="Exemplo da conversa">
          <ul className="flex flex-col gap-1.5">
            {preview.map((b, i) => b.from === "app" ? (
              <li key={i} className="mx-auto my-1 rounded-lg bg-accent px-2.5 py-1 text-center text-[11px] font-medium text-white">{b.text}</li>
            ) : (
              <li key={i} className={cn("max-w-[88%] rounded-xl px-2.5 py-1.5 text-[12.5px] leading-snug text-[#111b21] shadow-sm dark:text-[#e9edef]",
                b.from === "ge" ? "self-start rounded-tl-sm bg-white dark:bg-[#202c33]" : "self-end rounded-tr-sm bg-[#d9fdd3] dark:bg-[#005c4b]")}>
                {b.text}
                {b.buttons && <span className="mt-1.5 flex flex-col gap-1 border-t border-black/10 pt-1.5 dark:border-white/10">{b.buttons.map((t) => <span key={t} className="text-center font-medium text-[#027eb5] dark:text-[#53bdeb]">{t}</span>)}</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

function Toggle({ checked, disabled, onChange, title, text, icon }: { checked: boolean; disabled?: boolean; onChange: (v: boolean) => void; title: string; text: string; icon?: React.ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3", disabled && "cursor-not-allowed opacity-60")}>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" role="switch" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-10 rounded-full bg-line-strong transition peer-checked:bg-st-completed peer-focus-visible:ring-2 peer-focus-visible:ring-accent" />
        <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-sm font-medium">{icon}{title}</span>
        <span className="mt-0.5 block text-xs text-muted">{text}</span>
      </span>
    </label>
  );
}
