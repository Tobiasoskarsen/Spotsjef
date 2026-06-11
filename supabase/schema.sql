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


-- ── Påminnelser / egen kalender ────────────────────────────────────────────
-- Brukerens egne hendelser/påminnelser. Vises i briefen og pushes ved forfall.
create table if not exists reminders (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  tekst     text not null,
  tid       timestamptz not null,           -- når påminnelsen forfaller
  varslet   boolean not null default false, -- har vi pushet den?
  opprettet timestamptz not null default now()
);

create index if not exists reminders_bruker_tid on reminders (user_id, tid);

alter table reminders enable row level security;

drop policy if exists "egne reminders les" on reminders;
create policy "egne reminders les" on reminders for select using (auth.uid() = user_id);

drop policy if exists "egne reminders opprett" on reminders;
create policy "egne reminders opprett" on reminders for insert with check (auth.uid() = user_id);

drop policy if exists "egne reminders oppdater" on reminders;
create policy "egne reminders oppdater" on reminders for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "egne reminders slett" on reminders;
create policy "egne reminders slett" on reminders for delete using (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════════════════
-- NÆR – pårørende hjelper en mottaker med hverdagen
-- Pårørende oppretter en invitasjon (kode). Mottakeren taster koden og
-- SAMTYKKER – først da kobles kontoene. Kvitteringer logger levert/bekreftet
-- per påminnelse, og er det pårørende faktisk betaler for.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Relasjoner: pårørende ↔ mottaker ────────────────────────────────────────
create table if not exists relasjoner (
  id              uuid primary key default gen_random_uuid(),
  parorende_id    uuid not null references auth.users(id) on delete cascade,
  mottaker_id     uuid references auth.users(id) on delete cascade, -- null til samtykke
  mottaker_navn   text not null default '',      -- hva pårørende kaller personen («Mamma»)
  invitasjonskode text unique not null,          -- kort kode mottakeren taster inn
  status          text not null default 'venter' check (status in ('venter','aktiv')),
  eskaler_min     smallint not null default 30,  -- varsle pårørende etter X min ubekreftet
  opprettet       timestamptz not null default now(),
  akseptert       timestamptz
);

alter table relasjoner enable row level security;

-- Pårørende ser/styrer sine egne relasjoner
drop policy if exists "parorende relasjon les" on relasjoner;
create policy "parorende relasjon les" on relasjoner for select using (auth.uid() = parorende_id);

drop policy if exists "parorende relasjon opprett" on relasjoner;
create policy "parorende relasjon opprett" on relasjoner for insert
  with check (auth.uid() = parorende_id and status = 'venter' and mottaker_id is null);

drop policy if exists "parorende relasjon oppdater" on relasjoner;
create policy "parorende relasjon oppdater" on relasjoner for update
  using (auth.uid() = parorende_id) with check (auth.uid() = parorende_id);

drop policy if exists "parorende relasjon slett" on relasjoner;
create policy "parorende relasjon slett" on relasjoner for delete using (auth.uid() = parorende_id);

-- Mottakeren ser sin kobling og kan trekke samtykket (slette den)
drop policy if exists "mottaker relasjon les" on relasjoner;
create policy "mottaker relasjon les" on relasjoner for select using (auth.uid() = mottaker_id);

drop policy if exists "mottaker relasjon slett" on relasjoner;
create policy "mottaker relasjon slett" on relasjoner for delete using (auth.uid() = mottaker_id);

-- Samtykke-funksjonen: mottakeren taster koden → kobles. SECURITY DEFINER fordi
-- mottakeren ikke kan se raden (RLS) før hen faktisk er koblet til den.
create or replace function aksepter_invitasjon(kode text)
returns table (relasjon_id uuid, mottaker_navn text)
language plpgsql security definer set search_path = public as $$
declare r relasjoner%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Du må være innlogget.';
  end if;
  select * into r from relasjoner
    where invitasjonskode = upper(trim(kode)) and status = 'venter'
    limit 1;
  if not found then
    raise exception 'Fant ingen invitasjon med denne koden.';
  end if;
  if r.parorende_id = auth.uid() then
    raise exception 'Du kan ikke koble til deg selv.';
  end if;
  update relasjoner set mottaker_id = auth.uid(), status = 'aktiv', akseptert = now()
    where id = r.id;
  -- Merk kontoen som mottaker, så enkel visning kan følge kontoen
  insert into profiles (id, rolle) values (auth.uid(), 'mottaker')
    on conflict (id) do update set rolle = 'mottaker';
  return query select r.id, r.mottaker_navn;
end $$;

revoke all on function aksepter_invitasjon(text) from public;
grant execute on function aksepter_invitasjon(text) to authenticated;

-- Rolle på profilen ('mottaker' settes av aksepter_invitasjon)
alter table profiles add column if not exists rolle text;

-- ── Reminders: pårørende kan administrere mottakerens påminnelser ───────────
alter table reminders add column if not exists opprettet_av uuid references auth.users(id);
alter table reminders add column if not exists gjentakelse text check (gjentakelse in ('daglig','ukentlig'));

drop policy if exists "parorende reminders les" on reminders;
create policy "parorende reminders les" on reminders for select using (
  exists (select 1 from relasjoner r where r.parorende_id = auth.uid()
          and r.mottaker_id = reminders.user_id and r.status = 'aktiv')
);

drop policy if exists "parorende reminders opprett" on reminders;
create policy "parorende reminders opprett" on reminders for insert with check (
  opprettet_av = auth.uid() and
  exists (select 1 from relasjoner r where r.parorende_id = auth.uid()
          and r.mottaker_id = reminders.user_id and r.status = 'aktiv')
);

drop policy if exists "parorende reminders oppdater" on reminders;
create policy "parorende reminders oppdater" on reminders for update using (
  exists (select 1 from relasjoner r where r.parorende_id = auth.uid()
          and r.mottaker_id = reminders.user_id and r.status = 'aktiv')
);

drop policy if exists "parorende reminders slett" on reminders;
create policy "parorende reminders slett" on reminders for delete using (
  exists (select 1 from relasjoner r where r.parorende_id = auth.uid()
          and r.mottaker_id = reminders.user_id and r.status = 'aktiv')
);

-- ── Kvitteringer: levert/bekreftet per forekomst av en påminnelse ───────────
create table if not exists kvitteringer (
  id          uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references reminders(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade, -- mottakeren
  tekst       text not null default '',     -- kopi av påminnelsesteksten (lesbar historikk)
  planlagt    timestamptz not null,         -- når påminnelsen skulle skje
  levert      timestamptz,                  -- når push faktisk ble sendt (null = nådde ikke frem)
  bekreftet   timestamptz,                  -- når mottakeren trykket «Ferdig ✓»
  eskalert    boolean not null default false, -- har vi varslet pårørende om manglende bekreftelse?
  opprettet   timestamptz not null default now()
);

create index if not exists kvitteringer_reminder on kvitteringer (reminder_id, planlagt desc);
create index if not exists kvitteringer_bruker on kvitteringer (user_id, bekreftet);

alter table kvitteringer enable row level security;

-- Mottakeren ser sine kvitteringer og bekrefter dem
drop policy if exists "mottaker kvittering les" on kvitteringer;
create policy "mottaker kvittering les" on kvitteringer for select using (auth.uid() = user_id);

drop policy if exists "mottaker kvittering opprett" on kvitteringer;
create policy "mottaker kvittering opprett" on kvitteringer for insert with check (auth.uid() = user_id);

drop policy if exists "mottaker kvittering oppdater" on kvitteringer;
create policy "mottaker kvittering oppdater" on kvitteringer for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Pårørende ser kvitteringene til sine mottakere (selve produktet)
drop policy if exists "parorende kvittering les" on kvitteringer;
create policy "parorende kvittering les" on kvitteringer for select using (
  exists (select 1 from relasjoner r where r.parorende_id = auth.uid()
          and r.mottaker_id = kvitteringer.user_id and r.status = 'aktiv')
);
