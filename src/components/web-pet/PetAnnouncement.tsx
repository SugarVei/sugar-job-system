import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isPetAnnouncementActive, OPEN_PET_CHAT_EVENT, PET_ANNOUNCEMENT } from './petChatConfig';
import './PetChat.css';

export default function PetAnnouncement() {
  const { user } = useAuth();
  const storageKey = `sugar.announcement.${PET_ANNOUNCEMENT.id}.${user?.id ?? 'guest'}`;
  const [dismissed, setDismissed] = useState(() => { try { return localStorage.getItem(storageKey) === '1'; } catch { return false; } });
  const [active, setActive] = useState(() => isPetAnnouncementActive(Date.now()));
  useEffect(() => {
    const refresh = () => setActive(isPetAnnouncementActive(Date.now()));
    const timer = window.setInterval(refresh, 1000);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);
  if (!active || dismissed) return null;
  return <aside className="pet-announcement" aria-label="网站公告" data-expires-at={PET_ANNOUNCEMENT.endsAt}>
    <span className="pet-announcement-icon" aria-hidden="true">☁</span>
    <div><strong>给你添了一位小伙伴：小糖豆来啦！</strong><p>我加入了一只宠物陪你。可以摸摸头、一起玩，也可以和它聊聊天。接入自己的 AI API 后，就能收获可爱、温柔又治愈的回应。</p><small>点击宠物旁的 ··· → 和我聊聊 · AI 未接入也能陪玩 · 本公告展示 2 天</small></div>
    <button className="pet-chat-primary" onClick={() => window.dispatchEvent(new Event(OPEN_PET_CHAT_EVENT))}>认识小糖豆 ↗</button>
    <button className="pet-announcement-close" aria-label="关闭宠物公告" onClick={() => { setDismissed(true); try { localStorage.setItem(storageKey, '1'); } catch { /* Session dismissal still works. */ } }}>×</button>
  </aside>;
}
