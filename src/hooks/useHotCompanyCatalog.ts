import { useMemo } from 'react';
import { type HotCompany, type HotCompanyGroup } from '../data/hotCompanies';
import { EXCEL_CAMPUS_COMPANIES } from '../data/excelCampusRecruitment2027';
import { flattenCatalogGroups, type StandardCompanyOverlay } from '../lib/standardCompanyCatalog';
import { applicationCompanyMatchesHotCompany, normalizeCompanyName } from '../lib/companyName';
import type { Application, Company } from '../types';
import { useCollection } from './useCollection';
import { useCompanyRecommendations } from './useCompanyRecommendations';
import { useStandardCompanyOverlay } from './useStandardCompanyOverlay';

export const ALL_GROUP_NAME = '全部';
export const APPLIED_GROUP_NAME = '已投递';
export const AI_GROUP_NAME = '我添加的公司';

function companyIndustryTags(company: HotCompany) {
  return company.industryTags?.length ? company.industryTags : [company.industry || '其他'];
}

function groupsFromCompanies(companies: HotCompany[]): HotCompanyGroup[] {
  const groups = new Map<string, HotCompany[]>();
  companies.forEach((company) => {
    companyIndustryTags(company).forEach((tag) => {
      const name = tag.trim() || '其他';
      const rows = groups.get(name) ?? [];
      rows.push(company);
      groups.set(name, rows);
    });
  });
  return Array.from(groups, ([name, rows], index) => ({
    name,
    dot: ['#8ba3bd', '#93a98c', '#a08cb5', '#c39aa0', '#c49b68'][index % 5],
    companies: rows,
  }));
}

function overlayCompanies(items: StandardCompanyOverlay[], excelCompanies: HotCompany[]) {
  const excelByName = new Map(excelCompanies.map((company) => [normalizeCompanyName(company.name), company]));
  return items.map((row): HotCompany => {
    const excel = excelByName.get(normalizeCompanyName(row.company_name));
    if (excel) {
      const industry = row.industry || excel.industry;
      return {
        ...excel,
        updateDate: row.source_update_date || excel.updateDate,
        companyType: row.company_type || excel.companyType,
        industry,
        industryTags: row.industry
          ? industry.split(/[、,，/|]+/u).map((tag) => tag.trim()).filter(Boolean)
          : excel.industryTags,
        city: row.city || excel.city,
        url: row.url || excel.url,
        noticeUrl: row.notice_url || excel.noticeUrl,
        applyUrl: row.apply_url || excel.applyUrl || row.url || excel.url,
        deadlineText: row.deadline_text || excel.deadlineText,
      };
    }
    return {
      name: row.company_name,
      updateDate: row.source_update_date || undefined,
      companyType: row.company_type || undefined,
      industry: row.industry || '其他',
      industryTags: row.industry ? row.industry.split(/[、,，/|]+/u).map((tag) => tag.trim()).filter(Boolean) : ['其他'],
      city: row.city || '',
      noticeUrl: row.notice_url || '',
      applyUrl: row.apply_url || row.url || '',
      deadlineText: row.deadline_text || '',
      url: row.url || '',
      source: 'excel',
    };
  });
}

export function useHotCompanyCatalog() {
  const companies = useCollection<Company>('companies');
  const applications = useCollection<Application>('applications');
  const recommendations = useCompanyRecommendations();
  const overlay = useStandardCompanyOverlay();
  const excelCompanies = EXCEL_CAMPUS_COMPANIES;
  const standardCompanies = useMemo(() => {
    const overlayRows = overlayCompanies(overlay.items, excelCompanies);
    const byName = new Map<string, HotCompany>();
    [...excelCompanies, ...overlayRows].forEach((company) => {
      byName.set(normalizeCompanyName(company.name), company);
    });
    return Array.from(byName.values());
  }, [overlay.items, excelCompanies]);

  const importedCompanies = useMemo(() => Array.from(
    new Map(
      recommendations.items
        .filter((item) => item.recommendation_type === 'private')
        .map((item) => [normalizeCompanyName(item.company_name), {
          name: item.company_name,
          industry: item.industry || '其他',
          city: item.city || '',
          url: item.website || '',
          industryTags: item.industry ? item.industry.split(/[、,，/|]+/u).map((tag) => tag.trim()).filter(Boolean) : ['其他'],
          source: 'private',
        } satisfies HotCompany]),
    ).values(),
  ), [recommendations.items]);

  const allGroups = useMemo<HotCompanyGroup[]>(() => {
    const importedGroup = importedCompanies.length > 0
      ? [{ name: AI_GROUP_NAME, dot: '#a08cb5', companies: importedCompanies }]
      : [];
    return [...groupsFromCompanies(standardCompanies), ...importedGroup];
  }, [importedCompanies, standardCompanies]);

  const standardCatalogRows = useMemo(
    () => flattenCatalogGroups(groupsFromCompanies(standardCompanies)),
    [standardCompanies],
  );

  const standardCompanyKeys = useMemo(
    () => new Set(standardCompanies.map((company) => normalizeCompanyName(company.name))),
    [standardCompanies],
  );

  const accountOnlyCompanies = useMemo<HotCompany[]>(
    () => importedCompanies.filter((company) => !standardCompanyKeys.has(normalizeCompanyName(company.name))),
    [importedCompanies, standardCompanyKeys],
  );

  const recruitmentOverviewCompanies = useMemo<HotCompany[]>(
    () => [...standardCompanies, ...accountOnlyCompanies],
    [accountOnlyCompanies, standardCompanies],
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
    standardCompanies,
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
