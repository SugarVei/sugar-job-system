import type { Application, Interview } from '../types';
import { normalizeCompanyName } from './companyName';

export interface CompanyCandidate {
  key: string;
  name: string;
  score: number;
  applications: Application[];
}

export function interviewCompanyKey(value: string) {
  const clean = value.normalize('NFKC').toLocaleLowerCase('zh-CN')
    .replace(/[（(][^）)]*[）)]/gu, '')
    .replace(/(?:第?[一二三四五六七八九十\d]+(?:轮|面|场)|[一二三四五六七八九十\d]+)$/u, '')
    .replace(/[\s·•_\-—.,，。]/gu, '');
  return normalizeCompanyName(clean);
}

function distance(a: string, b: string) {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length];
}

function companyScore(interviewName: string, applicationName: string) {
  if (!interviewName || !applicationName) return 0;
  if (interviewName === applicationName) return 100;
  const shorter = interviewName.length <= applicationName.length ? interviewName : applicationName;
  const longer = interviewName.length > applicationName.length ? interviewName : applicationName;
  if (shorter.length >= 2 && longer.startsWith(shorter)) return 82 + Math.min(12, shorter.length * 2);
  if (shorter.length >= 2 && longer.includes(shorter)) return 76 + Math.min(10, shorter.length * 2);
  if (shorter.length >= 4 && distance(interviewName, applicationName) === 1) return 72;
  return 0;
}

export function rankInterviewCompanies(interviewName: string, applications: Application[]): CompanyCandidate[] {
  const query = interviewCompanyKey(interviewName);
  if (!query) return [];
  const groups = new Map<string, CompanyCandidate>();
  for (const application of applications) {
    const key = interviewCompanyKey(application.company_name);
    const score = companyScore(query, key);
    if (score < 70) continue;
    const existing = groups.get(key);
    if (existing) {
      existing.applications.push(application);
      if (score > existing.score) existing.score = score;
    } else {
      groups.set(key, { key, name: application.company_name, score, applications: [application] });
    }
  }
  return [...groups.values()].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'zh-CN'));
}

/** Only choose a company when it clearly beats every other candidate. */
export function automaticInterviewCompany(candidates: CompanyCandidate[]) {
  const first = candidates[0];
  if (!first || first.score < 80) return null;
  if (first.score === 100 && candidates[1]?.score !== 100) return first;
  return !candidates[1] || first.score - candidates[1].score >= 15 ? first : null;
}

export function matchingInterviewPosition(interview: Interview, applications: Application[]) {
  if (applications.length === 1) return applications[0];
  const role = interview.position_name?.normalize('NFKC').replace(/\s+/gu, '').toLocaleLowerCase('zh-CN');
  if (!role) return null;
  const matching = applications.filter(application => application.position_name.normalize('NFKC').replace(/\s+/gu, '').toLocaleLowerCase('zh-CN') === role);
  return matching.length === 1 ? matching[0] : null;
}
