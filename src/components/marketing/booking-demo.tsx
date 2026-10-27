"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Bookmark, Clock, ExternalLink, Search, Share2, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useInView, usePrefersReducedMotion } from "./motion";

/**
 * Demonstração do agendamento online em etapas: busca → digitação → sugestões →
 * resultados → serviço com "melhor horário". Ilustração (dados de exemplo, sem avaliações
 * ou números inventados apresentados como reais). Roda em loop só quando visível.
 */

const QUERY = "Sobrancelha";
// [etapa, duração em ms]
const STEPS: [Stage, number][] = [["empty", 700], ["typing", 900], ["suggest", 1300], ["results", 1500], ["grid", 1300], ["detail", 3800]];
type Stage = "empty" | "typing" | "suggest" | "results" | "grid" | "detail";

export function BookingDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const reduced = usePrefersReducedMotion();
  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState(0);
  const stage: Stage = reduced ? "detail" : STEPS[step]![0];

  useEffect(() => {
    if (reduced || !inView) return;
    const t = setTimeout(() => {
      setStep((s) => (s + 1) % STEPS.length);
      setTyped(0);
    }, STEPS[step]![1]);
    return () => clearTimeout(t);
  }, [step, inView, reduced]);

  useEffect(() => {
    if (stage !== "typing" || typed >= QUERY.length) return;
    const t = setTimeout(() => setTyped((n) => n + 1), 900 / (QUERY.length + 2));
    return () => clearTimeout(t);
  }, [stage, typed]);

  const text = stage === "empty" ? "" : stage === "typing" ? QUERY.slice(0, typed) : QUERY;
  const showSearch = stage === "empty" || stage === "typing" || stage === "suggest";

  return (
    <div ref={ref} className="relative mx-auto aspect-[5/6] w-full max-w-[440px]" aria-label="Demonstração do agendamento online" role="img">
      {/* Formas de fundo */}
      <span className="absolute top-[6%] -left-[10%] h-[62%] w-[62%] rounded-full bg-mkt-shape" aria-hidden />
      <span className="absolute -right-[8%] bottom-[2%] h-[56%] w-[56%] rounded-full bg-mkt-shape" aria-hidden />

      <div className="absolute inset-x-[6%] inset-y-[4%] overflow-hidden rounded-[28px] bg-white shadow-[0_30px_60px_-30px_rgba(21,16,11,.45),0_2px_8px_rgba(21,16,11,.06)]">
        {showSearch ? (
          <div className="p-4">
            <div className="flex items-center gap-2">
              <ArrowLeft className="h-5 w-5 shrink-0 text-ink-warm/60" />
              <div className="flex h-11 flex-1 items-center gap-2 rounded-full bg-[#f1efec] px-3.5">
                <Search className="h-4 w-4 text-ink-warm/50" />
                <span className="flex-1 truncate text-[15px] font-bold text-ink-warm">
                  {text}
                  {stage !== "suggest" && <span className="ml-px inline-block h-4 w-px translate-y-0.5 bg-ink-warm motion-safe:[animation:mkt-caret_1s_steps(1)_infinite]" />}
                </span>
                {text && <span className="grid h-5 w-5 place-items-center rounded-full bg-[#d9d6d2]"><X className="h-3 w-3 text-white" /></span>}
              </div>
              <span className="h-9 w-14 shrink-0 rounded-full bg-[#f1efec]" />
            </div>
            {stage === "suggest" && (
              <ul className="mt-3 divide-y divide-[#efedea] motion-safe:[animation:mkt-drop_.35s_ease-out]">
                {["Design de sobrancelhas", "Design com henna"].map((s) => (
                  <li key={s} className="flex items-center gap-3 py-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f1efec]"><Search className="h-4 w-4 text-ink-warm/50" /></span>
                    <span className="text-[14px] font-bold text-ink-warm">{s}</span>
                  </li>
                ))}
                <li className="flex items-center gap-3 py-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-plum-700 text-[11px] font-bold text-champagne-100">B·</span>
                  <span className="flex-1 text-[14px] font-bold text-ink-warm">beautyos.app/b/seu-studio</span>
                  <ExternalLink className="h-4 w-4 text-ink-warm/40" />
                </li>
                <li className="flex items-center gap-3 py-3"><span className="h-9 w-9 rounded-full bg-[#f1efec]" /><span className="h-2.5 w-32 rounded-full bg-[#e7e5e2]" /></li>
              </ul>
            )}
          </div>
        ) : stage === "results" || stage === "grid" ? (
          <div className="p-4 motion-safe:[animation:mkt-rise_.4s_ease-out]">
            <div className="flex gap-5 border-b border-[#efedea] pb-2 text-[13px] font-bold">
              <span className="relative text-ink-warm after:absolute after:inset-x-0 after:-bottom-2 after:h-[3px] after:rounded-full after:bg-ink-warm">Serviços</span>
              <span className="mt-1 h-2.5 w-16 rounded-full bg-[#e7e5e2]" /><span className="mt-1 h-2.5 w-12 rounded-full bg-[#e7e5e2]" />
            </div>
            <div className="overflow-hidden">
            <div className={cn("transition-transform duration-500 ease-out", stage === "grid" && "-translate-y-[76px]")}>
              <div className="flex items-center gap-3 py-4">
                <span className="relative grid h-11 w-11 place-items-center rounded-full bg-plum-700 text-xs font-bold text-champagne-100">
                  B·<span className="absolute -right-1 -bottom-1 h-4 w-4 rounded-full border-2 border-white bg-slot-1" />
                </span>
                <div><div className="text-[15px] font-bold text-ink-warm">Seu Studio</div><div className="text-xs text-ink-warm/50">Agenda aberta hoje</div></div>
              </div>
              <div className={cn("transition-opacity duration-500", stage === "grid" ? "opacity-100" : "opacity-0")}>
                <div className="mb-3 flex gap-1.5">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f1efec]"><SlidersHorizontal className="h-3.5 w-3.5 text-ink-warm/60" /></span>
                  {[14, 10, 12, 9].map((w, i) => <span key={i} className="h-8 rounded-full bg-[#f1efec]" style={{ width: w * 4 }} />)}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <ServiceTile gradient="radial-gradient(circle at 35% 35%,#ffd6c2,#f4a07a 60%,#e9805a)" active={false} />
                  <ServiceTile gradient="radial-gradient(circle at 35% 35%,#fff3b0,#f6d365 60%,#eab949)" active={false} />
                </div>
              </div>
            </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col motion-safe:[animation:mkt-card-in_.5s_cubic-bezier(.2,.8,.2,1)]">
            <div className="relative h-[52%] bg-[radial-gradient(circle_at_40%_35%,#ffe6d9,#f6b59a_55%,#ee9473)]">
              <span className="absolute top-4 left-1/2 grid h-10 w-10 -translate-x-1/2 place-items-center rounded-full bg-ink-warm text-xs font-bold text-white">B·</span>
              <span className="absolute inset-0 m-auto h-24 w-24 rounded-[40%] bg-white/40 blur-[1px]" aria-hidden />
              <div className="absolute bottom-3 left-4 flex gap-1.5">{[0, 1, 2, 3, 4].map((i) => <span key={i} className={cn("h-1.5 w-1.5 rounded-full", i === 0 ? "bg-ink-warm" : "bg-white/80")} />)}</div>
              <div className="absolute right-3 bottom-3 flex gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-white"><Bookmark className="h-4 w-4 text-ink-warm" /></span>
                <span className="grid h-8 w-8 place-items-center rounded-full bg-white"><Share2 className="h-4 w-4 text-ink-warm" /></span>
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-3 p-4">
              <div className="flex items-center gap-2 self-start rounded-full bg-[#f1efec] px-3 py-1.5 motion-safe:[animation:mkt-rise_.5s_ease-out_.2s_both]">
                <Clock className="h-4 w-4 text-ink-warm" /><span className="text-[15px] font-bold text-ink-warm">45 min</span><span className="text-[13px] text-ink-warm/50">· Design de sobrancelhas</span>
              </div>
              <div className="rounded-2xl border border-[#efedea] p-3.5 motion-safe:[animation:mkt-rise_.6s_ease-out_.35s_both]">
                <div className="text-[17px] font-bold text-ink-warm">Melhor horário hoje!</div>
                <div className="text-[13px] text-ink-warm/60">Horários livres entre <strong className="text-ink-warm">14:00–18:00</strong>.</div>
                <div className="mt-11">
                  <div className="relative">
                    <span className="absolute bottom-[calc(100%+14px)] left-[22%] -translate-x-1/2 rounded-md bg-slot-1 px-2 py-0.5 text-[12px] font-semibold whitespace-nowrap text-ink-warm">14:30 Hoje</span>
                    <span className="absolute bottom-1/2 left-[22%] h-[26px] w-px -translate-x-1/2 bg-ink-warm" aria-hidden />
                    <div className="flex h-2.5 gap-[3px] overflow-hidden rounded-full">
                      <span className="w-[34%] bg-slot-1" /><span className="w-[33%] bg-slot-2" /><span className="flex-1 bg-slot-3" />
                    </div>
                    <span className="absolute top-1/2 left-[22%] h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ink-warm" aria-hidden />
                  </div>
                  <div className="relative mt-1.5 h-4 text-[11px] font-medium text-ink-warm/50 tabular">
                    <span className="absolute left-[34%] -translate-x-1/2">14:00</span><span className="absolute left-[67%] -translate-x-1/2">18:00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <span className="sr-only">Ilustração: a cliente busca o serviço, escolhe o estabelecimento e vê o melhor horário livre do dia.</span>
    </div>
  );
}

function ServiceTile({ gradient, active }: { gradient: string; active: boolean }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl bg-[#f6f5f3] transition-transform duration-500", active && "scale-105")}>
      <div className="aspect-square" style={{ background: gradient }} />
      <div className="p-2.5"><span className="block h-2.5 w-20 rounded-full bg-[#e7e5e2]" /><span className="mt-1.5 block h-2 w-12 rounded-full bg-[#e7e5e2]" /></div>
    </div>
  );
}
