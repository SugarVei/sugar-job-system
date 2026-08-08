-- ============================================================
-- 扩展邮箱服务商：网易 / QQ / Gmail / Outlook / 自定义（学校邮箱）
-- Safe to re-run. 不删除数据。保留 RLS。
-- ============================================================

alter table public.mailbox_accounts
  drop constraint if exists mailbox_accounts_provider_check;

alter table public.mailbox_accounts
  add constraint mailbox_accounts_provider_check
  check (provider in ('netease163', 'qq', 'gmail', 'outlook', 'custom'));

alter table public.mailbox_accounts
  add column if not exists imap_host text;

alter table public.mailbox_accounts
  add column if not exists imap_port integer default 993;

comment on column public.mailbox_accounts.imap_host is '自定义/学校邮箱 IMAP 主机；预设服务商可为空';
comment on column public.mailbox_accounts.imap_port is 'IMAP 端口，默认 993 SSL';
