-- ============================================================
-- Migration: resume uploads and application-resume linking
-- Run this in Supabase SQL Editor after the base schema has been created.
--
-- Includes:
-- 1) Add applications.resume_id for linking a submitted application to a resume.
-- 2) Create public.resume_files for uploaded resume/interview-script metadata.
-- 3) Create the private Storage bucket "resumes" and per-user Storage policies.
-- ============================================================

alter table public.applications
  add column if not exists resume_id uuid references public.resumes (id) on delete set null;

create index if not exists applications_resume_id_idx on public.applications (resume_id);

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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'text/plain'
  ]
)
on conflict (id) do nothing;

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
  )
  with check (
    bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "resumes_obj_delete_own" on storage.objects;
create policy "resumes_obj_delete_own" on storage.objects
  for delete using (
    bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text
  );
