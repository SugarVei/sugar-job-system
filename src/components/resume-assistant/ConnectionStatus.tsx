import type { ExtensionDevice } from '../../types/resumeAssistant';
import { creamCard, muted, primaryBtn } from './styles';
export function ConnectionStatus({ devices, onPair }: { devices: ExtensionDevice[]; onPair: () => void }) {
  const device = devices[0];
  return <section style={creamCard}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><div><strong>{device ? '插件已连接' : '尚未连接插件'}</strong><p style={muted}>{device ? `${device.display_name} · ${device.browser ?? '浏览器'}${device.last_seen_at ? ' · 最近在线' : ''}` : '生成 6 位配对码，在浏览器插件中完成连接。'}</p></div><button onClick={onPair} style={primaryBtn}>{device ? '再连一台' : '连接插件'}</button></div></section>;
}
