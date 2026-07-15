import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EvidenceItem, EvidenceRelatedType, EvidenceType, NewEvidenceItem } from '../types';
import { useCollection } from '../hooks/useCollection';
import { useAppShell } from '../contexts/AppShellContext';
import { useTheme } from '../contexts/ThemeContext';
import Modal from '../components/Modal';
import { Field, FormError, GhostButton, PrimaryButton, Select, TextArea, TextInput } from '../components/Field';
import EmptyState from '../components/EmptyState';
import { IconEdit, IconExternalLink, IconPlus, IconTrash } from '../components/icons';
import { CARD } from '../lib/appHelpers';

const evidenceTypes: EvidenceType[] = ['JD', 'Offer', 'HR沟通', '面试反馈', '薪资福利', '公司信息', '其他'];
const relatedTypes: EvidenceRelatedType[] = ['none', 'application', 'offer', 'interview', 'company', 'resume'];

const empty: NewEvidenceItem = {
  title: '',
  evidence_type: '其他',
  related_type: 'none',
  related_id: null,
  company_name: '',
  position_name: '',
  source: '',
  evidence_date: null,
  content: '',
  file_url: '',
  tags: [],
  credibility_score: null,
  notes: '',
};

function toTags(value: string) {
  return value.split(/[，,、\s]+/).map((item) => item.trim()).filter(Boolean).slice(0, 20);
}

function fromTags(value: string[] | null) {
  return (value ?? []).join('、');
}

function fmtDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString('zh-CN') : '未标注日期';
}

function safeError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export default function Evidence() {
  const db = useCollection<EvidenceItem>('evidence_items', { column: 'evidence_date', ascending: false });
  const { query, registerAdd } = useAppShell();
  const { theme } = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EvidenceItem | null>(null);
  const [form, setForm] = useState<NewEvidenceItem>(empty);
  const [tagInput, setTagInput] = useState('');
  const [typeFilter, setTypeFilter] = useState('全部类型');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm({ ...empty });
    setTagInput('');
    setFormError('');
    setModalOpen(true);
  }, []);

  useEffect(() => {
    registerAdd(openCreate);
    return () => registerAdd(null);
  }, [openCreate, registerAdd]);

  const openEdit = (item: EvidenceItem) => {
    setEditing(item);
    setForm({
      title: item.title,
      evidence_type: item.evidence_type,
      related_type: item.related_type,
      related_id: item.related_id,
      company_name: item.company_name ?? '',
      position_name: item.position_name ?? '',
      source: item.source ?? '',
      evidence_date: item.evidence_date,
      content: item.content ?? '',
      file_url: item.file_url ?? '',
      tags: item.tags ?? [],
      credibility_score: item.credibility_score,
      notes: item.notes ?? '',
    });
    setTagInput(fromTags(item.tags));
    setFormError('');
    setModalOpen(true);
  };

  const patch = <K extends keyof NewEvidenceItem>(key: K, value: NewEvidenceItem[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    if (!form.title.trim()) {
      setFormError('请填写证据标题。');
      return;
    }

    const payload: NewEvidenceItem = {
      ...form,
      related_id: form.related_id || null,
      company_name: form.company_name?.trim() || null,
      position_name: form.position_name?.trim() || null,
      source: form.source?.trim() || null,
      evidence_date: form.evidence_date || null,
      content: form.content?.trim() || null,
      file_url: form.file_url?.trim() || null,
      tags: toTags(tagInput),
      notes: form.notes?.trim() || null,
    };

    setSaving(true);
    setFormError('');
    try {
      if (editing) await db.update(editing.id, payload);
      else await db.create(payload);
      setModalOpen(false);
    } catch (error) {
      setFormError(`保存失败：${safeError(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: EvidenceItem) => {
    if (!confirm(`确定删除「${item.title}」吗？`)) return;
    try {
      await db.remove(item.id);
    } catch (error) {
      alert(`删除失败：${safeError(error)}`);
    }
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return db.items
      .filter((item) => typeFilter === '全部类型' || item.evidence_type === typeFilter)
      .filter((item) => {
        if (!needle) return true;
        return [item.title, item.company_name, item.position_name, item.source, item.content, item.notes, ...(item.tags ?? [])]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle));
      });
  }, [db.items, query, typeFilter]);

  const stats = [
    ['证据总数', db.items.length],
    ['Offer 相关', db.items.filter((item) => item.evidence_type === 'Offer').length],
    ['HR 沟通', db.items.filter((item) => item.evidence_type === 'HR沟通').length],
    ['面试反馈', db.items.filter((item) => item.evidence_type === '面试反馈').length],
  ];

  return (
    <div className="flex flex-col gap-[18px] animate-rise">
      {db.error && <FormError message={db.error} />}

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(([label, value]) => (
          <div key={label} style={{ ...CARD, padding: 18 }}>
            <div className="text-xs text-[#8a8478]">{label}</div>
            <div className="text-2xl font-bold mt-1">{value}</div>
          </div>
        ))}
      </section>

      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4" style={{ ...CARD, borderRadius: 20 }}>
        <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} style={{ maxWidth: 220 }}>
          <option>全部类型</option>
          {evidenceTypes.map((type) => <option key={type}>{type}</option>)}
        </Select>
        <PrimaryButton accent={theme.accent} onClick={openCreate}>
          <span className="inline-flex items-center gap-2"><IconPlus size={16} />新增证据</span>
        </PrimaryButton>
      </section>

      {db.loading ? (
        <EmptyState text="正在加载证据库…" />
      ) : filtered.length === 0 ? (
        <EmptyState text="还没有证据记录。可以保存 Offer 原文、HR 聊天结论、JD 截图链接或面试反馈，后续决策时统一查证。" actionLabel="新增证据" onAction={openCreate} />
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <article key={item.id} className="card-hover flex flex-col gap-3" style={{ ...CARD, padding: 20 }}>
              <div className="flex items-start justify-between gap-3">
                <div style={{ minWidth: 0 }}>
                  <span style={{ ...pillStyle, background: typeColor(item.evidence_type), color: '#3d3a34' }}>{item.evidence_type}</span>
                  <h2 className="text-lg font-bold mt-3 mb-1">{item.title}</h2>
                  <p className="text-sm text-[#8a8478] m-0">
                    {[item.company_name, item.position_name, fmtDate(item.evidence_date)].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="flex gap-1 flex-none">
                  <button className="btn-press" style={miniBtn} onClick={() => openEdit(item)} aria-label="编辑证据"><IconEdit size={14} /></button>
                  <button className="btn-press" style={miniBtn} onClick={() => void remove(item)} aria-label="删除证据"><IconTrash size={14} /></button>
                </div>
              </div>
              {item.content && <p className="text-sm leading-6 text-[#5f5a51] line-clamp-4 m-0">{item.content}</p>}
              <div className="flex flex-wrap gap-2">
                {(item.tags ?? []).map((tag) => <span key={tag} style={tagStyle}>{tag}</span>)}
                {item.credibility_score != null && <span style={tagStyle}>可信度 {item.credibility_score}</span>}
              </div>
              <div className="mt-auto flex items-center justify-between gap-2 text-xs text-[#8a8478]">
                <span>{item.source || '未标注来源'}</span>
                {item.file_url && (
                  <a className="inline-flex items-center gap-1 font-semibold" href={item.file_url} target="_blank" rel="noreferrer" style={{ color: theme.accent }}>
                    打开链接 <IconExternalLink size={12} />
                  </a>
                )}
              </div>
            </article>
          ))}
        </section>
      )}

      <Modal
        open={modalOpen}
        title={editing ? '编辑证据' : '新增证据'}
        onClose={() => setModalOpen(false)}
        maxWidth={760}
        footer={<><GhostButton onClick={() => setModalOpen(false)}>取消</GhostButton><PrimaryButton accent={theme.accent} onClick={() => void save()} disabled={saving}>{saving ? '保存中…' : '保存'}</PrimaryButton></>}
      >
        <FormError message={formError} />
        <div className="grid sm:grid-cols-2 gap-x-3">
          <Field label="证据标题 *"><TextInput value={form.title} onChange={(event) => patch('title', event.target.value)} /></Field>
          <Field label="证据类型"><Select value={form.evidence_type} onChange={(event) => patch('evidence_type', event.target.value as EvidenceType)}>{evidenceTypes.map((type) => <option key={type}>{type}</option>)}</Select></Field>
          <Field label="公司名称"><TextInput value={form.company_name ?? ''} onChange={(event) => patch('company_name', event.target.value)} /></Field>
          <Field label="岗位名称"><TextInput value={form.position_name ?? ''} onChange={(event) => patch('position_name', event.target.value)} /></Field>
          <Field label="关联对象"><Select value={form.related_type} onChange={(event) => patch('related_type', event.target.value as EvidenceRelatedType)}>{relatedTypes.map((type) => <option key={type} value={type}>{type === 'none' ? '不关联' : type}</option>)}</Select></Field>
          <Field label="关联记录 ID"><TextInput value={form.related_id ?? ''} onChange={(event) => patch('related_id', event.target.value || null)} placeholder="可选，用于后续精确关联" /></Field>
          <Field label="来源"><TextInput value={form.source ?? ''} onChange={(event) => patch('source', event.target.value)} placeholder="如 Boss、邮件、微信、官网" /></Field>
          <Field label="证据日期"><TextInput type="date" value={form.evidence_date ?? ''} onChange={(event) => patch('evidence_date', event.target.value || null)} /></Field>
          <Field label="可信度 0-100"><TextInput type="number" min="0" max="100" value={form.credibility_score ?? ''} onChange={(event) => patch('credibility_score', event.target.value === '' ? null : Number(event.target.value))} /></Field>
          <Field label="原文 / 文件链接"><TextInput value={form.file_url ?? ''} onChange={(event) => patch('file_url', event.target.value)} placeholder="https://" /></Field>
        </div>
        <Field label="标签"><TextInput value={tagInput} onChange={(event) => setTagInput(event.target.value)} placeholder="逗号或空格分隔，例如：谈薪 风险 大小周" /></Field>
        <Field label="证据正文"><TextArea value={form.content ?? ''} onChange={(event) => patch('content', event.target.value)} style={{ minHeight: 150 }} /></Field>
        <Field label="备注"><TextArea value={form.notes ?? ''} onChange={(event) => patch('notes', event.target.value)} /></Field>
      </Modal>
    </div>
  );
}

function typeColor(type: EvidenceType) {
  const map: Record<EvidenceType, string> = {
    JD: '#dde8fb',
    Offer: '#dcebd5',
    HR沟通: '#fbeec2',
    面试反馈: '#e4e0f7',
    薪资福利: '#fbe0d8',
    公司信息: '#d9ebe7',
    其他: '#e6e2da',
  };
  return map[type];
}

const pillStyle: React.CSSProperties = { display: 'inline-block', fontSize: 12, fontWeight: 800, padding: '5px 10px', borderRadius: 999 };
const tagStyle: React.CSSProperties = { display: 'inline-block', fontSize: 12, fontWeight: 700, padding: '4px 9px', borderRadius: 999, background: '#faf7f0', color: '#5f5a51' };
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
