-- Personal records remain owner-only. Sharing publishes only a safe projection.
alter table public.referral_codes
  add column if not exists visibility text not null default 'private'
  check (visibility in ('private', 'public'));

alter table public.shared_referral_codes
  add column if not exists owner_referral_id uuid unique
  references public.referral_codes(id) on delete cascade;
alter table public.shared_referral_codes alter column recruitment_year drop not null;

-- Trigger-only privilege elevation: clients cannot call this function or write
-- the shared catalog, and personal names, sources and notes are never copied.
create schema if not exists referral_internal;
revoke all on schema referral_internal from public, anon, authenticated;

create or replace function referral_internal.sync_shared_referral_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  record_owner uuid;
begin
  if TG_OP = 'DELETE' then
    record_owner := OLD.user_id;
  else
    record_owner := NEW.user_id;
  end if;
  if current_setting('role', true) in ('authenticated', 'anon')
    and (select auth.uid()) is distinct from record_owner then
    raise insufficient_privilege using message = 'Only the owner can change referral visibility';
  end if;

  if TG_OP = 'DELETE' then
    delete from public.shared_referral_codes where owner_referral_id = OLD.id;
    return OLD;
  end if;

  if NEW.visibility = 'public' then
    insert into public.shared_referral_codes
      (company_name, referral_code, referrer_name, recruitment_year, status, notes, owner_referral_id)
    values (NEW.company_name, NEW.referral_code, '保密', null, '待核实', null, NEW.id)
    on conflict (owner_referral_id) do update set
      company_name = excluded.company_name,
      referral_code = excluded.referral_code,
      referrer_name = '保密',
      recruitment_year = null,
      status = '待核实',
      notes = null,
      updated_at = now();
  else
    delete from public.shared_referral_codes where owner_referral_id = NEW.id;
  end if;
  return NEW;
end;
$$;

revoke execute on function referral_internal.sync_shared_referral_code() from public, anon, authenticated;
drop trigger if exists sync_shared_referral_code on public.referral_codes;
create trigger sync_shared_referral_code
  after insert or update or delete on public.referral_codes
  for each row execute function referral_internal.sync_shared_referral_code();
