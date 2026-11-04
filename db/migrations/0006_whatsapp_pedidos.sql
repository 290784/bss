-- O salão pede "quero conectar meu WhatsApp" com um toque; a equipe da Gê faz a configuração junto com ele (chamada rápida).
create table app.whatsapp_requests (
  organization_id uuid primary key references app.organizations(id) on delete cascade,
  phone text not null,
  requested_by uuid references app.users(id) on delete set null,
  requested_at timestamptz not null default now()
);
alter table app.whatsapp_requests enable row level security;
create policy whatsapp_requests_select on app.whatsapp_requests for select to app_tenant using (app.has_org_access(organization_id));
create policy whatsapp_requests_insert on app.whatsapp_requests for insert to app_tenant with check (app.has_org_access(organization_id));
create policy whatsapp_requests_update on app.whatsapp_requests for update to app_tenant using (app.has_org_access(organization_id)) with check (app.has_org_access(organization_id));
grant select, insert, update on app.whatsapp_requests to app_tenant;
