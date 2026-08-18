import { useMemo } from 'react';
import { FEATURED_COMPANY_GROUPS, HOT_COMPANY_GROUPS, type HotCompany, type HotCompanyGroup } from '../data/hotCompanies';
import { flattenCatalogGroups, mergeStandardCatalog } from '../lib/standardCompanyCatalog';
import { applicationCompanyMatchesHotCompany, normalizeCompanyName } from '../lib/companyName';
import type { Application, Company } from '../types';
import { useCollection } from './useCollection';
import { useCompanyRecommendations } from './useCompanyRecommendations';
import { useStandardCompanyOverlay } from './useStandardCompanyOverlay';

export const ALL_GROUP_NAME = '全部';
export const APPLIED_GROUP_NAME = '已投递';
export const AI_GROUP_NAME = '我添加的公司';

export function useHotCompanyCatalog() {
  const companies = useCollection<Company>('companies');
  const applications = useCollection<Application>('applications');
  const recommendations = useCompanyRecommendations();
  const overlay = useStandardCompanyOverlay();
  const standardCatalog = useMemo(
    () => mergeStandardCatalog([...FEATURED_COMPANY_GROUPS, ...HOT_COMPANY_GROUPS], overlay.items),
    [overlay.items],
  );

  const importedCompanies = useMemo(() => Array.from(
    new Map(
      recommendations.items
        .filter((item) => item.recommendation_type === 'private')
        .map((item) => [normalizeCompanyName(item.company_name), {
          name: item.company_name,
          industry: item.industry || '其他',
          city: item.city || '',
          url: item.website || '',
        } satisfies HotCompany]),
    ).values(),
  ), [recommendations.items]);

  const allGroups = useMemo<HotCompanyGroup[]>(() => {
    const importedGroup = importedCompanies.length > 0
      ? [{ name: AI_GROUP_NAME, dot: '#a08cb5', companies: importedCompanies }]
      : [];
    return [...standardCatalog.groups, ...importedGroup];
  }, [importedCompanies, standardCatalog.groups]);

  const standardCatalogRows = useMemo(
    () => flattenCatalogGroups(standardCatalog.groups),
    [standardCatalog.groups],
  );

  const standardCompanyKeys = useMemo(
    () => new Set(standardCatalog.companies.map((company) => normalizeCompanyName(company.name))),
    [standardCatalog.companies],
  );

  const accountOnlyCompanies = useMemo<HotCompany[]>(
    () => importedCompanies.filter((company) => !standardCompanyKeys.has(normalizeCompanyName(company.name))),
    [importedCompanies, standardCompanyKeys],
  );

  const recruitmentOverviewCompanies = useMemo<HotCompany[]>(
    () => [...standardCatalog.companies, ...accountOnlyCompanies],
    [accountOnlyCompanies, standardCatalog.companies],
  );

  const appliedCompanies = useMemo<HotCompany[]>(() => {
    const unique = new Map<string, HotCompany>();
    applications.items.forEach((application) => {
      const knownCompany = recruitmentOverviewCompanies.find((company) =>
        applicationCompanyMatchesHotCompany(application.company_name, company.name));
      const savedCompany = companies.items.find((company) =>
        company.id === application.company_id
        || applicationCompanyMatchesHotCompany(application.company_name, company.company_name));
      const company = knownCompany ?? {
        name: savedCompany?.company_name || application.company_name,
        industry: savedCompany?.industry || '其他',
        city: savedCompany?.city || application.city || '',
        url: savedCompany?.website || '',
      };
      const key = normalizeCompanyName(company.name);
      if (key && !unique.has(key)) unique.set(key, company);
    });
    return Array.from(unique.values());
  }, [applications.items, companies.items, recruitmentOverviewCompanies]);

  const legendGroupNames = useMemo(
    () => [ALL_GROUP_NAME, APPLIED_GROUP_NAME, ...allGroups.map((group) => group.name)],
    [allGroups],
  );

  return {
    savedCompanies: companies.items,
    createCompany: companies.create,
    removeCompany: companies.remove,
    applications: applications.items,
    companyRecommendations: recommendations.items,
    refreshCompanyRecommendations: recommendations.refresh,
    removeRecommendation: recommendations.remove,
    importedCompanies,
    standardCompanies: standardCatalog.companies,
    standardCatalogRows,
    refreshStandardCatalog: overlay.refresh,
    standardCatalogUpdatedAt: overlay.latestUpdatedAt,
    standardCatalogError: overlay.error,
    allGroups,
    appliedCompanies,
    accountOnlyCompanies,
    recruitmentOverviewCompanies,
    legendGroupNames,
  };
}

export function groupsForCatalogSelection(
  allGroups: HotCompanyGroup[],
  appliedCompanies: HotCompany[],
  activeGroup: string,
): HotCompanyGroup[] {
  if (activeGroup === ALL_GROUP_NAME) return allGroups;
  if (activeGroup === APPLIED_GROUP_NAME) {
    return [{ name: APPLIED_GROUP_NAME, dot: '#6f8f72', companies: appliedCompanies }];
  }
  return allGroups.filter((group) => group.name === activeGroup);
}

export function uniqueCompaniesInGroups(groups: HotCompanyGroup[]): Array<{ company: HotCompany; group: HotCompanyGroup }> {
  const seen = new Set<string>();
  const rows: Array<{ company: HotCompany; group: HotCompanyGroup }> = [];
  groups.forEach((group) => {
    group.companies.forEach((company) => {
      const key = normalizeCompanyName(company.name);
      if (!key || seen.has(key)) return;
      seen.add(key);
      rows.push({ company, group });
    });
  });
  return rows;
}
