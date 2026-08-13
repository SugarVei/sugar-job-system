import type { IncomingMessage, ServerResponse } from 'node:http';

export const config = { maxDuration: 120 };

type ExistingStatus = {
  company_key: string;
  status: 'pending' | 'not_started' | 'started' | 'error';
  evidence_text: string | null;
  evidence_url: string | null;
  started_at: string | null;
  last_checked_at: string | null;
  check_count: number;
};

type HotCompany = {
  name: string;
  industry: string;
  city: string;
  url: string;
  recruitment?: { entry?: string };
};

type CheckResult = {
  company: HotCompany;
  companyKey: string;
  status: ExistingStatus['status'];
  evidenceText: string | null;
  evidenceUrl: string;
  errorMessage: string | null;
};

const CHECK_CONCURRENCY = 16;
const FETCH_TIMEOUT_MS = 10_000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_RUN_INTERVAL_MS = 20 * 60 * 60 * 1000;
const COMPANY_SOURCE_URL = 'https://sugar-job-system.vercel.app/api/hot-companies';

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function supabaseHeaders(serviceRoleKey: string, extras?: Record<string, string>) {
  return {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    ...extras,
  };
}

function normalizeCompanyName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/(?:股份有限责任公司|有限责任公司|股份有限公司|集团有限公司|集团公司|有限公司|公司)$/g, '');
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));
}

function pageText(html: string) {
  return decodeHtml(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ').trim();
}

function findEvidence(text: string) {
  const patterns = [
    /(?:2027|27届).{0,90}(?:校园招聘|校招|秋招|应届生招聘).{0,90}(?:正式启动|启动|开启|开放申请|网申|职位|招聘)/i,
    /(?:正式启动|启动|开启|开放申请|网申).{0,90}(?:2027|27届).{0,90}(?:校园招聘|校招|秋招|应届生招聘)/i,
    /(?:2027|27届).{0,50}(?:校园招聘|校招|秋招)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.index !== undefined) {
      const start = Math.max(0, match.index - 45);
      return text.slice(start, Math.min(text.length, match.index + match[0].length + 90));
    }
  }
  return null;
}

function preferredUrl(company: HotCompany) {
  const auditedEntry = company.recruitment?.entry?.trim();
  return auditedEntry && /^https?:\/\//i.test(auditedEntry) ? auditedEntry : company.url;
}

async function inspectCompany(company: HotCompany, previous?: ExistingStatus): Promise<CheckResult> {
  const url = preferredUrl(company);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; SugarCampusRecruitmentMonitor/2.0)',
        accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.5',
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = (await response.text()).slice(0, 2_000_000);
    const text = pageText(html);
    if (text.length < 20) throw new Error('官网未返回可识别的页面文字');

    const evidence = findEvidence(text);
    const keepStarted = previous?.status === 'started' && !evidence;
    return {
      company,
      companyKey: normalizeCompanyName(company.name),
      status: evidence || keepStarted ? 'started' : 'not_started',
      evidenceText: evidence ?? (keepStarted
        ? previous.evidence_text
        : '官网本次未发现明确的 2027 届校招开放信息，请以招聘官网为准。'),
      evidenceUrl: response.url || url,
      errorMessage: null,
    };
  } catch (error) {
    return {
      company,
      companyKey: normalizeCompanyName(company.name),
      status: previous?.status === 'started' ? 'started' : 'error',
      evidenceText: previous?.evidence_text ?? null,
      evidenceUrl: previous?.evidence_url ?? url,
      errorMessage: (error instanceof Error ? error.message : String(error)).slice(0, 500),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex]);
    }
  }));

  return results;
}

type VercelResponse = ServerResponse & {
  status: (statusCode: number) => VercelResponse;
  json: (body: unknown) => void;
};

export default async function handler(request: IncomingMessage, response: VercelResponse) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed' });

  const cronSecret = process.env.CRON_SECRET;
  const authorizedBySecret = Boolean(cronSecret)
    && request.headers.authorization === `Bearer ${cronSecret}`;
  const authorizedByVercelCron = !cronSecret
    && request.headers['user-agent'] === 'vercel-cron/1.0';
  if (!authorizedBySecret && !authorizedByVercelCron) {
    return response.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabaseUrl = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
    const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    const [companyResponse, statusResponse] = await Promise.all([
      fetch(COMPANY_SOURCE_URL, { headers: { accept: 'application/json' } }),
      fetch(
        `${supabaseUrl}/rest/v1/campus_recruitment_statuses?select=company_key,status,evidence_text,evidence_url,started_at,last_checked_at,check_count`,
        { headers: supabaseHeaders(serviceRoleKey, { accept: 'application/json' }) },
      ),
    ]);
    if (!companyResponse.ok) throw new Error(`公司清单读取失败：HTTP ${companyResponse.status}`);
    if (!statusResponse.ok) throw new Error(`校招状态读取失败：HTTP ${statusResponse.status}`);

    const companySource = await companyResponse.json() as { companies?: HotCompany[] };
    const companies = (companySource.companies ?? []).filter((company) => company.name && company.url);
    if (!companies.length) throw new Error('公司清单为空');
    const data = await statusResponse.json() as ExistingStatus[];
    const latestCheckAt = data.reduce((latest, row) => {
      const checkedAt = row.last_checked_at ? Date.parse(row.last_checked_at) : 0;
      return Math.max(latest, Number.isFinite(checkedAt) ? checkedAt : 0);
    }, 0);
    if (latestCheckAt && Date.now() - latestCheckAt < MIN_RUN_INTERVAL_MS) {
      return response.status(200).json({
        ok: true,
        skipped: true,
        reason: 'already-updated-today',
        lastCheckedAt: new Date(latestCheckAt).toISOString(),
      });
    }

    const previousByKey = new Map(
      ((data ?? []) as ExistingStatus[]).map((row) => [row.company_key, row]),
    );
    const results = await mapWithConcurrency(companies, CHECK_CONCURRENCY, (company) => {
      const companyKey = normalizeCompanyName(company.name);
      return inspectCompany(company, previousByKey.get(companyKey));
    });

    const checkedAt = new Date().toISOString();
    const nextCheckAt = new Date(Date.now() + DAY_MS).toISOString();
    const payloads = results.map((result) => {
      const previous = previousByKey.get(result.companyKey);
      return {
        company_key: result.companyKey,
        company_name: result.company.name,
        official_url: preferredUrl(result.company),
        status: result.status,
        evidence_text: result.evidenceText,
        evidence_url: result.evidenceUrl,
        last_checked_at: checkedAt,
        next_check_at: nextCheckAt,
        started_at: result.status === 'started' ? previous?.started_at ?? checkedAt : null,
        error_message: result.errorMessage,
        check_count: (previous?.check_count ?? 0) + 1,
        updated_at: checkedAt,
      };
    });

    for (let index = 0; index < payloads.length; index += 50) {
      const writeResponse = await fetch(
        `${supabaseUrl}/rest/v1/campus_recruitment_statuses?on_conflict=company_key`,
        {
          method: 'POST',
          headers: supabaseHeaders(serviceRoleKey, {
            'content-type': 'application/json',
            prefer: 'resolution=merge-duplicates,return=minimal',
          }),
          body: JSON.stringify(payloads.slice(index, index + 50)),
        },
      );
      if (!writeResponse.ok) {
        throw new Error(`校招状态写入失败：HTTP ${writeResponse.status}`);
      }
    }

    const summary = results.reduce(
      (counts, result) => ({ ...counts, [result.status]: counts[result.status] + 1 }),
      { pending: 0, not_started: 0, started: 0, error: 0 },
    );
    return response.status(200).json({ ok: true, checked: results.length, summary, checkedAt });
  } catch (error) {
    console.error('[cron-campus-recruitment] failed', error);
    return response.status(500).json({ error: 'Campus recruitment update failed' });
  }
}
