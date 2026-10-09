import { useEffect, useState } from 'react';
import { ArrowLeft, Monitor } from 'lucide-react';
import CommunityWorld from './CommunityWorld';
import type { WorldRenderQuality } from './renderQuality';
import './StandaloneTown.css';

function initialQuality(storageKey: string): WorldRenderQuality {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === 'ultra' || saved === 'high' || saved === 'adaptive') return saved;
  } catch { /* The map also works when browser storage is unavailable. */ }
  return window.innerWidth < 700 ? 'high' : 'ultra';
}

export default function StandaloneTown({ returnHref = '/#/community-world', storageKey = 'sugar-town-quality' }: { returnHref?: string; storageKey?: string }) {
  const [quality, setQuality] = useState<WorldRenderQuality>(() => initialQuality(storageKey));
  useEffect(() => {
    const previousTitle = document.title;
    document.title = '求职小镇 · 初见岛';
    return () => { document.title = previousTitle; };
  }, []);
  const changeQuality = (next: WorldRenderQuality) => {
    setQuality(next);
    try { localStorage.setItem(storageKey, next); } catch { /* Optional preference. */ }
  };
  return <main className="standalone-town" data-release="community-town-room-design-v2">
    <nav className="town-session-bar" aria-label="小镇页面设置">
      <a href={returnHref} className="town-back"><ArrowLeft size={15}/>返回入口</a>
      <label className="town-quality"><Monitor size={15}/><span>清晰度</span><select aria-label="画面清晰度" value={quality} onChange={event => changeQuality(event.target.value as WorldRenderQuality)}><option value="ultra">4K 超清</option><option value="high">高清</option><option value="adaptive">流畅</option></select></label>
    </nav>
    <CommunityWorld visualQuality={quality} enhancedDetails/>
  </main>;
}
