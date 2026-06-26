import { useEffect, useMemo, useState } from 'react';
import type { Company, NewRecord } from '../types';
import { useCollection } from '../hooks/useCollection';
import { useAppShell } from '../contexts/AppShellContext';
import { useTheme } from '../contexts/ThemeContext';
import Modal from '../components/Modal';
import { Field, TextInput, TextArea, Select, PrimaryButton, GhostButton } from '../components/Field';
import { IconEdit, IconTrash, IconPlus, IconExternalLink } from '../components/icons';
import { initialOf, avatarColor, CARD } from '../lib/appHelpers';
import EmptyState from '../components/EmptyState';

const empty: NewRecord<Company> = {
  company_name: '',
  industry: '',
  city: '',
  scale: '',
  website: '',
  notes: '',
};

export default function Companies() {
  const { items, loading, create, update, remove } = useCollection<Company>('companies');
  const { query, registerAdd } = useAppShell();
  const { theme } = useTheme();
  const [industryFilter, setIndustryFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState<NewRecord<Company>>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    registerAdd(() => openCreate());
    return () => registerAdd(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerAdd]);

  const industries = useMemo(
    () => Array.from(new Set(items.map((c) => c.industry).filter(Boolean))) as string[],
    [items],
  );

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setModalOpen(true);
  };
  const openEdit = (c: Company) => {
    setEditing(c);
    setForm({
      company_name: c.company_name,
      industry: c.industry ?? '',
      city: c.city ?? '',
      scale: c.scale ?? '',
      website: c.website ?? '',
      notes: c.notes ?? '',
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.company_name) {
      alert('请填写公司名称');
      return;
    }
    setSaving(true);
    try {
      if (editing) await update(editing.id, form);
      else await create(form);
      setModalOpen(false);
    } catch (e) {
      alert('保存失败：' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const del = async (c: Company) => {
    if (!confirm(`确定删除「${c.company_name}」吗？`)) return;
    await remove(c.id);
  };

  const filtered = useMemo(
    () =>
      items
        .filter((c) => industryFilter === 'all' || c.industry === industryFilter)
        .filter((c) => {
          if (!query) return true;
          const t = query.toLowerCase();
          return [c.company_name, c.industry, c.city, c.notes]
            .filter(Boolean)
            .some((v) => (v as string).toLowerCase().includes(t));
        }),
    [items, industryFilter, query],
  );

  return (
    <div className="flex flex-col gap-[18px] animate-rise">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 p-4" style={{ ...CARD, borderRadius: 20 }}>
        <Select value={industryFilter} onChange={(e) => setIndustryFilter(e.target.value)}>
          <option value="all">全部行业</option>
          {industries.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </Select>
        <PrimaryButton accent={theme.accent} onClick={openCreate} style={{ height: 44 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <IconPlus size={16} /> 新增公司
          </span>
        </PrimaryButton>
      </div>

      {loading ? (
        <EmptyState text="加载中…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          text={items.length === 0 ? '公司库还是空的，添加一个目标公司吧' : '没有符合条件的公司'}
          actionLabel={items.length === 0 ? '新增公司' : undefined}
          onAction={items.length === 0 ? openCreate : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const col = avatarColor(c.company_name);
            return (
              <div key={c.id} className="card-hover" style={{ ...CARD, padding: 22 }}>
                <div className="flex items-start justify-between gap-[10px]">
                  <div className="flex items-center gap-[11px]" style={{ minWidth: 0 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 13,
                        background: col.bg,
                        color: col.fg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'Poppins',
                        fontWeight: 700,
                        fontSize: 18,
                        flex: 'none',
                      }}
                    >
                      {initialOf(c.company_name)}
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
                        {c.company_name}
                      </div>
                      <div style={{ fontSize: 12, color: '#9a9488', marginTop: 2 }}>
                        {[c.industry, c.scale, c.city].filter(Boolean).join(' · ') || '—'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-none">
                    <button onClick={() => openEdit(c)} aria-label="编辑" className="btn-press" style={miniBtn}>
                      <IconEdit size={14} />
                    </button>
                    <button onClick={() => del(c)} aria-label="删除" className="btn-press" style={miniBtn}>
                      <IconTrash size={14} />
                    </button>
                  </div>
                </div>

                {c.notes && (
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: '#8a8478', margin: '14px 0 12px' }}>{c.notes}</p>
                )}
                {c.website && (
                  <a
                    href={c.website}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: theme.accent,
                      marginTop: c.notes ? 0 : 14,
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
        footer={
          <>
            <GhostButton onClick={() => setModalOpen(false)}>取消</GhostButton>
            <PrimaryButton accent={theme.accent} onClick={save} disabled={saving}>
              {saving ? '保存中…' : '保存'}
            </PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
          <Field label="公司名称 *">
            <TextInput value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
          </Field>
          <Field label="行业">
            <TextInput value={form.industry ?? ''} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="如 互联网" />
          </Field>
          <Field label="城市">
            <TextInput value={form.city ?? ''} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </Field>
          <Field label="公司规模">
            <TextInput value={form.scale ?? ''} onChange={(e) => setForm({ ...form, scale: e.target.value })} placeholder="如 1000-5000 人" />
          </Field>
        </div>
        <Field label="官网 / 招聘链接">
          <TextInput value={form.website ?? ''} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" />
        </Field>
        <Field label="备注">
          <TextArea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
