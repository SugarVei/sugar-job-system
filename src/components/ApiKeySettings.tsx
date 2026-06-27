import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useApiKeys } from '../contexts/ApiKeysContext';
import { PROVIDERS, type ProviderId } from '../lib/providers';
import { IconSettings } from './icons';

const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];

export default function ApiKeySettings() {
  const [open, setOpen] = useState(false);
  const { keys, loading, activeProvider, setActiveProvider, saveKey, removeKey } = useApiKeys();
  const [drafts, setDrafts] = useState<Partial<Record<ProviderId, string>>>({});
  const [saving, setSaving] = useState<ProviderId | null>(null);
  const [showKey, setShowKey] = useState<Partial<Record<ProviderId, boolean>>>({});
  const [error, setError] = useState('');

  const openModal = () => {
    // 打开时用已存 key 填充草稿
    const init: Partial<Record<ProviderId, string>> = {};
    for (const p of PROVIDER_IDS) init[p] = keys[p] ?? '';
    setDrafts(init);
    setError('');
    setOpen(true);
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
          width: '100%', maxWidth: 520,
          maxHeight: 'calc(100vh - 80px)',
          background: 'rgba(255,253,250,0.99)',
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.6)',
          borderRadius: 26, boxShadow: '0 30px 80px rgba(120,40,70,.22)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'popIn .26s ease both',
        }}
      >
        {/* Header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #f0ebe0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 20 }}>🔑</span>
            <div>
              <div style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: 15, color: '#1b1a17' }}>AI 模型设置</div>
              <div style={{ fontSize: 11.5, color: '#a39d90', marginTop: 1 }}>配置你自己的 API Key，调用不同 AI 服务商</div>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid #e4ddcf', background: '#faf7f0', color: '#8a8478', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px 22px' }}>
          {/* 当前使用的服务商 */}
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

          {/* 各 provider 的 key 输入 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {PROVIDER_IDS.map(pid => {
              const p = PROVIDERS[pid];
              const draft = drafts[pid] ?? '';
              const isSaving = saving === pid;
              const visible = showKey[pid] ?? false;
              const saved = keys[pid];
              return (
                <div key={pid} style={{ background: '#faf7f0', borderRadius: 14, padding: '14px 16px', border: '1px solid #f0ebe0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontSize: 16 }}>{p.emoji}</span>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#1b1a17' }}>{p.label}</span>
                      {saved && <span style={{ fontSize: 10, background: '#dcebd5', color: '#2f5d36', borderRadius: 6, padding: '2px 7px', fontWeight: 700 }}>已配置</span>}
                    </div>
                    <a href={p.keyUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, color: '#7a8de0', textDecoration: 'none' }}>获取 API Key →</a>
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
                      >{visible ? '🙈' : '👁'}</button>
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
            💡 API Key 加密存储在你的账号中，只有你自己可以访问。每次 AI 调用都使用你配置的 Key，不消耗系统资源。
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
    </>
  );
}
