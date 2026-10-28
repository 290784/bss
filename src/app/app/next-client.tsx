"use client";
import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCheck, Clock, MessageCircle, Send } from "lucide-react";
import { Card } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/button";
import { confirmationMessage } from "@/lib/messages";
import { localTime } from "@/lib/time";
import { confirmationSentAction } from "./agenda/actions";

export type NextClient = {
  id: string; date: string; clientName: string; clientPhone: string | null; services: string[]; professionalName: string;
  startsAt: string; endsAt: string; status: "pending" | "confirmed"; clientConfirmedAt: string | null; confirmationSentAt: string | null; receiptUrl: string;
};

/** "agora", "em 25 min", "em 1h 10min", "às 16:30" */
function relative(start: Date, end: Date, now: number, tz: string) {
  if (start.getTime() <= now && end.getTime() > now) return "agora";
  const min = Math.round((start.getTime() - now) / 60_000);
  if (min <= 0) return "agora";
  if (min < 60) return `em ${min} min`;
  if (min < 180) return `em ${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}min` : ""}`;
  return `às ${localTime(start, tz)}`;
}

/** Quem chega em seguida, com as ações do momento — sem precisar abrir a agenda. */
export function NextClientCard({ next, later, timeZone, now, canManage }: { next: NextClient; later: number; timeZone: string; now: number; canManage: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const startsAt = new Date(next.startsAt), endsAt = new Date(next.endsAt);
  const first = next.clientName.trim().split(/\s+/)[0];
  const confirmText = confirmationMessage({
    clientName: next.clientName, services: next.services, startsAt, timeZone, professionalName: next.professionalName,
    url: next.receiptUrl, pending: next.status === "pending",
  });
  const needsConfirm = !next.clientConfirmedAt;
  return (
    <Card className="mb-6 overflow-hidden" data-testid="next-client">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent-subtle text-center">
            <span className="text-[17px] leading-none font-bold text-accent-text tabular">{localTime(startsAt, timeZone)}</span>
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold tracking-wide text-accent-text uppercase">
              <Clock className="h-3.5 w-3.5" />Próxima cliente · {relative(startsAt, endsAt, now, timeZone)}
            </p>
            <h2 className="mt-0.5 truncate text-lg font-bold">{next.clientName}</h2>
            <p className="truncate text-sm text-ink-soft">{next.services.join(" + ")} · com {next.professionalName} · até {localTime(endsAt, timeZone)}</p>
            <p className="mt-1.5 text-[13px]">
              {next.clientConfirmedAt
                ? <span className="inline-flex items-center gap-1 font-medium text-st-completed"><CheckCheck className="h-4 w-4" />{first} confirmou presença</span>
                : next.confirmationSentAt
                  ? <span className="text-muted">Confirmação enviada, ainda sem resposta de {first}</span>
                  : <span className="text-st-pending">{first} ainda não recebeu a confirmação</span>}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {canManage && needsConfirm && next.clientPhone && (
            <a href={`https://wa.me/${next.clientPhone}?text=${encodeURIComponent(confirmText)}`} target="_blank" rel="noreferrer"
              onClick={() => start(async () => { await confirmationSentAction(next.id); router.refresh(); })}
              aria-disabled={pending} className={buttonClass(next.confirmationSentAt ? "secondary" : "primary", "md")}>
              <Send className="h-4 w-4" />{next.confirmationSentAt ? "Reenviar confirmação" : "Enviar confirmação"}
            </a>
          )}
          {next.clientPhone && (!needsConfirm || !canManage) && (
            <a href={`https://wa.me/${next.clientPhone}`} target="_blank" rel="noreferrer" className={buttonClass("secondary", "md")}>
              <MessageCircle className="h-4 w-4" />WhatsApp
            </a>
          )}
          <Link href={`/app/agenda?data=${next.date}&agendamento=${next.id}`} className={buttonClass("secondary", "md")}>
            Abrir atendimento<ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
      {later > 0 && <p className="border-t border-line px-5 py-2 text-xs text-muted">Depois: mais {later} atendimento(s) hoje.</p>}
    </Card>
  );
}
