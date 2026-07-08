-- ============================================================
-- Application status upgrade and P0 job-search workflow fields.
-- Run after supabase/schema.sql for existing databases.
-- ============================================================

alter table public.applications
  add column if not exists jd_text text,
  add column if not exists jd_keywords text[],
  add column if not exists match_score int,
  add column if not exists match_summary text,
  add column if not exists next_action text,
  add column if not exists next_action_at timestamptz,
  add column if not exists deadline_at timestamptz,
  add column if not exists priority text not null default 'normal';

alter table public.applications
  drop constraint if exists applications_match_score_check;

alter table public.applications
  add constraint applications_match_score_check
  check (match_score is null or (match_score >= 0 and match_score <= 100));

alter table public.applications
  drop constraint if exists applications_priority_check;

alter table public.applications
  add constraint applications_priority_check
  check (priority in ('low', 'normal', 'high', 'urgent'));

alter table public.applications
  alter column status set default '待投递';

update public.applications
set status = '一面'
where status = '面试';

update public.applications
set status = '已拒绝'
where status = '拒绝';
