/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    // 与原设计一致的断点：手机 / 平板 / 桌面
    screens: {
      sm: '480px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
    extend: {
      fontFamily: {
        poppins: ['Poppins', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans"', 'system-ui', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
      },
      // 设计 token（src/styles/tokens.css）。带兜底值的项在预设主题下取兜底值，自定义配色时跟随配色工作室。
      colors: {
        ink: {
          DEFAULT: 'var(--sugar-ink, #1b1a17)',
          secondary: 'var(--sugar-ink-secondary)',
          tertiary: 'var(--sugar-ink-tertiary)',
          disabled: 'var(--sugar-ink-disabled)',
        },
        'on-ink': 'var(--sugar-on-ink)',
        cream: '#fffdf8',
        canvas: 'var(--sugar-canvas)',
        shell: 'var(--sugar-shell, #f7f3ec)',
        surface: {
          DEFAULT: 'var(--sugar-surface, #fffdf8)',
          muted: 'var(--sugar-surface-muted)',
          sunken: 'var(--sugar-surface-sunken)',
        },
        line: {
          DEFAULT: 'var(--sugar-line, #ece4d6)',
          control: 'var(--sugar-line-control)',
        },
        accent: {
          DEFAULT: 'var(--sugar-accent, #9a5b62)',
          soft: 'var(--sugar-accent-soft, #f5e4e1)',
        },
        status: {
          neutral: { DEFAULT: 'var(--sugar-status-neutral)', bg: 'var(--sugar-status-neutral-bg)' },
          applied: { DEFAULT: 'var(--sugar-status-applied)', bg: 'var(--sugar-status-applied-bg)' },
          interview: { DEFAULT: 'var(--sugar-status-interview)', bg: 'var(--sugar-status-interview-bg)' },
          success: { DEFAULT: 'var(--sugar-status-success)', bg: 'var(--sugar-status-success-bg)' },
          danger: { DEFAULT: 'var(--sugar-status-danger)', bg: 'var(--sugar-status-danger-bg)' },
          follow: { DEFAULT: 'var(--sugar-status-follow)', bg: 'var(--sugar-status-follow-bg)' },
        },
        sugar: {
          yellow: '#f4c84a',
          coral: '#f0613f',
        },
      },
      // 不覆盖 Tailwind 自带的 sm/md/lg/xl，避免改变现有 rounded-xl 等类的含义
      borderRadius: {
        badge: 'var(--sugar-radius-xs)',
        tile: 'var(--sugar-radius-sm)',
        control: 'var(--sugar-radius-md)',
        card: 'var(--sugar-radius-lg)',
        sheet: 'var(--sugar-radius-xl)',
        shell: 'var(--sugar-radius-shell)',
      },
      boxShadow: {
        card: 'var(--sugar-shadow-card)',
        raised: 'var(--sugar-shadow-raised)',
        overlay: 'var(--sugar-shadow-overlay)',
        shell: 'var(--sugar-shadow-shell)',
        focus: 'var(--sugar-focus-ring)',
      },
    },
  },
  plugins: [],
};
