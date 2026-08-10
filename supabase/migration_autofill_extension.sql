-- Smart resume autofill assistant. This migration is additive and deliberately
-- does not alter or drop interview_reviews / interview_review_questions.
create extension if not exists pgcrypto;

create table if not exists public.autofill_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  revision integer not null default 1 check (revision > 0),
  profile_hash text not null default '',
  schema_version integer not null default 4,
  sync_scope jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);
create index if not exists autofill_profiles_user_id_idx on public.autofill_profiles(user_id);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'autofill_profiles_no_sensitive_cloud_fields') then
    alter table public.autofill_profiles add constraint autofill_profiles_no_sensitive_cloud_fields check (
      profile #>> '{personal,idNumber}' is null and profile #>> '{personal,passportNumber}' is null and
      profile #>> '{personal,detailedAddress}' is null and profile #>> '{personal,addressLine1}' is null and
      profile #>> '{personal,addressLine2}' is null and profile #>> '{personal,streetAddress}' is null and
      profile #>> '{identity,idNumber}' is null and profile #>> '{identity,passportNumber}' is null and
      profile #>> '{contact,detailedAddress}' is null
    );
  end if;
end $$;

create table if not exists public.extension_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default 'Chrome',
  browser text,
  platform text,
  extension_version text,
  protocol_version integer not null default 1,
  last_seen_at timestamptz,
  last_sync_revision integer,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists extension_devices_user_active_idx on public.extension_devices(user_id, revoked_at);

create table if not exists public.extension_pairing_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  max_attempts integer not null default 5 check (max_attempts between 1 and 10),
  attempts integer not null default 0 check (attempts >= 0),
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists extension_pairing_codes_hash_idx on public.extension_pairing_codes(code_hash, expires_at) where consumed_at is null;

create table if not exists public.extension_device_tokens (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.extension_devices(id) on delete cascade,
  token_hash text not null unique,
  scopes text[] not null default array['profile:read','ai:invoke','run:write','device:heartbeat'],
  revoked_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists extension_device_tokens_device_idx on public.extension_device_tokens(device_id, revoked_at);

create table if not exists public.ai_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  encrypted_secret text not null,
  model text,
  last4 text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, provider)
);
create index if not exists ai_credentials_user_id_idx on public.ai_credentials(user_id);

create table if not exists public.autofill_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid references public.extension_devices(id) on delete set null,
  origin_host text not null,
  page_path_hash text,
  status text not null check (status in ('success','partial','failed','cancelled')),
  fields_total integer not null default 0 check (fields_total >= 0),
  fields_filled integer not null default 0 check (fields_filled >= 0),
  fields_manual integer not null default 0 check (fields_manual >= 0),
  error_codes text[] not null default '{}',
  adapter_names text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists autofill_runs_user_created_idx on public.autofill_runs(user_id, created_at desc);

drop trigger if exists trg_autofill_profiles_updated on public.autofill_profiles;
create trigger trg_autofill_profiles_updated before update on public.autofill_profiles for each row execute function public.set_updated_at();
drop trigger if exists trg_extension_devices_updated on public.extension_devices;
create trigger trg_extension_devices_updated before update on public.extension_devices for each row execute function public.set_updated_at();
drop trigger if exists trg_ai_credentials_updated on public.ai_credentials;
create trigger trg_ai_credentials_updated before update on public.ai_credentials for each row execute function public.set_updated_at();

alter table public.autofill_profiles enable row level security;
alter table public.extension_devices enable row level security;
alter table public.extension_pairing_codes enable row level security;
alter table public.extension_device_tokens enable row level security;
alter table public.ai_credentials enable row level security;
alter table public.autofill_runs enable row level security;

drop policy if exists autofill_profiles_select_own on public.autofill_profiles;
create policy autofill_profiles_select_own on public.autofill_profiles for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists autofill_profiles_insert_own on public.autofill_profiles;
create policy autofill_profiles_insert_own on public.autofill_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists autofill_profiles_update_own on public.autofill_profiles;
create policy autofill_profiles_update_own on public.autofill_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists autofill_profiles_delete_own on public.autofill_profiles;
create policy autofill_profiles_delete_own on public.autofill_profiles for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists extension_devices_select_own on public.extension_devices;
create policy extension_devices_select_own on public.extension_devices for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists extension_devices_update_own on public.extension_devices;
create policy extension_devices_update_own on public.extension_devices for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists autofill_runs_select_own on public.autofill_runs;
create policy autofill_runs_select_own on public.autofill_runs for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists autofill_runs_delete_own on public.autofill_runs;
create policy autofill_runs_delete_own on public.autofill_runs for delete to authenticated using ((select auth.uid()) = user_id);

-- Private gateway-only tables: browsers never read or write these directly.
revoke all on table public.extension_pairing_codes from anon, authenticated;
revoke all on table public.extension_device_tokens from anon, authenticated;
revoke all on table public.ai_credentials from anon, authenticated;
revoke all on table public.extension_devices from anon;
revoke all on table public.autofill_runs from anon, authenticated;
grant select, insert, update, delete on table public.autofill_profiles to authenticated;
grant select, update on table public.extension_devices to authenticated;
grant select, delete on table public.autofill_runs to authenticated;
