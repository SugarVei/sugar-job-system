create index community_reactions_target on public.community_reactions(target_id);
create view public.community_post_feed with (security_invoker=true) as
select p.*,
 (select count(*)::int from public.community_comments c where c.post_id=p.id) as reply_count,
 (select count(*)::int from public.community_reactions r where r.target_id=p.id) as likes,
 exists(select 1 from public.community_reactions r where r.target_id=p.id and r.user_id=(select auth.uid())) as liked
from public.community_posts p;
create view public.community_comment_feed with (security_invoker=true) as
select c.*,
 (select count(*)::int from public.community_reactions r where r.target_id=c.id) as likes,
 exists(select 1 from public.community_reactions r where r.target_id=c.id and r.user_id=(select auth.uid())) as liked
from public.community_comments c;
revoke all on public.community_post_feed,public.community_comment_feed from anon;
grant select on public.community_post_feed,public.community_comment_feed to authenticated;
