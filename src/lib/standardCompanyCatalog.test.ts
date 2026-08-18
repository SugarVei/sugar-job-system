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
});
