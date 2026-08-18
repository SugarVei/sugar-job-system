import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { BLOB_GEO } from '../styles/theme';
import { isMotionBudgetBusy, prefersReducedMotion, subscribeMotionBudget } from '../lib/motionBudget';

const getIdleSnapshot = () => false;

// ============================================================
// 弥散流光动态背景
// 移植自原设计稿：feTurbulence 液态扭曲 + 6 个漂移光球 + 高光/晕影
//
// 性能：feTurbulence + feDisplacementMap 是整屏最贵的一层。用户在
// 滚动、拖看板卡、漫游地图或打开弹窗时，把 SVG 滤镜动画与光球漂移
// 暂停（SMIL pauseAnimations + animation-play-state），空闲 220ms
// 后恢复。暂停只是停在当前那一帧，颜色、光球数量与构图都不变。
// 系统开启减弱动效时则始终保持静态。
// ============================================================
export default function LiquidBackground() {
  const { theme } = useTheme();
  const svgRef = useRef<SVGSVGElement>(null);
  const busy = useSyncExternalStore(subscribeMotionBudget, isMotionBudgetBusy, getIdleSnapshot);

  const syncFilterAnimation = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    if (isMotionBudgetBusy() || prefersReducedMotion()) svg.pauseAnimations();
    else svg.unpauseAnimations();
  }, []);

  useEffect(syncFilterAnimation, [busy, syncFilterAnimation]);

  // 减弱动效开关只绑定一次，不随忙闲状态反复解绑重绑
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    media.addEventListener('change', syncFilterAnimation);
    return () => media.removeEventListener('change', syncFilterAnimation);
  }, [syncFilterAnimation]);

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
      <svg ref={svgRef} style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }} aria-hidden>
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
      <div className="liquid-blobs" style={{ position: 'absolute', inset: 0, filter: 'url(#liquidWave)' }}>
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
                // animation 简写会把 play-state 重置成 running，且行内样式优先级高于
                // 样式表，所以暂停必须同样写在行内。
                animationPlayState: busy ? 'paused' : 'running',
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
