-- Flyt – databaseskjema for Supabase (Postgres)
-- Kjør dette i Supabase: Dashboard → SQL Editor → New query → lim inn → Run.
-- Trygt å kjøre flere ganger (IF NOT EXISTS overalt).

-- Push-abonnement per enhet/nettleser + spotpris-alarm.
create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  endpoint    text unique not null,           -- unik adresse til nettleseren
  p256dh      text not null,                  -- krypteringsnøkkel fra abonnementet
  auth        text not null,                  -- auth-hemmelighet fra abonnementet
  zone        text not null default 'NO1',    -- prissone for relevante varsler
  grense      numeric not null default 0,     -- varsle når spotpris går under (øre/kWh)
  varslet     boolean not null default false, -- har vi alt varslet i denne billig-perioden?
  created_at  timestamptz not null default now()
);

-- For deg som allerede opprettet tabellen uten de to nye kolonnene:
alter table push_subscriptions add column if not exists grense numeric not null default 0;
alter table push_subscriptions add column if not exists varslet boolean not null default false;

-- Vi skriver kun til tabellen fra serveren (service-role-nøkkelen), så vi slår
-- på Row Level Security uten policies. Da er tabellen låst for anon-nøkkelen i
-- nettleseren, mens service-role bypasser RLS.
alter table push_subscriptions enable row level security;
