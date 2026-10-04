import type { ReactNode } from 'react';
import { LayoutDashboard, ChartNoAxesCombined, Send, Map, Building2, KeyRound, Trophy, FileText, CalendarDays, Gift, WandSparkles, Mail, Settings, Cuboid } from 'lucide-react';
import './preview.css';

const nav = [['总览', LayoutDashboard], ['投递总览', ChartNoAxesCombined], ['投递记录', Send], ['求职小镇', Map], ['公司库', Building2], ['内推码管理', KeyRound], ['热门公司', Trophy], ['简历库', FileText], ['面试日历', CalendarDays], ['Offer 管理', Gift], ['智能填表助手', WandSparkles], ['面试邮件', Mail]] as const;

export default function PreviewShell({ children }: { children: ReactNode }) {
  return <div className="sugar-world-preview">
    <aside className="preview-sidebar">
      <div className="preview-brand"><Cuboid size={30}/><div><strong>Sugar</strong><span>行动优先 · 求职系统</span></div></div>
      <div className="preview-profile"><span>访</span><div><small>社区体验账号</small><b>新邻居</b></div></div>
      <nav aria-label="网站导航示意">{nav.map(([name, Icon]) => <div key={name} className={name === '求职小镇' ? 'selected' : ''} aria-current={name === '求职小镇' ? 'page' : undefined}><Icon size={17}/><span>{name}</span>{name === '求职小镇' && <i/>}</div>)}</nav>
      <div className="preview-sidebar-bottom"><span><Settings size={17}/>独立预览版本</span><p>给努力生活的你，<br/>留一间自己的小天地。</p></div>
    </aside>
    <main className="preview-main">
      <header className="preview-header"><div><h1>求职小镇<span>Community</span></h1><p>探索初见岛，布置房间，遇见同路人。</p></div></header>
      {children}
    </main>
  </div>;
}
