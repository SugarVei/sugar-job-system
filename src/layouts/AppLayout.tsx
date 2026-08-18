import { useCallback, useRef, useState, type ReactNode } from 'react';
import { pulseMotionBudget } from '../lib/motionBudget';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAppShell } from '../contexts/AppShellContext';
import { useProfile } from '../hooks/useProfile';
import { MOBILE_MORE_NAV, MOBILE_PRIMARY_NAV, NAV_ITEMS, greetFor } from '../components/navConfig';
import ThemeSwitcher from '../components/ThemeSwitcher';
import ApiKeySettings from '../components/ApiKeySettingsGuide';
import {
  SugarMark,
  IconSearch,
  IconPlus,
  IconLogout,
  IconUser,
  IconCamera,
  IconMore,
  IconClose,
} from '../components/icons';
import type { ScreenKey } from '../types';

// ============================================================
// 应用主框架：桌面侧边栏 + 顶栏；平板两列；手机底部导航
// ============================================================
export default function AppLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const { theme } = useTheme();
  const { screen, setScreen, query, setQuery, triggerAdd, headerChrome } = useAppShell();
  const { name, avatar, updateName, updateAvatar } = useProfile();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  const greet = greetFor(screen, name);
  const moreActive = MOBILE_MORE_NAV.some((item) => item.key === screen);

  const go = (key: ScreenKey) => {
    setScreen(key);
    setMobileMoreOpen(false);
  };

  // 滚动期间让弥散背景降载；只更新一个时间戳，不触发 React 状态更新
  const onContentScroll = useCallback(() => pulseMotionBudget(), []);

  const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateAvatar(reader.result as string);
    reader.readAsDataURL(file);
  };

  // 头像圆形展示
  const avatarBox = (sizePx: number) => (
    <div
      style={{
        width: sizePx,
        height: sizePx,
        borderRadius: '50%',
        border: '3px solid #fffdf8',
        boxShadow: '0 6px 16px rgba(60,50,35,.14)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: avatar ? '#fffdf8' : 'linear-gradient(135deg,#ece4d6,#dcd2c0)',
        overflow: 'hidden',
      }}
    >
      {avatar && (
        <img
          src={avatar}
          alt="用户头像"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      )}
      {!avatar && <IconUser size={Math.round(sizePx * 0.48)} color="#a89e8a" />}
    </div>
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        height: '100dvh',
        maxHeight: '100dvh',
        minHeight: 0,
        width: '100%',
        display: 'flex',
        color: '#1b1a17',
        overflow: 'hidden',
      }}
      className="p-3 sm:p-4 lg:p-[26px]"
    >
      <div
        className="rounded-[22px] lg:rounded-[34px]"
        style={{
          flex: 1,
          minWidth: 0,
          background: 'rgba(250,246,240,0.66)',
          backdropFilter: 'blur(34px) saturate(1.15)',
          WebkitBackdropFilter: 'blur(34px) saturate(1.15)',
          boxShadow: '0 30px 80px rgba(120,40,70,.18)',
          display: 'flex',
          overflow: 'hidden',
          height: '100%',
          maxHeight: '100%',
          minHeight: 0,
        }}
      >
        {/* ===== 桌面侧边栏（≥ lg 显示） ===== */}
        <aside
          className="hidden lg:flex"
          style={{
            width: 248,
            height: '100%',
            maxHeight: '100%',
            flex: 'none',
            flexDirection: 'column',
            padding: '14px 14px 0',
            borderRight: '1px solid rgba(120,105,80,.1)',
            overflow: 'hidden',
            minHeight: 0,
          }}
        >
          {/* 品牌 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 8px 6px', flex: 'none' }}>
            <div style={brandMark}>
              <SugarMark size={24} />
            </div>
            <div>
              <div style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: 17, lineHeight: 1.1 }}>Sugar</div>
              <div style={{ fontSize: 11, color: '#9a9488', marginTop: 2 }}>行动优先 · 求职系统</div>
            </div>
          </div>

          {/* 个人资料卡 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 6px 10px',
              borderBottom: '1px solid rgba(120,105,80,.12)',
              flex: 'none',
            }}
          >
            <label title="点击更换头像" style={{ position: 'relative', cursor: 'pointer', width: 48, height: 48, flex: 'none' }}>
              <input ref={fileRef} type="file" accept="image/*" onChange={onAvatarChange} style={{ display: 'none' }} />
              {avatarBox(48)}
              <span
                style={{
                  position: 'absolute',
                  right: -2,
                  bottom: -2,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: '#f4c84a',
                  border: '2px solid #f3efe7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconCamera size={10} color="#1b1a17" />
              </span>
            </label>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 11, color: '#9a9488', margin: '0 0 2px 6px' }}>个人账号</div>
              <input
                className="nameedit"
                value={name}
                onChange={(e) => updateName(e.target.value)}
                placeholder="你的名字"
                aria-label="编辑昵称"
                title="点击编辑昵称"
                style={{
                  width: '100%',
                  border: '1px solid transparent',
                  background: 'rgba(255,253,248,.42)',
                  outline: 'none',
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#1b1a17',
                  borderRadius: 10,
                  padding: '5px 7px',
                  cursor: 'text',
                  transition:
                    'background-color var(--motion-ui) var(--ease-out), border-color var(--motion-ui) var(--ease-out)',
                }}
              />
            </div>
          </div>

          {/* 导航：纵向均分填满，无分组标题、无空白、无滚轮 */}
          <nav
            className="sidebar-nav"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              flex: 1,
              minHeight: 0,
              overflow: 'hidden',
              padding: '10px 0 8px',
              justifyContent: 'space-between',
            }}
          >
            {NAV_ITEMS.map(({ key, label, Icon }) => {
              const active = screen === key;
              return (
                <button
                  key={key}
                  onClick={() => go(key)}
                  className={`nav-item ${active ? 'nav-item--active' : ''}`}
                  style={{
                    background: active ? '#1b1a17' : 'transparent',
                    color: active ? '#f4f1ea' : '#6b665c',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    minHeight: 34,
                    padding: '0 12px',
                    border: 'none',
                    borderRadius: 11,
                    fontSize: 13.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                    flex: '1 1 0',
                    width: '100%',
                  }}
                >
                  <span style={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                    <Icon size={16} />
                  </span>
                  {label}
                </button>
              );
            })}
          </nav>

          <div
            style={{
              flex: 'none',
              borderTop: '1px solid rgba(120,105,80,.12)',
              padding: '12px 0 16px',
              display: 'grid',
              gap: 8,
              background: 'transparent',
            }}
          >
            <ApiKeySettings />
            <button onClick={() => signOut()} className="btn-press sidebar-logout" style={logoutBtn}>
              <IconLogout size={17} />
              退出登录
            </button>
          </div>
        </aside>

        {/* ===== 主区 ===== */}
        <main style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* 移动端顶部条（< lg 显示） */}
          <div
            className="flex lg:hidden"
            style={{
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              padding: '14px 16px 6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ ...brandMark, width: 38, height: 38 }}>
                <SugarMark size={22} />
              </div>
              <div style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: 17 }}>Sugar</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ThemeSwitcher />
              <button onClick={() => signOut()} aria-label="退出登录" className="btn-press" style={mobileIconBtn}>
                <IconLogout size={17} />
              </button>
            </div>
          </div>

          {/* 顶栏：标题 + 搜索 + 新增 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
              flex: 'none',
            }}
            className="px-4 lg:px-[34px] pt-3 lg:pt-[26px] pb-3 lg:pb-[18px]"
          >
            <div style={{ flex: 1, minWidth: 180 }}>
              <h1
                className="text-[22px] lg:text-[30px]"
                style={{ fontFamily: 'Poppins', fontWeight: 600, margin: 0, letterSpacing: '-.01em' }}
              >
                {greet.title}
              </h1>
              <p style={{ fontSize: 14, color: '#8a8478', margin: '5px 0 0' }}>{greet.sub}</p>
              <p style={{ fontSize: 11.5, color: '#9a9488', margin: '4px 0 0', lineHeight: 1.45 }}>
                如有兴趣改进，可以访问{' '}
                <a
                  href="https://github.com/SugarVei/sugar-job-system"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#6f6659', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 2 }}
                >
                  GitHub 项目地址
                </a>
                ，记得给个 Star 哦 ⭐
              </p>
            </div>
            <div className="flex items-center gap-3 flex-none w-full sm:w-auto">
              {/* 主题切换仅桌面顶栏显示（移动端在顶部条） */}
              <div className="hidden lg:block">
                <ThemeSwitcher />
              </div>
              {headerChrome?.searchPlaceholder !== null && <div
                className="flex-1 sm:flex-none"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  height: 46,
                  background: '#fffdf8',
                  borderRadius: 14,
                  padding: '0 16px',
                  boxShadow: '0 4px 14px rgba(60,50,35,.05)',
                }}
              >
                <span style={{ color: '#a39d90', flex: 'none', display: 'flex' }}>
                  <IconSearch size={17} />
                </span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={headerChrome?.searchPlaceholder ?? (screen === 'referralCodes' ? '搜索公司、推荐人、内推码…' : '搜索公司、岗位…')}
                  aria-label={headerChrome?.searchPlaceholder ?? '搜索'}
                  className="sm:w-[180px]"
                  style={{ border: 'none', background: 'none', outline: 'none', fontSize: 14, width: '100%', color: '#1b1a17' }}
                />
              </div>}
              {(headerChrome?.primaryAction || headerChrome?.showAdd !== false) && <button onClick={headerChrome?.primaryAction?.onClick ?? triggerAdd} disabled={headerChrome?.primaryAction?.loading} className="btn-press" style={addBtn}>
                <IconPlus size={17} />
                <span className="hidden sm:inline">{headerChrome?.primaryAction?.label ?? '新增'}</span>
              </button>}
            </div>
          </div>

          {/* 内容区（可滚动） */}
          <div
            className="scrolly px-4 lg:px-[34px] pb-24 lg:pb-[34px]"
            onScroll={onContentScroll}
            style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehaviorY: 'contain', paddingTop: 8 }}
          >
            {children}
          </div>
        </main>
      </div>

      {/* ===== 移动端「更多」抽屉 ===== */}
      {mobileMoreOpen && (
        <div
          className="flex lg:hidden modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            background: 'rgba(40, 32, 24, 0.28)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setMobileMoreOpen(false)}
        >
          <div
            className="modal-panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              left: 10,
              right: 10,
              bottom: 84,
              background: 'rgba(255,253,250,0.96)',
              borderRadius: 22,
              boxShadow: '0 18px 40px rgba(60,50,35,.2)',
              padding: '16px 14px 14px',
              maxHeight: 'min(62vh, 420px)',
              overflowY: 'auto',
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 12, padding: '0 4px' }}>
              <div style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: 15 }}>更多功能</div>
              <button
                type="button"
                aria-label="关闭"
                onClick={() => setMobileMoreOpen(false)}
                className="btn-press"
                style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid #e4ddcf', background: '#fffdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <IconClose size={16} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MOBILE_MORE_NAV.map(({ key, label, shortLabel, Icon }) => {
                const active = screen === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => go(key)}
                    className="btn-press"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      padding: '14px 8px',
                      borderRadius: 16,
                      border: active ? '1.5px solid #1b1a17' : '1px solid #ece4d6',
                      background: active ? '#1b1a17' : '#fffdf8',
                      color: active ? '#f4f1ea' : '#5d584d',
                      cursor: 'pointer',
                    }}
                  >
                    <Icon size={20} />
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{shortLabel || label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===== 移动端底部导航（主 5 项 + 更多） ===== */}
      <nav
        className="flex lg:hidden"
        style={{
          position: 'fixed',
          left: 10,
          right: 10,
          bottom: 10,
          height: 64,
          background: 'rgba(255,253,250,0.92)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          borderRadius: 20,
          boxShadow: '0 12px 30px rgba(60,50,35,.18)',
          alignItems: 'center',
          justifyContent: 'space-around',
          padding: '0 4px',
          zIndex: 50,
        }}
      >
        {MOBILE_PRIMARY_NAV.map(({ key, label, shortLabel, Icon }) => {
          const active = screen === key;
          return (
            <button
              key={key}
              onClick={() => go(key)}
              className="btn-press"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: active ? theme.accent : '#9a9488',
                flex: '1 1 0',
                minWidth: 0,
                padding: '6px 0',
              }}
            >
              <Icon size={20} />
              <span style={{ fontSize: 10, fontWeight: 600 }}>{shortLabel || label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileMoreOpen((v) => !v)}
          aria-expanded={mobileMoreOpen}
          aria-label="更多功能"
          className="btn-press"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: moreActive || mobileMoreOpen ? theme.accent : '#9a9488',
            flex: '1 1 0',
            minWidth: 0,
            padding: '6px 0',
          }}
        >
          <IconMore size={20} />
          <span style={{ fontSize: 10, fontWeight: 600 }}>更多</span>
        </button>
      </nav>
    </div>
  );
}

const brandMark: React.CSSProperties = {
  width: 42,
  height: 42,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 'none',
};

const logoutBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  height: 46,
  padding: '0 14px',
  border: '1px solid #e0d8c9',
  background: '#fffdf8',
  borderRadius: 14,
  fontSize: 14,
  fontWeight: 600,
  color: '#4a463e',
  cursor: 'pointer',
  marginTop: 0,
  whiteSpace: 'nowrap',
};

const addBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  height: 46,
  padding: '0 18px',
  border: 'none',
  borderRadius: 14,
  background: '#1b1a17',
  color: '#f4f1ea',
  fontSize: 14.5,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  flex: 'none',
};

const mobileIconBtn: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 12,
  border: '1px solid #e0d8c9',
  background: '#fffdf8',
  color: '#4a463e',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  flex: 'none',
};
