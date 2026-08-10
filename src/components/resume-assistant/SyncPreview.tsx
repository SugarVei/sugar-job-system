import type { ResumeProfile, SyncScope } from '../../types/resumeAssistant';
import { PROFILE_SECTIONS } from '../../types/resumeAssistant';
import { creamCard, muted } from './styles';
export function SyncPreview({ profile, scope }: { profile: ResumeProfile; scope: SyncScope }) { return <section style={creamCard}><strong>同步预览</strong><p style={muted}>下列内容会发送给已配对插件。敏感字段已从预览中剥离。</p><pre style={{ margin: 0, overflow: 'auto', maxHeight: 280, background: '#f7f2e9', padding: 12, borderRadius: 12, fontSize: 12 }}>{JSON.stringify(Object.fromEntries(PROFILE_SECTIONS.filter(item => scope[item.key]).map(item => [item.key, profile[item.key]])), null, 2)}</pre></section>; }
