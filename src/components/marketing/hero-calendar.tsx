"use client";
import { useEffect, useRef, useState } from "react";
import { BarChart3, BellRing, CalendarDays, ChevronRight, Clock3, Heart } from "lucide-react";
import { cn } from "@/lib/cn";
import { usePrefersReducedMotion, useInView } from "./motion";

/**
 * Ilustração do hero: o calendário de agendamento online se preenche sozinho em looping
 * (escolhe o dia, depois o horário e aparece o selo "Confirmado!"). Com "reduzir movimento"
 * fica parado no estado final. Puramente ilustrativo: os botões não são interativos.
 */
const WEEK = ["S", "T", "Q", "Q", "S", "S", "D"];
const DAYS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const TIMES = ["09:00", "10:30", "14:30"];
const DAY = 12, TIME = "14:30";
const STEP_MS = [1300, 1100, 1100, 2600]; // vazio → dia → horário → confirmado

export function HeroCalendar() {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (reduced || !inView) return;
    const t = setTimeout(() => setStep((s) => (s + 1) % STEP_MS.length), STEP_MS[step]);
    return () => clearTimeout(t);
  }, [step, reduced, inView]);
  const s = reduced ? 3 : step;

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-[460px]">
      <div role="img" aria-label="Ilustração: a cliente escolhe o dia 12 às 14:30 e o horário fica confirmado."
        className="relative rounded-[28px] border border-line bg-surface/90 p-5 shadow-[0_30px_70px_-34px_rgb(90_40_120/0.45)] backdrop-blur sm:p-6">
        <div aria-hidden>
          <p className="flex items-center gap-2.5 text-[16px] font-medium text-ink"><CalendarDays className="h-5 w-5 text-gold-600" strokeWidth={1.8} />Selecione o dia e horário</p>
          <div className="mt-5 grid grid-cols-7 gap-1.5 text-center text-[12px] font-medium text-muted sm:gap-2">
            {WEEK.map((d, i) => <span key={i}>{d}</span>)}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1.5 sm:gap-2">
            {DAYS.map((d) => {
              const on = d === DAY && s >= 1;
              return (
                <span key={d} className={cn("grid aspect-square place-items-center rounded-xl text-[14px] tabular transition-all duration-500",
                  on ? "btn-glow scale-105 text-white" : "bg-sunken text-ink-soft")}>{d}</span>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-2">
            {TIMES.map((t) => {
              const on = t === TIME && s >= 2;
              return (
                <span key={t} className={cn("rounded-full px-3.5 py-1.5 text-[14px] tabular transition-all duration-500 sm:px-4",
                  on ? "btn-glow text-white" : "bg-sunken text-ink-soft", s >= 1 ? "opacity-100" : "opacity-50")}>{t}</span>
              );
            })}
            <ChevronRight className="h-4 w-4 text-muted" />
          </div>
        </div>
      </div>
      {/* Selo "Confirmado!" que gira e pousa no canto */}
      <span aria-hidden className={cn("absolute -top-4 right-2 inline-flex rotate-[-12deg] items-center gap-1.5 rounded-xl border border-gold-300 bg-gold-50 px-3 py-1.5 text-[14px] font-semibold text-gold-700 shadow-[0_12px_28px_-14px_rgb(138_100_38/0.6)] transition-all duration-500 sm:-right-6",
        s >= 3 ? "scale-100 opacity-100" : "scale-50 opacity-0")}>
        <CalendarDays className="h-4 w-4" strokeWidth={2} />Confirmado!
      </span>
    </div>
  );
}

const FEATS = [
  { icon: Clock3, label: "Agendamento 24h" },
  { icon: BellRing, label: "Lembretes automáticos" },
  { icon: BarChart3, label: "Indicadores claros" },
  { icon: Heart, label: "Mais clientes voltando" },
];

/** Quatro destaques com ícones em círculo de traço dourado, separados por filetes. */
export function HeroFeatures() {
  return (
    <ul className="mx-auto mt-8 grid w-full max-w-[460px] grid-cols-4 divide-x divide-line" aria-label="Destaques">
      {FEATS.map((f) => (
        <li key={f.label} className="flex flex-col items-center gap-2 px-1 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full border border-gold-300 bg-surface text-gold-600 shadow-[0_8px_20px_-12px_rgb(138_100_38/0.5)]">
            <f.icon className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <span className="text-[12px] leading-tight text-ink-soft sm:text-[13px]">{f.label}</span>
        </li>
      ))}
    </ul>
  );
}
