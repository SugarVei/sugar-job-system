// ============================================================
// 主题定义 —— 5 套配色（粉 / 蓝 / 绿 / 灰 / 米白）
// 直接移植自原设计稿中的 THEMES 表，并补充了主重点色 accent，
// 以便切换主题时按钮 / 重点色 / 卡片装饰色同步联动。
// ============================================================

export type ThemeKey = 'pink' | 'blue' | 'green' | 'gray' | 'cream' | 'peach';

export interface ThemeDef {
  /** 中文名（用于 title 提示） */
  name: string;
  /** 背景径向渐变 */
  base: string;
  /** 内阴影晕影色 */
  vig: string;
  /** 主题代表色（切换按钮上的圆点） */
  dot: string;
  /** 6 个流光球的 RGB 值 */
  blobs: string[];
  /** 主重点色（按钮高亮 / 进度条 / 强调描边等随主题联动） */
  accent: string;
  /** 重点色的浅色版（卡片装饰、标签底色） */
  accentSoft: string;
}

export const THEMES: Record<ThemeKey, ThemeDef> = {
  peach: { name: '蜜桃', base: 'radial-gradient(130% 130% at 70% 20%, #fbf3e9 0%, #f6eadd 38%, #eddacb 100%)', vig: 'rgba(130,80,40,.06)', dot: '#e7bfa7', blobs: ['224,192,170', '235,207,183', '206,173,150', '242,221,198', '235,212,195', '218,184,160'], accent: '#a26346', accentSoft: '#f4e4d9' },
  pink: {
    name: '粉色',
    base: 'radial-gradient(130% 130% at 70% 20%, #f8eee9 0%, #f5e7e3 38%, #eeddd8 100%)',
    vig: 'rgba(120,70,60,0.07)',
    dot: '#ddb4b0',
    blobs: ['221,188,186', '235,211,202', '201,171,168', '242,222,205', '239,224,219', '218,191,182'],
    accent: '#9a5b62',
    accentSoft: '#f5e4e1',
  },
  blue: {
    name: '蓝色',
    base: 'radial-gradient(130% 130% at 70% 20%, #d2e4f7 0%, #c0d6ef 38%, #aecbe7 100%)',
    vig: 'rgba(30,70,120,0.16)',
    dot: '#a9cdee',
    blobs: ['58,124,196', '110,160,224', '40,86,140', '150,190,235', '196,216,240', '74,124,196'],
    accent: '#345b9a',
    accentSoft: '#dce8fb',
  },
  green: {
    name: '绿色',
    base: 'radial-gradient(130% 130% at 70% 20%, #f1f2e9 0%, #e9edde 38%, #dce4d3 100%)',
    vig: 'rgba(70,90,55,0.07)',
    dot: '#b6d8a8',
    blobs: ['90,168,108', '123,191,134', '45,122,69', '169,216,154', '196,228,182', '108,180,122'],
    accent: '#2f7a45',
    accentSoft: '#dcebd5',
  },
  gray: {
    name: '灰色',
    base: 'radial-gradient(130% 130% at 70% 20%, #e6e6ea 0%, #dadade 38%, #cdcdd4 100%)',
    vig: 'rgba(60,60,72,0.16)',
    dot: '#c6c6cf',
    blobs: ['138,138,148', '160,160,170', '106,106,116', '184,184,194', '206,206,214', '144,144,154'],
    accent: '#5a5a68',
    accentSoft: '#e6e6ea',
  },
  cream: {
    name: '米白',
    base: 'radial-gradient(130% 130% at 70% 20%, #f8f5ee 0%, #f2ebe0 38%, #ede4d8 100%)',
    vig: 'rgba(120,90,55,0.06)',
    dot: '#ece0cd',
    blobs: ['217,181,143', '224,196,160', '199,159,120', '239,217,191', '232,214,192', '214,184,150'],
    accent: '#a9803f',
    accentSoft: '#f1e7d6',
  },
};

export const THEME_ORDER: ThemeKey[] = ['pink', 'cream', 'peach', 'green', 'blue', 'gray'];

/** 流光球的几何分布（位置、模糊、动画） */
export const BLOB_GEO = [
  { w: 60, l: -8, t: 30, blur: 90, anim: 'drift1 18s' },
  { w: 55, l: 48, t: -12, blur: 90, anim: 'drift2 23s' },
  { w: 42, l: 60, t: 48, blur: 95, anim: 'drift3 20s' },
  { w: 46, l: 18, t: 8, blur: 85, anim: 'drift4 25s' },
  { w: 38, l: -6, t: -10, blur: 80, anim: 'drift3 27s' },
  { w: 34, l: 38, t: 55, blur: 88, anim: 'drift1 21s' },
];

// ---- 固定品牌色（不随主题变化的中性骨架色） ----
export const INK = '#1b1a17';
export const CREAM = '#fffdf8';
export const SUGAR_YELLOW = '#f4c84a';
export const SUGAR_CORAL = '#f0613f';
