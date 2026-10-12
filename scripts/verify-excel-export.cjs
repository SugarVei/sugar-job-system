// Run with: node scripts/verify-excel-export.cjs
// Tests package structure and lossless detail export without opening a browser.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const JSZip = require('jszip');
const XLSX = require('xlsx-js-style');

require.extensions['.ts'] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  });
  module._compile(result.outputText, filename);
};
const filename = path.resolve(__dirname, '../src/lib/exportExcel.ts');
const moduleTask = new Module(filename);
moduleTask.filename = filename;
moduleTask.paths = Module._nodeModulePaths(path.dirname(filename));
require.extensions['.ts'](moduleTask, filename);
const { createApplicationsExcel } = moduleTask.exports;
const statuses = ['待投递','已投递','在线测评','AI面','HR面','一面','二面','Offer','已拒绝','已放弃','人才库','待跟进'];

function item(i) {
  return {
    company_name: `公司 ${i}`, position_name: '岗位', city: i % 2 ? '深圳' : null,
    channel: `渠道 ${i % 20}`, apply_date: '2026-09-30', status: statuses[i % 12],
    salary_range: null, priority: 'normal', next_action: null, next_action_at: null,
    deadline_at: null, match_score: i === 0 ? 0 : null, jd_keywords: ['生产','计划'],
    notes: i === 0 ? '第一行\n第二行<&>' : null, created_at: '2026-09-30',
  };
}

async function verify(items, hasChart) {
  const buffer = await createApplicationsExcel(items, new Date(2026, 8, 30));
  const zip = await JSZip.loadAsync(buffer);
  const workbook = XLSX.read(buffer, { type: 'array' });
  const detail = workbook.Sheets['投递明细'];
  assert.equal(detail.G2.v, '当前状态');
  assert.equal(XLSX.utils.decode_range(detail['!ref']).e.r + 1, items.length + 2);
  items.forEach((app, i) => {
    assert.equal(detail[`B${i + 3}`].v, app.company_name);
    assert.equal(detail[`G${i + 3}`].v, app.status);
    assert.equal(detail[`O${i + 3}`].v, app.notes ?? '');
  });
  if (items.length && items[0].match_score === 0) {
    assert.equal(detail.M3.t, 'n');
    assert.equal(detail.M3.v, 0);
  }
  const overview = workbook.Sheets['投递总览'];
  assert.equal(overview.B5.v, items.length);
  const statusRange = XLSX.utils.sheet_to_json(overview, { header: 1 }).slice(12);
  const names = statusRange.map(row => row[0]);
  for (const status of new Set(items.map(app => app.status))) assert(names.includes(status));
  for (let n = 1; n <= 3; n++) {
    const xml = await zip.file(`xl/worksheets/sheet${n}.xml`).async('text');
    assert(xml.includes('showGridLines="0"'));
    assert(!/<c\b[^>]*\br="A\d+"/.test(xml), 'A column must remain an empty margin');
    if (n === 2) {
      assert(xml.includes('ySplit="2"'));
      assert(xml.includes('topLeftCell="B3"'));
    }
  }
  assert.equal(!!zip.file('xl/charts/chart1.xml'), hasChart);
  if (hasChart) {
    const xml = await zip.file('xl/charts/chart1.xml').async('text');
    const line = xml.match(/<c:lineChart>[\s\S]*?<\/c:lineChart>/)[0];
    assert.equal((line.match(/<c:axId/g) ?? []).length, 2);
    assert(!xml.includes('<c:tickMark'));
    assert(xml.includes("'周度趋势'!$B$4:$B$"));
    assert(xml.includes("'周度趋势'!$C$4:$C$"));
    const drawing = await zip.file('xl/drawings/drawing1.xml').async('text');
    assert(!drawing.includes('moveWithCells'));
    assert(!drawing.includes('sizeWithCells'));
  }
}

(async () => {
  await verify(Array.from({ length: 172 }, (_, i) => item(i)), true);
  await verify([], false);
  await verify([{ ...item(0), apply_date: null }], false);
  await verify([{ ...item(0), apply_date: '2026-02-30' }], false);
  await verify([{ ...item(0), status: '自定义状态', match_score: Number.NaN }], true);
  await verify([{ ...item(0), apply_date: '2021-01-01' }], true);
  console.log('PASS: six export cases, OOXML chart references, frozen panes, all statuses, numeric zero, empty and invalid dates.');
})().catch(error => { console.error(error); process.exitCode = 1; });
