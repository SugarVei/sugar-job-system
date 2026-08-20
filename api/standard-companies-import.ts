import { requireUserFromJwt } from './_lib/auth';
import { handleOptions, json } from './_lib/cors';
import { catalogFromImportBody } from './_lib/standard-company-file';
import { normalizeCompanyName } from '../src/lib/companyName';
import { canManageStandardCatalog } from '../src/lib/standardCatalogAdmin';
import { catalogUploadErrorMessage } from '../src/lib/standardCompanyImport';

export const config = { runtime: 'edge' };

const requests = new Map<string, { count: number; reset: number }>();

function clientIp(request: Request) {
  return (request.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || 'unknown';
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
  return item.count <= 80;
}

function countFrom(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.min(Math.round(number), 20_000);
}

function missingTable(message: string) {
  return /does not exist|schema cache/i.test(message);
}

function supabaseHeaders(serviceRoleKey: string, extras?: Record<string, string>) {
  return {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    ...extras,
  };
}

export default async function handler(request: Request) {
  if (request.method === 'OPTIONS') return handleOptions(request);
  if (request.method === 'GET') return json(request, { ok: true });
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed' }, 405);

  try {
    const user = await requireUserFromJwt(request);
    if (!canManageStandardCatalog(user.email, process.env.STANDARD_CATALOG_ADMIN_EMAIL)) {
      return json(request, { error: '当前账号没有更新标准公司库的权限。' }, 403);
    }
    if (!rateLimit(`standard-catalog:${user.id}:${clientIp(request)}`)) {
      return json(request, { error: '导入请求过于频繁，请稍后再试。' }, 429);
    }

    const body = await request.json() as Record<string, unknown>;
    if (body.action !== 'apply') {
      return json(request, { error: '预览已在浏览器完成，请直接确认写入。' }, 400);
    }
    const fileName = typeof body.file_name === 'string' ? body.file_name.slice(0, 180) : '';
    const parsed = catalogFromImportBody(body);
    if (parsed.companies.length === 0) {
      return json(request, { ok: true, written: 0 });
    }

    const supabaseUrl = required('SUPABASE_URL').replace(/\/$/, '');
    const serviceRoleKey = required('SUPABASE_SERVICE_ROLE_KEY');
    const checkedAt = new Date().toISOString();
    const payloads = parsed.companies.map((company) => ({
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
        if (writeResponse.status === 404 || missingTable(text)) throw new Error('TABLE_MISSING');
        throw new Error(`WRITE_FAILED:${writeResponse.status}`);
      }
    }

    const run = body.run && typeof body.run === 'object' ? body.run as Record<string, unknown> : null;
    if (run) {
      const runResponse = await fetch(`${supabaseUrl}/rest/v1/standard_company_import_runs`, {
        method: 'POST',
        headers: supabaseHeaders(serviceRoleKey, {
          'content-type': 'application/json',
          prefer: 'return=minimal',
        }),
        body: JSON.stringify({
          user_id: user.id,
          file_name: fileName.slice(0, 180) || 'catalog.xlsx',
          added_count: countFrom(run.added_count ?? run.added),
          updated_count: countFrom(run.updated_count ?? run.updated),
          unchanged_count: countFrom(run.unchanged_count ?? run.unchanged),
          skipped_count: countFrom(run.skipped_count ?? run.skipped),
        }),
      });
      if (!runResponse.ok && runResponse.status !== 404) {
        const text = await runResponse.text();
        if (!missingTable(text)) throw new Error(`RUN_FAILED:${runResponse.status}`);
      }
    }

    return json(request, { ok: true, written: payloads.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'Unauthorized') return json(request, { error: '登录已失效，请重新登录后再试。' }, 401);
    const uploadError = catalogUploadErrorMessage(message);
    if (uploadError) return json(request, { error: uploadError }, message === 'FILE_TOO_LARGE' ? 413 : 400);
    if (message === 'TABLE_MISSING') {
      return json(request, { error: '标准公司库数据表尚未创建。请先在 Supabase 执行 standard_company_catalog 迁移。' }, 503);
    }
    console.error('[standard-companies-import] failed', error);
    return json(request, { error: '标准公司库暂时无法更新，请稍后重试。' }, 503);
  }
}
