import { useCallback, useEffect, useState } from 'react';
import { useAppShell } from '../contexts/AppShellContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAutofillProfile } from '../hooks/useAutofillProfile';
import { useAutofillRuns } from '../hooks/useAutofillRuns';
import { useExtensionDevices } from '../hooks/useExtensionDevices';
import { overallCompleteness } from '../lib/resumeAssistantProfile';
import { resumeAssistantApi } from '../lib/resumeAssistantApi';
import type { AiCredentialStatus, AutofillRun, ResumeAssistantTab } from '../types/resumeAssistant';
import { PairExtensionDrawer } from '../components/resume-assistant/PairExtensionDrawer';
import { PrivacyNotice } from '../components/resume-assistant/PrivacyNotice';
import { ProfileEditor } from '../components/resume-assistant/ProfileEditor';
import { RunDetailsDrawer } from '../components/resume-assistant/RunDetailsDrawer';
import { creamCard, ghostBtn, muted, primaryBtn } from '../components/resume-assistant/styles';
import { IconArrowRight, IconCheck, IconFile, IconPlugin, IconReview, IconSettings } from '../components/icons';
import type { ThemeKey } from '../styles/theme';
import './ResumeAssistant.css';

const tabs: Array<{ key: ResumeAssistantTab; label: string }> = [
  { key: 'overview', label: '概览' }, { key: 'profile', label: '标准资料' }, { key: 'settings', label: '插件与 AI' }, { key: 'runs', label: '填写记录' },
];

const assistantPalettes: Record<ThemeKey, { accent: string; soft: string; border: string; surface: string }> = {
  pink: { accent: '#e96883', soft: '#fcecef', border: '#f2ccd5', surface: '#fffafb' },
  blue: { accent: '#4f8fd5', soft: '#eaf3fc', border: '#cadef2', surface: '#fafdff' },
  green: { accent: '#72a962', soft: '#edf5ea', border: '#d2e3cd', surface: '#fbfdf9' },
  gray: { accent: '#8c86c7', soft: '#f0eef9', border: '#dcd8ee', surface: '#fcfbff' },
  cream: { accent: '#c09b62', soft: '#f7f0e4', border: '#e8d9c2', surface: '#fffdf9' },
};

export default function ResumeAssistant() {
  const { assistantTab, setAssistantTab, setHeaderChrome } = useAppShell();
  const { themeKey } = useTheme();
  const profile = useAutofillProfile();
  const devices = useExtensionDevices();
  const runs = useAutofillRuns();
  const [credential, setCredential] = useState<AiCredentialStatus | null>(null);
  const [selectedRun, setSelectedRun] = useState<AutofillRun | null>(null);
  const [provider, setProvider] = useState('deepseek');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [credentialMessage, setCredentialMessage] = useState('');
  const requestPair = devices.requestPair;
  const saveProfile = profile.save;

  const loadCredential = useCallback(() => { resumeAssistantApi.getAiCredentialStatus().then(result => setCredential(result.credential)).catch(() => setCredential(null)); }, []);
  useEffect(() => { loadCredential(); }, [loadCredential]);

  const hasDevices = devices.devices.length > 0;
  const onPrimary = useCallback(() => {
    if (hasDevices) { void saveProfile(); }
    else { void requestPair(); }
  }, [hasDevices, requestPair, saveProfile]);
  const primaryLabel = hasDevices ? (profile.saving ? '正在同步…' : '同步到插件') : '连接插件';
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

  const palette = assistantPalettes[themeKey];
  const device = devices.devices[0];
  const completeness = overallCompleteness(profile.profile);
  const assistantStyle = {
    '--assistant-accent': palette.accent,
    '--assistant-soft': palette.soft,
    '--assistant-border': palette.border,
    '--assistant-surface': palette.surface,
  } as React.CSSProperties;

  return <div className="assistant-page" style={assistantStyle}>
    <div className="assistant-tabs" role="tablist" aria-label="智能填表助手功能">
      {tabs.map(tab => <button key={tab.key} type="button" role="tab" aria-selected={assistantTab === tab.key} onClick={() => setAssistantTab(tab.key)} className={`assistant-tab${assistantTab === tab.key ? ' is-active' : ''}`}>{tab.label}</button>)}
    </div>
    {profile.localOnly && <div style={{ ...creamCard, borderColor: '#ecd29b', background: '#fff8e8', ...muted }}>云端连接暂时不可用，系统正在自动重连。若持续显示，请退出后重新登录；当前资料仍安全保存在本浏览器。</div>}
    {assistantTab === 'overview' && <div className="assistant-overview">
      <section className="assistant-card assistant-status-card">
        <div className="assistant-icon"><IconPlugin size={24} /></div>
        <div className="assistant-card-copy">
          <span className="assistant-eyebrow">插件状态</span>
          <h2>{device ? '插件已连接' : '尚未连接插件'}</h2>
          <p>{device ? `${device.display_name} · ${device.browser ?? '浏览器'}${device.last_seen_at ? ' · 最近在线' : ''}` : '生成 6 位配对码，在浏览器插件中完成连接。'}</p>
        </div>
        <button className="assistant-primary" type="button" onClick={() => void devices.requestPair()}>{device ? '再连一台' : '连接插件'}</button>
      </section>

      <section className="assistant-card assistant-profile-card">
        <div className="assistant-card-head"><div><span className="assistant-eyebrow">资料准备</span><h2>标准资料</h2></div><div className="assistant-icon"><IconFile size={23} /></div></div>
        <div className="assistant-score-row"><strong>{completeness}%</strong><span>完整度</span></div>
        <div className="assistant-progress" role="progressbar" aria-label="资料完整度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completeness}><span style={{ width: `${completeness}%` }} /></div>
        <div className="assistant-card-footer"><p>填写越完整，插件可自动填写的字段越多。</p><button className="assistant-secondary" type="button" onClick={() => setAssistantTab('profile')}>编辑资料</button></div>
      </section>

      <section className="assistant-card assistant-ai-card">
        <div className="assistant-card-head"><div><span className="assistant-eyebrow">智能识别</span><h2>AI 映射</h2></div><div className="assistant-icon"><IconSettings size={23} /></div></div>
        <p>{credential ? `${credential.provider} 已配置（末四位 ${credential.last4}）` : '未配置 AI Key；插件仍可填写已识别的标准字段。'}</p>
        <span className={`assistant-state${credential ? ' is-ready' : ''}`}><i />{credential ? '运行正常' : '等待配置'}</span>
      </section>

      <section className="assistant-card assistant-workflow-card">
        <div className="assistant-card-head"><div><span className="assistant-eyebrow">四步完成</span><h2>使用流程</h2></div><span className="assistant-step-count">01—04</span></div>
        <div className="assistant-workflow">
          {['网站管理资料', '生成配对码', '插件同步资料', '在招聘页填写'].map((item, index) => <div className="assistant-step" key={item}><span>{index + 1}</span><b>{item}</b>{index < 3 && <IconArrowRight size={16} />}</div>)}
        </div>
      </section>

      <section className="assistant-card assistant-runs-card">
        <div className="assistant-card-head"><div><span className="assistant-eyebrow">历史记录</span><h2>最近填写记录</h2></div><div className="assistant-icon"><IconReview size={23} /></div></div>
        {runs.runs.length ? <div className="assistant-run-list">{runs.runs.slice(0, 4).map(run => <button key={run.id} type="button" onClick={() => setSelectedRun(run)}><span>{run.origin_host}</span><b>{run.fields_filled}/{run.fields_total}</b><small>{run.status}</small></button>)}</div> : <div className="assistant-empty"><IconReview size={30} /><strong>还没有记录</strong><p>完成一次填表后会显示在这里，只保存统计和错误码。</p></div>}
      </section>

      <section className="assistant-card assistant-boundary-card">
        <div className="assistant-card-head"><div><span className="assistant-eyebrow">隐私与控制</span><h2>能力边界</h2></div><div className="assistant-icon"><IconCheck size={24} /></div></div>
        <div className="assistant-boundary-list"><p><IconCheck size={16} />只识别并填写标准字段</p><p><IconCheck size={16} />敏感信息不会发送给 AI</p><p><IconCheck size={16} />不会自动提交、上传附件或处理验证码</p></div>
        <button className="assistant-text-action" type="button" onClick={() => setAssistantTab('settings')}>查看完整设置 <IconArrowRight size={15} /></button>
      </section>
    </div>}
    {assistantTab === 'profile' && <ProfileEditor profile={profile.profile} setProfile={profile.setProfile} onSave={() => void profile.save()} saving={profile.saving} localOnly={profile.localOnly} credential={credential} />}
    {assistantTab === 'settings' && <div className="assistant-settings-grid"><PrivacyNotice /><section className="assistant-form-card"><strong>已配对设备</strong><p>{devices.devices.length ? '撤销后，该浏览器令牌会立即失效。' : '还没有已配对设备。'}</p>{devices.devices.map(device => <div key={device.id} className="assistant-device-row"><span>{device.display_name} · {device.browser ?? '浏览器'}</span><button style={ghostBtn} onClick={() => void devices.revoke(device.id)}>撤销</button></div>)}</section><section className="assistant-form-card"><strong>同步范围</strong><p>证件与资格默认不同步；敏感字段即便选择同步也会在云端剥离。</p>{Object.entries(profile.syncScope).map(([key, enabled]) => <label key={key}><input type="checkbox" checked={enabled} onChange={e => profile.setSyncScope({ ...profile.syncScope, [key]: e.target.checked })} /> {key}</label>)}</section><section className="assistant-form-card"><strong>AI 凭证</strong><p>密钥只在服务端加密保存，扩展默认使用 Sugar 代理。不会用于自动提交。</p><select value={provider} onChange={e => setProvider(e.target.value)}><option value="deepseek">DeepSeek</option><option value="openai">OpenAI</option><option value="kimi">Kimi</option><option value="qwen">Qwen</option><option value="minimax">MiniMax</option><option value="gemini">Gemini</option></select><input value={model} onChange={e => setModel(e.target.value)} placeholder="可选：模型名称"/><input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="API Key"/><div className="assistant-form-actions"><button style={primaryBtn} onClick={() => void saveCredential()}>加密保存</button>{credential && <><button style={ghostBtn} onClick={() => void testCredential()}>测试</button><button style={ghostBtn} onClick={() => void deleteCredential()}>删除</button></>}</div>{credential && <p>当前：{credential.provider} · ****{credential.last4}</p>}{credentialMessage && <p>{credentialMessage}</p>}</section></div>}
    {assistantTab === 'runs' && <section className="assistant-form-card assistant-runs-page"><strong>填写记录</strong><p>只保存统计、适配器与错误码，不保存实际填写内容。</p>{runs.runs.length ? <div className="assistant-run-list">{runs.runs.map(run => <button key={run.id} onClick={() => setSelectedRun(run)}><span>{run.origin_host}</span><b>{run.fields_filled}/{run.fields_total}</b><small>{run.status}</small></button>)}</div> : <div className="assistant-empty"><IconReview size={30} /><strong>暂时没有填写记录</strong><p>完成一次填表后会显示在这里。</p></div>}</section>}
    <PairExtensionDrawer code={devices.pairCode} expiresAt={devices.pairExpiresAt} localOnly={devices.localOnly} onClose={devices.closePair} onRefresh={() => void devices.requestPair()} />
    <RunDetailsDrawer run={selectedRun} onClose={() => setSelectedRun(null)} />
  </div>;
}
