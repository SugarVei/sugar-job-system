-- ============================================================
-- 投递状态调整：
--   简历筛选 → 在线测评
--   笔试 → HR面
--   取消流程中靠后的独立「HR面」阶段（与原笔试位合并为 AI面 后的 HR面）
-- Safe to re-run. 不删用户数据。
-- ============================================================

-- 1) 先迁移历史取值（在收紧 check 之前）
update public.applications
set status = '在线测评'
where status = '简历筛选';

update public.applications
set status = 'HR面'
where status = '笔试';

-- 2) 放宽 / 重建 status check（兼容不同历史约束名）
do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public'
      and t.relname = 'applications'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%status%'
  loop
    execute format('alter table public.applications drop constraint if exists %I', r.conname);
  end loop;
end $$;

alter table public.applications
  add constraint applications_status_check
  check (
    status in (
      '待投递',
      '已投递',
      '在线测评',
      'AI面',
      'HR面',
      '一面',
      '二面',
      'Offer',
      '已拒绝',
      '已放弃',
      '人才库',
      '待跟进'
    )
  );
