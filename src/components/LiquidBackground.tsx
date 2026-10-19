// ============================================================
// 应用背景：静态中性底色 + 一层当前强调色的淡色光晕
// 原先的 feTurbulence 液态扭曲与 6 个漂移光球会让 GPU 持续工作，已移除。
// 底色读 --sugar-background（自定义配色）或 --sugar-canvas（预设主题），
// 光晕读 ThemeContext 写入的 --sugar-accent-soft，切换主题时只有光晕颜色变化。
// ============================================================
export default function LiquidBackground() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        background:
          'radial-gradient(110% 80% at 72% 6%, var(--sugar-accent-soft, #f5e4e1) 0%, transparent 62%), var(--sugar-background, var(--sugar-canvas, #efe9e1))',
      }}
    />
  );
}
