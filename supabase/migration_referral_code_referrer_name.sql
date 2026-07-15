-- 简化内推码记录：新增推荐人姓名，并将旧岗位字段改为可选。
-- 可重复执行，不删除旧字段或旧数据。

alter table public.referral_codes
  add column if not exists referrer_name text;

alter table public.referral_codes
  alter column position_name drop not null;
