import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

type ToastKind = 'info' | 'success' | 'error';

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
  /** 正在播放退出动效，播完才真正移除 */
  leaving?: boolean;
}

interface ToastValue {
  push: (message: string, kind?: ToastKind) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastValue | null>(null);

/** 停留时长与最多可见条数保持原样，只补进入/退出动效 */
const VISIBLE_MS = 3200;
const EXIT_MS = 120;

let seq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Set<number>());

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((id) => window.clearTimeout(id));
      pending.clear();
    };
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    const timer = window.setTimeout(() => {
      timers.current.delete(timer);
      fn();
    }, ms);
    timers.current.add(timer);
  }, []);

  const push = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = ++seq;
    setItems((prev) => [...prev.slice(-3), { id, message, kind }]);
    later(() => {
      setItems((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
      later(() => setItems((prev) => prev.filter((t) => t.id !== id)), EXIT_MS);
    }, VISIBLE_MS);
  }, [later]);

  const value = useMemo<ToastValue>(() => ({
    push,
    success: (m) => push(m, 'success'),
    error: (m) => push(m, 'error'),
    info: (m) => push(m, 'info'),
  }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        style={{
          position: 'fixed',
          right: 16,
          bottom: 88,
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          maxWidth: 'min(360px, calc(100vw - 32px))',
          pointerEvents: 'none',
        }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={`toast-item ${item.leaving ? 'is-leaving' : ''}`.trim()}
            style={{
              pointerEvents: item.leaving ? 'none' : 'auto',
              padding: '12px 14px',
              borderRadius: 14,
              fontSize: 13.5,
              fontWeight: 600,
              lineHeight: 1.45,
              boxShadow: '0 12px 28px rgba(60,50,35,.18)',
              background: item.kind === 'error' ? '#fbe0d8' : item.kind === 'success' ? '#dcebd5' : '#fffdf8',
              color: item.kind === 'error' ? '#a23d24' : item.kind === 'success' ? '#2f5d36' : '#1b1a17',
              border: `1px solid ${item.kind === 'error' ? '#f3b3a1' : item.kind === 'success' ? '#b4d9ab' : '#e4ddcf'}`,
            }}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
