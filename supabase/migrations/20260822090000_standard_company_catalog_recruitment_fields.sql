-- Preserve the recruitment fields needed by the Hot Companies page when
-- the shared standard company table already exists in production.
alter table if exists public.standard_companies
  add column if not exists company_type text not null default '',
  add column if not exists deadline_text text not null default '',
  add column if not exists notice_url text not null default '',
  add column if not exists apply_url text not null default '';

alter table if exists public.standard_companies
  drop constraint if exists standard_companies_notice_url_http,
  drop constraint if exists standard_companies_apply_url_http;

alter table if exists public.standard_companies
  add constraint standard_companies_notice_url_http
    check (notice_url = '' or notice_url ~* '^https?://'),
  add constraint standard_companies_apply_url_http
    check (apply_url = '' or apply_url ~* '^https?://');
