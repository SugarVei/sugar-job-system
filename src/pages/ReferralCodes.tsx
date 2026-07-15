import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Company, NewReferralCode, ReferralCode, ReferralCodeStatus } from '../types';
import { useCollection } from '../hooks/useCollection';
import { useAppShell } from '../contexts/AppShellContext';
import { useTheme } from '../contexts/ThemeContext';
import Modal from '../components/Modal';
import { Field, TextInput, TextArea, Select, PrimaryButton, GhostButton, FormError } from '../components/Field';
import EmptyState from '../components/EmptyState';
import {
  IconCheck,
  IconClock,
  IconCopy,
  IconEdit,
  IconEye,
  IconEyeOff,
  IconKey,
  IconPlus,
  IconTrash,
} from '../components/icons';
import { avatarColor, CARD, initialOf } from '../lib/appHelpers';

const EMPTY_FORM: NewReferralCode = {
  company_id: null,
  company_name: '',
  industry: '',
  position_name: '',
  city: '',
  referral_code: '',
  source: '',
  status: '可用',
  expires_at: null,
  notes: '',
};

const STATUSES: ReferralCodeStatus[] = ['可用', '即将过期', '已使用'];

const STATUS_COLORS: Record<ReferralCodeStatus, { bg: string; fg: string }> = {
  可用: { bg: '#e8f4e8', fg: '#2f8149' },
  即将过期: { bg: '#fff2dd', fg: '#a76a18' },
  已使用: { bg: '#ecebea', fg: '#6f716b' },
};

function maskCode(code: string) {
  const trimmed = code.trim();
  if (trimmed.length <= 4) return '••••';
  return `${trimmed.slice(0, 2)}••••${trimmed.slice(-2)}`;
}

function expiryText(value: string | null) {
  return value ? value.split('-').join('.') : '长期有效';
}

function safeError(error: unknown, secret = '') {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '操作失败，请稍后重试。';
  return secret ? message.split(secret).join('••••') : message;
}

export default function ReferralCodes() {
  const { items, loading, error, create, update, remove } = useCollection<ReferralCode>('referral_codes');
  const { items: companies } = useCollection<Company>('companies');
  const { query, registerAdd, setScreen } = useAppShell();
  const { theme } = useTheme();
  const [industryFilter, setIndustryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ReferralCodeStatus>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ReferralCode | null>(null);
  const [form, setForm] = useState<NewReferralCode>(EMPTY_FORM);
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

  const industries = useMemo(
    () => Array.from(new Set(items.map((item) => item.industry?.trim()).filter(Boolean) as string[])).sort(),
    [items],
  );

  const stats = useMemo(() => ({
    total: items.length,
    available: items.filter((item) => item.status === '可用').length,
    expiring: items.filter((item) => item.status === '即将过期').length,
    used: items.filter((item) => item.status === '已使用').length,
    companies: new Set(items.map((item) => item.company_name.trim()).filter(Boolean)).size,
  }), [items]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (industryFilter !== 'all' && item.industry !== industryFilter) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (!needle) return true;
      return [
        item.company_name,
        item.position_name,
        item.city,
        item.industry,
        item.source,
        item.notes,
        item.referral_code,
      ].filter(Boolean).some((value) => (value as string).toLowerCase().includes(needle));
    });
  }, [industryFilter, items, query, statusFilter]);

  const openEdit = (item: ReferralCode) => {
    setEditing(item);
    setForm({
      company_id: item.company_id,
      company_name: item.company_name,
      industry: item.industry ?? '',
      position_name: item.position_name,
      city: item.city ?? '',
      referral_code: '',
      source: item.source ?? '',
      status: item.status,
      expires_at: item.expires_at,
      notes: item.notes ?? '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const selectCompany = (companyId: string) => {
    if (!companyId) {
      setForm((current) => ({ ...current, company_id: null }));
      return;
    }
    const company = companies.find((item) => item.id === companyId);
    if (!company) return;
    setForm((current) => ({
      ...current,
      company_id: company.id,
      company_name: company.company_name,
      industry: company.industry ?? '',
      city: company.city ?? '',
    }));
  };

  const save = async () => {
    const companyName = form.company_name.trim();
    const positionName = form.position_name.trim();
    const referralCode = form.referral_code.trim() || editing?.referral_code.trim() || '';
    if (!companyName || !positionName || !referralCode) {
      setFormError('请填写公司名称、内推岗位和内推码。');
      setScrollSignal((value) => value + 1);
      setTimeout(() => firstRequiredRef.current?.focus(), 320);
      return;
    }

    const payload: NewReferralCode = {
      ...form,
      company_name: companyName,
      position_name: positionName,
      referral_code: referralCode,
      industry: form.industry?.trim() || null,
      city: form.city?.trim() || null,
      source: form.source?.trim() || null,
      expires_at: form.expires_at || null,
      notes: form.notes?.trim() || null,
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

  const statCards = [
    { label: '内推码总数', value: stats.total, note: `覆盖 ${stats.companies} 家目标公司`, Icon: IconKey },
    { label: '当前可用', value: stats.available, note: '可直接用于投递', Icon: IconCheck },
    { label: '即将过期', value: stats.expiring, note: '建议及时确认有效性', Icon: IconClock },
    { label: '已使用', value: stats.used, note: '保留历史投递记录', Icon: IconCopy },
  ];

  return (
    <div className="flex flex-col gap-[18px] animate-rise">
      <div className="flex flex-wrap gap-2" aria-label="公司库与内推码管理页面切换">
        <button onClick={() => setScreen('companies')} className="btn-press" style={pageTab(false)}>公司库</button>
        <button className="btn-press" style={pageTab(true)} aria-current="page">内推码管理</button>
      </div>

      {error ? <FormError message={error} /> : null}

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4" aria-label="内推码统计">
        {statCards.map(({ label, value, note, Icon }) => (
          <article key={label} style={{ ...CARD, padding: '18px 20px', borderRadius: 20, minWidth: 0 }}>
            <div className="flex items-center justify-between gap-2" style={{ color: '#6f716b', fontSize: 13 }}>
              <span>{label}</span>
              <Icon size={17} color={theme.accent} />
            </div>
            <strong className="text-[25px] sm:text-[30px]" style={{ display: 'block', marginTop: 10, lineHeight: 1 }}>{value}</strong>
            <small style={{ color: '#8b8a82', display: 'block', marginTop: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{note}</small>
          </article>
        ))}
      </section>

      <section className="flex flex-col lg:flex-row lg:items-center gap-3 p-4" style={{ ...CARD, borderRadius: 20 }} aria-label="筛选内推码">
        <Select value={industryFilter} onChange={(event) => setIndustryFilter(event.target.value)} aria-label="按行业筛选内推码" style={{ flex: 1 }}>
          <option value="all">全部行业</option>
          {industries.map((industry) => <option key={industry} value={industry}>{industry}</option>)}
        </Select>
        <div className="flex gap-1 overflow-x-auto" style={{ padding: 5, borderRadius: 13, background: '#f0eee8' }} aria-label="按状态筛选内推码">
          {(['all', ...STATUSES] as const).map((status) => {
            const active = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                aria-pressed={active}
                className="btn-press"
                style={segmentButton(active)}
              >
                {status === 'all' ? '全部' : status}
              </button>
            );
          })}
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
            const statusColor = STATUS_COLORS[item.status];
            const revealed = revealedIds.has(item.id);
            return (
              <article key={item.id} className="card-hover flex flex-col" style={{ ...CARD, padding: 20, minHeight: 286 }}>
                <div className="flex items-start gap-3">
                  <div style={{ ...avatarStyle, background: color.bg, color: color.fg }}>{initialOf(item.company_name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h2 style={{ margin: '2px 0 5px', fontSize: 17, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.company_name}</h2>
                    <p style={{ margin: 0, color: '#8b8a82', fontSize: 13, lineHeight: 1.45 }}>{item.position_name}{item.city ? ` · ${item.city}` : ''}</p>
                  </div>
                  <span style={{ background: statusColor.bg, color: statusColor.fg, borderRadius: 999, padding: '6px 9px', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>{item.status}</span>
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

                <div className="grid gap-2" style={{ color: '#686960', fontSize: 13 }}>
                  <MetaRow label="行业" value={item.industry || '未记录'} />
                  <MetaRow label="来源" value={item.source || '未记录'} />
                  <MetaRow label="有效期" value={expiryText(item.expires_at)} />
                </div>
                {item.notes ? <p style={{ color: '#8b8a82', fontSize: 12.5, lineHeight: 1.5, margin: '12px 0 0', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.notes}</p> : null}

                <div className="flex flex-wrap gap-2 mt-auto pt-4">
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
        maxWidth={680}
        scrollTopSignal={scrollSignal}
        footer={
          <>
            <GhostButton onClick={() => setModalOpen(false)} disabled={saving}>取消</GhostButton>
            <PrimaryButton accent={theme.accent} onClick={save} disabled={saving}>{saving ? '保存中...' : '保存'}</PrimaryButton>
          </>
        }
      >
        <FormError message={formError} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
          <Field label="公司名称 *">
            <TextInput ref={firstRequiredRef} value={form.company_name} onChange={(event) => setForm({ ...form, company_name: event.target.value })} aria-label="公司名称" />
          </Field>
          <Field label="关联公司">
            <Select value={form.company_id ?? ''} onChange={(event) => selectCompany(event.target.value)} aria-label="关联公司">
              <option value="">不关联，手动填写</option>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.company_name}</option>)}
            </Select>
          </Field>
          <Field label="行业">
            <TextInput value={form.industry ?? ''} onChange={(event) => setForm({ ...form, industry: event.target.value })} aria-label="行业" />
          </Field>
          <Field label="内推岗位 *">
            <TextInput value={form.position_name} onChange={(event) => setForm({ ...form, position_name: event.target.value })} aria-label="内推岗位" />
          </Field>
          <Field label="工作地点">
            <TextInput value={form.city ?? ''} onChange={(event) => setForm({ ...form, city: event.target.value })} aria-label="工作地点" />
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
          <Field label="状态">
            <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ReferralCodeStatus })} aria-label="内推码状态">
              {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </Select>
          </Field>
          <Field label="来源">
            <TextInput value={form.source ?? ''} onChange={(event) => setForm({ ...form, source: event.target.value })} placeholder="员工、校友、公众号等" aria-label="来源" />
          </Field>
          <Field label="有效期">
            <TextInput type="date" value={form.expires_at ?? ''} onChange={(event) => setForm({ ...form, expires_at: event.target.value || null })} aria-label="有效期" />
          </Field>
        </div>
        <Field label="备注">
          <TextArea value={form.notes ?? ''} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="记录使用规则、联系人或适用批次" aria-label="备注" />
        </Field>
      </Modal>

      <div role="status" aria-live="polite" style={{ ...toastStyle, opacity: toast ? 1 : 0, transform: toast ? 'translateY(0)' : 'translateY(12px)' }}>{toast}</div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3"><span style={{ color: '#9a9991' }}>{label}</span><strong style={{ textAlign: 'right' }}>{value}</strong></div>;
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

function segmentButton(active: boolean): React.CSSProperties {
  return {
    border: 0,
    padding: '8px 12px',
    borderRadius: 9,
    background: active ? '#fff' : 'transparent',
    color: active ? '#1b1a17' : '#7b7b74',
    boxShadow: active ? '0 4px 10px rgba(0,0,0,.06)' : 'none',
    whiteSpace: 'nowrap',
    fontSize: 13,
    fontWeight: 700,
  };
}

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
  margin: '18px 0 14px',
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
