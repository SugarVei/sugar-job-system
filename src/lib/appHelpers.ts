import type { Application, ApplicationStatus } from '../types';

export const STATUS_OPTIONS: ApplicationStatus[] = [
  '已投递',
  '笔试',
  '面试',
  'Offer',
  '拒绝',
  '待跟进',
];

export const PIPELINE: ApplicationStatus[] = ['已投递', '笔试', '面试', 'Offer'];

export function statusTag(status: ApplicationStatus): { bg: string; fg: string } {
  switch (status) {
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

export function buildSteps(status: ApplicationStatus) {
  const terminal = status === '拒绝' || status === '待跟进';
  const progress: ApplicationStatus = status === '拒绝' ? '面试' : status === '待跟进' ? '已投递' : status;
  const activeIndex = PIPELINE.indexOf(progress);
  const offer = status === 'Offer';
  const rejected = status === '拒绝';

  return PIPELINE.map((label, index) => {
    const reached = terminal ? index <= activeIndex : index <= activeIndex;
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
      idx: index + 1,
      label,
      dotBg,
      dotFg,
      lineL: index === 0 ? 'transparent' : lineOn,
      lineR: index === PIPELINE.length - 1 ? 'transparent' : index < activeIndex ? lineOn : '#efe9dd',
      labelColor: label === progress ? '#1b1a17' : '#a39d90',
      labelWeight: label === progress ? 700 : 500,
    };
  });
}

export function initialOf(name: string): string {
  return name ? name.trim().charAt(0) : '?';
}

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

export function matchApp(application: Application, query: string): boolean {
  if (!query) return true;
  const text = query.toLowerCase();
  return [
    application.company_name,
    application.position_name,
    application.city,
    application.channel,
    application.notes,
  ]
    .filter(Boolean)
    .some((value) => (value as string).toLowerCase().includes(text));
}

export const CARD: React.CSSProperties = {
  background: '#fffdf8',
  borderRadius: 22,
  boxShadow: '0 6px 18px rgba(60,50,35,.05)',
};
