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
import Overview from './pages/Overview';
import Applications from './pages/Applications';
import Companies from './pages/Companies';
import ReferralCodes from './pages/ReferralCodes';
import HotCompanies from './pages/HotCompanies';
import Resumes from './pages/Resumes';
import Interviews from './pages/Interviews';
import Offers from './pages/Offers';
import Mailbox from './pages/Mailbox';
import ResumeAssistant from './pages/ResumeAssistant';
import WebPetCompanion from './components/web-pet/WebPetCompanion';
import WelcomeNoticeModal from './components/WelcomeNoticeModal';

const CommunityTown = lazy(() => import('./pages/CommunityTown'));

function CurrentPage() {
  const { screen } = useAppShell();
  switch (screen) {
    case 'dashboard': return <Dashboard />;
    case 'overview': return <Overview />;
    case 'applications': return <Applications />;
    case 'capitalMap': return <Suspense fallback={<div style={{ color: '#8a8478', fontSize: 14, padding: 12 }}>正在打开求职小镇…</div>}><CommunityTown /></Suspense>;
    case 'companies': return <Companies />;
    case 'referralCodes': return <ReferralCodes />;
    case 'hotCompanies': return <HotCompanies />;
    case 'resumes': return <Resumes />;
    case 'interviews': return <Interviews />;
    case 'offers': return <Offers />;
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

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7a7468', fontSize: 15 }}>加载中…</div>;
  if (!session || passwordRecovery) return <Login passwordRecovery={passwordRecovery} />;
  return <>
    <AppShellProvider><ApiKeysProvider key={session.user.id}><AppLayout><CurrentPage /></AppLayout><WebPetCompanion /></ApiKeysProvider></AppShellProvider>
    {showWelcomeNotice && <WelcomeNoticeModal onClose={() => setShowWelcomeNotice(false)} />}
  </>;
}
export default function App() { return <ThemeProvider><ToastProvider><LiquidBackground /><AuthProvider><Gate /></AuthProvider></ToastProvider></ThemeProvider>; }
