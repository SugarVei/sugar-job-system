import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import EmojiRings from '../components/EmojiRings';
import { SugarMark, IconEye } from '../components/icons';

// ============================================================
// 登录 / 注册页
// 磨砂玻璃卡片 + 双圈表情，真实接入 Supabase Auth
// ============================================================
export default function Login() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!isSupabaseConfigured) {
      setError('尚未配置 Supabase 环境变量，请先在 .env 中填写后重启。');
      return;
    }
    if (!email || !password) {
      setError('请输入邮箱和密码');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else {
        const { needsConfirm } = await signUp(email, password);
        if (needsConfirm) {
          setInfo('注册成功！请前往邮箱点击确认链接后再登录。');
          setMode('login');
        }
      }
    } catch (err) {
      setError((err as Error).message || '操作失败，请重试');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="p-4 lg:p-[26px]"
      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}
    >
      <div
        className="login-card"
        style={{
          display: 'flex',
          width: '100%',
          maxWidth: 1180,
          background: 'rgba(255,253,250,0.5)',
          backdropFilter: 'blur(36px) saturate(1.18)',
          WebkitBackdropFilter: 'blur(36px) saturate(1.18)',
          border: '1px solid rgba(255,255,255,0.5)',
          borderRadius: 30,
          overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(120,40,70,.2)',
        }}
      >
        {/* 左侧表情环：仅在中大屏显示 */}
        <div className="hidden md:flex" style={{ flex: 1.15 }}>
          <EmojiRings />
        </div>

        {/* 右侧表单 */}
        <div
          className="w-full md:w-[440px] p-7 sm:p-[46px]"
          style={{ flex: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: '#1b1a17',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 3px 10px rgba(60,50,35,.12)',
              }}
            >
              <SugarMark size={30} />
            </div>
          </div>
          <h1 style={{ fontFamily: 'Poppins', fontSize: 30, fontWeight: 700, textAlign: 'center', margin: '0 0 6px' }}>
            {mode === 'login' ? 'Welcome back!' : '创建账号'}
          </h1>
          <p style={{ textAlign: 'center', fontSize: 13.5, color: '#9a9488', margin: '0 0 28px' }}>
            {mode === 'login' ? '请输入你的登录信息' : '注册后即可云端同步你的求职数据'}
          </p>

          <form onSubmit={submit}>
            <label style={lbl}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              style={underlineInput}
            />

            <label style={lbl}>Password</label>
            <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1.5px solid #e0d8c9', marginBottom: 20 }}>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                style={{ flex: 1, height: 42, border: 'none', background: 'transparent', fontSize: 14, outline: 'none', color: '#1b1a17' }}
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                aria-label="显示密码"
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#a39d90', display: 'flex' }}
              >
                <IconEye size={18} />
              </button>
            </div>

            {error && <div style={msgBox('#fbe0d8', '#a23d24')}>{error}</div>}
            {info && <div style={msgBox('#dcebd5', '#2f5d36')}>{info}</div>}

            <button type="submit" disabled={busy} className="btn-press" style={{ ...primaryBtn, opacity: busy ? 0.7 : 1 }}>
              {busy ? '处理中…' : mode === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setMode((m) => (m === 'login' ? 'signup' : 'login'));
              setError('');
              setInfo('');
            }}
            className="btn-press"
            style={secondaryBtn}
          >
            {mode === 'login' ? '没有账号？去注册' : '已有账号？去登录'}
          </button>

          {!isSupabaseConfigured && (
            <p style={{ textAlign: 'center', fontSize: 12, color: '#a23d24', marginTop: 14 }}>
              ⚠️ 未检测到 Supabase 配置，登录功能不可用。请参考 README 配置 .env。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#4a463e',
  marginBottom: 6,
};
const underlineInput: React.CSSProperties = {
  width: '100%',
  height: 42,
  border: 'none',
  borderBottom: '1.5px solid #e0d8c9',
  background: 'transparent',
  fontSize: 14,
  outline: 'none',
  marginBottom: 22,
  color: '#1b1a17',
};
const primaryBtn: React.CSSProperties = {
  width: '100%',
  height: 48,
  border: 'none',
  borderRadius: 999,
  background: '#1b1a17',
  color: '#f4f1ea',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
  marginBottom: 12,
};
const secondaryBtn: React.CSSProperties = {
  width: '100%',
  height: 48,
  border: '1.5px solid #e4ddcf',
  borderRadius: 999,
  background: '#fffdf8',
  color: '#1b1a17',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
};
function msgBox(bg: string, fg: string): React.CSSProperties {
  return {
    background: bg,
    color: fg,
    fontSize: 13,
    fontWeight: 600,
    padding: '10px 14px',
    borderRadius: 12,
    marginBottom: 14,
  };
}
