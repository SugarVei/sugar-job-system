-- ============================================================
-- Sugar 求职系统 —— Supabase 数据库建表 + 行级安全策略(RLS)
-- 在 Supabase 控制台 → SQL Editor 中粘贴并 Run 即可。
-- 每个用户只能读写自己的数据（user_id = auth.uid()）。
-- ============================================================

-- 用于自动生成 UUID
create extension if not exists "pgcrypto";

-- 通用：更新时自动维护 updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- 1. 投递记录 applications
-- ============================================================
create table if not exists public.applications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  company_name  text not null,
  position_name text not null,
  city          text,
  channel       text,
  apply_date    date,
  status        text not null default '已投递',
  salary_range  text,
  job_url       text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists applications_user_id_idx on public.applications (user_id);

-- ============================================================
-- 2. 公司库 companies
-- ============================================================
create table if not exists public.companies (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  company_name  text not null,
  industry      text,
  city          text,
  scale         text,
  website       text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists companies_user_id_idx on public.companies (user_id);

-- ============================================================
-- 3. 简历库 resumes
-- ============================================================
create table if not exists public.resumes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  resume_name     text not null,
  target_position text,
  file_url        text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists resumes_user_id_idx on public.resumes (user_id);

-- ============================================================
-- 4. 面试日历 interviews
-- ============================================================
create table if not exists public.interviews (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  company_name   text not null,
  position_name  text,
  interview_time timestamptz,
  round          text,
  interview_type text,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists interviews_user_id_idx on public.interviews (user_id);

-- ============================================================
-- updated_at 触发器
-- ============================================================
drop trigger if exists trg_applications_updated on public.applications;
create trigger trg_applications_updated before update on public.applications
  for each row execute function public.set_updated_at();

drop trigger if exists trg_companies_updated on public.companies;
create trigger trg_companies_updated before update on public.companies
  for each row execute function public.set_updated_at();

drop trigger if exists trg_resumes_updated on public.resumes;
create trigger trg_resumes_updated before update on public.resumes
  for each row execute function public.set_updated_at();

drop trigger if exists trg_interviews_updated on public.interviews;
create trigger trg_interviews_updated before update on public.interviews
  for each row execute function public.set_updated_at();

-- ============================================================
-- 开启 RLS
-- ============================================================
alter table public.applications enable row level security;
alter table public.companies    enable row level security;
alter table public.resumes      enable row level security;
alter table public.interviews   enable row level security;

-- ============================================================
-- RLS 策略：每张表 4 条（select / insert / update / delete）
-- 只能操作 user_id = auth.uid() 的行
-- ============================================================

-- applications
drop policy if exists "applications_select_own" on public.applications;
create policy "applications_select_own" on public.applications
  for select using (auth.uid() = user_id);
drop policy if exists "applications_insert_own" on public.applications;
create policy "applications_insert_own" on public.applications
  for insert with check (auth.uid() = user_id);
drop policy if exists "applications_update_own" on public.applications;
create policy "applications_update_own" on public.applications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "applications_delete_own" on public.applications;
create policy "applications_delete_own" on public.applications
  for delete using (auth.uid() = user_id);

-- companies
drop policy if exists "companies_select_own" on public.companies;
create policy "companies_select_own" on public.companies
  for select using (auth.uid() = user_id);
drop policy if exists "companies_insert_own" on public.companies;
create policy "companies_insert_own" on public.companies
  for insert with check (auth.uid() = user_id);
drop policy if exists "companies_update_own" on public.companies;
create policy "companies_update_own" on public.companies
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "companies_delete_own" on public.companies;
create policy "companies_delete_own" on public.companies
  for delete using (auth.uid() = user_id);

-- resumes
drop policy if exists "resumes_select_own" on public.resumes;
create policy "resumes_select_own" on public.resumes
  for select using (auth.uid() = user_id);
drop policy if exists "resumes_insert_own" on public.resumes;
create policy "resumes_insert_own" on public.resumes
  for insert with check (auth.uid() = user_id);
drop policy if exists "resumes_update_own" on public.resumes;
create policy "resumes_update_own" on public.resumes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "resumes_delete_own" on public.resumes;
create policy "resumes_delete_own" on public.resumes
  for delete using (auth.uid() = user_id);

-- interviews
drop policy if exists "interviews_select_own" on public.interviews;
create policy "interviews_select_own" on public.interviews
  for select using (auth.uid() = user_id);
drop policy if exists "interviews_insert_own" on public.interviews;
create policy "interviews_insert_own" on public.interviews
  for insert with check (auth.uid() = user_id);
drop policy if exists "interviews_update_own" on public.interviews;
create policy "interviews_update_own" on public.interviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "interviews_delete_own" on public.interviews;
create policy "interviews_delete_own" on public.interviews
  for delete using (auth.uid() = user_id);
