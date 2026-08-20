import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { attachClientSkipped, campusYearDecision, collectIncomingCompanies, diffCatalog, extractCampusYears, findHeaderRow, isMissingCompanyColumn, normalizeImportedCompanies, parseSheetMatrix, sanitizeIncomingCompany } from './standardCompanyImport.ts';

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

  it('reads 27届 from mixed labels and ignores bare 2026 dates', () => {
    assert.deepEqual([...extractCampusYears('2026届秋招')].sort(), [2026]);
    assert.deepEqual([...extractCampusYears('26/27届')].sort(), [2026, 2027]);
    assert.deepEqual([...extractCampusYears('26届和27届')].sort(), [2026, 2027]);
    assert.deepEqual([...extractCampusYears('26和27届')].sort(), [2026, 2027]);
    assert.deepEqual([...extractCampusYears('2026, 2027, 2028届')].sort(), [2026, 2027, 2028]);
    assert.deepEqual([...extractCampusYears('2026-09-01')].sort(), []);
    assert.deepEqual([...extractCampusYears('2026/08/17')].sort(), []);
    assert.equal(campusYearDecision(['2026、2027届']).keep, true);
    assert.equal(campusYearDecision(['26届和27届']).keep, true);
    assert.equal(campusYearDecision(['26届秋招']).keep, false);
    assert.equal(campusYearDecision(['上海']).keep, true);
    assert.equal(campusYearDecision(['不限届']).keep, true);
    assert.equal(campusYearDecision(['2026届'], [], '26、27校招汇总表').keep, false);
    assert.equal(campusYearDecision([''], [], '26、27校招汇总表').keep, false);
    assert.equal(extractCampusYears('27', true).has(2027), true);
  });

  it('keeps only 27届 rows and 27届 sheets', () => {
    const parsed = collectIncomingCompanies([
      {
        name: '26届秋招',
        rows: [
          ['单位名称', '网申入口'],
          ['旧公司', 'https://old.example.com'],
        ],
      },
      {
        name: '秋招',
        rows: [
          ['单位名称', '届别', '网申入口', '备注'],
          ['只要27届', '27', 'https://keep.example.com', ''],
          ['只要2027届', '2027届', 'https://keep2.example.com', ''],
          ['跨届公司', '26/27届', 'https://both.example.com', ''],
          ['二十六届', '26届', 'https://drop.example.com', ''],
          ['备注里的26届', '', 'https://note.example.com', '2025届春招'],
          ['没有届别', '', 'https://current.example.com', '上海'],
        ],
      },
    ]);

    assert.deepEqual(parsed.companies.map((company) => company.name).sort(), ['只要2027届', '只要27届', '没有届别', '跨届公司']);
    assert.equal(parsed.skipped.some((row) => row.incoming.name === '旧公司' && row.reason?.startsWith('非27届')), true);
    assert.equal(parsed.skipped.some((row) => row.incoming.name === '二十六届' && row.reason?.includes('2026')), true);
    assert.equal(parsed.skipped.some((row) => row.incoming.name === '备注里的26届' && row.reason?.includes('2025')), true);
  });

  it('keeps 27届 from 届次 on a mixed 26/27 sheet and drops email-only urls to notice links', () => {
    const parsed = parseSheetMatrix([
      ['更新时间', '公司名称', '行业分类', '工作地点', '届次', '批次', '公告链接', '投递链接'],
      ['2026/08/17', '（必看）表格使用说明', '', '', '', '', '', ''],
      ['2026/08/17', '宁波银行', '金融业, 婉清学姐冲冲冲的店唯一正版', '宁波', '2027届', '秋招专场', 'https://mp.weixin.qq.com/s/keep', 'https://zhaopin.nbcb.com.cn/#/campus'],
      ['2026/08/17', '旧公司', '能源/化工', '上海', '2026届', '秋招专场', 'https://mp.weixin.qq.com/s/old', 'https://old.example.com'],
      ['2026/08/17', '跨届公司', '互联网', '北京', '26届和27届', '秋招专场', 'https://mp.weixin.qq.com/s/both', 'https://both.example.com'],
      ['2026/08/17', '邮箱公司', '咨询', '北京', '2027届', '秋招专场', 'https://mp.weixin.qq.com/s/mail', '邮箱：hr@example.com'],
      ['2026/08/17', '不限届公司', '其他', '深圳', '不限届', '秋招专场', 'https://mp.weixin.qq.com/s/any', 'https://any.example.com'],
    ], '📁26、27校招汇总表');

    assert.deepEqual(new Set(parsed.companies.map((company) => company.name)), new Set(['宁波银行', '跨届公司', '邮箱公司', '不限届公司']));
    assert.equal(parsed.companies.find((company) => company.name === '宁波银行')?.industry, '金融业');
    assert.equal(parsed.companies.find((company) => company.name === '邮箱公司')?.url, 'https://mp.weixin.qq.com/s/mail');
    assert.equal(parsed.skipped.some((row) => row.incoming.name === '旧公司' && row.reason?.startsWith('非27届')), true);
    assert.equal(parsed.skipped.some((row) => row.incoming.name === '（必看）表格使用说明' && row.reason === '说明行'), true);
  });

  it('does not treat an all-26届 workbook as a missing company column', () => {
    const parsed = parseSheetMatrix([
      ['单位名称', '届别'],
      ['旧公司', '2026届'],
    ], '26届');
    assert.equal(parsed.companies.length, 0);
    assert.equal(isMissingCompanyColumn(parsed), false);

    const attached = attachClientSkipped(
      { companies: [], skipped: [], sheets: ['26届'] },
      parsed.skipped,
    );
    assert.equal(isMissingCompanyColumn(attached), false);
    assert.equal(attached.skipped[0]?.reason?.startsWith('非27届'), true);
  });
});
