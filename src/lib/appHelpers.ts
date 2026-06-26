import type { Application, ApplicationStatus } from '../types';

// ============================================================
// 投递状态 / 流水线相关的展示助手
// ============================================================

export const STATUS_OPTIONS: ApplicationStatus[] = [
  '已投递',
  '笔试',
  '面试',
  'Offer',
  '拒绝',
  '待跟进',
];

/** 投递流水线步骤（用于卡片上的进度条） */
export const PIPELINE: ApplicationStatus[] = ['已投递', '笔试', '面试', 'Offer'];

/** 不同状态对应的标签底色 / 文字色 */
export function statusTag(s: ApplicationStatus): { bg: string; fg: string } {
  switch (s) {
    case 'Offer':
      return { bg: '#dcebd5', fg: '#2f5d36' };
    case '拒绝':
      return { bg: '#fbe0d8', fg: '#a23d24' };
    case '待跟进':
      return { bg: '#ece4d6', fg: '#8a8478' };
    case '面试':
      return { bg: '#dde8fb', fg: '#345b9a' };
    case '笔试':
      return { bg: '#fbeec2', fg: '#7a5a12' };
    default:
      return { bg: '#fbeec2', fg: '#7a5a12' };
  }
}

/** 根据状态构建进度步骤展示数据 */
export function buildSteps(status: ApplicationStatus) {
  const terminal = status === '拒绝' || status === '待跟进';
  // 终态时进度停在“面试”前的合理位置
  const progress: ApplicationStatus = status === '拒绝' ? '面试' : status === '待跟进' ? '已投递' : status;
  const ai = PIPELINE.indexOf(progress);
  const offer = status === 'Offer';
  const rejected = status === '拒绝';

  return PIPELINE.map((label, i) => {
    const reached = i <= ai && !terminal ? i <= ai : i <= ai;
    let dotBg = '#e7dfd0';
    let dotFg = '#a39d90';
    if (reached) {
      if (offer) {
        dotBg = '#5fa86b';
        dotFg = '#fff';
      } else if (rejected) {
        dotBg = '#f0613f';
        dotFg = '#fff';
      } else {
        dotBg = '#1b1a17';
        dotFg = '#f4c84a';
      }
    }
    const lineOn = reached ? (offer ? '#a7d2ac' : rejected ? '#f3b3a1' : '#cfc6b4') : '#efe9dd';
    return {
      idx: i + 1,
      label,
      dotBg,
      dotFg,
      lineL: i === 0 ? 'transparent' : lineOn,
      lineR: i === PIPELINE.length - 1 ? 'transparent' : i < ai ? lineOn : '#efe9dd',
      labelColor: label === progress ? '#1b1a17' : '#a39d90',
      labelWeight: label === progress ? 700 : 500,
    };
  });
}

/** 公司首字（用于头像方块） */
export function initialOf(name: string): string {
  return name ? name.trim().charAt(0) : '?';
}

/** 一组用于头像方块的柔和配色，按字符稳定取色 */
const AVATAR_COLORS = [
  { bg: '#1b1a17', fg: '#f4c84a' },
  { bg: '#dcebd5', fg: '#2f5d36' },
  { bg: '#fbeec2', fg: '#7a5a12' },
  { bg: '#fbe0d8', fg: '#a23d24' },
  { bg: '#dde8fb', fg: '#345b9a' },
  { bg: '#ece8fb', fg: '#5a4fb0' },
];

export function avatarColor(name: string) {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

/** 文本是否匹配搜索词（公司/岗位/城市等） */
export function matchApp(a: Application, q: string): boolean {
  if (!q) return true;
  const t = q.toLowerCase();
  return [a.company_name, a.position_name, a.city, a.channel, a.notes]
    .filter(Boolean)
    .some((v) => (v as string).toLowerCase().includes(t));
}

/** 通用卡片样式 */
export const CARD: React.CSSProperties = {
  background: '#fffdf8',
  borderRadius: 22,
  boxShadow: '0 6px 18px rgba(60,50,35,.05)',
};
