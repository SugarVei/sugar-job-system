create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create table if not exists public.campus_recruitment_statuses (
  company_key text primary key,
  company_name text not null,
  official_url text not null,
  status text not null default 'pending'
    check (status in ('pending', 'not_started', 'started', 'error')),
  evidence_text text,
  evidence_url text,
  last_checked_at timestamptz,
  next_check_at timestamptz default now(),
  started_at timestamptz,
  error_message text,
  check_count integer not null default 0 check (check_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campus_recruitment_due_idx
  on public.campus_recruitment_statuses (next_check_at)
  where status <> 'started';

alter table public.campus_recruitment_statuses enable row level security;

drop policy if exists "Authenticated users can read campus recruitment statuses"
  on public.campus_recruitment_statuses;
create policy "Authenticated users can read campus recruitment statuses"
  on public.campus_recruitment_statuses
  for select
  to authenticated
  using (true);

revoke all on public.campus_recruitment_statuses from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.campus_recruitment_statuses from authenticated;
grant select on public.campus_recruitment_statuses to authenticated;

comment on table public.campus_recruitment_statuses is
  'Shared 2027 campus recruitment status sourced from official company recruitment pages.';
