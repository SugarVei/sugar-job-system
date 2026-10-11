import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NAV_ITEMS } from './navConfig';
import { IconSearch } from './icons';
import { useAppShell } from '../contexts/AppShellContext';
import { useCollection } from '../hooks/useCollection';
import type { Application, Resume, Interview } from '../types';
const EVENT = 'sugar:open-command';
export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setOpen(v => !v); } };
    const show = () => setOpen(true);
    window.addEventListener('keydown', key); window.addEventListener(EVENT, show);
    return () => { window.removeEventListener('keydown', key); window.removeEventListener(EVENT, show); };
  }, []);
  return open ? <CommandDialog onClose={() => setOpen(false)} /> : null;
}
// eslint-disable-next-line react-refresh/only-export-components
export function openCommandPalette() { window.dispatchEvent(new Event(EVENT)); }
function CommandDialog({ onClose }: { onClose: () => void }) {
  const { navigate } = useAppShell();
  const { items: applications, loading: appsLoading } = useCollection<Application>('applications');
  const { items: resumes } = useCollection<Resume>('resumes');
  const { items: interviews } = useCollection<Interview>('interviews');
  const input = useRef<HTMLInputElement>(null), root = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(''), [active, setActive] = useState(0);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; input.current?.focus();
    return () => { document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus(); };
  }, []);
  const commands = useMemo(() => [
    ...NAV_ITEMS.map(n => ({ id: n.key, label: n.label, detail: '打开页面', action: () => navigate(n.key) })),
    { id: 'new-application', label: '新增投递', detail: '记录一份新的投递', action: () => navigate('applications', { add: true }) },
    { id: 'new-interview', label: '新增面试', detail: '安排面试时间', action: () => navigate('interviews', { add: true }) },
    ...applications.map(a => ({ id: `a-${a.id}`, label: `${a.company_name} · ${a.position_name}`, detail: `投递 · ${a.status}`, action: () => navigate('applications', { query: a.company_name }) })),
    ...resumes.map(r => ({ id: `r-${r.id}`, label: r.resume_name, detail: '简历', action: () => navigate('resumes', { query: r.resume_name }) })),
    ...interviews.map(i => ({ id: `i-${i.id}`, label: `${i.company_name} · ${i.round || '面试'}`, detail: i.interview_time ? `面试 · ${new Date(i.interview_time).toLocaleString('zh-CN')}` : '面试 · 待定', action: () => navigate('interviews', { query: i.company_name, interviewDate: i.interview_time ? `${new Date(i.interview_time).getFullYear()}-${String(new Date(i.interview_time).getMonth() + 1).padStart(2, '0')}-${String(new Date(i.interview_time).getDate()).padStart(2, '0')}` : null }) })),
  ].filter(c => !query.trim() || `${c.label} ${c.detail}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 30), [query, navigate, applications, resumes, interviews]);
  const index = Math.min(active, Math.max(0, commands.length - 1));
  useEffect(() => { root.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }); }, [index]);
  const choose = (i: number) => { const command = commands[i]; if (command) { onClose(); command.action(); } };
  return createPortal(<div className="sugar-command-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div ref={root} className="sugar-command sugar-content-enter" role="dialog" aria-modal="true" aria-label="快捷操作" onKeyDown={e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setActive((index + (e.key === 'ArrowDown' ? 1 : -1) + commands.length) % Math.max(1, commands.length)); }
      if (e.key === 'Enter') { e.preventDefault(); choose(index); }
      if (e.key === 'Tab') { const nodes = Array.from(root.current!.querySelectorAll<HTMLElement>('input,button')); const current = nodes.indexOf(document.activeElement as HTMLElement); e.preventDefault(); nodes[(current + (e.shiftKey ? -1 : 1) + nodes.length) % nodes.length]?.focus(); }
    }}>
      <div className="sugar-command-search"><IconSearch size={18} /><input ref={input} value={query} onChange={e => { setQuery(e.target.value); setActive(0); }} aria-label="搜索页面、公司或快捷操作" role="combobox" aria-expanded="true" aria-controls="sugar-command-results" aria-activedescendant={commands.length ? `command-${commands[index].id}` : undefined} placeholder="搜索页面、公司或快捷操作…" /><button aria-label="关闭快捷操作" onClick={onClose}>Esc</button></div>
      <div className="sugar-command-results" id="sugar-command-results" role="listbox" aria-label="搜索结果">{commands.map((c, i) => <button tabIndex={-1} className="sugar-command-option" id={`command-${c.id}`} key={c.id} role="option" aria-selected={i === index} onMouseEnter={() => setActive(i)} onClick={() => choose(i)}><span>{c.label}<small>{c.detail}</small></span></button>)}{!commands.length && <div role="status" style={{ padding: 24, fontSize: 13, color: '#8a8478' }}>{appsLoading ? '正在读取你的记录…' : '没有匹配结果，试试公司名称或“新增”'}</div>}</div>
      <div className="sugar-command-footer">↑ ↓ 选择 · Enter 打开 · Esc 关闭 · Ctrl / ⌘ K 唤出</div>
    </div>
  </div>, document.body);
}
