-- Phase 1 foundation repair. Idempotent and non-destructive.
-- Run this migration against an existing Sugar database in Supabase SQL Editor.

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

-- Canonical resume columns. Legacy columns remain in place for compatibility.
alter table public.resumes
  add column if not exists resume_name text,
  add column if not exists target_position text,
  add column if not exists file_url text,
  add column if not exists notes text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'resumes' and column_name = 'version_name'
  ) then
    execute 'update public.resumes set resume_name = version_name where resume_name is null and version_name is not null';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'resumes' and column_name = 'target_role'
  ) then
    execute 'update public.resumes set target_position = target_role where target_position is null and target_role is not null';
  end if;
end;
$$;

update public.resumes
set resume_name = '未命名简历'
where resume_name is null or btrim(resume_name) = '';

alter table public.resumes
  alter column resume_name set not null;

-- P0 application workflow fields.
alter table public.applications
  add column if not exists jd_text text,
  add column if not exists jd_keywords text[],
  add column if not exists match_score int,
  add column if not exists match_summary text,
  add column if not exists next_action text,
  add column if not exists next_action_at timestamptz,
  add column if not exists deadline_at timestamptz,
  add column if not exists priority text default 'normal',
  add column if not exists resume_id uuid references public.resumes(id) on delete set null;

update public.applications
set status = case trim(status)
  when '未投递' then '待投递'
  when '准备投递' then '待投递'
  when '投递' then '已投递'
  when '面试' then '一面'
  when 'HR 面' then 'HR面'
  when '拒绝' then '已拒绝'
  when '放弃' then '已放弃'
  when '跟进' then '待跟进'
  else status
end;

-- Preserve unknown production values without blocking the migration.
update public.applications
set status = '待跟进',
    notes = concat_ws(E'\n', notes, '[系统迁移] 原状态：' || coalesce(status, '<空>'))
where status is null or status not in (
  '待投递', '已投递', '简历筛选', '笔试', '一面', '二面', 'HR面',
  'Offer', '已拒绝', '已放弃', '人才库', '待跟进'
);

update public.applications set priority = 'normal'
where priority is null or priority not in ('low', 'normal', 'high', 'urgent');

update public.applications set match_score = greatest(0, least(100, match_score))
where match_score is not null and (match_score < 0 or match_score > 100);

alter table public.applications
  alter column status set default '待投递',
  alter column status set not null,
  alter column priority set default 'normal',
  alter column priority set not null,
  drop constraint if exists applications_status_check,
  drop constraint if exists applications_priority_check,
  drop constraint if exists applications_match_score_check;

alter table public.applications
  add constraint applications_status_check check (status in (
    '待投递', '已投递', '简历筛选', '笔试', '一面', '二面', 'HR面',
    'Offer', '已拒绝', '已放弃', '人才库', '待跟进'
  )),
  add constraint applications_priority_check check (priority in ('low', 'normal', 'high', 'urgent')),
  add constraint applications_match_score_check check (match_score is null or match_score between 0 and 100);

-- AI-generated drafts may not have a physical Storage object.
alter table public.resume_files
  add column if not exists file_path text,
  add column if not exists kind text default 'resume',
  add column if not exists content text,
  add column if not exists source text default 'upload';

update public.resume_files set kind = 'resume' where kind is null or kind not in ('resume', 'script');
update public.resume_files set source = 'upload' where source is null or source not in ('upload', 'ai');

alter table public.resume_files
  alter column file_path drop not null,
  alter column kind set default 'resume',
  alter column kind set not null,
  alter column source set default 'upload',
  alter column source set not null,
  drop constraint if exists resume_files_kind_check,
  drop constraint if exists resume_files_source_check;

alter table public.resume_files
  add constraint resume_files_kind_check check (kind in ('resume', 'script')),
  add constraint resume_files_source_check check (source in ('upload', 'ai'));

create index if not exists applications_user_id_idx on public.applications(user_id);
create index if not exists applications_resume_id_idx on public.applications(resume_id);
create index if not exists applications_status_idx on public.applications(status);
create index if not exists applications_deadline_at_idx on public.applications(deadline_at);
create index if not exists applications_next_action_at_idx on public.applications(next_action_at);
create index if not exists companies_user_id_idx on public.companies(user_id);
create index if not exists resumes_user_id_idx on public.resumes(user_id);
create index if not exists resume_files_user_id_idx on public.resume_files(user_id);
create index if not exists resume_files_resume_id_idx on public.resume_files(resume_id);
create index if not exists interviews_user_id_idx on public.interviews(user_id);
create index if not exists user_api_keys_user_id_idx on public.user_api_keys(user_id);

alter table public.applications enable row level security;
alter table public.companies enable row level security;
alter table public.resumes enable row level security;
alter table public.resume_files enable row level security;
alter table public.user_api_keys enable row level security;
alter table public.interviews enable row level security;

-- Replace known policies with one consistent, planner-friendly policy set.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['applications', 'companies', 'resumes', 'resume_files', 'user_api_keys', 'interviews']
  loop
    execute format('drop policy if exists %I on public.%I', table_name || '_select_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_insert_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_update_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_delete_own', table_name);
    execute format('create policy %I on public.%I for select using ((select auth.uid()) = user_id)', table_name || '_select_own', table_name);
    execute format('create policy %I on public.%I for insert with check ((select auth.uid()) = user_id)', table_name || '_insert_own', table_name);
    execute format('create policy %I on public.%I for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name || '_update_own', table_name);
    execute format('create policy %I on public.%I for delete using ((select auth.uid()) = user_id)', table_name || '_delete_own', table_name);
  end loop;
end;
$$;

-- Explicit Data API privileges for Supabase projects where public tables are
-- not exposed automatically. anon remains blocked; RLS still restricts rows.
revoke all on table public.applications from anon, authenticated;
revoke all on table public.companies from anon, authenticated;
revoke all on table public.resumes from anon, authenticated;
revoke all on table public.resume_files from anon, authenticated;
revoke all on table public.user_api_keys from anon, authenticated;
revoke all on table public.interviews from anon, authenticated;
grant select, insert, update, delete on table public.applications to authenticated;
grant select, insert, update, delete on table public.companies to authenticated;
grant select, insert, update, delete on table public.resumes to authenticated;
grant select, insert, update, delete on table public.resume_files to authenticated;
grant select, insert, update, delete on table public.user_api_keys to authenticated;
grant select, insert, update, delete on table public.interviews to authenticated;

-- Keep the unexpected legacy table, but deny access by default if it exists.
do $$
begin
  if to_regclass('public."简历信息"') is not null then
    execute 'alter table public."简历信息" enable row level security';
    execute 'drop policy if exists "legacy_resume_info_deny_all" on public."简历信息"';
    execute 'create policy "legacy_resume_info_deny_all" on public."简历信息" for all using (false) with check (false)';
    execute 'comment on table public."简历信息" is ''Legacy table not used by Sugar application code. Access denied by RLS; verify and archive manually before any future deletion.''';
  end if;
end;
$$;

-- Remove client roles from an obsolete SECURITY DEFINER helper when present.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from anon';
    execute 'revoke execute on function public.rls_auto_enable() from authenticated';
  end if;
end;
$$;

-- Private bucket; objects must live under <auth.uid()>/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes', 'resumes', false, 10485760,
  array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "resumes_storage_select_own" on storage.objects;
drop policy if exists "resumes_storage_insert_own" on storage.objects;
drop policy if exists "resumes_storage_update_own" on storage.objects;
drop policy if exists "resumes_storage_delete_own" on storage.objects;
drop policy if exists "resumes_obj_select_own" on storage.objects;
drop policy if exists "resumes_obj_insert_own" on storage.objects;
drop policy if exists "resumes_obj_update_own" on storage.objects;
drop policy if exists "resumes_obj_delete_own" on storage.objects;

create policy "resumes_storage_select_own" on storage.objects
  for select using (bucket_id = 'resumes' and (select auth.uid())::text = (storage.foldername(name))[1]);
create policy "resumes_storage_insert_own" on storage.objects
  for insert with check (bucket_id = 'resumes' and (select auth.uid())::text = (storage.foldername(name))[1]);
create policy "resumes_storage_update_own" on storage.objects
  for update using (bucket_id = 'resumes' and (select auth.uid())::text = (storage.foldername(name))[1])
  with check (bucket_id = 'resumes' and (select auth.uid())::text = (storage.foldername(name))[1]);
create policy "resumes_storage_delete_own" on storage.objects
  for delete using (bucket_id = 'resumes' and (select auth.uid())::text = (storage.foldername(name))[1]);
