-- Save the selected application for an interview while keeping both rows in the same account.
create unique index if not exists applications_id_user_id_uidx
  on public.applications (id, user_id);

alter table public.interviews
  add column if not exists application_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'interviews_application_owner_fk'
      and conrelid = 'public.interviews'::regclass
  ) then
    alter table public.interviews
      add constraint interviews_application_owner_fk
      foreign key (application_id, user_id)
      references public.applications (id, user_id)
      on delete set null (application_id);
  end if;
end $$;

create index if not exists interviews_application_id_idx
  on public.interviews (application_id);
