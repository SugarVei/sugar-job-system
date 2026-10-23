import { ResumeTaskProvider } from './contexts/ResumeTaskContext';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ApiKeysProvider } from './contexts/ApiKeysContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppShellProvider, useAppShell } from './contexts/AppShellContext';
import { ToastProvider } from './components/Toast';
import LiquidBackground from './components/LiquidBackground';
import AppLayout from './layouts/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EmptyState from './components/EmptyState';
import WelcomeNoticeModal from './components/WelcomeNoticeModal';

// 总览是默认首页，直接打包；其余页面打开时才下载，首次加载更快。
const pageLoaders = {
  applications: () => import('./pages/Applications'),
  companies: () => import('./pages/Companies'),
  referralCodes: () => import('./pages/ReferralCodes'),
  hotCompanies: () => import('./pages/HotCompanies'),
  resumes: () => import('./pages/Resumes'),
  interviews: () => import('./pages/Interviews'),
  offers: () => import('./pages/Offers'),
  mailbox: () => import('./pages/Mailbox'),
  resumeAssistant: () => import('./pages/ResumeAssistant'),
  smartInput: () => import('./pages/SmartInformationEntry'),
};
const Applications = lazy(pageLoaders.applications);
const Companies = lazy(pageLoaders.companies);
const ReferralCodes = lazy(pageLoaders.referralCodes);
const HotCompanies = lazy(pageLoaders.hotCompanies);
const Resumes = lazy(pageLoaders.resumes);
const Interviews = lazy(pageLoaders.interviews);
const Offers = lazy(pageLoaders.offers);
const Mailbox = lazy(pageLoaders.mailbox);
const ResumeAssistant = lazy(pageLoaders.resumeAssistant);
const SmartInformationEntry = lazy(pageLoaders.smartInput);

// 首屏稳定后，趁浏览器空闲在后台预取其他页面，之后切换页面无需等待。
function usePrefetchPages() {
  useEffect(() => {
    const run = () => Object.values(pageLoaders).forEach(load => { void load().catch(() => undefined); });
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(run, { timeout: 8000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = setTimeout(run, 4000);
    return () => clearTimeout(timer);
  }, []);
}

function CurrentPage() {
  usePrefetchPages();
  return <Suspense fallback={<EmptyState text="加载中…" />}><PageContent /></Suspense>;
}
function PageContent() {
  const { screen } = useAppShell();
  switch (screen) {
    case 'dashboard': return <Dashboard />;
    case 'applications': return <Applications />;
    case 'companies': return <Companies />;
    case 'referralCodes': return <ReferralCodes />;
    case 'hotCompanies': return <HotCompanies />;
    case 'resumes': return <Resumes />;
    case 'interviews': return <Interviews />;
    case 'offers': return <Offers />;
    case 'smartInput': return <Suspense fallback={<div className="smart-input-loading" role="status">正在打开智能信息录入…</div>}><SmartInformationEntry /></Suspense>;
    case 'resumeAssistant': return <ResumeAssistant />;
    case 'mailbox': return <Mailbox />;
    default: return <Dashboard />;
  }
}
function Gate() {
  const { session, loading, passwordRecovery } = useAuth();
  const initialized = useRef(false);
  const previousSession = useRef(session);
  const [showWelcomeNotice, setShowWelcomeNotice] = useState(false);

  useEffect(() => {
    if (loading) return;
    // 只在本次页面运行期间从未登录切换到已登录时提示，刷新页面不会打断用户。
    if (initialized.current && !previousSession.current && session) setShowWelcomeNotice(true);
    initialized.current = true;
    previousSession.current = session;
  }, [loading, session]);

  if (loading) return <><LiquidBackground /><div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7a7468', fontSize: 15 }}>加载中…</div></>;
  if (!session || passwordRecovery) return <><LiquidBackground /><Login passwordRecovery={passwordRecovery} /></>;
  return <>
    <LiquidBackground />
    <AppShellProvider><ApiKeysProvider key={session.user.id}><ResumeTaskProvider><AppLayout><CurrentPage /></AppLayout></ResumeTaskProvider></ApiKeysProvider></AppShellProvider>
    {showWelcomeNotice && <WelcomeNoticeModal onClose={() => setShowWelcomeNotice(false)} />}
  </>;
}
function AccountFeedback() { const { session } = useAuth(); return <ToastProvider key={session?.user.id ?? 'signed-out'}><Gate /></ToastProvider>; }
export default function App() { return <ThemeProvider><AuthProvider><AccountFeedback /></AuthProvider></ThemeProvider>; }
