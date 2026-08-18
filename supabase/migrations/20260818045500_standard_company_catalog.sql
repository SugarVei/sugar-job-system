-- Shared standard-company catalogue overlay.
-- Seed companies stay in the deployed client data; imported Excel rows
-- add new companies or fill/update name-matched fields.

create table if not exists public.standard_companies (
  company_key text primary key,
  company_name text not null,
  industry text not null default '其他',
  city text not null default '',
  url text not null default '',
  group_name text not null default '飞书导入',
  source text not null default 'excel_import',
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint standard_companies_name_len check (char_length(company_name) between 1 and 80),
  constraint standard_companies_url_http check (url = '' or url ~* '^https?://')
);

create table if not exists public.standard_company_import_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  added_count int not null default 0,
  updated_count int not null default 0,
  unchanged_count int not null default 0,
  skipped_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists standard_companies_updated_idx
  on public.standard_companies (updated_at desc);
create index if not exists standard_company_import_runs_created_idx
  on public.standard_company_import_runs (created_at desc);

alter table public.standard_companies enable row level security;
alter table public.standard_company_import_runs enable row level security;

drop policy if exists "standard_companies_select_public" on public.standard_companies;
create policy "standard_companies_select_public" on public.standard_companies
  for select to anon, authenticated using (true);

drop policy if exists "standard_company_import_runs_select_own" on public.standard_company_import_runs;
create policy "standard_company_import_runs_select_own" on public.standard_company_import_runs
  for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.standard_companies from anon, authenticated;
revoke all on public.standard_company_import_runs from anon, authenticated;
grant select on public.standard_companies to anon, authenticated;
grant select on public.standard_company_import_runs to authenticated;
