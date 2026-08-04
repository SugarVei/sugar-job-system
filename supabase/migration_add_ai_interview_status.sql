-- Add AI interview as an application pipeline status.
-- Existing rows are unchanged; only the status whitelist is expanded.

begin;

alter table public.applications
  drop constraint if exists applications_status_check;

alter table public.applications
  add constraint applications_status_check check (status in (
    '待投递', '已投递', '简历筛选', '笔试', '一面', '二面', 'AI面', 'HR面',
    'Offer', '已拒绝', '已放弃', '人才库', '待跟进'
  ));

commit;
