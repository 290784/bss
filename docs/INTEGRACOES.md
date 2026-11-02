# Integrações externas

Nenhuma integração externa está ativa. Abaixo, o que já está pronto no código e o que falta para ligar.

## Mensagens (WhatsApp / e-mail) — **pronto, aguardando credenciais**

### Automações do WhatsApp (código pronto)
Fluxo em `src/server/modules/whatsapp.ts` (conversa) e `src/server/modules/messaging.ts` (fila):

1. **Confirmação** ao marcar (modelo `ge_confirmacao`) — sai logo depois da ação (`dispatchSoon`).
2. **Lembrete na véspera às 9h** (modelo `ge_lembrete`, botões "Confirmo" / "Preciso remarcar") — abre a conversa.
   Só no plano com automações (o teste grátis inclui) e com "Lembrete na véspera" ligado em Configurações.
3. Resposta da cliente (webhook):
   - "Confirmo" → marca a presença como confirmada e **oferece 1 serviço extra** (`suggestRelatedServices`:
     o que outras clientes fazem junto, que cabe logo depois, com a mesma profissional e marcado como
     "Pode ser oferecido como extra" no serviço). Sem oferta possível → "Oba, confirmado!".
   - "SIM" à oferta → reserva (`addServiceToAppointment`, mesma validação de agenda), soma o valor (entra no
     previsto, comissões e "a receber"), responde com os dois horários e o total e avisa a profissional.
     Se o horário foi ocupado nesse meio tempo → avisa a cliente e passa para a profissional.
   - "Agora não" → "Tudo bem! Te esperamos". "Preciso remarcar" → avisa a profissional.
   - Qualquer outra coisa → avisa a profissional, responde uma vez "ela já te responde" e **para de responder**.
4. As respostas vão na janela de 24h aberta pela cliente (mensagem livre, a mais barata). Idempotente pelo id da
   mensagem da Meta (`app.whatsapp_inbound`). Celulares com e sem o 9 são reconhecidos.

### Para ligar (Cloud API da Meta, sem intermediário)
1. Conta Meta Business verificada + app no Meta for Developers com o produto WhatsApp e um número.
2. Variáveis de ambiente no servidor (Vercel → Settings → Environment Variables):
   - `WHATSAPP_TOKEN` (token permanente do usuário de sistema), `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_APP_SECRET` (assinatura do webhook), `WHATSAPP_VERIFY_TOKEN` (texto aleatório que você escolhe)
   - opcional `WHATSAPP_TEMPLATE_LANG` (padrão `pt_BR`)
3. Webhook no app da Meta: URL `https://<seu-domínio>/api/whatsapp/webhook`, token de verificação =
   `WHATSAPP_VERIFY_TOKEN`, assinar o campo **messages**.
4. Criar e aprovar os modelos (categoria **Utilidade**, idioma Português (BR)), com as variáveis nesta ordem
   (`META_TEMPLATES` em `src/server/modules/whatsapp-meta.ts`):
   - `ge_confirmacao`: "Oi, {{1}}! Seu horário de {{2}} está marcado para {{3}}, com {{4}}. Endereço e confirmação de presença: {{5}}"
   - `ge_lembrete`: "Oi, {{1}}! Passando pra lembrar: {{2}} tem {{3}} com {{4}}, no {{5}}. Posso confirmar?"
     com 2 botões de resposta rápida: **Confirmo** e **Preciso remarcar**
   - `ge_cancelamento`: "Oi, {{1}}. Seu horário de {{2}} {{3}} no {{4}} foi cancelado. Se quiser remarcar, é só responder aqui."
   Não colocar oferta/promoção nos modelos: a Meta reclassifica como Marketing (≈9× mais caro). A oferta vai
   na conversa, depois do "Confirmo".
5. Despacho da fila: `GET /api/cron/mensagens` com `Authorization: Bearer $CRON_SECRET` (workflow
   `.github/workflows/mensagens.yml` a cada 5 min; o cron do `vercel.json` roda às 9h05 de Brasília como reserva).

### Custos (tabela em reais da Meta citada para 2026 — confirmar no painel da Meta)
- Modelo de utilidade (confirmação, lembrete): ~R$ 0,035 por mensagem entregue.
- Respostas dentro da janela de 24h aberta pela cliente: grátis a ~R$ 0,035.
- Por atendimento com lembrete + oferta + resposta: ~R$ 0,04 a R$ 0,14.

### Contrato e e-mail
- Contrato: `MessageProvider` (`send({ idempotencyKey, channel, template, to, variables, body?, buttons? }) → { providerMessageId }`).
  `body` = resposta livre na conversa; sem `body` = modelo aprovado.
- **E-mail:** Resend/Postmark/SES com domínio verificado (SPF/DKIM) — ainda não implementado.
- Sem provedor, os jobs vencidos ficam `skipped` com "Canal não conectado" e nada é enviado. A equipe continua
  podendo mandar a confirmação pelo botão "Enviar no WhatsApp" do agendamento (abre o WhatsApp dela, sem API).

## Cobrança da assinatura — **não integrado**
- Tabela `app.subscriptions` e regras em `src/domain/plans.ts` prontas.
- Falta: escolher provedor, criar endpoint de webhook que **valide a assinatura** do provedor,
  registre `event_id` processado (idempotência) e atualize `status`, `current_period_end`, `grace_until`.
- Nenhum valor é cobrado hoje; a landing informa "preço em definição".

## Pagamentos das clientes finais — **fora do escopo atual**
Pagamentos são **registros manuais**. PIX automático, cartão e conciliação exigem provedor
(ex.: Asaas, Pagar.me, Mercado Pago) e serão modelados com `provider_ref` nos lançamentos.
