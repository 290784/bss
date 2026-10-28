"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Modal/drawer baseado em <dialog> nativo: foco preso, Esc fecha, acessível por padrão.
 * `side="right"` vira drawer no desktop; no celular, ambos sobem como folha inferior.
 */
export function Dialog({
  open, onClose, title, description, children, footer, side = "center", className,
}: {
  open: boolean; onClose: () => void; title: string; description?: ReactNode; children: ReactNode;
  footer?: ReactNode; side?: "center" | "right"; className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className={cn(
        "m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-2xl bg-surface p-0 text-ink shadow-[var(--shadow-pop)] [animation:sheet-up_.22s_ease-out]",
        side === "center" && "sm:m-auto sm:max-w-lg sm:rounded-2xl sm:[animation:toast-in_.18s_ease-out]",
        side === "right" && "sm:my-0 sm:mr-0 sm:ml-auto sm:h-dvh sm:max-h-dvh sm:max-w-[440px] sm:rounded-none sm:rounded-l-2xl sm:[animation:sheet-in_.22s_ease-out]",
        className,
      )}
    >
      {open && (
        <div className={cn("flex max-h-[92dvh] flex-col", side === "right" && "sm:h-dvh sm:max-h-dvh")}>
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <h2 className="text-base font-semibold">{title}</h2>
              {description && <div className="mt-0.5 text-[13px] text-muted">{description}</div>}
            </div>
            <button onClick={onClose} className="-mr-1 rounded-lg p-1.5 text-muted hover:bg-sunken hover:text-ink" aria-label="Fechar">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-canvas/60 px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, description, confirmLabel = "Confirmar", danger, children,
}: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; description?: ReactNode; confirmLabel?: string; danger?: boolean; children?: ReactNode }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button onClick={onClose} className="h-10 rounded-[10px] px-4 text-sm font-medium text-ink-soft hover:bg-sunken">Voltar</button>
          <button onClick={onConfirm} className={cn("h-10 rounded-[10px] px-4 text-sm font-medium text-white", danger ? "bg-danger hover:brightness-110" : "btn-glow hover:brightness-110")}>
            {confirmLabel}
          </button>
        </>
      }
    >
      {description && <p className="text-sm text-ink-soft">{description}</p>}
      {children}
    </Dialog>
  );
}
