-- ============================================================
-- FlorLovesRunning — esquema de Supabase
-- Ejecuta este archivo completo en Supabase → SQL Editor → New query.
-- Es idempotente: puedes volver a ejecutarlo tras cada actualización.
--
-- Sin emails ni cuentas de Supabase: hay dos perfiles fijos (Sofi y
-- Flor), cada uno con su contraseña (variables PASSWORD_SOFI y
-- PASSWORD_FLOR en Netlify). El navegador nunca habla con Supabase;
-- solo lo hacen las funciones de Netlify con la service role key. Por
-- eso todas las tablas tienen RLS activado y ninguna política.
-- ============================================================

-- ---------- Limpieza de la versión anterior (login con email) ----------
-- Si la base tiene el esquema antiguo (perfiles ligados a cuentas de
-- Supabase Auth), se elimina para crear el nuevo. Esa versión nunca se
-- usó con datos reales; con el esquema nuevo este bloque no hace nada.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'id' and data_type = 'uuid'
  ) then
    if to_regclass('auth.users') is not null then
      drop trigger if exists on_auth_user_created on auth.users;
    end if;
    drop table if exists public.strava_tokens, public.body_metrics, public.sleep, public.meals,
      public.recipes, public.runs, public.profiles, public.allowed_emails cascade;
    drop function if exists public.handle_new_user();
    drop function if exists public.is_allowed();
  end if;
end $$;

-- ---------- Perfiles ----------
create table if not exists public.profiles (
  id                text primary key check (id ~ '^[a-z]{2,20}$'),
  name              text not null,
  goals             jsonb not null default '{"kcal":2200,"p":140,"c":250,"f":70,"sleep":8,"km":30}',
  height_cm         numeric(5,1) check (height_cm is null or height_cm between 100 and 250),
  prefs             jsonb not null default '{}',     -- { "accent": "rosa", "mode": "system" }
  strava_athlete_id bigint unique,
  strava_synced_at  timestamptz,
  created_at        timestamptz not null default now()
);

insert into public.profiles (id, name) values
  ('sofi', 'Sofi'),
  ('flor', 'Flor')
on conflict (id) do update set name = excluded.name;

-- ---------- Carreras ----------
create table if not exists public.runs (
  id         uuid primary key default gen_random_uuid(),
  profile_id text not null references public.profiles (id) on delete cascade,
  date       date not null,
  km         numeric(7,2) not null check (km >= 0),
  sec        integer not null default 0 check (sec >= 0),
  type       text not null default 'suave',
  notes      text not null default '',
  source     text not null default 'manual' check (source in ('manual', 'strava')),
  strava_id  bigint unique,
  elevation  numeric(7,1),
  avg_hr     numeric(5,1),
  created_at timestamptz not null default now()
);
create index if not exists runs_profile_date on public.runs (profile_id, date desc);

-- ---------- Recetas (compartidas entre los dos perfiles) ----------
create table if not exists public.recipes (
  id          uuid primary key default gen_random_uuid(),
  created_by  text references public.profiles (id) on delete set null,
  name        text not null,
  servings    numeric(5,1) not null default 1 check (servings > 0),
  ingredients text not null default '',
  kcal        numeric(8,1) not null default 0,
  p           numeric(7,1) not null default 0,
  c           numeric(7,1) not null default 0,
  f           numeric(7,1) not null default 0,
  items       jsonb not null default '[]',
  updated_at  timestamptz not null default now()
);

-- ---------- Comidas ----------
create table if not exists public.meals (
  id          uuid primary key default gen_random_uuid(),
  profile_id  text not null references public.profiles (id) on delete cascade,
  date        date not null,
  time        time not null default '12:00',
  slot        text not null default 'comida',
  name        text not null,
  kcal        numeric(8,1) not null default 0,
  p           numeric(7,1) not null default 0,
  c           numeric(7,1) not null default 0,
  f           numeric(7,1) not null default 0,
  recipe_id   uuid references public.recipes (id) on delete set null,
  servings    numeric(5,2) not null default 0,
  items       jsonb not null default '[]',
  description text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists meals_profile_date on public.meals (profile_id, date desc);

-- ---------- Sueño ----------
create table if not exists public.sleep (
  id         uuid primary key default gen_random_uuid(),
  profile_id text not null references public.profiles (id) on delete cascade,
  date       date not null,
  bed        time not null,
  wake       time not null,
  hours      numeric(4,2) not null check (hours between 0 and 24),
  quality    smallint not null default 3 check (quality between 1 and 5),
  notes      text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists sleep_profile_date on public.sleep (profile_id, date desc);

-- ---------- Peso y composición corporal ----------
create table if not exists public.body_metrics (
  id           uuid primary key default gen_random_uuid(),
  profile_id   text not null references public.profiles (id) on delete cascade,
  date         date not null,
  weight_kg    numeric(5,2) not null check (weight_kg between 20 and 400),
  body_fat_pct numeric(4,1) check (body_fat_pct is null or body_fat_pct between 2 and 75),
  notes        text not null default '',
  created_at   timestamptz not null default now()
);
create index if not exists body_metrics_profile_date on public.body_metrics (profile_id, date desc);

-- ---------- Tokens de Strava ----------
create table if not exists public.strava_tokens (
  profile_id    text primary key references public.profiles (id) on delete cascade,
  athlete_id    bigint not null unique,
  access_token  text not null,
  refresh_token text not null,
  expires_at    timestamptz not null,
  updated_at    timestamptz not null default now()
);

-- ---------- Seguridad: solo el servidor (service role) accede ----------
alter table public.profiles      enable row level security;
alter table public.runs          enable row level security;
alter table public.recipes       enable row level security;
alter table public.meals         enable row level security;
alter table public.sleep         enable row level security;
alter table public.body_metrics  enable row level security;
alter table public.strava_tokens enable row level security;

revoke all on public.profiles, public.runs, public.recipes, public.meals,
  public.sleep, public.body_metrics, public.strava_tokens from anon, authenticated;
