-- Beauty OS — fundação do banco
-- Esquema "app": não exposto por APIs automáticas (ex.: PostgREST do Supabase).
-- Isolamento multi-tenant: toda tabela de negócio possui organization_id e RLS.
-- A aplicação executa operações de tenant com `SET LOCAL ROLE app_tenant`
-- e as variáveis de sessão app.user_id / app.org_id (ver src/server/db.ts).

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create schema if not exists app;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_tenant') then
    create role app_tenant nologin noinherit nobypassrls;
  end if;
end $$;

-- O usuário de conexão precisa poder assumir o papel restrito.
do $$
begin
  execute format('grant app_tenant to %I', current_user);
end $$;

grant usage on schema app to app_tenant;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type app.member_role as enum ('owner', 'manager', 'receptionist', 'professional');
create type app.member_status as enum ('active', 'invited', 'disabled');
create type app.appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
create type app.appointment_source as enum ('staff', 'online');
create type app.payment_kind as enum ('payment', 'refund');
create type app.payment_method as enum ('pix', 'cash', 'credit_card', 'debit_card', 'bank_transfer', 'other');
create type app.message_status as enum ('pending', 'processing', 'sent', 'failed', 'cancelled', 'skipped');
create type app.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled');

-- ---------------------------------------------------------------------------
-- Identidade (acessada apenas pelo contexto de sistema do servidor)
-- ---------------------------------------------------------------------------
create table app.users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password_hash text not null,
  full_name text not null,
  created_at timestamptz not null default now(),
  last_login_at timestamptz,
  deletion_requested_at timestamptz,
  constraint users_email_format check (position('@' in email) > 1)
);
create unique index users_email_key on app.users (lower(email));

create table app.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users(id) on delete cascade,
  token_hash text not null unique,
  active_organization_id uuid,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index sessions_user_idx on app.sessions (user_id);

create table app.rate_limits (
  key text primary key,
  window_start timestamptz not null,
  hits integer not null
);

-- ---------------------------------------------------------------------------
-- Organizações e acesso
-- ---------------------------------------------------------------------------
create table app.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$'),
  business_type text not null default 'salon',
  timezone text not null default 'America/Sao_Paulo',
  currency text not null default 'BRL',
  locale text not null default 'pt-BR',
  phone text,
  instagram text,
  address text,
  is_demo boolean not null default false,
  -- Política de agendamento
  online_booking_enabled boolean not null default true,
  online_requires_approval boolean not null default true,
  min_advance_minutes integer not null default 120 check (min_advance_minutes between 0 and 10080),
  max_advance_days integer not null default 60 check (max_advance_days between 1 and 365),
  slot_interval_minutes integer not null default 15 check (slot_interval_minutes in (5, 10, 15, 20, 30, 60)),
  cancellation_notice_hours integer not null default 24 check (cancellation_notice_hours between 0 and 168),
  booking_policy_text text,
  onboarding_completed_at timestamptz,
  created_by uuid references app.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table app.units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app.organizations(id) on delete cascade,
  name text not null,
  address text,
  timezone text not null default 'America/Sao_Paulo',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, id)
);

create table app.professionals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app.organizations(id) on delete cascade,
  unit_id uuid,
  user_id uuid references app.users(id) on delete set null,
  display_name text not null check (length(display_name) between 2 and 80),
  specialty text,
  bio text,
  color text not null default '#7c3a5c' check (color ~ '^#[0-9a-fA-F]{6}$'),
  commission_percent numeric(5,2) not null default 0 check (commission_percent between 0 and 100),
  accepts_online boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, unit_id) references app.units(organization_id, id)
);

create table app.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app.organizations(id) on delete cascade,
  user_id uuid not null references app.users(id) on delete cascade,
  role app.member_role not null,
  status app.member_status not null default 'active',
  professional_id uuid,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id),
  foreign key (organization_id, professional_id) references app.professionals(organization_id, id)
);
create index memberships_user_idx on app.memberships (user_id);

create table app.subscriptions (
  organization_id uuid primary key references app.organizations(id) on delete cascade,
  plan text not null default 'solo',
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly', 'yearly')),
  status app.subscription_status not null default 'trialing',
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  grace_until timestamptz,
  provider text,
  provider_customer_ref text,
  provider_subscription_ref text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Funções de contexto (RLS)
-- ---------------------------------------------------------------------------
create or replace function app.current_user_id() returns uuid
language sql stable as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;

create or replace function app.current_org_id() returns uuid
language sql stable as $$
  select nullif(current_setting('app.org_id', true), '')::uuid
$$;

-- SECURITY DEFINER: lê memberships sem recursão de RLS.
create or replace function app.current_member_role() returns app.member_role
language sql stable security definer set search_path = app, pg_temp as $$
  select m.role from app.memberships m
  where m.organization_id = app.current_org_id()
    and m.user_id = app.current_user_id()
    and m.status = 'active'
$$;

create or replace function app.current_professional_id() returns uuid
language sql stable security definer set search_path = app, pg_temp as $$
  select m.professional_id from app.memberships m
  where m.organization_id = app.current_org_id()
    and m.user_id = app.current_user_id()
    and m.status = 'active'
$$;

-- Acesso ao tenant: a linha pertence à organização ativa E o usuário é membro ativo dela.
create or replace function app.has_org_access(org uuid) returns boolean
language sql stable as $$
  select org is not null and org = app.current_org_id() and app.current_member_role() is not null
$$;

create or replace function app.has_role(variadic roles app.member_role[]) returns boolean
language sql stable as $$
  select app.current_member_role() = any(roles)
$$;

-- Profissionais só enxergam a própria agenda; demais papéis enxergam todas.
create or replace function app.can_access_professional(prof uuid) returns boolean
language sql stable as $$
  select app.current_member_role() <> 'professional' or prof = app.current_professional_id()
$$;

grant execute on all functions in schema app to app_tenant;

-- ---------------------------------------------------------------------------
-- Catálogo, agenda e clientes
-- ---------------------------------------------------------------------------
create table app.working_hours (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app.organizations(id) on delete cascade,
  professional_id uuid not null,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = domingo
  start_time time not null,
  end_time time not null,
  check (end_time > start_time),
  foreign key (organization_id, professional_id) references app.professionals(organization_id, id) on delete cascade
);
create index working_hours_prof_idx on app.working_hours (professional_id, weekday);

create table app.time_off (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app.organizations(id) on delete cascade,
  professional_id uuid, -- null = bloqueio do negócio inteiro (ex.: feriado)
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  foreign key (organization_id, professional_id) references app.professionals(organization_id, id) on delete cascade
);
create index time_off_range_idx on app.time_off using gist (organization_id, tstzrange(starts_at, ends_at));

create table app.service_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app.organizations(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  unique (organization_id, id),
  unique (organization_id, name)
);

create table app.services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app.organizations(id) on delete cascade,
  category_id uuid,
  name text not null check (length(name) between 2 and 100),
  description text,
  price_cents integer not null check (price_cents >= 0),
  duration_minutes integer not null check (duration_minutes between 5 and 720),
  buffer_after_minutes integer not null default 0 check (buffer_after_minutes between 0 and 120),
  return_interval_days integer check (return_interval_days between 1 and 730),
  commission_percent numeric(5,2) check (commission_percent between 0 and 100),
  online_bookable boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, category_id) references app.service_categories(organization_id, id) on delete set null (category_id)
);

create table app.professional_services (
  organization_id uuid not null references app.organizations(id) on delete cascade,
  professional_id uuid not null,
  service_id uuid not null,
  primary key (professional_id, service_id),
  foreign key (organization_id, professional_id) references app.professionals(organization_id, id) on delete cascade,
  foreign key (organization_id, service_id) references app.services(organization_id, id) on delete cascade
);

create table app.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app.organizations(id) on delete cascade,
  full_name text not null check (length(full_name) between 2 and 120),
  phone text,
  phone_normalized text,
  email text,
  birth_date date,
  contact_preference text not null default 'whatsapp' check (contact_preference in ('whatsapp', 'email', 'phone', 'none')),
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,
  preferences text,       -- visível a toda a equipe (ex.: "prefere café sem açúcar")
  internal_notes text,    -- restrito a proprietária/gerente/recepção
  source text not null default 'staff' check (source in ('staff', 'online', 'import')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, id)
);
create index clients_org_name_idx on app.clients (organization_id, lower(full_name));
create index clients_org_phone_idx on app.clients (organization_id, phone_normalized);
create index clients_org_email_idx on app.clients (organization_id, lower(email));

create table app.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app.organizations(id) on delete cascade,
  unit_id uuid,
  professional_id uuid not null,
  client_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,       -- fim do atendimento
  blocked_until timestamptz not null, -- fim + tempo de limpeza/preparação
  status app.appointment_status not null default 'pending',
  source app.appointment_source not null default 'staff',
  allow_overlap boolean not null default false, -- encaixe autorizado
  price_cents integer not null default 0 check (price_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  client_notes text,
  internal_notes text,
  cancel_reason text,
  cancelled_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  check (ends_at > starts_at),
  check (blocked_until >= ends_at),
  check (discount_cents <= price_cents),
  unique (organization_id, id),
  foreign key (organization_id, professional_id) references app.professionals(organization_id, id),
  foreign key (organization_id, client_id) references app.clients(organization_id, id),
  foreign key (organization_id, unit_id) references app.units(organization_id, id),
  -- Garantia final contra reservas duplicadas, mesmo sob concorrência.
  constraint appointments_no_overlap exclude using gist (
    professional_id with =,
    tstzrange(starts_at, blocked_until, '[)') with &&
  ) where (status in ('pending', 'confirmed', 'completed') and not allow_overlap)
);
create index appointments_org_start_idx on app.appointments (organization_id, starts_at);
create index appointments_client_idx on app.appointments (client_id, starts_at desc);

create table app.appointment_services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app.organizations(id) on delete cascade,
  appointment_id uuid not null,
  service_id uuid,
  service_name text not null,         -- snapshot: o histórico não muda se o serviço for editado
  price_cents integer not null check (price_cents >= 0),
  duration_minutes integer not null check (duration_minutes > 0),
  position smallint not null default 0,
  foreign key (organization_id, appointment_id) references app.appointments(organization_id, id) on delete cascade,
  foreign key (organization_id, service_id) references app.services(organization_id, id) on delete set null (service_id)
);
create index appointment_services_appt_idx on app.appointment_services (appointment_id);

create table app.appointment_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references app.organizations(id) on delete cascade,
  appointment_id uuid not null,
  actor_user_id uuid,
  type text not null,
  data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  foreign key (organization_id, appointment_id) references app.appointments(organization_id, id) on delete cascade
);
create index appointment_events_appt_idx on app.appointment_events (appointment_id, created_at);

-- ---------------------------------------------------------------------------
-- Financeiro (livro imutável: estornos são novos lançamentos)
-- ---------------------------------------------------------------------------
create table app.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app.organizations(id) on delete cascade,
  appointment_id uuid,
  client_id uuid,
  kind app.payment_kind not null default 'payment',
  amount_cents integer not null check (amount_cents > 0),
  method app.payment_method not null,
  is_deposit boolean not null default false,
  refund_of uuid references app.payments(id),
  paid_at timestamptz not null default now(),
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  check ((kind = 'refund') = (refund_of is not null)),
  foreign key (organization_id, appointment_id) references app.appointments(organization_id, id),
  foreign key (organization_id, client_id) references app.clients(organization_id, id)
);
create index payments_org_paid_idx on app.payments (organization_id, paid_at);
create index payments_appt_idx on app.payments (appointment_id);

-- ---------------------------------------------------------------------------
-- Comunicação
-- ---------------------------------------------------------------------------
create table app.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app.organizations(id) on delete cascade,
  user_id uuid not null references app.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on app.notifications (organization_id, user_id, created_at desc);

-- Fila de mensagens (outbox). idempotency_key impede envio duplicado por retentativa.
create table app.message_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app.organizations(id) on delete cascade,
  appointment_id uuid,
  client_id uuid,
  channel text not null check (channel in ('whatsapp', 'email')),
  template text not null,
  idempotency_key text not null unique,
  scheduled_for timestamptz not null,
  status app.message_status not null default 'pending',
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  next_attempt_at timestamptz,
  last_error text,
  provider_message_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, appointment_id) references app.appointments(organization_id, id) on delete cascade
);
create index message_jobs_due_idx on app.message_jobs (status, scheduled_for);

-- ---------------------------------------------------------------------------
-- Auditoria e instrumentação
-- ---------------------------------------------------------------------------
create table app.audit_log (
  id bigint generated always as identity primary key,
  organization_id uuid references app.organizations(id) on delete cascade,
  actor_user_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_log_org_idx on app.audit_log (organization_id, created_at desc);

create table app.product_events (
  id bigint generated always as identity primary key,
  organization_id uuid,
  user_id uuid,
  name text not null,
  props jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table app.users enable row level security;          -- sem políticas: negado ao tenant
alter table app.sessions enable row level security;
alter table app.rate_limits enable row level security;
alter table app.product_events enable row level security;

alter table app.organizations enable row level security;
create policy org_select on app.organizations for select to app_tenant using (app.has_org_access(id));
create policy org_update on app.organizations for update to app_tenant
  using (app.has_org_access(id) and app.has_role('owner', 'manager'))
  with check (app.has_org_access(id));
grant select, update on app.organizations to app_tenant;

alter table app.memberships enable row level security;
create policy memberships_select on app.memberships for select to app_tenant using (app.has_org_access(organization_id));
create policy memberships_write on app.memberships for all to app_tenant
  using (app.has_org_access(organization_id) and app.has_role('owner'))
  with check (app.has_org_access(organization_id) and app.has_role('owner'));
grant select, insert, update, delete on app.memberships to app_tenant;

alter table app.subscriptions enable row level security;
create policy subscriptions_select on app.subscriptions for select to app_tenant using (app.has_org_access(organization_id));
grant select on app.subscriptions to app_tenant;

-- Tabelas de configuração: leitura por membros, escrita por proprietária/gerente.
do $$
declare t text;
begin
  foreach t in array array['units', 'professionals', 'working_hours', 'service_categories', 'services', 'professional_services']
  loop
    execute format('alter table app.%I enable row level security', t);
    execute format('create policy %I on app.%I for select to app_tenant using (app.has_org_access(organization_id))', t || '_select', t);
    execute format($p$create policy %I on app.%I for all to app_tenant
      using (app.has_org_access(organization_id) and app.has_role('owner', 'manager'))
      with check (app.has_org_access(organization_id) and app.has_role('owner', 'manager'))$p$, t || '_write', t);
    execute format('grant select, insert, update, delete on app.%I to app_tenant', t);
  end loop;
end $$;

alter table app.time_off enable row level security;
create policy time_off_select on app.time_off for select to app_tenant using (app.has_org_access(organization_id));
create policy time_off_write on app.time_off for all to app_tenant
  using (app.has_org_access(organization_id) and (app.has_role('owner', 'manager', 'receptionist') or professional_id = app.current_professional_id()))
  with check (app.has_org_access(organization_id) and (app.has_role('owner', 'manager', 'receptionist') or professional_id = app.current_professional_id()));
grant select, insert, update, delete on app.time_off to app_tenant;

alter table app.clients enable row level security;
create policy clients_select on app.clients for select to app_tenant using (app.has_org_access(organization_id));
create policy clients_insert on app.clients for insert to app_tenant with check (app.has_org_access(organization_id));
create policy clients_update on app.clients for update to app_tenant
  using (app.has_org_access(organization_id)) with check (app.has_org_access(organization_id));
create policy clients_delete on app.clients for delete to app_tenant
  using (app.has_org_access(organization_id) and app.has_role('owner', 'manager'));
grant select, insert, update, delete on app.clients to app_tenant;

alter table app.appointments enable row level security;
create policy appointments_all on app.appointments for all to app_tenant
  using (app.has_org_access(organization_id) and app.can_access_professional(professional_id))
  with check (app.has_org_access(organization_id) and app.can_access_professional(professional_id));
grant select, insert, update on app.appointments to app_tenant; -- sem DELETE: cancelamento preserva histórico

alter table app.appointment_services enable row level security;
create policy appointment_services_all on app.appointment_services for all to app_tenant
  using (app.has_org_access(organization_id)) with check (app.has_org_access(organization_id));
grant select, insert, update, delete on app.appointment_services to app_tenant;

alter table app.appointment_events enable row level security;
create policy appointment_events_select on app.appointment_events for select to app_tenant using (app.has_org_access(organization_id));
create policy appointment_events_insert on app.appointment_events for insert to app_tenant with check (app.has_org_access(organization_id));
grant select, insert on app.appointment_events to app_tenant;

alter table app.payments enable row level security;
create policy payments_select on app.payments for select to app_tenant
  using (app.has_org_access(organization_id) and app.has_role('owner', 'manager', 'receptionist'));
create policy payments_insert on app.payments for insert to app_tenant
  with check (app.has_org_access(organization_id) and app.has_role('owner', 'manager', 'receptionist'));
grant select, insert on app.payments to app_tenant; -- imutável: sem UPDATE/DELETE

alter table app.notifications enable row level security;
create policy notifications_own on app.notifications for select to app_tenant
  using (app.has_org_access(organization_id) and user_id = app.current_user_id());
create policy notifications_mark_read on app.notifications for update to app_tenant
  using (app.has_org_access(organization_id) and user_id = app.current_user_id())
  with check (app.has_org_access(organization_id) and user_id = app.current_user_id());
grant select, update (read_at) on app.notifications to app_tenant;

alter table app.message_jobs enable row level security;
create policy message_jobs_select on app.message_jobs for select to app_tenant using (app.has_org_access(organization_id));
create policy message_jobs_write on app.message_jobs for all to app_tenant
  using (app.has_org_access(organization_id)) with check (app.has_org_access(organization_id));
grant select, insert, update on app.message_jobs to app_tenant;

alter table app.audit_log enable row level security;
create policy audit_select on app.audit_log for select to app_tenant
  using (app.has_org_access(organization_id) and app.has_role('owner', 'manager'));
create policy audit_insert on app.audit_log for insert to app_tenant with check (app.has_org_access(organization_id));
grant select, insert on app.audit_log to app_tenant;
grant usage on all sequences in schema app to app_tenant;
