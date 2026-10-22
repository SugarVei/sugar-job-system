import { CATALOG_SYNC_PUBLIC_KEY } from './catalog-sync-public-key';
import { normalizeCompanyName } from '../../src/lib/companyName';
import { diffCatalog, normalizeImportedCompanies, STANDARD_CATALOG_MAX_ROWS, type CatalogCompany } from '../../src/lib/standardCompanyImport';
import { EXCEL_CAMPUS_COMPANIES_ALL } from '../../src/data/excelCampusRecruitment2027';

const MAX_BODY_BYTES = 4 * 1024 * 1024;
const encoder = new TextEncoder();
const TABLE_ID = 'tblH4au5rnBcqHgJ';

type SyncEnvironment = { supabaseUrl: string; serviceRoleKey: string; publicKey?: string };
type StoredCompany = {
  company_name: string; source_update_date?: string; company_type?: string;
  industry?: string; city?: string; deadline_text?: string;
  notice_url?: string; apply_url?: string; url?: string; group_name?: string;
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
function base64Bytes(value: string) {
  const base64 = value.replace(/-/gu, '+').replace(/_/gu, '/');
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}
export async function verifyCatalogSignature(request: Request, body: string, publicKey = CATALOG_SYNC_PUBLIC_KEY, now = Date.now()) {
  const timestamp = request.headers.get('x-catalog-timestamp') || '';
  const signature = request.headers.get('x-catalog-signature') || '';
  if (!/^\d{13}$/u.test(timestamp) || Math.abs(now - Number(timestamp)) > 120_000 || !/^[A-Za-z0-9_-]{86}$/u.test(signature)) return false;
  try {
    const key = await crypto.subtle.importKey('raw', base64Bytes(publicKey), { name: 'Ed25519' }, false, ['verify']);
    return crypto.subtle.verify('Ed25519', key, base64Bytes(signature), encoder.encode(`${timestamp}\n${body}`));
  } catch {
    return false;
  }
}

function baselineCatalog(rows: StoredCompany[]): CatalogCompany[] {
  const companies = new Map<string, CatalogCompany>();
  for (const seed of EXCEL_CAMPUS_COMPANIES_ALL) {
    companies.set(normalizeCompanyName(seed.name), { ...seed, group: seed.industry || '飞书导入' });
  }
  for (const row of rows) {
    const key = normalizeCompanyName(row.company_name);
    const seed = companies.get(key);
    companies.set(key, {
      name: row.company_name, updateDate: row.source_update_date || seed?.updateDate || '',
      companyType: row.company_type || seed?.companyType || '', industry: row.industry || seed?.industry || '其他',
      city: row.city || seed?.city || '', deadlineText: row.deadline_text || seed?.deadlineText || '',
      noticeUrl: row.notice_url || seed?.noticeUrl || '', applyUrl: row.apply_url || seed?.applyUrl || row.url || '',
      url: row.url || seed?.url || '', group: row.group_name || seed?.group || '飞书导入',
    });
  }
  return Array.from(companies.values());
}

export async function handleCatalogSync(request: Request, env: SyncEnvironment, fetcher: typeof fetch = fetch) {
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) return reply({ error: 'PAYLOAD_TOO_LARGE' }, 413);
  const rawBody = await request.text();
  if (encoder.encode(rawBody).length > MAX_BODY_BYTES) return reply({ error: 'PAYLOAD_TOO_LARGE' }, 413);
  if (!await verifyCatalogSignature(request, rawBody, env.publicKey)) return reply({ error: 'Unauthorized' }, 401);
  try {
    const body = JSON.parse(rawBody) as Record<string, unknown>;
    if (!['preview', 'apply'].includes(String(body.action)) || body.source_table_id !== TABLE_ID
      || !/^[a-f0-9]{64}$/u.test(String(body.workbook_sha256)) || !Array.isArray(body.companies)
      || !body.companies.length || body.companies.length > STANDARD_CATALOG_MAX_ROWS) {
      return reply({ error: 'INVALID_CATALOG_PAYLOAD' }, 400);
    }
    const incoming = normalizeImportedCompanies(body.companies);
    if (incoming.skipped.length || incoming.companies.length !== body.companies.length) return reply({ error: 'INVALID_COMPANY_ROWS' }, 400);
    if (!env.supabaseUrl || !env.serviceRoleKey) throw new Error('DATABASE_NOT_CONFIGURED');
    const url = env.supabaseUrl.replace(/\/$/u, '');
    const headers = { apikey: env.serviceRoleKey, authorization: `Bearer ${env.serviceRoleKey}` };
    const db = async (path: string, init?: RequestInit) => {
      const response = await fetcher(`${url}/rest/v1/${path}`, { ...init, headers: { ...headers, ...init?.headers }, signal: AbortSignal.timeout(45_000) });
      if (!response.ok) throw new Error(`DATABASE_${response.status}`);
      return response;
    };
    const stored: StoredCompany[] = [];
    const columns = 'company_name,source_update_date,company_type,industry,city,deadline_text,notice_url,apply_url,url,group_name';
    for (let offset = 0; offset < STANDARD_CATALOG_MAX_ROWS; offset += 1000) {
      const page = await (await db(`standard_companies?select=${columns}&order=company_key&offset=${offset}&limit=1000`)).json() as StoredCompany[];
      stored.push(...page);
      if (page.length < 1000) break;
      if (offset + 1000 >= STANDARD_CATALOG_MAX_ROWS) throw new Error('CATALOG_READ_LIMIT');
    }
    const diff = diffCatalog(baselineCatalog(stored), incoming.companies);
    const checkedAt = new Date().toISOString();
    const summary = { ...diff.summary, skipped: Math.max(0, Math.round(Number(body.skipped_count) || 0)) };
    if (body.action === 'preview') return reply({ ok: true, mode: 'preview', summary, sourceCompanies: incoming.companies.length, written: 0,
      examples: diff.rows.filter((row) => row.kind !== 'unchanged').slice(0, 5).map((row) => ({ kind: row.kind, name: row.next?.name || row.incoming.name })) });

    const runs = await (await db('standard_company_import_runs?select=user_id&order=created_at.desc&limit=1')).json() as Array<{ user_id: string }>;
    const ownerId = runs[0]?.user_id;
    if (!ownerId) throw new Error('CATALOG_OWNER_MISSING');
    const payload = diff.upserts.map((company) => ({
      company_key: normalizeCompanyName(company.name), company_name: company.name,
      source_update_date: company.updateDate || null, company_type: company.companyType || '',
      industry: company.industry, city: company.city, deadline_text: company.deadlineText || '',
      notice_url: company.noticeUrl || '', apply_url: company.applyUrl || company.url || '', url: company.url,
      group_name: company.group, source: 'feishu_auto_sync', updated_by: ownerId, updated_at: checkedAt,
    }));
    // One PostgREST upsert runs in one database transaction. A rejected row
    // cannot leave a partly imported catalogue behind. Nothing is deleted.
    if (payload.length) await db('standard_companies?on_conflict=company_key', {
      method: 'POST', headers: { 'content-type': 'application/json', prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(payload),
    });
    await db('standard_company_import_runs', {
      method: 'POST', headers: { 'content-type': 'application/json', prefer: 'return=minimal' },
      body: JSON.stringify({ user_id: ownerId, file_name: `feishu-auto-${checkedAt.slice(0, 10)}.xlsx`,
        added_count: summary.added, updated_count: summary.updated, unchanged_count: summary.unchanged, skipped_count: summary.skipped }),
    });
    return reply({ ok: true, mode: 'apply', checkedAt, sourceCompanies: incoming.companies.length, summary, written: payload.length });
  } catch (error) {
    const code = error instanceof SyntaxError ? 'INVALID_JSON' : error instanceof Error && /^[A-Z0-9_]+$/u.test(error.message) ? error.message : 'CATALOG_SYNC_FAILED';
    return reply({ error: code }, error instanceof SyntaxError ? 400 : 503);
  }
}
