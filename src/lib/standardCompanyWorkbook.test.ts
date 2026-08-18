import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import XLSX from 'xlsx-js-style';
import { parseCatalogWorkbookBuffer } from './standardCompanyWorkbook.ts';

describe('standardCompanyWorkbook', () => {
  it('parses a 婉清学姐-style workbook whose filename contains brackets', () => {
    const workbook = XLSX.utils.book_new();
    const titleRows = Array.from({ length: 11 }, () => ['【秋招_春招_实习】汇总表-婉清学姐']);
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ...titleRows,
      ['序号', '单位名称', '行业分类', '工作地址', '网申入口', '截止时间', '备注'],
      ['1', '中芯国际', '半导体', '上海', 'https://smics.zhiye.com/campus', '2026-09-01', '内推码'],
    ]), '秋招');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['单位名称', '网申入口'],
      ['寒武纪', 'https://app.mokahr.com/campus-recruitment/cambricon'],
    ]), '实习');

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
    const parsed = parseCatalogWorkbookBuffer(buffer, '【秋招_春招_实习】汇总表-婉清学姐.xlsx');

    assert.equal(parsed.companies.length, 2);
    assert.equal(parsed.companies[0].name, '中芯国际');
    assert.equal(parsed.companies[0].group, '秋招');
    assert.equal(parsed.companies[0].url, 'https://smics.zhiye.com/campus');
    assert.equal(parsed.companies[1].name, '寒武纪');
    assert.equal(parsed.companies[1].group, '实习');
    assert.deepEqual(parsed.sheets, ['秋招', '实习']);
  });
});
