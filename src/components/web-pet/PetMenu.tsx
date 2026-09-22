import { useEffect, useRef } from 'react';
import type { PetAction, PetSnapshot } from './types';
import { STATE_LABELS } from './petConfig';

export default function PetMenu({ snapshot, onAction, onClose, onChat }: { snapshot: PetSnapshot; onAction: (action: PetAction) => void; onClose: () => void; onChat?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true }); }, []);
  return <div ref={ref} className="pet-menu" role="menu" aria-label="大象宝宝菜单" onKeyDown={e => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const items = Array.from(ref.current?.querySelectorAll('button') ?? []);
      const index = items.indexOf(document.activeElement as HTMLButtonElement);
      items[(index + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus();
    }
  }}>
    <div className="pet-menu-heading"><span>小糖豆 🐘</span><span>你的大象小伙伴</span></div>
    <p className="pet-menu-mood">{STATE_LABELS[snapshot.state]} · {snapshot.stats.mood >= 60 ? '心情不错' : '需要一点关心'}</p>
    {onChat && <button type="button" role="menuitem" onClick={onChat}><span className="pet-menu-icon">☁</span><span>和我聊聊<small>分享今天的小心事</small></span></button>}
    {([
      ['play', '◉', '陪它玩', '丢一颗小球'], ['pet', '♡', '摸摸头', '轻轻夸夸它'],
      ['sleep', '☾', '睡觉', '休息一会儿'], ['hide', '↘', '暂时隐藏', '随时可以召回'],
    ] as const).map(([action, icon, label, hint]) => <button key={action} type="button" role="menuitem" onClick={() => onAction(action)}>
      <span className="pet-menu-icon">{icon}</span><span>{label}<small>{hint}</small></span>
    </button>)}
    <div className="pet-menu-hint">拖动可以把它抱起来</div>
  </div>;
}
