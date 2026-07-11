import { useRef, type ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAppShell } from '../contexts/AppShellContext';
import { useProfile } from '../hooks/useProfile';
import { NAV_ITEMS, greetFor } from '../components/navConfig';
import ThemeSwitcher from '../components/ThemeSwitcher';
import ApiKeySettings from '../components/ApiKeySettingsGuide';
import {
  SugarMark,
  IconSearch,
  IconPlus,
  IconLogout,
  IconUser,
  IconCamera,
} from '../components/icons';

// ============================================================
// 应用主框架：桌面侧边栏 + 顶栏；平板两列；手机底部导航
// ============================================================
export default function AppLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const { theme } = useTheme();
  const { screen, setScreen, query, setQuery, triggerAdd } = useAppShell();
  const { name, avatar, updateName, updateAvatar } = useProfile();
  const fileRef = useRef<HTMLInputElement>(null);

  const greet = greetFor(screen, name);

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
            flex: 'none',
            flexDirection: 'column',
            padding: '18px 18px 0',
            borderRight: '1px solid rgba(120,105,80,.1)',
            overflow: 'hidden',
            minHeight: 0,
          }}
        >
          {/* 品牌 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, minHeight: 62, padding: '6px 8px', flex: 'none' }}>
            <div style={brandMark}>
              <SugarMark size={26} />
            </div>
            <div>
              <div style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: 18, lineHeight: 1.1 }}>Sugar</div>
              <div style={{ fontSize: 11.5, color: '#9a9488', marginTop: 2 }}>行动优先 · 求职系统</div>
            </div>
          </div>

          {/* 个人资料卡 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              minHeight: 88,
              padding: '10px 8px 14px',
              borderBottom: '1px solid rgba(120,105,80,.12)',
              flex: 'none',
            }}
          >
            <label title="点击更换头像" style={{ position: 'relative', cursor: 'pointer', width: 56, height: 56, flex: 'none' }}>
              <input ref={fileRef} type="file" accept="image/*" onChange={onAvatarChange} style={{ display: 'none' }} />
              {avatarBox(56)}
              <span
                style={{
                  position: 'absolute',
                  right: -2,
                  bottom: -2,
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: '#f4c84a',
                  border: '2px solid #f3efe7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconCamera size={11} color="#1b1a17" />
              </span>
            </label>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 11.5, color: '#9a9488', margin: '0 0 4px 7px' }}>个人账号</div>
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
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#1b1a17',
                  borderRadius: 10,
                  padding: '7px 8px',
                  cursor: 'text',
                  transition: 'background .15s, border-color .15s, box-shadow .15s',
                }}
              />
            </div>
          </div>

          {/* 导航：仅此区域滚动，底部操作保持固定 */}
          <nav
            className="scrolly sidebar-nav-scroll"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              overscrollBehaviorY: 'contain',
              padding: '18px 0',
            }}
          >
            {NAV_ITEMS.map(({ key, label, Icon }) => {
              const active = screen === key;
              return (
                <button
                  key={key}
                  onClick={() => setScreen(key)}
                  className={`nav-item ${active ? 'nav-item--active' : ''}`}
                  style={{
                    background: active ? '#1b1a17' : 'transparent',
                    color: active ? '#f4f1ea' : '#6b665c',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    minHeight: 44,
                    padding: '0 14px',
                    border: 'none',
                    borderRadius: 13,
                    fontSize: 14.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                    flex: 'none',
                  }}
                >
                  <span style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                    <Icon size={20} />
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
            </div>
            <div className="flex items-center gap-3 flex-none w-full sm:w-auto">
              {/* 主题切换仅桌面顶栏显示（移动端在顶部条） */}
              <div className="hidden lg:block">
                <ThemeSwitcher />
              </div>
              <div
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
                  placeholder="搜索公司、岗位…"
                  className="sm:w-[180px]"
                  style={{ border: 'none', background: 'none', outline: 'none', fontSize: 14, width: '100%', color: '#1b1a17' }}
                />
              </div>
              <button onClick={triggerAdd} className="btn-press" style={addBtn}>
                <IconPlus size={17} />
                <span className="hidden sm:inline">新增</span>
              </button>
            </div>
          </div>

          {/* 内容区（可滚动） */}
          <div
            className="scrolly px-4 lg:px-[34px] pb-24 lg:pb-[34px]"
            style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehaviorY: 'contain', paddingTop: 8 }}
          >
            {children}
          </div>
        </main>
      </div>

      {/* ===== 移动端底部导航（< lg 显示） ===== */}
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
          justifyContent: 'flex-start',
          overflowX: 'auto',
          padding: '0 6px',
          zIndex: 50,
        }}
      >
        {NAV_ITEMS.map(({ key, label, Icon }) => {
          const active = screen === key;
          return (
            <button
              key={key}
              onClick={() => setScreen(key)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: active ? theme.accent : '#9a9488',
                flex: '0 0 66px',
                padding: '6px 0',
              }}
            >
              <Icon size={20} />
              <span style={{ fontSize: 10, fontWeight: 600 }}>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

const brandMark: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 13,
  background: '#1b1a17',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 3px 10px rgba(60,50,35,.12)',
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
