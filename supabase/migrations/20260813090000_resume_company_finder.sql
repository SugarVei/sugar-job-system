-- Private resume-to-company recommendation feature.
-- The public standard company catalogue remains in the deployed client data;
-- only a user's uploads, preferences and recommendations are stored here.

create table if not exists public.company_recommendation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_file_name text not null,
  resume_file_path text not null,
  preferences text[] not null default '{}'::text[],
  created_at timestamptz not null default now()
);

create index if not exists company_recommendation_runs_user_created_idx
  on public.company_recommendation_runs (user_id, created_at desc);

create table if not exists public.company_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid references public.company_recommendation_runs(id) on delete set null,
  source text not null check (source in ('resume', 'ai_search')),
  recommendation_type text not null check (recommendation_type in ('standard', 'private')),
  company_name text not null,
  industry text,
  city text,
  company_type text,
  website text,
  match_score smallint check (match_score is null or match_score between 0 and 100),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists company_recommendations_user_created_idx
  on public.company_recommendations (user_id, created_at desc);
create index if not exists company_recommendations_user_type_idx
  on public.company_recommendations (user_id, recommendation_type);

alter table public.company_recommendation_runs enable row level security;
alter table public.company_recommendations enable row level security;

drop policy if exists "company_recommendation_runs_select_own" on public.company_recommendation_runs;
create policy "company_recommendation_runs_select_own" on public.company_recommendation_runs
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "company_recommendation_runs_insert_own" on public.company_recommendation_runs;
create policy "company_recommendation_runs_insert_own" on public.company_recommendation_runs
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "company_recommendation_runs_delete_own" on public.company_recommendation_runs;
create policy "company_recommendation_runs_delete_own" on public.company_recommendation_runs
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "company_recommendations_select_own" on public.company_recommendations;
create policy "company_recommendations_select_own" on public.company_recommendations
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "company_recommendations_insert_own" on public.company_recommendations;
create policy "company_recommendations_insert_own" on public.company_recommendations
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "company_recommendations_delete_own" on public.company_recommendations;
create policy "company_recommendations_delete_own" on public.company_recommendations
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.company_recommendation_runs from anon, authenticated;
revoke all on public.company_recommendations from anon, authenticated;
grant select, insert, delete on public.company_recommendation_runs to authenticated;
grant select, insert, delete on public.company_recommendations to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-resumes',
  'company-resumes',
  false,
  10485760,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "company_resumes_select_own" on storage.objects;
create policy "company_resumes_select_own" on storage.objects
  for select to authenticated using (
    bucket_id = 'company-resumes'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
drop policy if exists "company_resumes_insert_own" on storage.objects;
create policy "company_resumes_insert_own" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'company-resumes'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and storage.extension(name) in ('pdf', 'docx')
  );
drop policy if exists "company_resumes_delete_own" on storage.objects;
create policy "company_resumes_delete_own" on storage.objects
  for delete to authenticated using (
    bucket_id = 'company-resumes'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
