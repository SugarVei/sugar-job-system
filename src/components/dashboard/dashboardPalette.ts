import type { CSSProperties } from 'react';
import type { ThemeKey } from '../../styles/theme';

// 总览页卡片配色：每个预设主题一套暖色卡片色，自定义配色时跟随配色工作室生成的变量。
// 写成 --do-* 变量挂在总览根节点上，子卡片统一引用。
const palettes = {
  peach: { surface: '#fff8f0', line: '#eaded2', accent: '#a46545', tint: '#f0dccd' },
  cream: { surface: '#fffaf4', line: '#e6ded2', accent: '#956f4e', tint: '#efe4d5' },
  pink: { surface: '#fff9f7', line: '#eadcda', accent: '#9a5b62', tint: '#f0ddde' },
  green: { surface: '#fffdf7', line: '#e0e5d7', accent: '#507447', tint: '#e4eddc' },
  blue: { surface: '#fafcfe', line: '#dee4eb', accent: '#527390', tint: '#e0e9f0' },
  gray: { surface: '#fcfcf8', line: '#e2e2dc', accent: '#696d65', tint: '#e5e7e0' },
};

export function dashboardPaletteStyle(themeKey: ThemeKey): CSSProperties {
  const palette = themeKey === 'custom' ? {
    surface: 'var(--sugar-card-2-bg)', line: 'var(--sugar-card-2-border)',
    accent: 'var(--sugar-card-2-fg)', tint: 'var(--sugar-accent-soft)',
  } : palettes[themeKey];
  return Object.fromEntries(Object.entries(palette).map(([key, value]) => [`--do-${key}`, value])) as CSSProperties;
}
