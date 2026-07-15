-- Sugar phase 2 career modules. Safe to re-run; no destructive table/column operations.
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = public
as $$ begin new.updated_at = now(); return new; end; $$;

alter table public.applications add column if not exists jd_text text;
alter table public.applications add column if not exists jd_keywords text[];
alter table public.applications add column if not exists match_score integer check (match_score between 0 and 100);
alter table public.applications add column if not exists match_summary text;
alter table public.applications add column if not exists next_action text;
alter table public.applications add column if not exists next_action_at timestamptz;
alter table public.applications add column if not exists deadline_at timestamptz;
alter table public.applications add column if not exists priority text default 'normal';
alter table public.applications add column if not exists resume_id uuid references public.resumes(id) on delete set null;

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null, company_name text not null,
  position_name text not null, city text, department text, manager_or_contact text, workplace text, work_schedule text,
  join_date date, reply_deadline timestamptz, offer_status text not null default '待考虑'
    check (offer_status in ('待考虑','谈薪中','已接受','已拒绝','已过期')),
  base_salary numeric, salary_months numeric, bonus numeric, subsidy numeric, annual_package numeric,
  social_security text, housing_fund text, stock_or_options text, probation_months numeric, probation_ratio numeric,
  overtime_policy text, salary_score int check (salary_score between 0 and 100),
  match_score int check (match_score between 0 and 100), growth_score int check (growth_score between 0 and 100),
  stability_score int check (stability_score between 0 and 100), city_score int check (city_score between 0 and 100),
  workload_score int check (workload_score between 0 and 100), total_score numeric, hr_offer text, expect text,
  negotiation_notes text, next_action text, next_action_at timestamptz, is_big_week boolean not null default false,
  is_overtime boolean not null default false, is_remote boolean not null default false,
  probation_cut boolean not null default false, has_penalty boolean not null default false, risk_notes text,
  decision_notes text, final_decision text, notes text, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.interview_reviews (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  interview_id uuid references public.interviews(id) on delete set null, company_name text not null, position_name text,
  round text check (round is null or round in ('一面','二面','技术面','主管面','HR面')), interviewer_role text,
  interview_time timestamptz, interview_form text check (interview_form is null or interview_form in ('电话','视频','现场')),
  result text not null default '待通知' check (result in ('通过','未通过','待通知','主动放弃')),
  reviewed boolean not null default false, mistake_tags text[], performance_score int check (performance_score between 0 and 100),
  clarity_score int check (clarity_score between 0 and 100), matching_score int check (matching_score between 0 and 100),
  storytelling_score int check (storytelling_score between 0 and 100), logic_score int check (logic_score between 0 and 100),
  confidence_score int check (confidence_score between 0 and 100),
  question_quality_score int check (question_quality_score between 0 and 100), star_s text, star_t text, star_a text,
  star_r text, star_resume_ref text, good_points text, weak_points text, improve_knowledge text, improve_answers text,
  improve_prep text, improvement_plan text, next_action text, next_action_at timestamptz, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.interview_review_questions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  review_id uuid not null references public.interview_reviews(id) on delete cascade, question_text text not null,
  question_type text check (question_type is null or question_type in ('自我介绍','项目经历','实习经历','专业问题','行为面试','HR问题','反问','其他')),
  my_answer text, better_answer text, answer_score int check (answer_score between 0 and 100), problem text,
  issue_tags text[], add_to_question_bank boolean not null default false, mastery_status text not null default '需练习'
    check (mastery_status in ('需练习','已掌握','高频题')), star_situation text, star_task text, star_action text,
  star_result text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.jd_matches (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  resume_id uuid references public.resumes(id) on delete set null, company_name text, position_name text, city text,
  salary_range text, jd_text text not null, job_url text, channel text, jd_duties text[], jd_requirements text[],
  skill_keywords text[], industry_keywords text[], exp_required text, edu_required text, hidden_requirements text[],
  match_score int check (match_score between 0 and 100),
  match_level text check (match_level is null or match_level in ('高匹配','中匹配','低匹配')),
  recommend_action text check (recommend_action is null or recommend_action in ('建议投递','建议修改后投递','不建议优先投递')),
  matched_keywords text[], missing_keywords text[], strong_exp text[], weak_exp text[], risk_note text,
  suggestions jsonb, interview_prep jsonb, analysis_summary text, analysis_method text not null default '基础规则分析',
  applied boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.evidence_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  evidence_type text not null default '其他'
    check (evidence_type in ('JD','Offer','HR沟通','面试反馈','薪资福利','公司信息','其他')),
  related_type text not null default 'none'
    check (related_type in ('application','offer','interview','company','resume','none')),
  related_id uuid,
  company_name text,
  position_name text,
  source text,
  evidence_date date,
  content text,
  file_url text,
  tags text[],
  credibility_score int check (credibility_score is null or (credibility_score between 0 and 100)),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists offers_user_id_idx on public.offers(user_id);
create index if not exists offers_application_id_idx on public.offers(application_id);
create index if not exists offers_status_idx on public.offers(offer_status);
create index if not exists offers_deadline_idx on public.offers(reply_deadline);
create index if not exists offers_annual_idx on public.offers(annual_package);
create index if not exists offers_score_idx on public.offers(total_score);
create index if not exists interview_reviews_user_idx on public.interview_reviews(user_id);
create index if not exists interview_reviews_application_idx on public.interview_reviews(application_id);
create index if not exists interview_reviews_interview_idx on public.interview_reviews(interview_id);
create index if not exists interview_reviews_time_idx on public.interview_reviews(interview_time);
create index if not exists interview_reviews_result_idx on public.interview_reviews(result);
create index if not exists interview_reviews_reviewed_idx on public.interview_reviews(reviewed);
create index if not exists review_questions_user_idx on public.interview_review_questions(user_id);
create index if not exists review_questions_review_idx on public.interview_review_questions(review_id);
create index if not exists review_questions_type_idx on public.interview_review_questions(question_type);
create index if not exists review_questions_bank_idx on public.interview_review_questions(add_to_question_bank);
create index if not exists review_questions_mastery_idx on public.interview_review_questions(mastery_status);
create index if not exists jd_matches_user_idx on public.jd_matches(user_id);
create index if not exists jd_matches_resume_idx on public.jd_matches(resume_id);
create index if not exists jd_matches_application_idx on public.jd_matches(application_id);
create index if not exists jd_matches_score_idx on public.jd_matches(match_score);
create index if not exists jd_matches_created_idx on public.jd_matches(created_at);
create index if not exists jd_matches_applied_idx on public.jd_matches(applied);
create index if not exists evidence_items_user_idx on public.evidence_items(user_id);
create index if not exists evidence_items_type_idx on public.evidence_items(evidence_type);
create index if not exists evidence_items_related_idx on public.evidence_items(related_type, related_id);
create index if not exists evidence_items_company_idx on public.evidence_items(company_name);
create index if not exists evidence_items_date_idx on public.evidence_items(evidence_date);

alter table public.offers enable row level security;
alter table public.interview_reviews enable row level security;
alter table public.interview_review_questions enable row level security;
alter table public.jd_matches enable row level security;
alter table public.evidence_items enable row level security;

do $$ declare t text; op text; begin
  foreach t in array array['offers','interview_reviews','interview_review_questions','jd_matches','evidence_items'] loop
    foreach op in array array['select','insert','update','delete'] loop
      execute format('drop policy if exists %I on public.%I', t || '_' || op || '_own', t);
      if op = 'insert' then
        execute format('create policy %I on public.%I for insert with check ((select auth.uid()) = user_id)', t || '_' || op || '_own', t);
      elsif op = 'update' then
        execute format('create policy %I on public.%I for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t || '_' || op || '_own', t);
      else
        execute format('create policy %I on public.%I for %s using ((select auth.uid()) = user_id)', t || '_' || op || '_own', t, op);
      end if;
    end loop;
  end loop;
end $$;

-- Supabase projects created after 2026-04-28 may not expose new public tables
-- to the Data API automatically. Keep anon blocked and allow signed-in users;
-- RLS policies above still enforce per-user row access.
revoke all on table public.offers from anon, authenticated;
revoke all on table public.interview_reviews from anon, authenticated;
revoke all on table public.interview_review_questions from anon, authenticated;
revoke all on table public.jd_matches from anon, authenticated;
revoke all on table public.evidence_items from anon, authenticated;
grant select, insert, update, delete on table public.offers to authenticated;
grant select, insert, update, delete on table public.interview_reviews to authenticated;
grant select, insert, update, delete on table public.interview_review_questions to authenticated;
grant select, insert, update, delete on table public.jd_matches to authenticated;
grant select, insert, update, delete on table public.evidence_items to authenticated;

drop trigger if exists offers_set_updated_at on public.offers;
create trigger offers_set_updated_at before update on public.offers for each row execute function public.set_updated_at();
drop trigger if exists interview_reviews_set_updated_at on public.interview_reviews;
create trigger interview_reviews_set_updated_at before update on public.interview_reviews for each row execute function public.set_updated_at();
drop trigger if exists review_questions_set_updated_at on public.interview_review_questions;
create trigger review_questions_set_updated_at before update on public.interview_review_questions for each row execute function public.set_updated_at();
drop trigger if exists jd_matches_set_updated_at on public.jd_matches;
create trigger jd_matches_set_updated_at before update on public.jd_matches for each row execute function public.set_updated_at();
drop trigger if exists evidence_items_set_updated_at on public.evidence_items;
create trigger evidence_items_set_updated_at before update on public.evidence_items for each row execute function public.set_updated_at();
