-- Serialize event deduplication and protect manual records.
create or replace function public.mail_sync_apply(p_id uuid,p_token uuid,p_version integer,p_analysis jsonb,p_manual boolean default false) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare m public.mail_sync_messages; s public.mail_sync_settings; ev public.interviews; src public.interview_mail_sources;
 key text; legacy text; op text; before_data jsonb; after_data jsonb; ids uuid[]; review_reason text; oldtime timestamptz; target_version integer;
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
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(m.user_id::text||':'||key,0));
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
  elsif coalesce(array_length(ids,1),0)>1 then review_reason:='MATCH_AMBIGUOUS'; end if;
 end if;
 if ev.id is not null and src.id is null then select * into src from public.interview_mail_sources where user_id=m.user_id and interview_id=ev.id order by last_received_at desc nulls last limit 1 for update; end if;
 if op in ('cancel','reschedule') and ev.id is null then review_reason:=coalesce(review_reason,'TARGET_NOT_IDENTIFIED'); end if;
 if ev.id is null and op='create' then
  select array_agg(i.id) into ids from public.interviews i where i.user_id=m.user_id and i.company_name=p_analysis->>'company_name'
  and coalesce(i.position_name,'')=coalesce(p_analysis->>'position_name','') and coalesce(i.round,'')=coalesce(p_analysis->>'round','') and i.interview_time=(p_analysis->>'interview_time')::timestamptz;
  if coalesce(array_length(ids,1),0)>0 then review_reason:='POSSIBLE_DUPLICATE'; end if;
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
  if not p_manual and src.snapshot is not null and src.snapshot<>public.mail_sync_snapshot(before_data) then review_reason:='MANUAL_EDIT_CONFLICT'; end if;
  if op in ('reschedule','cancel') and src.id is null and not p_manual then review_reason:=coalesce(review_reason,'MANUAL_RECORD_REVIEW'); end if;
  if op='create' and src.id is null and not p_manual and (ev.company_name is distinct from p_analysis->>'company_name' or ev.interview_time is distinct from (p_analysis->>'interview_time')::timestamptz) then review_reason:='MANUAL_EDIT_CONFLICT'; end if;
  target_version:=(m.analysis->>'target_version')::integer;
  if p_manual and target_version is not null and target_version<>ev.version then raise exception 'INTERVIEW_CHANGED'; end if;
 end if;
 if review_reason is not null and not p_manual then
  update public.mail_sync_messages set status='review',analysis=p_analysis||jsonb_build_object('target_id',ev.id,'target_version',ev.version,'current',before_data),reason=review_reason,interview_id=ev.id,lease_token=null,lease_until=null,updated_at=now() where id=m.id;
  return jsonb_build_object('status','review','reason',review_reason);
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
