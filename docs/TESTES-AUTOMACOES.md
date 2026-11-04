# Testes das automações

Tudo o que a Gê faz sozinha, quando acontece e qual teste confere. Rodar: `npx vitest run` (todos) ou só as automações:
`npx vitest run tests/unit/whatsapp tests/integration/automacoes tests/integration/whatsapp.test.ts`.
O banco de teste é criado do zero a cada arquivo (`tests/support/db.ts`); nada sai de verdade: o WhatsApp é simulado.

## Mapa

| Automação | Quando acontece | Onde está | Testes |
|---|---|---|---|
| Confirmação do agendamento | ao marcar (staff ou link online) | `messaging.ts` `enqueueAppointmentMessages` | `automacoes-mensagens`, `scheduling` |
| Lembrete na véspera às 9h | ao marcar; só com plano com automações, ligado e WhatsApp | `reminderTime`, `hasAutomations` | `automacoes-mensagens`, `unit/whatsapp` |
| Aviso de cancelamento | ao cancelar um horário futuro | `enqueueCancellationNotice` | `automacoes-mensagens` |
| Limpeza da fila | ao cancelar, faltar ou remarcar | `cancelPendingMessages` | `automacoes-mensagens`, `scheduling` |
| Envio, tentativas e recuperação | cron e logo após marcar | `dispatchDueMessages`, `dispatchSoon` | `automacoes-mensagens`, `automacoes-rotas`, `scheduling` |
| Conversa: confirmar → oferta → SIM/NÃO | resposta da cliente ao lembrete | `whatsapp.ts` `handleInbound` | `automacoes-conversa`, `whatsapp.test` |
| Entender a resposta | cada mensagem recebida | `classifyReply` | `unit/whatsapp-respostas`, `unit/whatsapp` |
| Passar para a profissional (handoff) | resposta fora do roteiro | `handleInbound` | `automacoes-conversa` |
| Avisos para a equipe | confirmação, extra aceito, remarcar, handoff | `notifications.ts` | `automacoes-conversa` |
| Envio pela API da Meta | cada mensagem | `whatsapp-meta.ts` | `unit/whatsapp-meta-provider` |
| Webhook (verificação e mensagens) | a Meta chama | `api/whatsapp/webhook` | `automacoes-rotas` |
| Rotina diária | Vercel Cron | `api/cron/mensagens` | `automacoes-rotas` |
| Ligar/desligar automações | Configurações | `saveAutomationsAction` + regras do banco | `automacoes-mensagens` |
| Saudação do painel | ao abrir o painel | `greetings.ts` | `greetings` (unit, integração e e2e) |
| Dicas da Gê | ao abrir o painel | `dicas.ts` | `dicas.test` |

## O que os testes garantem (resumo)
- **Uma mensagem nunca sai duas vezes** (idempotência, despachantes simultâneos, mensagem repetida pela Meta) e **nunca fica parada**
  (envio travado volta para a fila depois de 15 min).
- **Respeita as regras:** plano, chave de lembrete/oferta, preferência de contato, hora mínima de 2 h, fuso do negócio.
- **Na dúvida, vai para a profissional:** respostas com ressalva, negação ("não vou faltar") ou fora do roteiro.
- **Segurança:** cron só com o segredo; webhook só com assinatura da Meta; cada empresa só vê e altera o que é seu.

## Só dá para testar com o WhatsApp real conectado (roteiro manual)
Os testes simulam a API. Ao conectar a conta da Meta (ver `INTEGRACOES.md`), conferir uma vez, à mão:
1. **Webhook:** na Meta, cadastrar o endereço e o token; o botão "Verificar" deve ficar verde.
2. **Modelos aprovados:** `ge_confirmacao`, `ge_lembrete` e `ge_cancelamento` aprovados, com os parâmetros na ordem de `META_TEMPLATES`.
3. **Confirmação:** marcar um horário para o seu próprio celular e ver chegar a mensagem com o link do comprovante.
4. **Lembrete:** forçar `scheduled_for = now()` do lembrete desse horário e rodar a rotina; chegam os botões "Confirmo" e "Preciso remarcar".
5. **Conversa:** tocar "Confirmo" (chega a oferta com os botões), "Quero sim" (o extra entra e chega o resumo), e conferir o aviso no app.
6. **Remarcar e assumir:** tocar "Preciso remarcar" e escrever algo; a automação para de responder e o app avisa.
7. **Cancelar:** cancelar o horário e ver o aviso de cancelamento chegar.
8. **Janela de 24 h:** a oferta e as respostas só saem como texto livre dentro de 24 h da resposta da cliente; confirmar que a Meta aceita.
