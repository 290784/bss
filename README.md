# Beauty OS

Plataforma SaaS multi-tenant de gestão para profissionais e negócios de beleza e estética:
agenda inteligente, agendamento online, CRM de clientes, registro de pagamentos e indicadores.

> **Proposta de valor:** menos tempo administrando, menos horários perdidos e mais clientes voltando.

## Estado atual (Fase 1 + núcleo da Fase 2)

| Área | Situação |
|---|---|
| Landing page, cadastro, login, sessão | ✅ funcional |
| Onboarding guiado (negócio → horários → serviços) | ✅ funcional |
| Multi-tenancy com RLS no PostgreSQL + papéis | ✅ funcional e testado |
| Agenda dia/semana/mês, criação, reagendamento, status, encaixe, bloqueios | ✅ funcional |
| Proteção contra reserva duplicada (lock + restrição de exclusão) | ✅ testado com concorrência |
| Página pública de agendamento (`/b/<slug>`) | ✅ funcional |
| Clientes: ficha, histórico, segmentos, duplicados, consentimento, CSV | ✅ funcional |
| Serviços e profissionais (expediente, pausas, serviços habilitados) | ✅ funcional |
| Pagamentos: sinal, parcial, integral, estorno auditável | ✅ funcional (registro manual) |
| Painel com métricas reais definidas | ✅ funcional |
| Notificações internas | ✅ funcional |
| Fila de mensagens (idempotente, retentativas) | ✅ motor pronto · ⚠️ **nenhum canal conectado** |
| Assinaturas e planos | ⚠️ modelo + regras de acesso prontos · **cobrança não integrada** |
| Financeiro completo, comissões, relatórios, marketing, estoque | 🔜 próximas fases ([roadmap](docs/ROADMAP.md)) |

## Stack

- **Next.js 16** (App Router, Server Actions) + **React 19** + **TypeScript** estrito
- **Tailwind CSS 4** com tokens próprios (`src/app/globals.css`)
- **PostgreSQL** (compatível com Supabase) via `postgres` (porsager) — SQL explícito, sem ORM
- **Zod 4** para validação no servidor; `date-fns` + `@date-fns/tz` para fusos
- **Vitest** (unitários + integração com banco real) e **Playwright** (ponta a ponta)

Decisões e justificativas: [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

## Rodando localmente

Pré-requisitos: Node 20.9+ e PostgreSQL 15+ (local, Docker ou Supabase).

```bash
npm install
cp .env.example .env.local            # ajuste DATABASE_URL
npm run db:migrate                    # aplica db/migrations/*.sql
DEMO_PASSWORD=uma-senha npm run db:seed-demo   # opcional: conta de demonstração isolada
npm run dev                           # http://localhost:3000
```

A conta de demonstração (`demo@beautyos.dev`) é uma organização marcada como `is_demo`;
a interface exibe um aviso permanente e os dados ficam isolados pelo mesmo RLS das contas reais.
O seed é bloqueado em produção, a menos que `ALLOW_DEMO_SEED=1`.

## Verificações

```bash
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
npm run test          # unitários + integração (precisa de PostgreSQL, ver abaixo)
npm run build
BASE_URL=http://localhost:3000 npm run test:e2e   # com o app rodando e a conta demo criada
```

Os testes de integração usam `TEST_DATABASE_URL`
(padrão `postgres://postgres@127.0.0.1:5432/beauty_os_test`) e **recriam o schema `app`** desse banco.
Nunca aponte para um banco com dados reais.

O teste ponta a ponta cria uma conta nova a cada execução; o limite de cadastros por IP
(10/hora) pode bloquear execuções repetidas — limpe `app.rate_limits` no banco local.

## Estrutura

```
db/migrations/           SQL versionado (schema, RLS, papéis)
scripts/                 migrate.ts, seed-demo.ts
src/domain/              regras puras: disponibilidade, status, permissões, planos, métricas
src/server/              acesso a dados e casos de uso (rodam no servidor)
  db.ts                  withTenant (RLS) / withSystem
  auth/                  senha (scrypt) e sessões
  modules/               agenda, clientes, serviços, equipe, pagamentos, mensagens, painel, público
src/app/                 rotas (landing, auth, onboarding, /app/*, /b/[slug], API de cron)
src/components/          design system (ui/), shell, gráficos
tests/unit|integration|e2e
docs/                    arquitetura, roadmap, integrações, segurança/LGPD
```

## Deploy

Pensado para **Vercel + Supabase (PostgreSQL)**. Passos em [docs/DEPLOY.md](docs/DEPLOY.md).

## Nome

"Beauty OS" é nome de trabalho. Alternativas a avaliar (disponibilidade de domínio e marca não verificada):
**Ateliê**, **Aurea**, **Lumê**, **Rituale**, **Agendê**.
