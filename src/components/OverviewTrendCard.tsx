import { useEffect, useRef, useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import type { Application, ApplicationStatus } from '../types';
import { buildApplicationTrend, resolveTrendRange, trendDateKey } from '../lib/applicationTrend';
import type { TrendPreset } from '../lib/applicationTrend';
import './OverviewTrendCard.css';

const PERIODS: { value: TrendPreset; label: string }[] = [
  { value: 'week', label: '本周' }, { value: 'previousWeek', label: '上周' },
  { value: 'twoWeeks', label: '近 2 周' }, { value: 'fourWeeks', label: '近 4 周' },
  { value: 'month', label: '本月' }, { value: 'previousMonth', label: '上月' },
  { value: 'threeMonths', label: '近 3 个月' }, { value: 'sixMonths', label: '近 6 个月' },
  { value: 'custom', label: '自定义日期' },
];

export default function OverviewTrendCard({ applications, activeStatus, children }: {
  applications: Application[];
  activeStatus: ApplicationStatus | null;
  children?: ReactNode;
}) {
  const [preset, setPreset] = useState<TrendPreset>('week');
  const [custom, setCustom] = useState(() => {
    const now = new Date();
    return { start: trendDateKey(new Date(now.getFullYear(), now.getMonth(), 1)), end: trendDateKey(now) };
  });
  const now = new Date();
  const range = resolveTrendRange(preset, now, custom);
  const days = range ? buildApplicationTrend(applications, range, now, activeStatus) : [];
  const period = PERIODS.find(option => option.value === preset)!.label;
  const unitLabel = range?.unit === 'month' ? '按月汇总' : range?.unit === 'week' ? '按周汇总' : '按天汇总';
  const total = days.reduce((sum, day) => sum + day.count, 0);

  return (
    <section className="overview-trend-card" aria-label="投递趋势">
      <div className="overview-trend-head">
        <div>
          <h2>让每一次投递，都有迹可循。</h2>
          <div className="overview-trend-summary">
            <strong>{range ? total.toLocaleString('zh-CN') : '—'}</strong>
            <span>{period}投递{activeStatus ? ` · ${activeStatus}` : ''}</span>
          </div>
        </div>
        <select className="overview-trend-period" aria-label="投递趋势时间范围"
          value={preset} onChange={event => setPreset(event.target.value as TrendPreset)}>
          {PERIODS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
      {preset === 'custom' && <div className="overview-trend-range">
        <label><span>开始日期</span><input type="date" aria-label="趋势开始日期" value={custom.start}
          max={trendDateKey(now)} onChange={event => setCustom(value => ({ ...value, start: event.target.value }))} /></label>
        <label><span>结束日期</span><input type="date" aria-label="趋势结束日期" value={custom.end}
          max={trendDateKey(now)} min={custom.start} onChange={event => setCustom(value => ({ ...value, end: event.target.value }))} /></label>
      </div>}
      {range ? <TrendPlot key={`${range.start}-${range.end}-${range.unit}-${activeStatus}`} days={days} unitLabel={unitLabel} />
        : <div className="overview-trend-invalid" role="alert">{custom.start && custom.end && custom.start > custom.end ? '开始日期不能晚于结束日期' : '请选择有效的开始和结束日期'}</div>}
      {range && <p className="overview-trend-caption">
        {range.start.replace(/-/g, '/')} — {range.end.replace(/-/g, '/')} · {unitLabel} · 不含待投递
        {range.end > trendDateKey(now) && <span> · 截至今天</span>}
        {total === 0 && <span> · 暂无投递</span>}
      </p>}
      {children}
    </section>
  );
}

function TrendPlot({ days, unitLabel }: { days: ReturnType<typeof buildApplicationTrend>; unitLabel: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const line = useRef<SVGPathElement>(null);
  const max = Math.max(1, ...days.map(day => day.count));
  const points = days.map((day, index) => ({ x: days.length === 1 ? 275 : 8 + index / (days.length - 1) * 534, y: 167 - day.count / max * 136 }));
  const axisIndices = Array.from({ length: Math.min(7, days.length) }, (_, index) => days.length === 1 ? 0 : Math.round(index / (Math.min(7, days.length) - 1) * (days.length - 1)));
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
    setHover(Math.max(0, Math.min(days.length - 1, Math.round(((event.clientX - rect.left) / rect.width * 550 - 8) / 534 * (days.length - 1)))));
  };
  return (
    <>
      <div className="overview-trend-plot" role="group" tabIndex={0}
        aria-label={`投递趋势，${unitLabel}，使用左右方向键查看数据`}
        onPointerMove={inspectPoint}
        onPointerDown={inspectPoint}
        onPointerLeave={event => { if (event.pointerType !== 'touch' && document.activeElement !== event.currentTarget) setHover(null); }}
        onPointerCancel={() => setHover(null)}
        onFocus={() => setHover(value => value ?? 0)}
        onBlur={() => setHover(null)}
        onKeyDown={event => {
          if (event.key === 'Escape') { setHover(null); return; }
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          setHover(value => event.key === 'Home' ? 0 : event.key === 'End' ? days.length - 1
            : Math.max(0, Math.min(days.length - 1, (value ?? 0) + (event.key === 'ArrowRight' ? 1 : -1))));
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
            <small>{selected.dateLabel}</small>
            <span>{selected.future ? '尚未到来' : `${selected.count} 次投递`}</span>
          </div>
        </>}
      </div>
      <div className="overview-trend-axis" aria-hidden="true">
        {axisIndices.map(index => <span key={days[index].key} className={days[index].future ? 'is-future' : undefined}
          style={{ left: `${points[index].x / 550 * 100}%` }}>{days[index].label}</span>)}
      </div>
    </>
  );
}
