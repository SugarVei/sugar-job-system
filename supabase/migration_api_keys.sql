-- ============================================================
-- Store user AI provider API keys with per-user RLS protection.
-- Run after supabase/schema.sql for existing databases.
-- ============================================================

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.user_api_keys (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  provider   text not null,
  api_key    text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create index if not exists user_api_keys_user_id_idx on public.user_api_keys (user_id);

alter table public.user_api_keys enable row level security;

drop policy if exists "user_api_keys_select_own" on public.user_api_keys;
create policy "user_api_keys_select_own" on public.user_api_keys
  for select using (auth.uid() = user_id);

drop policy if exists "user_api_keys_insert_own" on public.user_api_keys;
create policy "user_api_keys_insert_own" on public.user_api_keys
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_api_keys_update_own" on public.user_api_keys;
create policy "user_api_keys_update_own" on public.user_api_keys
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_api_keys_delete_own" on public.user_api_keys;
create policy "user_api_keys_delete_own" on public.user_api_keys
  for delete using (auth.uid() = user_id);

drop trigger if exists trg_user_api_keys_updated on public.user_api_keys;
create trigger trg_user_api_keys_updated before update on public.user_api_keys
  for each row execute function public.set_updated_at();
