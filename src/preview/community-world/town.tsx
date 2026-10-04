import { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { ArrowLeft, Monitor } from 'lucide-react';
import CommunityWorld from '../../components/community-world/CommunityWorld';
import type { WorldRenderQuality } from '../../components/community-world/renderQuality';
import './town.css';

function initialQuality(): WorldRenderQuality {
  try {
    const saved=localStorage.getItem('sugar-town-preview-quality');
    if(saved==='ultra'||saved==='high'||saved==='adaptive')return saved;
  } catch { /* The map also works when browser storage is unavailable. */ }
  return window.innerWidth<700?'high':'ultra';
}

export function StandaloneTown() {
  const [quality,setQuality]=useState<WorldRenderQuality>(initialQuality);
  const changeQuality=(next:WorldRenderQuality)=>{
    setQuality(next);
    try {localStorage.setItem('sugar-town-preview-quality',next);} catch { /* Optional preference. */ }
  };
  return <main className="standalone-town">
    <nav className="town-session-bar" aria-label="小镇页面设置">
      <a href="/entrance-preview.html" className="town-back"><ArrowLeft size={15}/>返回入口</a>
      <label className="town-quality"><Monitor size={15}/><span>清晰度</span><select aria-label="画面清晰度" value={quality} onChange={event=>changeQuality(event.target.value as WorldRenderQuality)}><option value="ultra">4K 超清</option><option value="high">高清</option><option value="adaptive">流畅</option></select></label>
    </nav>
    <CommunityWorld visualQuality={quality} enhancedDetails/>
  </main>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<StandaloneTown/>);
