"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmAttendanceAction } from "./actions";

export function ConfirmAttendanceButton({ slug, token }: { slug: string; token: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
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
