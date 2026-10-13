import type { Application, ApplicationStatus } from '../types';
import { APPLICATION_STATUSES, APPLICATION_STATUS_FLOW } from './applicationStatus';
import { contrastRatio, hexToRgb } from './colorScience';

export const HEATMAP_STAGES = APPLICATION_STATUS_FLOW.filter(status => status !== '待投递');
export const HEATMAP_OTHER_STAGES = APPLICATION_STATUSES.filter(status =>
  status !== '待投递' && !HEATMAP_STAGES.includes(status as typeof HEATMAP_STAGES[number]));

export interface HeatmapCompany {
  key: string;
  name: string;
  stage: ApplicationStatus;
  rank: number;
  latestDate: string;
  applications: Application[];
}

export function heatmapStageRank(status: ApplicationStatus): number {
  return APPLICATION_STATUS_FLOW.indexOf(status as typeof APPLICATION_STATUS_FLOW[number]);
}

function compareRecords(a: Application, b: Application) {
  return heatmapStageRank(b.status) - heatmapStageRank(a.status)
    || (b.apply_date ?? '').localeCompare(a.apply_date ?? '')
    || (b.updated_at ?? b.created_at ?? '').localeCompare(a.updated_at ?? a.created_at ?? '')
    || a.id.localeCompare(b.id);
}

/** Aggregate the account's existing collection without changing any source records.
 * Non-flow statuses contain no history of the last interview round. */
export function summarizeApplicationHeatmap(applications: Application[]) {
  const groups = new Map<string, Application[]>();
  for (const application of applications) {
    if (application.status === '待投递') continue;
    const name = application.company_name.trim();
    const key = name ? `name:${name.toLocaleLowerCase()}` : `unnamed:${application.id}`;
    const group = groups.get(key) ?? [];
    group.push(application);
    groups.set(key, group);
  }
  const companies: HeatmapCompany[] = Array.from(groups, ([key, records]) => {
    const sorted = [...records].sort(compareRecords);
    const inFlow = sorted.filter(application => heatmapStageRank(application.status) > 0);
    const lead = inFlow[0] ?? sorted.find(application => application.status === '待跟进') ?? sorted[0];
    return {
      key,
      name: lead.company_name.trim() || '企业名称未填写',
      stage: lead.status,
      rank: heatmapStageRank(lead.status),
      latestDate: records.reduce((latest, application) => (application.apply_date ?? '') > latest ? application.apply_date! : latest, ''),
      applications: sorted,
    };
  });
  companies.sort((a, b) => b.rank - a.rank || a.name.localeCompare(b.name, 'zh-CN'));
  const counts = Object.fromEntries(APPLICATION_STATUSES.map(status => [status, 0])) as Record<ApplicationStatus, number>;
  for (const company of companies) counts[company.stage] += 1;
  return {
    companies,
    counts,
    applied: companies.reduce((sum, company) => sum + company.applications.length, 0),
    interviewing: companies.filter(company => ['AI面', 'HR面', '一面', '二面', 'Offer'].includes(company.stage)).length,
    offers: counts.Offer,
    pending: applications.filter(application => application.status === '待投递').length,
  };
}

export type HeatmapSort = 'progress' | 'name' | 'date' | 'count';

export function filterHeatmapCompanies(companies: HeatmapCompany[], query: string, stage: ApplicationStatus | 'all', sort: HeatmapSort) {
  const search = query.trim().toLocaleLowerCase();
  return companies.filter(company => (stage === 'all' || company.stage === stage)
    && (!search || [company.name, ...company.applications.flatMap(application => [application.position_name, application.city])]
      .some(value => (value ?? '').toLocaleLowerCase().includes(search))))
    .sort((a, b) => {
      const nameOrder = a.name.localeCompare(b.name, 'zh-CN');
      if (sort === 'name') return nameOrder;
      if (sort === 'date') return b.latestDate.localeCompare(a.latestDate) || b.rank - a.rank || nameOrder;
      if (sort === 'count') return b.applications.length - a.applications.length || b.rank - a.rank || nameOrder;
      return b.rank - a.rank || nameOrder;
    });
}

function blend(accent: string, amount: number) {
  const base = hexToRgb('#fffdf8');
  return '#' + hexToRgb(accent).map((channel, index) =>
    Math.round((channel * amount + base[index] * (1 - amount)) * 255).toString(16).padStart(2, '0')).join('');
}

/** Use one theme hue with increasing intensity, rather than unrelated status colors. */
export function heatmapStatusColors(status: ApplicationStatus, accent: string, soft: string) {
  const rank = heatmapStageRank(status);
  const intensities = [.1, .22, .34, .46, .61, .77, 1];
  const background = rank > 0 ? blend(accent, intensities[rank - 1]) : status === '待跟进' ? soft : '#ede9e2';
  const foreground = contrastRatio(background, '#1b1a17') >= contrastRatio(background, '#ffffff') ? '#1b1a17' : '#ffffff';
  return { backgroundColor: background, color: contrastRatio(background, foreground) >= 4.5 ? foreground : '#000000' };
}
