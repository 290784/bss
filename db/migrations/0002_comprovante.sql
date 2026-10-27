-- Comprovante público do agendamento e confirmação de presença pela cliente.
--
-- public_token: segredo aleatório (2 × 122 bits) que dá acesso somente ao comprovante daquele
-- agendamento (/b/<slug>/agendamento/<token>). Gerado pelo banco também para os antigos.
-- client_confirmed_at: quando a cliente tocou em "Confirmar presença" no comprovante.
alter table app.appointments
  add column public_token text not null
    default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  add column client_confirmed_at timestamptz;

create unique index appointments_public_token_idx on app.appointments (public_token);
