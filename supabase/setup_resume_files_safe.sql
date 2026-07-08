-- ============================================================
-- 一键修复：简历文件表 + 投递关联 + 存储桶 + RLS
-- 完全幂等：可重复执行，不会因为"已存在"而报错。
-- 在 Supabase 控制台 → SQL Editor 粘贴 → Run。
-- ============================================================

create extension if not exists "pgcrypto";

-- 前置依赖：简历库表（resume_files 的外键指向它）。
-- 若已存在则跳过，保证本脚本可独立运行而不报 "relation resumes does not exist"。
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

-- 1) 投递记录关联简历
alter table public.applications
  add column if not exists resume_id uuid references public.resumes (id) on delete set null;
create index if not exists applications_resume_id_idx on public.applications (resume_id);

-- 2) 简历 / 面试稿件 文件表
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

-- 兼容老库：若 resume_files 之前以缺列的形式建过，这里补齐
alter table public.resume_files add column if not exists file_name text;
alter table public.resume_files add column if not exists file_path text;
alter table public.resume_files add column if not exists kind      text default 'resume';
alter table public.resume_files add column if not exists size      bigint;

-- 3) RLS：每个用户只能读写自己的行
alter table public.resume_files enable row level security;

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

-- 4) 私有存储桶
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes', 'resumes', false, 10485760,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 5) 存储桶 RLS：路径第一段必须是当前用户 id
drop policy if exists "resumes_obj_select_own" on storage.objects;
create policy "resumes_obj_select_own" on storage.objects
  for select using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "resumes_obj_insert_own" on storage.objects;
create policy "resumes_obj_insert_own" on storage.objects
  for insert with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "resumes_obj_update_own" on storage.objects;
create policy "resumes_obj_update_own" on storage.objects
  for update using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "resumes_obj_delete_own" on storage.objects;
create policy "resumes_obj_delete_own" on storage.objects
  for delete using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- 验证：执行完后单独跑这段，应返回 1 行且各列都是 true / 数字
-- ============================================================
-- select
--   to_regclass('public.resume_files')                                   is not null as has_resume_files,
--   exists(select 1 from information_schema.columns
--          where table_name='applications' and column_name='resume_id')  as has_resume_id_col,
--   exists(select 1 from storage.buckets where id='resumes')             as has_bucket,
--   (select count(*) from pg_policies where tablename='resume_files')    as resume_files_policies;
