import { useEffect, useState } from 'react';
import { ghostBtn, primaryBtn } from './styles';
export function PairExtensionDrawer({ code, expiresAt, onClose, onRefresh, localOnly }: { code: string | null; expiresAt: string | null; onClose: () => void; onRefresh: () => void; localOnly: boolean }) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => { const tick = () => setRemaining(expiresAt ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000)) : 0); tick(); const id = window.setInterval(tick, 1000); return () => clearInterval(id); }, [expiresAt]);
  if (!code) return null;
  return <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(25,20,12,.38)', zIndex: 100, display: 'grid', placeItems: 'center', padding: 20 }}><div style={{ background: '#fffdf8', borderRadius: 22, padding: 28, width: 'min(420px,100%)', textAlign: 'center' }}><h2 style={{ marginTop: 0 }}>连接浏览器插件</h2><p style={{ color: '#837b70' }}>在插件 Sugar 面板输入以下 6 位配对码。</p><div style={{ fontSize: 42, letterSpacing: 10, fontWeight: 800, margin: '22px 0' }}>{code}</div><p style={{ color: '#837b70' }}>{localOnly ? '演示模式：代码不会连接到云端。' : `剩余 ${remaining} 秒`}</p><div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}><button style={ghostBtn} onClick={onClose}>关闭</button><button style={primaryBtn} onClick={onRefresh}>重新生成</button></div></div></div>;
}
