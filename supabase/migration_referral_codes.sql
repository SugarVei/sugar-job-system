-- Sugar 求职系统：内推码管理
-- 可重复执行；仅已登录用户可访问自己的记录。

create extension if not exists "pgcrypto";

create table if not exists public.referral_codes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  company_id    uuid references public.companies (id) on delete set null,
  company_name  text not null,
  industry      text,
  position_name text not null,
  city          text,
  referral_code text not null,
  source         text,
  status         text not null default '可用',
  expires_at     date,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint referral_codes_status_check check (status in ('可用', '即将过期', '已使用'))
);

alter table public.referral_codes add column if not exists id uuid default gen_random_uuid();
alter table public.referral_codes add column if not exists user_id uuid;
alter table public.referral_codes add column if not exists company_id uuid;
alter table public.referral_codes add column if not exists company_name text;
alter table public.referral_codes add column if not exists industry text;
alter table public.referral_codes add column if not exists position_name text;
alter table public.referral_codes add column if not exists city text;
alter table public.referral_codes add column if not exists referral_code text;
alter table public.referral_codes add column if not exists source text;
alter table public.referral_codes add column if not exists status text default '可用';
alter table public.referral_codes add column if not exists expires_at date;
alter table public.referral_codes add column if not exists notes text;
alter table public.referral_codes add column if not exists created_at timestamptz default now();
alter table public.referral_codes add column if not exists updated_at timestamptz default now();

alter table public.referral_codes alter column id set default gen_random_uuid();
alter table public.referral_codes alter column id set not null;
alter table public.referral_codes alter column user_id set not null;
alter table public.referral_codes alter column company_name set not null;
alter table public.referral_codes alter column position_name set not null;
alter table public.referral_codes alter column referral_code set not null;
alter table public.referral_codes alter column status set default '可用';
alter table public.referral_codes alter column status set not null;
alter table public.referral_codes alter column created_at set default now();
alter table public.referral_codes alter column created_at set not null;
alter table public.referral_codes alter column updated_at set default now();
alter table public.referral_codes alter column updated_at set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.referral_codes'::regclass and contype = 'p') then
    alter table public.referral_codes
      add constraint referral_codes_pkey primary key (id);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.referral_codes'::regclass and conname = 'referral_codes_user_id_fkey') then
    alter table public.referral_codes
      add constraint referral_codes_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.referral_codes'::regclass and conname = 'referral_codes_company_id_fkey') then
    alter table public.referral_codes
      add constraint referral_codes_company_id_fkey foreign key (company_id) references public.companies (id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.referral_codes'::regclass and conname = 'referral_codes_status_check') then
    alter table public.referral_codes
      add constraint referral_codes_status_check check (status in ('可用', '即将过期', '已使用'));
  end if;
end
$$;

create index if not exists referral_codes_user_id_idx on public.referral_codes (user_id);
create index if not exists referral_codes_company_id_idx on public.referral_codes (company_id);
create index if not exists referral_codes_user_status_idx on public.referral_codes (user_id, status);
create index if not exists referral_codes_user_company_name_idx on public.referral_codes (user_id, company_name);
create index if not exists referral_codes_expires_at_idx on public.referral_codes (expires_at);

drop trigger if exists trg_referral_codes_updated on public.referral_codes;
create trigger trg_referral_codes_updated before update on public.referral_codes
  for each row execute function public.set_updated_at();

alter table public.referral_codes enable row level security;

drop policy if exists "referral_codes_select_own" on public.referral_codes;
create policy "referral_codes_select_own" on public.referral_codes
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "referral_codes_insert_own" on public.referral_codes;
create policy "referral_codes_insert_own" on public.referral_codes
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "referral_codes_update_own" on public.referral_codes;
create policy "referral_codes_update_own" on public.referral_codes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "referral_codes_delete_own" on public.referral_codes;
create policy "referral_codes_delete_own" on public.referral_codes
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on table public.referral_codes from anon, authenticated;
grant select, insert, update, delete on table public.referral_codes to authenticated;
