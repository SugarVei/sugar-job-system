import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
type ToastKind = 'info' | 'success' | 'error';
type Options = { action?: { label: string; onClick: () => void | Promise<void> }; duration?: number };
type Item = { id: number; message: string; kind: ToastKind } & Options;
interface ToastValue { push: (message: string, kind?: ToastKind, options?: Options) => void; success: (message: string, options?: Options) => void; error: (message: string, options?: Options) => void; info: (message: string, options?: Options) => void; }
const ToastContext = createContext<ToastValue | null>(null);
let seq = 0;
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState<number[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const actionLocks = useRef(new Set<number>());
  useEffect(() => { const active = timers.current; return () => { active.forEach(clearTimeout); active.clear(); }; }, []);
  const remove = useCallback((id: number) => { clearTimeout(timers.current.get(id)); timers.current.delete(id); setItems(prev => prev.filter(t => t.id !== id)); }, []);
  const push = useCallback((message: string, kind: ToastKind = 'info', options?: Options) => {
    const id = ++seq;
    setItems(prev => [...prev.slice(-3), { id, message, kind, ...options }]);
    timers.current.set(id, setTimeout(() => remove(id), options?.duration ?? (options?.action ? 10000 : 4000)));
  }, [remove]);
  const value = useMemo<ToastValue>(() => ({ push, success: (m, o) => push(m, 'success', o), error: (m, o) => push(m, 'error', o), info: (m, o) => push(m, 'info', o) }), [push]);
  const act = async (item: Item) => {
    if (!item.action || actionLocks.current.has(item.id)) return;
    actionLocks.current.add(item.id); clearTimeout(timers.current.get(item.id)); setBusy(prev => [...prev, item.id]);
    try { await item.action.onClick(); remove(item.id); }
    catch (error) { remove(item.id); push(error instanceof Error ? error.message : String(error), 'error'); }
    finally { actionLocks.current.delete(item.id); setBusy(prev => prev.filter(id => id !== item.id)); }
  };
  return <ToastContext.Provider value={value}>{children}<div aria-live="polite" style={{ position: 'fixed', right: 16, bottom: 88, zIndex: 500, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 'min(390px, calc(100vw - 32px))', pointerEvents: 'none' }}>
    {items.map(item => <div key={item.id} className="sugar-content-enter" style={{ pointerEvents: 'auto', padding: '12px 14px', borderRadius: 14, fontSize: 13, fontWeight: 600, lineHeight: 1.45, boxShadow: '0 8px 28px #30231518', background: item.kind === 'error' ? '#fbebe8' : item.kind === 'success' ? '#e5efdf' : '#fffdf8', color: item.kind === 'error' ? '#a23d24' : '#1b1a17', border: '1px solid #e4ddcf', display: 'flex', alignItems: 'center', gap: 12 }}>
      <span>{item.message}</span>{item.action && <button disabled={busy.includes(item.id)} onClick={() => void act(item)} style={{ border: 0, background: 'transparent', color: '#47633f', font: 'inherit', padding: '6px 4px', cursor: 'pointer', flex: 'none' }}>{busy.includes(item.id) ? '处理中…' : item.action.label}</button>}
      <button aria-label="关闭通知" disabled={busy.includes(item.id)} onClick={() => remove(item.id)} style={{ border: 0, background: 'none', cursor: 'pointer', color: '#8a8478', padding: 4 }}>×</button>
    </div>)}
  </div></ToastContext.Provider>;
}
// eslint-disable-next-line react-refresh/only-export-components
export function useToast() { const ctx = useContext(ToastContext); if (!ctx) throw new Error('useToast must be used within ToastProvider'); return ctx; }
