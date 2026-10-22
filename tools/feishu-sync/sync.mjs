import { createPrivateKey, sign } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import XLSX from 'xlsx-js-style';
import { validateWorkbook, TARGET_TABLE_ID } from './probe.mjs';
import { parseSheetMatrix, STANDARD_CATALOG_MAX_ROWS } from '../../src/lib/standardCompanyImport.ts';

const action = process.argv[2] || 'preview';
if (!['preview', 'apply', 'parse'].includes(action)) throw new Error('Expected parse, preview, or apply');
const stateDir = process.env.FEISHU_SYNC_STATE_DIR || join(homedir(), '.sugar-job-system', 'feishu-sync');
const output = join(stateDir, 'output');
const downloaded = JSON.parse(await readFile(join(output, 'last-success.json'), 'utf8'));
const bytes = await readFile(downloaded.file);
const validation = validateWorkbook(bytes);
if (validation.sha256 !== downloaded.sha256) throw new Error('WORKBOOK_HASH_MISMATCH');
const book = XLSX.read(bytes, { type: 'buffer', raw: false, cellStyles: false });
const sheet = validation.sheets[0].name;
const parsed = parseSheetMatrix(XLSX.utils.sheet_to_json(book.Sheets[sheet], { header: 1, raw: false, defval: '', blankrows: false }), sheet);
if (!parsed.companies.length || parsed.companies.length > STANDARD_CATALOG_MAX_ROWS) throw new Error('SOURCE_COMPANY_LIMIT');
const metadata = { sourceRows: validation.rowCount, eligibleCompanies: parsed.companies.length, skipped: parsed.skipped.length, workbookSha256: validation.sha256 };
if (action === 'parse') {
  console.log(JSON.stringify(metadata, null, 2));
} else {
  const endpoint = process.env.FEISHU_CATALOG_SYNC_URL;
  if (!endpoint || new URL(endpoint).protocol !== 'https:') throw new Error('SYNC_ENDPOINT_NOT_CONFIGURED');
  const pem = process.env.FEISHU_SYNC_SIGNING_KEY || await readFile(join(stateDir, 'sync-signing-private.pem'), 'utf8');
  const body = JSON.stringify({ action, source_table_id: TARGET_TABLE_ID, workbook_sha256: validation.sha256,
    source_row_count: validation.rowCount, skipped_count: parsed.skipped.length, companies: parsed.companies });
  const timestamp = String(Date.now());
  const signature = sign(null, Buffer.from(`${timestamp}\n${body}`), createPrivateKey(pem)).toString('base64url');
  const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json',
    'x-catalog-timestamp': timestamp, 'x-catalog-signature': signature }, body, signal: AbortSignal.timeout(180_000) });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(`SYNC_FAILED:${result.error || response.status}`);
  await writeFile(join(output, 'last-sync.json'), JSON.stringify({ ...metadata, ...result }, null, 2));
  console.log(JSON.stringify({ ...metadata, ...result }, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) {
    await writeFile(process.env.GITHUB_STEP_SUMMARY, `### 飞书公司库同步\n\n模式：${action}\n\n源记录：${metadata.sourceRows}；符合规则公司：${metadata.eligibleCompanies}\n\n新增：${result.summary.added}；更新：${result.summary.updated}；未变：${result.summary.unchanged}\n`);
  }
}
