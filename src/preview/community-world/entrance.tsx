import ReactDOM from 'react-dom/client';
import { ArrowUpRight, Compass, Cuboid } from 'lucide-react';
import PreviewShell from './PreviewShell';
import './entrance.css';

export function TownEntrance() {
  return <PreviewShell>
    <section className="town-entrance" aria-label="求职小镇入口">
      <img className="town-entrance-landscape" src="/town-entrance-preview.jpg" alt=""/>
      <div className="town-entrance-glass"/>
      <div className="town-entrance-content">
        <div className="town-entrance-symbol" aria-hidden="true"><Cuboid size={38} strokeWidth={1.35}/></div>
        <h2>给努力生活的你，<br/>留一间小天地。</h2>
        <p>布置喜欢的房间，遇见同路的人。<br/>在初见岛，慢慢逛一会儿。</p>
        <a className="town-enter-button" href="/town-preview.html" target="_blank" rel="noopener noreferrer">进入求职小镇<ArrowUpRight size={20}/></a>
        <span className="town-entry-note">在新标签页，开启你的小镇生活</span>
      </div>
      <footer className="town-entrance-footer"><span>每一个小房间，都有一个大梦想。</span><span><Compass size={15}/>初见岛</span></footer>
    </section>
  </PreviewShell>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<TownEntrance/>);
