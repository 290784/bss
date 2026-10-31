"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/cn";

/** Busca que filtra enquanto digita (sem precisar apertar Enter) e escolha de ordem. */
export function ClientListControls({ sorts, sort }: { sorts: { id: string; label: string }[]; sort: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [pending, start] = useTransition();
  const first = useRef(true);

  const push = (patch: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) { if (v) sp.set(k, v); else sp.delete(k); }
    sp.delete("pagina");
    start(() => router.replace(`${pathname}?${sp}`, { scroll: false }));
  };

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => push({ q: q.trim() || null }), 300);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
      <label className="relative flex-1 md:max-w-sm" role="search">
        <Search className={cn("pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted", pending && "animate-pulse text-accent-text")} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busque pelo nome, telefone ou e-mail" aria-label="Buscar cliente"
          className="h-10 w-full rounded-[10px] border border-line-strong bg-surface pr-9 pl-9 text-sm focus:border-accent focus:ring-2 focus:ring-accent-muted focus:outline-none" />
        {q && (
          <button type="button" onClick={() => setQ("")} aria-label="Limpar busca" className="absolute top-1/2 right-2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        )}
      </label>
      <label className="flex items-center gap-2 text-[13px] text-muted">
        Ordenar por
        <select value={sort} onChange={(e) => push({ ordem: e.target.value === "nome" ? null : e.target.value })} aria-label="Ordenar por"
          className="h-10 rounded-[10px] border border-line-strong bg-surface px-2.5 text-sm text-ink focus:border-accent focus:outline-none">
          {sorts.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </label>
    </div>
  );
}
