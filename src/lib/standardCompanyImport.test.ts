import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { collectIncomingCompanies, diffCatalog, findHeaderRow, normalizeImportedCompanies, parseSheetMatrix, sanitizeIncomingCompany } from './standardCompanyImport.ts';

describe('standardCompanyImport', () => {
  it('finds the Feishu-style header row under a title', () => {
    const header = findHeaderRow([
      ['2027校招公司汇总'],
      [],
      ['公司名称', '行业', '城市', '校招链接', '备注'],
    ]);
    assert.ok(header);
    assert.equal(header?.index, 2);
    assert.equal(header?.map.name, 0);
    assert.equal(header?.map.url, 3);
  });

  it('skips notes and invalid urls, and keeps the first duplicate', () => {
    const parsed = parseSheetMatrix([
      ['公司', '官网', '分组'],
      ['中芯国际', 'https://smics.zhiye.com/campus', '半导体'],
      ['中芯国际', 'https://example.com', '半导体'],
      ['坏链接公司', 'javascript:alert(1)', '其他'],
      ['', 'https://example.com', '其他'],
    ]);
    assert.equal(parsed.companies.length, 1);
    assert.equal(parsed.companies[0].name, '中芯国际');
    assert.equal(parsed.skipped.length, 3);
    assert.deepEqual(parsed.skipped.map((row) => row.reason), ['重复行', '网址无效', '缺少公司名']);
  });

  it('merges by filling empty fields and never deletes current companies', () => {
    const { rows, summary, upserts } = diffCatalog(
      [
        { name: '中芯国际', industry: '晶圆代工', city: '上海', url: 'https://old.example', group: '半导体 · 芯片 · 显示' },
        { name: '只在底库', industry: '其他', city: '北京', url: 'https://keep.example', group: '其他' },
      ],
      [
        { name: '中芯国际', industry: '', city: '', url: 'https://smics.zhiye.com/campus', group: '', sheet: 'Sheet1' },
        { name: '寒武纪', industry: 'AI 芯片', city: '北京', url: 'https://app.mokahr.com/campus-recruitment/cambricon', group: '', sheet: 'Sheet1' },
      ],
    );

    assert.equal(summary.added, 1);
    assert.equal(summary.updated, 1);
    assert.equal(summary.unchanged, 0);
    assert.equal(upserts.length, 2);
    assert.equal(rows.find((row) => row.kind === 'update')?.next?.url, 'https://smics.zhiye.com/campus');
    assert.equal(rows.find((row) => row.kind === 'update')?.next?.industry, '晶圆代工');
    assert.equal(rows.find((row) => row.kind === 'update')?.next?.group, '半导体 · 芯片 · 显示');
    assert.equal(rows.find((row) => row.kind === 'add')?.next?.group, 'AI 芯片');
  });

  it('deduplicates the same company across sheets', () => {
    const parsed = collectIncomingCompanies([
      { name: '互联网', rows: [['公司', '官网'], ['字节跳动', 'https://jobs.bytedance.com']] },
      { name: '重复', rows: [['公司名称', '校招链接'], ['字节跳动', 'https://jobs.bytedance.com/campus']] },
    ]);
    assert.equal(parsed.companies.length, 1);
    assert.equal(parsed.skipped[0]?.reason, '重复行');
  });

  it('rejects javascript urls and accepts http urls', () => {
    assert.equal(sanitizeIncomingCompany({ name: '测试', url: 'javascript:alert(1)' }).ok, false);
    assert.equal(sanitizeIncomingCompany({ name: '测试', url: 'https://career.example.com/campus' }).ok, true);
  });

  it('recognizes 婉清学姐-style headers after a long title block', () => {
    const headerRows = Array.from({ length: 11 }, () => ['【秋招_春招_实习】汇总表-婉清学姐']);
    const header = findHeaderRow([
      ...headerRows,
      ['序号', '单位名称', '行业分类', '工作地址', '网申入口', '截止时间', '备注'],
    ]);
    assert.ok(header);
    assert.equal(header?.index, 11);
    assert.equal(header?.map.name, 1);
    assert.equal(header?.map.industry, 2);
    assert.equal(header?.map.city, 3);
    assert.equal(header?.map.url, 4);
  });

  it('uses 秋招/春招/实习 sheet names as the group', () => {
    const parsed = collectIncomingCompanies([
      {
        name: '秋招',
        rows: [
          ['单位名称', '网申入口', '行业分类', '工作地址'],
          ['中芯国际', 'https://smics.zhiye.com/campus', '半导体', '上海'],
        ],
      },
      {
        name: '实习',
        rows: [
          ['公司全称', '投递链接'],
          ['寒武纪', 'https://app.mokahr.com/campus-recruitment/cambricon'],
        ],
      },
    ]);
    assert.equal(parsed.companies.length, 2);
    assert.equal(parsed.companies[0].group, '秋招');
    assert.equal(parsed.companies[0].industry, '半导体');
    assert.equal(parsed.companies[1].group, '实习');
  });

  it('re-sanitizes companies posted from the browser', () => {
    const parsed = normalizeImportedCompanies([
      { name: '中芯国际', url: 'https://smics.zhiye.com/campus', sheet: '秋招' },
      { name: '坏链接公司', url: 'javascript:alert(1)', sheet: '秋招' },
    ]);
    assert.equal(parsed.companies.length, 1);
    assert.equal(parsed.companies[0].group, '秋招');
    assert.equal(parsed.skipped[0]?.reason, '网址无效');
  });
});
