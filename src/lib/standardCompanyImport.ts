import { normalizeCompanyName } from './companyName';

export const STANDARD_CATALOG_MAX_ROWS = 4000;
export const STANDARD_CATALOG_MAX_FILE_BYTES = 20 * 1024 * 1024;
export const STANDARD_CATALOG_MAX_SHEETS = 40;
export const STANDARD_CATALOG_HEADER_SCAN_ROWS = 30;
export const STANDARD_CATALOG_OVERLAY_LIMIT = 4000;
export const DEFAULT_IMPORT_GROUP = '飞书导入';

export type CatalogColumnKind = 'name' | 'industry' | 'city' | 'url' | 'group';

export type IncomingCompany = {
  name: string;
  industry: string;
  city: string;
  url: string;
  group: string;
  sheet: string;
};

export type CatalogCompany = {
  name: string;
  industry: string;
  city: string;
  url: string;
  group: string;
};

export type DiffKind = 'add' | 'update' | 'unchanged' | 'skip';

export type CatalogDiffRow = {
  kind: DiffKind;
  reason?: string;
  incoming: IncomingCompany;
  current?: CatalogCompany;
  next?: CatalogCompany;
};

export type CatalogDiffSummary = {
  added: number;
  updated: number;
  unchanged: number;
  skipped: number;
};

export type SheetMatrix = { name: string; rows: unknown[][] };

const HEADER_ALIASES: Record<CatalogColumnKind, Array<{ match: RegExp; weight: number }>> = {
  name: [
    { match: /^(?:公司名称|企业名称|单位名称|招录单位|公司全称|公司简称|公司名|companyname|company)$/u, weight: 6 },
    { match: /(?:公司名称|企业名称|单位名称|招录单位|公司全称)/u, weight: 5 },
    { match: /^(?:公司|企业|名称|name)$/u, weight: 3 },
  ],
  industry: [
    { match: /^(?:行业分类|所属行业|行业|赛道|industry)$/u, weight: 5 },
    { match: /(?:行业分类|所属行业)/u, weight: 4 },
  ],
  city: [
    { match: /^(?:工作地址|工作地点|城市|地点|总部|所在地|city|location)$/u, weight: 5 },
    { match: /(?:工作地址|工作地点)/u, weight: 4 },
  ],
  url: [
    { match: /^(?:校招链接|校招网址|校招入口|网申链接|网申入口|网申地址|投递链接|投递入口)$/u, weight: 6 },
    { match: /(?:网申入口|网申地址|网申链接|投递链接|投递入口|校招链接)/u, weight: 5 },
    { match: /^(?:招聘官网|招聘链接|招聘网址|相关链接)$/u, weight: 4 },
    { match: /^(?:官网|网址|website|url|entry)$/u, weight: 4 },
    { match: /^(?:链接|link)$/u, weight: 2 },
  ],
  group: [
    { match: /^(?:招聘类型|分组|板块|批次|类别|group|category)$/u, weight: 4 },
  ],
};

const SKIPPED_HEADER = /备注|内推|推荐人|是否开招|开招状态|截止日期|截止时间|状态说明|note|comment|referral|status/iu;

function stripControlChars(value: string) {
  let cleaned = '';
  for (const char of value) {
    const code = char.charCodeAt(0);
    cleaned += code < 32 || code === 127 ? ' ' : char;
  }
  return cleaned;
}

export function sanitizePlainText(value: unknown, maxLength = 80) {
  return stripControlChars(String(value ?? ''))
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, maxLength);
}

export function normalizeHeader(value: unknown) {
  return sanitizePlainText(value, 40)
    .toLocaleLowerCase('zh-CN')
    .replace(/[\s:：()（）[\]【】]/gu, '');
}

function headerScore(header: string, kind: CatalogColumnKind) {
  if (!header || SKIPPED_HEADER.test(header)) return 0;
  return HEADER_ALIASES[kind].find((item) => item.match.test(header))?.weight ?? 0;
}

export function detectColumnMap(headers: unknown[]) {
  const map: Partial<Record<CatalogColumnKind, number>> = {};
  const scores: Partial<Record<CatalogColumnKind, number>> = {};

  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    (Object.keys(HEADER_ALIASES) as CatalogColumnKind[]).forEach((kind) => {
      const score = headerScore(normalized, kind);
      if (score > (scores[kind] ?? 0)) {
        scores[kind] = score;
        map[kind] = index;
      }
    });
  });

  return map;
}

export function findHeaderRow(rows: unknown[][]) {
  let best = { index: -1, score: 0, map: {} as Partial<Record<CatalogColumnKind, number>> };
  rows.slice(0, STANDARD_CATALOG_HEADER_SCAN_ROWS).forEach((row, index) => {
    const map = detectColumnMap(row);
    const score = (map.name == null ? 0 : 10) + Object.keys(map).length;
    if (map.name != null && score > best.score) best = { index, score, map };
  });
  return best.index >= 0 ? best : null;
}

export function groupFromSheetName(name: string) {
  const text = sanitizePlainText(name, 40);
  if (/实习/u.test(text)) return '实习';
  if (/春招/u.test(text)) return '春招';
  if (/秋招|校招/u.test(text)) return '秋招';
  return '';
}

export function isMissingCompanyColumn(parsed: { companies: IncomingCompany[]; skipped: CatalogDiffRow[] }) {
  return parsed.companies.length === 0 && parsed.skipped.every((row) => row.reason === '缺少公司名' || !row.reason);
}

export function catalogUploadErrorMessage(code: string) {
  if (code === 'INVALID_FILE') return '无法读取这个 Excel。请另存为未加密的 .xlsx 后再试，文件名可以包含中文和【】。';
  if (code === 'FILE_TOO_LARGE') return 'Excel 不能超过 20MB。请先去掉说明页、图片或多余列后再导出。';
  if (code === 'NO_COMPANY_COLUMN') {
    return '没有识别到公司名列。请确认表头包含「公司名称」「单位名称」或「企业名称」；秋招 / 春招 / 实习分表也可以。';
  }
  return '';
}

export function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function sanitizeIncomingCompany(input: {
  name: unknown;
  industry?: unknown;
  city?: unknown;
  url?: unknown;
  group?: unknown;
  sheet?: string;
}): { ok: true; company: IncomingCompany } | { ok: false; reason: string; company: IncomingCompany } {
  const name = sanitizePlainText(input.name);
  const industry = sanitizePlainText(input.industry);
  const city = sanitizePlainText(input.city);
  const group = sanitizePlainText(input.group);
  const rawUrl = sanitizePlainText(input.url, 500);
  const company: IncomingCompany = {
    name,
    industry,
    city,
    url: rawUrl,
    group,
    sheet: input.sheet || 'Sheet1',
  };

  if (!name) return { ok: false, reason: '缺少公司名', company };
  if (/^https?:\/\//iu.test(name)) return { ok: false, reason: '公司名不能是网址', company };
  if (rawUrl && !isHttpUrl(rawUrl)) return { ok: false, reason: '网址无效', company };
  return { ok: true, company };
}

export function parseSheetMatrix(rows: unknown[][], sheet = 'Sheet1') {
  const header = findHeaderRow(rows);
  if (!header) return { companies: [] as IncomingCompany[], skipped: [] as CatalogDiffRow[] };

  const companies: IncomingCompany[] = [];
  const skipped: CatalogDiffRow[] = [];
  const seen = new Set<string>();

  rows.slice(header.index + 1).forEach((row) => {
    if (!Array.isArray(row) || row.every((cell) => sanitizePlainText(cell) === '')) return;
    const parsed = sanitizeIncomingCompany({
      name: header.map.name == null ? '' : row[header.map.name],
      industry: header.map.industry == null ? '' : row[header.map.industry],
      city: header.map.city == null ? '' : row[header.map.city],
      url: header.map.url == null ? '' : row[header.map.url],
      group: (header.map.group == null ? '' : row[header.map.group]) || groupFromSheetName(sheet),
      sheet,
    });
    if (!parsed.ok) {
      skipped.push({ kind: 'skip', reason: parsed.reason, incoming: parsed.company });
      return;
    }
    const key = normalizeCompanyName(parsed.company.name);
    if (!key) {
      skipped.push({ kind: 'skip', reason: '缺少公司名', incoming: parsed.company });
      return;
    }
    if (seen.has(key)) {
      skipped.push({ kind: 'skip', reason: '重复行', incoming: parsed.company });
      return;
    }
    seen.add(key);
    companies.push(parsed.company);
  });

  return { companies, skipped };
}

export function collectIncomingCompanies(sheets: SheetMatrix[]) {
  const companies: IncomingCompany[] = [];
  const skipped: CatalogDiffRow[] = [];
  const seen = new Set<string>();

  sheets.slice(0, STANDARD_CATALOG_MAX_SHEETS).forEach((sheet) => {
    if (companies.length >= STANDARD_CATALOG_MAX_ROWS) return;
    const parsed = parseSheetMatrix(sheet.rows, sheet.name);
    skipped.push(...parsed.skipped);
    parsed.companies.forEach((company) => {
      if (companies.length >= STANDARD_CATALOG_MAX_ROWS) return;
      const key = normalizeCompanyName(company.name);
      if (!key) return;
      if (seen.has(key)) {
        skipped.push({ kind: 'skip', reason: '重复行', incoming: company });
        return;
      }
      seen.add(key);
      companies.push(company);
    });
  });

  return { companies, skipped, sheets: sheets.map((sheet) => sheet.name) };
}

export function resolveImportedGroup(incoming: IncomingCompany, currentGroup?: string) {
  return incoming.group || groupFromSheetName(incoming.sheet) || currentGroup || incoming.industry || DEFAULT_IMPORT_GROUP;
}

export function normalizeImportedCompanies(raw: unknown[]) {
  const companies: IncomingCompany[] = [];
  const skipped: CatalogDiffRow[] = [];
  const seen = new Set<string>();
  const sheets = new Set<string>();

  raw.slice(0, STANDARD_CATALOG_MAX_ROWS * 2).forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const row = item as Record<string, unknown>;
    const parsed = sanitizeIncomingCompany({
      name: row.name,
      industry: row.industry,
      city: row.city,
      url: row.url,
      group: row.group || groupFromSheetName(String(row.sheet ?? '')),
      sheet: sanitizePlainText(row.sheet, 40) || 'Sheet1',
    });
    sheets.add(parsed.company.sheet);
    if (!parsed.ok) {
      skipped.push({ kind: 'skip', reason: parsed.reason, incoming: parsed.company });
      return;
    }
    const key = normalizeCompanyName(parsed.company.name);
    if (!key) {
      skipped.push({ kind: 'skip', reason: '缺少公司名', incoming: parsed.company });
      return;
    }
    if (seen.has(key) || companies.length >= STANDARD_CATALOG_MAX_ROWS) {
      skipped.push({ kind: 'skip', reason: seen.has(key) ? '重复行' : '超过导入上限', incoming: parsed.company });
      return;
    }
    seen.add(key);
    companies.push(parsed.company);
  });

  return { companies, skipped, sheets: Array.from(sheets) };
}

export function mergeCompanyFields(incoming: IncomingCompany, current?: CatalogCompany): CatalogCompany {
  return {
    name: current?.name || incoming.name,
    industry: incoming.industry || current?.industry || '其他',
    city: incoming.city || current?.city || '',
    url: incoming.url || current?.url || '',
    group: resolveImportedGroup(incoming, current?.group),
  };
}

function sameCatalogCompany(left: CatalogCompany, right: CatalogCompany) {
  return left.industry === right.industry
    && left.city === right.city
    && left.url === right.url
    && left.group === right.group;
}

export function diffCatalog(currentCompanies: CatalogCompany[], incomingCompanies: IncomingCompany[]): {
  rows: CatalogDiffRow[];
  summary: CatalogDiffSummary;
  upserts: CatalogCompany[];
} {
  const currentByKey = new Map(
    currentCompanies
      .map((company) => [normalizeCompanyName(company.name), company] as const)
      .filter(([key]) => key),
  );
  const rows: CatalogDiffRow[] = [];
  const upserts: CatalogCompany[] = [];

  incomingCompanies.forEach((incoming) => {
    const current = currentByKey.get(normalizeCompanyName(incoming.name));
    const next = mergeCompanyFields(incoming, current);
    if (!current) {
      rows.push({ kind: 'add', incoming, next });
      upserts.push(next);
      return;
    }
    if (sameCatalogCompany(current, next)) {
      rows.push({ kind: 'unchanged', incoming, current, next });
      return;
    }
    rows.push({ kind: 'update', incoming, current, next });
    upserts.push(next);
  });

  return {
    rows,
    summary: {
      added: rows.filter((row) => row.kind === 'add').length,
      updated: rows.filter((row) => row.kind === 'update').length,
      unchanged: rows.filter((row) => row.kind === 'unchanged').length,
      skipped: rows.filter((row) => row.kind === 'skip').length,
    },
    upserts,
  };
}
