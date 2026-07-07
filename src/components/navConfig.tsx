import type { ScreenKey } from '../types';
import {
  IconDashboard,
  IconOverview,
  IconApplications,
  IconCompanies,
  IconResumes,
  IconInterviews,
  IconTrophy,
} from './icons';

// ============================================================
// 导航定义 + 各页面顶栏问候语（移植自原设计 greetMap / navDefs）
// ============================================================
export const NAV_ITEMS: {
  key: ScreenKey;
  label: string;
  Icon: typeof IconDashboard;
}[] = [
  { key: 'dashboard', label: '总览', Icon: IconDashboard },
  { key: 'overview', label: '投递总览', Icon: IconOverview },
  { key: 'applications', label: '投递记录', Icon: IconApplications },
  { key: 'companies', label: '公司库', Icon: IconCompanies },
  { key: 'hotCompanies', label: '热门公司', Icon: IconTrophy },
  { key: 'resumes', label: '简历库', Icon: IconResumes },
  { key: 'interviews', label: '面试日历', Icon: IconInterviews },
];

export function greetFor(screen: ScreenKey, name: string): { title: string; sub: string } {
  const map: Record<ScreenKey, { title: string; sub: string }> = {
    dashboard: { title: `下午好，${name || '你'}`, sub: '今天有几件事临近截止，先把它们处理掉' },
    overview: { title: '投递总览', sub: '投递的城市、薪资、岗位与渠道，一屏看全' },
    applications: { title: '投递记录', sub: '记录每次投递，按公司、状态、渠道筛选' },
    companies: { title: '公司库', sub: '汇总目标公司，避免重复记录' },
    hotCompanies: { title: '热门公司', sub: '精选大陆知名企业，一键直达校招官网' },
    resumes: { title: '简历库', sub: '多版本简历与面试稿件，安全存储' },
    interviews: { title: '面试日历', sub: '一眼看清本周面试安排' },
  };
  return map[screen];
}
