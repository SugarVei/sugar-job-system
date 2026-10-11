import { useEffect, useRef, useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import type { Application, ApplicationStatus } from '../types';
import { weeklyApplicationTrend } from '../lib/applicationsOverview';
import './OverviewTrendCard.css';

export default function OverviewTrendCard({ applications, activeStatus, children }: {
  applications: Application[];
  activeStatus: ApplicationStatus | null;
  children?: ReactNode;
}) {
  const [previousWeek, setPreviousWeek] = useState(false);
  const days = weeklyApplicationTrend(applications, new Date(), previousWeek, activeStatus);
  const period = previousWeek ? '上周' : '本周';
  const total = days.reduce((sum, day) => sum + day.count, 0);

  return (
    <section className="overview-trend-card" aria-label="投递趋势">
      <div className="overview-trend-head">
        <div>
          <h2>让每一次投递，都有迹可循。</h2>
          <div className="overview-trend-summary">
            <strong>{total.toLocaleString('zh-CN')}</strong>
            <span>{period}投递{activeStatus ? ` · ${activeStatus}` : ''}</span>
          </div>
        </div>
        <button className="overview-trend-period" type="button"
          aria-label={`当前${period}，切换到${previousWeek ? '本周' : '上周'}`}
          title={`查看${previousWeek ? '本周' : '上周'}`}
          onClick={() => setPreviousWeek(value => !value)}>{period}</button>
      </div>
      <TrendPlot key={`${days[0].key}-${activeStatus}`} days={days} />
      <p className="overview-trend-caption">
        {days[0].dateLabel} — {days[6].dateLabel} · 按投递日期统计，不含待投递
        {total === 0 && <span> · 暂无投递</span>}
      </p>
      {children}
    </section>
  );
}

function TrendPlot({ days }: { days: ReturnType<typeof weeklyApplicationTrend> }) {
  const [hover, setHover] = useState<number | null>(null);
  const line = useRef<SVGPathElement>(null);
  const max = Math.max(1, ...days.map(day => day.count));
  const points = days.map((day, index) => ({ x: 8 + index * 89, y: 167 - day.count / max * 136 }));
  // Horizontal tangents keep every segment within its two measured values:
  // a gentle curve without overshooting below zero or inventing extra peaks.
  const path = points.filter((_, index) => !days[index].future).map((point, index) => {
    if (index === 0) return `M${point.x},${point.y}`;
    const previous = points[index - 1];
    const midpoint = (previous.x + point.x) / 2;
    return `C${midpoint},${previous.y} ${midpoint},${point.y} ${point.x},${point.y}`;
  }).join(' ');

  useEffect(() => {
    const node = line.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      node.style.strokeDashoffset = '0';
      return;
    }
    let frame = 0;
    const start = performance.now();
    const draw = (now: number) => {
      const elapsed = (now - start) / 1000;
      node.style.strokeDashoffset = String((1 + 11 * elapsed) * Math.exp(-11 * elapsed));
      if (elapsed < 1.2) frame = requestAnimationFrame(draw);
      else node.style.strokeDashoffset = '0';
    };
    node.style.strokeDashoffset = '1';
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [path]);

  const selected = hover === null ? null : days[hover];
  const point = hover === null ? null : points[hover];
  const inspectPoint = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setHover(Math.max(0, Math.min(6, Math.round(((event.clientX - rect.left) / rect.width * 550 - 8) / 89))));
  };
  return (
    <>
      <div className="overview-trend-plot" role="group" tabIndex={0}
        aria-label="每日投递趋势，使用左右方向键查看每天的数据"
        onPointerMove={inspectPoint}
        onPointerDown={inspectPoint}
        onPointerLeave={event => { if (document.activeElement !== event.currentTarget) setHover(null); }}
        onFocus={() => setHover(value => value ?? 0)}
        onBlur={() => setHover(null)}
        onKeyDown={event => {
          if (event.key === 'Escape') { setHover(null); return; }
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          setHover(value => event.key === 'Home' ? 0 : event.key === 'End' ? 6
            : Math.max(0, Math.min(6, (value ?? 0) + (event.key === 'ArrowRight' ? 1 : -1))));
        }}>
        <svg viewBox="0 0 550 190" preserveAspectRatio="none" aria-hidden="true">
          {[42, 100, 158].map(y => <path className="overview-trend-grid" key={y} d={`M8 ${y}H542`} />)}
          <path className="overview-trend-line" ref={line} d={path} pathLength="1" strokeDasharray="1" strokeDashoffset="1" />
          {days.filter(day => !day.future).length === 1 && <circle cx={points[0].x} cy={points[0].y} r="3" fill="#c18b68" />}
        </svg>
        {selected && point && <>
          <div className="overview-trend-cross" style={{ left: `${point.x / 550 * 100}%` }} />
          {!selected.future && <div className="overview-trend-dot" style={{ left: `${point.x / 550 * 100}%`, top: `${point.y / 190 * 100}%` }} />}
          <div className="overview-trend-tooltip" role="status"
            style={{ left: `clamp(58px, ${point.x / 550 * 100}%, calc(100% - 58px))`, top: `${Math.max(18, (point.y / 190 * 100) - 9)}%` }}>
            <small>{selected.dateLabel} · {selected.label}</small>
            <span>{selected.future ? '尚未到来' : `${selected.count} 次投递`}</span>
          </div>
        </>}
      </div>
      <div className="overview-trend-axis" aria-hidden="true">
        {days.map(day => <span key={day.key} className={day.future ? 'is-future' : undefined}>{day.label}</span>)}
      </div>
    </>
  );
}
