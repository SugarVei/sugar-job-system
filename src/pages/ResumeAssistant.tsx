import { useCallback, useEffect, useState } from 'react';
import { useAppShell } from '../contexts/AppShellContext';
import { useAutofillProfile } from '../hooks/useAutofillProfile';
import { useAutofillRuns } from '../hooks/useAutofillRuns';
import { useExtensionDevices } from '../hooks/useExtensionDevices';
import { resumeAssistantApi } from '../lib/resumeAssistantApi';
import type { AiCredentialStatus, AutofillRun, ResumeAssistantTab } from '../types/resumeAssistant';
import { AiEngineStatus } from '../components/resume-assistant/AiEngineStatus';
import { CapabilityMatrix } from '../components/resume-assistant/CapabilityMatrix';
import { ConnectionStatus } from '../components/resume-assistant/ConnectionStatus';
import { PairExtensionDrawer } from '../components/resume-assistant/PairExtensionDrawer';
import { PrivacyNotice } from '../components/resume-assistant/PrivacyNotice';
import { ProfileEditor } from '../components/resume-assistant/ProfileEditor';
import { ProfileSummary } from '../components/resume-assistant/ProfileSummary';
import { RecentRuns } from '../components/resume-assistant/RecentRuns';
import { RunDetailsDrawer } from '../components/resume-assistant/RunDetailsDrawer';
import { WorkflowStrip } from '../components/resume-assistant/WorkflowStrip';
import { creamCard, ghostBtn, muted, primaryBtn } from '../components/resume-assistant/styles';

const tabs: Array<{ key: ResumeAssistantTab; label: string }> = [
  { key: 'overview', label: '概览' }, { key: 'profile', label: '标准资料' }, { key: 'settings', label: '插件与 AI' }, { key: 'runs', label: '填写记录' },
];

export default function ResumeAssistant() {
  const { assistantTab, setAssistantTab, setHeaderChrome } = useAppShell();
  const profile = useAutofillProfile();
  const devices = useExtensionDevices();
  const runs = useAutofillRuns();
  const [credential, setCredential] = useState<AiCredentialStatus | null>(null);
  const [selectedRun, setSelectedRun] = useState<AutofillRun | null>(null);
  const [provider, setProvider] = useState('deepseek');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [credentialMessage, setCredentialMessage] = useState('');

  const loadCredential = useCallback(() => { resumeAssistantApi.getAiCredentialStatus().then(result => setCredential(result.credential)).catch(() => setCredential(null)); }, []);
  useEffect(() => { loadCredential(); }, [loadCredential]);

  const onPrimary = useCallback(() => {
    if (devices.devices.length) { void profile.save(); }
    else { void devices.requestPair(); }
  }, [devices, profile]);
  const primaryLabel = devices.devices.length ? (profile.saving ? '正在同步…' : '同步到插件') : '连接插件';
  useEffect(() => {
    setHeaderChrome({ searchPlaceholder: null, showAdd: false, primaryAction: { label: primaryLabel, onClick: onPrimary, loading: profile.saving } });
    return () => setHeaderChrome(null);
  }, [onPrimary, primaryLabel, profile.saving, setHeaderChrome]);

  const saveCredential = async () => {
    if (!apiKey.trim()) { setCredentialMessage('请输入 API Key。'); return; }
    try { const result = await resumeAssistantApi.saveAiCredential(provider, apiKey.trim(), model.trim() || undefined); setCredential(result.credential); setApiKey(''); setCredentialMessage('已加密保存；界面只显示末四位。'); }
    catch (error) { setCredentialMessage(error instanceof Error ? error.message : '保存失败。'); }
  };
  const testCredential = async () => { try { await resumeAssistantApi.testAiCredential(); setCredentialMessage('连接测试成功。'); } catch (error) { setCredentialMessage(error instanceof Error ? error.message : '测试失败。'); } };
  const deleteCredential = async () => { try { await resumeAssistantApi.deleteAiCredential(); setCredential(null); setCredentialMessage('凭证已删除。'); } catch (error) { setCredentialMessage(error instanceof Error ? error.message : '删除失败。'); } };

  return <div style={{ display: 'grid', gap: 16, paddingBottom: 26 }}>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{tabs.map(tab => <button key={tab.key} onClick={() => setAssistantTab(tab.key)} style={{ ...ghostBtn, background: assistantTab === tab.key ? '#1b1a17' : '#fffdf8', color: assistantTab === tab.key ? '#fffdf8' : '#4d473d' }}>{tab.label}</button>)}</div>
    {profile.localOnly && <div style={{ ...creamCard, borderColor: '#ecd29b', background: '#fff8e8', ...muted }}>云端连接暂时不可用，系统正在自动重连。若持续显示，请退出后重新登录；当前资料仍安全保存在本浏览器。</div>}
    {assistantTab === 'overview' && <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}><ConnectionStatus devices={devices.devices} onPair={() => void devices.requestPair()} /><ProfileSummary profile={profile.profile} onEdit={() => setAssistantTab('profile')} /><AiEngineStatus credential={credential} /><WorkflowStrip /><CapabilityMatrix /><RecentRuns runs={runs.runs} /></div>}
    {assistantTab === 'profile' && <ProfileEditor profile={profile.profile} setProfile={profile.setProfile} onSave={() => void profile.save()} saving={profile.saving} localOnly={profile.localOnly} credential={credential} />}
    {assistantTab === 'settings' && <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}><PrivacyNotice /><section style={creamCard}><strong>已配对设备</strong><p style={muted}>{devices.devices.length ? '撤销后，该浏览器令牌会立即失效。' : '还没有已配对设备。'}</p>{devices.devices.map(device => <div key={device.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', padding: '9px 0', borderTop: '1px solid #eee5d8' }}><span style={muted}>{device.display_name} · {device.browser ?? '浏览器'}</span><button style={ghostBtn} onClick={() => void devices.revoke(device.id)}>撤销</button></div>)}</section><section style={creamCard}><strong>同步范围</strong><p style={muted}>证件与资格默认不同步；敏感字段即便选择同步也会在云端剥离。</p>{Object.entries(profile.syncScope).map(([key, enabled]) => <label key={key} style={{ display: 'block', margin: '8px 0', fontSize: 13 }}><input type="checkbox" checked={enabled} onChange={e => profile.setSyncScope({ ...profile.syncScope, [key]: e.target.checked })} /> {key}</label>)}</section><section style={creamCard}><strong>AI 凭证</strong><p style={muted}>密钥只在服务端加密保存，扩展默认使用 Sugar 代理。不会用于自动提交。</p><select value={provider} onChange={e => setProvider(e.target.value)} style={{ width: '100%', padding: 10, marginBottom: 8, borderRadius: 10, border: '1px solid #ded4c4' }}><option value="deepseek">DeepSeek</option><option value="openai">OpenAI</option><option value="kimi">Kimi</option><option value="qwen">Qwen</option><option value="minimax">MiniMax</option><option value="gemini">Gemini</option></select><input value={model} onChange={e => setModel(e.target.value)} placeholder="可选：模型名称" style={{ width: '100%', padding: 10, marginBottom: 8, borderRadius: 10, border: '1px solid #ded4c4' }}/><input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="API Key" style={{ width: '100%', padding: 10, marginBottom: 10, borderRadius: 10, border: '1px solid #ded4c4' }}/><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button style={primaryBtn} onClick={() => void saveCredential()}>加密保存</button>{credential && <><button style={ghostBtn} onClick={() => void testCredential()}>测试</button><button style={ghostBtn} onClick={() => void deleteCredential()}>删除</button></>}</div>{credential && <p style={muted}>当前：{credential.provider} · ****{credential.last4}</p>}{credentialMessage && <p style={muted}>{credentialMessage}</p>}</section></div>}
    {assistantTab === 'runs' && <section style={creamCard}><strong>填写记录</strong><p style={muted}>只保存统计、适配器与错误码，不保存实际填写内容。</p>{runs.runs.length ? <div style={{ display: 'grid', gap: 8 }}>{runs.runs.map(run => <button key={run.id} onClick={() => setSelectedRun(run)} style={{ ...ghostBtn, textAlign: 'left' }}>{run.origin_host} · {run.status} · {run.fields_filled}/{run.fields_total}</button>)}</div> : <p style={muted}>暂时没有填写记录。</p>}</section>}
    <PairExtensionDrawer code={devices.pairCode} expiresAt={devices.pairExpiresAt} localOnly={devices.localOnly} onClose={devices.closePair} onRefresh={() => void devices.requestPair()} />
    <RunDetailsDrawer run={selectedRun} onClose={() => setSelectedRun(null)} />
  </div>;
}
