# Segurança e privacidade

## Controles implementados
- Isolamento por organização com RLS (ver ADR-002) e testes automatizados de isolamento.
- Autorização por papel no servidor (`src/domain/permissions.ts`) **e** no banco (políticas).
- Senhas com scrypt; sessões opacas com hash; cookie `httpOnly`/`SameSite=Lax`/`Secure`.
- Logout via POST; redirecionamento pós-login só para caminhos internos.
- Rate limiting persistente: login (IP e e-mail), cadastro, consulta de horários e reservas públicas.
- Honeypot e revalidação de disponibilidade no agendamento público.
- Validação Zod em todas as Server Actions; mensagens de erro sem detalhes internos.
- Cabeçalhos: `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- Exportação CSV protegida contra injeção de fórmulas e registrada em auditoria.
- Auditoria (`app.audit_log`) para cancelamentos, pagamentos, estornos, consentimento, exportação, configurações.
- Lançamentos financeiros imutáveis; agendamentos sem DELETE.

## LGPD
- Coleta mínima: data de nascimento opcional; nenhum dado de saúde ou foto por padrão.
- Consentimento de marketing separado, com data; lembretes de agendamento não dependem dele.
- Observações internas restritas a proprietária/gerência/recepção, com aviso para não registrar dados sensíveis.
- Solicitação de exclusão de conta registrada (`users.deletion_requested_at`) — processo assistido.
- Política de privacidade e termos são **minutas** e precisam de revisão jurídica.

## Operação (a configurar no ambiente de produção)
- Backups: habilitar PITR no Supabase (plano pago) ou backups diários; testar restauração.
- Segredos só em variáveis de ambiente do servidor; `.env*` fora do Git.
- Retenção sugerida: sessões expiram em 30 dias; `rate_limits` e `product_events` podem ser expurgados periodicamente.
- Logs: a aplicação registra apenas mensagens de erro, sem dados pessoais.
