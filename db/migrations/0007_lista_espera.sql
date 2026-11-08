-- Lista de espera da landing ("Quero testar"): três campos e o aceite. Só a equipe lê (RLS ligada, sem política: negado ao tenant).
create table app.waitlist (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  business_type text not null,
  canal text,
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index waitlist_phone_key on app.waitlist (phone);
alter table app.waitlist enable row level security;
