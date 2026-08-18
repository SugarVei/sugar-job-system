import { FEATURED_COMPANY_GROUPS, HOT_COMPANY_GROUPS } from '../src/data/hotCompanies';
import { normalizeCompanyName } from '../src/lib/companyName';
import { flattenCatalogGroups, mergeStandardCatalog, type StandardCompanyOverlay } from '../src/lib/standardCompanyCatalog';
import { canManageStandardCatalog } from '../src/lib/standardCatalogAdmin';
import { STANDARD_CATALOG_OVERLAY_LIMIT, catalogUploadErrorMessage, diffCatalog } from '../src/lib/standardCompanyImport';
import { catalogFromImportBody } from './_lib/standard-company-file';

type NativeRequest = { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown };
type NativeResponse = { status(code: number): NativeResponse; json(body: unknown): void; setHeader(name: string, value: string): void; end(): void };

const PREVIEW_LIMIT = 40;
const requests = new Map<string, { count: number; reset: number }>();

function header(request: NativeRequest, name: string) {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function clientIp(request: NativeRequest) {
  return header(request, 'x-forwarded-for').split(',')[0]?.trim() || 'unknown';
}

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function rateLimit(key: string) {
  const now = Date.now();
  const item = requests.get(key);
  if (!item || item.reset <= now) {
    requests.set(key, { count: 1, reset: now + 60_000 });
    return true;
  }
  item.count += 1;
  return item.count <= 8;
}

function setCors(request: NativeRequest, response: NativeResponse) {
  const origin = header(request, 'origin');
  const allowed = new Set(['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:8080', 'http://127.0.0.1:8080']);
  if (process.env.ALLOWED_ORIGIN) allowed.add(process.env.ALLOWED_ORIGIN);
  if (process.env.VERCEL_URL) allowed.add(`https://${process.env.VERCEL_URL}`);
  if (allowed.has(origin)) response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Vary', 'Origin');
}

function canManageCatalog(email: string | undefined) {
  return canManageStandardCatalog(email, process.env.STANDARD_CATALOG_ADMIN_EMAIL);
}

function missingTable(error: { message?: string; code?: string } | null) {
  return error?.code === '42P01' || /does not exist|schema cache/i.test(error?.message ?? '');
}

function readBody(request: NativeRequest) {
  if (typeof request.body === 'string') return JSON.parse(request.body) as Record<string, unknown>;
  return (request.body ?? {}) as Record<string, unknown>;
}

async function requireUser(request: NativeRequest) {
  const authorization = header(request, 'authorization');
  if (!authorization.startsWith('Bearer ')) throw new Error('Unauthorized');
  const result = await fetch(`${required('SUPABASE_URL')}/auth/v1/user`, {
    headers: { apikey: required('SUPABASE_ANON_KEY'), authorization },
  });
  if (!result.ok) throw new Error('Unauthorized');
  const user = await result.json() as { id?: string; email?: string };
  if (!user.id) throw new Error('Unauthorized');
  return { id: user.id, email: user.email };
}

function supabaseHeaders(serviceRoleKey: string, extras?: Record<string, string>) {
  return {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    ...extras,
  };
}

async function loadOverlay(supabaseUrl: string, serviceRoleKey: string) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/standard_companies?select=company_key,company_name,industry,city,url,group_name,updated_at&limit=${STANDARD_CATALOG_OVERLAY_LIMIT}`,
    { headers: supabaseHeaders(serviceRoleKey, { accept: 'application/json' }) },
  );
  if (response.status === 404) throw new Error('TABLE_MISSING');
  if (!response.ok) {
    const text = await response.text();
    if (/does not exist|schema cache/i.test(text)) throw new Error('TABLE_MISSING');
    throw new Error(`READ_FAILED:${response.status}`);
  }
  return await response.json() as StandardCompanyOverlay[];
}

function currentCatalog(overlay: StandardCompanyOverlay[]) {
  return flattenCatalogGroups(
    mergeStandardCatalog([...FEATURED_COMPANY_GROUPS, ...HOT_COMPANY_GROUPS], overlay).groups,
  );
}

export default async function handler(request: NativeRequest, response: NativeResponse) {
  setCors(request, response);
  if (request.method === 'OPTIONS') return response.status(204).end();
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await requireUser(request);
    if (!canManageCatalog(user.email)) {
      return response.status(403).json({ error: '当前账号没有更新标准公司库的权限。' });
    }
    if (!rateLimit(`standard-catalog:${user.id}:${clientIp(request)}`)) {
      return response.status(429).json({ error: '导入请求过于频繁，请稍后再试。' });
    }

    const body = readBody(request);
    const action = body.action === 'apply' ? 'apply' : 'preview';
    const fileName = typeof body.file_name === 'string' ? body.file_name.slice(0, 180) : '';
    const parsed = catalogFromImportBody(body);

    const supabaseUrl = required('SUPABASE_URL').replace(/\/$/, '');
    const serviceRoleKey = required('SUPABASE_SERVICE_ROLE_KEY');
    const overlay = await loadOverlay(supabaseUrl, serviceRoleKey);
    const diff = diffCatalog(currentCatalog(overlay), parsed.companies);
    const skipped = [...parsed.skipped, ...diff.rows.filter((row) => row.kind === 'skip')];
    const added = diff.rows.filter((row) => row.kind === 'add');
    const updated = diff.rows.filter((row) => row.kind === 'update');
    const unchanged = diff.rows.filter((row) => row.kind === 'unchanged');
    const summary = {
      added: added.length,
      updated: updated.length,
      unchanged: unchanged.length,
      skipped: skipped.length,
      sheets: parsed.sheets,
    };

    if (action === 'preview') {
      return response.status(200).json({
        summary,
        added: added.slice(0, PREVIEW_LIMIT),
        updated: updated.slice(0, PREVIEW_LIMIT),
        skipped: skipped.slice(0, PREVIEW_LIMIT),
      });
    }

    if (diff.upserts.length === 0) {
      return response.status(200).json({ ok: true, summary, written: 0 });
    }

    const checkedAt = new Date().toISOString();
    const payloads = diff.upserts.map((company) => ({
      company_key: normalizeCompanyName(company.name),
      company_name: company.name,
      industry: company.industry,
      city: company.city,
      url: company.url,
      group_name: company.group,
      source: 'excel_import',
      updated_by: user.id,
      updated_at: checkedAt,
    }));

    for (let index = 0; index < payloads.length; index += 80) {
      const writeResponse = await fetch(
        `${supabaseUrl}/rest/v1/standard_companies?on_conflict=company_key`,
        {
          method: 'POST',
          headers: supabaseHeaders(serviceRoleKey, {
            'content-type': 'application/json',
            prefer: 'resolution=merge-duplicates,return=minimal',
          }),
          body: JSON.stringify(payloads.slice(index, index + 80)),
        },
      );
      if (!writeResponse.ok) {
        const text = await writeResponse.text();
        if (writeResponse.status === 404 || /does not exist|schema cache/i.test(text)) throw new Error('TABLE_MISSING');
        throw new Error(`WRITE_FAILED:${writeResponse.status}`);
      }
    }

    const runResponse = await fetch(`${supabaseUrl}/rest/v1/standard_company_import_runs`, {
      method: 'POST',
      headers: supabaseHeaders(serviceRoleKey, {
        'content-type': 'application/json',
        prefer: 'return=minimal',
      }),
      body: JSON.stringify({
        user_id: user.id,
        file_name: fileName.slice(0, 180) || 'catalog.xlsx',
        added_count: summary.added,
        updated_count: summary.updated,
        unchanged_count: summary.unchanged,
        skipped_count: summary.skipped,
      }),
    });
    if (!runResponse.ok && runResponse.status !== 404) {
      const text = await runResponse.text();
      if (!missingTable({ message: text })) throw new Error(`RUN_FAILED:${runResponse.status}`);
    }

    return response.status(200).json({ ok: true, summary, written: payloads.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'Unauthorized') return response.status(401).json({ error: '登录已失效，请重新登录后再试。' });
    const uploadError = catalogUploadErrorMessage(message);
    if (uploadError) return response.status(message === 'FILE_TOO_LARGE' ? 413 : 400).json({ error: uploadError });
    if (message === 'TABLE_MISSING') {
      return response.status(503).json({ error: '标准公司库数据表尚未创建。请先在 Supabase 执行 standard_company_catalog 迁移。' });
    }
    console.error('[standard-companies-import] failed', error);
    return response.status(503).json({ error: '标准公司库暂时无法更新，请稍后重试。' });
  }
}
