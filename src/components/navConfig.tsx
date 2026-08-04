import type { ScreenKey } from '../types';
import {
  IconDashboard, IconOverview, IconApplications, IconCompanies, IconResumes,
  IconInterviews, IconTrophy,
  IconKey,
} from './icons';

export const NAV_ITEMS: {
  key: ScreenKey;
  label: string;
  Icon: typeof IconDashboard;
}[] = [
  { key: 'dashboard', label: '总览', Icon: IconDashboard },
  { key: 'overview', label: '投递总览', Icon: IconOverview },
  { key: 'applications', label: '投递记录', Icon: IconApplications },
  { key: 'companies', label: '公司库', Icon: IconCompanies },
  { key: 'referralCodes', label: '内推码管理', Icon: IconKey },
  { key: 'hotCompanies', label: '热门公司', Icon: IconTrophy },
  { key: 'resumes', label: '简历库', Icon: IconResumes },
  { key: 'interviews', label: '面试日历', Icon: IconInterviews },
  { key: 'offers', label: 'Offer 管理', Icon: IconTrophy },
  { key: 'interviewReviews', label: '面试复盘', Icon: IconOverview },
  { key: 'jdMatches', label: 'JD 匹配', Icon: IconApplications },
];

export function greetFor(screen: ScreenKey, name: string): { title: string; sub: string } {
  const map: Record<ScreenKey, { title: string; sub: string }> = {
    dashboard: { title: `下午好，${name || '你'}`, sub: '今天有几件事临近截止，先把它们处理掉' },
    overview: { title: '投递总览', sub: '投递的城市、薪资、岗位与渠道，一屏看全' },
    applications: { title: '投递记录', sub: '记录每次投递，按公司、状态、渠道筛选' },
    companies: { title: '公司库', sub: '自动汇总已投递公司，关联岗位与进度' },
    referralCodes: { title: '内推码管理', sub: '集中保存公司、内推码与推荐人信息' },
    hotCompanies: { title: '热门公司', sub: '精选知名企业，一键直达招聘官网' },
    resumes: { title: '简历库', sub: '多版本简历与面试稿件，按账号保存' },
    interviews: { title: '面试日历', sub: '一眼看清本周面试安排' },
    offers: { title: 'Offer 管理', sub: '统一比较薪资、截止时间与决策风险' },
    interviewReviews: { title: '面试复盘', sub: '记录问题与表现，把每次面试变成题库' },
    jdMatches: { title: 'JD 匹配分析', sub: '粘贴岗位 JD，评估简历匹配度并生成建议' },
  };
  return map[screen];
}
