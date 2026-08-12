import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const [sourceArg, migrationArg] = process.argv.slice(2);

if (!sourceArg || !migrationArg) {
  console.error('Usage: node scripts/generate-campus-recruitment-audit.mjs <source.md> <migration.sql>');
  process.exit(1);
}

const root = resolve(import.meta.dirname, '..');
const sourcePath = resolve(sourceArg);
const migrationPath = resolve(root, migrationArg);
const dataPath = resolve(root, 'src/data/campusRecruitmentAudit20260811.ts');
const snapshotPath = resolve(root, 'docs/2027届校招核查结果-20260811.md');
const hotCompaniesPath = resolve(root, 'src/data/hotCompanies.ts');

const statusKeys = new Map([
  ['已开招', 'started'],
  ['即将开招/预热', 'warmup'],
  ['未开招', 'not_started'],
  ['仅社招/实习', 'internship_only'],
  ['链接失效/无法判断', 'unknown'],
]);

const source = readFileSync(sourcePath, 'utf8');
const rows = [];
let group = '';

for (const line of source.split(/\r?\n/u)) {
  const heading = line.match(/^## (.+)$/u);
  if (heading && !['总览', '说明'].includes(heading[1])) {
    group = heading[1];
    continue;
  }

  const cells = line.match(/^\| ([^|]+?) \| ([^|]+?) \| ([^|]+?) \| (.+?) \|$/u);
  if (!cells) continue;
  const status = statusKeys.get(cells[2].trim());
  if (!status) continue;

  rows.push({
    group,
    name: cells[1].trim(),
    status,
    statusLabel: cells[2].trim(),
    evidence: cells[3].trim(),
    entry: cells[4].trim(),
  });
}

if (rows.length !== 131) {
  throw new Error(`Expected 131 company rows, received ${rows.length}`);
}

const summary = Object.fromEntries([...statusKeys.values()].map((status) => [status, 0]));
for (const row of rows) summary[row.status] += 1;
const expected = { started: 45, warmup: 17, not_started: 36, internship_only: 21, unknown: 12 };
if (JSON.stringify(summary) !== JSON.stringify(expected)) {
  throw new Error(`Unexpected status totals: ${JSON.stringify(summary)}`);
}

const hotCompaniesSource = readFileSync(hotCompaniesPath, 'utf8');
const currentUrls = new Map(
  [...hotCompaniesSource.matchAll(/\{ name: "([^"]+)", industry: "[^"]*", city: "[^"]*", url: "([^"]+)" \}/gu)]
    .map((match) => [match[1], match[2]]),
);
const currentNames = new Set(currentUrls.keys());
const incomingNames = new Set(rows.map((row) => row.name));
const onlyCurrent = [...currentNames].filter((name) => !incomingNames.has(name));
const onlyIncoming = [...incomingNames].filter((name) => !currentNames.has(name));
if (onlyCurrent.length || onlyIncoming.length) {
  throw new Error(`Company mismatch. Only current: ${onlyCurrent.join(', ')}; only incoming: ${onlyIncoming.join(', ')}`);
}

const tsString = (value) => `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
const sqlString = (value) => `'${value.replaceAll("'", "''")}'`;
const isUrl = (value) => /^https?:\/\//iu.test(value);
const normalizeCompanyName = (name) => name
  .trim()
  .toLocaleLowerCase('zh-CN')
  .replace(/\s+/gu, '')
  .replace(/(?:股份有限责任公司|有限责任公司|股份有限公司|集团有限公司|集团公司|有限公司|公司)$/u, '');

const generatedHeader = `/**\n * Generated from docs/2027届校招核查结果-20260811.md.\n * Run scripts/generate-campus-recruitment-audit.mjs to refresh; do not hand-edit rows.\n */`;
const tsRows = rows.map((row) =>
  `  ${tsString(row.name)}: { status: ${tsString(row.status)}, evidence: ${tsString(row.evidence)}, entry: ${tsString(row.entry)}, checkedAt: '2026-08-11' },`,
);
const tsOutput = `${generatedHeader}\n\nexport type RecruitmentStatusKey = 'started' | 'warmup' | 'not_started' | 'internship_only' | 'unknown';\n\nexport interface CampusRecruitmentAudit {\n  status: RecruitmentStatusKey;\n  evidence: string;\n  entry: string;\n  checkedAt: string;\n}\n\nexport const CAMPUS_RECRUITMENT_AUDIT: Record<string, CampusRecruitmentAudit> = {\n${tsRows.join('\n')}\n};\n\nexport const CAMPUS_RECRUITMENT_STATUS_TOTALS: Record<RecruitmentStatusKey, number> = ${JSON.stringify(summary, null, 2)};\n`;

const checkedAtSql = "'2026-08-11T08:00:00-07:00'::timestamptz";
const sqlRows = rows.map((row) => {
  const currentUrl = currentUrls.get(row.name);
  const officialUrl = isUrl(row.entry) ? row.entry : currentUrl;
  const evidenceUrl = isUrl(row.entry) ? sqlString(row.entry) : 'null';
  const dbStatus = row.status === 'started' ? 'started' : 'not_started';
  const startedAt = row.status === 'started' ? checkedAtSql : 'null';
  const nextCheckAt = row.status === 'started' ? 'null' : checkedAtSql;
  const evidence = `【核查状态：${row.statusLabel}】${row.evidence}；建议入口：${row.entry}`;
  return `(${sqlString(normalizeCompanyName(row.name))}, ${sqlString(row.name)}, ${sqlString(officialUrl)}, '${dbStatus}', ${sqlString(evidence)}, ${evidenceUrl}, ${checkedAtSql}, ${startedAt}, ${nextCheckAt})`;
});
const sqlOutput = `-- Generated from docs/2027届校招核查结果-20260811.md.\n-- Safe data upsert: no table, policy, or permission changes.\n\ndo $$\nbegin\n  if to_regclass('public.campus_recruitment_statuses') is null then\n    raise exception 'public.campus_recruitment_statuses does not exist; apply migration_campus_recruitment_status.sql first';\n  end if;\nend $$;\n\ninsert into public.campus_recruitment_statuses (\n  company_key, company_name, official_url, status, evidence_text, evidence_url,\n  last_checked_at, started_at, next_check_at\n) values\n${sqlRows.join(',\n')}\non conflict (company_key) do update set\n  company_name = excluded.company_name,\n  official_url = excluded.official_url,\n  status = excluded.status,\n  evidence_text = excluded.evidence_text,\n  evidence_url = excluded.evidence_url,\n  last_checked_at = greatest(public.campus_recruitment_statuses.last_checked_at, excluded.last_checked_at),\n  started_at = case\n    when excluded.status = 'started' then coalesce(public.campus_recruitment_statuses.started_at, excluded.started_at)\n    else null\n  end,\n  next_check_at = case\n    when excluded.status = 'started' then null\n    else greatest(public.campus_recruitment_statuses.next_check_at, excluded.next_check_at)\n  end,\n  error_message = null,\n  updated_at = now(),\n  check_count = public.campus_recruitment_statuses.check_count + 1;\n`;

mkdirSync(dirname(dataPath), { recursive: true });
mkdirSync(dirname(migrationPath), { recursive: true });
mkdirSync(dirname(snapshotPath), { recursive: true });
writeFileSync(dataPath, tsOutput, 'utf8');
writeFileSync(migrationPath, sqlOutput, 'utf8');
copyFileSync(sourcePath, snapshotPath);

console.log(JSON.stringify({ rows: rows.length, summary, dataPath, migrationPath, snapshotPath }, null, 2));
