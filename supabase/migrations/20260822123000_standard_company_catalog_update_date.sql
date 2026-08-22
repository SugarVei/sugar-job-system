alter table public.standard_companies
  add column if not exists source_update_date date;
