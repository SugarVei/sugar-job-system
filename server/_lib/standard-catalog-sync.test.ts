import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { handleCatalogSync } from './standard-catalog-sync';

const keys = generateKeyPairSync('ed25519');
const publicKey = keys.publicKey.export({ format: 'jwk' }).x!;
const env = { supabaseUrl: 'https://catalog-test.invalid', serviceRoleKey: 'test-only-key', publicKey };
const incoming = (name = '同步验证示例') => ({ name, updateDate: '2026-10-21', companyType: '民企', industry: '科技', city: '', deadlineText: '', noticeUrl: '', applyUrl: 'https://example.com/apply', url: 'https://example.com/apply', group: '秋招专场', sheet: '26、27校招汇总表' });
function request(action: 'preview' | 'apply', companies = [incoming()], timestamp = String(Date.now())) {
  const body = JSON.stringify({ action, source_table_id: 'tblH4au5rnBcqHgJ', workbook_sha256: 'a'.repeat(64), companies, skipped_count: 2 });
  return new Request('https://catalog-test.invalid/sync', { method: 'POST', body, headers: {
    'x-catalog-timestamp': timestamp,
    'x-catalog-signature': sign(null, Buffer.from(`${timestamp}\n${body}`), keys.privateKey).toString('base64url'),
  } });
}

function database(initial: Record<string, unknown>[] = []) {
  const rows = [...initial];
  const writes: Array<{ path: string; rows: unknown }> = [];
  let reads = 0;
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    if (init?.method === 'POST') {
      const payload = JSON.parse(String(init.body));
      writes.push({ path: url.pathname, rows: payload });
      if (url.pathname.endsWith('/standard_companies')) {
        for (const row of payload) {
          const at = rows.findIndex((existing) => existing.company_name === row.company_name);
          if (at < 0) rows.push(row); else rows[at] = row;
        }
      }
      return new Response(null, { status: 201 });
    }
    if (url.pathname.endsWith('/standard_company_import_runs')) return Response.json([{ user_id: '00000000-0000-4000-8000-000000000001' }]);
    reads += 1;
    const offset = Number(url.searchParams.get('offset'));
    return Response.json(rows.slice(offset, offset + 1000));
  }) as typeof fetch;
  return { fetcher, rows, writes, get reads() { return reads; } };
}

test('rejects unsigned, expired, and tampered payloads before accessing the database', async () => {
  const db = database();
  const unsigned = await handleCatalogSync(new Request('https://example.com', { method: 'POST', body: '{}' }), env, db.fetcher);
  assert.equal(unsigned.status, 401);
  assert.equal((await handleCatalogSync(request('apply', [incoming()], String(Date.now() - 121_000)), env, db.fetcher)).status, 401);
  const signed = request('apply');
  const tampered = new Request(signed.url, { method: 'POST', headers: signed.headers, body: (await signed.text()).replace('同步验证示例', '被篡改的名称') });
  assert.equal((await handleCatalogSync(tampered, env, db.fetcher)).status, 401);
  assert.equal(db.reads, 0);
  assert.equal(db.writes.length, 0);
});

test('preview reads beyond 4000 companies and performs no writes', async () => {
  const rows = Array.from({ length: 5001 }, (_, index) => ({ company_name: `已有企业${index}`, industry: '科技', city: '上海', url: 'https://example.com/old', group_name: '秋招专场' }));
  const db = database(rows);
  const response = await handleCatalogSync(request('preview', [incoming('已有企业5000')]), env, db.fetcher);
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.summary.added, 0);
  assert.equal(result.summary.updated, 1);
  assert.equal(db.reads, 6);
  assert.equal(db.writes.length, 0);
});

test('apply merges fields, preserves unrelated companies, and becomes unchanged on retry', async () => {
  const db = database([{ company_name: '同步验证示例', city: '上海', industry: '科技', url: 'https://example.com/old', group_name: '秋招专场' }, { company_name: '不在源表的公司', city: '北京' }]);
  const first = await handleCatalogSync(request('apply', [incoming(), incoming('自动新增示例')]), env, db.fetcher);
  const result = await first.json();
  assert.equal(first.status, 200);
  assert.equal(result.written, 2);
  assert.equal(db.rows.find((row) => row.company_name === '同步验证示例')?.city, '上海');
  assert.ok(db.rows.some((row) => row.company_name === '不在源表的公司'));
  assert.equal(db.writes.filter((write) => write.path.endsWith('/standard_companies')).length, 1);
  const retry = await (await handleCatalogSync(request('apply', [incoming(), incoming('自动新增示例')]), env, db.fetcher)).json();
  assert.equal(retry.written, 0);
  assert.equal(retry.summary.unchanged, 2);
  assert.equal(db.writes.filter((write) => write.path.endsWith('/standard_companies')).length, 1);
});

test('database read failure never reaches a write', async () => {
  let calls = 0;
  const failed = (async (_input, init) => { assert.notEqual(init?.method, 'POST'); calls += 1; return new Response(null, { status: 500 }); }) as typeof fetch;
  const response = await handleCatalogSync(request('apply'), env, failed);
  assert.equal(response.status, 503);
  assert.equal(calls, 1);
});
