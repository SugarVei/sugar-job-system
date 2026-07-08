-- ============================================================
-- Allow AI-generated interview scripts to be stored in resume_files.
-- Run after supabase/migration_resume_files.sql for existing databases.
-- ============================================================

alter table public.resume_files
  alter column file_path drop not null;

alter table public.resume_files
  add column if not exists content text,
  add column if not exists source text not null default 'upload';

alter table public.resume_files
  drop constraint if exists resume_files_source_check;

alter table public.resume_files
  add constraint resume_files_source_check
  check (source in ('upload', 'ai'));
