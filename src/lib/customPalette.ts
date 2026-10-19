import type { CSSProperties } from 'react';
import type { ThemeDef } from '../styles/theme';
import { contrastRatio, hexToLch, lchToHex } from './colorScience';

export type PaletteColors = [string, string, string, string, string];
export interface CustomPalette { version: 1; colors: PaletteColors }
export const CUSTOM_PALETTE_STORAGE_KEY = 'sugar.custom-palette.v1';
export function isPaletteColors(value: unknown): value is PaletteColors {
  return Array.isArray(value) && value.length === 5 && value.every(color => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color));
}
export function readCustomPalette(): CustomPalette | null {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(CUSTOM_PALETTE_STORAGE_KEY) ?? 'null');
    if (saved && typeof saved === 'object' && 'version' in saved && saved.version === 1 && 'colors' in saved && isPaletteColors(saved.colors)) {
      return { version: 1, colors: saved.colors.map(color => color.toUpperCase()) as PaletteColors };
    }
  } catch { /* Unavailable storage or malformed data falls back to a preset. */ }
  return null;
}
export function paletteSlot(key: string | number): number {
  if (typeof key === 'number') return ((Math.trunc(key) % 5) + 5) % 5;
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
  return (hash >>> 0) % 5;
}
/** Stable variables allow CSS cards to preserve their preset appearance. */
export function paletteCardVariables(key: string | number): CSSProperties {
  const slot = paletteSlot(key);
  return {
    '--sugar-card-bg': `var(--sugar-card-${slot}-bg)`,
    '--sugar-card-fg': `var(--sugar-card-${slot}-fg)`,
    '--sugar-card-border': `var(--sugar-card-${slot}-border)`,
  } as CSSProperties;
}
/** Presets retain their original appearance. IDs retain color through filtering and sorting. */
export function paletteCardStyle(key: string | number, background = '#fffdf8', foreground = '#1b1a17'): CSSProperties {
  const slot = paletteSlot(key);
  return {
    ...paletteCardVariables(key),
    background: `var(--sugar-card-${slot}-bg, ${background})`,
    color: `var(--sugar-card-${slot}-fg, ${foreground})`,
  };
}
export const paletteAccent = (key: string | number, fallback: string) => `var(--sugar-card-${paletteSlot(key)}-fg, ${fallback})`;
export const paletteTint = (key: string | number, fallback: string) => `var(--sugar-card-${paletteSlot(key)}-bg, ${fallback})`;
export const paletteChart = (key: string | number, fallback: string) => `var(--sugar-chart-${paletteSlot(key)}, ${fallback})`;

export interface PaletteTheme { theme: ThemeDef; tokens: Record<string, string> }
/** Normalize lightness before distributing hue, including all-black/white/neon palettes. */
export function buildPaletteTheme(colors: PaletteColors): PaletteTheme {
  const lch = colors.map(hexToLch);
  const [, dominantC, dominantH] = [...lch].sort((a, b) => b[1] - a[1])[0];
  const neutral = (L: number, C: number) => lchToHex([L, Math.min(C, dominantC), dominantH]);
  const background = neutral(.977, .009), surface = neutral(.991, .004);
  const ink = neutral(.27, .018), muted = neutral(.44, .023);
  let accentL = .5;
  let accent = lchToHex([accentL, Math.min(.16, dominantC), dominantH]);
  while (contrastRatio(accent, '#FFFFFF') < 4.6 && accentL > .3) {
    accentL -= .01;
    accent = lchToHex([accentL, Math.min(.16, dominantC), dominantH]);
  }
  const soft = neutral(.938, .037);
  const tokens: Record<string, string> = {
    '--sugar-background': background, '--sugar-surface': surface, '--sugar-shell': background,
    '--sugar-ink': ink, '--sugar-muted': muted, '--sugar-line': neutral(.871, .018),
    '--sugar-primary': accent, '--sugar-accent': accent, '--sugar-accent-soft': soft, '--sugar-on-accent': '#FFFFFF',
  };
  lch.forEach(([, C, H], slot) => {
    tokens[`--sugar-card-${slot}-bg`] = lchToHex([.943 + (slot % 2) * .007, Math.min(C, .037), H]);
    tokens[`--sugar-card-${slot}-fg`] = lchToHex([.345, Math.min(C, .075), H]);
    tokens[`--sugar-card-${slot}-border`] = lchToHex([.835, Math.min(C, .048), H]);
    tokens[`--sugar-chart-${slot}`] = lchToHex([.61, Math.min(C, .17), H]);
  });
  return { tokens, theme: {
    name: '自定义', dot: colors[2], accent, accentSoft: soft,
    vig: 'rgba(30,30,35,.035)',
  } };
}
