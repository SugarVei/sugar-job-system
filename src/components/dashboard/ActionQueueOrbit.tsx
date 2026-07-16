import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Application, ApplicationPriority } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import './ActionQueueOrbit.css';

interface ActionQueueOrbitProps {
  apps: Application[];
  onViewDetail: (app: Application) => void;
}

const PALETTES = [
  { bg: '#f2ddd0', fg: '#7a3a1e' }, { bg: '#d4e8d0', fg: '#2a5e34' },
  { bg: '#f0e4b8', fg: '#6a4a08' }, { bg: '#ddd4ec', fg: '#4a3670' },
  { bg: '#c8e0d4', fg: '#1e5a44' }, { bg: '#f4d4c8', fg: '#7a3228' },
  { bg: '#e0dcc8', fg: '#5a4018' }, { bg: '#d0dcec', fg: '#2a4070' },
  { bg: '#eed4d8', fg: '#6a2838' }, { bg: '#d8e8d0', fg: '#285828' },
  { bg: '#f4e0c0', fg: '#6a3808' }, { bg: '#d8d4e8', fg: '#382e60' },
];

const AUTO_DEGREES_PER_SECOND = 360 / 16;
const CLICK_DURATION = 560;
const normalizeAngle = (angle: number) => ((angle + 180) % 360 + 360) % 360 - 180;

function visibleThresholdFor(angleStep: number, width: number) {
  const responsiveVisibilityMultiplier = width < 480 ? 2 : width < 760 ? 2.15 : 2.3;
  return Math.min(130, responsiveVisibilityMultiplier * angleStep);
}

function priorityLabel(priority: ApplicationPriority | null | undefined) {
  return priority === 'urgent' ? '紧急' : priority === 'high' ? '高' : priority === 'low' ? '低' : '普通';
}

function formatDateTime(value: string | null) {
  if (!value) return '未设置';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

function easeOutCubic(value: number) {
  return 1 - (1 - value) ** 3;
}

type OrbitMetrics = { width: number; cardWidth: number; cardHeight: number; radius: number; stageHeight: number };

function metricsForWidth(width: number): OrbitMetrics {
  if (width < 480) return { width, cardWidth: 100, cardHeight: 138, radius: 120, stageHeight: 240 };
  if (width < 760) return { width, cardWidth: 122, cardHeight: 166, radius: 190, stageHeight: 280 };
  return { width, cardWidth: 150, cardHeight: 204, radius: 250, stageHeight: 300 };
}

type ProgrammaticRotation = { from: number; to: number; startedAt: number; duration: number };

const OrbitCard = memo(function OrbitCard({
  app, index, expanded, selected, dimmed, onActivate, onViewDetail,
}: {
  app: Application;
  index: number;
  expanded: boolean;
  selected: boolean;
  dimmed: boolean;
  onActivate: () => void;
  onViewDetail: () => void;
}) {
  const palette = PALETTES[index % PALETTES.length];
  return (
    <article
      className={`action-orbit-card${expanded ? ' action-orbit-card--expanded' : ''}${dimmed ? ' action-orbit-card--dimmed' : ''}`}
      data-orbit-card
      tabIndex={0}
      role="button"
      aria-label={`${app.company_name} ${app.position_name}${expanded ? '，已展开' : ''}`}
      aria-expanded={expanded}
      style={{ '--aq-bg': palette.bg, '--aq-fg': palette.fg } as React.CSSProperties}
      onClick={(event) => { event.stopPropagation(); onActivate(); }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onActivate(); }
      }}
    >
      <div className="action-orbit-card__shine" />
      <div className="action-orbit-card__summary" aria-hidden={expanded}>
        <span className="action-orbit-card__initial">{app.company_name.charAt(0)}</span>
        <strong>{app.company_name}</strong>
        <span>{app.position_name}</span>
        <em>{app.status}</em>
      </div>
      <div className="action-orbit-card__detail" aria-hidden={!expanded}>
        <div>
          <strong>{app.company_name}</strong>
          <span>{app.position_name}</span>
        </div>
        <dl>
          <div><dt>城市</dt><dd>{app.city || '未填写'}</dd></div>
          <div><dt>渠道</dt><dd>{app.channel || '未填写'}</dd></div>
          <div><dt>状态</dt><dd>{app.status}</dd></div>
          <div><dt>优先级</dt><dd>{priorityLabel(app.priority)}</dd></div>
          <div><dt>下一步</dt><dd>{app.next_action || '待处理'}</dd></div>
          <div><dt>截止时间</dt><dd>{formatDateTime(app.deadline_at)}</dd></div>
        </dl>
        <button type="button" onClick={(event) => { event.stopPropagation(); onViewDetail(); }}>
          查看详情 <span aria-hidden>→</span>
        </button>
      </div>
      {selected && <span className="sr-only">当前中心卡片</span>}
    </article>
  );
});

export default function ActionQueueOrbit({ apps, onViewDetail }: ActionQueueOrbitProps) {
  const { theme } = useTheme();
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const frameRef = useRef<number>();
  const rotationRef = useRef(0);
  const speedRef = useRef(1);
  const lastFrameRef = useRef<number>();
  const programRef = useRef<ProgrammaticRotation | null>(null);
  const draggingRef = useRef<{ startX: number; startRotation: number; moved: boolean } | null>(null);
  const ignoreClickRef = useRef(false);
  const [metrics, setMetrics] = useState(() => metricsForWidth(640));
  // A full ring starts unselected so it can autoplay; a short fan needs a stable centre card.
  const [selectedId, setSelectedId] = useState<string | null>(() => apps.length < 5 ? apps[0]?.id ?? null : null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const count = apps.length;
  const currentIndex = Math.max(0, apps.findIndex((app) => app.id === selectedId));
  const isOrbit = count >= 5;
  const isPaused = hovered || selectedId !== null || expandedId !== null || reducedMotion || count < 2;

  useEffect(() => {
    if (selectedId !== null && !apps.some((app) => app.id === selectedId)) setSelectedId(apps[0]?.id ?? null);
    if (!apps.some((app) => app.id === expandedId)) setExpandedId(null);
  }, [apps, expandedId, selectedId]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(([entry]) => setMetrics(metricsForWidth(entry.contentRect.width)));
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const renderCards = useCallback((rotation: number) => {
    const step = count ? 360 / count : 0;
    const fanStep = count > 1 ? 42 : 0;
    cardRefs.current.forEach((card, index) => {
      if (!card) return;
      // Standardise to [-180°, 180°] so both sides use the same visual falloff.
      const theta = isOrbit
        ? normalizeAngle(index * step + rotation)
        : (index - currentIndex) * fanStep;
      const distance = Math.abs(theta);
      const threshold = isOrbit ? visibleThresholdFor(step, metrics.width) : 92;
      const visible = distance < threshold;
      const progress = Math.min(distance / 180, 1);
      const scale = 1 - progress * 0.28;
      const opacity = visible ? (1 - distance / threshold) ** 1.4 : 0;
      const y = progress * 16;
      const tilt = -Math.sign(theta) * Math.min(distance, 90) / 90 * 6;
      const transform = isOrbit
        // rotateY + translateZ forms the ring; the inverse rotation keeps card copy legible.
        ? `rotateY(${theta}deg) translateZ(${metrics.radius}px) rotateY(${-theta}deg) translateY(${y}px) rotateZ(${tilt}deg) scale(${scale})`
        : `translateX(${theta * 2.8}px) translateY(${y}px) rotateZ(${tilt}deg) scale(${scale})`;
      card.style.transform = transform;
      card.style.opacity = String(expandedId && apps[index].id !== expandedId ? Math.min(opacity, 0.35) : opacity);
      card.style.zIndex = String(Math.round(1000 - distance * 4));
      card.style.pointerEvents = visible && !expandedId ? 'auto' : apps[index].id === expandedId ? 'auto' : 'none';
      card.tabIndex = visible || apps[index].id === expandedId ? 0 : -1;
      card.setAttribute('aria-hidden', visible || apps[index].id === expandedId ? 'false' : 'true');
      card.style.filter = reducedMotion ? 'none' : `blur(${Math.min(progress * 0.4, 0.4)}px)`;
    });
  }, [apps, count, currentIndex, expandedId, isOrbit, metrics.radius, metrics.width, reducedMotion]);

  useEffect(() => {
    if (!count) return;
    const tick = (timestamp: number) => {
      const previous = lastFrameRef.current ?? timestamp;
      const elapsed = Math.min(timestamp - previous, 48);
      lastFrameRef.current = timestamp;
      const program = programRef.current;
      if (program) {
        const progress = Math.min(1, (timestamp - program.startedAt) / program.duration);
        rotationRef.current = program.from + (program.to - program.from) * easeOutCubic(progress);
        if (progress === 1) programRef.current = null;
      } else if (isOrbit && !reducedMotion) {
        // Smoothly ramp to a stop/start over ~260ms instead of freezing on hover.
        const desiredSpeed = isPaused ? 0 : 1;
        speedRef.current += (desiredSpeed - speedRef.current) * Math.min(1, elapsed / 260);
        rotationRef.current += AUTO_DEGREES_PER_SECOND * speedRef.current * (elapsed / 1000);
      }
      renderCards(rotationRef.current);
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [count, isOrbit, isPaused, reducedMotion, renderCards]);

  const centreIndex = useCallback((index: number) => {
    if (!count) return;
    const target = isOrbit ? -(index * (360 / count)) : 0;
    const difference = isOrbit ? normalizeAngle(target - rotationRef.current) : 0;
    programRef.current = { from: rotationRef.current, to: rotationRef.current + difference, startedAt: performance.now(), duration: CLICK_DURATION };
    setExpandedId(null);
    setSelectedId(apps[index].id);
  }, [apps, count, isOrbit]);

  const moveBy = useCallback((direction: number) => {
    if (!count) return;
    centreIndex((currentIndex + direction + count) % count);
  }, [centreIndex, count, currentIndex]);

  const onCardActivate = useCallback((index: number) => {
    if (ignoreClickRef.current) { ignoreClickRef.current = false; return; }
    const app = apps[index];
    if (app.id !== selectedId) { centreIndex(index); return; }
    setExpandedId((current) => current === app.id ? null : app.id);
  }, [apps, centreIndex, selectedId]);

  const snapNearest = useCallback(() => {
    if (!count) return;
    const step = 360 / count;
    const index = ((Math.round(-rotationRef.current / step) % count) + count) % count;
    centreIndex(index);
  }, [centreIndex, count]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (count < 2 || expandedId) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = { startX: event.clientX, startRotation: rotationRef.current, moved: false };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = draggingRef.current;
    if (!drag || !isOrbit) return;
    const delta = event.clientX - drag.startX;
    if (Math.abs(delta) > 6) drag.moved = true;
    if (drag.moved) {
      programRef.current = null;
      rotationRef.current = drag.startRotation + delta * 0.28;
      setSelectedId(null);
    }
  };

  const onPointerUp = () => {
    const moved = draggingRef.current?.moved;
    draggingRef.current = null;
    if (moved) { ignoreClickRef.current = true; snapNearest(); }
  };

  const onStageClick = () => {
    if (expandedId) { setExpandedId(null); return; }
    setSelectedId(null);
  };

  const onStageKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); moveBy(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); moveBy(1); }
    if (event.key === 'Escape') { setExpandedId(null); setSelectedId(null); }
  };

  const cards = useMemo(() => apps.map((app, index) => (
    <OrbitCard
      key={app.id}
      app={app}
      index={index}
      selected={app.id === selectedId}
      expanded={app.id === expandedId}
      dimmed={expandedId !== null && app.id !== expandedId}
      onActivate={() => onCardActivate(index)}
      onViewDetail={() => onViewDetail(app)}
    />
  )), [apps, expandedId, onCardActivate, onViewDetail, selectedId]);

  return (
    <section className="action-orbit" style={{
      '--aq-accent': theme.accent,
      '--aq-accent-soft': theme.accentSoft,
      '--aq-surface': theme.accentSoft,
    } as React.CSSProperties}>
      <div className="action-orbit__glow" />
      <header className="action-orbit__header">
        <div><p>行动队列</p><span>进行中的投递 · 点击卡片展开详情</span></div>
        {count > 1 && <div className="action-orbit__controls" aria-label="切换投递记录">
          <button type="button" onClick={() => moveBy(-1)} aria-label="上一条投递记录"><svg viewBox="0 0 24 24" aria-hidden><path d="m14 5-7 7 7 7" /></svg></button>
          <button type="button" onClick={() => moveBy(1)} aria-label="下一条投递记录"><svg viewBox="0 0 24 24" aria-hidden><path d="m10 5 7 7-7 7" /></svg></button>
        </div>}
      </header>
      {count === 0 ? <div className="action-orbit__empty">暂无待办，去「投递记录」添加一条吧。</div> : (
        <div
          ref={stageRef}
          className={`action-orbit__stage${count === 1 ? ' action-orbit__stage--single' : ''}${!isOrbit ? ' action-orbit__stage--fan' : ''}${expandedId ? ' action-orbit__stage--expanded' : ''}`}
          style={{ height: metrics.stageHeight, '--aq-card-w': `${metrics.cardWidth}px`, '--aq-card-h': `${metrics.cardHeight}px` } as React.CSSProperties}
          onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
          onClick={onStageClick} onKeyDown={onStageKeyDown}
        >
          <div className="action-orbit__depth" aria-hidden />
          <div className="action-orbit__ring" aria-hidden />
          <div className="action-orbit__cards">
            {cards.map((card, index) => (
              <div key={apps[index].id} className="action-orbit__card-wrap" style={{ zIndex: apps[index].id === expandedId ? 1901 : undefined }} ref={(node) => { cardRefs.current[index] = node?.firstElementChild as HTMLElement | null; }}>
                {card}
              </div>
            ))}
          </div>
          <div className="action-orbit__mask" aria-hidden />
        </div>
      )}
    </section>
  );
}
