import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import type { ScreenKey } from '../types';

// ============================================================
// 应用外壳上下文：当前页面、全局搜索词、以及顶栏“新增”按钮的回调
// 让顶栏（共享）与各页面（独立）之间解耦协作
// ============================================================
interface AppShellValue {
  screen: ScreenKey;
  setScreen: (s: ScreenKey) => void;
  query: string;
  setQuery: (q: string) => void;
  /** 当前页面注册的“新增”动作；顶栏 + 按钮会调用它 */
  registerAdd: (fn: (() => void) | null) => void;
  triggerAdd: () => void;
}

const AppShellContext = createContext<AppShellValue | null>(null);

export function AppShellProvider({ children }: { children: ReactNode }) {
  const [screen, setScreenState] = useState<ScreenKey>('dashboard');
  const [query, setQuery] = useState('');
  const addRef = useRef<(() => void) | null>(null);

  const setScreen = (s: ScreenKey) => {
    setQuery(''); // 切页时清空搜索
    setScreenState(s);
  };

  const registerAdd = (fn: (() => void) | null) => {
    addRef.current = fn;
  };

  const triggerAdd = () => {
    if (addRef.current) addRef.current();
    else setScreen('applications'); // 兜底：跳到投递记录
  };

  return (
    <AppShellContext.Provider
      value={{ screen, setScreen, query, setQuery, registerAdd, triggerAdd }}
    >
      {children}
    </AppShellContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppShell() {
  const ctx = useContext(AppShellContext);
  if (!ctx) throw new Error('useAppShell must be used within AppShellProvider');
  return ctx;
}
