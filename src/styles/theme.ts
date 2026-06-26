// ============================================================
// 主题定义 —— 5 套配色（粉 / 蓝 / 绿 / 灰 / 米白）
// 直接移植自原设计稿中的 THEMES 表，并补充了主重点色 accent，
// 以便切换主题时按钮 / 重点色 / 卡片装饰色同步联动。
// ============================================================

export type ThemeKey = 'pink' | 'blue' | 'green' | 'gray' | 'cream';

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
  pink: {
    name: '粉色',
    base: 'radial-gradient(130% 130% at 70% 20%, #f6cdd8 0%, #efbecb 38%, #e7adbe 100%)',
    vig: 'rgba(120,30,60,0.16)',
    dot: '#f0a8bd',
    blobs: ['184,56,94', '217,96,128', '142,45,77', '240,169,143', '239,192,205', '196,74,108'],
    accent: '#d9426f',
    accentSoft: '#f9dfe7',
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
    base: 'radial-gradient(130% 130% at 70% 20%, #d8edcf 0%, #c8e3bd 38%, #b8d9ad 100%)',
    vig: 'rgba(40,100,55,0.16)',
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
    base: 'radial-gradient(130% 130% at 70% 20%, #f5efe5 0%, #ece2d3 38%, #e3d6c4 100%)',
    vig: 'rgba(120,90,55,0.14)',
    dot: '#ece0cd',
    blobs: ['217,181,143', '224,196,160', '199,159,120', '239,217,191', '232,214,192', '214,184,150'],
    accent: '#a9803f',
    accentSoft: '#f1e7d6',
  },
};

export const THEME_ORDER: ThemeKey[] = ['pink', 'blue', 'green', 'gray', 'cream'];

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
