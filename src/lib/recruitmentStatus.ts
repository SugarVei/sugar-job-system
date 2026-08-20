import { seedStatusForCompany } from '../data/campusRecruitmentSeed';
import type { HotCompany } from '../data/hotCompanies';
import type { CampusRecruitmentStatus } from '../hooks/useCampusRecruitmentStatuses';

export type RecruitmentPillKind = 'ok' | 'warn' | 'info' | 'muted';

export interface RecruitmentPill {
  label: string;
  kind: RecruitmentPillKind;
}

export function companyRecruitmentUrl(company: HotCompany): string {
  const entry = company.recruitment?.entry;
  return entry && /^https?:\/\//iu.test(entry) ? entry : company.url;
}

export function recruitmentPill(company: HotCompany, dbStatus?: CampusRecruitmentStatus): RecruitmentPill {
  const audit = company.recruitment?.status;
  if (dbStatus?.status === 'started' || audit === 'started') return { label: '已开招', kind: 'ok' };
  if (audit === 'warmup') return { label: '预热中', kind: 'info' };
  if (audit === 'internship_only') return { label: '仅社招/实习', kind: 'muted' };
  if ((dbStatus?.status === 'not_started' && dbStatus.last_checked_at) || audit === 'not_started') {
    return { label: '未开招', kind: 'warn' };
  }
  if (dbStatus?.status === 'error') return { label: '待复查', kind: 'muted' };

  const seed = seedStatusForCompany(company.name, company.url);
  if (seed.status === 'started') return { label: '已开招', kind: 'ok' };
  return { label: '未开招', kind: 'warn' };
}
