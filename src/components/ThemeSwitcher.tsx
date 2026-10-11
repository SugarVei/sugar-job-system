import { useTheme } from '../contexts/ThemeContext';
import { THEMES, THEME_ORDER } from '../styles/theme';
export default function ThemeSwitcher() {
  const { themeKey, setThemeKey, autoCycle, setAutoCycle } = useTheme();
  return <div className="sugar-theme-switcher" role="group" aria-label="配色主题">{THEME_ORDER.map(k => <button key={k} onClick={() => { setAutoCycle(false); setThemeKey(k); }} title={THEMES[k].name} aria-label={`切换${THEMES[k].name}主题`} aria-pressed={k === themeKey}><span style={{ background: THEMES[k].dot }} /></button>)}<button aria-label="自动轮换配色" title="每 8 秒轮换配色" aria-pressed={autoCycle} onClick={() => setAutoCycle(!autoCycle)} style={{ color: autoCycle ? '#9a5b62' : '#8a8478', fontSize: 16 }}>↻</button></div>;
}
