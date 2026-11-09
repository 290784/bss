-- E-mail transacional (P-08): verificação de e-mail e recuperação de senha.
-- O token vai por e-mail; no banco fica só o hash (sha256). Uso único, com validade. RLS ligada sem política: só o sistema lê.
alter table app.users add column email_verified_at timestamptz;

create table app.email_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users(id) on delete cascade,
  kind text not null check (kind in ('verify', 'reset')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index email_tokens_user_idx on app.email_tokens (user_id, kind, created_at desc);
alter table app.email_tokens enable row level security;
