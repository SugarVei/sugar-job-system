import { useEffect, useState } from 'react';
import { useAppShell } from '../contexts/AppShellContext';
import { useTheme } from '../contexts/ThemeContext';
import { IconArrowRight, IconCheck, IconFile, IconPlugin } from '../components/icons';
import Modal from '../components/Modal';
import './ResumeAssistantGuide.css';

const DOWNLOAD = '/downloads/Sugar-Resume-Assistant-1.2.0.zip';
const STEPS = [
  { title: '下载并解压', brief: '把插件放在固定文件夹', image: '' },
  { title: '安装到浏览器', brief: '开启开发者模式并加载', image: 'install.png' },
  { title: '选择 API 厂商', brief: '只需输入自己的 API Key', image: 'api-settings.png' },
  { title: '保存简历，开始填表', brief: '填一次资料，多次使用', image: 'resume-editor.png' },
];

export default function ResumeAssistant() {
  const { setHeaderChrome } = useAppShell();
  const { theme } = useTheme();
  const [step, setStep] = useState(0);
  const [browser, setBrowser] = useState<'chrome' | 'edge'>('chrome');
  const [copyStatus, setCopyStatus] = useState('');
  const [zoom, setZoom] = useState(false);
  const current = STEPS[step];
  const address = `${browser}://extensions`;

  useEffect(() => {
    setHeaderChrome({ searchPlaceholder: null, showAdd: false });
    return () => setHeaderChrome(null);
  }, [setHeaderChrome]);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      setCopyStatus('已复制，请粘贴到浏览器地址栏');
    } catch {
      setCopyStatus(`请手动复制：${address}`);
    }
  }

  return <div className="filler-guide animate-rise" style={{ '--filler-accent': theme.accent } as React.CSSProperties}>
    <section className="filler-hero">
      <div>
        <span className="filler-kicker"><IconPlugin size={15} /> SUGAR · 浏览器扩展</span>
        <h2>简历填一次，<br />网申轻松一点。</h2>
        <p>安装插件，配置自己的标准简历和 API Key，即可辅助填写招聘网页。填完后由你核对并提交。</p>
        <div className="filler-actions">
          <a className="filler-primary" href={DOWNLOAD} download>下载浏览器插件 <span>↓</span></a>
          <button type="button" className="filler-link" onClick={() => { setStep(1); document.getElementById('filler-install')?.scrollIntoView({ behavior: 'smooth' }); }}>查看安装步骤 <IconArrowRight size={16} /></button>
        </div>
        <small>v1.2.0 · Chrome / Edge 114+ · ZIP 解压安装</small>
      </div>
      <div className="filler-card" aria-label="插件使用流程">
        <header><span><IconPlugin size={21} /></span><div><b>智能填表助手</b><small>为每一份认真准备的简历</small></div><em>本地保存</em></header>
        {[['01','准备你的简历','在插件中保存自己的标准资料'],['02','接入你选择的 AI','厂商选好，只需输入 API Key'],['03','在招聘网页开始填充','核对完成后，由你手动提交']].map(([n,title,desc]) => <div className="filler-flow" key={n}><i>{n}</i><div><b>{title}</b><small>{desc}</small></div><IconCheck size={16} /></div>)}
        <footer>你的资料，由你掌握。每次提交，由你确认。</footer>
      </div>
    </section>

    <section id="filler-install" className="filler-install">
      <div className="filler-section-head"><div><span className="filler-kicker">开始使用</span><h3>跟着四步，装好就能用</h3></div><div className="filler-browser">{(['chrome','edge'] as const).map(value => <button type="button" aria-pressed={browser === value} className={browser === value ? 'active' : ''} key={value} onClick={() => { setBrowser(value); setCopyStatus(''); }}>{value === 'chrome' ? 'Chrome' : 'Edge'}</button>)}</div></div>
      <div className="filler-install-layout">
        <nav className="filler-steps" aria-label="安装步骤">{STEPS.map((item,index) => <button type="button" aria-current={step === index ? 'step' : undefined} key={item.title} onClick={() => setStep(index)} className={step === index ? 'active' : ''}><span>{String(index + 1).padStart(2,'0')}</span><div><b>{item.title}</b><small>{item.brief}</small></div><IconArrowRight size={15} /></button>)}</nav>
        <article className="filler-step">
          <span>STEP {String(step + 1).padStart(2,'0')} / 04</span><h4>{current.title}</h4>
          {step === 0 && <><p>点击下载，把 ZIP 解压到电脑上的固定位置。安装时选择解压后的 <b>Sugar-Resume-Assistant</b> 文件夹。</p><div className="filler-folder"><IconFile size={28} /><div><b>Sugar-Resume-Assistant</b><small>manifest.json · popup.html · shared · icons …</small></div><em>选择这一层</em></div><p className="filler-note">看到 manifest.json 就是正确目录。不要直接选择 ZIP。安装后请保留这个文件夹。</p><a className="filler-primary" href={DOWNLOAD} download>下载插件 ZIP ↓</a></>}
          {step === 1 && <><p>在 <b>{browser === 'chrome' ? 'Chrome' : 'Edge'}</b> 地址栏粘贴下方地址，打开扩展管理页。</p><div className="filler-address"><code>{address}</code><button type="button" onClick={() => void copyAddress()}>复制地址</button></div><small className="filler-status" role="status">{copyStatus}</small><ol><li>开启「开发者模式」。</li><li>点击「加载已解压的扩展程序」，选择含 manifest.json 的文件夹。</li><li>在扩展菜单中固定「Sugar 智能填表助手」。</li></ol><p className="filler-note">下图为 Chrome 实际操作截图；Edge 的入口位置略有不同，步骤相同。</p></>}
          {step === 2 && <><p>点击插件右上角齿轮，进入「API 设置」，点击「配置 API」或「添加 API 厂商」。</p><ol><li>选择你已经开通 API 的厂商。</li><li>粘贴该厂商的 API Key，点击保存，即会自动启用。</li></ol><div className="filler-tags">{['DeepSeek','通义千问','Kimi','OpenAI','智谱 GLM'].map(name => <span key={name}><IconCheck size={12} />{name}</span>)}</div><p className="filler-note">接口地址和默认模型自动匹配，无需填写。通义千问使用北京区域密钥，Kimi 使用中国站密钥；API 账户需有可用额度和模型权限。</p></>}
          {step === 3 && <><ol><li>在插件中打开「标准简历」→「打开简历配置页」。</li><li>填写自己的资料，点击「保存标准简历」。也可以用 AI 导入自己的文本或 PDF，再核对保存。</li><li>打开招聘网站的表单页，点击插件图标，再点击「开始填充」。</li><li>检查填写结果，补充附件与遗漏字段，最后手动提交。</li></ol><p className="filler-note">只补空白字段可用「增量填入」；只填局部可用「选区填入」。插件不会自动上传附件、处理验证码或提交申请。</p></>}
          {current.image && <button type="button" className="filler-shot" onClick={() => setZoom(true)} aria-label={`放大${current.title}截图`}><img src={`/guides/resume-assistant/${current.image}`} alt={`${current.title}实际操作截图，使用空白演示资料`} /><span>实际操作截图 · 点击放大 ↗</span></button>}
          <div className="filler-next"><span>{step === 3 ? '准备完成，去招聘网页试试吧' : '按顺序完成，更容易上手'}</span>{step < 3 && <button type="button" onClick={() => setStep(step + 1)}>下一步 <IconArrowRight size={14} /></button>}</div>
        </article>
      </div>
    </section>

    <div className="filler-bottom"><section><h3>资料与密钥如何保存？</h3><p>下载包不含任何人的简历或密钥。你的资料和 API Key 保存在当前浏览器中，无需网站配对。</p><p>使用 AI 映射时，页面字段和简历字段摘要会发送给所选厂商；AI 导入会发送原始简历。</p></section><section><h3>遇到问题？先看这里</h3><details><summary>插件无法安装或没有显示</summary><p>确认使用桌面版 Chrome / Edge，选择的文件夹包含 manifest.json，并已开启开发者模式。</p></details><details><summary>API 报错或没有填入内容</summary><p>检查密钥对应的厂商、区域、额度和权限，并确认已保存标准简历、当前是招聘表单页面。</p></details><details><summary>更新时如何保留资料</summary><p>用新版文件替换原目录，在扩展管理页点击重新加载。不要先卸载插件。</p></details></section></div>
    <p className="filler-license">基于 AI Resume Form Filling Assistant 修改 · GPL-3.0 · 完整扩展源码与许可证随下载包提供</p>
    <Modal open={zoom} title={current.title} onClose={() => setZoom(false)} maxWidth={1000}>{current.image && <img className="filler-zoom" src={`/guides/resume-assistant/${current.image}`} alt={`${current.title}放大截图`} />}</Modal>
  </div>;
}
