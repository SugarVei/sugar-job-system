import test from 'node:test';
import assert from 'node:assert/strict';
import XLSX from 'xlsx-js-style';
import { cloudSessionState, validateWorkbook } from './probe.mjs';

test('cloud session retains login proof but excludes document caches and other websites', () => {
  const auth = { origin: 'https://accounts.feishu.cn', localStorage: [{ name: 'dpop_tg_key_pair_v1', value: 'test-login-proof' }] };
  const state = cloudSessionState({ cookies: [
    { name: 'session', value: 'test-session', domain: '.feishu.cn' },
    { name: 'unrelated', value: 'test-unrelated', domain: 'example.com' },
  ], origins: [auth, { origin: 'https://yal2at57cvq.feishu.cn', localStorage: [{ name: 'base_chunk0_tmpl_data', value: 'document-cache' }] }] });
  assert.deepEqual(state.origins, [auth]);
  assert.equal(state.cookies.length, 1);
  assert.equal(state.cookies[0].name, 'session');
});

test('rejects incomplete cookies-only login state and proof on an untrusted origin', () => {
  const cookies = [{ name: 'session', value: 'test-session', domain: '.feishu.cn' }];
  assert.throws(() => cloudSessionState({ cookies, origins: [] }), /SESSION_KEY_MISSING/u);
  assert.throws(() => cloudSessionState({ cookies, origins: [{ origin: 'https://accounts.feishu.cn.example.com', localStorage: [{ name: 'dpop_tg_key_pair_v1', value: 'test-proof' }] }] }), /SESSION_KEY_MISSING/u);
  assert.throws(() => cloudSessionState({ cookies: [], origins: [] }), /SESSION_MISSING/u);
});

function workbook(sheets) {
  const book = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), name);
  return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' });
}
const rows = [['公司名称', '届次', '投递链接'], ['示例企业', '2027届', 'https://example.com']];

test('accepts a nonempty target workbook and counts companies after explanatory rows', () => {
  const bytes = workbook({ '26、27校招汇总表': [['说明'], ...rows, ['', '', '']] });
  const result = validateWorkbook(bytes);
  assert.equal(result.rowCount, 1);
  assert.match(result.sha256, /^[a-f0-9]{64}$/u);
});
test('selects the target sheet instead of unrelated sheets', () => {
  const result = validateWorkbook(workbook({ '其他表': [['无关']], '26、27校招汇总表': rows }));
  assert.equal(result.sheets.length, 1);
  assert.equal(result.sheets[0].name, '26、27校招汇总表');
});
test('rejects login HTML disguised as an Excel download', () => {
  assert.throws(() => validateWorkbook(Buffer.from('<html>请登录</html>')), /INVALID_WORKBOOK/u);
});
test('rejects corrupt xlsx and files beyond the import size limit', () => {
  assert.throws(() => validateWorkbook(Buffer.from('PK broken')), /INVALID_WORKBOOK/u);
  assert.throws(() => validateWorkbook(Buffer.alloc(20 * 1024 * 1024 + 1)), /INVALID_WORKBOOK/u);
});
test('rejects ambiguous multiple sheets and missing required columns', () => {
  assert.throws(() => validateWorkbook(workbook({ a: rows, b: rows })), /TARGET_SHEET_MISSING/u);
  assert.throws(() => validateWorkbook(workbook({ Sheet1: [['公司名称'], ['示例企业']] })), /HEADERS_MISSING/u);
});
test('rejects empty source data so it cannot replace a successful export', () => {
  assert.throws(() => validateWorkbook(workbook({ Sheet1: [rows[0]] })), /EMPTY_WORKBOOK/u);
});
