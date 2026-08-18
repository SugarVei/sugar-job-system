import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NewReferralCode, ReferralCode } from '../types';
import { useCollection } from '../hooks/useCollection';
import { useAppShell } from '../contexts/AppShellContext';
import { useTheme } from '../contexts/ThemeContext';
import Modal from '../components/Modal';
import { Field, TextInput, PrimaryButton, GhostButton, FormError } from '../components/Field';
import EmptyState from '../components/EmptyState';
import {
  IconCopy,
  IconEdit,
  IconEye,
  IconEyeOff,
  IconKey,
  IconPlus,
  IconTrash,
} from '../components/icons';
import { avatarColor, CARD, initialOf } from '../lib/appHelpers';

interface ReferralCodeForm {
  company_name: string;
  referral_code: string;
  referrer_name: string;
}

const EMPTY_FORM: ReferralCodeForm = {
  company_name: '',
  referral_code: '',
  referrer_name: '',
};

function maskCode(code: string) {
  const trimmed = code.trim();
  if (trimmed.length <= 4) return '••••';
  return `${trimmed.slice(0, 2)}••••${trimmed.slice(-2)}`;
}

function safeError(error: unknown, secret = '') {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '操作失败，请稍后重试。';
  return secret ? message.split(secret).join('••••') : message;
}

export default function ReferralCodes() {
  const { items, loading, error, create, update, remove } = useCollection<ReferralCode>('referral_codes');
  const { query, registerAdd, setScreen } = useAppShell();
  const { theme } = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ReferralCode | null>(null);
  const [form, setForm] = useState<ReferralCodeForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [scrollSignal, setScrollSignal] = useState(0);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(() => new Set());
  const [toast, setToast] = useState('');
  const firstRequiredRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 2200);
  }, []);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setFormError('');
    setModalOpen(true);
  }, []);

  useEffect(() => {
    registerAdd(openCreate);
    return () => registerAdd(null);
  }, [openCreate, registerAdd]);

  const companyCount = useMemo(
    () => new Set(items.map((item) => item.company_name.trim()).filter(Boolean)).size,
    [items],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => [item.company_name, item.referrer_name, item.referral_code]
      .filter(Boolean)
      .some((value) => (value as string).toLowerCase().includes(needle)));
  }, [items, query]);

  const openEdit = (item: ReferralCode) => {
    setEditing(item);
    setForm({
      company_name: item.company_name,
      referral_code: '',
      referrer_name: item.referrer_name ?? '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const save = async () => {
    const companyName = form.company_name.trim();
    const referrerName = form.referrer_name.trim();
    const referralCode = form.referral_code.trim() || editing?.referral_code.trim() || '';
    if (!companyName || !referrerName || !referralCode) {
      setFormError('请填写公司名称、推荐人姓名和内推码。');
      setScrollSignal((value) => value + 1);
      setTimeout(() => firstRequiredRef.current?.focus(), 320);
      return;
    }

    const payload: NewReferralCode = {
      company_name: companyName,
      referral_code: referralCode,
      referrer_name: referrerName,
    };

    setFormError('');
    setSaving(true);
    try {
      if (editing) await update(editing.id, payload);
      else await create(payload);
      setModalOpen(false);
      setRevealedIds((current) => {
        const next = new Set(current);
        if (editing) next.delete(editing.id);
        return next;
      });
      showToast(editing ? '内推码记录已更新' : '内推码记录已添加');
    } catch (saveError) {
      setFormError(`保存失败：${safeError(saveError, referralCode)}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (item: ReferralCode) => {
    if (!confirm(`确定删除「${item.company_name}」的内推码记录吗？`)) return;
    if (!confirm('此操作不可恢复，请再次确认删除。')) return;
    try {
      await remove(item.id);
      setRevealedIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
      showToast('内推码记录已删除');
    } catch (removeError) {
      alert(`删除失败：${safeError(removeError)}`);
    }
  };

  const toggleReveal = (id: string) => {
    setRevealedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyCode = async (code: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const input = document.createElement('textarea');
        input.value = code;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand('copy');
        input.remove();
        if (!copied) throw new Error('copy failed');
      }
      showToast('已复制，请妥善保管内推码');
    } catch {
      showToast('复制失败，请先显示后手动复制');
    }
  };

  return (
    <div className="flex flex-col gap-[18px] animate-rise">
      <div className="flex flex-wrap gap-2" aria-label="公司库与内推码管理页面切换">
        <button onClick={() => setScreen('companies')} className="btn-press" style={pageTab(false)}>公司库</button>
        <button className="btn-press" style={pageTab(true)} aria-current="page">内推码管理</button>
      </div>

      {error ? <FormError message={error} /> : null}

      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4" style={{ ...CARD, borderRadius: 20 }} aria-label="内推码概览">
        <div className="flex items-center gap-3">
          <span style={{ ...summaryIconStyle, color: theme.accent }}><IconKey size={18} /></span>
          <p style={{ margin: 0, color: '#77776f', fontSize: 14 }}>
            共 <strong style={{ color: '#1b1a17' }}>{items.length}</strong> 条内推码 · <strong style={{ color: '#1b1a17' }}>{companyCount}</strong> 家公司
          </p>
        </div>
        <PrimaryButton accent={theme.accent} onClick={openCreate} aria-label="新增内推码" style={{ height: 44 }}>
          <span className="inline-flex items-center gap-2"><IconPlus size={16} />新增内推码</span>
        </PrimaryButton>
      </section>

      {loading ? (
        <EmptyState text="加载中..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          text={items.length === 0 ? '还没有保存内推码，先添加一条记录吧' : '没有符合条件的内推码'}
          actionLabel={items.length === 0 ? '新增内推码' : undefined}
          onAction={items.length === 0 ? openCreate : undefined}
        />
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" aria-label="内推码列表">
          {filtered.map((item) => {
            const color = avatarColor(item.company_name);
            const revealed = revealedIds.has(item.id);
            return (
              <article key={item.id} className="card-hover flex flex-col" style={{ ...CARD, padding: 20, minHeight: 230 }}>
                <div className="flex items-start gap-3">
                  <div style={{ ...avatarStyle, background: color.bg, color: color.fg }}>{initialOf(item.company_name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h2 style={{ margin: '2px 0 6px', fontSize: 17, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.company_name}</h2>
                    <p style={{ margin: 0, color: '#8b8a82', fontSize: 13, lineHeight: 1.45 }}>
                      推荐人：{item.referrer_name || '未填写'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3" style={codeBoxStyle}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: '#8b8a82', marginBottom: 4 }}>内推码</div>
                    <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontWeight: 800, fontSize: 16, letterSpacing: 1, overflowWrap: 'anywhere' }}>
                      {revealed ? item.referral_code : maskCode(item.referral_code)}
                    </div>
                  </div>
                  <button onClick={() => copyCode(item.referral_code)} aria-label={`复制${item.company_name}的内推码`} className="btn-press" style={copyButtonStyle}>
                    <IconCopy size={15} />复制
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 mt-auto pt-2">
                  <button onClick={() => toggleReveal(item.id)} aria-label={revealed ? '隐藏内推码' : '显示内推码'} className="btn-press" style={actionButtonStyle}>
                    {revealed ? <IconEyeOff size={15} /> : <IconEye size={15} />}{revealed ? '隐藏' : '显示'}内推码
                  </button>
                  <button onClick={() => openEdit(item)} aria-label={`编辑${item.company_name}的内推码`} className="btn-press" style={iconActionStyle}><IconEdit size={15} /></button>
                  <button onClick={() => deleteItem(item)} aria-label={`删除${item.company_name}的内推码`} className="btn-press" style={{ ...iconActionStyle, color: '#b45252' }}><IconTrash size={15} /></button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <Modal
        open={modalOpen}
        title={editing ? '编辑内推码' : '新增内推码'}
        onClose={() => !saving && setModalOpen(false)}
        maxWidth={520}
        scrollTopSignal={scrollSignal}
        footer={
          <>
            <GhostButton onClick={() => setModalOpen(false)} disabled={saving}>取消</GhostButton>
            <PrimaryButton accent={theme.accent} onClick={save} disabled={saving}>{saving ? '保存中...' : '保存'}</PrimaryButton>
          </>
        }
      >
        <FormError message={formError} />
        <Field label="公司名称 *">
          <TextInput ref={firstRequiredRef} value={form.company_name} onChange={(event) => setForm({ ...form, company_name: event.target.value })} aria-label="公司名称" />
        </Field>
        <Field label="推荐人姓名 *">
          <TextInput value={form.referrer_name} onChange={(event) => setForm({ ...form, referrer_name: event.target.value })} aria-label="推荐人姓名" />
        </Field>
        <Field label="内推码 *">
          <TextInput
            type="password"
            autoComplete="off"
            value={form.referral_code}
            onChange={(event) => setForm({ ...form, referral_code: event.target.value })}
            placeholder={editing ? '留空表示不修改' : undefined}
            aria-label="内推码"
          />
        </Field>
      </Modal>

      <div role="status" aria-live="polite" style={{ ...toastStyle, opacity: toast ? 1 : 0, transform: toast ? 'translateY(0)' : 'translateY(12px)' }}>{toast}</div>
    </div>
  );
}

function pageTab(active: boolean): React.CSSProperties {
  return {
    border: active ? '1px solid #1b1a17' : '1px solid rgba(255,255,255,.75)',
    background: active ? '#1b1a17' : 'rgba(255,255,255,.55)',
    color: active ? '#fff' : '#6f716b',
    padding: '10px 16px',
    borderRadius: 14,
    fontWeight: 700,
    boxShadow: '0 6px 18px rgba(58,75,49,.05)',
  };
}

const summaryIconStyle: React.CSSProperties = {
  width: 38,
  height: 38,
  display: 'grid',
  placeItems: 'center',
  flex: 'none',
  borderRadius: 12,
  background: '#f5f1e8',
};

const avatarStyle: React.CSSProperties = {
  width: 46,
  height: 46,
  display: 'grid',
  placeItems: 'center',
  flex: '0 0 auto',
  borderRadius: 14,
  fontWeight: 800,
  fontSize: 18,
};

const codeBoxStyle: React.CSSProperties = {
  margin: '18px 0 12px',
  padding: '13px 14px',
  border: '1px dashed #cfc8bb',
  borderRadius: 14,
  background: '#f9f6ef',
};

const copyButtonStyle: React.CSSProperties = {
  border: '1px solid #e7e0d6',
  background: '#fff',
  padding: '8px 10px',
  borderRadius: 10,
  fontWeight: 700,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  flex: 'none',
};

const actionButtonStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 128,
  border: '1px solid #e7e0d6',
  background: '#fbfaf6',
  color: '#55564f',
  padding: '9px 11px',
  borderRadius: 11,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  fontSize: 13,
  fontWeight: 700,
};

const iconActionStyle: React.CSSProperties = {
  width: 38,
  height: 38,
  border: '1px solid #e7e0d6',
  background: '#fbfaf6',
  color: '#55564f',
  borderRadius: 11,
  display: 'grid',
  placeItems: 'center',
  flex: 'none',
};

const toastStyle: React.CSSProperties = {
  position: 'fixed',
  right: 26,
  bottom: 26,
  zIndex: 120,
  maxWidth: 'calc(100vw - 32px)',
  padding: '12px 16px',
  color: '#fff',
  background: '#1b1a17',
  borderRadius: 12,
  pointerEvents: 'none',
  transition: '.2s ease',
  fontSize: 13,
  fontWeight: 600,
};
