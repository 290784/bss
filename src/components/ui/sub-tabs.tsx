import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type SubTab = { id: string; label: string; icon?: LucideIcon; count?: number };

/**
 * Abas de uma página (?aba=…): divide telas longas em partes, uma de cada vez.
 * São links, então funcionam sem JavaScript, voltam com o botão "voltar" e podem ser compartilhados.
 * No celular a fileira rola para o lado.
 */
export function SubTabs({ tabs, current, href, label }: { tabs: SubTab[]; current: string; href: (id: string) => string; label: string }) {
  return (
    <nav aria-label={label} className="-mx-4 mb-6 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-1 rounded-full border border-line/70 bg-surface/70 p-1 shadow-[var(--shadow-control)]">
        {tabs.map((t) => {
          const active = t.id === current;
          return (
            <li key={t.id}>
              <Link href={href(t.id)} scroll={false} aria-current={active ? "page" : undefined}
                className={cn("press inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-medium whitespace-nowrap sm:h-9",
                  active ? "bg-accent-subtle text-accent-text ring-1 ring-gold-line/55" : "text-muted hover:bg-hover-tint hover:text-ink")}>
                {t.icon && <t.icon className="h-4 w-4" strokeWidth={1.7} aria-hidden />}
                {t.label}
                {t.count !== undefined && <span className={cn("rounded-full px-1.5 text-[11px] tabular", active ? "bg-surface" : "bg-sunken")}>{t.count}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
