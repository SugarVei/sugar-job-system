import { useEffect, useRef, useState, type ButtonHTMLAttributes, type FocusEvent, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { ChevronUp, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NAV_ITEMS } from './navConfig';
import { SugarMark, IconSettings, IconLogout, IconUser } from './icons';
import ApiKeySettings from './ApiKeySettingsGuide';
import { OPEN_API_SETTINGS_EVENT } from '../contexts/ApiKeysContext';
import type { ScreenKey } from '../types';
import './AppSidebar.css';

const SIDEBAR_STORAGE_KEY = 'sugar.sidebar.v1';

interface Props {
  screen: ScreenKey;
  onNavigate: (screen: ScreenKey) => void;
  name: string;
  avatar: string;
  onUpdateName: (name: string) => void;
  onAvatar: () => void;
  onLogout: () => Promise<void>;
}

interface SidebarButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  onActivate: () => void;
  showTooltip: (event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>, label: string, clicked?: boolean) => void;
  leaveTooltip: () => void;
  blurTooltip: () => void;
}

function SidebarButton({ label, onActivate, showTooltip, leaveTooltip, blurTooltip, children, ...props }: SidebarButtonProps) {
  return (
    <button {...props} aria-label={label}
      onMouseEnter={event => showTooltip(event, label)}
      onFocus={event => showTooltip(event, label)}
      onMouseLeave={leaveTooltip}
      onBlur={blurTooltip}
      onClick={event => { onActivate(); showTooltip(event, label, true); }}>
      {children}
    </button>
  );
}

export default function AppSidebar({ screen, onNavigate, name, avatar, onUpdateName, onAvatar, onLogout }: Props) {
  const [expanded, setExpanded] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'expanded'; }
    catch { return false; }
  });
  const [accountOpen, setAccountOpen] = useState(false);
  const [tooltip, setTooltip] = useState<{ name: string; x: number; y: number } | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    try { localStorage.setItem(SIDEBAR_STORAGE_KEY, expanded ? 'expanded' : 'collapsed'); }
    catch { /* The sidebar still works when browser storage is unavailable. */ }
  }, [expanded]);

  useEffect(() => () => clearTimeout(tooltipTimer.current), []);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        clearTimeout(tooltipTimer.current);
        setAccountOpen(false);
        setTooltip(null);
      }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);

  function showTooltip(event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>, label: string, clicked = false) {
    if (expanded) return;
    clearTimeout(tooltipTimer.current);
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({ name: label, x: rect.right + 12, y: rect.top + rect.height / 2 });
    if (clicked) tooltipTimer.current = setTimeout(() => setTooltip(null), 1800);
  }

  function leaveTooltip() {
    clearTimeout(tooltipTimer.current);
    tooltipTimer.current = setTimeout(() => setTooltip(null), 500);
  }

  function toggleSidebar() {
    clearTimeout(tooltipTimer.current);
    setTooltip(null);
    setAccountOpen(false);
    setExpanded(value => !value);
  }

  function openSettings() {
    setAccountOpen(false);
    window.dispatchEvent(new Event(OPEN_API_SETTINGS_EVENT));
  }

  const tooltipEvents = { showTooltip, leaveTooltip, blurTooltip: () => setTooltip(null) };

  return (
    <>
      <aside className={`app-sidebar hidden lg:flex${expanded ? ' expanded' : ''}`} aria-label="侧边栏">
        <div className="app-sidebar-top">
          <button className="app-sidebar-brand" aria-label="Sugar 首页" onClick={() => onNavigate('dashboard')}>
            <SugarMark size={26} />
            <span>Sugar<small>行动优先 · 求职系统</small></span>
          </button>
          <SidebarButton className="app-sidebar-toggle" aria-expanded={expanded} label={expanded ? '收起侧边栏' : '展开侧边栏'} onActivate={toggleSidebar} {...tooltipEvents}>
            {expanded ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </SidebarButton>
        </div>
        <nav className="app-sidebar-nav" aria-label="主导航">
          {NAV_ITEMS.map(({ key, label, Icon }) => (
            <SidebarButton key={key} className={`app-sidebar-nav-button${screen === key ? ' active' : ''}`} aria-current={screen === key ? 'page' : undefined}
              label={label} onActivate={() => { setAccountOpen(false); onNavigate(key); }} {...tooltipEvents}>
              <Icon size={18} /><span>{label}</span>
            </SidebarButton>
          ))}
        </nav>
        <div className="app-sidebar-bottom">
          <div style={{ display: 'none' }}><ApiKeySettings /></div>
          <SidebarButton className="app-sidebar-nav-button" label="AI 设置" onActivate={openSettings} {...tooltipEvents}>
            <IconSettings size={19} /><span>AI 设置</span>
          </SidebarButton>
          <SidebarButton className="app-sidebar-nav-button" label="退出登录" onActivate={() => { void onLogout(); }} {...tooltipEvents}>
            <IconLogout size={19} /><span>退出登录</span>
          </SidebarButton>
          <SidebarButton className="app-sidebar-account-button" aria-expanded={accountOpen} aria-haspopup="dialog" label="个人账号" onActivate={() => setAccountOpen(value => !value)} {...tooltipEvents}>
            <span className="app-sidebar-avatar">{avatar ? <img src={avatar} alt="用户头像" /> : <IconUser size={19} />}</span>
            <span className="app-sidebar-account-name"><strong>{name}</strong><small>个人账号</small></span>
            <ChevronUp className="app-sidebar-account-chevron" size={15} />
          </SidebarButton>
        </div>
      </aside>
      {tooltip && !expanded && createPortal(
        <div className="app-sidebar-tooltip" role="tooltip" style={{ left: tooltip.x, top: tooltip.y }}>{tooltip.name}</div>, document.body,
      )}
      {accountOpen && createPortal(
        <>
          <button className="app-sidebar-account-dismiss" aria-label="关闭个人账号" onClick={() => setAccountOpen(false)} />
          <section className="app-sidebar-account-menu" role="dialog" aria-label="个人账号" style={{ left: expanded ? 260 : 76 }}>
            <strong>个人账号</strong>
            <label>昵称<input aria-label="编辑昵称" value={name} onChange={event => onUpdateName(event.target.value)} maxLength={100} /></label>
            <button onClick={() => { setAccountOpen(false); onAvatar(); }}><IconUser size={17} />更换头像</button>
            <button onClick={openSettings}><IconSettings size={17} />AI 设置</button>
            <button onClick={() => { setAccountOpen(false); void onLogout(); }}><IconLogout size={17} />退出登录</button>
          </section>
        </>, document.body,
      )}
    </>
  );
}
