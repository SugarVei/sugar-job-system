-- Community data is independent of private resumes/applications. Only signed-in users can read it.
create table public.community_rooms (
 id text primary key check (id ~ '^[A-D]-[1-5][1-5]$'),
 user_id uuid not null unique references auth.users(id) on delete cascade,
 data jsonb not null check (jsonb_typeof(data)='object' and octet_length(data::text)<=16000),
 updated_at timestamptz not null default now()
);
create table public.community_posts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 author text not null check(char_length(author) between 1 and 24),
 title text not null check(char_length(title) between 1 and 80),
 body text not null check(char_length(body) between 1 and 2000),
 category text not null check(category in ('Offer 分享','面经交流','求职求助','公司评价','岛上闲聊')),
 created_at timestamptz not null default now()
);
create table public.community_comments (
 id uuid primary key default gen_random_uuid(), post_id uuid not null references public.community_posts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 author text not null check(char_length(author) between 1 and 24), body text not null check(char_length(body) between 1 and 600),
 parent_id uuid, reply_to text check(char_length(reply_to)<=24), rating int check(rating between 1 and 5), created_at timestamptz not null default now(),
 unique(id,post_id), foreign key(parent_id,post_id) references public.community_comments(id,post_id) on delete cascade
);
create table public.community_reactions (
 user_id uuid not null references auth.users(id) on delete cascade,
 post_id uuid not null references public.community_posts(id) on delete cascade,
 comment_id uuid, target_id uuid not null,
 primary key(user_id,target_id), foreign key(comment_id,post_id) references public.community_comments(id,post_id) on delete cascade,
 check(target_id=coalesce(comment_id,post_id))
);
create table public.community_seats (
 user_id uuid primary key references auth.users(id) on delete cascade,
 session_id uuid not null, resource text not null,
 seat int not null check(seat>=1), expires_at timestamptz not null default (now()+interval '90 seconds'),
 unique(resource,seat),
 check((resource ~ '^taxi-[0-4]$' and seat<=4) or (resource='wheel' and seat<=8) or (resource in ('swing','slide','football','badminton','basketball','yacht','plane') and seat=1))
);
create index community_posts_created on public.community_posts(created_at desc);
create index community_posts_owner on public.community_posts(user_id);
create index community_comments_post on public.community_comments(post_id,created_at);
create index community_comments_owner on public.community_comments(user_id);
create index community_comments_parent on public.community_comments(parent_id,post_id);
create index community_reactions_post on public.community_reactions(post_id);
create index community_reactions_comment on public.community_reactions(comment_id,post_id);
do $$ declare t text; begin
 foreach t in array array['community_rooms','community_posts','community_comments','community_reactions','community_seats'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon',t);
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 execute format('create policy community_read on public.%I for select to authenticated using (true)',t);
 execute format('create policy community_insert on public.%I for insert to authenticated with check ((select auth.uid())=user_id)',t);
 execute format('create policy community_update on public.%I for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',t);
 execute format('create policy community_delete on public.%I for delete to authenticated using ((select auth.uid())=user_id)',t);
 execute format('alter publication supabase_realtime add table public.%I',t);
 end loop;
end $$;
-- Expired leases can be reclaimed; unique(resource,seat) arbitrates simultaneous claims.
create policy community_expired_seat on public.community_seats for delete to authenticated using(expires_at<now());
create function public.community_lease_bounds() returns trigger language plpgsql set search_path='' as $$
begin new.expires_at=now()+interval '90 seconds'; return new; end $$;
create trigger community_lease_bounds before insert or update on public.community_seats for each row execute function public.community_lease_bounds();
create function public.community_acquire_seat(p_resource text,p_session uuid) returns int
language plpgsql security invoker set search_path='' as $$
declare capacity int; candidate int; taken int;
begin
 if auth.uid() is null then raise exception 'Login required'; end if;
 capacity=case when p_resource ~ '^taxi-[0-4]$' then 4 when p_resource='wheel' then 8 when p_resource in ('swing','slide','football','badminton','basketball','yacht','plane') then 1 else 0 end;
 if capacity=0 then raise exception 'Invalid activity'; end if;
 -- Serialize per-account entry while retaining unique seat arbitration across accounts.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,0));
 delete from public.community_seats where expires_at<now();
 select seat into taken from public.community_seats where user_id=auth.uid() and session_id=p_session and resource=p_resource;
 if taken is not null then return taken; end if;
 if exists(select 1 from public.community_seats where user_id=auth.uid()) then return 0; end if;
 for candidate in 1..capacity loop
 insert into public.community_seats(user_id,session_id,resource,seat) values(auth.uid(),p_session,p_resource,candidate) on conflict do nothing returning seat into taken;
 if taken is not null then return taken; end if;
 end loop;
 return 0;
end $$;
revoke execute on function public.community_acquire_seat(text,uuid) from public,anon;
grant execute on function public.community_acquire_seat(text,uuid) to authenticated;
revoke execute on function public.community_lease_bounds() from public,anon;
create policy community_presence_read on realtime.messages for select to authenticated using (realtime.topic()='community:island-01');
create policy community_presence_write on realtime.messages for insert to authenticated with check (realtime.topic()='community:island-01');
