"use client";
import { useActionState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Card, CardHeader } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { ActionForm, Field, FormMessage, Input, SubmitButton } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { disconnectWhatsAppAction, requestWhatsAppAction } from "./actions";

export type WhatsAppConnectionView = { displayPhone: string | null; verifiedName: string | null; templates: Record<string, string> } | null;

const TEMPLATE_LABEL: Record<string, string> = { ge_confirmacao: "Confirmação", ge_lembrete: "Lembrete", ge_cancelamento: "Cancelamento" };
const STATUS_LABEL: Record<string, string> = { APPROVED: "Aprovado", PENDING: "Em análise", EXISTS: "Pronto", ERROR: "Não criado", REJECTED: "Recusado" };

/** O salão só pede; a equipe da Gê configura junto com ele numa chamada rápida. */
export function WhatsAppConnect({ connection, request, defaultPhone, platformFallback, enabled, readOnly }: {
  connection: WhatsAppConnectionView; request: { phone: string; at: string } | null; defaultPhone: string;
  platformFallback: boolean; enabled: boolean; readOnly: boolean;
}) {
  const [state, action] = useActionState(requestWhatsAppAction, null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  useEffect(() => { if (state?.ok) { toast(state.message!); router.refresh(); } }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  const disconnect = () => start(async () => {
    const r = await disconnectWhatsAppAction();
    if (r?.ok) { toast(r.message!); router.refresh(); } else if (r) toast(r.message, "error");
  });
  const badge = connection ? <Badge variant="success">Conectado</Badge> : request ? <Badge variant="warning">Pedido enviado</Badge> : <Badge variant="neutral">Não conectado</Badge>;

  return (
    <Card id="conectar-whatsapp" className="scroll-mt-24">
      <CardHeader art="chat" title="Seu número de WhatsApp" description="As mensagens saem do número do seu negócio" action={badge} />
      <div className="flex flex-col gap-4 px-5 pt-3 pb-5 sm:px-6 sm:pb-6">
        {connection && (
          <div className="rounded-xl bg-sunken px-4 py-3 text-sm">
            <div className="font-semibold">{connection.displayPhone ?? "Número conectado"}</div>
            {connection.verifiedName && <div className="text-xs text-muted">{connection.verifiedName}</div>}
            {Object.keys(connection.templates).length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(connection.templates).map(([k, v]) => (
                  <li key={k}><Badge variant={v === "APPROVED" || v === "EXISTS" ? "success" : v === "ERROR" || v === "REJECTED" ? "danger" : "warning"}>{TEMPLATE_LABEL[k] ?? k}: {STATUS_LABEL[v] ?? v}</Badge></li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-muted">A Meta analisa os modelos de mensagem (de poucas horas a 2 dias). Enquanto estiverem “em análise”, a confirmação e o lembrete ainda não saem.</p>
          </div>
        )}

        {!connection && request && (
          <p className="rounded-xl bg-highlight-subtle px-4 py-3 text-[13px] text-highlight-text">
            <b className="font-semibold">Pedido enviado para {request.phone}.</b> A equipe da Gê vai falar com você para deixar tudo pronto numa chamada rápida. Você não precisa fazer mais nada por enquanto.
          </p>
        )}

        {!connection && !request && (
          <>
            {platformFallback && <p className="rounded-xl bg-highlight-subtle px-3 py-2 text-[13px] text-highlight-text">Enquanto você não conecta o seu número, as mensagens saem pelo número da Gê.</p>}
            <p className="text-[13px] text-ink-soft">Peça aqui e a equipe da Gê <b className="font-semibold text-ink">configura tudo com você</b> em uma chamada rápida. Você só precisa ter em mãos o número do WhatsApp do negócio.</p>
            {!readOnly && enabled && (
              <ActionForm action={action} className="flex flex-col gap-3 sm:max-w-sm">
                <FormMessage state={state} />
                <Field label="WhatsApp do negócio" htmlFor="wa-phone" error={fe?.phone}><Input id="wa-phone" name="phone" type="tel" defaultValue={defaultPhone} placeholder="(11) 90000-0000" autoComplete="tel" /></Field>
                <div><SubmitButton pendingLabel="Enviando…">Quero conectar meu WhatsApp</SubmitButton></div>
              </ActionForm>
            )}
            {!enabled && <p className="rounded-xl bg-sunken px-3 py-2 text-[13px] text-ink-soft">Em breve. Fale com o suporte da Gê para conectar.</p>}
          </>
        )}

        {connection && !readOnly && (
          <div><Button type="button" variant="ghost" disabled={pending} onClick={disconnect}>Desconectar</Button></div>
        )}
      </div>
    </Card>
  );
}
