# Arquitetura e decisões (ADR resumido)

## Visão geral

Monólito modular em Next.js (App Router). Regras de negócio puras em `src/domain`,
casos de uso com SQL explícito em `src/server/modules`, interface em `src/app`.
Server Actions são a fronteira: validam com Zod, checam permissão e chamam os módulos.

```
Navegador ──► Server Action / Route Handler ──► módulo (src/server/modules) ──► PostgreSQL
                    │                                   │                          │
              Zod + permissão (papel)          transação withTenant         RLS por organização
```

## ADR-001 · PostgreSQL com acesso direto (sem ORM) e compatível com Supabase
- **Contexto:** isolamento multi-tenant precisa ser garantido no banco, não só na interface.
- **Decisão:** driver `postgres` com SQL parametrizado; schema `app` (fora do `public`, que o
  PostgREST do Supabase expõe por padrão).
- **Consequências:** roda em Supabase, Neon, RDS ou local. Migrações são SQL versionado
  (`npm run db:migrate`). Sem geração automática de tipos — tipos ficam junto das consultas.

## ADR-002 · RLS com papel restrito por transação
- Cada operação de tenant roda em `withTenant`: abre transação, define `app.user_id` e
  `app.org_id` (`set_config(..., true)`, local à transação) e faz `SET LOCAL ROLE app_tenant`.
- `app_tenant` é `NOBYPASSRLS` e só tem os GRANTs necessários. As políticas exigem que a
  linha pertença à organização ativa **e** que o usuário seja membro ativo dela
  (`app.has_org_access`). Forjar `app.org_id` de outra empresa não dá acesso.
- Restrições adicionais no banco: profissional só vê a própria agenda; pagamentos só
  para proprietária/gerente/recepção; configuração só proprietária/gerente;
  `appointments` sem DELETE; `payments` sem UPDATE/DELETE (livro imutável).
- `withSystem` (dono das tabelas) é usado só para autenticação, página pública e jobs,
  sempre filtrando organização explicitamente. Funciona com poolers em modo transação
  (`prepare: false`).

## ADR-003 · Autenticação própria e mínima
- **Decisão:** e-mail + senha com scrypt (Node `crypto`), sessões opacas em banco
  (token aleatório de 256 bits; só o SHA-256 é armazenado), cookie `httpOnly`, `SameSite=Lax`,
  `Secure` em produção. Limite de tentativas por IP e por e-mail. Resposta de tempo constante
  para e-mail inexistente.
- **Por quê:** evita acoplar o RLS ao JWT de um provedor e mantém o sistema testável
  ponta a ponta sem serviços externos. Migrar para Supabase Auth/Better Auth depois é possível
  trocando `src/server/auth` (o RLS só depende de `app.user_id`).
- **Pendente:** recuperação de senha e verificação de e-mail dependem de provedor de e-mail.

## ADR-004 · Prevenção de reserva duplicada em duas camadas
1. Na transação: `SELECT … FOR UPDATE` na linha da profissional serializa reservas da mesma
   agenda; valida expediente, bloqueios e conflitos.
2. No banco: restrição `EXCLUDE USING gist (professional_id WITH =, tstzrange(starts_at, blocked_until) WITH &&)`
   para status ativos e não-encaixe. Mesmo um bug na aplicação não grava sobreposição.
- `blocked_until` = fim do atendimento + tempo de limpeza do último serviço.
- Encaixe (`allow_overlap`) é explícito, registrado no histórico.

## ADR-005 · Datas e fusos
Instantes em `timestamptz` (UTC). Datas de calendário (`YYYY-MM-DD`) e horários de expediente
são interpretados no fuso da organização (`America/Sao_Paulo` por padrão) com `@date-fns/tz`.
Nada depende do fuso do servidor ou do navegador.

## ADR-006 · Estados separados de agendamento e pagamento
- Agendamento: `pending → confirmed → completed | no_show`, `cancelled` é final (ver
  `src/domain/appointment-status.ts`).
- Pagamento: lançamentos imutáveis (`payment`/`refund`); saldo = pagamentos − estornos.
  Cancelar não apaga nada; estorno exige motivo e gera auditoria.

## ADR-007 · Mensagens via outbox idempotente
Jobs criados na mesma transação do agendamento, com `idempotency_key` única
(`template:appointment:starts_at`). O despachante reivindica com `FOR UPDATE SKIP LOCKED`
e marca `processing` antes de chamar o provedor; retentativa com espera exponencial.
Reagendar/cancelar cancela pendentes. Sem provedor: status `skipped` com motivo
"Canal não conectado" — nunca "enviado".

## ADR-008 · Planos como dados
`src/domain/plans.ts` define limites e recursos; `effectiveAccess` implementa bloqueio gradual
(`full` → `grace` → `read_only`) sem perda de dados. Trocar preços/limites não toca autorização.

## ADR-009 · Métricas com definição única
`src/domain/metrics.ts` concentra a definição de cada número exibido (tooltips ⓘ).
"Recebido" (pagamentos − estornos por data de pagamento) é distinto de "valor agendado"
(atendimentos do período) e de "produção" (concluídos). Variação com base zero não é inventada.

## ADR-010 · Gráficos
Componente próprio e leve (`src/components/charts/column-chart.tsx`): série única por aba
(nunca eixo Y duplo), tooltip por coluna e visão em tabela para acessibilidade.

## ADR-011 · Fases reorganizadas
Pagamentos básicos (registro + estorno) entraram já na fatia inicial porque o painel precisa de
"recebido" real e a regra "cancelamento não apaga financeiro" deve nascer no modelo.
Convites de equipe ficaram para a próxima etapa (profissionais podem existir sem login).
