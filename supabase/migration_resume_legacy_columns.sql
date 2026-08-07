-- One-time repair for older resume schemas.
-- Run in Supabase SQL Editor. It keeps the legacy columns for old clients,
-- but makes them optional so current clients can write canonical fields only.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'resumes' and column_name = 'version_name'
  ) then
    execute 'alter table public.resumes alter column version_name drop not null';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'resumes' and column_name = 'target_role'
  ) then
    execute 'alter table public.resumes alter column target_role drop not null';
  end if;
end;
$$;
