import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import ElephantVideo from '../components/web-pet/ElephantVideo';
import { elephantClips } from '../components/web-pet/elephantAnimations';
import './ElephantPreview.css';

function ElephantPreview() {
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [background, setBackground] = useState('cream');
  const [size, setSize] = useState(330);
  const [speed, setSpeed] = useState(1);
  const [direction, setDirection] = useState(1);
  const [showPet, setShowPet] = useState(true);
  const [greeting, setGreeting] = useState(false);
  const floating = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const greetingTimer = useRef<ReturnType<typeof setTimeout>>();
  const clip = elephantClips[selected];
  useEffect(() => {
    const clamp = () => {
      const pet = floating.current;
      if (!pet || !pet.style.left) return;
      const box = pet.getBoundingClientRect();
      pet.style.left = `${Math.max(0, Math.min(box.left, innerWidth - box.width))}px`;
      pet.style.top = `${Math.max(0, Math.min(box.top, innerHeight - box.height))}px`;
    };
    window.addEventListener('resize', clamp);
    return () => { window.removeEventListener('resize', clamp); clearTimeout(greetingTimer.current); };
  }, []);
  const sayHello = () => {
    setGreeting(true);
    clearTimeout(greetingTimer.current);
    greetingTimer.current = setTimeout(() => setGreeting(false), 3800);
  };
  return <div className="elephant-app">
    <header className="page-header"><a className="brand" href="/elephant-preview.html"><span className="brand-mark">✳</span>Sugar<span className="brand-divider" />小小陪伴计划</a><span className="preview-badge"><i />形象预览 · 01</span></header>
    <main>
      <div className="page-heading"><div><p className="eyebrow">A LITTLE FRIEND, A LOT OF JOY</p><h1>你好，大象宝宝<span>。</span></h1><p className="intro">把一点可爱，放进认真生活的每一天。</p></div><span className="handwritten">新的小伙伴，来报到啦 ↙</span></div>
      <div className="preview-layout">
        <section className={`stage stage-${background}`} aria-label="大象动画展示区">
          <div className="stage-top"><span><i />{paused ? '已暂停' : '正在播放'} · {clip.name}</span><span>ELEPHANT / 01</span></div>
          <div className="stage-art" style={{ width: size }}><ElephantVideo clip={clip} paused={paused} speed={speed} direction={direction} /></div>
          <div className="stage-caption"><h2>{clip.name}</h2><p>{clip.description}</p></div>
          <div className="stage-bottom"><button onClick={() => setPaused(p => !p)} aria-label={paused ? '播放动画' : '暂停动画'}>{paused ? '▶' : 'Ⅱ'}<span>{paused ? '继续播放' : '暂停看看'}</span></button><div className="swatches" aria-label="背景颜色">{[['cream', '奶油白'], ['sage', '鼠尾草绿'], ['night', '深夜蓝'], ['grid', '透明棋盘']].map(([value, label]) => <button key={value} className={`swatch swatch-${value}`} aria-label={label} aria-pressed={background === value} title={label} onClick={() => setBackground(value)} />)}</div></div>
        </section>
        <aside className="controls"><div className="controls-heading"><span className="section-number">01</span><div><h2>看看它的小日常</h2><p>选择一个动作，认识一下新朋友。</p></div></div>
          <div className="action-grid">{elephantClips.map((action, index) => <button key={action.id} className={selected === index ? 'selected' : ''} aria-pressed={selected === index} onClick={() => setSelected(index)}><span>{action.icon}</span>{action.name}{selected === index && <i />}</button>)}</div>
          <div className="settings"><div className="setting-row"><label htmlFor="elephant-size">展示大小</label><output>{size} px</output></div><input id="elephant-size" type="range" min="230" max="430" step="10" value={size} onChange={e => setSize(Number(e.target.value))} /><div className="setting-row"><label htmlFor="elephant-speed">播放速度</label><select id="elephant-speed" value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value={0.75}>慢一点 · 0.75×</option><option value={1}>原速 · 1×</option><option value={1.25}>轻快一点 · 1.25×</option></select></div><button className="flip-button" onClick={() => setDirection(d => -d)}>⇄ 换个朝向</button></div>
          <div className="companion-card"><div><span className="tiny-star">✧</span><strong>让它陪在页面角落</strong><button role="switch" aria-label="显示悬浮小象" aria-checked={showPet} className={`toggle ${showPet ? 'on' : ''}`} onClick={() => setShowPet(s => !s)}><span /></button></div><p>试着拖动右下角的小象，<br />或者轻轻点它，打个招呼。</p></div>
        </aside>
      </div>
      <div className="bottom-note"><span>♡</span><p>小小一只，刚好陪你。<small>本次先看形象与动画效果；动作取自你提供的视频，循环衔接仍是预览版。</small></p><span className="edition">SUGAR COMPANION<br />PREVIEW EDITION</span></div>
    </main>
    <footer><span>一点认真，一点可爱。</span><span>Made for your everyday.</span></footer>
    {showPet && <button ref={floating} className="floating-elephant" aria-label="大象宝宝，拖动移动，点击打招呼" onPointerDown={e => { if (e.button !== 0) return; const box = e.currentTarget.getBoundingClientRect(); e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, left: box.left, top: box.top, moved: false }; }} onPointerMove={e => { const origin = drag.current; if (!origin) return; if (Math.hypot(e.clientX - origin.x, e.clientY - origin.y) > 5) origin.moved = true; if (!origin.moved) return; const pet = e.currentTarget; pet.style.left = `${Math.max(0, Math.min(innerWidth - pet.offsetWidth, origin.left + e.clientX - origin.x))}px`; pet.style.top = `${Math.max(0, Math.min(innerHeight - pet.offsetHeight, origin.top + e.clientY - origin.y))}px`; pet.style.bottom = 'auto'; pet.style.right = 'auto'; }} onPointerUp={e => { const moved = drag.current?.moved; drag.current = null; e.currentTarget.releasePointerCapture(e.pointerId); if (!moved) sayHello(); }} onPointerCancel={() => { drag.current = null; }} onClick={e => { if (e.detail === 0) sayHello(); }}>
      {greeting && <span className="floating-bubble">你好呀，今天也陪着你 ♡</span>}
      <ElephantVideo clip={greeting ? elephantClips[1] : clip} paused={paused} speed={speed} direction={direction} />
      <span className="floating-label">{greeting ? '♡ 很高兴认识你' : '拖拖我 · 点点我'}</span>
    </button>}
  </div>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><ElephantPreview /></StrictMode>);
