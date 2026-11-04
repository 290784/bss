-- Saudação do painel: uma por usuária, por empresa e por dia (no fuso da empresa).
-- Guardada no banco (e não só no navegador) para não mudar ao atualizar a página, sair e entrar de novo
-- ou abrir em outro aparelho. greeting_index aponta para a posição da frase em src/domain/greetings.ts
-- (0 a 7): a lista só ganha frases no final, nunca é reordenada.
create table app.user_greetings (
  organization_id uuid not null references app.organizations(id) on delete cascade,
  user_id uuid not null references app.users(id) on delete cascade,
  local_date date not null,
  greeting_index smallint not null check (greeting_index between 0 and 7),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id, local_date)
);

alter table app.user_greetings enable row level security;
-- Cada usuária só enxerga e cria a própria saudação, dentro da empresa ativa.
create policy user_greetings_select on app.user_greetings for select to app_tenant
  using (app.has_org_access(organization_id) and user_id = app.current_user_id());
create policy user_greetings_insert on app.user_greetings for insert to app_tenant
  with check (app.has_org_access(organization_id) and user_id = app.current_user_id());
-- Sem UPDATE/DELETE: a saudação do dia nunca muda depois de escolhida.
grant select, insert on app.user_greetings to app_tenant;
