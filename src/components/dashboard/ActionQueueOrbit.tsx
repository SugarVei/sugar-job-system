import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Application, ApplicationPriority } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import './ActionQueueOrbit.css';

interface ActionQueueOrbitProps {
  apps: Application[];
  onViewDetail: (app: Application) => void;
}

type OrbitMode = 'empty' | 'single' | 'fan' | 'ring';
type ViewportKey = 'desktop' | 'tablet' | 'mobile';
type ViewportConfig = { width: number; height: number; cardW: number; cardH: number; radius: number; perspective: number; visMult: number };
type Tween = { from: number; to: number; start: number; duration: number };

const VIEWPORTS: Record<ViewportKey, ViewportConfig> = {
  desktop: { width: 860, height: 400, cardW: 150, cardH: 204, radius: 250, perspective: 1300, visMult: 3.5 },
  tablet: { width: 640, height: 380, cardW: 122, cardH: 166, radius: 190, perspective: 1100, visMult: 2.4 },
  mobile: { width: 340, height: 340, cardW: 100, cardH: 138, radius: 120, perspective: 850, visMult: 1.5 },
};

const PALETTES = [
  { bg: '#f2ddd0', fg: '#7a3a1e' }, { bg: '#d4e8d0', fg: '#2a5e34' },
  { bg: '#f0e4b8', fg: '#6a4a08' }, { bg: '#ddd4ec', fg: '#4a3670' },
  { bg: '#c8e0d4', fg: '#1e5a44' }, { bg: '#f4d4c8', fg: '#7a3228' },
  { bg: '#e0dcc8', fg: '#5a4018' }, { bg: '#d0dcec', fg: '#2a4070' },
  { bg: '#eed4d8', fg: '#6a2838' }, { bg: '#d8e8d0', fg: '#285828' },
  { bg: '#f4e0c0', fg: '#6a3808' }, { bg: '#d8d4e8', fg: '#382e60' },
];

const AUTO_DEGREES_PER_MS = 360 / 16000;

/** Keep every angular comparison on the shortest signed path. */
function normalizeAngle(angle: number) {
  return ((angle % 360) + 540) % 360 - 180;
}

function getMode(count: number): OrbitMode {
  if (count === 0) return 'empty';
  if (count === 1) return 'single';
  return count <= 4 ? 'fan' : 'ring';
}

function configForViewport(width: number): ViewportKey {
  if (width <= 640) return 'mobile';
  if (width <= 1024) return 'tablet';
  return 'desktop';
}

function angleStepFor(mode: OrbitMode, count: number) {
  return mode === 'fan' ? 26 : count > 0 ? 360 / count : 0;
}

function frontIndex(count: number, step: number, rotation: number, sway: number) {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < count; index += 1) {
    const distance = Math.abs(normalizeAngle(index * step + rotation + sway));
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  }
  return best;
}

function priorityLabel(priority: ApplicationPriority | null | undefined) {
  if (priority === 'urgent') return '紧急';
  if (priority === 'high') return '高';
  if (priority === 'low') return '低';
  return '普通';
}

function formatDateTime(value: string | null) {
  if (!value) return '未设置';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

const OrbitCard = memo(function OrbitCard({ app, index, cardWidth, cardRef, onActivate, onKeyDown }: {
  app: Application;
  index: number;
  cardWidth: number;
  cardRef: (node: HTMLDivElement | null) => void;
  onActivate: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
}) {
  const palette = PALETTES[index % PALETTES.length];
  return (
    <div
      ref={cardRef}
      className="action-queue-card"
      role="button"
      tabIndex={0}
      aria-label={`${app.company_name} · ${app.position_name} · ${app.status}`}
      style={{
        '--aq-card-bg': palette.bg,
        '--aq-card-fg': palette.fg,
        position: 'relative',
        inset: 'auto',
        width: '100%',
        height: '100%',
        borderRadius: 16,
        boxSizing: 'border-box',
        padding: cardWidth < 120 ? '10px 12px' : '13px 15px',
        border: 0,
        background: palette.bg,
        backgroundImage: 'linear-gradient(160deg, rgba(255,255,255,.35), rgba(255,255,255,0) 55%)',
        color: palette.fg,
        font: 'inherit',
        textAlign: 'left',
        boxShadow: '0 8px 18px rgba(60,40,20,.08)',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transformStyle: 'preserve-3d',
        willChange: 'transform, opacity, filter',
        cursor: 'pointer',
        transition: 'box-shadow .25s ease',
        userSelect: 'none',
      } as React.CSSProperties}
      onClick={(event) => { event.stopPropagation(); onActivate(); }}
      onKeyDown={onKeyDown}
    >
      <span style={{ display: 'block', fontSize: 15, fontWeight: 700, lineHeight: 1 }}>{app.company_name.charAt(0)}</span>
      <strong style={{ display: 'block', marginTop: 4, overflow: 'hidden', fontSize: cardWidth < 120 ? 11 : 12, fontWeight: 700, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.company_name}</strong>
      <span style={{ display: 'block', marginTop: 2, overflow: 'hidden', fontSize: cardWidth < 120 ? 9.5 : 10.5, opacity: .72, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.position_name}</span>
      <em style={{ display: 'inline-block', marginTop: 4, borderRadius: 999, background: 'rgba(0,0,0,.1)', padding: '2px 6px', fontSize: 9, fontStyle: 'normal', fontWeight: 700 }}>{app.status}</em>
    </div>
  );
});

function ExpandedCard({ app, index, config, onClose, onViewDetail }: {
  app: Application;
  index: number;
  config: ViewportConfig;
  onClose: () => void;
  onViewDetail: () => void;
}) {
  const palette = PALETTES[index % PALETTES.length];
  const width = config.width < 400 ? 236 : config.width < 700 ? 268 : 300;
  return (
    <article
      className="action-queue-expanded"
      style={{
        position: 'absolute',
        zIndex: 50,
        top: '50%',
        left: '50%',
        display: 'flex',
        width,
        minHeight: config.cardH + 46,
        transform: 'translate(-50%,-50%)',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
        borderRadius: 18,
        padding: '18px 20px',
        background: palette.bg,
        backgroundImage: 'linear-gradient(160deg, rgba(255,255,255,.35), rgba(255,255,255,0) 55%)',
        color: palette.fg,
        boxShadow: '0 24px 50px rgba(60,40,20,.24)',
        animation: 'action-queue-expand-in .28s cubic-bezier(.16,1,.3,1)',
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <button className="action-queue-expanded__close" style={{ position: 'absolute', top: 9, right: 11, width: 23, height: 23, appearance: 'none', border: 0, borderRadius: '50%', background: 'rgba(0,0,0,.09)', color: 'inherit', fontSize: 18, lineHeight: 1, cursor: 'pointer' }} type="button" aria-label="关闭详情" onClick={onClose}>×</button>
      <div>
        <strong style={{ display: 'block', maxWidth: '88%', overflow: 'hidden', fontSize: 18, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.company_name}</strong>
        <span style={{ display: 'block', overflow: 'hidden', marginTop: 3, fontSize: 12, opacity: .72, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.position_name}</span>
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 10 }}><em style={{ borderRadius: 999, background: 'rgba(0,0,0,.1)', padding: '2px 6px', fontSize: 9, fontStyle: 'normal', fontWeight: 700 }}>{app.status}</em><em style={{ borderRadius: 999, background: 'rgba(0,0,0,.1)', padding: '2px 6px', fontSize: 9, fontStyle: 'normal', fontWeight: 700 }}>{priorityLabel(app.priority)}</em></div>
      <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px 12px', margin: '15px 0 0', fontSize: 10 }}>
        <div style={{ minWidth: 0 }}><dt style={{ opacity: .58 }}>城市</dt><dd style={{ overflow: 'hidden', margin: '2px 0 0', fontWeight: 700, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.city || '未填写'}</dd></div>
        <div style={{ minWidth: 0 }}><dt style={{ opacity: .58 }}>渠道</dt><dd style={{ overflow: 'hidden', margin: '2px 0 0', fontWeight: 700, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.channel || '未填写'}</dd></div>
        <div style={{ minWidth: 0 }}><dt style={{ opacity: .58 }}>下一步行动</dt><dd style={{ overflow: 'hidden', margin: '2px 0 0', fontWeight: 700, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.next_action || '待处理'}</dd></div>
        <div style={{ minWidth: 0 }}><dt style={{ opacity: .58 }}>截止时间</dt><dd style={{ overflow: 'hidden', margin: '2px 0 0', fontWeight: 700, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatDateTime(app.deadline_at)}</dd></div>
      </dl>
      <button className="action-queue-expanded__detail" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 12, appearance: 'none', border: '1px solid rgba(0,0,0,.14)', borderRadius: 8, background: 'rgba(0,0,0,.1)', padding: '6px 12px', color: palette.fg, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }} type="button" onClick={onViewDetail}>查看详情 <span aria-hidden>→</span></button>
    </article>
  );
}

export default function ActionQueueOrbit({ apps, onViewDetail }: ActionQueueOrbitProps) {
  const { theme } = useTheme();
  const shellRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rotationRef = useRef(0);
  const velocityRef = useRef(0);
  const lastFrameRef = useRef<number>();
  const animationRef = useRef<number>();
  const tweenRef = useRef<Tween | null>(null);
  const dragRef = useRef<{ startX: number; startRotation: number; moved: boolean } | null>(null);
  const scaleRef = useRef(1);
  const ignoreClickRef = useRef(false);
  const [viewport, setViewport] = useState<ViewportKey>(() => configForViewport(window.innerWidth));
  const [availableWidth, setAvailableWidth] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const config = VIEWPORTS[viewport];
  const mode = getMode(apps.length);
  const scale = Math.min(1, availableWidth > 0 ? availableWidth / config.width : 1);
  const scaledHeight = config.height * scale;

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    const onResize = () => setViewport(configForViewport(window.innerWidth));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return undefined;
    const observer = new ResizeObserver(([entry]) => setAvailableWidth(entry.contentRect.width));
    observer.observe(shell);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (selectedId && !apps.some((app) => app.id === selectedId)) setSelectedId(null);
    if (expandedId && !apps.some((app) => app.id === expandedId)) setExpandedId(null);
  }, [apps, expandedId, selectedId]);

  const swayFor = useCallback(() => (
    mode === 'fan' && !reducedMotion ? Math.sin(performance.now() / 1600) * 3 : 0
  ), [mode, reducedMotion]);

  const paint = useCallback((rotation: number) => {
    const step = angleStepFor(mode, apps.length);
    const sway = swayFor();
    if (ringRef.current) ringRef.current.style.transform = `rotateY(${rotation + sway}deg)`;
    const threshold = mode === 'fan' ? 200 : Math.min(130, config.visMult * step);
    cardRefs.current.forEach((card, index) => {
      if (!card) return;
      const theta = normalizeAngle(index * step + rotation + sway);
      const distance = Math.abs(theta);
      const opacity = Math.max(0, Math.min(1, distance >= threshold ? 0 : (1 - distance / threshold) ** 1.4));
      const tilt = -Math.sign(theta) * Math.min(distance, 90) / 90 * 6;
      const verticalOffset = distance / 180 * 16;
      const cardScale = 1 - distance / 180 * 0.28;
      const front = distance < step / 2;
      const dimmed = expandedId !== null;
      card.style.transform = `rotateZ(${tilt}deg) translateY(${verticalOffset + (front && hovered && !dimmed ? -6 : 0)}px) scale(${cardScale})`;
      card.style.opacity = String(dimmed ? Math.min(opacity, 0.35) : opacity);
      card.style.filter = !reducedMotion && distance > 4 ? `blur(${Math.min(1.4, distance / 130 * 1.4)}px)` : 'none';
      card.style.boxShadow = front && hovered && !dimmed ? '0 16px 32px rgba(60,40,20,.18)' : '0 8px 18px rgba(60,40,20,.08)';
      card.style.pointerEvents = opacity < 0.12 || dimmed ? 'none' : 'auto';
      card.tabIndex = opacity < 0.12 || dimmed ? -1 : 0;
      card.dataset.front = String(front);
    });
  }, [apps.length, config.visMult, expandedId, hovered, mode, reducedMotion, swayFor]);

  useEffect(() => {
    if (mode === 'empty' || mode === 'single') return undefined;
    const tick = (timestamp: number) => {
      const previous = lastFrameRef.current ?? timestamp;
      const delta = Math.min(48, timestamp - previous);
      lastFrameRef.current = timestamp;
      const tween = tweenRef.current;
      if (tween) {
        const progress = Math.min(1, (timestamp - tween.start) / tween.duration);
        const eased = 1 - (1 - progress) ** 3;
        rotationRef.current = tween.from + (tween.to - tween.from) * eased;
        if (progress === 1) tweenRef.current = null;
      } else if (mode === 'ring' && !reducedMotion) {
        const target = hovered || selectedId !== null || expandedId !== null ? 0 : AUTO_DEGREES_PER_MS;
        velocityRef.current += (target - velocityRef.current) * Math.min(1, delta / 260);
        rotationRef.current += velocityRef.current * delta;
      }
      paint(rotationRef.current);
      animationRef.current = requestAnimationFrame(tick);
    };
    animationRef.current = requestAnimationFrame(tick);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [expandedId, hovered, mode, paint, reducedMotion, selectedId]);

  const recenter = useCallback((index: number) => {
    const step = angleStepFor(mode, apps.length);
    const target = -index * step;
    // A normalized difference is the shortest route around the ring.
    const destination = rotationRef.current + normalizeAngle(target - rotationRef.current);
    tweenRef.current = { from: rotationRef.current, to: destination, start: performance.now(), duration: reducedMotion ? 0 : 460 };
    if (reducedMotion) rotationRef.current = destination;
    velocityRef.current = 0;
    setSelectedId(apps[index]?.id ?? null);
    setExpandedId(null);
  }, [apps, mode, reducedMotion]);

  const activate = useCallback((index: number) => {
    if (ignoreClickRef.current) { ignoreClickRef.current = false; return; }
    const step = angleStepFor(mode, apps.length);
    const front = frontIndex(apps.length, step, rotationRef.current, swayFor());
    const app = apps[index];
    if (front !== index && mode !== 'single') {
      recenter(index);
      return;
    }
    setSelectedId(app.id);
    setExpandedId((current) => current === app.id ? null : app.id);
  }, [apps, mode, recenter, swayFor]);

  const stepBy = useCallback((direction: number) => {
    if (apps.length < 2) return;
    const step = angleStepFor(mode, apps.length);
    const front = frontIndex(apps.length, step, rotationRef.current, swayFor());
    recenter((front + direction + apps.length) % apps.length);
  }, [apps.length, mode, recenter, swayFor]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (mode !== 'ring' && mode !== 'fan') return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startX: event.clientX, startRotation: rotationRef.current, moved: false };
    tweenRef.current = null;
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const delta = (event.clientX - drag.startX) / scaleRef.current;
    if (Math.abs(delta) > 6) drag.moved = true;
    if (drag.moved) {
      rotationRef.current = drag.startRotation + delta * 0.35;
      velocityRef.current = 0;
      setSelectedId(null);
    }
  };

  const onPointerUp = () => {
    if (!dragRef.current) return;
    const moved = dragRef.current.moved;
    dragRef.current = null;
    if (moved) {
      ignoreClickRef.current = true;
      const step = angleStepFor(mode, apps.length);
      recenter(frontIndex(apps.length, step, rotationRef.current, swayFor()));
    }
  };

  const onBlankClick = () => {
    if (expandedId) { setExpandedId(null); return; }
    if (selectedId) setSelectedId(null);
  };

  const cards = useMemo(() => apps.map((app, index) => {
    const base = index * angleStepFor(mode, apps.length);
    return (
      <div
        key={app.id}
        className="action-queue-slot"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: config.cardW,
          height: config.cardH,
          marginLeft: -config.cardW / 2,
          marginTop: -config.cardH / 2,
          transform: `rotateY(${base}deg) translateZ(${config.radius}px)`,
          transformStyle: 'preserve-3d',
        }}
      >
        <OrbitCard
          app={app}
          index={index}
          cardWidth={config.cardW}
          cardRef={(node) => { cardRefs.current[index] = node; }}
          onActivate={() => activate(index)}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === 'ArrowLeft') { event.preventDefault(); stepBy(-1); }
            if (event.key === 'ArrowRight') { event.preventDefault(); stepBy(1); }
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(index); }
            if (event.key === 'Escape') { setExpandedId(null); setSelectedId(null); }
          }}
        />
      </div>
    );
  }), [activate, apps, config.cardH, config.cardW, config.radius, mode, stepBy]);

  const expandedIndex = apps.findIndex((app) => app.id === expandedId);
  const expandedApp = expandedIndex >= 0 ? apps[expandedIndex] : null;
  const arcMaskHeight = Math.round(config.height * 0.36);
  const navButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    marginTop: 8,
    transform: 'translateY(-50%)',
    width: 34,
    height: 34,
    border: 0,
    borderRadius: '50%',
    background: 'rgba(255,253,248,.85)',
    color: '#6b665c',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    lineHeight: 1,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(60,50,35,.12)',
    zIndex: 20,
  };

  return (
    <section ref={shellRef} style={{ position: 'relative', width: '100%', height: scaledHeight, overflow: 'hidden', '--aq-focus': theme.accent } as React.CSSProperties}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: config.width, height: config.height, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <div
          className={`action-queue-stage action-queue-stage--${viewport}${expandedApp ? ' action-queue-stage--expanded' : ''}`}
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            borderRadius: 26,
            background: '#ece4d6',
            perspective: config.perspective,
            perspectiveOrigin: 'center center',
            touchAction: 'pan-y',
            userSelect: 'none',
            cursor: mode === 'ring' || mode === 'fan' ? 'grab' : 'default',
            outline: 'none',
          }}
          tabIndex={0}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => { setHovered(false); dragRef.current = null; }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClick={onBlankClick}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') { event.preventDefault(); stepBy(-1); }
            if (event.key === 'ArrowRight') { event.preventDefault(); stepBy(1); }
            if (event.key === 'Escape') { setExpandedId(null); setSelectedId(null); }
          }}
        >
          <div aria-hidden style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(244,200,74,.5), transparent 70%)', pointerEvents: 'none' }} />
          <header style={{ position: 'relative', zIndex: 20, padding: '20px 22px 0' }}>
            <strong style={{ display: 'block', color: '#a23d24', fontSize: 13, fontWeight: 700, letterSpacing: '.04em' }}>行动队列</strong>
            <span style={{ display: 'block', marginTop: 4, color: '#7a7468', fontSize: 13 }}>进行中的投递 · 点击卡片展开详情</span>
          </header>
          {mode === 'empty' ? <p style={{ position: 'relative', zIndex: 1, margin: '105px 0 0', textAlign: 'center', color: '#7a7468', fontSize: 13 }}>暂无待办，去「投递记录」添加一条吧。</p> : (
            <>
              {mode === 'single' ? (
                <div className="action-queue-single" style={{ position: 'absolute', top: config.height * .5 + 10, left: '50%', width: config.cardW, height: config.cardH, transform: 'translate(-50%,-50%)' }}>
                  <OrbitCard
                    app={apps[0]}
                    index={0}
                    cardWidth={config.cardW}
                    cardRef={(node) => { cardRefs.current[0] = node; }}
                    onActivate={() => activate(0)}
                    onKeyDown={(event) => {
                      event.stopPropagation();
                      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(0); }
                      if (event.key === 'Escape') { setExpandedId(null); setSelectedId(null); }
                    }}
                  />
                </div>
              ) : (
                <div style={{ position: 'absolute', left: '50%', top: config.height * .5 + 26, width: 0, height: 0, transformStyle: 'preserve-3d' }}>
                  <div ref={ringRef} style={{ position: 'absolute', width: 0, height: 0, transformStyle: 'preserve-3d', willChange: 'transform' }}>{cards}</div>
                </div>
              )}
              <div aria-hidden style={{ position: 'absolute', zIndex: 10, left: '50%', bottom: -Math.round(arcMaskHeight * .62), width: Math.round(config.width * 1.18), height: arcMaskHeight, transform: 'translateX(-50%)', borderRadius: '50%', background: '#ece4d6', boxShadow: 'inset 0 10px 18px rgba(60,40,20,.06), inset 0 -2px 0 rgba(255,255,255,.4)', pointerEvents: 'none' }} />
              {expandedApp && <ExpandedCard app={expandedApp} index={expandedIndex} config={config} onClose={() => setExpandedId(null)} onViewDetail={() => onViewDetail(expandedApp)} />}
              {mode !== 'single' && <>
                <button className="action-queue-nav" style={{ ...navButtonStyle, left: 10 }} type="button" aria-label="上一条投递" onClick={(event) => { event.stopPropagation(); stepBy(-1); }}>‹</button>
                <button className="action-queue-nav" style={{ ...navButtonStyle, right: 10 }} type="button" aria-label="下一条投递" onClick={(event) => { event.stopPropagation(); stepBy(1); }}>›</button>
              </>}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
