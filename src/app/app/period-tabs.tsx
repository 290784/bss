"use client";
import { useEffect, useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

/**
 * Abas de período do painel: a escolhida muda na hora, a página não volta para o topo e os números
 * ficam esmaecidos enquanto os novos chegam (em vez de recarregar a página inteira).
 */
export function PeriodTabs({ periods, current, basePath = "/app" }: { periods: { id: string; label: string }[]; current: string; basePath?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [active, setActive] = useOptimistic(current);
  const pick = (id: string) => {
    if (id === active) return;
    start(() => {
      setActive(id);
      router.push(`${basePath}?periodo=${id}`, { scroll: false });
    });
  };
  useEffect(() => {
    if (pending) document.documentElement.dataset.atualizando = "1";
    else delete document.documentElement.dataset.atualizando;
  }, [pending]);
  return (
    <nav aria-label="Período" className="flex max-w-full overflow-x-auto rounded-full border border-line/70 bg-surface/70 p-1 shadow-[var(--shadow-control)]" aria-busy={pending}>
      {periods.map((p) => (
        <button key={p.id} type="button" onClick={() => pick(p.id)} aria-pressed={p.id === active}
          className={cn("press h-10 shrink-0 rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap sm:h-8",
            p.id === active ? "bg-accent-subtle text-accent-text" : "text-muted hover:text-ink")}>
          {p.label}
          {pending && p.id === active && <span className="ml-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent align-middle" aria-hidden />}
        </button>
      ))}
    </nav>
  );
}
