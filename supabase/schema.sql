-- ============================================================
-- Sugar 求职系统 Supabase schema
-- Run this in Supabase SQL Editor.
-- Each signed-in user can only read/write rows whose user_id = auth.uid().
-- ============================================================

create extension if not exists "pgcrypto";

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

-- 1. 投递记录
create table if not exists public.applications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  company_name  text not null,
  position_name text not null,
  city          text,
  channel       text,
  apply_date    date,
  status        text not null default '待投递',
  salary_range  text,
  job_url       text,
  notes         text,
  jd_text       text,
  jd_keywords   text[],
  match_score   int check (match_score is null or (match_score >= 0 and match_score <= 100)),
  match_summary text,
  next_action   text,
  next_action_at timestamptz,
  deadline_at   timestamptz,
  priority      text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists applications_user_id_idx on public.applications (user_id);

-- 2. 公司库
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

-- 2.1 内推码管理
create table if not exists public.referral_codes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  company_id    uuid references public.companies (id) on delete set null,
  company_name  text not null,
  industry      text,
  position_name text,
  city          text,
  referral_code text not null,
  referrer_name text,
  source        text,
  status        text not null default '可用' check (status in ('可用', '即将过期', '已使用')),
  expires_at    date,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists referral_codes_user_id_idx on public.referral_codes (user_id);
create index if not exists referral_codes_company_id_idx on public.referral_codes (company_id);
create index if not exists referral_codes_user_status_idx on public.referral_codes (user_id, status);
create index if not exists referral_codes_user_company_name_idx on public.referral_codes (user_id, company_name);
create index if not exists referral_codes_expires_at_idx on public.referral_codes (expires_at);

-- 3. 简历库
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

-- 投递关联简历。旧库执行本脚本时会自动补列。
alter table public.applications
  add column if not exists resume_id uuid references public.resumes (id) on delete set null;
create index if not exists applications_resume_id_idx on public.applications (resume_id);

-- 4. 简历/面试附件
create table if not exists public.resume_files (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  resume_id  uuid not null references public.resumes (id) on delete cascade,
  file_name  text not null,
  file_path  text,
  kind       text not null check (kind in ('resume', 'script')),
  size       bigint,
  content    text,
  source     text not null default 'upload' check (source in ('upload', 'ai')),
  created_at timestamptz not null default now()
);
create index if not exists resume_files_user_id_idx on public.resume_files (user_id);
create index if not exists resume_files_resume_id_idx on public.resume_files (resume_id);

-- 5. AI 服务商 API Key。API Key 受账号权限保护，不在前端写入 service_role key。
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

-- 6. 面试日历
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

-- updated_at triggers
drop trigger if exists trg_applications_updated on public.applications;
create trigger trg_applications_updated before update on public.applications
  for each row execute function public.set_updated_at();

drop trigger if exists trg_companies_updated on public.companies;
create trigger trg_companies_updated before update on public.companies
  for each row execute function public.set_updated_at();

drop trigger if exists trg_referral_codes_updated on public.referral_codes;
create trigger trg_referral_codes_updated before update on public.referral_codes
  for each row execute function public.set_updated_at();

drop trigger if exists trg_resumes_updated on public.resumes;
create trigger trg_resumes_updated before update on public.resumes
  for each row execute function public.set_updated_at();

drop trigger if exists trg_interviews_updated on public.interviews;
create trigger trg_interviews_updated before update on public.interviews
  for each row execute function public.set_updated_at();

drop trigger if exists trg_user_api_keys_updated on public.user_api_keys;
create trigger trg_user_api_keys_updated before update on public.user_api_keys
  for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.applications enable row level security;
alter table public.companies enable row level security;
alter table public.referral_codes enable row level security;
alter table public.resumes enable row level security;
alter table public.resume_files enable row level security;
alter table public.user_api_keys enable row level security;
alter table public.interviews enable row level security;

-- applications
drop policy if exists "applications_select_own" on public.applications;
create policy "applications_select_own" on public.applications for select using (auth.uid() = user_id);
drop policy if exists "applications_insert_own" on public.applications;
create policy "applications_insert_own" on public.applications for insert with check (auth.uid() = user_id);
drop policy if exists "applications_update_own" on public.applications;
create policy "applications_update_own" on public.applications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "applications_delete_own" on public.applications;
create policy "applications_delete_own" on public.applications for delete using (auth.uid() = user_id);

-- companies
drop policy if exists "companies_select_own" on public.companies;
create policy "companies_select_own" on public.companies for select using (auth.uid() = user_id);
drop policy if exists "companies_insert_own" on public.companies;
create policy "companies_insert_own" on public.companies for insert with check (auth.uid() = user_id);
drop policy if exists "companies_update_own" on public.companies;
create policy "companies_update_own" on public.companies for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "companies_delete_own" on public.companies;
create policy "companies_delete_own" on public.companies for delete using (auth.uid() = user_id);

-- referral_codes
drop policy if exists "referral_codes_select_own" on public.referral_codes;
create policy "referral_codes_select_own" on public.referral_codes for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "referral_codes_insert_own" on public.referral_codes;
create policy "referral_codes_insert_own" on public.referral_codes for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "referral_codes_update_own" on public.referral_codes;
create policy "referral_codes_update_own" on public.referral_codes for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "referral_codes_delete_own" on public.referral_codes;
create policy "referral_codes_delete_own" on public.referral_codes for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on table public.referral_codes from anon, authenticated;
grant select, insert, update, delete on table public.referral_codes to authenticated;

-- resumes
drop policy if exists "resumes_select_own" on public.resumes;
create policy "resumes_select_own" on public.resumes for select using (auth.uid() = user_id);
drop policy if exists "resumes_insert_own" on public.resumes;
create policy "resumes_insert_own" on public.resumes for insert with check (auth.uid() = user_id);
drop policy if exists "resumes_update_own" on public.resumes;
create policy "resumes_update_own" on public.resumes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "resumes_delete_own" on public.resumes;
create policy "resumes_delete_own" on public.resumes for delete using (auth.uid() = user_id);

-- resume_files metadata
drop policy if exists "resume_files_select_own" on public.resume_files;
create policy "resume_files_select_own" on public.resume_files for select using (auth.uid() = user_id);
drop policy if exists "resume_files_insert_own" on public.resume_files;
create policy "resume_files_insert_own" on public.resume_files for insert with check (auth.uid() = user_id);
drop policy if exists "resume_files_update_own" on public.resume_files;
create policy "resume_files_update_own" on public.resume_files for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "resume_files_delete_own" on public.resume_files;
create policy "resume_files_delete_own" on public.resume_files for delete using (auth.uid() = user_id);

-- user_api_keys
drop policy if exists "user_api_keys_select_own" on public.user_api_keys;
create policy "user_api_keys_select_own" on public.user_api_keys for select using (auth.uid() = user_id);
drop policy if exists "user_api_keys_insert_own" on public.user_api_keys;
create policy "user_api_keys_insert_own" on public.user_api_keys for insert with check (auth.uid() = user_id);
drop policy if exists "user_api_keys_update_own" on public.user_api_keys;
create policy "user_api_keys_update_own" on public.user_api_keys for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "user_api_keys_delete_own" on public.user_api_keys;
create policy "user_api_keys_delete_own" on public.user_api_keys for delete using (auth.uid() = user_id);

-- interviews
drop policy if exists "interviews_select_own" on public.interviews;
create policy "interviews_select_own" on public.interviews for select using (auth.uid() = user_id);
drop policy if exists "interviews_insert_own" on public.interviews;
create policy "interviews_insert_own" on public.interviews for insert with check (auth.uid() = user_id);
drop policy if exists "interviews_update_own" on public.interviews;
create policy "interviews_update_own" on public.interviews for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "interviews_delete_own" on public.interviews;
create policy "interviews_delete_own" on public.interviews for delete using (auth.uid() = user_id);

-- Explicit Data API privileges for new Supabase projects.
-- anon remains blocked; authenticated users are still restricted by RLS.
revoke all on table public.applications from anon, authenticated;
revoke all on table public.companies from anon, authenticated;
revoke all on table public.referral_codes from anon, authenticated;
revoke all on table public.resumes from anon, authenticated;
revoke all on table public.resume_files from anon, authenticated;
revoke all on table public.user_api_keys from anon, authenticated;
revoke all on table public.interviews from anon, authenticated;
grant select, insert, update, delete on table public.applications to authenticated;
grant select, insert, update, delete on table public.companies to authenticated;
grant select, insert, update, delete on table public.referral_codes to authenticated;
grant select, insert, update, delete on table public.resumes to authenticated;
grant select, insert, update, delete on table public.resume_files to authenticated;
grant select, insert, update, delete on table public.user_api_keys to authenticated;
grant select, insert, update, delete on table public.interviews to authenticated;

-- Private storage bucket for uploaded resumes and interview scripts.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  false,
  10485760,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "resumes_storage_select_own" on storage.objects;
create policy "resumes_storage_select_own" on storage.objects
  for select using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "resumes_storage_insert_own" on storage.objects;
create policy "resumes_storage_insert_own" on storage.objects
  for insert with check (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "resumes_storage_update_own" on storage.objects;
create policy "resumes_storage_update_own" on storage.objects
  for update using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "resumes_storage_delete_own" on storage.objects;
create policy "resumes_storage_delete_own" on storage.objects
  for delete using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);
