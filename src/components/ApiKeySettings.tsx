import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useApiKeys } from '../contexts/ApiKeysContext';
import { PROVIDERS, type ProviderId } from '../lib/providers';
import { IconSettings } from './icons';

const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];
type GuideMode = 'choice' | 'self' | 'help';

export default function ApiKeySettings() {
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
    const init: Partial<Record<ProviderId, string>> = {};
    for (const p of PROVIDER_IDS) init[p] = keys[p] ?? '';
    setDrafts(init);
    setError('');
    setOpen(true);
  };

  const closeGuide = () => {
    setGuideOpen(false);
    setSelectedGuideProvider(null);
    setGuideMode('choice');
    setQrMissing(false);
  };

  const openGuide = (provider: ProviderId) => {
    setSelectedGuideProvider(provider);
    setGuideMode('choice');
    setQrMissing(false);
    setGuideOpen(true);
  };

  const handleSave = async (provider: ProviderId) => {
    const key = (drafts[provider] ?? '').trim();
    setSaving(provider);
    setError('');
    try {
      if (key) {
        await saveKey(provider, key);
      } else {
        await removeKey(provider);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(null);
    }
  };

  const guideProvider = selectedGuideProvider ? PROVIDERS[selectedGuideProvider] : null;

  const guideModal = guideOpen && selectedGuideProvider && guideProvider ? createPortal(
    <div
      onClick={closeGuide}
      style={{
        position: 'fixed', inset: 0, zIndex: 520,
        background: 'rgba(40,30,25,0.42)',
        backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px', animation: 'fadeIn .2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 520,
          maxHeight: 'calc(100vh - 70px)',
          background: 'rgba(255,253,250,0.99)',
          border: '1px solid rgba(255,255,255,0.7)',
          borderRadius: 24,
          boxShadow: '0 28px 72px rgba(80,45,35,.24)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'popIn .24s ease both',
        }}
      >
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #f0ebe0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: 15.5, color: '#1b1a17' }}>
              {guideMode === 'choice' ? `你想怎么完成 ${guideProvider.label} API 购买？` : guideMode === 'self' ? `${guideProvider.label} 自助购买流程` : 'API 配置指导服务'}
            </div>
            <div style={{ fontSize: 11.5, color: '#a39d90', marginTop: 3 }}>{guideProvider.guideDesc}</div>
          </div>
          <button onClick={closeGuide} style={iconBtn}>×</button>
        </div>

        <div className="scrolly" style={{ flex: 1, overflowY: 'auto', padding: '18px 22px 22px' }}>
          {guideMode === 'choice' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
              <GuideChoiceCard
                title="需要人工协助"
                body="适合不知道怎么注册、充值、创建 API Key、导入系统的用户。站长会通过微信指导你完成官方充值和 API Key 配置。"
                button="联系站长协助配置"
                onClick={() => setGuideMode('help')}
              />
              <GuideChoiceCard
                title="查看自助教程"
                body="适合愿意自己操作的用户。系统会提供官方充值入口、API Key 创建入口和完整步骤。"
                button="打开自助教程"
                onClick={() => setGuideMode('self')}
              />
            </div>
          )}

          {guideMode === 'self' && (
            <div>
              <div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
                {[
                  '打开官方平台',
                  '注册或登录自己的账号',
                  '进入官方充值页面',
                  '按需充值',
                  '进入 API Key 页面',
                  '创建 API Key',
                  '复制 Key',
                  '回到 Sugar 系统粘贴保存',
                ].map((step, index) => (
                  <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#faf7f0', border: '1px solid #f0ebe0', borderRadius: 13 }}>
                    <span style={{ width: 24, height: 24, borderRadius: 999, background: '#1b1a17', color: '#f4f1ea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flex: 'none' }}>{index + 1}</span>
                    <span style={{ fontSize: 13.5, color: '#4a463e', fontWeight: 600 }}>{step}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                <ExternalButton href={guideProvider.officialSite}>打开官方平台</ExternalButton>
                <ExternalButton href={guideProvider.topUpUrl}>打开官方充值页面</ExternalButton>
                <ExternalButton href={guideProvider.keyUrl}>打开 API Key 创建页面</ExternalButton>
                <button onClick={closeGuide} style={primaryBtn}>返回导入 API Key</button>
                <button onClick={() => setGuideMode('choice')} style={ghostBtn}>返回选择帮助方式</button>
              </div>

              <div style={safeNote}>
                Sugar 不会要求你输入任何 AI 平台的账号密码。账号登录和充值都应在官方页面完成。
              </div>
            </div>
          )}

          {guideMode === 'help' && (
            <div>
              <div style={{ marginBottom: 16 }}>
                {qrMissing ? (
                  <div style={qrPlaceholder}>微信二维码 / 收款码占位</div>
                ) : (
                  <img
                    src="/images/wechat-pay.jpg"
                    alt="微信二维码 / 收款码"
                    onError={() => setQrMissing(true)}
                    style={{ width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 16, border: '1px dashed #d8d0c2', background: '#faf7f0', padding: 12 }}
                  />
                )}
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                <ServicePlan
                  title="基础指导：5 元/次"
                  body="指导用户找到官方充值入口、创建 API Key、导入系统。"
                />
                <ServicePlan
                  title="全流程协助：按官方充值金额的 10% 收取，最低 5 元"
                  body="从注册、充值、创建 Key 到导入 Sugar 全流程指导。"
                />
              </div>

              <div style={{ ...safeNote, marginTop: 14 }}>
                举例：准备在官方平台充值 10 元，指导服务费为 5 元；准备充值 100 元，指导服务费为 10 元。
              </div>

              <div style={{ marginTop: 14, fontSize: 12.5, color: '#6b665c', lineHeight: 1.75 }}>
                <div>1. API 额度由用户在服务商官方平台自行充值；</div>
                <div>2. 本服务只提供购买流程指导和 API Key 配置指导；</div>
                <div>3. 不收集、不保存用户的第三方平台账号密码；</div>
                <div>4. 用户需自行保管 API Key 和平台账号。</div>
              </div>

              <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
                <button onClick={() => setGuideMode('choice')} style={ghostBtn}>返回选择帮助方式</button>
                <button onClick={closeGuide} style={primaryBtn}>返回导入 API Key</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  ) : null;

  const modal = open ? createPortal(
    <div
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(40,30,25,0.38)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px', animation: 'fadeIn .2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 560,
          maxHeight: 'calc(100vh - 80px)',
          background: 'rgba(255,253,250,0.99)',
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.6)',
          borderRadius: 26, boxShadow: '0 30px 80px rgba(120,40,70,.22)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'popIn .26s ease both',
        }}
      >
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #f0ebe0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 20 }}>🔐</span>
            <div>
              <div style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: 15, color: '#1b1a17' }}>AI 模型设置</div>
              <div style={{ fontSize: 11.5, color: '#a39d90', marginTop: 1 }}>配置你自己的 API Key，调用不同 AI 服务商</div>
            </div>
          </div>
          <button onClick={() => setOpen(false)} style={iconBtn}>×</button>
        </div>

        <div className="scrolly" style={{ flex: 1, overflowY: 'auto', padding: '18px 22px 22px' }}>
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6b665c', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>当前使用的服务商</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PROVIDER_IDS.map(pid => {
                const p = PROVIDERS[pid];
                const hasKey = Boolean(keys[pid]);
                const active = activeProvider === pid;
                return (
                  <button
                    key={pid}
                    onClick={() => setActiveProvider(pid)}
                    disabled={!hasKey}
                    style={{
                      height: 36, padding: '0 14px', borderRadius: 12,
                      border: active ? '2px solid #1b1a17' : '1.5px solid #e0d8c9',
                      background: active ? '#1b1a17' : '#faf7f0',
                      color: active ? '#f4f1ea' : hasKey ? '#1b1a17' : '#c0b9ac',
                      fontSize: 13, fontWeight: 600, cursor: hasKey ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', gap: 6,
                      transition: 'all .15s',
                    }}
                  >
                    <span>{p.emoji}</span>
                    <span>{p.label}</span>
                    {hasKey && <span style={{ fontSize: 10, opacity: 0.7 }}>✓</span>}
                  </button>
                );
              })}
            </div>
            {!keys[activeProvider] && (
              <div style={{ fontSize: 12, color: '#c0800a', background: '#fff8e0', borderRadius: 8, padding: '8px 12px', marginTop: 10 }}>
                当前选中的服务商尚未配置 API Key，AI 功能将无法使用
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {PROVIDER_IDS.map(pid => {
              const p = PROVIDERS[pid];
              const draft = drafts[pid] ?? '';
              const isSaving = saving === pid;
              const visible = showKey[pid] ?? false;
              const saved = keys[pid];
              return (
                <div key={pid} style={{ background: '#faf7f0', borderRadius: 14, padding: '14px 16px', border: '1px solid #f0ebe0' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 16 }}>{p.emoji}</span>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#1b1a17' }}>{p.label}</span>
                      {saved && <span style={{ fontSize: 10, background: '#dcebd5', color: '#2f5d36', borderRadius: 6, padding: '2px 7px', fontWeight: 700 }}>已配置</span>}
                      <span style={{ fontSize: 10, background: '#ece9ff', color: '#5a4bb8', borderRadius: 6, padding: '2px 7px', fontWeight: 700 }}>{p.recommendLevel}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => openGuide(pid)} style={linkBtn}>API购买教程</button>
                      <a href={p.keyUrl} target="_blank" rel="noopener noreferrer" style={linkBtn}>获取 API Key →</a>
                    </div>
                  </div>
                  <div style={{ fontSize: 11.5, color: '#8a8478', marginBottom: 10, lineHeight: 1.55 }}>
                    {p.guideDesc} · 难度：{p.difficulty} · {p.pricingNote}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input
                        type={visible ? 'text' : 'password'}
                        value={draft}
                        onChange={e => setDrafts(prev => ({ ...prev, [pid]: e.target.value }))}
                        placeholder={p.keyHint}
                        style={{
                          width: '100%', height: 40, borderRadius: 10,
                          border: '1.5px solid #e0d8c9', background: '#fff',
                          padding: '0 38px 0 12px', fontSize: 13,
                          outline: 'none', color: '#1b1a17', fontFamily: 'monospace',
                          boxSizing: 'border-box',
                        }}
                      />
                      <button
                        onClick={() => setShowKey(prev => ({ ...prev, [pid]: !visible }))}
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#a39d90', fontSize: 14, padding: 2 }}
                      >{visible ? '🙈' : '👁️'}</button>
                    </div>
                    <button
                      onClick={() => handleSave(pid)}
                      disabled={isSaving || loading}
                      style={{
                        height: 40, padding: '0 16px', borderRadius: 10,
                        border: 'none', background: '#1b1a17', color: '#f4f1ea',
                        fontSize: 13, fontWeight: 600, cursor: isSaving ? 'wait' : 'pointer',
                        whiteSpace: 'nowrap', flexShrink: 0,
                      }}
                    >{isSaving ? '保存中…' : draft.trim() ? '保存' : '清除'}</button>
                  </div>
                </div>
              );
            })}
          </div>

          {error && (
            <div style={{ marginTop: 14, fontSize: 13, color: '#a23d24', background: '#fbe0d8', borderRadius: 10, padding: '10px 14px' }}>{error}</div>
          )}

          <div style={{ marginTop: 16, fontSize: 12, color: '#a39d90', lineHeight: 1.7 }}>
            💡 API Key 受账号权限保护存储，只有当前登录用户可以访问。所有充值和账号登录都应在服务商官方页面完成，Sugar 不会收集第三方平台账号密码。
          </div>
        </div>
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <button
        onClick={openModal}
        className="btn-press"
        title="AI 模型设置"
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          height: 44, padding: '0 14px',
          border: '1px solid #e0d8c9', background: '#fffdf8',
          borderRadius: 13, fontSize: 14, fontWeight: 600,
          color: '#4a463e', cursor: 'pointer', marginTop: 8,
        }}
      >
        <IconSettings size={17} />
        AI 设置
      </button>
      {modal}
      {guideModal}
    </>
  );
}

function GuideChoiceCard({ title, body, button, onClick }: { title: string; body: string; button: string; onClick: () => void }) {
  return (
    <div style={choiceCard}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1b1a17', marginBottom: 7 }}>{title}</div>
      <div style={{ fontSize: 12.8, color: '#6b665c', lineHeight: 1.65, marginBottom: 14 }}>{body}</div>
      <button onClick={onClick} style={primaryBtn}>{button}</button>
    </div>
  );
}

function ExternalButton({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ ...primaryBtn, textDecoration: 'none', textAlign: 'center' }}>
      {children}
    </a>
  );
}

function ServicePlan({ title, body }: { title: string; body: string }) {
  return (
    <div style={choiceCard}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#1b1a17', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12.6, color: '#6b665c', lineHeight: 1.6 }}>{body}</div>
    </div>
  );
}

const linkBtn: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: '#6f7edb',
  fontSize: 11.5,
  fontWeight: 700,
  textDecoration: 'none',
  cursor: 'pointer',
  padding: 0,
  whiteSpace: 'nowrap',
};

const iconBtn: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 10,
  border: '1px solid #e4ddcf',
  background: '#faf7f0',
  color: '#8a8478',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 18,
  flexShrink: 0,
};

const choiceCard: React.CSSProperties = {
  background: '#faf7f0',
  border: '1px solid #f0ebe0',
  borderRadius: 16,
  padding: 16,
};

const primaryBtn: React.CSSProperties = {
  width: '100%',
  minHeight: 40,
  border: 'none',
  borderRadius: 12,
  background: '#1b1a17',
  color: '#f4f1ea',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '10px 14px',
};

const ghostBtn: React.CSSProperties = {
  width: '100%',
  minHeight: 40,
  border: '1px solid #e0d8c9',
  borderRadius: 12,
  background: '#fffdf8',
  color: '#4a463e',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '10px 14px',
};

const safeNote: React.CSSProperties = {
  marginTop: 16,
  padding: '12px 14px',
  borderRadius: 13,
  background: '#fff8e0',
  color: '#7a5a12',
  fontSize: 12.5,
  lineHeight: 1.65,
};

const qrPlaceholder: React.CSSProperties = {
  width: '100%',
  minHeight: 180,
  borderRadius: 16,
  border: '1px dashed #d8d0c2',
  background: '#faf7f0',
  color: '#8a8478',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 13,
  fontWeight: 700,
};
