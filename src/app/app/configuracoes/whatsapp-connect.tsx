"use client";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Card, CardHeader } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { ActionForm, Field, FormMessage, Input, SubmitButton } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { connectWhatsAppAction, disconnectWhatsAppAction } from "./actions";

export type WhatsAppConnectionView = {
  displayPhone: string | null; verifiedName: string | null; verifyToken: string; templates: Record<string, string>; own: boolean;
} | null;

const TEMPLATE_LABEL: Record<string, string> = { ge_confirmacao: "Confirmação", ge_lembrete: "Lembrete", ge_cancelamento: "Cancelamento" };
const STATUS_LABEL: Record<string, string> = { APPROVED: "Aprovado", PENDING: "Em análise", EXISTS: "Já existia", ERROR: "Não criado", REJECTED: "Recusado" };

/** Conexão do WhatsApp do próprio estabelecimento: cada um envia pelo seu número. */
export function WhatsAppConnect({ connection, platformFallback, webhookUrl, enabled, readOnly }: {
  connection: WhatsAppConnectionView; platformFallback: boolean; webhookUrl: string; enabled: boolean; readOnly: boolean;
}) {
  const [state, action] = useActionState(connectWhatsAppAction, null);
  const [pending, start] = useTransition();
  // “Trocar dados” vale para o estado atual do formulário: quando o envio termina, o estado muda e o formulário fecha sozinho.
  const [editingFor, setEditingFor] = useState<typeof state | undefined>(undefined);
  const editing = editingFor !== undefined && editingFor === state;
  const toast = useToast();
  const router = useRouter();
  useEffect(() => { if (state?.ok) { toast(state.message!); router.refresh(); } }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  const disconnect = () => start(async () => {
    const r = await disconnectWhatsAppAction();
    if (r?.ok) { toast(r.message!); router.refresh(); } else if (r) toast(r.message, "error");
  });
  const copy = (t: string) => { navigator.clipboard?.writeText(t).then(() => toast("Copiado.")).catch(() => {}); };
  const showForm = !connection || editing;

  return (
    <Card id="conectar-whatsapp" className="scroll-mt-24">
      <CardHeader art="chat" title="Seu número de WhatsApp"
        description="As mensagens saem do número do seu negócio, não de um número da Gê"
        action={<Badge variant={connection ? "success" : "neutral"}>{connection ? "Conectado" : "Não conectado"}</Badge>} />
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
        {!connection && platformFallback && <p className="rounded-xl bg-highlight-subtle px-3 py-2 text-[13px] text-highlight-text">Enquanto você não conecta o seu número, as mensagens saem pelo número da Gê.</p>}
        {!enabled && <p className="rounded-xl bg-highlight-subtle px-3 py-2 text-[13px] text-highlight-text">A conexão de WhatsApp ainda está sendo habilitada neste servidor. Fale com o suporte da Gê.</p>}

        {showForm && !readOnly && enabled && (
          <ActionForm action={action} className="flex flex-col gap-4">
            <FormMessage state={state} />
            <ol className="list-decimal space-y-1 pl-5 text-[13px] text-ink-soft">
              <li>Em <b className="font-semibold text-ink">developers.facebook.com</b>, crie um app do tipo “Empresa” e adicione o produto <b className="font-semibold text-ink">WhatsApp</b>.</li>
              <li>Adicione o número do seu negócio (ele não pode estar ativo no app do WhatsApp do celular).</li>
              <li>Em “Configuração da API”, copie o <b className="font-semibold text-ink">ID do número</b> e o <b className="font-semibold text-ink">ID da conta</b>; gere um <b className="font-semibold text-ink">token permanente</b> de usuário do sistema.</li>
              <li>Cole abaixo. A Gê confere com a Meta e já cria os modelos de mensagem.</li>
            </ol>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="ID do número" htmlFor="phoneNumberId" error={fe?.phoneNumberId}><Input id="phoneNumberId" name="phoneNumberId" inputMode="numeric" autoComplete="off" /></Field>
              <Field label="ID da conta do WhatsApp Business" htmlFor="wabaId" error={fe?.wabaId} optional hint="Para criar os modelos sozinha."><Input id="wabaId" name="wabaId" inputMode="numeric" autoComplete="off" /></Field>
              <Field label="Token de acesso" htmlFor="token" error={fe?.token} className="sm:col-span-2"><Input id="token" name="token" type="password" autoComplete="off" /></Field>
              <Field label="Segredo do app" htmlFor="appSecret" optional className="sm:col-span-2" hint="Usado para conferir que as respostas das clientes vêm mesmo da Meta."><Input id="appSecret" name="appSecret" type="password" autoComplete="off" /></Field>
            </div>
            <div className="flex gap-2">
              <SubmitButton pendingLabel="Conferindo com a Meta…">{connection ? "Salvar nova conexão" : "Conectar WhatsApp"}</SubmitButton>
              {editing && <Button type="button" variant="ghost" onClick={() => setEditingFor(undefined)}>Cancelar</Button>}
            </div>
          </ActionForm>
        )}

        {connection && !editing && !readOnly && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setEditingFor(state)}>Trocar dados</Button>
            <Button type="button" variant="ghost" disabled={pending} onClick={disconnect}>Desconectar</Button>
          </div>
        )}

        {connection && (
          <details className="rounded-xl border border-line p-3 text-[13px]">
            <summary className="cursor-pointer font-semibold">Receber as respostas das clientes</summary>
            <p className="mt-2 text-ink-soft">No app da Meta, em WhatsApp &gt; Configuração &gt; Webhook, cadastre o endereço e o texto de verificação abaixo e assine o campo <b className="font-semibold text-ink">messages</b>.</p>
            <dl className="mt-2 grid gap-2">
              {[["Endereço", webhookUrl], ["Texto de verificação", connection.verifyToken]].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-2 rounded-lg bg-sunken px-3 py-2">
                  <div className="min-w-0"><dt className="text-[11px] text-muted">{k}</dt><dd className="truncate font-mono text-xs">{v}</dd></div>
                  <Button type="button" size="sm" variant="ghost" onClick={() => copy(v!)}>Copiar</Button>
                </div>
              ))}
            </dl>
          </details>
        )}
      </div>
    </Card>
  );
}
