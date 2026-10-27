# Deploy (Vercel + Supabase)

1. **Supabase:** crie o projeto (região São Paulo). Em *Database → Connection string*, use o
   *Session pooler* (ou conexão direta) com o usuário `postgres`.
2. Rode as migrações apontando para esse banco: `DATABASE_URL=... npm run db:migrate`.
   A migração cria o papel `app_tenant` e concede ao usuário de conexão permissão para assumi-lo.
3. **Vercel:** importe o repositório e configure as variáveis:
   `DATABASE_URL`, `APP_URL` (URL pública), `DEFAULT_TIMEZONE`, `CRON_SECRET`.
   Se usar o *Transaction pooler* (porta 6543), mantenha `prepare: false` (já é o padrão).
4. Não rode `db:seed-demo` em produção (é bloqueado por padrão).
5. Habilite backups/PITR no Supabase e alertas de erro (ex.: Sentry) antes de abrir para clientes.
