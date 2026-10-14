-- Additive mailbox sync. Credentials live in Vault; existing APIs remain compatible during rollout.
create schema if not exists mail_sync_private;
revoke all on schema mail_sync_private from public, anon, authenticated;
grant usage on schema mail_sync_private to service_role;
grant usage on schema vault to service_role;
grant select on vault.decrypted_secrets to service_role;

alter table public.interviews add column if not exists status text not null default 'scheduled' check (status in ('scheduled','cancelled'));
alter table public.interviews add column if not exists source text not null default 'manual';
alter table public.interviews add column if not exists version integer not null default 1;
alter table public.interviews add column if not exists timezone text;
alter table public.interviews add column if not exists meeting_url text;
alter table public.interviews add column if not exists location text;
alter table public.interviews add column if not exists contact text;
alter table public.interviews add column if not exists end_time timestamptz;

create table public.mail_sync_settings (
 account_id uuid primary key references public.mailbox_accounts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 enabled boolean not null default true, provider text, model text,
 enabled_at timestamptz not null default now(), timezone text not null default 'Asia/Shanghai', folder text not null default 'INBOX',
 uidvalidity text, last_uid bigint, next_scan_at timestamptz not null default now(),
 lease_token uuid, lease_until timestamptz, config_version integer not null default 1,
 last_checked_at timestamptz, last_success_at timestamptz, error_code text,
 failures integer not null default 0, error_until timestamptz, backfill_since timestamptz,
 updated_at timestamptz not null default now()
);
create index mail_sync_settings_due on public.mail_sync_settings(next_scan_at) where enabled;
create table mail_sync_private.credentials (
 kind text not null check(kind in ('mailbox','ai')), owner_id uuid not null,
 provider text not null default '', user_id uuid not null references auth.users(id) on delete cascade,
 secret_id uuid not null references vault.secrets(id), version integer not null default 1,
 primary key(kind,owner_id,provider)
);
create table public.mail_sync_messages (
 id uuid primary key default gen_random_uuid(), account_id uuid not null references public.mailbox_accounts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, folder text not null, uidvalidity text not null, uid bigint not null,
 message_id text, references_ids text[] not null default '{}', received_at timestamptz not null,
 source_data jsonb not null, status text not null default 'pending' check(status in ('pending','review','done','ignored','suppressed','failed')),
 analysis jsonb, reason text, interview_id uuid references public.interviews(id) on delete set null,
 attempts integer not null default 0, next_attempt_at timestamptz not null default now(), lease_token uuid, lease_until timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(account_id,folder,uidvalidity,uid)
);
create index mail_sync_messages_pending on public.mail_sync_messages(next_attempt_at) where status='pending';
create index mail_sync_messages_owner on public.mail_sync_messages(user_id,status);
create index mail_sync_messages_thread on public.mail_sync_messages(user_id,message_id);
create table public.interview_mail_sources (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 interview_id uuid references public.interviews(id) on delete set null, event_key text not null,
 snapshot jsonb, last_received_at timestamptz, sequence integer, suppressed boolean not null default false,
 unique(user_id,event_key)
);
create index interview_mail_sources_target on public.interview_mail_sources(interview_id);
create table public.interview_change_log (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 interview_id uuid references public.interviews(id) on delete set null,
 message_id uuid references public.mail_sync_messages(id) on delete set null,
 action text not null, before_data jsonb, after_data jsonb, created_at timestamptz not null default now()
);
create index interview_change_log_owner on public.interview_change_log(user_id,created_at desc);

alter table mail_sync_private.credentials enable row level security;
grant all on mail_sync_private.credentials to service_role;
alter table public.mail_sync_settings enable row level security;
alter table public.mail_sync_messages enable row level security;
alter table public.interview_mail_sources enable row level security;
alter table public.interview_change_log enable row level security;
create policy own_settings on public.mail_sync_settings for select to authenticated using ((select auth.uid())=user_id);
create policy own_messages on public.mail_sync_messages for select to authenticated using ((select auth.uid())=user_id);
create policy own_sources on public.interview_mail_sources for select to authenticated using ((select auth.uid())=user_id);
create policy own_changes on public.interview_change_log for select to authenticated using ((select auth.uid())=user_id);
revoke all on public.mail_sync_settings,public.mail_sync_messages,public.interview_mail_sources,public.interview_change_log from anon,authenticated;
grant select on public.mail_sync_settings,public.interview_mail_sources,public.interview_change_log to authenticated;
-- Bodies and suggestions are returned by the authenticated backend, not a broadly selectable table.
grant all on public.mail_sync_settings,public.mail_sync_messages,public.interview_mail_sources,public.interview_change_log to service_role;

create or replace function mail_sync_private.capture_credential() returns trigger
language plpgsql security definer set search_path='' as $$
declare k text; oid uuid; p text; sec text; sid uuid; own uuid;
begin
 k:=case when tg_table_name='mailbox_accounts' then 'mailbox' else 'ai' end;
 if tg_op='DELETE' then
  if k='mailbox' then oid:=old.id; p:=''; else oid:=old.user_id; p:=old.provider; end if;
  select secret_id into sid from mail_sync_private.credentials where kind=k and owner_id=oid and provider=p;
  delete from mail_sync_private.credentials where kind=k and owner_id=oid and provider=p;
  if sid is not null then delete from vault.secrets where id=sid; end if;
  if k='ai' then update public.mail_sync_settings set config_version=config_version+1,error_code='AI_NOT_CONFIGURED',error_until=null,lease_token=null,lease_until=null where user_id=old.user_id and provider=p; end if;
  return old;
 end if;
 if k='mailbox' then oid:=new.id; p:=''; sec:=new.auth_code; else oid:=new.user_id; p:=new.provider; sec:=new.api_key; end if;
 own:=new.user_id;
 if sec is not null and length(sec)>0 and sec<>'[已安全保存]' then
  select secret_id into sid from mail_sync_private.credentials where kind=k and owner_id=oid and provider=p;
  if sid is null then
   select vault.create_secret(sec,'mail-sync-'||k||'-'||oid::text||'-'||p) into sid;
   insert into mail_sync_private.credentials(kind,owner_id,provider,user_id,secret_id) values(k,oid,p,own,sid);
  else
   perform vault.update_secret(sid,sec);
   update mail_sync_private.credentials set version=version+1 where kind=k and owner_id=oid and provider=p;
  end if;
  if k='mailbox' then
   insert into public.mail_sync_settings(account_id,user_id) values(oid,own) on conflict do nothing;
   update public.mail_sync_settings set config_version=config_version+1,error_code=null,error_until=null,failures=0,next_scan_at=now(),lease_token=null,lease_until=null where account_id=oid;
  else
   update public.mail_sync_settings set config_version=config_version+1,error_code=null,error_until=null,next_scan_at=now(),lease_token=null,lease_until=null where user_id=own and provider=p;
  end if;
 end if;
 return new;
end $$;
revoke all on function mail_sync_private.capture_credential() from public,anon,authenticated;
create trigger mail_sync_mail_credential after insert or update of auth_code on public.mailbox_accounts for each row execute function mail_sync_private.capture_credential();
create trigger mail_sync_mail_delete before delete on public.mailbox_accounts for each row execute function mail_sync_private.capture_credential();
create trigger mail_sync_ai_credential after insert or update of api_key on public.user_api_keys for each row execute function mail_sync_private.capture_credential();
create trigger mail_sync_ai_delete before delete on public.user_api_keys for each row execute function mail_sync_private.capture_credential();
-- Copy existing credentials inside the database. No secrets are returned to the migration client.
update public.mailbox_accounts set auth_code=auth_code;
update public.user_api_keys set api_key=api_key;
-- Existing single-provider accounts can be connected without guessing a provider; multiple-provider users
-- retain their existing browser selection, persisted on the next authenticated page visit.
update public.mail_sync_settings s set provider=k.provider from
 (select user_id,min(provider) provider from public.user_api_keys group by user_id having count(*)=1) k where s.user_id=k.user_id;

create or replace function public.mail_sync_credential(p_kind text,p_owner uuid,p_provider text default '') returns text
language sql security invoker set search_path='' as $$
 select v.decrypted_secret from mail_sync_private.credentials c join vault.decrypted_secrets v on v.id=c.secret_id
 where c.kind=p_kind and c.owner_id=p_owner and c.provider=p_provider
$$;
create or replace function public.mail_sync_authorize_cron(p_token text) returns boolean
language sql security invoker set search_path='' as $$
 select exists(select 1 from vault.decrypted_secrets where name='mail_sync_runner_token' and decrypted_secret=p_token and length(p_token)>=32)
$$;

create or replace function public.mail_sync_claim_account(p_account uuid default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare s public.mail_sync_settings; a public.mailbox_accounts;
begin
 select * into s from public.mail_sync_settings where enabled and provider is not null
 and (p_account is null or account_id=p_account) and next_scan_at<=now()
 and (lease_until is null or lease_until<now()) and (error_code is distinct from 'MAIL_AUTH_INVALID' or error_until<now())
 and exists(select 1 from mail_sync_private.credentials c where c.kind='ai' and c.owner_id=mail_sync_settings.user_id and c.provider=mail_sync_settings.provider)
 order by next_scan_at for update skip locked limit 1;
 if s.account_id is null then return null; end if;
 update public.mail_sync_settings set lease_token=gen_random_uuid(),lease_until=now()+interval '150 seconds',last_checked_at=now() where account_id=s.account_id returning * into s;
 select * into a from public.mailbox_accounts where id=s.account_id and user_id=s.user_id;
 return jsonb_build_object('settings',to_jsonb(s),'account',to_jsonb(a)-'auth_code','password',public.mail_sync_credential('mailbox',a.id,''));
end $$;

create or replace function public.mail_sync_store_scan(p_account uuid,p_token uuid,p_validity text,p_last bigint,p_messages jsonb) returns integer
language plpgsql security invoker set search_path='' as $$
declare s public.mail_sync_settings; m jsonb; n integer:=0;
begin
 select * into s from public.mail_sync_settings where account_id=p_account for update;
 if not s.enabled or s.lease_token is distinct from p_token or s.lease_until<now() then raise exception 'SYNC_SUPERSEDED'; end if;
 for m in select value from jsonb_array_elements(p_messages) loop
  insert into public.mail_sync_messages(account_id,user_id,folder,uidvalidity,uid,message_id,references_ids,received_at,source_data)
  values(s.account_id,s.user_id,s.folder,p_validity,(m->>'uid')::bigint,m->>'messageId',array(select jsonb_array_elements_text(coalesce(m->'references','[]'))),(m->>'receivedAt')::timestamptz,m)
  on conflict(account_id,folder,uidvalidity,uid) do nothing;
  n:=n+1;
 end loop;
 update public.mail_sync_settings set uidvalidity=p_validity,last_uid=p_last,lease_token=null,lease_until=null,last_success_at=now(),next_scan_at=now()+interval '5 minutes',backfill_since=null,failures=0,error_code=case when error_code like 'MAIL_%' then null else error_code end,updated_at=now() where account_id=p_account;
 return n;
end $$;

create or replace function public.mail_sync_claim_message(p_account uuid default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare m public.mail_sync_messages; s public.mail_sync_settings;
begin
 select mm.* into m from public.mail_sync_messages mm join public.mail_sync_settings ss on ss.account_id=mm.account_id
 where mm.status='pending' and ss.enabled and ss.provider is not null and mm.next_attempt_at<=now()
 and (p_account is null or mm.account_id=p_account) and (mm.lease_until is null or mm.lease_until<now())
 and (ss.error_code not like 'AI_%' or ss.error_code is null or ss.error_until<now())
 order by mm.received_at,mm.uid for update of mm skip locked limit 1;
 if m.id is null then return null; end if;
 select * into s from public.mail_sync_settings where account_id=m.account_id;
 update public.mail_sync_messages set lease_token=gen_random_uuid(),lease_until=now()+interval '150 seconds',attempts=attempts+1 where id=m.id returning * into m;
 return jsonb_build_object('message',to_jsonb(m),'settings',to_jsonb(s),'apiKey',public.mail_sync_credential('ai',s.user_id,s.provider));
end $$;

create or replace function public.mail_sync_snapshot(p_data jsonb) returns jsonb language sql immutable security invoker set search_path='' as $$
 select jsonb_build_object('company_name',p_data->'company_name','position_name',p_data->'position_name','interview_time',p_data->'interview_time','round',p_data->'round','interview_type',p_data->'interview_type','status',p_data->'status','meeting_url',p_data->'meeting_url','location',p_data->'location')
$$;

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

create or replace function mail_sync_private.interview_version_and_delete() returns trigger language plpgsql security definer set search_path='' as $$
declare marker text;
begin
 if tg_op='UPDATE' then new.version:=old.version+1; return new; end if;
 update public.interview_mail_sources set suppressed=true where interview_id=old.id and user_id=old.user_id;
 marker:=(regexp_match(coalesce(old.notes,''),'(\[Sugar邮件:[^]]+\])'))[1];
 if marker is not null then insert into public.interview_mail_sources(user_id,event_key,suppressed) values(old.user_id,'legacy:'||marker,true) on conflict(user_id,event_key) do update set suppressed=true; end if;
 insert into public.interview_change_log(user_id,action,before_data) values(old.user_id,'deleted_by_user',to_jsonb(old));
 return old;
end $$;
revoke all on function mail_sync_private.interview_version_and_delete() from public,anon,authenticated;
create trigger mail_sync_interview_version before update on public.interviews for each row execute function mail_sync_private.interview_version_and_delete();
create trigger mail_sync_interview_deleted before delete on public.interviews for each row execute function mail_sync_private.interview_version_and_delete();

-- RPCs are backend-only; service_role never goes to the browser.
revoke all on function public.mail_sync_credential(text,uuid,text),public.mail_sync_authorize_cron(text),public.mail_sync_claim_account(uuid),public.mail_sync_store_scan(uuid,uuid,text,bigint,jsonb),public.mail_sync_claim_message(uuid),public.mail_sync_snapshot(jsonb),public.mail_sync_apply(uuid,uuid,integer,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.mail_sync_credential(text,uuid,text),public.mail_sync_authorize_cron(text),public.mail_sync_claim_account(uuid),public.mail_sync_store_scan(uuid,uuid,text,bigint,jsonb),public.mail_sync_claim_message(uuid),public.mail_sync_snapshot(jsonb),public.mail_sync_apply(uuid,uuid,integer,jsonb,boolean) to service_role;
