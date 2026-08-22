import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { HotCompanyGroup } from '../data/hotCompanies.ts';
import { mergeStandardCatalog } from './standardCompanyCatalog.ts';

const seed: HotCompanyGroup[] = [
  {
    name: '半导体 · 芯片 · 显示',
    dot: '#8ba3bd',
    companies: [
      { name: '中芯国际', industry: '晶圆代工', city: '上海', url: 'https://old.example' },
    ],
  },
];

describe('standardCompanyCatalog', () => {
  it('updates seed companies and appends new groups without dropping the seed list', () => {
    const { groups, companies } = mergeStandardCatalog(seed, [
      {
        company_key: '中芯国际',
        company_name: '中芯国际',
        industry: '',
        city: '',
        url: 'https://smics.zhiye.com/campus',
        group_name: '半导体 · 芯片 · 显示',
      },
      {
        company_key: '寒武纪',
        company_name: '寒武纪',
        industry: 'AI 芯片',
        city: '北京',
        url: 'https://app.mokahr.com/campus-recruitment/cambricon',
        group_name: '飞书导入',
      },
    ]);

    assert.equal(companies.length, 2);
    assert.equal(groups[0].name, '半导体 · 芯片 · 显示');
    assert.equal(groups[0].companies[0].url, 'https://smics.zhiye.com/campus');
    assert.equal(groups[1].name, '飞书导入');
    assert.equal(groups[1].companies[0].name, '寒武纪');
  });

  it('overlays imported recruitment fields without losing the richer seed record', () => {
    const { companies } = mergeStandardCatalog([
      {
        name: '秋招公司',
        dot: '#8ba3bd',
        companies: [{
          name: '秋招公司',
          companyType: '国企',
          industry: '旧行业',
          industryTags: ['旧行业'],
          city: '北京',
          url: 'https://old.example',
          noticeUrl: 'https://old-notice.example',
          deadlineText: '尽快投递',
          recruitment: { status: 'started', evidence: '保留的核查信息', entry: 'https://old.example', checkedAt: '2026-08-18' },
        }],
      },
    ], [{
      company_key: '秋招',
      company_name: '秋招公司',
      source_update_date: '2026-08-22',
      company_type: '民企',
      industry: '新行业',
      city: '上海',
      deadline_text: '2026-09-30',
      notice_url: 'https://new-notice.example',
      apply_url: 'https://new-apply.example',
      url: 'https://new-apply.example',
      group_name: '秋招',
    }]);

    assert.equal(companies[0]?.companyType, '民企');
    assert.equal(companies[0]?.updateDate, '2026-08-22');
    assert.equal(companies[0]?.industry, '新行业');
    assert.deepEqual(companies[0]?.industryTags, ['新行业']);
    assert.equal(companies[0]?.deadlineText, '2026-09-30');
    assert.equal(companies[0]?.noticeUrl, 'https://new-notice.example');
    assert.equal(companies[0]?.applyUrl, 'https://new-apply.example');
    assert.equal(companies[0]?.recruitment?.evidence, '保留的核查信息');
  });
});
