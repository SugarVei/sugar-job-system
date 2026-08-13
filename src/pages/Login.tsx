import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import EmojiRings from '../components/EmojiRings';
import { SugarMark, IconEye } from '../components/icons';

const SIGNUP_COOLDOWN_SECONDS = 60;
type AuthErrorLike = { code?: string; message?: string; status?: number };

function isEmailRateLimitError(error: unknown) {
  const item = error as AuthErrorLike;
  const details = `${item?.code ?? ''} ${item?.message ?? ''}`.toLowerCase();
  return (item?.status === 429 && details.includes('email')) || details.includes('email rate limit') || details.includes('over_email_send_rate_limit');
}
function getAuthErrorMessage(error: unknown) {
  const item = error as AuthErrorLike;
  const details = `${item?.code ?? ''} ${item?.message ?? ''}`.toLowerCase();
  if (isEmailRateLimitError(error)) return '邮件发送过于频繁，请稍后再试。';
  if (details.includes('invalid login credentials')) return '邮箱或密码不正确。忘记密码可点击“找回密码”。';
  if (details.includes('email not confirmed')) return '该邮箱尚未完成确认，请先查看确认邮件。';
  if (details.includes('user already registered')) return '如果该邮箱已注册，请直接登录；忘记密码可使用“找回密码”。';
  if (details.includes('password should be at least')) return '密码至少需要 6 位。';
  if (item?.status === 429 || details.includes('rate limit')) return '操作过于频繁，请稍后再试。';
  return '操作失败，请稍后重试。';
}

export default function Login({ passwordRecovery = false }: { passwordRecovery?: boolean }) {
  const { signIn, signUp, resetPassword, updatePassword } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [signupCooldown, setSignupCooldown] = useState(0);

  useEffect(() => {
    if (signupCooldown <= 0) return;
    const timer = window.setTimeout(() => setSignupCooldown((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [signupCooldown]);

  const switchMode = (next: 'login' | 'signup' | 'forgot') => {
    setMode(next); setError(''); setInfo(''); setPassword(''); setConfirmPassword('');
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setInfo('');
    if (!isSupabaseConfigured) { setError('Supabase 尚未配置，账号功能暂时不可用。'); return; }
    if (passwordRecovery) {
      if (password.length < 6) { setError('新密码至少需要 6 位。'); return; }
      if (password !== confirmPassword) { setError('两次输入的新密码不一致。'); return; }
    } else if (mode === 'forgot') {
      if (!email) { setError('请输入注册时使用的邮箱。'); return; }
    } else if (!email || !password) { setError('请输入邮箱和密码。'); return; }
    if (mode === 'signup' && signupCooldown > 0) { setError(`请在 ${signupCooldown} 秒后再试。`); return; }
    setBusy(true);
    try {
      if (passwordRecovery) {
        await updatePassword(password);
        setInfo('密码已更新，正在恢复你的登录状态。'); setPassword(''); setConfirmPassword('');
      } else if (mode === 'forgot') {
        await resetPassword(email.trim());
        setInfo('如果该邮箱已注册，重置密码邮件已发送。请打开最新邮件并按提示设置新密码。');
      } else if (mode === 'login') {
        await signIn(email, password);
      } else {
        const { needsConfirm, existingHint } = await signUp(email, password);
        if (existingHint) {
          setInfo('如果该邮箱已经注册，请直接登录；若忘记密码，请点击“找回密码”。如果尚未注册，请查看确认邮件。');
          setMode('login');
        } else if (needsConfirm) {
          setInfo('注册成功，请前往邮箱点击确认链接后再登录。'); setMode('login');
        }
      }
    } catch (caught) {
      if (mode === 'signup' && isEmailRateLimitError(caught)) setSignupCooldown(SIGNUP_COOLDOWN_SECONDS);
      setError(getAuthErrorMessage(caught));
    } finally { setBusy(false); }
  };

  const title = passwordRecovery ? '设置新密码' : mode === 'login' ? '欢迎回来！' : mode === 'signup' ? '创建账号' : '找回密码';
  const description = passwordRecovery ? '请设置一个新的登录密码。' : mode === 'login' ? '请输入你的登录信息' : mode === 'signup' ? '一个邮箱只能注册一个账号；已注册请直接登录。' : '输入注册邮箱，我们会发送密码重置邮件。';
  const action = passwordRecovery ? '保存新密码' : mode === 'login' ? '登录' : mode === 'signup' ? (signupCooldown > 0 ? `${signupCooldown} 秒后可重试` : '注册') : '发送重置邮件';

  return <div className="p-4 lg:p-[26px]" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
    <div className="login-card" style={{ display: 'flex', width: '100%', maxWidth: 1180, background: 'rgba(255,253,250,0.5)', backdropFilter: 'blur(36px) saturate(1.18)', WebkitBackdropFilter: 'blur(36px) saturate(1.18)', border: '1px solid rgba(255,255,255,0.5)', borderRadius: 30, overflow: 'hidden', boxShadow: '0 30px 80px rgba(120,40,70,.2)' }}>
      <div className="hidden md:flex" style={{ flex: 1.15 }}><EmojiRings /></div>
      <div className="w-full md:w-[440px] p-7 sm:p-[46px]" style={{ flex: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}><SugarMark size={44} /></div>
        <h1 style={{ fontFamily: 'Poppins', fontSize: 30, fontWeight: 700, textAlign: 'center', margin: '0 0 6px' }}>{title}</h1>
        <p style={{ textAlign: 'center', fontSize: 13.5, color: '#9a9488', margin: '0 0 28px' }}>{description}</p>
        <form onSubmit={submit}>
          {!passwordRecovery && <><label style={lbl}>邮箱</label><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" style={underlineInput} /></>}
          {mode !== 'forgot' && <><label style={lbl}>{passwordRecovery ? '新密码' : '密码'}</label><PasswordInput value={password} onChange={setPassword} show={showPw} onToggle={() => setShowPw((current) => !current)} autoComplete={passwordRecovery || mode === 'signup' ? 'new-password' : 'current-password'} />{passwordRecovery && <><label style={lbl}>确认新密码</label><PasswordInput value={confirmPassword} onChange={setConfirmPassword} show={showPw} onToggle={() => setShowPw((current) => !current)} autoComplete="new-password" /></>}</>}
          {error && <div role="alert" style={msgBox('#fbe0d8', '#a23d24')}>{error}</div>}
          {info && <div role="status" style={msgBox('#dcebd5', '#2f5d36')}>{info}</div>}
          <button type="submit" disabled={busy || (mode === 'signup' && signupCooldown > 0)} className="btn-press" style={{ ...primaryBtn, opacity: busy || (mode === 'signup' && signupCooldown > 0) ? 0.7 : 1 }}>{busy ? '处理中…' : action}</button>
        </form>
        {!passwordRecovery && <div style={{ display: 'grid', gap: 10 }}>
          <button type="button" onClick={() => switchMode(mode === 'signup' ? 'login' : 'signup')} className="btn-press" style={secondaryBtn}>{mode === 'signup' ? '已有账号？去登录' : '没有账号？去注册'}</button>
          {mode === 'login' && <button type="button" onClick={() => switchMode('forgot')} className="btn-press" style={accountRecoveryBtn}>忘记密码？找回账号</button>}
          {mode === 'forgot' && <button type="button" onClick={() => switchMode('login')} className="btn-press" style={textBtn}>返回登录</button>}
        </div>}
        {!isSupabaseConfigured && <p style={{ textAlign: 'center', fontSize: 12, color: '#a23d24', marginTop: 14 }}>未检测到 Supabase 配置，登录与找回密码不可用。</p>}
      </div>
    </div>
  </div>;
}

function PasswordInput({ value, onChange, show, onToggle, autoComplete }: { value: string; onChange: (value: string) => void; show: boolean; onToggle: () => void; autoComplete: string }) {
  return <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1.5px solid #e0d8c9', marginBottom: 20 }}><input type={show ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} placeholder="••••••••" autoComplete={autoComplete} style={{ flex: 1, height: 42, border: 'none', background: 'transparent', fontSize: 14, outline: 'none', color: '#1b1a17' }} /><button type="button" onClick={onToggle} aria-label="显示或隐藏密码" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#a39d90', display: 'flex' }}><IconEye size={18} /></button></div>;
}
const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#4a463e', marginBottom: 6 };
const underlineInput: React.CSSProperties = { width: '100%', height: 42, border: 'none', borderBottom: '1.5px solid #e0d8c9', background: 'transparent', fontSize: 14, outline: 'none', marginBottom: 22, color: '#1b1a17' };
const primaryBtn: React.CSSProperties = { width: '100%', height: 48, border: 'none', borderRadius: 999, background: '#1b1a17', color: '#f4f1ea', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginBottom: 12 };
const secondaryBtn: React.CSSProperties = { width: '100%', height: 48, border: '1.5px solid #e4ddcf', borderRadius: 999, background: '#fffdf8', color: '#1b1a17', fontSize: 15, fontWeight: 600, cursor: 'pointer' };
const textBtn: React.CSSProperties = { border: 'none', background: 'transparent', color: '#8a5a34', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '4px 0' };
const accountRecoveryBtn: React.CSSProperties = { ...textBtn, color: '#9a7148', fontWeight: 600, marginTop: 2, padding: '8px 0 2px' };
function msgBox(bg: string, fg: string): React.CSSProperties { return { background: bg, color: fg, fontSize: 13, fontWeight: 600, padding: '10px 14px', borderRadius: 12, marginBottom: 14, lineHeight: 1.5 }; }
