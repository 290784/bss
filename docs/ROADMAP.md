# Roadmap

Prioridade: o que gera valor para o primeiro cliente pagante.

## ✅ Entregue nesta etapa
- Fundação: schema, migrações, RLS, papéis, autenticação, design system, navegação desktop/mobile.
- Landing, cadastro, onboarding guiado, checklist de ativação, instrumentação de funil (`app.product_events`).
- Agenda (dia/semana/mês, por profissional), encaixe, bloqueios/feriados, histórico, reagendamento com controle de versão.
- Agendamento online com revalidação no servidor, deduplicação de cliente por telefone, notificação à equipe.
- CRM: ficha, métricas por cliente, segmentos, duplicados, consentimento, arquivamento, exportação CSV.
- Pagamentos manuais (sinal, parcial, integral, estorno) e painel com métricas definidas.
- Motor de mensagens (outbox idempotente) e endpoint de cron.

## 🔜 Próxima etapa recomendada (fechar o MVP comercial)
1. **Provedor de e-mail transacional** (Resend/Postmark): verificação de e-mail, recuperação de senha, confirmações. *(precisa de conta + domínio)*
2. **Convites de equipe** por e-mail com papel (gerente, recepção, profissional vinculada).
3. **Cobrança da assinatura** (Stripe, Asaas, Pagar.me ou Iugu — avaliar PIX recorrente e boleto) com webhooks assinados e idempotentes.
4. **WhatsApp Business Platform** via provedor oficial (Meta Cloud API direto ou BSP), templates aprovados.
5. Link de autoatendimento para a cliente confirmar/cancelar respeitando a política.
6. Exportação completa de dados (LGPD) e rotina de exclusão assistida.

## Fase 3 — Retenção e receita
Financeiro (despesas, caixa, fechamento), comissões, relatórios (receita por serviço/profissional,
comparecimento, horários de pico), lembrete de retorno por serviço (`return_interval_days` já existe),
reativação automática respeitando consentimento.

## Fase 4 — Crescimento
Lista de espera e aviso de encaixe, cupons, pacotes, fidelidade, indicação, estoque
(consumo interno × venda), múltiplas unidades na interface (modelo já tem `units`),
domínio personalizado para a página pública, recomendações (risco de inatividade, horários promocionais).

## Débitos técnicos conhecidos
- Páginas com `notFound()` respondem HTTP 200 por causa do streaming com `loading.tsx` (conteúdo é a página 404, sem vazamento).
- Unidade única na interface; fuso usado é o da organização.
- Sem recuperação de senha até integrar e-mail.
- Painel interno da plataforma (gestão de planos/suporte) ainda não existe.
- Rate limit em tabela do PostgreSQL: suficiente para o início; migrar para Redis/Upstash se o volume crescer.
