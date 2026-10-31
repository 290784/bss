"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Bell, Gift, Package, TrendingUp } from "lucide-react";
import { cn } from "@/lib/cn";

export type TickerItem = { id: string; text: string; kind: "faturamento" | "estoque" | "mimos" | "avisos" | "atencao"; href: string };

const ICON = { faturamento: TrendingUp, estoque: Package, mimos: Gift, avisos: Bell, atencao: AlertTriangle };
const TONE = {
  faturamento: "text-st-completed", estoque: "text-gold-600", mimos: "text-accent-text", avisos: "text-st-pending", atencao: "text-st-pending",
};
/** Velocidade do movimento sozinho (px por segundo): devagar, para dar tempo de ler. */
const SPEED = 22;
/** Depois de arrastar, espera um pouco antes de voltar a andar. */
const RESUME_MS = 2500;
/** Abaixo disso o toque conta como clique, não como arrasto. */
const TAP_PX = 6;

/**
 * Faixa de avisos do topo do painel (dicas da Gê e pontos de atenção): anda sozinha, devagar e sem
 * parar; dá para arrastar com o dedo ou o mouse para os dois lados (voltar o que já passou) e um toque
 * sem arrastar abre o aviso. Quem prefere menos movimento vê a faixa parada (mas ainda arrastável).
 * As dicas marcadas como "Já fiz" não aparecem.
 */
export function AvisosTicker({ items }: { items: TickerItem[] }) {
  const router = useRouter();
  const [done, setDone] = useState<Record<string, number>>({});
  const track = useRef<HTMLUListElement>(null);
  const offset = useRef(0);
  const drag = useRef<{ id: number; x: number; start: number; moved: number } | null>(null);
  const resumeAt = useRef(0);

  useEffect(() => {
    try {
      // Lido do aparelho só depois de montar (no servidor não existe localStorage).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDone(JSON.parse(localStorage.getItem("ge-dicas-feitas") ?? "{}"));
    } catch { /* sem armazenamento: mostra tudo */ }
  }, []);
  const list = items.filter((i) => !done[i.id]);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(64, t - last); last = t;
      const half = el.scrollWidth / 2; // duas cópias iguais lado a lado
      if (!still && !drag.current && t >= resumeAt.current) offset.current += (SPEED * dt) / 1000;
      if (half > 0) offset.current = ((offset.current % half) + half) % half; // volta contínua, nos dois sentidos
      el.style.transform = `translate3d(${-offset.current}px,0,0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [list.length]);

  if (list.length === 0) return null;

  const onDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag.current = { id: e.pointerId, x: e.clientX, start: offset.current, moved: 0 };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    d.moved = Math.max(d.moved, Math.abs(dx));
    if (d.moved > TAP_PX && !(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId))
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    offset.current = d.start - dx;
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    resumeAt.current = performance.now() + RESUME_MS;
    if (d.moved <= TAP_PX) {
      // Toque/clique: abre o aviso que está debaixo do dedo.
      const a = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLAnchorElement>("a[data-href]");
      const href = a?.dataset.href;
      if (href) {
        if (href.startsWith("#")) document.getElementById(href.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
        else router.push(href);
      }
    }
  };

  const row = (copy: number) => list.map((i) => {
    const Icon = ICON[i.kind];
    return (
      <li key={`${copy}-${i.id}`} aria-hidden={copy > 0 || undefined}>
        <a href={i.href} data-href={i.href} tabIndex={copy > 0 ? -1 : undefined} draggable={false}
          onClick={(e) => e.preventDefault() /* a navegação é feita no soltar, para não confundir com arrasto */}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (i.href.startsWith("#")) document.getElementById(i.href.slice(1))?.scrollIntoView({ behavior: "smooth" }); else router.push(i.href); } }}
          className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface/80 px-3.5 text-[13px] font-medium whitespace-nowrap shadow-sm backdrop-blur transition-colors hover:border-accent">
          <Icon className={cn("h-4 w-4 shrink-0", TONE[i.kind])} />{i.text}
        </a>
      </li>
    );
  });

  return (
    <div className="ticker relative -mx-1 mb-6 cursor-grab touch-pan-y overflow-hidden px-1 select-none active:cursor-grabbing" aria-label="Avisos" role="region"
      style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      onContextMenu={(e) => e.preventDefault()}>
      <ul ref={track} className="flex w-max gap-2.5 will-change-transform" data-testid="ticker-track">
        {row(0)}{row(1)}
      </ul>
    </div>
  );
}
