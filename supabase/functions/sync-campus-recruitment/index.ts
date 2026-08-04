import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

type Company = { name: string; industry: string; city: string; url: string };
type ExistingStatus = {
  company_key: string;
  status: 'pending' | 'not_started' | 'started' | 'error';
  next_check_at: string | null;
  check_count: number;
};

const COMPANY_SOURCE_URL = 'https://sugar-job-system.vercel.app/api/hot-companies';
const BATCH_SIZE = 8;
const FETCH_TIMEOUT_MS = 12_000;
const DAY_MS = 24 * 60 * 60 * 1000;
const ERROR_RETRY_MS = 6 * 60 * 60 * 1000;

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

function searchablePageText(html: string) {
  return decodeHtml(html.replace(/<[^>]+>/g, ' ')).replace(/\\?\s+/g, ' ').trim();
}

function findEvidence(text: string) {
  const explicitPatterns = [
    /(?:2027|27届).{0,90}(?:校园招聘|校招|秋招|应届生招聘).{0,90}(?:正式启动|启动|开启|开放申请|网申|职位|招聘)/i,
    /(?:正式启动|启动|开启|开放申请|网申).{0,90}(?:2027|27届).{0,90}(?:校园招聘|校招|秋招|应届生招聘)/i,
    /(?:2027|27届).{0,50}(?:校园招聘|校招|秋招)/i,
  ];

  for (const pattern of explicitPatterns) {
    const match = text.match(pattern);
    if (match?.index !== undefined) {
      const start = Math.max(0, match.index - 45);
      return text.slice(start, Math.min(text.length, match.index + match[0].length + 90));
    }
  }
  return null;
}

async function inspectOfficialPage(company: Company) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(company.url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; SugarCampusRecruitmentMonitor/1.0)',
        accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.5',
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = (await response.text()).slice(0, 2_000_000);
    const text = pageText(html);
    if (text.length < 20) throw new Error('官网未返回可识别的页面文字');
    return { evidence: findEvidence(text) ?? findEvidence(searchablePageText(html)), finalUrl: response.url || company.url };
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: 'Missing Supabase runtime secrets' }, { status: 500 });
  }

  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const sourceResponse = await fetch(COMPANY_SOURCE_URL, {
      headers: { accept: 'application/json' },
    });
    if (!sourceResponse.ok) throw new Error(`公司清单读取失败：HTTP ${sourceResponse.status}`);
    const source = await sourceResponse.json() as { companies?: Company[] };
    const companies = (source.companies ?? []).filter((company) => company.name && company.url);

    const { data: rows, error: readError } = await db
      .from('campus_recruitment_statuses')
      .select('company_key,status,next_check_at,check_count');
    if (readError) throw readError;

    const now = Date.now();
    const byKey = new Map((rows as ExistingStatus[] ?? []).map((row) => [row.company_key, row]));
    const allDue = companies.filter((company) => {
      const row = byKey.get(normalizeCompanyName(company.name));
      if (!row) return true;
      if (row.status === 'started') return false;
      return !row.next_check_at || new Date(row.next_check_at).getTime() <= now;
    });
    const due = allDue.slice(0, BATCH_SIZE);

    const results = await Promise.all(due.map(async (company) => {
      const companyKey = normalizeCompanyName(company.name);
      const previous = byKey.get(companyKey);
      try {
        const inspection = await inspectOfficialPage(company);
        const started = Boolean(inspection.evidence);
        const checkedAt = new Date().toISOString();
        const payload = {
          company_key: companyKey,
          company_name: company.name,
          official_url: company.url,
          status: started ? 'started' : 'not_started',
          evidence_text: inspection.evidence,
          evidence_url: inspection.finalUrl,
          last_checked_at: checkedAt,
          next_check_at: started ? null : new Date(Date.now() + DAY_MS).toISOString(),
          started_at: started ? checkedAt : null,
          error_message: null,
          check_count: (previous?.check_count ?? 0) + 1,
          updated_at: checkedAt,
        };
        const { error } = await db.from('campus_recruitment_statuses').upsert(payload, { onConflict: 'company_key' });
        if (error) throw error;
        return { company: company.name, status: payload.status };
      } catch (error) {
        const checkedAt = new Date().toISOString();
        const message = error instanceof Error ? error.message : String(error);
        const { error: writeError } = await db.from('campus_recruitment_statuses').upsert({
          company_key: companyKey,
          company_name: company.name,
          official_url: company.url,
          status: 'error',
          evidence_text: null,
          evidence_url: company.url,
          last_checked_at: checkedAt,
          next_check_at: new Date(Date.now() + ERROR_RETRY_MS).toISOString(),
          error_message: message.slice(0, 500),
          check_count: (previous?.check_count ?? 0) + 1,
          updated_at: checkedAt,
        }, { onConflict: 'company_key' });
        if (writeError) throw writeError;
        return { company: company.name, status: 'error', error: message };
      }
    }));

    return Response.json({ checked: results.length, remainingDue: Math.max(0, allDue.length - results.length), results });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Campus recruitment sync failed', message);
    return Response.json({ error: message }, { status: 500 });
  }
});
