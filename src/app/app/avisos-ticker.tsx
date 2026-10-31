"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bell, Gift, Package, TrendingUp } from "lucide-react";
import { cn } from "@/lib/cn";

export type TickerItem = { id: string; text: string; kind: "faturamento" | "estoque" | "mimos" | "avisos" | "atencao"; href: string };

const ICON = { faturamento: TrendingUp, estoque: Package, mimos: Gift, avisos: Bell, atencao: AlertTriangle };
const TONE = {
  faturamento: "text-st-completed", estoque: "text-gold-600", mimos: "text-accent-text", avisos: "text-st-pending", atencao: "text-st-pending",
};

/**
 * Faixa de avisos que passa sozinha no topo do painel (dicas da Gê e pontos de atenção).
 * Para ao passar o mouse ou tocar; quem prefere menos movimento vê a faixa parada, com rolagem.
 * As dicas marcadas como "Já fiz" não aparecem.
 */
export function AvisosTicker({ items }: { items: TickerItem[] }) {
  const [done, setDone] = useState<Record<string, number>>({});
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    try {
      // Lido do aparelho só depois de montar (no servidor não existe localStorage).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDone(JSON.parse(localStorage.getItem("ge-dicas-feitas") ?? "{}"));
    } catch { /* sem armazenamento: mostra tudo */ }
  }, []);
  const list = items.filter((i) => !done[i.id]);
  if (list.length === 0) return null;
  // ~8 s por aviso, para dar tempo de ler com calma.
  const duration = Math.max(32, list.length * 8);
  const row = (copy: number) => list.map((i) => {
    const Icon = ICON[i.kind];
    return (
      <li key={`${copy}-${i.id}`} aria-hidden={copy > 0 || undefined}>
        <Link href={i.href} tabIndex={copy > 0 ? -1 : undefined}
          className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface/80 px-3.5 text-[13px] font-medium whitespace-nowrap shadow-sm backdrop-blur transition hover:border-accent">
          <Icon className={cn("h-4 w-4 shrink-0", TONE[i.kind])} />{i.text}
        </Link>
      </li>
    );
  });
  return (
    <div className="ticker relative -mx-1 mb-6 overflow-hidden px-1" aria-label="Avisos" role="region"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)} onTouchEnd={() => setTimeout(() => setPaused(false), 2500)}>
      <ul className={cn("ticker-track flex w-max gap-2.5", paused && "[animation-play-state:paused]")} style={{ animationDuration: `${duration}s` }}>
        {row(0)}{row(1)}
      </ul>
    </div>
  );
}
