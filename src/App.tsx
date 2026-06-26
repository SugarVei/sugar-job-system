import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppShellProvider, useAppShell } from './contexts/AppShellContext';
import LiquidBackground from './components/LiquidBackground';
import AppLayout from './layouts/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Overview from './pages/Overview';
import Applications from './pages/Applications';
import Companies from './pages/Companies';
import Resumes from './pages/Resumes';
import Interviews from './pages/Interviews';

// 根据当前 screen 渲染对应页面
function CurrentPage() {
  const { screen } = useAppShell();
  switch (screen) {
    case 'dashboard':
      return <Dashboard />;
    case 'overview':
      return <Overview />;
    case 'applications':
      return <Applications />;
    case 'companies':
      return <Companies />;
    case 'resumes':
      return <Resumes />;
    case 'interviews':
      return <Interviews />;
    default:
      return <Dashboard />;
  }
}

// 登录态门禁
function Gate() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7a7468', fontSize: 15 }}>
        加载中…
      </div>
    );
  }

  if (!session) return <Login />;

  return (
    <AppShellProvider>
      <AppLayout>
        <CurrentPage />
      </AppLayout>
    </AppShellProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LiquidBackground />
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </ThemeProvider>
  );
}
