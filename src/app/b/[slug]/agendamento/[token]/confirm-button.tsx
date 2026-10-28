"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmAttendanceAction } from "./actions";

/**
 * Botão de confirmar presença — sempre visível no comprovante.
 * done: já confirmado (fica verde, sem ação). blockedReason: horário passado/cancelado (desativado, com o motivo).
 */
export function ConfirmAttendanceButton({ slug, token, done = false, blockedReason }: { slug: string; token: string; done?: boolean; blockedReason?: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  if (done)
    return (
      <div className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-st-completed-bg text-[15px] font-semibold text-st-completed" data-testid="attendance-confirmed" role="status">
        <CheckCircle2 className="h-5 w-5" />Presença confirmada
      </div>
    );
  if (blockedReason)
    return (
      <div>
        <Button size="lg" className="w-full" disabled aria-describedby="confirm-blocked"><CheckCheck className="h-5 w-5" />Confirmar presença</Button>
        <p id="confirm-blocked" className="mt-2 text-center text-[13px] text-muted">{blockedReason}</p>
      </div>
    );
  return (
    <div>
      <Button size="lg" className="w-full" disabled={pending}
        onClick={() => start(async () => {
          const r = await confirmAttendanceAction(slug, token);
          setMsg({ ok: r.ok, text: r.message });
          if (r.ok) router.refresh();
        })}>
        <CheckCheck className="h-5 w-5" />{pending ? "Confirmando…" : "Confirmar presença"}
      </Button>
      {msg && <p role="status" className={msg.ok ? "mt-2 text-center text-sm text-st-completed" : "mt-2 text-center text-sm text-danger"}>{msg.text}</p>}
    </div>
  );
}
