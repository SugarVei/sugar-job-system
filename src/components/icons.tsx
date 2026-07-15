import type { SVGProps } from 'react';

// ============================================================
// 图标集合 —— 全部移植自原设计稿的内联 SVG
// 统一 stroke="currentColor"，颜色由父级 color 控制
// ============================================================

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base(size: number, props: SVGProps<SVGSVGElement>) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...props,
  };
}

export const IconDashboard = ({ size = 20, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </svg>
);

export const IconOverview = ({ size = 20, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M3 3v18h18" />
    <path d="M7 14l3-4 3 2 4-6" />
  </svg>
);

export const IconApplications = ({ size = 20, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 9h18M8 14h8" />
  </svg>
);

export const IconCompanies = ({ size = 20, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M9 16h6" />
  </svg>
);

export const IconResumes = ({ size = 20, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6M9 13h6M9 17h4" />
  </svg>
);

export const IconInterviews = ({ size = 20, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

export const IconSearch = ({ size = 17, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export const IconPlus = ({ size = 17, ...p }: IconProps) => (
  <svg {...base(size, { strokeWidth: 2.2, ...p })}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconChevronDown = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size, { strokeWidth: 2.2, ...p })}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const IconChevronRight = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size, { strokeWidth: 2.4, ...p })}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export const IconLogout = ({ size = 17, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

export const IconUser = ({ size = 40, ...p }: IconProps) => (
  <svg {...base(size, { strokeWidth: 1.6, ...p })}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

export const IconCamera = ({ size = 13, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);

export const IconEdit = ({ size = 15, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

export const IconTrash = ({ size = 15, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
  </svg>
);

export const IconFile = ({ size = 16, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
);

export const IconMapPin = ({ size = 11, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M12 21s-6-5.7-6-10a6 6 0 0 1 12 0c0 4.3-6 10-6 10Z" />
    <circle cx="12" cy="11" r="2" />
  </svg>
);

export const IconClose = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const IconExternalLink = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <path d="M15 3h6v6M10 14 21 3" />
  </svg>
);

export const IconEye = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IconEyeOff = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="m3 3 18 18" />
    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10.8 10.8 0 0 1 12 4c6 0 10 8 10 8a17 17 0 0 1-2.1 3.2M6.6 6.6C3.7 8.4 2 12 2 12s4 8 10 8a9.8 9.8 0 0 0 4.1-.9" />
  </svg>
);

export const IconCopy = ({ size = 16, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </svg>
);

export const IconClock = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const IconCheck = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="m5 12 4 4L19 6" />
  </svg>
);

export const IconTrophy = ({ size = 22, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M6 9V2h12v7a6 6 0 0 1-12 0ZM6 9H3a3 3 0 0 0 3 3M18 9h3a3 3 0 0 1-3 3M9 20h6M12 15v5" />
  </svg>
);

export const IconArrowRight = ({ size = 22, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const IconSettings = ({ size = 20, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export const IconKey = ({ size = 16, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <circle cx="7.5" cy="15.5" r="3.5" />
    <path d="M14 9l-3.2 3.2M10.5 12.5l2 2M15.5 7.5l2 2M21 3l-3 3" />
  </svg>
);

/** Sugar 品牌 Logo（透明背景，与 favicon 保持一致） */
export const SugarMark = ({ size = 26 }: { size?: number; color?: string }) => (
  <img
    src="/sugar-logo-v2.png"
    alt="Sugar"
    width={size}
    height={size}
    style={{
      width: size,
      height: size,
      objectFit: 'contain',
      display: 'block',
    }}
  />
);
