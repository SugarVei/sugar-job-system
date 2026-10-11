import { useId } from 'react';
import { Palette } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { THEMES, THEME_ORDER } from '../styles/theme';
import { openPaletteStudio } from '../lib/paletteStudioRoute';
import '../styles/customPalette.css';

export default function ThemeSwitcher() {
  const { themeKey, setThemeKey, customPalette, autoCycle, setAutoCycle } = useTheme();
  const tipId = useId();
  return <div className="sugar-theme-switcher" role="group" aria-label="配色主题">
    {THEME_ORDER.map(key => <button type="button" key={key} onClick={() => { setAutoCycle(false); setThemeKey(key); }}
      title={THEMES[key].name} aria-label={`切换${THEMES[key].name}主题`} aria-pressed={key === themeKey}>
      <span style={{ background: THEMES[key].dot }} />
    </button>)}
    {customPalette && <button type="button" title="使用已保存的自定义配色" aria-label="使用已保存的自定义配色" aria-pressed={themeKey === 'custom'}
      onClick={() => { setAutoCycle(false); setThemeKey('custom'); }}>
      <span style={{ background: `conic-gradient(${customPalette.colors.map((color, index) => `${color} ${index * 20}% ${(index + 1) * 20}%`).join(',')})` }} />
    </button>}
    <button type="button" aria-label="自动轮换配色" title="每 8 秒轮换配色" aria-pressed={autoCycle}
      onClick={() => setAutoCycle(!autoCycle)} style={{ color: autoCycle ? 'var(--sugar-accent)' : '#8a8478', fontSize: 16 }}>↻</button>
    <div className="sugar-palette-entry">
      <button type="button" aria-label="自己设计颜色" aria-describedby={tipId} onClick={() => { setAutoCycle(false); openPaletteStudio(); }}>
        <Palette size={17} strokeWidth={1.6} aria-hidden="true" />
      </button>
      <div className="sugar-palette-tip" role="tooltip" id={tipId}>自己设计颜色</div>
    </div>
  </div>;
}
