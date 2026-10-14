create or replace function public.mail_sync_user_revision() returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('updated_at',max(updated_at),'count',count(*),'version',coalesce(sum(version),0))
 from public.interviews where user_id=(select auth.uid())
$$;
revoke all on function public.mail_sync_user_revision() from public,anon;
grant execute on function public.mail_sync_user_revision() to authenticated,service_role;

-- This new automatic feature is initially active only for the account owner who requested rollout.
-- Other existing users can opt in using their own switch. Newly connected mailboxes use the documented default.
update public.mail_sync_settings s set enabled=false
where not exists(select 1 from auth.users u where u.id=s.user_id and u.email='twxyforl@gmail.com');

do $$ begin
 if not exists(select 1 from vault.secrets where name='mail_sync_runner_token') then
  perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'mail_sync_runner_token','Mailbox automatic interview sync internal authorization');
 end if;
end $$;
create or replace function mail_sync_private.dispatch() returns bigint language plpgsql security invoker set search_path='' as $$
declare rid bigint;
begin
 if not exists(select 1 from public.mail_sync_settings where enabled and provider is not null and next_scan_at<=now() and (lease_until is null or lease_until<now()) and (error_code is distinct from 'MAIL_AUTH_INVALID' or error_until<now()))
 and not exists(select 1 from public.mail_sync_messages m join public.mail_sync_settings s on s.account_id=m.account_id where s.enabled and s.provider is not null and m.status='pending' and m.next_attempt_at<=now() and (m.lease_until is null or m.lease_until<now()) and (s.error_code not like 'AI_%' or s.error_code is null or s.error_until<now())) then return null; end if;
 select net.http_post(url:='https://www.sugarv.mom/api/mail-interview-sync?action=cron',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='mail_sync_runner_token')),body:='{}'::jsonb,timeout_milliseconds:=110000) into rid;
 return rid;
end $$;
revoke all on function mail_sync_private.dispatch() from public,anon,authenticated;
grant execute on function mail_sync_private.dispatch() to service_role;
select cron.schedule('mail-interview-auto-sync','* * * * *','select mail_sync_private.dispatch();');
-- Enable after the production endpoint and database transactions have been verified.
select cron.alter_job(jobid,active:=false) from cron.job where jobname='mail-interview-auto-sync';

-- Keep only minimal evidence. Ordinary email bodies are never persisted by the scanner.
select cron.schedule('mail-interview-sync-cache-cleanup','15 3 * * *', $cleanup$
 update public.mail_sync_messages set source_data=source_data-'body' where created_at<now()-interval '7 days';
 delete from public.mail_sync_messages where status='ignored' and created_at<now()-interval '30 days';
 $cleanup$);


-- Updated transactional RPCs.
create or replace function public.mail_sync_store_scan(p_account uuid,p_token uuid,p_validity text,p_last bigint,p_messages jsonb) returns integer
language plpgsql security invoker set search_path='' as $$
declare s public.mail_sync_settings; m jsonb; n integer:=0;
begin
 select * into s from public.mail_sync_settings where account_id=p_account for update;
 if not s.enabled or s.lease_token is distinct from p_token or s.lease_until<now() then raise exception 'SYNC_SUPERSEDED'; end if;
 for m in select value from jsonb_array_elements(p_messages) loop
  insert into public.mail_sync_messages(account_id,user_id,folder,uidvalidity,uid,message_id,references_ids,received_at,source_data,status)
  values(s.account_id,s.user_id,s.folder,p_validity,(m->>'uid')::bigint,m->>'messageId',array(select jsonb_array_elements_text(coalesce(m->'references','[]'))),(m->>'receivedAt')::timestamptz,m,case when m->>'candidate'='false' then 'ignored' else 'pending' end)
  on conflict(account_id,folder,uidvalidity,uid) do nothing;
  n:=n+1;
 end loop;
 update public.mail_sync_settings set uidvalidity=p_validity,last_uid=p_last,lease_token=null,lease_until=null,last_success_at=now(),next_scan_at=now()+interval '5 minutes',backfill_since=null,failures=0,error_code=case when error_code like 'MAIL_%' then null else error_code end,updated_at=now() where account_id=p_account;
 return n;
end $$;

create or replace function public.mail_sync_apply(p_id uuid,p_token uuid,p_version integer,p_analysis jsonb,p_manual boolean default false) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare m public.mail_sync_messages; s public.mail_sync_settings; ev public.interviews; src public.interview_mail_sources;
 key text; legacy text; op text; before_data jsonb; after_data jsonb; ids uuid[]; reason text; oldtime timestamptz; target_version integer;
begin
 select * into m from public.mail_sync_messages where id=p_id for update;
 if m.id is null then raise exception 'MESSAGE_NOT_FOUND'; end if;
 if not p_manual and (m.lease_token is distinct from p_token or m.lease_until<now()) then raise exception 'SYNC_SUPERSEDED'; end if;
 if p_manual and m.status<>'review' then raise exception 'SUGGESTION_ALREADY_RESOLVED'; end if;
 select * into s from public.mail_sync_settings where account_id=m.account_id for update;
 if not p_manual and (not s.enabled or s.config_version<>p_version or not exists(select 1 from mail_sync_private.credentials where kind='ai' and owner_id=s.user_id and provider=s.provider)) then raise exception 'SYNC_SUPERSEDED'; end if;
 op:=p_analysis->>'action';
 if op in ('review','ignore') then
  update public.mail_sync_messages set status=case when op='review' then 'review' else 'ignored' end,analysis=p_analysis,reason=p_analysis->>'reason',lease_token=null,lease_until=null,updated_at=now() where id=m.id;
  return jsonb_build_object('status',case when op='review' then 'review' else 'ignored' end);
 end if;
 if op not in ('create','reschedule','cancel') then raise exception 'INVALID_ACTION'; end if;
 if coalesce(length(btrim(p_analysis->>'company_name')),0)=0 or (op<>'cancel' and coalesce(p_analysis->>'interview_time','')='') then raise exception 'INVALID_INTERVIEW'; end if;
 key:=p_analysis->>'event_key'; legacy:=p_analysis->>'legacy_marker';
 if key is null or length(key)>1200 then raise exception 'INVALID_EVENT_KEY'; end if;
 select * into src from public.interview_mail_sources where user_id=m.user_id and event_key=key for update;
 if src.id is null and legacy is not null then select * into src from public.interview_mail_sources where user_id=m.user_id and event_key='legacy:'||legacy for update; end if;
 if src.suppressed then
  update public.mail_sync_messages set status='suppressed',reason='DELETED_BY_USER',lease_token=null,lease_until=null where id=m.id;
  return jsonb_build_object('status','suppressed');
 end if;
 if src.interview_id is not null then select * into ev from public.interviews where id=src.interview_id and user_id=m.user_id for update; end if;
 if p_manual and p_analysis->>'target_id' is not null then
  select * into ev from public.interviews where id=(p_analysis->>'target_id')::uuid and user_id=m.user_id for update;
  if ev.id is null then raise exception 'TARGET_NOT_IDENTIFIED'; end if;
 end if;
 if ev.id is null then
  -- Exact provenance first, then a unique referenced message or explicit prior time.
  select array_agg(distinct i.id) into ids from public.interviews i where i.user_id=m.user_id and (
   (legacy is not null and position(legacy in coalesce(i.notes,''))>0)
   or i.id in (select interview_id from public.mail_sync_messages where user_id=m.user_id and message_id=any(m.references_ids) and interview_id is not null)
   or ((op in ('cancel','reschedule')) and p_analysis->>'prior_time' is not null and i.interview_time=(p_analysis->>'prior_time')::timestamptz and i.company_name=p_analysis->>'company_name'));
  if coalesce(array_length(ids,1),0)=1 then select * into ev from public.interviews where id=ids[1] and user_id=m.user_id for update;
  elsif coalesce(array_length(ids,1),0)>1 then reason:='MATCH_AMBIGUOUS'; end if;
 end if;
 if ev.id is not null and src.id is null then select * into src from public.interview_mail_sources where user_id=m.user_id and interview_id=ev.id order by last_received_at desc nulls last limit 1 for update; end if;
 if op in ('cancel','reschedule') and ev.id is null then reason:=coalesce(reason,'TARGET_NOT_IDENTIFIED'); end if;
 if ev.id is null and op='create' then
  select array_agg(i.id) into ids from public.interviews i where i.user_id=m.user_id and i.company_name=p_analysis->>'company_name'
  and coalesce(i.position_name,'')=coalesce(p_analysis->>'position_name','') and coalesce(i.round,'')=coalesce(p_analysis->>'round','') and i.interview_time=(p_analysis->>'interview_time')::timestamptz;
  if coalesce(array_length(ids,1),0)>0 then reason:='POSSIBLE_DUPLICATE'; end if;
 end if;
 if ev.id is not null then
  before_data:=to_jsonb(ev);
  if src.last_received_at>m.received_at and not p_manual then
   update public.mail_sync_messages set status='ignored',reason='OLDER_NOTIFICATION',analysis=p_analysis,interview_id=ev.id,lease_token=null,lease_until=null where id=m.id;
   return jsonb_build_object('status','ignored');
  end if;
  if src.sequence is not null and p_analysis->>'sequence' is not null and (p_analysis->>'sequence')::integer<src.sequence and not p_manual then
   update public.mail_sync_messages set status='ignored',reason='OLDER_NOTIFICATION',lease_token=null,lease_until=null where id=m.id;
   return jsonb_build_object('status','ignored');
  end if;
  if not p_manual and src.snapshot is not null and src.snapshot<>public.mail_sync_snapshot(before_data) then reason:='MANUAL_EDIT_CONFLICT'; end if;
  if op in ('reschedule','cancel') and src.id is null and not p_manual then reason:=coalesce(reason,'MANUAL_RECORD_REVIEW'); end if;
  target_version:=(m.analysis->>'target_version')::integer;
  if p_manual and target_version is not null and target_version<>ev.version then raise exception 'INTERVIEW_CHANGED'; end if;
 end if;
 if reason is not null and not p_manual then
  update public.mail_sync_messages set status='review',analysis=p_analysis||jsonb_build_object('target_id',ev.id,'target_version',ev.version,'current',before_data),reason=reason,interview_id=ev.id,lease_token=null,lease_until=null,updated_at=now() where id=m.id;
  return jsonb_build_object('status','review','reason',reason);
 end if;
 if ev.id is null then
  if op<>'create' then raise exception 'TARGET_NOT_IDENTIFIED'; end if;
  insert into public.interviews(id,user_id,company_name,position_name,interview_time,round,interview_type,notes,source,timezone,meeting_url,location,contact,end_time,application_id)
  values((p_analysis->>'stable_id')::uuid,m.user_id,p_analysis->>'company_name',nullif(p_analysis->>'position_name',''),(p_analysis->>'interview_time')::timestamptz,nullif(p_analysis->>'round',''),nullif(p_analysis->>'interview_type',''),coalesce(legacy,'')||E'\n来源邮件：'||(m.source_data->>'subject'),'email',s.timezone,p_analysis->>'meeting_url',p_analysis->>'location',p_analysis->>'contact',(p_analysis->>'end_time')::timestamptz,(p_analysis->>'application_id')::uuid)
  on conflict(id) do nothing returning * into ev;
  if ev.id is null then select * into ev from public.interviews where id=(p_analysis->>'stable_id')::uuid and user_id=m.user_id for update; if ev.id is null then raise exception 'ID_CONFLICT'; end if; end if;
 elsif op='cancel' then
  update public.interviews set status='cancelled' where id=ev.id and user_id=m.user_id returning * into ev;
 elsif op='reschedule' then
  update public.interviews set interview_time=(p_analysis->>'interview_time')::timestamptz,status='scheduled',meeting_url=coalesce(p_analysis->>'meeting_url',meeting_url),location=coalesce(p_analysis->>'location',location),end_time=(p_analysis->>'end_time')::timestamptz where id=ev.id and user_id=m.user_id returning * into ev;
 end if;
 after_data:=to_jsonb(ev);
 insert into public.interview_mail_sources(user_id,interview_id,event_key,snapshot,last_received_at,sequence)
 values(m.user_id,ev.id,key,public.mail_sync_snapshot(after_data),m.received_at,(p_analysis->>'sequence')::integer)
 on conflict(user_id,event_key) do update set interview_id=excluded.interview_id,snapshot=excluded.snapshot,last_received_at=excluded.last_received_at,sequence=excluded.sequence;
 -- Refresh all aliases of the same source so their snapshots cannot remain stale after a genuine reschedule.
 update public.interview_mail_sources set snapshot=public.mail_sync_snapshot(after_data),last_received_at=greatest(last_received_at,m.received_at) where user_id=m.user_id and interview_id=ev.id;
 update public.mail_sync_messages set status='done',analysis=p_analysis,interview_id=ev.id,reason=case when op='create' and before_data is not null then 'DUPLICATE' else null end,lease_token=null,lease_until=null,source_data=source_data-'body',updated_at=now() where id=m.id;
 insert into public.interview_change_log(user_id,interview_id,message_id,action,before_data,after_data) values(m.user_id,ev.id,m.id,op,before_data,after_data);
 return jsonb_build_object('status','done','interview_id',ev.id,'action',op);
end $$;
