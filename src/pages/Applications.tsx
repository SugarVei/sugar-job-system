import { useEffect, useMemo, useRef, useState } from 'react';
import type { Application, ApplicationStatus, NewRecord, Resume } from '../types';
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
  status: '已投递',
  salary_range: '',
  job_url: '',
  notes: '',
  resume_id: null,
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

export default function Applications() {
  const { items, loading, error: applicationsError, create, update, remove } = useCollection<Application>('applications');
  const { items: resumes, error: resumesError } = useCollection<Resume>('resumes');
  const { query, registerAdd } = useAppShell();
  const { theme } = useTheme();
  const [statusFilter, setStatusFilter] = useState<'all' | ApplicationStatus>('all');
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

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 p-4" style={{ ...CARD, borderRadius: 20 }}>
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
        filtered.map((application) => {
          const tag = statusTag(application.status);
          const steps = buildSteps(application.status);
          return (
            <div key={application.id} className="card-hover" style={{ ...CARD, padding: '22px 24px' }}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div style={{ minWidth: 0 }}>
                  <div className="flex items-center gap-[10px] flex-wrap">
                    <h3 style={{ fontFamily: 'Poppins', fontSize: 18, fontWeight: 600, margin: 0 }}>
                      {application.company_name} · {application.position_name}
                    </h3>
                    <span style={pill(tag.bg, tag.fg)}>{application.status}</span>
                  </div>
                  <div className="flex flex-wrap mt-[9px]" style={{ gap: '6px 18px', fontSize: 13, color: '#8a8478' }}>
                    {application.city && <span>{application.city}</span>}
                    {application.channel && <span>{application.channel}</span>}
                    {application.salary_range && <span>{application.salary_range}</span>}
                    {application.apply_date && <span>投递：{application.apply_date}</span>}
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
        <Field label="备注">
          <TextArea value={form.notes ?? ''} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="下一步、HR 信息、截止时间等" />
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
