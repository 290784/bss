# Integrações externas

Nenhuma integração externa está ativa. Abaixo, o contrato já preparado e o que falta.

## Mensagens (WhatsApp / e-mail) — **não conectado**
- Contrato: `MessageProvider` em `src/server/modules/messaging.ts`
  (`send({ idempotencyKey, channel, template, to, variables }) → { providerMessageId }`).
- Registrar o provedor em `configuredProviders()` lendo credenciais de variáveis de ambiente do servidor.
- Despacho: `GET /api/cron/mensagens` com `Authorization: Bearer $CRON_SECRET`
  (o `vercel.json` agenda a cada 5 min; no plano Hobby da Vercel crons são diários —
  use Pro ou um agendador externo).
- **WhatsApp:** usar a WhatsApp Business Platform (Cloud API da Meta ou BSP oficial).
  Requer conta Meta Business verificada, número dedicado e **templates aprovados** para mensagens
  iniciadas pela empresa (lembretes). Há cobrança por conversa/mensagem conforme a tabela vigente da Meta —
  verificar antes de definir preços dos planos. Não usar bibliotecas não oficiais.
- **E-mail:** Resend/Postmark/SES com domínio verificado (SPF/DKIM).
- Variáveis enviadas ao provedor: `cliente` (primeiro nome), `negocio`, `inicio` (ISO), `servicos`,
  `mensagem` (só na confirmação: texto pronto no tom da casa, de `src/lib/messages.ts`; no WhatsApp oficial
  mensagens iniciadas pela empresa precisam de template aprovado com o mesmo texto) e `link` — o comprovante completo do agendamento (`/b/<slug>/agendamento/<token>`), com serviços,
  horário, profissional, endereço, arquivo de calendário e botão "Confirmar presença".
- Enquanto não houver provedor, os jobs vencidos ficam `skipped` com "Canal não conectado"
  e a interface informa que nada foi enviado. Até lá, a equipe envia a confirmação completa pelo
  botão "Enviar no WhatsApp" do agendamento (abre o WhatsApp da própria equipe com o texto e o link
  prontos — não usa API).

## Cobrança da assinatura — **não integrado**
- Tabela `app.subscriptions` e regras em `src/domain/plans.ts` prontas.
- Falta: escolher provedor, criar endpoint de webhook que **valide a assinatura** do provedor,
  registre `event_id` processado (idempotência) e atualize `status`, `current_period_end`, `grace_until`.
- Nenhum valor é cobrado hoje; a landing informa "preço em definição".

## Pagamentos das clientes finais — **fora do escopo atual**
Pagamentos são **registros manuais**. PIX automático, cartão e conciliação exigem provedor
(ex.: Asaas, Pagar.me, Mercado Pago) e serão modelados com `provider_ref` nos lançamentos.
