-- Keep profile data out of auth user_metadata because that metadata is copied
-- into every access-token JWT. Large data URLs can exceed gateway header limits.
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  updated_at timestamptz not null default now(),
  constraint user_profiles_display_name_length check (display_name is null or length(display_name) <= 100),
  constraint user_profiles_avatar_length check (avatar_url is null or length(avatar_url) <= 100000)
);

alter table public.user_profiles enable row level security;

drop policy if exists user_profiles_select_own on public.user_profiles;
create policy user_profiles_select_own
on public.user_profiles for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists user_profiles_insert_own on public.user_profiles;
create policy user_profiles_insert_own
on public.user_profiles for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists user_profiles_update_own on public.user_profiles;
create policy user_profiles_update_own
on public.user_profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists user_profiles_delete_own on public.user_profiles;
create policy user_profiles_delete_own
on public.user_profiles for delete to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on table public.user_profiles to authenticated;

-- Preserve every existing cloud avatar before removing it from JWT metadata.
insert into public.user_profiles (user_id, avatar_url, updated_at)
select id, raw_user_meta_data ->> 'avatar_url', now()
from auth.users
where jsonb_typeof(raw_user_meta_data -> 'avatar_url') = 'string'
  and length(raw_user_meta_data ->> 'avatar_url') > 0
on conflict (user_id) do update
set avatar_url = excluded.avatar_url,
    updated_at = excluded.updated_at;

update auth.users
set raw_user_meta_data = raw_user_meta_data - 'avatar_url',
    updated_at = now()
where raw_user_meta_data ? 'avatar_url';
