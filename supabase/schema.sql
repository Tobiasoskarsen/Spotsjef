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

-- For deg som allerede opprettet tabellen uten de nye kolonnene:
alter table push_subscriptions add column if not exists grense numeric not null default 0;
alter table push_subscriptions add column if not exists varslet boolean not null default false;
-- Fase 6: koble abonnement til bruker (for assistent-påminnelser) + debounce
alter table push_subscriptions add column if not exists user_id uuid;
alter table push_subscriptions add column if not exists sopp_varslet text; -- dato (YYYY-MM-DD) sist søppel-påminnelse ble sendt

-- Vi skriver kun til tabellen fra serveren (service-role-nøkkelen), så vi slår
-- på Row Level Security uten policies. Da er tabellen låst for anon-nøkkelen i
-- nettleseren, mens service-role bypasser RLS.
alter table push_subscriptions enable row level security;


-- ── Brukerprofiler (assistent-innstillinger) ───────────────────────────────
-- Én rad per bruker (id = auth-bruker). Leses/skrives fra nettleseren med
-- anon-nøkkelen, så her TRENGER vi RLS-policies slik at hver bruker kun ser og
-- endrer SIN egen rad. Krever at "Anonymous sign-ins" er skrudd på i Supabase
-- (Authentication → Sign In / Providers → Anonymous).
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  navn        text not null default '',
  vil_strom   boolean not null default true,
  vil_vaer    boolean not null default true,
  tommedag    smallint,                       -- ukedag søpla tømmes (0=søn..6=lør), null = ikke satt
  stille_fra  smallint not null default 22,   -- stilletimer: varsler ikke fra denne timen
  stille_til  smallint not null default 7,    -- stilletimer: varsler ikke til denne timen
  oppdatert   timestamptz not null default now()
);

-- For deg som alt opprettet profiles uten de nyere kolonnene:
alter table profiles add column if not exists tommedag smallint;
-- Fase 7: stilletimer (når varsler IKKE skal sendes)
alter table profiles add column if not exists stille_fra smallint not null default 22;
alter table profiles add column if not exists stille_til smallint not null default 7;

alter table profiles enable row level security;

-- Policies: kun din egen rad (auth.uid() = id). drop+create for idempotens.
drop policy if exists "egen profil les" on profiles;
create policy "egen profil les" on profiles for select using (auth.uid() = id);

drop policy if exists "egen profil opprett" on profiles;
create policy "egen profil opprett" on profiles for insert with check (auth.uid() = id);

drop policy if exists "egen profil oppdater" on profiles;
create policy "egen profil oppdater" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);
