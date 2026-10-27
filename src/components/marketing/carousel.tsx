"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Avanço automático legível e em looping: cada etapa tem a própria duração; pausa com o mouse
 * em cima, fora da tela e por alguns segundos depois de uma interação de verdade (arrastar,
 * tocar no card, escolher no dock) — rolar a página não conta.
 * `cycle` muda a cada volta completa e no restart(), para reiniciar animações internas.
 */
export function useAutoplay({ count, durations, active: canRun }: { count: number; durations: number[]; active: boolean }) {
  const [pos, setPos] = useState({ index: 0, cycle: 0 });
  const [hovering, setHovering] = useState(false);
  const [holding, setHolding] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const running = canRun && !hovering && !holding;

  useEffect(() => {
    if (!running) return;
    const t = setTimeout(
      () => setPos((p) => (p.index + 1 >= count ? { index: 0, cycle: p.cycle + 1 } : { index: p.index + 1, cycle: p.cycle })),
      durations[pos.index] ?? 5000,
    );
    return () => clearTimeout(t);
  }, [running, pos, count, durations]);

  useEffect(() => () => { if (holdTimer.current) clearTimeout(holdTimer.current); }, []);

  // Depois de uma interação manual, segura o avanço automático por 12 s.
  const hold = useCallback(() => {
    setHolding(true);
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => setHolding(false), 12_000);
  }, []);
  const go = useCallback((i: number) => { setPos((p) => ({ index: ((i % count) + count) % count, cycle: p.cycle })); hold(); }, [count, hold]);
  const next = useCallback(() => go(pos.index + 1), [go, pos.index]);
  const prev = useCallback(() => go(pos.index - 1), [go, pos.index]);
  /** Volta ao começo e continua sozinho (sem segurar). */
  const restart = useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    setHolding(false);
    setPos((p) => ({ index: 0, cycle: p.cycle + 1 }));
  }, []);

  return {
    index: pos.index, cycle: pos.cycle, go, next, prev, hold, restart, running,
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
