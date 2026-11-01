-- Automações do WhatsApp: lembrete na véspera com confirmação, oferta de serviço extra
-- dentro da conversa e passagem para a profissional quando a cliente sai do roteiro.

-- Liga/desliga por estabelecimento.
alter table app.organizations
  add column whatsapp_reminder_enabled boolean not null default true,
  add column whatsapp_upsell_enabled boolean not null default true;

-- A profissional escolhe quais serviços podem ser oferecidos como extra.
alter table app.services
  add column offer_as_extra boolean not null default true;

-- Mensagens livres (respostas dentro da conversa) guardam o texto pronto; botões opcionais.
alter table app.message_jobs
  add column body text,
  add column buttons jsonb;

-- Em que ponto está a conversa de cada agendamento.
--   awaiting_confirmation: lembrete enviado, esperando "Confirmo" / "Preciso remarcar";
--   awaiting_offer: confirmou e recebeu a oferta de um serviço extra, esperando SIM / NÃO;
--   handoff: saiu do roteiro, a profissional assume (a automação não responde mais);
--   closed: terminou.
create table app.whatsapp_threads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app.organizations(id) on delete cascade,
  appointment_id uuid not null,
  client_id uuid not null,
  phone_normalized text not null,
  stage text not null check (stage in ('awaiting_confirmation', 'awaiting_offer', 'handoff', 'closed')),
  offer_service_id uuid,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (appointment_id),
  foreign key (organization_id, appointment_id) references app.appointments(organization_id, id) on delete cascade
);
create index whatsapp_threads_phone_idx on app.whatsapp_threads (phone_normalized, updated_at desc);

alter table app.whatsapp_threads enable row level security;
create policy whatsapp_threads_select on app.whatsapp_threads for select to app_tenant using (app.has_org_access(organization_id));
grant select on app.whatsapp_threads to app_tenant;

-- Mensagens recebidas já processadas (o provedor pode reenviar o mesmo evento).
create table app.whatsapp_inbound (
  provider_message_id text primary key,
  phone_normalized text not null,
  organization_id uuid references app.organizations(id) on delete cascade,
  appointment_id uuid,
  text text,
  outcome text,
  created_at timestamptz not null default now()
);
alter table app.whatsapp_inbound enable row level security;
create policy whatsapp_inbound_select on app.whatsapp_inbound for select to app_tenant using (app.has_org_access(organization_id));
grant select on app.whatsapp_inbound to app_tenant;
