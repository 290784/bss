"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Bookmark, Clock, ExternalLink, Search, Share2, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useInView, usePrefersReducedMotion } from "./motion";
import { StoryBars, useAutoplay, useSwipe } from "./carousel";

/**
 * Demonstração do agendamento online em etapas: busca → digitação → sugestões →
 * resultados → serviço com "melhor horário". Ilustração (dados de exemplo, sem avaliações
 * ou números inventados apresentados como reais). Ritmo de leitura, com legenda por etapa,
 * barras clicáveis, pausa, toque para avançar e arrastar para os lados.
 */

const QUERY = "Sobrancelha";
type Stage = "empty" | "typing" | "suggest" | "results" | "grid" | "detail";
const STEPS: { stage: Stage; ms: number; caption: string }[] = [
  { stage: "empty", ms: 1800, caption: "A cliente abre o seu link" },
  { stage: "typing", ms: 3000, caption: "Busca o serviço que deseja" },
  { stage: "suggest", ms: 3400, caption: "Vê sugestões do seu catálogo" },
  { stage: "results", ms: 3000, caption: "Encontra o seu estúdio" },
  { stage: "grid", ms: 3200, caption: "Escolhe o serviço" },
  { stage: "detail", ms: 6500, caption: "E vê o melhor horário livre do dia" },
];
const DURATIONS = STEPS.map((x) => x.ms);
const TYPE_MS = 2200; // digitação calma, letra a letra

export function BookingDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const reduced = usePrefersReducedMotion();
  const auto = useAutoplay({ count: STEPS.length, durations: DURATIONS, active: !reduced && inView });
  const wasSwipe = useSwipe(stageRef, auto.next, auto.prev);
  const step = reduced ? STEPS.length - 1 : auto.index;
  const stage: Stage = STEPS[step]!.stage;

  // Letras digitadas na etapa atual (zera ao trocar de etapa).
  const [typed, setTyped] = useState({ step: -1, n: 0 });
  const n = typed.step === step ? typed.n : 0;
  useEffect(() => {
    if (stage !== "typing" || n >= QUERY.length) return;
    const t = setTimeout(() => setTyped({ step, n: n + 1 }), TYPE_MS / QUERY.length);
    return () => clearTimeout(t);
  }, [stage, n, step]);

  const onKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); auto.next(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); auto.prev(); }
  }, [auto]);

  const text = stage === "empty" ? "" : stage === "typing" ? QUERY.slice(0, n) : QUERY;
  const showSearch = stage === "empty" || stage === "typing" || stage === "suggest";

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-[440px]" {...auto.hoverProps} onPointerDown={auto.hold}
      role="region" aria-label="Demonstração do agendamento online" tabIndex={0} onKeyDown={onKey}>
      <StoryBars className="relative z-20 mb-3 px-[6%]" count={STEPS.length} index={step} durations={DURATIONS} running={auto.running}
        onGo={auto.go} paused={auto.userPaused || reduced} onTogglePause={auto.togglePause} labels={STEPS.map((x) => x.caption)} />
    <div ref={stageRef} className="relative aspect-[5/6] w-full cursor-pointer touch-pan-y" role="img" aria-label={STEPS[step]!.caption}
      onClick={() => { if (!wasSwipe()) auto.next(); }}>
      {/* Formas de fundo */}
      <span className="absolute top-[6%] -left-[10%] h-[62%] w-[62%] rounded-full bg-mkt-shape" aria-hidden />
      <span className="absolute -right-[8%] bottom-[2%] h-[56%] w-[56%] rounded-full bg-mkt-shape" aria-hidden />

      <div className="absolute inset-x-[6%] inset-y-[4%] overflow-hidden rounded-[28px] bg-[#0c0820] ring-1 ring-white/15 shadow-[0_30px_70px_-25px_rgb(0_0_0/0.9),0_0_50px_-20px_rgb(192_110_247/0.6)]">
        {showSearch ? (
          <div className="p-4">
            <div className="flex items-center gap-2">
              <ArrowLeft className="h-5 w-5 shrink-0 text-ink/60" />
              <div className="flex h-11 flex-1 items-center gap-2 rounded-full bg-[#1d1535] px-3.5">
                <Search className="h-4 w-4 text-ink/50" />
                <span className="flex-1 truncate text-[15px] font-bold text-ink">
                  {text}
                  {stage !== "suggest" && <span className="ml-px inline-block h-4 w-px translate-y-0.5 btn-glow motion-safe:[animation:mkt-caret_1s_steps(1)_infinite]" />}
                </span>
                {text && <span className="grid h-5 w-5 place-items-center rounded-full bg-[#3d3060]"><X className="h-3 w-3 text-white" /></span>}
              </div>
              <span className="h-9 w-14 shrink-0 rounded-full bg-[#1d1535]" />
            </div>
            {stage === "suggest" && (
              <ul className="mt-3 divide-y divide-[#241b3c] motion-safe:[animation:mkt-drop_.6s_ease-out]">
                {["Design de sobrancelhas", "Design com henna"].map((s) => (
                  <li key={s} className="flex items-center gap-3 py-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-[#1d1535]"><Search className="h-4 w-4 text-ink/50" /></span>
                    <span className="text-[14px] font-bold text-ink">{s}</span>
                  </li>
                ))}
                <li className="flex items-center gap-3 py-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-accent-text text-[11px] font-bold text-highlight-subtle">B·</span>
                  <span className="flex-1 text-[14px] font-bold text-ink">Página de agendamento · Seu Studio</span>
                  <ExternalLink className="h-4 w-4 text-ink/40" />
                </li>
                <li className="flex items-center gap-3 py-3"><span className="h-9 w-9 rounded-full bg-[#1d1535]" /><span className="h-2.5 w-32 rounded-full bg-[#2d2348]" /></li>
              </ul>
            )}
          </div>
        ) : stage === "results" || stage === "grid" ? (
          <div className="p-4 motion-safe:[animation:mkt-rise_.6s_ease-out]">
            <div className="flex gap-5 border-b border-[#241b3c] pb-2 text-[13px] font-bold">
              <span className="relative text-ink after:absolute after:inset-x-0 after:-bottom-2 after:h-[3px] after:rounded-full after:btn-glow">Serviços</span>
              <span className="mt-1 h-2.5 w-16 rounded-full bg-[#2d2348]" /><span className="mt-1 h-2.5 w-12 rounded-full bg-[#2d2348]" />
            </div>
            <div className="overflow-hidden">
            <div className={cn("transition-transform duration-700 ease-[cubic-bezier(.2,.8,.2,1)]", stage === "grid" && "-translate-y-[76px]")}>
              <div className="flex items-center gap-3 py-4">
                <span className="relative grid h-11 w-11 place-items-center rounded-full bg-accent-text text-xs font-bold text-highlight-subtle">
                  B·<span className="absolute -right-1 -bottom-1 h-4 w-4 rounded-full border-2 border-white bg-slot-1" />
                </span>
                <div><div className="text-[15px] font-bold text-ink">Seu Studio</div><div className="text-xs text-ink/50">Agenda aberta hoje</div></div>
              </div>
              <div className={cn("transition-opacity duration-700", stage === "grid" ? "opacity-100" : "opacity-0")}>
                <div className="mb-3 flex gap-1.5">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[#1d1535]"><SlidersHorizontal className="h-3.5 w-3.5 text-ink/60" /></span>
                  {[14, 10, 12, 9].map((w, i) => <span key={i} className="h-8 rounded-full bg-[#1d1535]" style={{ width: w * 4 }} />)}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <ServiceTile gradient="radial-gradient(circle at 35% 35%,#eacffc,#c06ef7 55%,#780ac2)" active={false} />
                  <ServiceTile gradient="radial-gradient(circle at 35% 35%,#d59efa,#960df2 55%,#3c0561)" active={false} />
                </div>
              </div>
            </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col motion-safe:[animation:mkt-card-in_.7s_cubic-bezier(.2,.8,.2,1)]">
            <div className="relative h-[52%] bg-[radial-gradient(circle_at_40%_35%,#eacffc,#ab3df5_50%,#3c0561)]">
              <span className="absolute top-4 left-1/2 grid h-10 w-10 -translate-x-1/2 place-items-center rounded-full btn-glow text-xs font-bold text-white">B·</span>
              <span className="absolute inset-0 m-auto h-24 w-24 rounded-[40%] bg-white/25 blur-[1px]" aria-hidden />
              <div className="absolute bottom-3 left-4 flex gap-1.5">{[0, 1, 2, 3, 4].map((i) => <span key={i} className={cn("h-1.5 w-1.5 rounded-full", i === 0 ? "btn-glow" : "bg-ink/60")} />)}</div>
              <div className="absolute right-3 bottom-3 flex gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-raised"><Bookmark className="h-4 w-4 text-ink" /></span>
                <span className="grid h-8 w-8 place-items-center rounded-full bg-raised"><Share2 className="h-4 w-4 text-ink" /></span>
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-3 p-4">
              <div className="flex items-center gap-2 self-start rounded-full bg-[#1d1535] px-3 py-1.5 motion-safe:[animation:mkt-rise_.7s_ease-out_.4s_both]">
                <Clock className="h-4 w-4 text-ink" /><span className="text-[15px] font-bold text-ink">45 min</span><span className="text-[13px] text-ink/50">· Design de sobrancelhas</span>
              </div>
              <div className="rounded-2xl border border-[#241b3c] p-3.5 motion-safe:[animation:mkt-rise_.8s_ease-out_.8s_both]">
                <div className="text-[17px] font-bold text-ink">Melhor horário hoje!</div>
                <div className="text-[13px] text-ink/60">Horários livres entre <strong className="text-ink">14:00–18:00</strong>.</div>
                <div className="mt-11">
                  <div className="relative">
                    <span className="absolute bottom-[calc(100%+14px)] left-[22%] -translate-x-1/2 rounded-md bg-violet-100 px-2 py-0.5 text-[12px] font-semibold whitespace-nowrap text-violet-800">14:30 Hoje</span>
                    <span className="absolute bottom-1/2 left-[22%] h-[26px] w-px -translate-x-1/2 btn-glow" aria-hidden />
                    <div className="flex h-2.5 gap-[3px] overflow-hidden rounded-full">
                      <span className="w-[34%] bg-slot-1" /><span className="w-[33%] bg-slot-2" /><span className="flex-1 bg-slot-3" />
                    </div>
                    <span className="absolute top-1/2 left-[22%] h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white btn-glow" aria-hidden />
                  </div>
                  <div className="relative mt-1.5 h-4 text-[11px] font-medium text-ink/50 tabular">
                    <span className="absolute left-[34%] -translate-x-1/2">14:00</span><span className="absolute left-[67%] -translate-x-1/2">18:00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
      <p key={step} className="mt-3 text-center text-[15px] font-medium text-violet-100 motion-safe:[animation:mkt-rise_.6s_ease-out_both]" aria-live="polite">
        <span className="mr-1.5 text-[13px] text-muted tabular">{step + 1}/{STEPS.length}</span>{STEPS[step]!.caption}
      </p>
    </div>
  );
}

function ServiceTile({ gradient, active }: { gradient: string; active: boolean }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl bg-[#181130] transition-transform duration-500", active && "scale-105")}>
      <div className="aspect-square" style={{ background: gradient }} />
      <div className="p-2.5"><span className="block h-2.5 w-20 rounded-full bg-[#2d2348]" /><span className="mt-1.5 block h-2 w-12 rounded-full bg-[#2d2348]" /></div>
    </div>
  );
}
