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
- Cron só **uma vez por dia** (`0 12 * * *`). Sem provedor de mensagens conectado isso não muda nada;
  quando o WhatsApp/e-mail for ligado, use o plano Pro (cron a cada 5 min) ou um agendador externo.
- Uso comercial requer o plano Pro, segundo os termos da Vercel.

## Depois do primeiro deploy
1. Abra a URL, crie sua conta e faça o onboarding.
2. Não rode `db:seed-demo` em produção (é bloqueado por padrão).
3. Ative backups no provedor do banco antes de cadastrar clientes reais.
