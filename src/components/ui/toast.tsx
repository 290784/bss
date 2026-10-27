"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type Toast = { id: number; message: string; tone: "success" | "error"; ms: number };

/** Tempo de leitura: ~60 ms por caractere, entre 5 e 10 segundos. */
const readingTime = (text: string) => Math.min(10_000, Math.max(5_000, 1_800 + text.length * 60));
const Ctx = createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random();
    const ms = readingTime(message);
    setToasts((t) => [...t.slice(-2), { id, message, tone, ms }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ms);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:pr-6">
        {toasts.map((t) => (
          <button key={t.id} role="status" title="Toque para fechar"
            onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}
            className={cn(
              "pointer-events-auto relative flex max-w-sm items-center gap-2.5 overflow-hidden rounded-xl bg-raised px-4 py-3 text-left text-sm text-ink ring-1 ring-accent-border shadow-[var(--shadow-pop)] transition active:scale-[0.98] [animation:toast-in_.3s_ease-out]",
            )}>
            {t.tone === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-st-completed" /> : <AlertCircle className="h-4 w-4 shrink-0 text-st-noshow" />}
            {t.message}
            {/* Quanto tempo falta para o aviso sumir */}
            <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-violet-300/70" style={{ animation: `toast-time ${t.ms}ms linear forwards` }} />
          </button>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
