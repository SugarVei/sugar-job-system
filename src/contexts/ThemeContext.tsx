import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { THEMES, type ThemeDef, type ThemeKey } from '../styles/theme';

interface ThemeContextValue {
  themeKey: ThemeKey;
  theme: ThemeDef;
  setThemeKey: (k: ThemeKey) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'sugar_theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeKey, setThemeKeyState] = useState<ThemeKey>(() => {
    const saved = (typeof localStorage !== 'undefined'
      ? localStorage.getItem(STORAGE_KEY)
      : null) as ThemeKey | null;
    return saved && THEMES[saved] ? saved : 'pink';
  });

  const setThemeKey = (k: ThemeKey) => {
    setThemeKeyState(k);
    try {
      localStorage.setItem(STORAGE_KEY, k);
    } catch {
      /* ignore */
    }
  };

  // 同步浏览器地址栏主题色
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEMES[themeKey].dot);
  }, [themeKey]);

  return (
    <ThemeContext.Provider value={{ themeKey, theme: THEMES[themeKey], setThemeKey }}>
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
