import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { IconCamera, IconClose } from './icons';
import { OPEN_AVATAR_PICKER_EVENT } from './AvatarPicker';
import './AvatarFeatureAnnouncement.css';

const NOTICE_ID = 'avatar-picker-20261009';
const NOTICE_STARTS_AT = Date.parse('2026-10-09T00:00:00+08:00');
const NOTICE_ENDS_AT = Date.parse('2026-10-16T00:00:00+08:00');

export default function AvatarFeatureAnnouncement() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const storageKey = `sugar.announcement.${NOTICE_ID}.${user?.id ?? 'guest'}`;
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(storageKey) === '1'; } catch { return false; }
  });
  const [active, setActive] = useState(() => Date.now() >= NOTICE_STARTS_AT && Date.now() < NOTICE_ENDS_AT);

  useEffect(() => {
    const refresh = () => setActive(Date.now() >= NOTICE_STARTS_AT && Date.now() < NOTICE_ENDS_AT);
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  if (!active || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(storageKey, '1'); } catch { /* Keep the dismissal for this session. */ }
  };

  return (
    <aside
      className="avatar-feature-announcement"
      aria-label="网站通知"
      data-expires-at={new Date(NOTICE_ENDS_AT).toISOString()}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flex: 'none',
        margin: '0 16px 10px',
        padding: '14px 44px 14px 16px',
        border: `1px solid color-mix(in srgb, ${theme.accent} 16%, white)`,
        borderRadius: 17,
        background: `linear-gradient(110deg, ${theme.accentSoft}, rgba(255,253,248,.94))`,
        color: '#514a45',
      }}
    >
      <span aria-hidden="true" style={{ display: 'grid', width: 38, height: 38, flex: 'none', placeItems: 'center', borderRadius: 13, background: 'rgba(255,255,255,.7)', color: theme.accent }}>
        <IconCamera size={19} />
      </span>
      <div style={{ flex: 1, minWidth: 180 }}>
        <strong style={{ color: '#292522', fontSize: 13.5 }}>头像更换功能上线啦</strong>
        <p style={{ margin: '4px 0 0', fontSize: 12, lineHeight: 1.65 }}>
          点击个人头像即可上传自己的图片，或从 35 款候选头像中选择；弹窗颜色会随五种主题同步变化。
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          dismiss();
          window.dispatchEvent(new Event(OPEN_AVATAR_PICKER_EVENT));
        }}
        style={{ flex: 'none', minHeight: 36, padding: '0 14px', border: 0, borderRadius: 11, background: theme.accent, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
      >
        去试试
      </button>
      <button
        type="button"
        aria-label="关闭头像功能通知"
        onClick={dismiss}
        style={{ position: 'absolute', top: 7, right: 8, display: 'grid', width: 28, height: 28, placeItems: 'center', border: 0, borderRadius: 9, background: 'transparent', color: '#817772', cursor: 'pointer' }}
      >
        <IconClose size={15} />
      </button>
    </aside>
  );
}
