import type { ScreenKey } from '../types';
import { IconDashboard, IconOverview, IconApplications, IconCompanies, IconResumes, IconInterviews, IconTrophy, IconKey, IconOffer, IconMail, IconPlugin } from './icons';

export type NavGroupId = 'core' | 'talent' | 'career';
export const NAV_ITEMS: { key: ScreenKey; label: string; shortLabel?: string; group: NavGroupId; mobilePrimary?: boolean; Icon: typeof IconDashboard }[] = [
  { key: 'dashboard', label: '总览', group: 'core', mobilePrimary: true, Icon: IconDashboard },
  { key: 'overview', label: '投递总览', shortLabel: '总览图', group: 'core', Icon: IconOverview },
  { key: 'applications', label: '投递记录', shortLabel: '投递', group: 'core', mobilePrimary: true, Icon: IconApplications },
  { key: 'companies', label: '公司库', group: 'talent', Icon: IconCompanies },
  { key: 'referralCodes', label: '内推码管理', shortLabel: '内推码', group: 'talent', Icon: IconKey },
  { key: 'hotCompanies', label: '热门公司', shortLabel: '热门', group: 'talent', mobilePrimary: true, Icon: IconTrophy },
  { key: 'resumes', label: '简历库', shortLabel: '简历', group: 'talent', mobilePrimary: true, Icon: IconResumes },
  { key: 'interviews', label: '面试日历', shortLabel: '面试', group: 'career', mobilePrimary: true, Icon: IconInterviews },
  { key: 'offers', label: 'Offer 管理', shortLabel: 'Offer', group: 'career', Icon: IconOffer },
  { key: 'resumeAssistant', label: '智能填表助手', shortLabel: '填表', group: 'career', Icon: IconPlugin },
  { key: 'mailbox', label: '面试邮件', shortLabel: '邮件', group: 'career', Icon: IconMail },
];
export const NAV_GROUPS: { id: NavGroupId; label: string }[] = [{ id: 'core', label: '求职主线' }, { id: 'talent', label: '公司与简历' }, { id: 'career', label: '面试与决策' }];
export const MOBILE_PRIMARY_NAV = NAV_ITEMS.filter(item => item.mobilePrimary);
export const MOBILE_MORE_NAV = NAV_ITEMS.filter(item => !item.mobilePrimary);
function timeGreeting(): string { const hour = new Date().getHours(); if (hour < 5) return '夜深了'; if (hour < 11) return '早上好'; if (hour < 14) return '中午好'; if (hour < 18) return '下午好'; return '晚上好'; }
export function greetFor(screen: ScreenKey, name: string): { title: string; sub: string } {
  const who = name || '你';
  const map: Record<ScreenKey, { title: string; sub: string }> = {
    dashboard: { title: `${timeGreeting()}，${who}`, sub: '今天有几件事临近截止，先把它们处理掉' }, overview: { title: '投递总览', sub: '投递的城市、薪资、岗位与渠道，一屏看全' }, applications: { title: '投递记录', sub: '记录每次投递，按公司、状态、渠道筛选' }, companies: { title: '公司库', sub: '自动汇总已投递公司，关联岗位与进度' }, referralCodes: { title: '内推码管理', sub: '集中保存公司、内推码与推荐人信息' }, hotCompanies: { title: '热门公司', sub: '精选知名企业，搜索与管理你添加的公司' }, resumes: { title: '简历库', sub: '多版本简历与面试稿件，按账号保存' }, interviews: { title: '面试日历', sub: '一眼看清本周面试安排' }, offers: { title: 'Offer 管理', sub: '统一比较薪资、截止时间与决策风险' }, interviewReviews: { title: '智能填表助手', sub: '网站管理资料，插件负责填写' }, resumeAssistant: { title: '智能填表助手', sub: '网站管理资料，插件负责填写' }, mailbox: { title: '面试邮件', sub: '连接网易 163，在系统内查看面试相关邮件' },
  };
  return map[screen];
}
