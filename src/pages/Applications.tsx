import { useEffect, useMemo, useState } from 'react';
import type { Application, ApplicationStatus, NewRecord } from '../types';
import { useCollection } from '../hooks/useCollection';
import { useAppShell } from '../contexts/AppShellContext';
import { useTheme } from '../contexts/ThemeContext';
import Modal from '../components/Modal';
import { Field, TextInput, TextArea, Select, PrimaryButton, GhostButton } from '../components/Field';
import { IconEdit, IconTrash, IconPlus, IconExternalLink } from '../components/icons';
import {
  STATUS_OPTIONS,
  statusTag,
  buildSteps,
  matchApp,
  CARD,
} from '../lib/appHelpers';
import EmptyState from '../components/EmptyState';

const empty: NewRecord<Application> = {
  company_name: '',
  position_name: '',
  city: '',
  channel: '',
  apply_date: '',
  status: '已投递',
  salary_range: '',
  job_url: '',
  notes: '',
};

export default function Applications() {
  const { items, loading, create, update, remove } = useCollection<Application>('applications');
  const { query, registerAdd } = useAppShell();
  const { theme } = useTheme();
  const [statusFilter, setStatusFilter] = useState<'all' | ApplicationStatus>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Application | null>(null);
  const [form, setForm] = useState<NewRecord<Application>>(empty);
  const [saving, setSaving] = useState(false);

  // 注册顶栏“+新增”按钮动作
  useEffect(() => {
    registerAdd(() => openCreate());
    return () => registerAdd(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerAdd]);

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setModalOpen(true);
  };
  const openEdit = (a: Application) => {
    setEditing(a);
    setForm({
      company_name: a.company_name,
      position_name: a.position_name,
      city: a.city ?? '',
      channel: a.channel ?? '',
      apply_date: a.apply_date ?? '',
      status: a.status,
      salary_range: a.salary_range ?? '',
      job_url: a.job_url ?? '',
      notes: a.notes ?? '',
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.company_name || !form.position_name) {
      alert('请填写公司名称和岗位名称');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, apply_date: form.apply_date || null };
      if (editing) await update(editing.id, payload);
      else await create(payload);
      setModalOpen(false);
    } catch (e) {
      alert('保存失败：' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const del = async (a: Application) => {
    if (!confirm(`确定删除「${a.company_name} · ${a.position_name}」吗？`)) return;
    try {
      await remove(a.id);
    } catch (e) {
      alert('删除失败：' + (e as Error).message);
    }
  };

  const filtered = useMemo(
    () =>
      items
        .filter((a) => statusFilter === 'all' || a.status === statusFilter)
        .filter((a) => matchApp(a, query)),
    [items, statusFilter, query],
  );

  return (
    <div className="flex flex-col gap-[18px] animate-rise">
      {/* 过滤条 */}
      <div
        className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 p-4"
        style={{ ...CARD, borderRadius: 20 }}
      >
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | ApplicationStatus)}
        >
          <option value="all">全部状态</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <div className="hidden sm:block" style={{ fontSize: 13, color: '#9a9488', alignSelf: 'center' }}>
          共 {filtered.length} 条
        </div>
        <PrimaryButton accent={theme.accent} onClick={openCreate} style={{ height: 44 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <IconPlus size={16} /> 新增投递
          </span>
        </PrimaryButton>
      </div>

      {loading ? (
        <EmptyState text="加载中…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          text={items.length === 0 ? '还没有投递记录，点右上角新增第一条吧' : '没有符合条件的记录'}
          actionLabel={items.length === 0 ? '新增投递' : undefined}
          onAction={items.length === 0 ? openCreate : undefined}
        />
      ) : (
        filtered.map((a) => {
          const tag = statusTag(a.status);
          const steps = buildSteps(a.status);
          return (
            <div key={a.id} className="card-hover" style={{ ...CARD, padding: '22px 24px' }}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div style={{ minWidth: 0 }}>
                  <div className="flex items-center gap-[10px] flex-wrap">
                    <h3 style={{ fontFamily: 'Poppins', fontSize: 18, fontWeight: 600, margin: 0 }}>
                      {a.company_name} · {a.position_name}
                    </h3>
                    <span style={pill(tag.bg, tag.fg)}>{a.status}</span>
                  </div>
                  <div
                    className="flex flex-wrap mt-[9px]"
                    style={{ gap: '6px 18px', fontSize: 13, color: '#8a8478' }}
                  >
                    {a.city && <span>{a.city}</span>}
                    {a.channel && <span>{a.channel}</span>}
                    {a.salary_range && <span>{a.salary_range}</span>}
                    {a.apply_date && <span>投递：{a.apply_date}</span>}
                    {a.job_url && (
                      <a
                        href={a.job_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: theme.accent, display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}
                      >
                        岗位链接 <IconExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-none">
                  <button onClick={() => openEdit(a)} className="btn-press" style={iconBtnText}>
                    <IconEdit size={14} /> 编辑
                  </button>
                  <button onClick={() => del(a)} aria-label="删除" className="btn-press" style={iconBtn}>
                    <IconTrash size={15} />
                  </button>
                </div>
              </div>

              {/* 进度步骤 */}
              <div className="grid grid-cols-4 gap-1" style={{ margin: '20px 0 4px' }}>
                {steps.map((s) => (
                  <div key={s.idx} className="flex flex-col items-center gap-[7px]">
                    <div className="flex items-center w-full">
                      <div style={{ height: 2, flex: 1, background: s.lineL }} />
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: s.dotBg,
                          color: s.dotFg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                          flex: 'none',
                        }}
                      >
                        {s.idx}
                      </div>
                      <div style={{ height: 2, flex: 1, background: s.lineR }} />
                    </div>
                    <span style={{ fontSize: 11.5, color: s.labelColor, fontWeight: s.labelWeight }}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              {a.notes && (
                <div
                  style={{
                    background: '#f5f0e7',
                    borderRadius: 14,
                    padding: '12px 16px',
                    fontSize: 13,
                    color: '#5d584d',
                    marginTop: 12,
                  }}
                >
                  备注：{a.notes}
                </div>
              )}
            </div>
          );
        })
      )}

      <Modal
        open={modalOpen}
        title={editing ? '编辑投递' : '新增投递'}
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
            <TextInput value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="如 字节跳动" />
          </Field>
          <Field label="岗位名称 *">
            <TextInput value={form.position_name} onChange={(e) => setForm({ ...form, position_name: e.target.value })} placeholder="如 产品经理" />
          </Field>
          <Field label="城市">
            <TextInput value={form.city ?? ''} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="如 北京" />
          </Field>
          <Field label="投递渠道">
            <TextInput value={form.channel ?? ''} onChange={(e) => setForm({ ...form, channel: e.target.value })} placeholder="如 内推 / BOSS直聘" />
          </Field>
          <Field label="投递日期">
            <TextInput type="date" value={form.apply_date ?? ''} onChange={(e) => setForm({ ...form, apply_date: e.target.value })} />
          </Field>
          <Field label="当前状态">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ApplicationStatus })}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="薪资范围">
            <TextInput value={form.salary_range ?? ''} onChange={(e) => setForm({ ...form, salary_range: e.target.value })} placeholder="如 25-40k" />
          </Field>
          <Field label="岗位链接">
            <TextInput value={form.job_url ?? ''} onChange={(e) => setForm({ ...form, job_url: e.target.value })} placeholder="https://" />
          </Field>
        </div>
        <Field label="备注">
          <TextArea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="下一步、HR 信息、截止时间等" />
        </Field>
      </Modal>
    </div>
  );
}

function pill(bg: string, fg: string): React.CSSProperties {
  return { background: bg, color: fg, fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999 };
}
const iconBtnText: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  height: 38,
  padding: '0 14px',
  border: '1px solid #e4ddcf',
  background: '#faf7f0',
  borderRadius: 11,
  fontSize: 13,
  fontWeight: 600,
  color: '#4a463e',
  cursor: 'pointer',
};
const iconBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 38,
  height: 38,
  border: '1px solid #e4ddcf',
  background: '#faf7f0',
  borderRadius: 11,
  color: '#8a8478',
  cursor: 'pointer',
};
