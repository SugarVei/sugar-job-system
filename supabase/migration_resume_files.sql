-- ============================================================
-- 迁移：简历附件上传 + 投递关联简历
-- 在 Supabase 控制台 → SQL Editor 粘贴并 Run（在已跑过 schema.sql 之后）。
-- 内容：
--   1) applications 增加 resume_id（关联简历版本，用于“关联投递”计数）
--   2) 新建 resume_files 表（记录每个文件，含 RLS）
--   3) 创建私有 Storage 桶 resumes + 存储对象的 RLS（按 用户ID/ 前缀隔离）
-- ============================================================

-- 1) 投递记录关联简历版本
alter table public.applications
  add column if not exists resume_id uuid references public.resumes (id) on delete set null;

-- 2) 简历附件表
create table if not exists public.resume_files (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  resume_id  uuid not null references public.resumes (id) on delete cascade,
  file_name  text not null,
  file_path  text not null,                       -- Storage 对象路径
  kind       text not null default 'resume',      -- 'resume' 简历本体 | 'script' 面试稿件
  size       bigint,
  created_at timestamptz not null default now()
);
create index if not exists resume_files_user_id_idx on public.resume_files (user_id);
create index if not exists resume_files_resume_id_idx on public.resume_files (resume_id);

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

-- 3) 私有存储桶（10MB 单文件上限，允许常见简历/文档类型）
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

-- 存储对象 RLS：对象路径形如  {user_id}/{resume_id}/{文件}
-- 仅允许操作第一段等于自己 uid 的对象
drop policy if exists "resumes_obj_select_own" on storage.objects;
create policy "resumes_obj_select_own" on storage.objects
  for select using (
    bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "resumes_obj_insert_own" on storage.objects;
create policy "resumes_obj_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "resumes_obj_update_own" on storage.objects;
create policy "resumes_obj_update_own" on storage.objects
  for update using (
    bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "resumes_obj_delete_own" on storage.objects;
create policy "resumes_obj_delete_own" on storage.objects
  for delete using (
    bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text
  );
