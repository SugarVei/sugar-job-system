create function public.community_clock() returns double precision language sql stable security invoker set search_path='' as $$ select extract(epoch from now())::double precision*1000 $$;
revoke execute on function public.community_clock() from public,anon;
grant execute on function public.community_clock() to authenticated;
