"use client";
import { createContext, useContext, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, MessageCircle, Send } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { confirmationMessage } from "@/lib/messages";
import { formatInTz, localTime } from "@/lib/time";
import type { AgendaItemDTO, AgendaProfessional } from "./agenda-view";
import { confirmationSentAction } from "./actions";

/**
 * Reenvio da confirmação direto na agenda: abre o WhatsApp da equipe com a mensagem pronta
 * (texto da casa + link do comprovante) e registra o envio no histórico do agendamento.
 */

type Ctx = { canManage: boolean; timeZone: string; pros: AgendaProfessional[]; now: number };
export const ConfirmationContext = createContext<Ctx>({ canManage: false, timeZone: "America/Sao_Paulo", pros: [], now: 0 });

/** Agendamento ativo, futuro e com WhatsApp: dá para (re)enviar a confirmação. */
export function canSendConfirmation(i: AgendaItemDTO, now: number) {
  return (i.status === "pending" || i.status === "confirmed") && new Date(i.startsAt).getTime() > now && !!i.clientPhone;
}

function waLink(i: AgendaItemDTO, ctx: Ctx) {
  const text = confirmationMessage({
    clientName: i.clientName, services: i.serviceNames, startsAt: new Date(i.startsAt), timeZone: ctx.timeZone,
    professionalName: ctx.pros.find((p) => p.id === i.professionalId)?.name ?? "", url: i.receiptUrl, pending: i.status === "pending",
  });
  return `https://wa.me/${i.clientPhone}?text=${encodeURIComponent(text)}`;
}

function useRecordSent() {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const record = (id: string) => start(async () => {
    const r = await confirmationSentAction(id);
    if (!r?.ok) toast(r?.message ?? "Não foi possível registrar o envio.");
    router.refresh();
  });
  return { record, pending };
}

/** Atalho no bloco do horário (canto superior direito). */
export function BlockSendButton({ item }: { item: AgendaItemDTO }) {
  const ctx = useContext(ConfirmationContext);
  const { record } = useRecordSent();
  if (!ctx.canManage || !canSendConfirmation(item, ctx.now)) return null;
  const sent = !!item.confirmationSentAt;
  return (
    <a href={waLink(item, ctx)} target="_blank" rel="noreferrer" data-appt onClick={() => record(item.id)}
      title={sent ? "Reenviar confirmação no WhatsApp" : "Enviar confirmação no WhatsApp"}
      aria-label={`${sent ? "Reenviar" : "Enviar"} confirmação para ${item.clientName}`}
      className={cn("absolute top-1 right-1 z-[5] grid h-6 w-6 place-items-center rounded-full ring-1 transition hover:scale-110",
        sent ? "bg-surface/80 text-ink-soft ring-line-strong" : "btn-glow text-white ring-white/20")}>
      <MessageCircle className="h-3.5 w-3.5" />
    </a>
  );
}

/** Lista do período com envio/reenvio em um toque. */
export function ConfirmationsDialog({ open, onClose, items, title }: { open: boolean; onClose: () => void; items: AgendaItemDTO[]; title: string }) {
  const ctx = useContext(ConfirmationContext);
  const { record } = useRecordSent();
  const list = items.filter((i) => canSendConfirmation(i, ctx.now)).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const noPhone = items.filter((i) => (i.status === "pending" || i.status === "confirmed") && new Date(i.startsAt).getTime() > ctx.now && !i.clientPhone).length;
  const tz = ctx.timeZone;
  return (
    <Dialog open={open} onClose={onClose} side="right" title="Confirmações" description={title}>
      {list.length === 0 ? (
        <p className="text-sm text-muted">Nenhum agendamento futuro com WhatsApp neste período.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((i) => {
            const start = new Date(i.startsAt);
            const sent = i.confirmationSentAt ? new Date(i.confirmationSentAt) : null;
            return (
              <li key={i.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
                <div className="w-14 shrink-0 text-center">
                  <div className="text-[15px] font-semibold tabular">{localTime(start, tz)}</div>
                  <div className="text-[11px] text-muted first-letter:uppercase">{formatInTz(start, tz, { weekday: "short", day: "2-digit", month: "2-digit" })}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ink">{i.clientName}</div>
                  <div className="truncate text-xs text-ink-soft">{i.services}</div>
                  <div className="mt-1">
                    {i.clientConfirmedAt ? <Badge variant="success"><CheckCheck className="h-3 w-3" />Presença confirmada</Badge>
                      : sent ? <Badge>Enviada {formatInTz(sent, tz, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</Badge>
                      : <Badge variant="warning">Ainda não enviada</Badge>}
                  </div>
                </div>
                {ctx.canManage && (
                  <a href={waLink(i, ctx)} target="_blank" rel="noreferrer" onClick={() => record(i.id)}
                    className={cn("inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium",
                      sent ? "border border-line-strong hover:bg-sunken" : "btn-glow text-white")}>
                    <Send className="h-3.5 w-3.5" />{sent ? "Reenviar" : "Enviar"}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {noPhone > 0 && <p className="mt-3 text-xs text-muted">{noPhone} agendamento(s) sem WhatsApp cadastrado não aparecem aqui.</p>}
      <p className="mt-3 text-xs text-muted">Abre o seu WhatsApp com a mensagem e o link do comprovante prontos. Cada envio fica no histórico do agendamento.</p>
    </Dialog>
  );
}
