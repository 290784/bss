-- Cada estabelecimento conecta o próprio número de WhatsApp (API oficial da Meta).
-- O token e o segredo do app ficam criptografados (AES-256-GCM, chave em WHATSAPP_ENCRYPTION_KEY) e
-- nunca são lidos pelo papel do aplicativo; só o servidor (envio e webhook) abre.
create table app.whatsapp_connections (
  organization_id uuid primary key references app.organizations(id) on delete cascade,
  phone_number_id text not null unique,
  waba_id text,
  display_phone text,
  verified_name text,
  token_enc text not null,
  app_secret_enc text,
  -- Texto de verificação do webhook (a Meta pede na hora de cadastrar o endereço). Não é segredo de acesso.
  verify_token text not null unique,
  -- Situação dos modelos de mensagem criados na conta da cliente: { "ge_confirmacao": "PENDING", ... }
  templates jsonb not null default '{}'::jsonb,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table app.whatsapp_connections enable row level security;
create policy whatsapp_connections_select on app.whatsapp_connections for select to app_tenant using (app.has_org_access(organization_id));
-- Só as colunas sem segredo: token_enc e app_secret_enc ficam fora do alcance do papel do aplicativo.
grant select (organization_id, phone_number_id, waba_id, display_phone, verified_name, verify_token, templates, connected_at)
  on app.whatsapp_connections to app_tenant;
