import { useTheme } from '../contexts/ThemeContext';
import { THEMES, THEME_ORDER } from '../styles/theme';

// ============================================================
// 5 色主题切换按钮（粉 / 蓝 / 绿 / 灰 / 米白）
// 位于搜索框左侧，移植自原设计
// ============================================================
export default function ThemeSwitcher() {
  const { themeKey, setThemeKey } = useTheme();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        height: 46,
        background: 'rgba(255,253,250,0.62)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: 14,
        padding: '0 13px',
        boxShadow: '0 4px 14px rgba(60,50,35,.05)',
        flex: 'none',
      }}
    >
      {THEME_ORDER.map((k) => {
        const active = k === themeKey;
        return (
          <button
            key={k}
            onClick={() => setThemeKey(k)}
            title={THEMES[k].name}
            aria-label={`切换${THEMES[k].name}主题`}
            className="swatch"
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              cursor: 'pointer',
              padding: 0,
              background: THEMES[k].dot,
              border: `2px solid ${active ? '#1b1a17' : 'rgba(0,0,0,0.08)'}`,
              boxShadow: active ? '0 0 0 2px #fffdf8 inset' : 'none',
              transition: 'transform .15s, border-color .2s',
              outline: 'none',
            }}
          />
        );
      })}
    </div>
  );
}
