import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ApplicationStatus, ScreenKey } from '../types';
import type { ResumeAssistantTab } from '../types/resumeAssistant';

export type ApplicationsListFilter = 'all' | 'active' | ApplicationStatus;
export type HeaderChrome = { searchPlaceholder: string | null; showAdd: boolean; inlineContent?: ReactNode; actions?: ReactNode; contentScroll?: boolean; primaryAction?: { label: string; onClick: () => void; loading?: boolean; icon?: ReactNode } | null };

const SCREEN_STORAGE_KEY = 'sugar.screen';
const VALID_SCREENS: ScreenKey[] = ['dashboard', 'overview', 'applications', 'companies', 'referralCodes', 'hotCompanies', 'resumes', 'interviews', 'offers', 'resumeAssistant', 'mailbox', 'smartInput'];
function syncSmartInputRoute(next: ScreenKey) {
  if (next === 'smartInput') window.history.replaceState(null, '', '#/smart-information-entry');
  else if (/^#\/(?:smart-information-entry|smart-input)(?:\/|$)/.test(window.location.hash)) window.history.replaceState(null, '', window.location.pathname + window.location.search);
}
function readStoredScreen(): ScreenKey {
  try {
    const raw = sessionStorage.getItem(SCREEN_STORAGE_KEY);
    if (raw === 'interviewReviews') return 'resumeAssistant';
    if (raw === 'jdMatches') return 'dashboard';
    if (raw && (VALID_SCREENS as string[]).includes(raw)) return raw as ScreenKey;
  } catch { /* ignore */ }
  return 'dashboard';
}

export interface NavigateOptions { add?: boolean; query?: string; applicationsFilter?: ApplicationsListFilter; interviewDate?: string | null; }
interface AppShellValue {
  screen: ScreenKey; setScreen: (s: ScreenKey) => void; navigate: (s: ScreenKey, opts?: NavigateOptions) => void;
  query: string; setQuery: (q: string) => void; applicationsFilter: ApplicationsListFilter; setApplicationsFilter: (f: ApplicationsListFilter) => void;
  interviewDateFilter: string | null; setInterviewDateFilter: (d: string | null) => void; registerAdd: (fn: (() => void) | null) => void; triggerAdd: () => void;
  assistantTab: ResumeAssistantTab; setAssistantTab: (tab: ResumeAssistantTab) => void; headerChrome: HeaderChrome | null; setHeaderChrome: (chrome: HeaderChrome | null) => void;
}
const AppShellContext = createContext<AppShellValue | null>(null);

export function AppShellProvider({ children }: { children: ReactNode }) {
  const [screen, setScreenState] = useState<ScreenKey>(() => readStoredScreen());
  const screenRef = useRef(screen);
  useEffect(() => { screenRef.current = screen; }, [screen]);
  const [query, setQuery] = useState('');
  const [applicationsFilter, setApplicationsFilter] = useState<ApplicationsListFilter>('all');
  const [interviewDateFilter, setInterviewDateFilter] = useState<string | null>(null);
  const [assistantTab, setAssistantTab] = useState<ResumeAssistantTab>('overview');
  const [headerChrome, setHeaderChrome] = useState<HeaderChrome | null>(null);
  const addRef = useRef<(() => void) | null>(null);
  const pendingAdd = useRef<ScreenKey | null>(null);

  useEffect(() => { try { sessionStorage.setItem(SCREEN_STORAGE_KEY, screen); } catch { /* ignore */ } }, [screen]);
  const setScreen = useCallback((next: ScreenKey) => { syncSmartInputRoute(next); setQuery(''); if (next !== 'applications') setApplicationsFilter('all'); if (next !== 'interviews') setInterviewDateFilter(null); setScreenState(next); }, []);
  const navigate = useCallback((next: ScreenKey, opts?: NavigateOptions) => {
    syncSmartInputRoute(next);
    setQuery(opts?.query ?? ''); setApplicationsFilter(next === 'applications' ? opts?.applicationsFilter ?? 'all' : 'all'); setInterviewDateFilter(next === 'interviews' ? opts?.interviewDate ?? null : null);
    pendingAdd.current = opts?.add ? next : null;
    if (next === screen && opts?.add && addRef.current) { pendingAdd.current = null; addRef.current(); }
    setScreenState(next);
  }, [screen]);

  useEffect(() => {
    const applyHash = () => {
      const [screenPath, tab] = window.location.hash.replace(/^#\/?/, '').split('/');
      // Old bookmarks for the retired module should open the dashboard.
      if (screenPath === 'community-world') {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        setScreen('dashboard');
        return;
      }
      if (['smart-information-entry', 'smart-input'].includes(screenPath) && screenRef.current !== 'smartInput') setScreen('smartInput');
      if (screenPath === 'interview-reviews' && screenRef.current !== 'resumeAssistant') setScreen('resumeAssistant');
      if (screenPath === 'resume-assistant') {
        if (screenRef.current !== 'resumeAssistant') setScreen('resumeAssistant');
        if (['overview', 'profile', 'settings', 'runs'].includes(tab)) setAssistantTab(tab as ResumeAssistantTab);
      }
    };
    applyHash(); window.addEventListener('hashchange', applyHash); return () => window.removeEventListener('hashchange', applyHash);
  }, [setScreen]);
  const setAssistantTabWithHash = useCallback((tab: ResumeAssistantTab) => { setAssistantTab(tab); if (window.location.hash !== `#/resume-assistant/${tab}`) window.history.replaceState(null, '', `#/resume-assistant/${tab}`); }, []);
  const registerAdd = useCallback((fn: (() => void) | null) => { addRef.current = fn; if (fn && pendingAdd.current === screen) { pendingAdd.current = null; fn(); } }, [screen]);
  const triggerAdd = useCallback(() => { if (addRef.current) addRef.current(); else setScreen('applications'); }, [setScreen]);
  const value = useMemo(() => ({ screen, setScreen, navigate, query, setQuery, applicationsFilter, setApplicationsFilter, interviewDateFilter, setInterviewDateFilter, registerAdd, triggerAdd, assistantTab, setAssistantTab: setAssistantTabWithHash, headerChrome, setHeaderChrome }), [screen, setScreen, navigate, query, applicationsFilter, interviewDateFilter, registerAdd, triggerAdd, assistantTab, setAssistantTabWithHash, headerChrome]);
  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppShell() { const ctx = useContext(AppShellContext); if (!ctx) throw new Error('useAppShell must be used within AppShellProvider'); return ctx; }
