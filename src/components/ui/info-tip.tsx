"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Info } from "lucide-react";

/**
 * "Como é calculado": abre com o mouse por cima, com o teclado e com um toque (no iPhone o botão não
 * recebe foco ao tocar, então o toque alterna). Toque fora ou Esc fecha.
 */
export function InfoTip({ text, label = "Como é calculado" }: { text: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <span ref={ref} className="group relative inline-flex align-middle">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-describedby={open ? id : undefined}
        className="relative rounded-full p-0.5 text-muted after:absolute after:-inset-3 after:content-[''] hover:text-ink focus:text-ink" aria-label={`${label}: ${text}`}>
        <Info className="h-3.5 w-3.5" />
      </button>
      <span id={id} role="tooltip"
        className={`pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-64 max-w-[70vw] -translate-x-1/2 rounded-lg bg-raised px-3 py-2 text-xs leading-relaxed font-normal text-ink ring-1 ring-line-strong shadow-[var(--shadow-pop)] ${open ? "block" : "hidden group-hover:block"}`}>
        {text}
      </span>
    </span>
  );
}
