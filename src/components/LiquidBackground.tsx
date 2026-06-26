import { useTheme } from '../contexts/ThemeContext';
import { BLOB_GEO } from '../styles/theme';

// ============================================================
// 弥散流光动态背景
// 移植自原设计稿：feTurbulence 液态扭曲 + 6 个漂移光球 + 高光/晕影
// ============================================================
export default function LiquidBackground() {
  const { theme } = useTheme();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        overflow: 'hidden',
        background: theme.base,
      }}
    >
      {/* 液态扭曲滤镜 */}
      <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }} aria-hidden>
        <filter id="liquidWave" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.006 0.011"
            numOctaves={2}
            seed={7}
            result="noise"
          >
            <animate
              attributeName="baseFrequency"
              dur="18s"
              values="0.006 0.011;0.012 0.006;0.008 0.014;0.006 0.011"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={80}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>

      {/* 漂移光球 */}
      <div style={{ position: 'absolute', inset: 0, filter: 'url(#liquidWave)' }}>
        {BLOB_GEO.map((g, i) => {
          const c = theme.blobs[i];
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: `${g.w}vw`,
                height: `${g.w}vw`,
                left: `${g.l}vw`,
                top: `${g.t}vh`,
                borderRadius: '50%',
                background: `radial-gradient(circle, rgba(${c},0.9) 0%, rgba(${c},0) 65%)`,
                filter: `blur(${g.blur}px)`,
                animation: `${g.anim} ease-in-out infinite`,
              }}
            />
          );
        })}
      </div>

      {/* 顶部高光 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(120% 90% at 50% 0%, rgba(255,255,255,0.32), rgba(255,255,255,0) 45%)',
          pointerEvents: 'none',
        }}
      />
      {/* 内阴影晕影 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          boxShadow: `inset 0 0 240px ${theme.vig}`,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
