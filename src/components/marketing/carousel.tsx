"use client";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Avanço automático legível: cada etapa tem a própria duração, pausa com o mouse em cima,
 * com o botão de pausa, fora da tela e por alguns segundos depois de qualquer interação
 * manual (para a pessoa ler no próprio ritmo).
 */
export function useAutoplay({ count, durations, active: canRun }: { count: number; durations: number[]; active: boolean }) {
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [holding, setHolding] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const running = canRun && !hovering && !userPaused && !holding;

  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), durations[index] ?? 5000);
    return () => clearTimeout(t);
  }, [running, index, count, durations]);

  useEffect(() => () => { if (holdTimer.current) clearTimeout(holdTimer.current); }, []);

  // Depois de uma interação manual, segura o avanço automático por 12 s.
  const hold = useCallback(() => {
    setHolding(true);
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => setHolding(false), 12_000);
  }, []);
  const go = useCallback((i: number) => { setIndex(((i % count) + count) % count); hold(); }, [count, hold]);
  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);

  return {
    index, go, next, prev, running, userPaused, hold,
    togglePause: () => setUserPaused((p) => !p),
    // Só mouse de verdade pausa por "estar em cima": no toque, o hold() de 12 s cuida disso.
    hoverProps: {
      onPointerEnter: (e: React.PointerEvent) => { if (e.pointerType === "mouse") setHovering(true); },
      onPointerLeave: (e: React.PointerEvent) => { if (e.pointerType === "mouse") setHovering(false); },
    },
  };
}

/** Arrastar o dedo (ou o mouse) para os lados troca a etapa; rolagem vertical continua livre. */
export function useSwipe(ref: RefObject<HTMLElement | null>, onLeft: () => void, onRight: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const down = (e: PointerEvent) => { start.current = { x: e.clientX, y: e.clientY }; moved.current = false; };
    const up = (e: PointerEvent) => {
      const s = start.current;
      start.current = null;
      if (!s) return;
      const dx = e.clientX - s.x, dy = e.clientY - s.y;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        moved.current = true;
        if (dx < 0) onLeft(); else onRight();
      }
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    const cancel = () => { start.current = null; };
    el.addEventListener("pointercancel", cancel);
    return () => { el.removeEventListener("pointerdown", down); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", cancel); };
  }, [ref, onLeft, onRight]);
  /** true se o último gesto foi um arraste (para não tratar como clique). */
  return () => moved.current;
}

/**
 * Barras de progresso (estilo "stories"), clicáveis, + botão de pausa.
 * A barra da etapa atual enche no tempo exato da etapa — a pessoa sabe quanto tempo ainda tem para ler.
 */
export function StoryBars({ count, index, durations, running, onGo, paused, onTogglePause, labels, className }: {
  count: number; index: number; durations: number[]; running: boolean; onGo: (i: number) => void;
  paused: boolean; onTogglePause: () => void; labels: string[]; className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex flex-1 gap-1.5" role="tablist" aria-label="Etapas">
        {Array.from({ length: count }, (_, i) => (
          <button key={i} role="tab" aria-selected={i === index} aria-label={labels[i]} onClick={() => onGo(i)}
            className="group relative h-6 flex-1 cursor-pointer" title={labels[i]}>
            <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 overflow-hidden rounded-full bg-white/15 transition-[height] group-hover:h-[5px]">
              <span
                key={`${i}-${index}-${running}`}
                className={cn("block h-full rounded-full bg-violet-200", i < index && "w-full", i >= index && "w-0")}
                style={i === index ? {
                  width: running ? undefined : "100%",
                  animation: running ? `story-fill ${durations[i] ?? 5000}ms linear forwards` : undefined,
                  opacity: running ? 1 : 0.7,
                } : undefined}
              />
            </span>
          </button>
        ))}
      </div>
      <button onClick={onTogglePause} aria-label={paused ? "Retomar animação" : "Pausar animação"} title={paused ? "Retomar" : "Pausar"}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-violet-100 ring-1 ring-white/15 transition hover:bg-white/20 active:scale-95">
        {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
