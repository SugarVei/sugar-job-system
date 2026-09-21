import { useState } from 'react';
import WebPet from '../components/web-pet/WebPet';
import Modal from '../components/Modal';
import { ThemeProvider } from '../contexts/ThemeContext';
import LiquidBackground from '../components/LiquidBackground';
import PetAnimationPreview from './PetAnimationPreview';

const projects = [
  { name: '生产流程改善', tag: '流程优化', text: '从现场观察出发，用数据发现瓶颈，让每一步协作更加顺畅。', color: '#e4ecd9', icon: '↗' },
  { name: '数字化生产看板', tag: '数据分析', text: '把分散的数据连接起来，让进度、节拍与异常清晰可见。', color: '#e7e6f3', icon: '▤' },
  { name: '精益实践记录', tag: '持续改善', text: '记录每一次小小的改进，也记录实践过程中的思考与成长。', color: '#f5e9d0', icon: '✳' },
];

export default function PetPreview() {
  const [section, setSection] = useState('简历预览');
  const [openProject, setOpenProject] = useState<string | null>(null);
  const [hint, setHint] = useState(true);
  return <ThemeProvider><LiquidBackground />
    <div className="pet-preview-shell">
      <aside className="pet-preview-sidebar" data-pet-avoid>
        <a className="pet-preview-brand" href="#top"><span>✳</span><strong>Sugar<small>一点认真，一点可爱</small></strong></a>
        <div className="pet-preview-profile"><span> S </span><div>我的个人空间<small>让每一步成长被看见</small></div></div>
        <nav aria-label="预览导航">{['简历预览', '项目经历', '关于我'].map((name, i) => <button key={name} className={section === name ? 'active' : ''} onClick={() => { setSection(name); document.getElementById(i === 1 ? 'projects' : i === 2 ? 'about' : 'top')?.scrollIntoView({ behavior: 'smooth' }); }}><span>{['▧', '▦', '○'][i]}</span>{name}</button>)}</nav>
        <div className="pet-preview-aside-note"><span>JUST A LITTLE COMPANY</span><p>专注你的下一步，<br />它会在旁边陪着你。</p><small>萌娃网页宠物 · 本地预览</small></div>
      </aside>
      <main className="pet-preview-main" id="pet-preview-scroll">
        <header id="top"><div><small>MY LITTLE CORNER</small><h1>认真生活，也留一点可爱。</h1></div><span className="pet-preview-label"><i />本地预览</span></header>
        {hint && <div className="pet-preview-note"><span>小糖豆住进来啦。点点它、摸摸头，也可以把它抱起来。<br /><small>点萌娃旁边的 ···，可以陪它玩球、睡觉或暂时隐藏。</small></span><button onClick={() => setHint(false)} aria-label="关闭操作提示">×</button></div>}
        <section className="pet-preview-hero" id="about">
          <div className="pet-preview-intro"><span className="pet-preview-eyebrow">HELLO, NICE TO MEET YOU</span><h2>把想法变成行动，<br />把细节做得更好<span>。</span></h2><p>这里是个人简历的演示内容。留出一点空间，<br className="desktop-break" />看看小糖豆怎样与你和页面互动。</p><div className="pet-preview-tags"><span>工业工程</span><span>精益改善</span><span>数据分析</span></div><a href="#projects" className="pet-preview-cta" onClick={() => setSection('项目经历')}>看看项目经历 <span>↗</span></a></div>
          <PetAnimationPreview />
        </section>
        <section id="projects" className="pet-preview-projects"><div className="pet-preview-section-title"><div><small>SELECTED WORK</small><h2>项目与实践</h2></div><span>把经历写成自己的故事</span></div><div className="pet-preview-project-grid">{projects.map((p, i) => <article className="project-card" data-pet-card key={p.name}><div className="pet-preview-project-icon" style={{ background: p.color }}>{p.icon}</div><small>0{i + 1} / {p.tag}</small><h3>{p.name}</h3><p>{p.text}</p><button onClick={() => setOpenProject(p.name)}>查看项目 <span>↗</span></button></article>)}</div></section>
        <section className="pet-preview-lower" data-pet-card><span>✧</span><div><h3>允许自己慢一点，也别忘了向前。</h3><p>你可以继续滚动、打开项目和切换导航，小糖豆会自己找点事情做。</p></div></section>
        <footer><span>Made with care. A little companion, a little joy.</span><span>Sugar · 2026</span></footer>
      </main>
    </div>
    <WebPet />
    <Modal open={openProject !== null} title={openProject ?? ''} onClose={() => setOpenProject(null)}><div className="pet-preview-modal-content"><p>这是用于体验网页宠物的示例项目。</p><p>项目按钮与弹窗正常工作，宠物位于弹窗下方。关闭后，可以继续拖动小糖豆或打开它的小菜单。</p><button onClick={() => setOpenProject(null)}>返回预览</button></div></Modal>
  </ThemeProvider>;
}
