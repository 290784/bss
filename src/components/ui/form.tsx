"use client";
import { useFormStatus } from "react-dom";
import { startTransition, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./button";

const control =
  "rounded-[10px] border border-line-strong bg-surface px-3 text-[15px] text-ink placeholder:text-muted/70 " +
  "transition-colors hover:border-[#c7b9ad] focus:border-plum-500 focus:outline-none focus:ring-2 focus:ring-plum-100 " +
  "disabled:bg-sunken disabled:text-muted aria-[invalid=true]:border-danger";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, !/(^|\s)w-/.test(className ?? "") && "w-full", "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "w-full min-h-20 py-2 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(control, !/(^|\s)w-/.test(className ?? "") && "w-full", "h-10 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 fill=%22none%22 stroke=%22%236f656c%22 stroke-width=%221.6%22><path d=%22M2.5 4.5 6 8l3.5-3.5%22/></svg>')] bg-[right_12px_center] bg-no-repeat pr-9", className)} {...props}>
      {children}
    </select>
  );
}

export function Field({
  label, htmlFor, error, hint, children, className, optional,
}: { label: string; htmlFor?: string; error?: string | string[]; hint?: ReactNode; children: ReactNode; className?: string; optional?: boolean }) {
  const msg = Array.isArray(error) ? error[0] : error;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-soft">
        {label}
        {optional && <span className="ml-1 font-normal text-muted">(opcional)</span>}
      </label>
      {children}
      {msg ? (
        <p role="alert" className="text-[13px] text-danger">{msg}</p>
      ) : hint ? (
        <p className="text-[13px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Checkbox({ label, description, className, ...props }: ComponentProps<"input"> & { label: ReactNode; description?: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 text-sm", className)}>
      <input type="checkbox" className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-plum-600" {...props} />
      <span>
        <span className="text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] text-muted">{description}</span>}
      </span>
    </label>
  );
}

/**
 * Formulário para server actions que NÃO limpa os campos após o envio
 * (o `<form action>` do React 19 reseta campos não controlados, apagando o que
 * a pessoa digitou quando há erro de validação).
 */
export function ActionForm({ action, ...props }: Omit<ComponentProps<"form">, "action" | "onSubmit"> & { action: (data: FormData) => void }) {
  return (
    <form
      {...props}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
    />
  );
}

export function SubmitButton({ children, pendingLabel, pending: pendingProp, ...props }: ComponentProps<typeof Button> & { pendingLabel?: string; pending?: boolean }) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-busy={pending} {...props}>
      {pending ? (
        <>
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />
          {pendingLabel ?? "Salvando…"}
        </>
      ) : children}
    </Button>
  );
}

export function FormMessage({ state }: { state: { ok: boolean; message?: string } | null }) {
  if (!state || state.ok || !state.message) return null;
  return (
    <div role="alert" className="rounded-[10px] border border-[#ecc9c9] bg-st-noshow-bg px-3 py-2.5 text-sm text-danger">
      {state.message}
    </div>
  );
}
