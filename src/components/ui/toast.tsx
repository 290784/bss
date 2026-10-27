"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type Toast = { id: number; message: string; tone: "success" | "error" };
const Ctx = createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:pr-6">
        {toasts.map((t) => (
          <div key={t.id} role="status" className={cn(
            "pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-xl bg-raised px-4 py-3 text-sm text-ink ring-1 ring-accent-border shadow-[var(--shadow-pop)] [animation:toast-in_.2s_ease-out]",
          )}>
            {t.tone === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-st-completed" /> : <AlertCircle className="h-4 w-4 shrink-0 text-st-noshow" />}
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
