import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useApiKeys } from '../contexts/ApiKeysContext';
import { PROVIDERS, type ProviderId } from '../lib/providers';
import { IconSettings } from './icons';

const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];
type GuideMode = 'choice' | 'self' | 'help';

const providerStyle: Record<ProviderId, { initial: string; color: string }> = {
  deepseek: { initial: 'D', color: '#356fd3' },
  openai: { initial: 'O', color: '#2f4b46' },
  claude: { initial: 'C', color: '#c45f3b' },
  kimi: { initial: 'K', color: '#6c46b5' },
};

export default function ApiKeySettingsGuide() {
  const [open, setOpen] = useState(false);
  const { keys, loading, activeProvider, setActiveProvider, saveKey, removeKey } = useApiKeys();
  const [drafts, setDrafts] = useState<Partial<Record<ProviderId, string>>>({});
  const [saving, setSaving] = useState<ProviderId | null>(null);
  const [showKey, setShowKey] = useState<Partial<Record<ProviderId, boolean>>>({});
  const [error, setError] = useState('');
  const [guideOpen, setGuideOpen] = useState(false);
  const [selectedGuideProvider, setSelectedGuideProvider] = useState<ProviderId | null>(null);
  const [guideMode, setGuideMode] = useState<GuideMode>('choice');
  const [qrMissing, setQrMissing] = useState(false);

  const openModal = () => {
    const next: Partial<Record<ProviderId, string>> = {};
    for (const id of PROVIDER_IDS) next[id] = keys[id] ?? '';
    setDrafts(next);
    setError('');
    setOpen(true);
  };

  const openGuide = (provider: ProviderId) => {
    setSelectedGuideProvider(provider);
    setGuideMode('choice');
    setQrMissing(false);
    setGuideOpen(true);
  };

  const closeGuide = () => {
    setGuideOpen(false);
    setSelectedGuideProvider(null);
    setGuideMode('choice');
    setQrMissing(false);
  };

  const handleSave = async (provider: ProviderId) => {
    const key = (drafts[provider] ?? '').trim();
    setSaving(provider);
    setError('');
    try {
      if (key) await saveKey(provider, key);
      else await removeKey(provider);
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(null);
    }
  };

  const guideProvider = selectedGuideProvider ? PROVIDERS[selectedGuideProvider] : null;

  const guideModal = guideOpen && selectedGuideProvider && guideProvider ? createPortal(
    <div onClick={closeGuide} style={overlay(520)}>
      <div onClick={e => e.stopPropagation()} style={{ ...guideShell, maxWidth: guideMode === 'choice' ? 440 : 480 }}>
        <div style={guideHeader}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', minWidth: 0 }}>
            {guideMode !== 'choice' && <button onClick={() => setGuideMode('choice')} style={backBtn} aria-label="返回">←</button>}
            <div>
              <div style={{ fontSize: guideMode === 'choice' ? 17 : 16.5, fontWeight: 700, color: '#1b1a17', lineHeight: 1.4 }}>
                {guideMode === 'choice' ? `你想怎么完成 ${guideProvider.label} API 购买？` : guideMode === 'self' ? `${guideProvider.label} 自助购买流程` : 'API 配置指导服务'}
              </div>
              {guideMode === 'choice' && <p style={guideSub}>选一种方式，我们帮你配置好 API Key</p>}
              {guideMode === 'self' && <p style={guideSub}>共 4 步，5 分钟内完成</p>}
            </div>
          </div>
          <button onClick={closeGuide} style={{ ...iconBtn, width: 28, height: 28, fontSize: 14 }}>×</button>
        </div>

        <div className="scrolly" style={{ flex: 1, overflowY: 'auto', padding: guideMode === 'choice' ? '12px 26px 26px' : '10px 24px 24px' }}>
          {guideMode === 'choice' && (
            <div style={{ display: 'grid', gap: 12 }}>
              <ChoiceCard icon="👩‍💻" title="需要人工协助" button="联系站长协助配置" variant="outline" onClick={() => setGuideMode('help')}>
                适合不知道怎么注册、充值、创建 API Key、导入系统的用户。站长会通过微信指导你完成官方充值和 API Key 配置。
              </ChoiceCard>
              <ChoiceCard icon="📘" title="查看自助教程" button="打开自助教程" variant="solid" onClick={() => setGuideMode('self')}>
                适合愿意自己操作的用户。系统会提供官方充值入口、API Key 创建入口和完整步骤。
              </ChoiceCard>
            </div>
          )}

          {guideMode === 'self' && (
            <div>
              <TimelineStep index={1} title="打开官方平台，注册或登录账号" body={`在 ${guideProvider.label} 官方页面完成账号登录，Sugar 不参与也不获取你的账号信息。`} button="打开官方平台 ↗" href={guideProvider.officialSite} solid />
              <TimelineStep index={2} title="进入充值页面，按需充值" body="充值金额由你自行决定，直接在官方页面完成支付。" button="打开官方充值页面 ↗" href={guideProvider.topUpUrl} />
              <TimelineStep index={3} title="创建 API Key 并复制" body="在 API Key 页面新建一个 Key，创建后请立即复制，多数平台只显示一次。" button="打开 API Key 创建页面 ↗" href={guideProvider.keyUrl} />
              <TimelineStep index={4} title="回到 Sugar，粘贴保存" body={`把刚才复制的 Key 粘贴到 ${guideProvider.label} 卡片的输入框中并保存。`} button="返回导入 API Key" onClick={closeGuide} done />
              <div style={safeNotice}><span style={{ flex: 'none' }}>🔒</span><p style={{ margin: 0 }}>Sugar 不会要求你输入 DeepSeek、OpenAI、Claude、Kimi 等平台的账号密码。账号登录和充值都应在官方页面完成。</p></div>
            </div>
          )}

          {guideMode === 'help' && (
            <div>
              <div style={qrBlock}>
                {qrMissing ? (
                  <div style={qrPlaceholder}>微信二维码 / 收款码占位</div>
                ) : (
                  <img src="/images/wechat-pay.jpg" alt="站长微信二维码" onError={() => setQrMissing(true)} style={qrImage} />
                )}
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1b1a17', marginBottom: 4 }}>扫码添加站长微信</div>
                  <p style={{ fontSize: 12, color: '#6b665c', margin: 0, lineHeight: 1.6 }}>备注“服务商名称 + 配置”，工作时间内 30 分钟内响应，适用于 DeepSeek / OpenAI / Claude / Kimi 全部服务商。</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                <PriceCard title="基础指导" price="¥5" suffix="/ 次">指导找到官方充值入口、创建 API Key、导入系统。</PriceCard>
                <PriceCard title="全流程协助" price="10%" suffix="充值金额，最低 ¥5" recommended>注册、充值、创建 Key 到导入 Sugar 全程指导。</PriceCard>
              </div>
              <div style={feeExample}>例：充值 ¥10 → 服务费 ¥5（最低价）；充值 ¥100 → 服务费 ¥10</div>
              <ul style={{ margin: '0 0 16px', paddingLeft: 18, fontSize: 11.5, lineHeight: 1.85, color: '#6b665c' }}>
                <li>API 额度由用户在服务商官方平台自行充值；</li>
                <li>本服务仅提供购买流程与 API Key 配置指导；</li>
                <li>不收集、不保存用户的第三方平台账号密码；</li>
                <li>用户需自行保管 API Key 和平台账号。</li>
              </ul>
              <button onClick={closeGuide} style={completeBtn}>返回导入 API Key</button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  ) : null;

  const modal = open ? createPortal(
    <div onClick={() => setOpen(false)} style={overlay(400)}>
      <div onClick={e => e.stopPropagation()} style={mainShell}>
        <div style={mainHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 20 }}>🔑</span>
            <div>
              <div style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: 15, color: '#1b1a17' }}>AI 模型设置</div>
              <div style={{ fontSize: 11.5, color: '#a39d90', marginTop: 1 }}>配置你自己的 API Key，调用不同 AI 服务商</div>
            </div>
          </div>
          <button onClick={() => setOpen(false)} style={iconBtn}>×</button>
        </div>

        <div className="scrolly" style={{ flex: 1, overflowY: 'auto', padding: '18px 22px 22px' }}>
          <div style={{ marginBottom: 22 }}>
            <div style={sectionLabel}>当前使用的服务商</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PROVIDER_IDS.map(pid => {
                const p = PROVIDERS[pid];
                const hasKey = Boolean(keys[pid]);
                const active = activeProvider === pid;
                return (
                  <button key={pid} onClick={() => setActiveProvider(pid)} disabled={!hasKey} style={providerToggle(active, hasKey)}>
                    <span>{p.emoji}</span><span>{p.label}</span>{hasKey && <span style={{ fontSize: 10, opacity: 0.7 }}>✓</span>}
                  </button>
                );
              })}
            </div>
            {!keys[activeProvider] && <div style={warningBox}>当前选中的服务商尚未配置 API Key，AI 功能将无法使用</div>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {PROVIDER_IDS.map(pid => {
              const p = PROVIDERS[pid];
              const meta = providerStyle[pid];
              const draft = drafts[pid] ?? '';
              const isSaving = saving === pid;
              const visible = showKey[pid] ?? false;
              const saved = keys[pid];
              return (
                <div key={pid} style={providerCard}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flexWrap: 'wrap' }}>
                      <span style={{ ...providerLogo, background: meta.color }}>{meta.initial}</span>
                      <span style={{ fontWeight: 700, fontSize: 15, color: '#1b1a17' }}>{p.label}</span>
                      <span style={saved ? configuredBadge : unconfiguredBadge}>{saved ? '已配置' : '未配置'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => openGuide(pid)} style={tutorialLink}>API购买教程</button>
                      <span style={{ color: '#d0c8bb' }}>·</span>
                      <a href={p.keyUrl} target="_blank" rel="noopener noreferrer" style={apiKeyLink}>获取 API Key →</a>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input type={visible ? 'text' : 'password'} value={draft} onChange={e => setDrafts(prev => ({ ...prev, [pid]: e.target.value }))} placeholder={p.keyHint} style={inputStyle} />
                      <button onClick={() => setShowKey(prev => ({ ...prev, [pid]: !visible }))} style={eyeBtn}>{visible ? '🙈' : '👁️'}</button>
                    </div>
                    <button onClick={() => handleSave(pid)} disabled={isSaving || loading} style={saveBtn(isSaving)}>{isSaving ? '...' : draft.trim() ? '保存' : '清除'}</button>
                  </div>
                </div>
              );
            })}
          </div>
          {error && <div style={errorBox}>{error}</div>}
          <div style={{ marginTop: 16, fontSize: 12, color: '#a39d90', lineHeight: 1.7 }}>💡 API Key 存储在你的 Supabase 账号数据中，并受 RLS 行级权限保护。每次 AI 调用都使用你配置的 Key，不消耗系统资源。</div>
        </div>
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <button onClick={openModal} className="btn-press sidebar-bottom-button" title="AI 模型设置" style={settingsBtn}>
        <IconSettings size={17} />AI 设置
      </button>
      {modal}
      {guideModal}
    </>
  );
}

function ChoiceCard({ icon, title, button, variant, onClick, children }: { icon: string; title: string; button: string; variant: 'outline' | 'solid'; onClick: () => void; children: string }) {
  return (
    <div style={choiceCard}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: variant === 'solid' ? '#e6f4df' : '#f7eadc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{icon}</div>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: '#1b1a17' }}>{title}</div>
      </div>
      <p style={{ fontSize: 12.5, color: '#6b665c', lineHeight: 1.65, margin: '0 0 14px' }}>{children}</p>
      <button onClick={onClick} style={variant === 'solid' ? choicePrimaryBtn : choiceOutlineBtn}>{button}</button>
    </div>
  );
}

function TimelineStep({ index, title, body, button, href, onClick, solid = false, done = false }: { index: number; title: string; body: string; button: string; href?: string; onClick?: () => void; solid?: boolean; done?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: done ? 0 : 4 }}>
      <div style={{ flex: 'none', width: 22, height: 22, borderRadius: '50%', background: done ? '#4d8b61' : '#1b1a17', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{index}</div>
      <div style={done ? { flex: 1, paddingLeft: 10 } : { flex: 1, paddingBottom: 16, borderLeft: '2px solid #eee7dc', marginLeft: -23, paddingLeft: 23 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1b1a17', marginBottom: 3 }}>{title}</div>
        <p style={{ fontSize: 12, color: '#6b665c', margin: '0 0 10px', lineHeight: 1.6 }}>{body}</p>
        {href ? <a href={href} target="_blank" rel="noopener noreferrer" style={solid ? smallSolidLink : smallOutlineLink}>{button}</a> : <button onClick={onClick} style={completeBtn}>{button}</button>}
      </div>
    </div>
  );
}

function PriceCard({ title, price, suffix, recommended = false, children }: { title: string; price: string; suffix: string; recommended?: boolean; children: string }) {
  return (
    <div style={{ flex: '1 1 180px', border: recommended ? '1px solid #b87345' : '1px solid #e4ddcf', borderRadius: 14, padding: 14, background: recommended ? '#fff5e9' : '#fffdf8' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1b1a17' }}>{title}</div>
        {recommended && <span style={{ fontSize: 9.5, fontWeight: 700, background: '#b87345', color: '#fff', padding: '2px 6px', borderRadius: 999 }}>推荐</span>}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#1b1a17', marginBottom: 8 }}>{price} <span style={{ fontSize: 11, fontWeight: 500, color: '#8a8478' }}>{suffix}</span></div>
      <p style={{ fontSize: 11.5, lineHeight: 1.6, color: '#6b665c', margin: 0 }}>{children}</p>
    </div>
  );
}

const overlay = (zIndex: number): React.CSSProperties => ({
  position: 'fixed', inset: 0, zIndex,
  background: 'rgba(40,30,25,0.40)',
  backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '24px 16px', animation: 'fadeIn .2s ease',
});

const mainShell: React.CSSProperties = { width: '100%', maxWidth: 560, maxHeight: 'calc(100vh - 80px)', background: 'rgba(255,253,250,0.99)', border: '1px solid rgba(255,255,255,0.6)', borderRadius: 26, boxShadow: '0 30px 80px rgba(120,40,70,.22)', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'popIn .26s ease both' };
const guideShell: React.CSSProperties = { width: '100%', maxHeight: 'calc(100vh - 70px)', background: '#fffdf8', border: '1px solid rgba(255,255,255,0.72)', borderRadius: 22, boxShadow: '0 30px 60px -25px rgba(20,15,10,.42)', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'popIn .24s ease both' };
const mainHeader: React.CSSProperties = { padding: '18px 22px 14px', borderBottom: '1px solid #f0ebe0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 };
const guideHeader: React.CSSProperties = { padding: '26px 26px 8px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexShrink: 0 };
const guideSub: React.CSSProperties = { fontSize: 12.5, color: '#8a8478', margin: '8px 0 0' };
const sectionLabel: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#6b665c', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' };
const settingsBtn: React.CSSProperties = { width: '100%', display: 'flex', alignItems: 'center', gap: 10, height: 46, padding: '0 14px', border: '1px solid #e0d8c9', background: '#fffdf8', borderRadius: 14, fontSize: 14, fontWeight: 600, color: '#4a463e', cursor: 'pointer', marginTop: 0, whiteSpace: 'nowrap' };
const iconBtn: React.CSSProperties = { width: 34, height: 34, borderRadius: 10, border: '1px solid #e4ddcf', background: '#faf7f0', color: '#8a8478', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 };
const backBtn: React.CSSProperties = { width: 26, height: 26, border: 'none', background: 'transparent', color: '#8a8478', cursor: 'pointer', fontSize: 15, padding: 0, flex: 'none' };
const providerCard: React.CSSProperties = { background: '#fffdf8', border: '1px solid #eee4d5', borderRadius: 18, padding: '20px 22px' };
const providerLogo: React.CSSProperties = { width: 28, height: 28, borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' };
const configuredBadge: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: '#e2f2dc', color: '#3f7a51' };
const unconfiguredBadge: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: '#f0ece4', color: '#8a8478' };
const tutorialLink: React.CSSProperties = { border: 'none', background: 'transparent', color: '#7f796f', fontSize: 12.5, fontWeight: 500, textDecoration: 'none', cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' };
const apiKeyLink: React.CSSProperties = { color: '#b36a3a', fontSize: 12.5, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' };
const inputStyle: React.CSSProperties = { width: '100%', height: 40, borderRadius: 10, border: '1.5px solid #e0d8c9', background: '#fff', padding: '0 38px 0 12px', fontSize: 13, outline: 'none', color: '#1b1a17', fontFamily: 'monospace', boxSizing: 'border-box' };
const eyeBtn: React.CSSProperties = { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#a39d90', fontSize: 14, padding: 2 };
const choiceCard: React.CSSProperties = { display: 'block', color: 'inherit', border: '1px solid #e4ddcf', borderRadius: 16, padding: 18, background: '#fffdf8' };
const choicePrimaryBtn: React.CSSProperties = { width: '100%', height: 38, border: 'none', borderRadius: 10, background: '#1b1a17', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' };
const choiceOutlineBtn: React.CSSProperties = { width: '100%', height: 38, border: '1px solid #1b1a17', borderRadius: 10, background: 'transparent', color: '#1b1a17', fontSize: 13, fontWeight: 700, cursor: 'pointer' };
const smallSolidLink: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', height: 34, padding: '0 14px', borderRadius: 9, background: '#1b1a17', color: '#fff', fontSize: 12.5, fontWeight: 700, textDecoration: 'none' };
const smallOutlineLink: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', height: 34, padding: '0 14px', borderRadius: 9, border: '1px solid #1b1a17', color: '#1b1a17', fontSize: 12.5, fontWeight: 700, textDecoration: 'none', background: 'transparent' };
const completeBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: 34, padding: '0 14px', borderRadius: 9, border: 'none', background: '#e6f4df', color: '#2f6845', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' };
const safeNotice: React.CSSProperties = { marginTop: 20, display: 'flex', gap: 10, background: '#f4f1ea', border: '1px solid #e4ddcf', borderRadius: 12, padding: '12px 14px', fontSize: 11.5, lineHeight: 1.6, color: '#6b665c' };
const qrBlock: React.CSSProperties = { display: 'flex', gap: 16, alignItems: 'center', background: '#f7f3eb', border: '1px solid #e4ddcf', borderRadius: 16, padding: 16, marginBottom: 20 };
const qrImage: React.CSSProperties = { flex: 'none', width: 96, height: 96, objectFit: 'cover', borderRadius: 12, background: '#fff', border: '1px solid #e9e1d2' };
const qrPlaceholder: React.CSSProperties = { flex: 'none', width: 96, height: 96, borderRadius: 12, border: '1px dashed #d8d0c2', background: '#fffdf8', color: '#8a8478', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: 12, fontWeight: 700, padding: 8, boxSizing: 'border-box' };
const feeExample: React.CSSProperties = { fontSize: 11, color: '#7f796f', background: '#f7f3eb', borderRadius: 10, padding: '10px 12px', marginBottom: 16, lineHeight: 1.7 };
const warningBox: React.CSSProperties = { fontSize: 12, color: '#c0800a', background: '#fff8e0', borderRadius: 8, padding: '8px 12px', marginTop: 10 };
const errorBox: React.CSSProperties = { marginTop: 14, fontSize: 13, color: '#a23d24', background: '#fbe0d8', borderRadius: 10, padding: '10px 14px' };

const providerToggle = (active: boolean, hasKey: boolean): React.CSSProperties => ({
  height: 36, padding: '0 14px', borderRadius: 12,
  border: active ? '2px solid #1b1a17' : '1.5px solid #e0d8c9',
  background: active ? '#1b1a17' : '#faf7f0',
  color: active ? '#f4f1ea' : hasKey ? '#1b1a17' : '#c0b9ac',
  fontSize: 13, fontWeight: 600, cursor: hasKey ? 'pointer' : 'not-allowed',
  display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s',
});

const saveBtn = (saving: boolean): React.CSSProperties => ({
  width: 64, height: 40, borderRadius: 10,
  border: 'none', background: '#1b1a17', color: '#f4f1ea',
  fontSize: 13, fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
  whiteSpace: 'nowrap', flexShrink: 0,
});
