-- Sugar 求职辅助 MVP。
-- 仅增加表和字段；不删除、不重写现有简历、投递、面试稿件或 JD 数据。

create table if not exists public.job_assist_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_id uuid not null references public.resumes(id) on delete cascade,
  resume_file_id uuid references public.resume_files(id) on delete set null,
  route text not null check (route in ('campus', 'social')),
  profile jsonb not null default '{}'::jsonb,
  profile_confirmed boolean not null default false,
  confirmed_facts jsonb not null default '[]'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, resume_id)
);

-- 复用现有 JD 匹配表，补齐 job-copilot 的硬门槛、证据覆盖和三类缺口。
alter table public.jd_matches
  add column if not exists campaign_id uuid references public.job_assist_campaigns(id) on delete set null,
  add column if not exists eligible boolean,
  add column if not exists hard_requirements jsonb not null default '[]'::jsonb,
  add column if not exists score_breakdown jsonb not null default '{}'::jsonb,
  add column if not exists evidence jsonb not null default '[]'::jsonb,
  add column if not exists coverage integer check (coverage is null or coverage between 0 and 100),
  add column if not exists confidence text check (confidence is null or confidence in ('high', 'medium', 'low')),
  add column if not exists presentation_gaps jsonb not null default '[]'::jsonb,
  add column if not exists information_gaps jsonb not null default '[]'::jsonb,
  add column if not exists capability_gaps jsonb not null default '[]'::jsonb,
  add column if not exists next_steps jsonb not null default '[]'::jsonb,
  add column if not exists tailoring_suggestions jsonb not null default '[]'::jsonb,
  add column if not exists tailored_draft text;

create table if not exists public.job_assist_interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid not null references public.job_assist_campaigns(id) on delete cascade,
  resume_id uuid not null references public.resumes(id) on delete cascade,
  jd_match_id uuid references public.jd_matches(id) on delete set null,
  application_id uuid references public.applications(id) on delete set null,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  current_question integer not null default 1 check (current_question between 1 and 20),
  total_questions integer not null default 3 check (total_questions between 3 and 20),
  plan jsonb not null default '[]'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 明确不保存用户逐字回答或完整润色答案，只保存结构化评分和简短改进摘要。
create table if not exists public.job_assist_interview_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.job_assist_interview_sessions(id) on delete cascade,
  question_index integer not null check (question_index between 1 and 20),
  question_type text,
  question_text text not null,
  scores jsonb not null default '{}'::jsonb,
  total_score integer check (total_score is null or total_score between 0 and 100),
  issue_tags text[] not null default '{}',
  improvement_summary text,
  created_at timestamptz not null default now(),
  unique (session_id, question_index)
);

create index if not exists job_assist_campaigns_user_idx on public.job_assist_campaigns(user_id);
create index if not exists job_assist_campaigns_resume_idx on public.job_assist_campaigns(resume_id);
create index if not exists jd_matches_campaign_idx on public.jd_matches(campaign_id);
create index if not exists job_assist_interview_sessions_user_idx on public.job_assist_interview_sessions(user_id);
create index if not exists job_assist_interview_sessions_resume_idx on public.job_assist_interview_sessions(resume_id);
create index if not exists job_assist_interview_questions_session_idx on public.job_assist_interview_questions(session_id);

alter table public.job_assist_campaigns enable row level security;
alter table public.job_assist_interview_sessions enable row level security;
alter table public.job_assist_interview_questions enable row level security;

do $$
declare
  table_name text;
  operation text;
begin
  foreach table_name in array array[
    'job_assist_campaigns',
    'job_assist_interview_sessions',
    'job_assist_interview_questions'
  ] loop
    foreach operation in array array['select', 'insert', 'update', 'delete'] loop
      execute format('drop policy if exists %I on public.%I', table_name || '_' || operation || '_own', table_name);
      if operation = 'insert' then
        execute format(
          'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
          table_name || '_' || operation || '_own', table_name
        );
      elsif operation = 'update' then
        execute format(
          'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
          table_name || '_' || operation || '_own', table_name
        );
      else
        execute format(
          'create policy %I on public.%I for %s to authenticated using ((select auth.uid()) = user_id)',
          table_name || '_' || operation || '_own', table_name, operation
        );
      end if;
    end loop;
  end loop;
end $$;

-- 外键 ID 也必须属于当前账号，防止只靠 user_id 造成跨账号关联。
drop policy if exists job_assist_campaigns_relationships_own on public.job_assist_campaigns;
create policy job_assist_campaigns_relationships_own
  on public.job_assist_campaigns as restrictive for all to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (select 1 from public.resumes r where r.id = resume_id and r.user_id = (select auth.uid()))
  )
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.resumes r where r.id = resume_id and r.user_id = (select auth.uid()))
    and (resume_file_id is null or exists (
      select 1 from public.resume_files rf
      where rf.id = resume_file_id and rf.resume_id = resume_id and rf.user_id = (select auth.uid())
    ))
  );

drop policy if exists job_assist_interview_sessions_relationships_own on public.job_assist_interview_sessions;
create policy job_assist_interview_sessions_relationships_own
  on public.job_assist_interview_sessions as restrictive for all to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (select 1 from public.job_assist_campaigns c where c.id = campaign_id and c.user_id = (select auth.uid()))
  )
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.job_assist_campaigns c where c.id = campaign_id and c.resume_id = resume_id and c.user_id = (select auth.uid()))
    and (jd_match_id is null or exists (select 1 from public.jd_matches j where j.id = jd_match_id and j.user_id = (select auth.uid())))
    and (application_id is null or exists (select 1 from public.applications a where a.id = application_id and a.user_id = (select auth.uid())))
  );

drop policy if exists job_assist_interview_questions_relationships_own on public.job_assist_interview_questions;
create policy job_assist_interview_questions_relationships_own
  on public.job_assist_interview_questions as restrictive for all to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (select 1 from public.job_assist_interview_sessions s where s.id = session_id and s.user_id = (select auth.uid()))
  )
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.job_assist_interview_sessions s where s.id = session_id and s.user_id = (select auth.uid()))
  );

drop policy if exists jd_matches_job_assist_relationships_own on public.jd_matches;
create policy jd_matches_job_assist_relationships_own
  on public.jd_matches as restrictive for all to authenticated
  using (
    (select auth.uid()) = user_id
    and (resume_id is null or exists (select 1 from public.resumes r where r.id = resume_id and r.user_id = (select auth.uid())))
    and (campaign_id is null or exists (select 1 from public.job_assist_campaigns c where c.id = campaign_id and c.user_id = (select auth.uid())))
    and (application_id is null or exists (select 1 from public.applications a where a.id = application_id and a.user_id = (select auth.uid())))
  )
  with check (
    (select auth.uid()) = user_id
    and (resume_id is null or exists (select 1 from public.resumes r where r.id = resume_id and r.user_id = (select auth.uid())))
    and (campaign_id is null or exists (select 1 from public.job_assist_campaigns c where c.id = campaign_id and c.user_id = (select auth.uid())))
    and (application_id is null or exists (select 1 from public.applications a where a.id = application_id and a.user_id = (select auth.uid())))
  );

-- 2026-05 起新表可能不会自动暴露到 Data API；显式授权，RLS 仍负责账号隔离。
revoke all on table public.job_assist_campaigns from anon, authenticated;
revoke all on table public.job_assist_interview_sessions from anon, authenticated;
revoke all on table public.job_assist_interview_questions from anon, authenticated;
grant select, insert, update, delete on table public.job_assist_campaigns to authenticated;
grant select, insert, update, delete on table public.job_assist_interview_sessions to authenticated;
grant select, insert, update, delete on table public.job_assist_interview_questions to authenticated;

drop trigger if exists job_assist_campaigns_set_updated_at on public.job_assist_campaigns;
create trigger job_assist_campaigns_set_updated_at
  before update on public.job_assist_campaigns
  for each row execute function public.set_updated_at();

drop trigger if exists job_assist_interview_sessions_set_updated_at on public.job_assist_interview_sessions;
create trigger job_assist_interview_sessions_set_updated_at
  before update on public.job_assist_interview_sessions
  for each row execute function public.set_updated_at();
