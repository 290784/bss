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

### Um WhatsApp por estabelecimento (Cloud API da Meta, sem intermediário)
Cada estabelecimento conecta o **próprio número** em Configurações → WhatsApp → “Seu número de WhatsApp”.
As mensagens saem pelo número dele e as respostas das clientes chegam só nele.

**Na plataforma (uma vez), variáveis na Vercel:**
- `WHATSAPP_ENCRYPTION_KEY`: texto longo e aleatório (≥ 16 caracteres) que criptografa os tokens no banco
  (AES-256-GCM). **Guarde com cuidado: se mudar, as conexões existentes ficam ilegíveis** e cada estabelecimento
  precisa reconectar. Sem ela, a tela avisa que a conexão não está habilitada.
- `CRON_SECRET` (despacho da fila).
- Opcionais, só para um número padrão da plataforma (usado por quem ainda não conectou o próprio):
  `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_TEMPLATE_LANG`.

**Em cada estabelecimento (guiado pela própria tela):**
1. App “Empresa” no Meta for Developers com o produto WhatsApp e o número do negócio
   (o número não pode estar ativo no app do WhatsApp do celular).
2. Colar na Gê: **ID do número**, **ID da conta (WABA)** (opcional, mas é o que permite criar os modelos sozinha),
   **token permanente** de usuário do sistema e, se quiser conferir a assinatura das respostas com o app dele, o
   **segredo do app**.
3. A Gê confere o número e o token na Meta e **cria os 3 modelos** na conta dele (`META_TEMPLATE_BODIES`, categoria
   Utilidade, pt_BR). A Meta analisa em poucas horas a 2 dias; a tela mostra a situação de cada um.
4. Webhook no app da Meta: endereço único `https://<seu-domínio>/api/whatsapp/webhook` e o **texto de verificação
   mostrado na tela** (um por estabelecimento); assinar o campo **messages**.

**Como funciona por dentro:**
- Tabela `app.whatsapp_connections` (um registro por estabelecimento). `token_enc` e `app_secret_enc` ficam fora do
  alcance do papel do aplicativo (grant por coluna); só o servidor abre.
- Envio: `dispatchDueMessages` usa a conexão do estabelecimento da mensagem; sem conexão, o número da plataforma (se
  houver); sem nenhum, a mensagem fica `skipped` com “Canal não conectado”. Conexão ilegível vira erro só daquele
  estabelecimento, com nova tentativa.
- Webhook: cada mensagem traz `metadata.phone_number_id`, que diz de qual estabelecimento ela é. A assinatura é
  conferida com o segredo do app daquele estabelecimento (se tiver) ou `WHATSAPP_APP_SECRET`, então um não consegue
  falar pelo outro. A conversa é procurada só dentro do estabelecimento do número.
- Um mesmo número de WhatsApp só pode estar em um estabelecimento.
- Mensagens que já tinham ficado `skipped` antes de conectar não são reenviadas.

**Futuro:** “Cadastro incorporado” (Embedded Signup) da Meta troca o passo 1–3 por um botão “Conectar com o
Facebook”; exige que a Gê seja Provedor de Tecnologia aprovado pela Meta.

Modelos (para conferência; variáveis nesta ordem, ver `META_TEMPLATES`):
- `ge_confirmacao`, `ge_lembrete`, `ge_cancelamento`: textos em `META_TEMPLATE_BODIES`.
  Não colocar oferta/promoção nos modelos: a Meta reclassifica como Marketing (≈9× mais caro). A oferta vai na
  conversa, depois do “Confirmo”.
- Despacho da fila: `GET /api/cron/mensagens` com `Authorization: Bearer $CRON_SECRET` (a cada 5 min no plano
  Pro da Vercel; no plano gratuito, o cron do `vercel.json` roda uma vez ao dia e o envio imediato fica por conta
  do `dispatchSoon`).

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
