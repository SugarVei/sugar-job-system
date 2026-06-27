-- ============================================================
-- 一键修复：列名不一致 + 补全所有缺失表 + RLS
-- 完全幂等，可重复执行。
-- 在 Supabase 控制台 → SQL Editor 粘贴全部内容 → Run。
-- ============================================================

create extension if not exists "pgcrypto";

-- ── 辅助函数 ─────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ── 1. 投递记录表 ────────────────────────────────────────────
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
  resume_id     uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists applications_user_id_idx on public.applications (user_id);

-- 兼容：若 applications 已存在但缺 resume_id 列，补上
alter table public.applications
  add column if not exists resume_id uuid references public.resumes (id) on delete set null;
create index if not exists applications_resume_id_idx on public.applications (resume_id);

-- ── 2. 公司库表 ──────────────────────────────────────────────
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

-- ── 3. 简历库表 ──────────────────────────────────────────────
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

-- ── 4. 简历文件表 ────────────────────────────────────────────
-- 4a. 修复列名：旧表用 file_type，前端代码用 kind，统一为 kind
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'resume_files'
      and column_name  = 'file_type'
  ) then
    alter table public.resume_files rename column file_type to kind;
  end if;
end $$;

-- 4b. 若表不存在则创建（kind 列）
create table if not exists public.resume_files (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  resume_id  uuid not null references public.resumes (id) on delete cascade,
  file_name  text not null,
  file_path  text not null,
  kind       text not null default 'resume' check (kind in ('resume', 'script')),
  size       bigint,
  created_at timestamptz not null default now()
);
create index if not exists resume_files_user_id_idx   on public.resume_files (user_id);
create index if not exists resume_files_resume_id_idx on public.resume_files (resume_id);

-- 4c. 兼容：补缺列
alter table public.resume_files add column if not exists file_name text;
alter table public.resume_files add column if not exists file_path text;
alter table public.resume_files add column if not exists kind      text default 'resume';
alter table public.resume_files add column if not exists size      bigint;

-- ── 5. 面试日历表 ────────────────────────────────────────────
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

-- ── 6. updated_at 触发器 ─────────────────────────────────────
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

-- ── 7. 开启 RLS ──────────────────────────────────────────────
alter table public.applications  enable row level security;
alter table public.companies     enable row level security;
alter table public.resumes       enable row level security;
alter table public.resume_files  enable row level security;
alter table public.interviews    enable row level security;

-- ── 8. applications RLS ──────────────────────────────────────
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

-- ── 9. companies RLS ─────────────────────────────────────────
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

-- ── 10. resumes RLS ──────────────────────────────────────────
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

-- ── 11. resume_files RLS ─────────────────────────────────────
drop policy if exists "resume_files_select_own" on public.resume_files;
create policy "resume_files_select_own" on public.resume_files
  for select using (auth.uid() = user_id);

drop policy if exists "resume_files_insert_own" on public.resume_files;
create policy "resume_files_insert_own" on public.resume_files
  for insert with check (auth.uid() = user_id);

drop policy if exists "resume_files_update_own" on public.resume_files;
create policy "resume_files_update_own" on public.resume_files
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "resume_files_delete_own" on public.resume_files;
create policy "resume_files_delete_own" on public.resume_files
  for delete using (auth.uid() = user_id);

-- ── 12. interviews RLS ───────────────────────────────────────
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

-- ── 13. Storage 私有桶 ───────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes', 'resumes', false, 10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png', 'image/jpeg', 'text/plain'
  ]
)
on conflict (id) do nothing;

-- ── 14. Storage 桶 RLS ───────────────────────────────────────
drop policy if exists "resumes_obj_select_own"  on storage.objects;
create policy "resumes_obj_select_own" on storage.objects
  for select using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "resumes_obj_insert_own"  on storage.objects;
create policy "resumes_obj_insert_own" on storage.objects
  for insert with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "resumes_obj_update_own"  on storage.objects;
create policy "resumes_obj_update_own" on storage.objects
  for update using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text)
  with check   (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "resumes_obj_delete_own"  on storage.objects;
create policy "resumes_obj_delete_own" on storage.objects
  for delete using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── 验证（去掉注释后单独跑）───────────────────────────────────
-- select
--   to_regclass('public.applications') is not null as has_applications,
--   to_regclass('public.companies')    is not null as has_companies,
--   to_regclass('public.resumes')      is not null as has_resumes,
--   to_regclass('public.resume_files') is not null as has_resume_files,
--   to_regclass('public.interviews')   is not null as has_interviews,
--   not exists (
--     select 1 from information_schema.columns
--     where table_schema='public' and table_name='resume_files' and column_name='file_type'
--   ) as file_type_renamed_to_kind,
--   exists (select 1 from storage.buckets where id='resumes') as has_bucket;
