import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { ApplicationStatus, ScreenKey } from '../types';

/** 投递记录页的列表筛选；active = 未关闭流程 */
export type ApplicationsListFilter = 'all' | 'active' | ApplicationStatus;

const SCREEN_STORAGE_KEY = 'sugar.screen';
const VALID_SCREENS: ScreenKey[] = [
  'dashboard',
  'overview',
  'applications',
  'companies',
  'referralCodes',
  'hotCompanies',
  'resumes',
  'interviews',
  'offers',
  'interviewReviews',
  'mailbox',
];

function readStoredScreen(): ScreenKey {
  try {
    const raw = sessionStorage.getItem(SCREEN_STORAGE_KEY);
    // 旧版本可能记住已删除的 jdMatches
    if (raw === 'jdMatches') return 'dashboard';
    if (raw && (VALID_SCREENS as string[]).includes(raw)) return raw as ScreenKey;
  } catch {
    /* ignore */
  }
  return 'dashboard';
}

export interface NavigateOptions {
  query?: string;
  applicationsFilter?: ApplicationsListFilter;
  interviewDate?: string | null;
}

interface AppShellValue {
  screen: ScreenKey;
  setScreen: (s: ScreenKey) => void;
  navigate: (s: ScreenKey, opts?: NavigateOptions) => void;
  query: string;
  setQuery: (q: string) => void;
  applicationsFilter: ApplicationsListFilter;
  setApplicationsFilter: (f: ApplicationsListFilter) => void;
  interviewDateFilter: string | null;
  setInterviewDateFilter: (d: string | null) => void;
  registerAdd: (fn: (() => void) | null) => void;
  triggerAdd: () => void;
}

const AppShellContext = createContext<AppShellValue | null>(null);

export function AppShellProvider({ children }: { children: ReactNode }) {
  const [screen, setScreenState] = useState<ScreenKey>(() => readStoredScreen());
  const [query, setQuery] = useState('');
  const [applicationsFilter, setApplicationsFilter] = useState<ApplicationsListFilter>('all');
  const [interviewDateFilter, setInterviewDateFilter] = useState<string | null>(null);
  const addRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(SCREEN_STORAGE_KEY, screen);
    } catch {
      /* ignore */
    }
  }, [screen]);

  const setScreen = (s: ScreenKey) => {
    setQuery('');
    if (s !== 'applications') setApplicationsFilter('all');
    if (s !== 'interviews') setInterviewDateFilter(null);
    setScreenState(s);
  };

  const navigate = (s: ScreenKey, opts?: NavigateOptions) => {
    setQuery(opts?.query ?? '');
    if (s === 'applications') {
      setApplicationsFilter(opts?.applicationsFilter ?? 'all');
    } else {
      setApplicationsFilter('all');
    }
    if (s === 'interviews') {
      setInterviewDateFilter(opts?.interviewDate ?? null);
    } else {
      setInterviewDateFilter(null);
    }
    setScreenState(s);
  };

  const registerAdd = (fn: (() => void) | null) => {
    addRef.current = fn;
  };

  const triggerAdd = () => {
    if (addRef.current) addRef.current();
    else setScreen('applications');
  };

  return (
    <AppShellContext.Provider
      value={{
        screen,
        setScreen,
        navigate,
        query,
        setQuery,
        applicationsFilter,
        setApplicationsFilter,
        interviewDateFilter,
        setInterviewDateFilter,
        registerAdd,
        triggerAdd,
      }}
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
