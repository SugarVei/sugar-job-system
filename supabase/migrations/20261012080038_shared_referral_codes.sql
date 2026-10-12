-- Curated campus referral codes. Existing referral_codes remain owner-only.
-- No account IDs or recommender identities are stored in this shared catalog.
create table if not exists public.shared_referral_codes (
  id uuid primary key default gen_random_uuid(),
  company_name text not null check (length(btrim(company_name)) > 0),
  referral_code text not null check (length(btrim(referral_code)) > 0),
  referrer_name text not null default '保密' check (referrer_name = '保密'),
  recruitment_year integer not null default 2027,
  status text not null default '待核实' check (status in ('待核实', '已核实', '已失效')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_name, referral_code, recruitment_year)
);

alter table public.shared_referral_codes enable row level security;
drop policy if exists shared_referral_codes_read_authenticated on public.shared_referral_codes;
create policy shared_referral_codes_read_authenticated
  on public.shared_referral_codes for select to authenticated using (true);
revoke all on public.shared_referral_codes from public, anon, authenticated;
grant select on public.shared_referral_codes to authenticated;

-- Public posts identify these as 2027 recruitment codes. Acceptance and expiry
-- have not been confirmed with employers, so every entry remains 待核实.
insert into public.shared_referral_codes (company_name, referral_code, notes) values
  -- https://www.nowcoder.com/feed/main/detail/f2ded0b0f8b3498d878fc0526ae01bf4
  ('阿里巴巴', '1VP726', null),
  -- https://www.nowcoder.com/feed/main/detail/84288032ce2e479cbfbef7385e7a1b24
  ('字节跳动', 'ZRS2RUF', null),
  -- https://www.nowcoder.com/feed/main/detail/579a203490e447309abd659eeac5f9a9
  ('腾讯', 'AZ8BB7LC', null),
  -- https://job.xpu.edu.cn/detail/online?id=3599917
  ('小红书', 'FBLHBZUNYCAD', null),
  -- https://www.nowcoder.com/feed/main/detail/4b1120a55959490da93d8d6c50233aa9
  ('京东物流', 'C4OF2', '京东集团校招推荐码；京东物流具体岗位是否适用，以官网为准。'),
  -- https://www.nowcoder.com/discuss/921408014454661120
  ('大疆', 'DSuvNXaV', null),
  -- https://www.nowcoder.com/feed/main/detail/6d5aed3484b0408f90ba9bfa5de561fb
  ('海康威视', 'U856E0', null),
  -- https://agent-me.cn/posts/3cee836f-88b9-4d8d-a499-e58cb331a8c0
  ('海康威视', '8QEF7W', null),
  -- https://www.nowcoder.com/feed/main/detail/d0e5d5eced6e4252ae2c838f27e05426
  ('TCL华星', 'nymrqc', '适用于 TCL 华星，TCL 实业使用不同招聘系统。'),
  -- https://www.nowcoder.com/feed/main/detail/735a6043f2de4db7ba1e2e34de4e8b7b
  ('OPPO', 'Z43059762', null),
  -- https://www.nowcoder.com/discuss/925111221672497152
  ('vivo', 'EZS49A', null),
  -- https://www.nowcoder.com/feed/main/detail/3bf090630a3d40dcbee9e3d7e521a08a
  ('美的', 'MO9896', null),
  -- https://www.nowcoder.com/feed/main/detail/6d5aed3484b0408f90ba9bfa5de561fb
  ('海信', 'ES9PT8', null),
  -- https://www.nowcoder.com/feed/main/detail/5411f4a2fff14ea1b9205add94e6982a
  ('科大讯飞', 'IVV0BH', null),
  -- https://www.nowcoder.com/feed/main/detail/31e36d41f24c4e25a5640f1179f0257b
  ('中兴通讯', 'NTAXptH', null),
  -- https://www.nowcoder.com/feed/main/detail/6d5aed3484b0408f90ba9bfa5de561fb
  ('传音控股', 'EVH89B', null),
  -- https://zhiq.zhaopin.com/u/9FB41BD42D1B45CA9A8629AB2BAE94D3
  ('智元', 'XP9JUTE', '网申渠道选择大使推荐。')
on conflict (company_name, referral_code, recruitment_year) do nothing;
