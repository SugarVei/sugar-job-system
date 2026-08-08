-- ============================================================
-- 网易 163 邮箱账号（面试邮件）
-- Safe to re-run. No destructive operations. RLS by user_id.
-- 授权码仅本人可读；请勿把 service_role 放到前端。
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.mailbox_accounts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  provider        text not null default 'netease163'
    check (provider in ('netease163')),
  email           text not null,
  auth_code       text not null,
  display_name    text,
  last_synced_at  timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, provider, email)
);

create index if not exists mailbox_accounts_user_id_idx
  on public.mailbox_accounts (user_id);

alter table public.mailbox_accounts enable row level security;

drop policy if exists mailbox_accounts_select_own on public.mailbox_accounts;
create policy mailbox_accounts_select_own on public.mailbox_accounts
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists mailbox_accounts_insert_own on public.mailbox_accounts;
create policy mailbox_accounts_insert_own on public.mailbox_accounts
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists mailbox_accounts_update_own on public.mailbox_accounts;
create policy mailbox_accounts_update_own on public.mailbox_accounts
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists mailbox_accounts_delete_own on public.mailbox_accounts;
create policy mailbox_accounts_delete_own on public.mailbox_accounts
  for delete to authenticated
  using (auth.uid() = user_id);

revoke all on table public.mailbox_accounts from anon, authenticated;
grant select, insert, update, delete on table public.mailbox_accounts to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists mailbox_accounts_set_updated_at on public.mailbox_accounts;
create trigger mailbox_accounts_set_updated_at
  before update on public.mailbox_accounts
  for each row execute function public.set_updated_at();
