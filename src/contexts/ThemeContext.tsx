import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { THEMES, THEME_ORDER, type ThemeDef, type ThemeKey, type PresetThemeKey } from '../styles/theme';
import { buildPaletteTheme, CUSTOM_PALETTE_STORAGE_KEY, isPaletteColors, readCustomPalette, type CustomPalette, type PaletteColors } from '../lib/customPalette';

interface ThemeContextValue {
  autoCycle: boolean; setAutoCycle: (value: boolean) => void;
  themeKey: ThemeKey; theme: ThemeDef; setThemeKey: (key: ThemeKey) => void;
  customPalette: CustomPalette | null; applyCustomPalette: (colors: PaletteColors) => void;
}
const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'sugar_theme';
function storedTheme(palette: CustomPalette | null): ThemeKey {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'custom' && palette) return 'custom';
    if (saved && Object.prototype.hasOwnProperty.call(THEMES, saved)) return saved as PresetThemeKey;
  } catch { /* unavailable storage */ }
  return 'pink';
}
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [customPalette, setCustomPalette] = useState(readCustomPalette);
  const [themeKey, setThemeKeyState] = useState<ThemeKey>(() => storedTheme(readCustomPalette()));
  const [autoCycle, setAutoCycle] = useState(false);
  const custom = useMemo(() => customPalette ? buildPaletteTheme(customPalette.colors) : null, [customPalette]);
  const theme = themeKey === 'custom' ? custom?.theme ?? THEMES.pink : THEMES[themeKey];
  const setThemeKey = useCallback((key: ThemeKey) => {
    if (key === 'custom' && !customPalette) return;
    setThemeKeyState(key);
    try { localStorage.setItem(STORAGE_KEY, key); } catch { /* unavailable storage */ }
  }, [customPalette]);
  const applyCustomPalette = useCallback((colors: PaletteColors) => {
    if (!isPaletteColors(colors)) throw new Error('请选择五种有效的 HEX 颜色');
    const palette: CustomPalette = { version: 1, colors: colors.map(color => color.toUpperCase()) as PaletteColors };
    try { localStorage.setItem(CUSTOM_PALETTE_STORAGE_KEY, JSON.stringify(palette)); localStorage.setItem(STORAGE_KEY, 'custom'); } catch { /* Current session still works without storage. */ }
    setCustomPalette(palette); setAutoCycle(false); setThemeKeyState('custom');
  }, []);
  useEffect(() => {
    if (!autoCycle) return;
    const index = themeKey === 'custom' ? -1 : THEME_ORDER.indexOf(themeKey);
    const timer = setInterval(() => setThemeKey(THEME_ORDER[(index + 1) % THEME_ORDER.length]), 8000);
    return () => clearInterval(timer);
  }, [autoCycle, themeKey, setThemeKey]);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.sugarTheme = themeKey;
    const tokens: Record<string, string> = themeKey === 'custom' && custom ? custom.tokens : {};
    Object.entries(tokens).forEach(([key, value]) => root.style.setProperty(key, value));
    root.style.setProperty('--sugar-accent', theme.accent);
    root.style.setProperty('--sugar-accent-soft', theme.accentSoft);
    // 地址栏颜色与页面底色一致，不随预设强调色变化
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tokens['--sugar-background'] ?? '#efe9e1');
    return () => { Object.keys(tokens).forEach(key => root.style.removeProperty(key)); delete root.dataset.sugarTheme; };
  }, [themeKey, theme, custom]);
  return <ThemeContext.Provider value={{ autoCycle, setAutoCycle, themeKey, theme, setThemeKey, customPalette, applyCustomPalette }}>{children}</ThemeContext.Provider>;
}
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
