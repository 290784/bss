# Deploy (Vercel + PostgreSQL)

## Banco de dados
Qualquer PostgreSQL 15+ serve. Os mais simples a partir da Vercel:
- **Neon** (Vercel → Storage → Create Database → Neon): cria `DATABASE_URL` e `DATABASE_URL_UNPOOLED` no projeto automaticamente.
- **Supabase** (integração da Vercel ou projeto próprio): use a connection string em `DATABASE_URL` (ou a integração, que cria `POSTGRES_URL`).

O usuário do banco precisa poder criar papéis e extensões (`btree_gist`, `pgcrypto`); os papéis "owner" do Neon e o `postgres` do Supabase podem.

## Migrações
Rodam **automaticamente no build** (`vercel.json` → `npm run db:migrate && npm run build`), usando a conexão direta
quando existir (`MIGRATION_DATABASE_URL` → `DATABASE_URL_UNPOOLED` → `POSTGRES_URL_NON_POOLING` → `DATABASE_URL`).
Cada migração é aplicada uma única vez e dentro de transação. Atenção: deploys de *preview* usam o mesmo banco se as
variáveis estiverem marcadas também para Preview.

## Variáveis de ambiente (Production)
| Variável | Valor |
|---|---|
| `DATABASE_URL` | criada pela integração do banco |
| `APP_URL` | URL pública, ex.: `https://ge.vercel.app` |
| `DEFAULT_TIMEZONE` | `America/Sao_Paulo` |
| `CRON_SECRET` | valor aleatório longo (a Vercel envia no cabeçalho do cron) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | opcional — e-mail real de contato |

## Plano Hobby (gratuito)
- Cron da Vercel só **uma vez por dia** (`0 12 * * *`). Para despachar a cada 5 min, o repositório tem o
  workflow `.github/workflows/mensagens.yml` (GitHub Actions, gratuito). Configure em GitHub → Settings →
  Secrets and variables → Actions o secret `CRON_SECRET` com **o mesmo valor** da Vercel (e, se o domínio
  mudar, a variável `APP_URL`). O GitHub pode atrasar execuções agendadas em alguns minutos em horários de pico.
- Uso comercial requer o plano Pro, segundo os termos da Vercel.

## Depois do primeiro deploy
1. Abra a URL, crie sua conta e faça o onboarding.
2. Não rode `db:seed-demo` em produção (é bloqueado por padrão).
3. Ative backups no provedor do banco antes de cadastrar clientes reais.

## Solução de problemas do banco
Rode o diagnóstico (local ou com a URL de produção): `DATABASE_URL="..." npm run db:check`.

| Mensagem | Causa | Solução |
|---|---|---|
| `unrecognized configuration parameter "channel_binding"` / `"pgbouncer"` | parâmetros de outros clientes na URL (padrão do Neon/Prisma) | **corrigido**: a aplicação remove esses parâmetros automaticamente |
| "Tabelas não encontradas" (`42P01`) | migrações não rodaram | o build roda `db:migrate`; confira se o deploy usou o `vercel.json` atual |
| "não pode criar papéis (CREATEROLE)" | usuário sem permissão | use o usuário dono (Neon: owner; Supabase: `postgres`) |
| "O papel app_tenant já existe… outro usuário" | servidor compartilhado com outro projeto | rode o `GRANT` indicado na mensagem ou use um banco novo |
| "Usuário ou senha incorretos" (`28P01`) | URL copiada errada ou senha trocada | copie de novo a connection string |
| "Nenhuma URL do banco definida" | nenhum banco conectado **a este ambiente** | Storage → conecte o banco marcando Production **e** Preview; depois Redeploy. Deploys de *preview* (branches/PRs) só recebem variáveis marcadas como Preview |
| variáveis com prefixo (`STORAGE_DATABASE_URL`…) | prefixo escolhido ao conectar o banco | **suportado**: o app reconhece o prefixo automaticamente |

Validado localmente simulando o Neon: servidor PostgreSQL novo, dono **sem** superusuário, URL com
`channel_binding=require` — migração, diagnóstico, 24 testes de integração (incluindo isolamento entre
empresas) e o fluxo completo no navegador passaram.
