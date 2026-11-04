import { Check, Clock3 } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Hero da landing: a agenda de um dia como a profissional vê no app (dados de exemplo).
 * Mostra o que a Gê faz de verdade: horários por profissional, quem já confirmou pelo WhatsApp e um espaço livre para encaixe.
 */
type Status = "confirmou" | "aguardando" | "atendendo";
const ROWS: { hora: string; nome: string; servico: string; status?: Status }[] = [
  { hora: "09:00", nome: "Ana Souza", servico: "Manicure e pedicure", status: "atendendo" },
  { hora: "10:30", nome: "Bianca Lima", servico: "Design de sobrancelhas", status: "confirmou" },
  { hora: "11:30", nome: "", servico: "" },
  { hora: "14:00", nome: "Carla Mendes", servico: "Alongamento de cílios", status: "confirmou" },
  { hora: "16:30", nome: "Dani Rocha", servico: "Hidratação", status: "aguardando" },
];
const STATUS: Record<Status, { label: string; className: string }> = {
  atendendo: { label: "Em atendimento", className: "bg-accent text-white" },
  confirmou: { label: "Confirmou pelo WhatsApp", className: "bg-gold-50 text-gold-700" },
  aguardando: { label: "Aguardando resposta", className: "bg-sunken text-ink-soft" },
};

export function HeroAgenda() {
  return (
    <div className="mx-auto w-full max-w-[480px]">
      <div role="img" aria-label="Exemplo da agenda do dia: quatro clientes, três delas confirmadas pelo WhatsApp, e um horário livre às 11:30 para encaixe."
        className="rounded-[24px] border border-line bg-surface p-5 shadow-[0_24px_48px_-32px_rgb(100_35_80/0.35)] sm:p-6">
        <div aria-hidden>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
            <p className="font-serif text-[22px] leading-tight font-semibold whitespace-nowrap text-ink">Hoje, quarta-feira</p>
            <p className="text-[13px] text-muted tabular">4 clientes · 1 horário livre</p>
          </div>
          <ul className="mt-4 flex flex-col gap-2">
            {ROWS.map((r) => r.nome ? (
              <li key={r.hora} className="flex h-14 items-center gap-3 rounded-xl bg-sunken/70 px-3">
                <span className="w-11 shrink-0 text-[14px] font-semibold text-ink tabular">{r.hora}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-ink">{r.nome}</span>
                  <span className="block truncate text-[12px] text-ink-soft">{r.servico}</span>
                </span>
                {r.status && (
                  <span className={cn("hidden shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium sm:inline-flex", STATUS[r.status].className)}>
                    {r.status === "confirmou" && <Check className="h-3 w-3" strokeWidth={2.4} />}{STATUS[r.status].label}
                  </span>
                )}
              </li>
            ) : (
              <li key={r.hora} className="flex h-14 items-center gap-3 rounded-xl border border-dashed border-gold-300 px-3">
                <span className="w-11 shrink-0 text-[14px] font-semibold text-gold-ink tabular">{r.hora}</span>
                <span className="flex items-center gap-1.5 text-[13px] text-ink-soft"><Clock3 className="h-4 w-4 text-gold-600" strokeWidth={1.8} />Livre por 1 h, dá para encaixar</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
