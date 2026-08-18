import type { HotCompany, HotCompanyGroup } from '../data/hotCompanies';
import { normalizeCompanyName } from './companyName';
import { DEFAULT_IMPORT_GROUP, type CatalogCompany } from './standardCompanyImport';

export type StandardCompanyOverlay = {
  company_key: string;
  company_name: string;
  industry: string;
  city: string;
  url: string;
  group_name: string;
  updated_at?: string | null;
};

const EXTRA_GROUP_DOTS = ['#8b7d6b', '#6d8a8a', '#9a7b6f', '#7a8b6d', '#8a7a9a', '#7d8b9a'];

function groupDot(name: string) {
  const sum = Array.from(name).reduce((total, char) => total + char.charCodeAt(0), 0);
  return EXTRA_GROUP_DOTS[sum % EXTRA_GROUP_DOTS.length];
}

export function flattenCatalogGroups(groups: HotCompanyGroup[]): CatalogCompany[] {
  const seen = new Set<string>();
  const rows: CatalogCompany[] = [];
  groups.forEach((group) => {
    group.companies.forEach((company) => {
      const key = normalizeCompanyName(company.name);
      if (!key || seen.has(key)) return;
      seen.add(key);
      rows.push({
        name: company.name,
        industry: company.industry,
        city: company.city,
        url: company.url,
        group: group.name,
      });
    });
  });
  return rows;
}

export function mergeStandardCatalog(
  seedGroups: HotCompanyGroup[],
  overlay: StandardCompanyOverlay[],
): { groups: HotCompanyGroup[]; companies: HotCompany[] } {
  const placements = new Map<string, { company: HotCompany; groupName: string }>();
  const groupMeta: Array<{ name: string; dot: string }> = [];
  const knownDots = new Map<string, string>();

  const rememberGroup = (name: string, dot: string) => {
    if (knownDots.has(name)) return;
    knownDots.set(name, dot);
    groupMeta.push({ name, dot });
  };

  seedGroups.forEach((group) => {
    rememberGroup(group.name, group.dot);
    group.companies.forEach((company) => {
      const key = normalizeCompanyName(company.name);
      if (!key || placements.has(key)) return;
      placements.set(key, { company, groupName: group.name });
    });
  });

  overlay.forEach((row) => {
    const key = row.company_key || normalizeCompanyName(row.company_name);
    if (!key) return;
    const existing = placements.get(key);
    const nextGroup = row.group_name || existing?.groupName || row.industry || DEFAULT_IMPORT_GROUP;
    rememberGroup(nextGroup, existing && nextGroup === existing.groupName
      ? knownDots.get(existing.groupName) || groupDot(nextGroup)
      : knownDots.get(nextGroup) || groupDot(nextGroup));
    placements.set(key, {
      company: {
        name: existing?.company.name || row.company_name,
        industry: row.industry || existing?.company.industry || '其他',
        city: row.city || existing?.company.city || '',
        url: row.url || existing?.company.url || '',
        recruitment: existing?.company.recruitment,
      },
      groupName: nextGroup,
    });
  });

  const buckets = new Map<string, HotCompany[]>();
  groupMeta.forEach((group) => buckets.set(group.name, []));
  placements.forEach(({ company, groupName }) => {
    if (!buckets.has(groupName)) {
      rememberGroup(groupName, groupDot(groupName));
      buckets.set(groupName, []);
    }
    buckets.get(groupName)?.push(company);
  });

  const groups = groupMeta
    .map((group) => ({
      name: group.name,
      dot: knownDots.get(group.name) || group.dot,
      companies: buckets.get(group.name) ?? [],
    }))
    .filter((group) => group.companies.length > 0);

  const companies = Array.from(
    new Map(
      groups
        .flatMap((group) => group.companies)
        .map((company) => [normalizeCompanyName(company.name), company]),
    ).values(),
  );

  return { groups, companies };
}
