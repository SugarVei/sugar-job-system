import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { ChevronsUp, LockKeyhole } from 'lucide-react';

export type CompanyDiscoveryMode = 'ai' | 'resume' | 'excel';
const MODES = [
  { key: 'ai', label: 'AI' },
  { key: 'resume', label: '简历' },
  { key: 'excel', label: 'Excel' },
] as const;

export function CompanyDiscoveryPanel({ open, mode, canManage, onModeChange, onClose, children }: {
  open: boolean;
  mode: CompanyDiscoveryMode;
  canManage: boolean;
  onModeChange: (mode: CompanyDiscoveryMode) => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const tabsRef = useRef<HTMLDivElement>(null);
  const modes = MODES.filter(item => item.key !== 'excel' || canManage);
  const navigateModes = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = modes.findIndex(item => item.key === mode);
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? modes.length - 1 : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + modes.length) % modes.length;
    onModeChange(modes[nextIndex].key);
    tabsRef.current?.querySelectorAll<HTMLButtonElement>('button')[nextIndex]?.focus();
  };

  // Keep visited tools mounted while collapsed to preserve selections and results.
  return <aside className="hc-discovery-panel" hidden={!open} aria-labelledby={titleId}>
    <header className="hc-panel-heading"><h2 id={titleId}>发现公司</h2><button className="hc-icon-button" type="button" aria-label="收起发现公司" onClick={onClose}><ChevronsUp size={16} /></button></header>
    <div ref={tabsRef} className="hc-discovery-tabs" role="tablist" aria-label="选择发现方式" onKeyDown={navigateModes}>
      {modes.map(item => <button key={item.key} type="button" role="tab" aria-selected={mode === item.key} tabIndex={mode === item.key ? 0 : -1} onClick={() => onModeChange(item.key)}>{item.label}</button>)}
    </div>
    <div className="hc-panel-content" role="tabpanel" aria-label={mode === 'resume' ? '简历匹配' : mode === 'excel' ? 'Excel 更新' : 'AI 找公司'}>{children}</div>
    <footer className="hc-panel-footer"><LockKeyhole size={14} /><span>Excel 更新仅管理员可用</span></footer>
  </aside>;
}
