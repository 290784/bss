"use client";
import { useCallback, useEffect, useRef, useState } from "react";
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

/**
 * Arrastar o card com o dedo (ou o mouse): ele acompanha o gesto e, ao soltar, troca de etapa
 * se passou do limite ou foi um peteleco; senão volta ao lugar. Rolagem vertical continua livre.
 */
export function useDragSwipe({ onLeft, onRight, onStart }: { onLeft: () => void; onRight: () => void; onStart?: () => void }) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const s = useRef<{ x: number; y: number; id: number; axis: "x" | "y" | null; lastX: number; lastT: number; v: number } | null>(null);
  const moved = useRef(false);

  const end = (e: React.PointerEvent) => {
    const st = s.current;
    s.current = null;
    if (!st || st.axis !== "x" || e.type === "pointercancel") { setDx(0); setDragging(false); return; }
    const d = e.clientX - st.x;
    setDx(0);
    setDragging(false);
    if (Math.abs(d) > 60 || (Math.abs(d) > 20 && Math.abs(st.v) > 0.45)) { if (d < 0) onLeft(); else onRight(); }
  };

  const bind = {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      s.current = { x: e.clientX, y: e.clientY, id: e.pointerId, axis: null, lastX: e.clientX, lastT: e.timeStamp, v: 0 };
      moved.current = false;
    },
    onPointerMove: (e: React.PointerEvent) => {
      const st = s.current;
      if (!st || st.id !== e.pointerId) return;
      const ddx = e.clientX - st.x, ddy = e.clientY - st.y;
      if (!st.axis) {
        if (Math.abs(ddx) < 6 && Math.abs(ddy) < 6) return;
        st.axis = Math.abs(ddx) > Math.abs(ddy) ? "x" : "y";
        if (st.axis === "y") { s.current = null; return; }
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        moved.current = true;
        setDragging(true);
        onStart?.();
      }
      const dt = Math.max(1, e.timeStamp - st.lastT);
      st.v = st.v * 0.6 + ((e.clientX - st.lastX) / dt) * 0.4;
      st.lastX = e.clientX;
      st.lastT = e.timeStamp;
      setDx(ddx);
    },
    onPointerUp: end,
    onPointerCancel: end,
    // Depois de um arraste, o "clique" do fim do gesto não conta.
    onClickCapture: (e: React.MouseEvent) => { if (moved.current) { e.stopPropagation(); e.preventDefault(); moved.current = false; } },
  };

  /** Estilo do card enquanto acompanha o dedo (resistência leve, inclina e esmaece um pouco). */
  const style: React.CSSProperties = {
    transform: dx ? `translateX(${dx * 0.85}px) rotate(${dx / 45}deg)` : undefined,
    opacity: dx ? Math.max(0.55, 1 - Math.abs(dx) / 500) : undefined,
    transition: dragging ? "none" : "transform .35s cubic-bezier(.2,.8,.2,1), opacity .35s",
  };
  return { bind, style, dragging };
}

/**
 * Barras de progresso (estilo "stories") + botão de pausa. A barra é um controle de arrastar:
 * passe o dedo (ou o mouse) por ela e a etapa acompanha, com o nome da etapa num balão.
 * A barra da etapa atual enche no tempo exato da etapa — a pessoa sabe quanto tempo ainda tem para ler.
 */
export function StoryBars({ count, index, durations, running, onGo, onScrub, paused, onTogglePause, labels, className }: {
  count: number; index: number; durations: number[]; running: boolean; onGo: (i: number) => void; onScrub?: () => void;
  paused: boolean; onTogglePause: () => void; labels: string[]; className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [scrub, setScrub] = useState<number | null>(null); // posição do dedo (0–1) enquanto arrasta
  const pointer = useRef<number | null>(null);

  const at = (clientX: number) => {
    const r = trackRef.current!.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    return { f, i: Math.min(count - 1, Math.floor(f * count)) };
  };
  const apply = (clientX: number) => {
    const { f, i } = at(clientX);
    setScrub(f);
    if (i !== index) { onGo(i); if (typeof navigator !== "undefined") navigator.vibrate?.(4); }
    onScrub?.();
  };
  const release = () => { pointer.current = null; setScrub(null); };

  const shown = scrub === null ? null : Math.min(count - 1, Math.floor(scrub * count));
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div ref={trackRef} className="relative flex flex-1 cursor-grab touch-pan-y gap-1.5 active:cursor-grabbing" role="tablist"
        aria-label="Etapas (arraste para escolher)"
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          pointer.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          apply(e.clientX);
        }}
        onPointerMove={(e) => { if (pointer.current === e.pointerId) apply(e.clientX); }}
        onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}>
        {Array.from({ length: count }, (_, i) => (
          <button key={i} role="tab" aria-selected={i === index} aria-label={labels[i]} tabIndex={i === index ? 0 : -1}
            // Teclado: Enter/Espaço geram clique sem ponteiro (detail 0); o ponteiro já é tratado no arraste.
            onClick={(e) => { if (e.detail === 0) onGo(i); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                e.preventDefault(); e.stopPropagation();
                onGo((index + (e.key === "ArrowRight" ? 1 : -1) + count) % count);
              }
            }}
            className="group relative h-8 flex-1" title={labels[i]}>
            <span className={cn("absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 overflow-hidden rounded-full bg-white/15 transition-[height] group-hover:h-[5px]", scrub !== null && "h-[6px]")}>
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
        {/* Marcador que segue o dedo + nome da etapa */}
        {scrub !== null && shown !== null && (
          <span className="pointer-events-none absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: `${scrub * 100}%` }} aria-hidden>
            <span className="block h-4 w-4 rounded-full border-2 border-white btn-glow shadow-[0_0_14px_rgb(192_110_247/0.9)]" />
            <span style={{ transform: `translateX(-${scrub * 100}%)` }} className="absolute bottom-[calc(100%+8px)] left-1/2 rounded-full bg-violet-100 px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap text-violet-800 shadow-lg">
              {labels[shown]}
            </span>
          </span>
        )}
      </div>
      <button onClick={onTogglePause} aria-label={paused ? "Retomar animação" : "Pausar animação"} title={paused ? "Retomar" : "Pausar"}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-violet-100 ring-1 ring-white/15 transition hover:bg-white/20 active:scale-95">
        {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
