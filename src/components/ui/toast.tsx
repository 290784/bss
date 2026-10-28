"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type Action = { label: string; onClick: () => void };
type Toast = { id: number; message: string; tone: "success" | "error"; ms: number; action?: Action };

/** Tempo de leitura: ~60 ms por caractere, entre 5 e 10 segundos. */
const readingTime = (text: string) => Math.min(10_000, Math.max(5_000, 1_800 + text.length * 60));
type Push = (message: string, tone?: Toast["tone"], opts?: { action?: Action }) => void;
const Ctx = createContext<Push>(() => {});

/**
 * Uma janela modal aberta (<dialog>) deixa o resto da página inerte: o aviso precisa aparecer
 * dentro dela para ser visto e tocado (ex.: "Desfazer" com o agendamento aberto).
 */
function topModal(): HTMLElement | null {
  const open = [...document.querySelectorAll("dialog")].filter((d) => d.open && d.matches(":modal"));
  return (open.at(-1) as HTMLElement | undefined) ?? null;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const push = useCallback<Push>((message, tone = "success", opts) => {
    const id = Date.now() + Math.random();
    // Com ação (ex.: Desfazer), o aviso fica um pouco mais para dar tempo de tocar.
    const ms = readingTime(message) + (opts?.action ? 3_000 : 0);
    setHost(topModal());
    setToasts((t) => [...t.slice(-2), { id, message, tone, ms, action: opts?.action }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ms);
  }, []);
  const region = (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:pr-6">
      {toasts.map((t) => (
        <div key={t.id} role="status"
          className={cn(
            "pointer-events-auto relative flex max-w-sm items-center gap-2.5 overflow-hidden rounded-xl bg-raised py-1.5 pr-1.5 pl-4 text-left text-sm text-ink ring-1 ring-accent-border shadow-[var(--shadow-pop)] [animation:toast-in_.3s_ease-out]",
          )}>
          {t.tone === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-st-completed" /> : <AlertCircle className="h-4 w-4 shrink-0 text-st-noshow" />}
          <button type="button" title="Toque para fechar" className="min-h-10 flex-1 py-1.5 pr-2 text-left"
            onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}>{t.message}</button>
          {t.action && (
            <button type="button" className="h-10 shrink-0 rounded-lg px-3 text-[13px] font-semibold text-accent-text hover:bg-sunken"
              onClick={() => { t.action!.onClick(); setToasts((all) => all.filter((x) => x.id !== t.id)); }}>{t.action.label}</button>
          )}
          {/* Quanto tempo falta para o aviso sumir */}
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-violet-300/70" style={{ animation: `toast-time ${t.ms}ms linear forwards` }} />
        </div>
      ))}
    </div>
  );
  return (
    <Ctx.Provider value={push}>
      {children}
      {host?.isConnected ? createPortal(region, host) : region}
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
