// ============================================================
// 主题定义 —— 6 个预设（粉 / 米白 / 蜜桃 / 绿 / 蓝 / 灰）
// 预设之间只换强调色：accent 与 accentSoft 由 ThemeContext 写入
// --sugar-accent / --sugar-accent-soft；页面底色、卡片、文字不随预设变化。
// dot 是切换按钮外的主题代表色，vig 供头像选择器的遮罩着色。
// ============================================================

export type PresetThemeKey = 'pink' | 'blue' | 'green' | 'gray' | 'cream' | 'peach';
export type ThemeKey = PresetThemeKey | 'custom';

export interface ThemeDef {
  /** 中文名（用于 title 提示） */
  name: string;
  /** 内阴影晕影色（头像选择器遮罩） */
  vig: string;
  /** 主题代表色（头像选择器遮罩着色） */
  dot: string;
  /** 主重点色（按钮高亮 / 进度条 / 强调描边等随主题联动） */
  accent: string;
  /** 重点色的浅色版（卡片装饰、标签底色） */
  accentSoft: string;
}

export const THEMES: Record<PresetThemeKey, ThemeDef> = {
  peach: { name: '蜜桃', vig: 'rgba(130,80,40,.06)', dot: '#e7bfa7', accent: '#a26346', accentSoft: '#f4e4d9' },
  pink: { name: '粉色', vig: 'rgba(120,70,60,0.07)', dot: '#ddb4b0', accent: '#9a5b62', accentSoft: '#f5e4e1' },
  blue: { name: '蓝色', vig: 'rgba(30,70,120,0.16)', dot: '#a9cdee', accent: '#345b9a', accentSoft: '#dce8fb' },
  green: { name: '绿色', vig: 'rgba(70,90,55,0.07)', dot: '#b6d8a8', accent: '#2f7a45', accentSoft: '#dcebd5' },
  gray: { name: '灰色', vig: 'rgba(60,60,72,0.16)', dot: '#c6c6cf', accent: '#5a5a68', accentSoft: '#e6e6ea' },
  // 原 #a9803f 配白字仅 3.59:1，加深为 #8a6a2f（5.02:1）
  cream: { name: '米白', vig: 'rgba(120,90,55,0.06)', dot: '#ece0cd', accent: '#8a6a2f', accentSoft: '#f1e7d6' },
};

export const THEME_ORDER: PresetThemeKey[] = ['pink', 'cream', 'peach', 'green', 'blue', 'gray'];

// ---- 固定品牌色（不随主题变化的中性骨架色） ----
export const INK = '#1b1a17';
export const CREAM = '#fffdf8';
export const SUGAR_YELLOW = '#f4c84a';
export const SUGAR_CORAL = '#f0613f';
