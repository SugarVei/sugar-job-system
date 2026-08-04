-- Link every application to exactly one normalized company record.
-- Existing applications are backfilled; existing company profile fields are preserved.

begin;

create or replace function public.normalize_company_name(input_name text)
returns text
language sql
immutable
parallel safe
security invoker
set search_path = ''
as $$
  select lower(
    regexp_replace(
      regexp_replace(btrim(coalesce(input_name, '')), '\s+', '', 'g'),
      '(股份有限责任公司|有限责任公司|股份有限公司|集团有限公司|集团公司|有限公司|公司)$',
      '',
      'g'
    )
  );
$$;

update public.companies
set company_name = btrim(company_name)
where company_name is distinct from btrim(company_name);

create unique index if not exists companies_user_normalized_name_uidx
  on public.companies (user_id, public.normalize_company_name(company_name));

alter table public.applications
  add column if not exists company_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.applications'::regclass
      and conname = 'applications_company_id_fkey'
  ) then
    alter table public.applications
      add constraint applications_company_id_fkey
      foreign key (company_id) references public.companies(id) on delete restrict;
  end if;
end;
$$;

create index if not exists applications_company_id_idx
  on public.applications(company_id);

create or replace function public.link_application_to_company()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  linked_company_id uuid;
begin
  new.company_name := btrim(new.company_name);
  if new.company_name = '' then
    raise exception 'company_name must not be empty';
  end if;

  insert into public.companies (user_id, company_name, city)
  values (new.user_id, new.company_name, nullif(btrim(new.city), ''))
  on conflict (user_id, public.normalize_company_name(company_name))
  do update set
    city = coalesce(nullif(public.companies.city, ''), excluded.city)
  returning id into linked_company_id;

  new.company_id := linked_company_id;
  return new;
end;
$$;

drop trigger if exists trg_link_application_company on public.applications;
create trigger trg_link_application_company
before insert or update of company_name, user_id, city on public.applications
for each row execute function public.link_application_to_company();

create or replace function public.sync_company_name_to_applications()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.company_name := btrim(new.company_name);
  if new.company_name = '' then
    raise exception 'company_name must not be empty';
  end if;

  update public.applications
  set company_name = new.company_name
  where company_id = new.id
    and company_name is distinct from new.company_name;

  return new;
end;
$$;

drop trigger if exists trg_sync_company_name_to_applications on public.companies;
create trigger trg_sync_company_name_to_applications
after update of company_name on public.companies
for each row execute function public.sync_company_name_to_applications();

-- Fire the linking trigger for every historical application.
update public.applications
set company_name = btrim(company_name);

commit;
