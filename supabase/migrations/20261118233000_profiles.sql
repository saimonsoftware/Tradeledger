-- =============================================================================
-- Profiles: one row per user, created automatically on sign-up.
-- =============================================================================

-- Shared helper: keeps `updated_at` current on every UPDATE. Reused by later tables.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  -- Same id as the auth user. Deleting the auth user deletes the profile.
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 50),
  timezone text not null default 'UTC',
  default_currency text not null default 'EUR' check (default_currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Per-user settings. Row Level Security: users can only see and edit their own row.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Only real IANA timezone names (e.g. Europe/Dublin) are allowed.
-- A CHECK constraint can't query a catalog, so this is enforced by a trigger.
create or replace function public.validate_profile_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Invalid timezone: %', new.timezone using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger profiles_validate_timezone
  before insert or update of timezone on public.profiles
  for each row execute function public.validate_profile_timezone();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- `(select auth.uid())` is evaluated once per query instead of once per row (faster).
create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No DELETE policy on purpose: a profile is removed only when its auth user is
-- deleted (ON DELETE CASCADE above), which happens through account deletion.

-- Logged-out visitors (the `anon` role) get no access at all.
revoke all on public.profiles from anon;

-- -----------------------------------------------------------------------------
-- Auto-create a profile when a user signs up
-- -----------------------------------------------------------------------------
-- SECURITY DEFINER: runs with the function owner's rights, because the new user
-- isn't logged in yet when auth.users is inserted. search_path = '' prevents
-- schema-hijacking attacks against definer functions.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  tz text := new.raw_user_meta_data ->> 'timezone';
  dn text := nullif(btrim(new.raw_user_meta_data ->> 'display_name'), '');
begin
  -- Never trust browser-provided metadata: fall back to UTC for unknown timezones.
  if tz is null or not exists (select 1 from pg_catalog.pg_timezone_names where name = tz) then
    tz := 'UTC';
  end if;

  insert into public.profiles (id, display_name, timezone)
  values (new.id, left(dn, 50), tz);

  return new;
end;
$$;

-- Nobody should be able to call this directly through the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
