import { useEffect, useMemo, useRef, useState } from 'react';
import type { Application } from '../../types';
export default function ApplicationTrend({ applications }: { applications: Application[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const line = useRef<SVGPathElement>(null);
  const days = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6 + i);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      return { key, label: `${date.getMonth() + 1}/${date.getDate()}`, count: applications.filter(a => a.status !== '待投递' && a.apply_date?.slice(0, 10) === key).length };
    });
  }, [applications]);
  const max = Math.max(1, ...days.map(d => d.count));
  const points = days.map((d, i) => ({ x: 24 + i * 100, y: 140 - d.count / max * 106 }));
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
  useEffect(() => {
    const node = line.current; if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { node.style.strokeDashoffset = '0'; return; }
    let frame = 0; const start = performance.now();
    const draw = (now: number) => { const t = (now - start) / 1000; node.style.strokeDashoffset = String((1 + 12 * t) * Math.exp(-12 * t)); if (t < 1) frame = requestAnimationFrame(draw); else node.style.strokeDashoffset = '0'; };
    frame = requestAnimationFrame(draw); return () => cancelAnimationFrame(frame);
  }, [path]);
  const selected = hover === null ? null : days[hover];
  return <section className="ao-card sugar-trend" aria-label="最近七天投递趋势">
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><h2 style={{ margin: 0 }}>最近 7 天投递</h2><span style={{ color: 'var(--sugar-ink-tertiary)', fontSize: 11 }}>当前筛选 · {days.reduce((n, d) => n + d.count, 0)} 次</span></div>
    <div className="sugar-trend-plot" onPointerLeave={() => setHover(null)}>
      <svg viewBox="0 0 648 172" preserveAspectRatio="none" aria-hidden="true">
        {[34, 87, 140].map(y => <line key={y} x1="24" x2="624" y1={y} y2={y} stroke="#eee7dc" strokeWidth="1" />)}
        <path ref={line} d={path} fill="none" stroke="var(--sugar-accent,#9a5b62)" strokeWidth="2" vectorEffect="non-scaling-stroke" pathLength="1" strokeDasharray="1" strokeDashoffset="1" />
        {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={hover === i ? 5 : 3} fill="var(--sugar-accent,#9a5b62)" />)}
      </svg>
      {days.map((d, i) => <button className="sugar-trend-point" key={d.key} aria-label={`${d.key}，投递 ${d.count} 次`} onPointerEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} onClick={() => setHover(i)} style={{ left: `${points[i].x / 648 * 100}%` }}><span>{d.label}</span></button>)}
      {selected && <div className="sugar-trend-tooltip" role="status" style={{ left: `clamp(64px, ${points[hover!].x / 648 * 100}%, calc(100% - 64px))` }}>{selected.label} · {selected.count} 次投递</div>}
    </div>
    <p style={{ margin: 0, color: 'var(--sugar-ink-tertiary)', fontSize: 11 }}>按投递日期统计，不含待投递记录</p>
  </section>;
}
