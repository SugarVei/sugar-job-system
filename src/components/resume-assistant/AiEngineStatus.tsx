import type { AiCredentialStatus } from '../../types/resumeAssistant';
import { creamCard, muted } from './styles';
export function AiEngineStatus({ credential }: { credential: AiCredentialStatus | null }) { return <section style={creamCard}><strong>AI 映射</strong><p style={muted}>{credential ? `${credential.provider} 已配置（末四位 ${credential.last4}）` : '未配置 AI Key；插件仍可填写已识别的标准字段。'}</p></section>; }
