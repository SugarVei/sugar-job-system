-- Same access rule with one DELETE policy instead of two permissive policies.
alter policy community_delete on public.community_seats using ((select auth.uid())=user_id or expires_at<now());
drop policy community_expired_seat on public.community_seats;
