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

const CapitalMap = lazy(() => import('./pages/CapitalMap'));

function CurrentPage() {
  const { screen } = useAppShell();
  switch (screen) {
    case 'dashboard': return <Dashboard />;
    case 'overview': return <Overview />;
    case 'applications': return <Applications />;
    case 'capitalMap': return <Suspense fallback={<div style={{ color: '#8a8478', fontSize: 14, padding: 12 }}>正在打开地图校招…</div>}><CapitalMap /></Suspense>;
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
  const [showAiNotice, setShowAiNotice] = useState(false);

  useEffect(() => {
    if (loading) return;
    // 只在本次页面运行期间从未登录切换到已登录时提示，刷新页面不会打断用户。
    if (initialized.current && !previousSession.current && session) setShowAiNotice(true);
    initialized.current = true;
    previousSession.current = session;
  }, [loading, session]);

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7a7468', fontSize: 15 }}>加载中…</div>;
  if (!session || passwordRecovery) return <Login passwordRecovery={passwordRecovery} />;
  return <>
    <AppShellProvider><ApiKeysProvider><AppLayout><CurrentPage /></AppLayout></ApiKeysProvider></AppShellProvider>
    {showAiNotice && <AiNoticeModal onClose={() => setShowAiNotice(false)} />}
  </>;
}

function AiNoticeModal({ onClose }: { onClose: () => void }) {
  return (
    <div role="presentation" onMouseDown={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(27,26,23,.38)', backdropFilter: 'blur(5px)' }}>
      <section role="dialog" aria-modal="true" aria-labelledby="ai-notice-title" onMouseDown={(event) => event.stopPropagation()} style={{ width: 'min(100%, 500px)', borderRadius: 24, padding: '28px 28px 24px', background: '#fffdf8', boxShadow: '0 24px 70px rgba(40,30,20,.25)', color: '#1b1a17' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div><div style={{ fontSize: 13, color: '#8a8478', marginBottom: 6 }}>使用说明</div><h2 id="ai-notice-title" style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>AI 功能配置提醒</h2></div>
          <button type="button" onClick={onClose} aria-label="关闭提示" style={{ border: 'none', background: 'transparent', color: '#8a8478', fontSize: 24, lineHeight: 1, cursor: 'pointer' }}>×</button>
        </div>
        <p style={{ margin: '18px 0 10px', fontSize: 14.5, lineHeight: 1.8 }}>使用这个网页的所有 AI 功能都需要自己接入 API。如果不会配置，可以联系 Sugar 的微信：<strong>18190199757</strong>，Sugar 来教你。</p>
        <p style={{ margin: '0 0 20px', padding: '12px 14px', borderRadius: 14, background: '#fbeec2', color: '#6f5313', fontSize: 13.5, lineHeight: 1.7 }}>作者不收取任何费用，本网站不会用于任何盈利行为，只希望大家到作者 GitHub 项目点一个 Star 就行！</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a href="https://github.com/SugarVei/sugar-job-system" target="_blank" rel="noreferrer" style={{ flex: 1, minWidth: 180, height: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999, background: '#1b1a17', color: '#fffdf8', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>去 GitHub 点 Star ↗</a>
          <button type="button" onClick={onClose} style={{ height: 44, padding: '0 22px', border: '1.5px solid #e4ddcf', borderRadius: 999, background: '#fffdf8', color: '#1b1a17', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>知道了</button>
        </div>
      </section>
    </div>
  );
}
export default function App() { return <ThemeProvider><ToastProvider><LiquidBackground /><AuthProvider><Gate /></AuthProvider></ToastProvider></ThemeProvider>; }
