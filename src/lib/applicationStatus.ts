import type { ApplicationStatus } from '../types';

export const APPLICATION_STATUSES = [
  '待投递',
  '已投递',
  '简历筛选',
  'AI面',
  '笔试',
  '一面',
  '二面',
  'HR面',
  'Offer',
  '已拒绝',
  '已放弃',
  '人才库',
  '待跟进',
] as const satisfies readonly ApplicationStatus[];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> =
  Object.fromEntries(APPLICATION_STATUSES.map((status) => [status, status])) as Record<ApplicationStatus, string>;

export const APPLICATION_STATUS_FLOW = [
  '待投递',
  '已投递',
  '简历筛选',
  'AI面',
  '笔试',
  '一面',
  '二面',
  'HR面',
  'Offer',
] as const satisfies readonly ApplicationStatus[];

export type ApplicationStatusGroup = 'active' | 'success' | 'terminal' | 'followUp';

export function getNextApplicationStatus(status: ApplicationStatus): ApplicationStatus | null {
  const index = APPLICATION_STATUS_FLOW.indexOf(status as (typeof APPLICATION_STATUS_FLOW)[number]);
  return index >= 0 && index < APPLICATION_STATUS_FLOW.length - 1
    ? APPLICATION_STATUS_FLOW[index + 1]
    : null;
}

export function getStatusGroup(status: ApplicationStatus): ApplicationStatusGroup {
  if (status === 'Offer') return 'success';
  if (status === '待跟进') return 'followUp';
  if (status === '已拒绝' || status === '已放弃' || status === '人才库') return 'terminal';
  return 'active';
}

export const APPLICATION_STATUS_COLORS: Record<ApplicationStatus, { bg: string; fg: string; chart: string }> = {
  待投递: { bg: '#ece4d6', fg: '#5d584d', chart: '#cfc6b4' },
  已投递: { bg: '#fbeec2', fg: '#7a5a12', chart: '#cfc6b4' },
  简历筛选: { bg: '#f5f0e7', fg: '#7a5a12', chart: '#e4d7a8' },
  笔试: { bg: '#fbeec2', fg: '#7a5a12', chart: '#f4c84a' },
  一面: { bg: '#dde8fb', fg: '#345b9a', chart: '#7cc4a0' },
  二面: { bg: '#dde8fb', fg: '#345b9a', chart: '#6bb7b1' },
  AI面: { bg: '#e4e0f7', fg: '#4a3f96', chart: '#8b7ed8' },
  HR面: { bg: '#dde8fb', fg: '#345b9a', chart: '#7aa7d8' },
  Offer: { bg: '#dcebd5', fg: '#2f5d36', chart: '#5fa86b' },
  已拒绝: { bg: '#fbe0d8', fg: '#a23d24', chart: '#f0613f' },
  已放弃: { bg: '#fbe0d8', fg: '#a23d24', chart: '#c56c5a' },
  人才库: { bg: '#e0dcc8', fg: '#5a4018', chart: '#a89b82' },
  待跟进: { bg: '#e4e0f7', fg: '#4a3f96', chart: '#a89cf0' },
};

export function getApplicationStatusColor(status: ApplicationStatus) {
  return APPLICATION_STATUS_COLORS[status];
}
