import { overallCompleteness } from '../../lib/resumeAssistantProfile';
import type { ResumeProfile } from '../../types/resumeAssistant';
import { creamCard, ghostBtn, muted } from './styles';
export function ProfileSummary({ profile, onEdit }: { profile: ResumeProfile; onEdit: () => void }) { const score = overallCompleteness(profile); return <section style={creamCard}><strong>标准资料</strong><div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', marginTop: 12 }}><div><span style={{ fontSize: 32, fontWeight: 800 }}>{score}%</span><p style={muted}>填写越完整，插件可自动填写的字段越多。</p></div><button onClick={onEdit} style={ghostBtn}>编辑资料</button></div></section>; }
