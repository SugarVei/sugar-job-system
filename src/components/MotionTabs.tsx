import { useLayoutEffect, useRef } from 'react';

export default function MotionTabs<T extends string>({ value, onChange, options, label, className = '' }: {
  value: T; onChange: (value: T) => void; options: { value: T; label: string }[]; label: string; className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const history = useRef<{ left: number; right: number; changes: { time: number; left: number; right: number; leftK: number; rightK: number }[] } | null>(null);
  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;
    const indicator = node.querySelector<HTMLElement>('.sugar-tab-indicator')!;
    let frame = 0;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const response = (time: number, k: number) => time <= 0 ? 0 : 1 - (1 + k * time) * Math.exp(-k * time);
    const move = () => {
      const button = node.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
      if (!button) return;
      const p = node.getBoundingClientRect(), b = button.getBoundingClientRect();
      const left = b.left - p.left - node.clientLeft, right = b.right - p.left - node.clientLeft;
      if (!history.current) history.current = { left, right, changes: [] };
      const h = history.current;
      const targetLeft = h.left + h.changes.reduce((sum, c) => sum + c.left, 0);
      const targetRight = h.right + h.changes.reduce((sum, c) => sum + c.right, 0);
      h.changes.push({ time: performance.now() / 1000, left: left - targetLeft, right: right - targetRight, leftK: left < targetLeft ? 30 : 21, rightK: left < targetLeft ? 21 : 30 });
      cancelAnimationFrame(frame);
      const draw = (now: number) => {
        now /= 1000;
        const l = reduced.matches ? left : h.left + h.changes.reduce((sum, c) => sum + c.left * response(now - c.time, c.leftK), 0);
        const r = reduced.matches ? right : h.right + h.changes.reduce((sum, c) => sum + c.right * response(now - c.time, c.rightK), 0);
        indicator.style.left = `${l}px`;
        indicator.style.width = `${Math.max(10, r - l)}px`;
        if (!reduced.matches && now - h.changes[h.changes.length - 1].time < .7) frame = requestAnimationFrame(draw);
        else { indicator.style.left = `${left}px`; indicator.style.width = `${right - left}px`; history.current = { left, right, changes: [] }; }
      };
      frame = requestAnimationFrame(draw);
    };
    move();
    const observer = new ResizeObserver(move);
    observer.observe(node);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [value]);
  return <div ref={root} className={`sugar-motion-tabs ${className}`} role="group" aria-label={label}>
    <span className="sugar-tab-indicator" aria-hidden="true" />
    {options.map(option => <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}</button>)}
  </div>;
}
