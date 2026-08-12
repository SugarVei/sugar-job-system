-- Cover job-assist foreign keys that are used by ownership checks and joins.
create index if not exists job_assist_campaigns_resume_file_idx
  on public.job_assist_campaigns(resume_file_id);

create index if not exists job_assist_interview_sessions_campaign_idx
  on public.job_assist_interview_sessions(campaign_id);

create index if not exists job_assist_interview_sessions_jd_match_idx
  on public.job_assist_interview_sessions(jd_match_id);

create index if not exists job_assist_interview_sessions_application_idx
  on public.job_assist_interview_sessions(application_id);

create index if not exists job_assist_interview_questions_user_idx
  on public.job_assist_interview_questions(user_id);
