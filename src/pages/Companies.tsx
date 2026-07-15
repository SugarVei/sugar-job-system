import { useEffect, useMemo, useRef, useState } from 'react';
import type { Company, NewRecord } from '../types';
import { useCollection } from '../hooks/useCollection';
import { useAppShell } from '../contexts/AppShellContext';
import { useTheme } from '../contexts/ThemeContext';
import Modal from '../components/Modal';
import { Field, TextInput, TextArea, Select, PrimaryButton, GhostButton, FormError } from '../components/Field';
import { IconEdit, IconTrash, IconPlus, IconExternalLink } from '../components/icons';
import { initialOf, avatarColor, CARD } from '../lib/appHelpers';
import EmptyState from '../components/EmptyState';
import AIChatDialog from '../components/AIChatDialog';

const empty: NewRecord<Company> = {
  company_name: '',
  industry: '',
  city: '',
  scale: '',
  website: '',
  notes: '',
};

function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export default function Companies() {
  const { items, loading, error: companiesError, create, update, remove } = useCollection<Company>('companies');
  const { query, registerAdd, setScreen } = useAppShell();
  const { theme } = useTheme();
  const [industryFilter, setIndustryFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState<NewRecord<Company>>(empty);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [scrollSig, setScrollSig] = useState(0);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    registerAdd(() => openCreate());
    return () => registerAdd(null);
  }, [registerAdd]);

  const industries = useMemo(
    () => Array.from(new Set(items.map((company) => company.industry).filter(Boolean))) as string[],
    [items],
  );

  const aiSystemPrompt = useMemo(() => {
    const cityMap: Record<string, number> = {};
    const indMap: Record<string, number> = {};
    items.forEach(c => {
      if (c.city) cityMap[c.city] = (cityMap[c.city] ?? 0) + 1;
      if (c.industry) indMap[c.industry] = (indMap[c.industry] ?? 0) + 1;
    });
    const topCity = Object.entries(cityMap).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>`${k}(${v})`).join('、');
    const topInd = Object.entries(indMap).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>`${k}(${v})`).join('、');
    return `你是一名专业的求职顾问。用户的公司库数据如下：
共 ${items.length} 家公司，主要城市：${topCity || '未记录'}，行业分布：${topInd || '未记录'}。
请根据这些信息帮用户分析目标公司的倾向、地域集中度、行业匹配度，并给出具体建议。回答要简洁、实用。`;
  }, [items]);

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (company: Company) => {
    setEditing(company);
    setForm({
      company_name: company.company_name,
      industry: company.industry ?? '',
      city: company.city ?? '',
      scale: company.scale ?? '',
      website: company.website ?? '',
      notes: company.notes ?? '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.company_name.trim()) {
      setFormError('「公司名称」为必填项，请补全后再保存。');
      setScrollSig((n) => n + 1);
      setTimeout(() => nameRef.current?.focus(), 320);
      return;
    }

    setFormError('');
    setSaving(true);
    try {
      if (editing) await update(editing.id, form);
      else await create(form);
      setModalOpen(false);
    } catch (error) {
      setFormError('保存失败：' + errorText(error));
    } finally {
      setSaving(false);
    }
  };

  const del = async (company: Company) => {
    if (!confirm(`确定删除「${company.company_name}」吗？`)) return;
    try {
      await remove(company.id);
    } catch (error) {
      alert('删除失败：' + errorText(error));
    }
  };

  const filtered = useMemo(
    () =>
      items
        .filter((company) => industryFilter === 'all' || company.industry === industryFilter)
        .filter((company) => {
          if (!query) return true;
          const text = query.toLowerCase();
          return [company.company_name, company.industry, company.city, company.notes]
            .filter(Boolean)
            .some((value) => (value as string).toLowerCase().includes(text));
        }),
    [items, industryFilter, query],
  );

  return (
    <div className="flex flex-col gap-[18px] animate-rise">
      {companiesError && <FormError message={companiesError} />}

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 p-4" style={{ ...CARD, borderRadius: 20 }}>
        <Select value={industryFilter} onChange={(event) => setIndustryFilter(event.target.value)} style={{ flex: 1 }} aria-label="按行业筛选公司">
          <option value="all">全部行业</option>
          {industries.map((industry) => (
            <option key={industry} value={industry}>
              {industry}
            </option>
          ))}
        </Select>
        <div className="flex flex-wrap gap-3">
          {items.length > 0 && (
            <AIChatDialog
              systemPrompt={aiSystemPrompt}
              placeholder="问我关于你的目标公司分析…"
              buttonLabel="🤖 AI 分析"
            />
          )}
          <GhostButton onClick={() => setScreen('referralCodes')} aria-label="进入内推码管理" style={{ height: 44 }}>
            内推码管理
          </GhostButton>
          <PrimaryButton accent={theme.accent} onClick={openCreate} style={{ height: 44 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <IconPlus size={16} /> 新增公司
            </span>
          </PrimaryButton>
        </div>
      </div>

      {loading ? (
        <EmptyState text="加载中..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          text={items.length === 0 ? '公司库还是空的，添加一个目标公司吧' : '没有符合条件的公司'}
          actionLabel={items.length === 0 ? '新增公司' : undefined}
          onAction={items.length === 0 ? openCreate : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((company) => {
            const color = avatarColor(company.company_name);
            return (
              <div key={company.id} className="card-hover" style={{ ...CARD, padding: 22 }}>
                <div className="flex items-start justify-between gap-[10px]">
                  <div className="flex items-center gap-[11px]" style={{ minWidth: 0 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 13,
                        background: color.bg,
                        color: color.fg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'Poppins',
                        fontWeight: 700,
                        fontSize: 18,
                        flex: 'none',
                      }}
                    >
                      {initialOf(company.company_name)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: 'Poppins',
                          fontSize: 16,
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {company.company_name}
                      </div>
                      <div style={{ fontSize: 12, color: '#9a9488', marginTop: 2 }}>
                        {[company.industry, company.scale, company.city].filter(Boolean).join(' · ') || '-'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-none">
                    <button onClick={() => openEdit(company)} aria-label="编辑" className="btn-press" style={miniBtn}>
                      <IconEdit size={14} />
                    </button>
                    <button onClick={() => del(company)} aria-label="删除" className="btn-press" style={miniBtn}>
                      <IconTrash size={14} />
                    </button>
                  </div>
                </div>

                {company.notes && (
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: '#8a8478', margin: '14px 0 12px' }}>{company.notes}</p>
                )}
                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: theme.accent,
                      marginTop: company.notes ? 0 : 14,
                    }}
                  >
                    官网 / 招聘链接 <IconExternalLink size={12} />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editing ? '编辑公司' : '新增公司'}
        onClose={() => setModalOpen(false)}
        scrollTopSignal={scrollSig}
        footer={
          <>
            <GhostButton onClick={() => setModalOpen(false)}>取消</GhostButton>
            <PrimaryButton accent={theme.accent} onClick={save} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </PrimaryButton>
          </>
        }
      >
        <FormError message={formError} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
          <Field label="公司名称 *">
            <TextInput
              ref={nameRef}
              value={form.company_name}
              onChange={(event) => setForm({ ...form, company_name: event.target.value })}
              style={!form.company_name.trim() && formError ? { borderColor: '#f0613f', background: '#fff' } : undefined}
            />
          </Field>
          <Field label="行业">
            <TextInput value={form.industry ?? ''} onChange={(event) => setForm({ ...form, industry: event.target.value })} placeholder="如：互联网" />
          </Field>
          <Field label="城市">
            <TextInput value={form.city ?? ''} onChange={(event) => setForm({ ...form, city: event.target.value })} />
          </Field>
          <Field label="公司规模">
            <TextInput value={form.scale ?? ''} onChange={(event) => setForm({ ...form, scale: event.target.value })} placeholder="如：1000-5000 人" />
          </Field>
        </div>
        <Field label="官网 / 招聘链接">
          <TextInput value={form.website ?? ''} onChange={(event) => setForm({ ...form, website: event.target.value })} placeholder="https://" />
        </Field>
        <Field label="备注">
          <TextArea value={form.notes ?? ''} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        </Field>
      </Modal>
    </div>
  );
}

const miniBtn: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 10,
  border: '1px solid #e4ddcf',
  background: '#faf7f0',
  color: '#8a8478',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};
