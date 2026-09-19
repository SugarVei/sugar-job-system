import type { Application, ApplicationStatus, Interview } from '../types';
import { APPLICATION_STATUSES, APPLICATION_STATUS_FLOW } from './applicationStatus';

export const INTERVIEW_STATUSES: readonly ApplicationStatus[] = ['AI面', 'HR面', '一面', '二面'];

const normalize = (value: string | null) => (value ?? '').trim().toLocaleLowerCase();

export function summarizeApplications(applications: Application[]) {
  const counts = Object.fromEntries(APPLICATION_STATUSES.map(status => [status, 0])) as Record<ApplicationStatus, number>;
  const companies = new Set<string>();
  let applied = 0;
  for (const application of applications) {
    counts[application.status] = (counts[application.status] ?? 0) + 1;
    if (application.status !== '待投递') {
      applied += 1;
      const company = normalize(application.company_name);
      if (company) companies.add(company);
    }
  }
  return {
    counts,
    applied,
    companies: companies.size,
    interviewing: INTERVIEW_STATUSES.reduce((sum, status) => sum + counts[status], 0),
    offers: counts.Offer,
    followUp: counts['待跟进'],
    stages: APPLICATION_STATUS_FLOW.map(status => ({ status, count: counts[status] })),
  };
}

export function timestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

/** Match both company and role; a company-only calendar entry is safe only for one distinct role. */
export function relatedInterviews(interviews: Interview[], applications: Application[], now = Date.now(), allApplications = applications) {
  const rolesByCompany = new Map<string, Set<string>>();
  const visibleRoles = new Map<string, Set<string>>();
  for (const application of applications) {
    const company = normalize(application.company_name);
    const roles = visibleRoles.get(company) ?? new Set<string>();
    roles.add(normalize(application.position_name));
    visibleRoles.set(company, roles);
  }
  for (const application of allApplications) {
    const company = normalize(application.company_name);
    if (!company) continue;
    const roles = rolesByCompany.get(company) ?? new Set<string>();
    roles.add(normalize(application.position_name));
    rolesByCompany.set(company, roles);
  }
  return interviews.filter(interview => {
    const company = normalize(interview.company_name);
    const roles = rolesByCompany.get(company);
    const visible = visibleRoles.get(company);
    if (!roles || !visible) return false;
    const role = normalize(interview.position_name);
    return role ? visible.has(role) : roles.size === 1;
  }).sort((a, b) => {
    const aTime = timestamp(a.interview_time);
    const bTime = timestamp(b.interview_time);
    if (aTime === null) return bTime === null ? 0 : 1;
    if (bTime === null) return -1;
    const aUpcoming = aTime >= now;
    const bUpcoming = bTime >= now;
    if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
    return aUpcoming ? aTime - bTime : bTime - aTime;
  });
}
