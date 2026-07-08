import { useEffect, useMemo, useRef, useState } from 'react';
import type { Application, ApplicationPriority, ApplicationStatus, NewRecord, Resume } from '../types';
import { useCollection } from '../hooks/useCollection';
import { useAppShell } from '../contexts/AppShellContext';
import { useTheme } from '../contexts/ThemeContext';
import Modal from '../components/Modal';
import { Field, TextInput, TextArea, Select, PrimaryButton, GhostButton, FormError } from '../components/Field';
import { IconEdit, IconTrash, IconPlus, IconExternalLink } from '../components/icons';
import { STATUS_OPTIONS, statusTag, buildSteps, matchApp, CARD } from '../lib/appHelpers';
import EmptyState from '../components/EmptyState';
import { exportApplicationsToExcel } from '../lib/exportExcel';

const empty: NewRecord<Application> = {
  company_name: '',
  position_name: '',
  city: '',
  channel: '',
  apply_date: '',
  status: '待投递',
  salary_range: '',
  job_url: '',
  notes: '',
  resume_id: null,
  jd_text: '',
  jd_keywords: [],
  match_score: null,
  match_summary: '',
  next_action: '',
  next_action_at: '',
  deadline_at: '',
  priority: 'normal',
};

const PRIORITY_OPTIONS: Array<{ value: ApplicationPriority; label: string }> = [
  { value: 'low', label: '低' },
  { value: 'normal', label: '普通' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '紧急' },
];

function priorityTag(priority: ApplicationPriority | null | undefined): { label: string; bg: string; fg: string } {
  switch (priority) {
    case 'urgent':
      return { label: '紧急', bg: '#fbe0d8', fg: '#a23d24' };
    case 'high':
      return { label: '高优先级', bg: '#fbeec2', fg: '#7a5a12' };
    case 'low':
      return { label: '低优先级', bg: '#eef0e8', fg: '#6b665c' };
    default:
      return { label: '普通', bg: '#e4e0f7', fg: '#4a3f96' };
  }
}

function formatDateTime(value: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

function toDateTimeLocal(value: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function parseKeywords(value: string) {
  return value.split(/[,，]/).map((item) => item.trim()).filter(Boolean);
}

type ViewMode = 'list' | 'kanban';

function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export default function Applications() {
  const { items, loading, error: applicationsError, create, update, remove } = useCollection<Application>('applications');
  const { items: resumes, error: resumesError } = useCollection<Resume>('resumes');
  const { query, registerAdd } = useAppShell();
  const { theme } = useTheme();
  const [statusFilter, setStatusFilter] = useState<'all' | ApplicationStatus>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Application | null>(null);
  const [form, setForm] = useState<NewRecord<Application>>(empty);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [formError, setFormError] = useState('');
  const [scrollSig, setScrollSig] = useState(0);
  const companyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    registerAdd(() => openCreate());
    return () => registerAdd(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerAdd]);

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (application: Application) => {
    setEditing(application);
    setForm({
      company_name: application.company_name,
      position_name: application.position_name,
      city: application.city ?? '',
      channel: application.channel ?? '',
      apply_date: application.apply_date ?? '',
      status: application.status,
      salary_range: application.salary_range ?? '',
      job_url: application.job_url ?? '',
      notes: application.notes ?? '',
      resume_id: application.resume_id ?? null,
      jd_text: application.jd_text ?? '',
      jd_keywords: application.jd_keywords ?? [],
      match_score: application.match_score ?? null,
      match_summary: application.match_summary ?? '',
      next_action: application.next_action ?? '',
      next_action_at: toDateTimeLocal(application.next_action_at),
      deadline_at: toDateTimeLocal(application.deadline_at),
      priority: application.priority ?? 'normal',
    });
    setFormError('');
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.company_name.trim() || !form.position_name.trim()) {
      setFormError('「公司名称」和「岗位名称」为必填项，请补全后再保存。');
      setScrollSig((n) => n + 1);
      setTimeout(() => companyRef.current?.focus(), 320);
      return;
    }

    setFormError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        apply_date: form.apply_date || null,
        match_score: form.match_score === null ? null : Number(form.match_score),
        next_action_at: form.next_action_at ? new Date(form.next_action_at).toISOString() : null,
        deadline_at: form.deadline_at ? new Date(form.deadline_at).toISOString() : null,
        resume_id: form.resume_id || null,
      };

      if (editing) await update(editing.id, payload);
      else await create(payload);
      setModalOpen(false);
    } catch (error) {
      setFormError('保存失败：' + errorText(error));
    } finally {
      setSaving(false);
    }
  };

  const quickUpdateStatus = async (application: Application, status: ApplicationStatus) => {
    try {
      await update(application.id, { status });
    } catch (error) {
      alert('状态更新失败：' + errorText(error));
    }
  };

  const del = async (application: Application) => {
    if (!confirm(`确定删除「${application.company_name} · ${application.position_name}」吗？`)) return;
    try {
      await remove(application.id);
    } catch (error) {
      alert('删除失败：' + errorText(error));
    }
  };

  const filtered = useMemo(
    () =>
      items
        .filter((application) => statusFilter === 'all' || application.status === statusFilter)
        .filter((application) => matchApp(application, query)),
    [items, statusFilter, query],
  );

  return (
    <div className="flex flex-col gap-[18px] animate-rise">
      {(applicationsError || resumesError) && (
        <FormError message={applicationsError || resumesError || ''} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto_auto] gap-3 p-4" style={{ ...CARD, borderRadius: 20 }}>
        <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | ApplicationStatus)}>
          <option value="all">全部状态</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
        <div className="hidden sm:block" style={{ fontSize: 13, color: '#9a9488', alignSelf: 'center' }}>
          共 {filtered.length} 条
        </div>
        <div style={{ display: 'flex', background: '#f5f0e7', border: '1px solid #e4ddcf', borderRadius: 12, padding: 3, height: 44 }}>
          {(['list', 'kanban'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              style={{
                border: 'none',
                borderRadius: 9,
                padding: '0 13px',
                background: viewMode === mode ? '#fffdf8' : 'transparent',
                color: viewMode === mode ? '#1b1a17' : '#8a8478',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: viewMode === mode ? '0 2px 7px rgba(60,50,35,.08)' : 'none',
              }}
            >
              {mode === 'list' ? '列表视图' : '看板视图'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={async () => {
              if (items.length === 0 || exporting) return;
              setExporting(true);
              try { await exportApplicationsToExcel(items); }
              catch (err) { alert('导出失败：' + String(err)); }
              finally { setExporting(false); }
            }}
            disabled={items.length === 0 || exporting}
            style={{
              height: 44,
              padding: '0 16px',
              border: '1px solid #e4ddcf',
              background: (items.length === 0 || exporting) ? '#f5f2eb' : '#faf7f0',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 600,
              color: (items.length === 0 || exporting) ? '#c0b8a8' : '#4a463e',
              cursor: (items.length === 0 || exporting) ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {exporting ? '导出中...' : '📊 导出 Excel'}
          </button>
          <PrimaryButton accent={theme.accent} onClick={openCreate} style={{ height: 44 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <IconPlus size={16} /> 新增投递
            </span>
          </PrimaryButton>
        </div>
      </div>

      {loading ? (
        <EmptyState text="加载中..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          text={items.length === 0 ? '还没有投递记录，点右上角新增第一条吧' : '没有符合条件的记录'}
          actionLabel={items.length === 0 ? '新增投递' : undefined}
          onAction={items.length === 0 ? openCreate : undefined}
        />
      ) : (
        viewMode === 'kanban' ? (
          <KanbanBoard
            applications={filtered}
            onEdit={openEdit}
            onStatusChange={quickUpdateStatus}
          />
        ) : filtered.map((application) => {
          const tag = statusTag(application.status);
          const steps = buildSteps(application.status);
          const priority = priorityTag(application.priority);
          return (
            <div key={application.id} className="card-hover" style={{ ...CARD, padding: '22px 24px' }}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div style={{ minWidth: 0 }}>
                  <div className="flex items-center gap-[10px] flex-wrap">
                    <h3 style={{ fontFamily: 'Poppins', fontSize: 18, fontWeight: 600, margin: 0 }}>
                      {application.company_name} · {application.position_name}
                    </h3>
                    <span style={pill(tag.bg, tag.fg)}>{application.status}</span>
                    <span style={pill(priority.bg, priority.fg)}>{priority.label}</span>
                  </div>
                  <div className="flex flex-wrap mt-[9px]" style={{ gap: '6px 18px', fontSize: 13, color: '#8a8478' }}>
                    {application.city && <span>{application.city}</span>}
                    {application.channel && <span>{application.channel}</span>}
                    {application.salary_range && <span>{application.salary_range}</span>}
                    {application.apply_date && <span>投递：{application.apply_date}</span>}
                    {application.next_action && <span>下一步：{application.next_action}</span>}
                    {application.deadline_at && <span>截止：{formatDateTime(application.deadline_at)}</span>}
                    {application.job_url && (
                      <a
                        href={application.job_url}
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
                  <button onClick={() => openEdit(application)} className="btn-press" style={iconBtnText}>
                    <IconEdit size={14} /> 编辑
                  </button>
                  <button onClick={() => del(application)} aria-label="删除" className="btn-press" style={iconBtn}>
                    <IconTrash size={15} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1" style={{ margin: '20px 0 4px' }}>
                {steps.map((step) => (
                  <div key={step.idx} className="flex flex-col items-center gap-[7px]">
                    <div className="flex items-center w-full">
                      <div style={{ height: 2, flex: 1, background: step.lineL }} />
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: step.dotBg,
                          color: step.dotFg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                          flex: 'none',
                        }}
                      >
                        {step.idx}
                      </div>
                      <div style={{ height: 2, flex: 1, background: step.lineR }} />
                    </div>
                    <span style={{ fontSize: 11.5, color: step.labelColor, fontWeight: step.labelWeight }}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>

              {application.notes && (
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
                  备注：{application.notes}
                </div>
              )}
              {(application.jd_text || application.match_score !== null || application.match_summary) && (
                <div
                  style={{
                    background: '#faf7f0',
                    border: '1px solid #f0ebe0',
                    borderRadius: 14,
                    padding: '12px 16px',
                    fontSize: 13,
                    color: '#5d584d',
                    marginTop: 12,
                  }}
                >
                  {application.match_score !== null && <div style={{ fontWeight: 700 }}>匹配度：{application.match_score}/100</div>}
                  {application.jd_keywords && application.jd_keywords.length > 0 && (
                    <div style={{ marginTop: 4 }}>关键词：{application.jd_keywords.join('、')}</div>
                  )}
                  {application.match_summary && <div style={{ marginTop: 4 }}>匹配分析：{application.match_summary}</div>}
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

        <div
          style={{
            background: '#fbf6ec',
            border: '1px solid #f0e6cf',
            borderRadius: 16,
            padding: '14px 16px 2px',
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#a23d24', marginBottom: 10, letterSpacing: '.02em' }}>
            必填信息
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
            <Field label="公司名称 *">
              <TextInput
                ref={companyRef}
                value={form.company_name}
                onChange={(event) => setForm({ ...form, company_name: event.target.value })}
                placeholder="如：字节跳动"
                style={!form.company_name.trim() && formError ? { borderColor: '#f0613f', background: '#fff' } : undefined}
              />
            </Field>
            <Field label="岗位名称 *">
              <TextInput
                value={form.position_name}
                onChange={(event) => setForm({ ...form, position_name: event.target.value })}
                placeholder="如：产品经理 / 工业工程师"
                style={!form.position_name.trim() && formError ? { borderColor: '#f0613f', background: '#fff' } : undefined}
              />
            </Field>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
          <Field label="城市">
            <TextInput value={form.city ?? ''} onChange={(event) => setForm({ ...form, city: event.target.value })} placeholder="如：北京" />
          </Field>
          <Field label="投递渠道">
            <TextInput value={form.channel ?? ''} onChange={(event) => setForm({ ...form, channel: event.target.value })} placeholder="如：内推 / BOSS直聘" />
          </Field>
          <Field label="投递日期">
            <TextInput type="date" value={form.apply_date ?? ''} onChange={(event) => setForm({ ...form, apply_date: event.target.value })} />
          </Field>
          <Field label="当前状态">
            <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ApplicationStatus })}>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="薪资范围">
            <TextInput value={form.salary_range ?? ''} onChange={(event) => setForm({ ...form, salary_range: event.target.value })} placeholder="如：25-40k" />
          </Field>
          <Field label="岗位链接">
            <TextInput value={form.job_url ?? ''} onChange={(event) => setForm({ ...form, job_url: event.target.value })} placeholder="https://" />
          </Field>
        </div>
        <Field label="使用简历（关联简历库）">
          <Select value={form.resume_id ?? ''} onChange={(event) => setForm({ ...form, resume_id: event.target.value || null })}>
            <option value="">不关联</option>
            {resumes.map((resume) => (
              <option key={resume.id} value={resume.id}>
                {resume.resume_name}
              </option>
            ))}
          </Select>
        </Field>
        <div
          style={{
            background: '#fbf6ec',
            border: '1px solid #f0e6cf',
            borderRadius: 16,
            padding: '14px 16px 2px',
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#a23d24', marginBottom: 10, letterSpacing: '.02em' }}>
            JD 与匹配分析
          </div>
          <Field label="JD 原文">
            <TextArea
              value={form.jd_text ?? ''}
              onChange={(event) => setForm({ ...form, jd_text: event.target.value })}
              placeholder="粘贴岗位 JD 原文，方便后续复盘和 AI 分析"
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
            <Field label="岗位关键词">
              <TextInput
                value={(form.jd_keywords ?? []).join('，')}
                onChange={(event) => setForm({ ...form, jd_keywords: parseKeywords(event.target.value) })}
                placeholder="如：供应链，数据分析，Python"
              />
            </Field>
            <Field label="匹配度评分">
              <TextInput
                type="number"
                min={0}
                max={100}
                value={form.match_score ?? ''}
                onChange={(event) => {
                  const raw = event.target.value;
                  const next = raw === '' ? null : Math.max(0, Math.min(100, Number(raw)));
                  setForm({ ...form, match_score: next });
                }}
                placeholder="0-100"
              />
            </Field>
          </div>
          <Field label="匹配分析摘要">
            <TextArea
              value={form.match_summary ?? ''}
              onChange={(event) => setForm({ ...form, match_summary: event.target.value })}
              placeholder="记录人工或 AI 分析结果"
            />
          </Field>
          <button type="button" disabled style={{ ...iconBtnText, opacity: 0.55, cursor: 'not-allowed', marginBottom: 14 }}>
            AI 分析 JD（待接入）
          </button>
        </div>
        <div
          style={{
            background: '#f7fbf4',
            border: '1px solid #ddebd6',
            borderRadius: 16,
            padding: '14px 16px 2px',
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#2f5d36', marginBottom: 10, letterSpacing: '.02em' }}>
            下一步与提醒
          </div>
          <Field label="下一步动作">
            <TextInput
              value={form.next_action ?? ''}
              onChange={(event) => setForm({ ...form, next_action: event.target.value })}
              placeholder="如：补投简历 / 3 天后跟进 HR / 准备笔试"
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3">
            <Field label="下一步时间">
              <TextInput type="datetime-local" value={form.next_action_at ?? ''} onChange={(event) => setForm({ ...form, next_action_at: event.target.value })} />
            </Field>
            <Field label="截止时间">
              <TextInput type="datetime-local" value={form.deadline_at ?? ''} onChange={(event) => setForm({ ...form, deadline_at: event.target.value })} />
            </Field>
            <Field label="优先级">
              <Select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as ApplicationPriority })}>
                {PRIORITY_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </Select>
            </Field>
          </div>
        </div>
        <Field label="备注">
          <TextArea value={form.notes ?? ''} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="补充 HR 信息、沟通记录、复盘备注等" />
        </Field>
      </Modal>
    </div>
  );
}

function KanbanBoard({
  applications,
  onEdit,
  onStatusChange,
}: {
  applications: Application[];
  onEdit: (application: Application) => void;
  onStatusChange: (application: Application, status: ApplicationStatus) => void;
}) {
  const grouped = STATUS_OPTIONS.map((status) => ({
    status,
    items: applications.filter((application) => application.status === status),
  }));

  return (
    <div className="kanban-board-scroll" style={{ overflowX: 'auto', paddingBottom: 8 }}>
      <style>{`
        .kanban-board-scroll::-webkit-scrollbar,
        .kanban-column-scroll::-webkit-scrollbar {
          height: 10px;
          width: 10px;
        }
        .kanban-board-scroll::-webkit-scrollbar-track,
        .kanban-column-scroll::-webkit-scrollbar-track {
          background: rgba(255, 253, 248, .45);
          border-radius: 999px;
        }
        .kanban-board-scroll::-webkit-scrollbar-thumb,
        .kanban-column-scroll::-webkit-scrollbar-thumb {
          background: #d2c7b5;
          border-radius: 999px;
          border: 2px solid rgba(255, 253, 248, .55);
        }
        .kanban-column-scroll {
          scrollbar-color: #d2c7b5 rgba(255, 253, 248, .45);
          scrollbar-width: thin;
        }
      `}</style>
      <div style={{ display: 'grid', gridAutoFlow: 'column', gridAutoColumns: 'minmax(260px, 1fr)', gap: 14, minWidth: 980, alignItems: 'stretch' }}>
        {grouped.map((column) => {
          const tag = statusTag(column.status);
          return (
            <div
              key={column.status}
              style={{
                background: '#f5f0e7',
                borderRadius: 18,
                padding: 12,
                height: 'min(58vh, 520px)',
                minHeight: 280,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div className="flex items-center justify-between" style={{ marginBottom: 10, flex: 'none' }}>
                <span style={pill(tag.bg, tag.fg)}>{column.status}</span>
                <span style={{ fontSize: 12, color: '#8a8478', fontWeight: 700 }}>{column.items.length}</span>
              </div>
              <div
                className="kanban-column-scroll flex flex-col gap-2"
                style={{
                  overflowY: 'auto',
                  overscrollBehavior: 'contain',
                  paddingRight: 4,
                  minHeight: 0,
                  flex: 1,
                }}
              >
                {column.items.length === 0 ? (
                  <div style={{ border: '1px dashed #d8cfbd', borderRadius: 13, padding: 14, color: '#a39d90', fontSize: 12.5, textAlign: 'center' }}>
                    暂无记录
                  </div>
                ) : column.items.map((application) => {
                  const priority = priorityTag(application.priority);
                  return (
                    <button
                      key={application.id}
                      type="button"
                      onClick={() => onEdit(application)}
                      className="btn-press"
                      style={{
                        ...CARD,
                        border: '1px solid #f0ebe0',
                        borderRadius: 14,
                        padding: 14,
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1b1a17', lineHeight: 1.35 }}>
                        {application.company_name}
                      </div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#5d584d', marginTop: 3 }}>
                        {application.position_name}
                      </div>
                      <div className="flex flex-wrap" style={{ gap: '5px 8px', marginTop: 9, fontSize: 11.5, color: '#8a8478' }}>
                        {application.city && <span>{application.city}</span>}
                        {application.salary_range && <span>{application.salary_range}</span>}
                        {application.channel && <span>{application.channel}</span>}
                      </div>
                      <div className="flex flex-wrap gap-1" style={{ marginTop: 10 }}>
                        <span style={pill(tag.bg, tag.fg)}>{application.status}</span>
                        <span style={pill(priority.bg, priority.fg)}>{priority.label}</span>
                      </div>
                      {(application.next_action || application.deadline_at) && (
                        <div style={{ marginTop: 10, fontSize: 12, color: '#6b665c', lineHeight: 1.55 }}>
                          {application.next_action && <div>下一步：{application.next_action}</div>}
                          {application.deadline_at && <div>截止：{formatDateTime(application.deadline_at)}</div>}
                        </div>
                      )}
                      <div onClick={(event) => event.stopPropagation()} style={{ marginTop: 10 }}>
                        <Select
                          value={application.status}
                          onChange={(event) => onStatusChange(application, event.target.value as ApplicationStatus)}
                          style={{ height: 34, fontSize: 12.5 }}
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </Select>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
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
