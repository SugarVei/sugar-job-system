import { useEffect, useMemo, useRef, useState } from 'react';
import type { Application, Resume, ResumeFile, ResumeFileKind, NewRecord } from '../types';
import { useCollection } from '../hooks/useCollection';
import { useResumeFiles } from '../hooks/useResumeFiles';
import { useAppShell } from '../contexts/AppShellContext';
import { useTheme } from '../contexts/ThemeContext';
import Modal from '../components/Modal';
import { Field, TextInput, TextArea, PrimaryButton, GhostButton, FormError } from '../components/Field';
import { IconEdit, IconTrash, IconPlus, IconFile } from '../components/icons';
import { CARD } from '../lib/appHelpers';
import EmptyState from '../components/EmptyState';

const empty: NewRecord<Resume> = {
  resume_name: '',
  target_position: '',
  file_url: '',
  notes: '',
};

function fmtDateTime(iso: string) {
  try {
    const d = new Date(iso);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  } catch {
    return iso;
  }
}

export default function Resumes() {
  const { items, loading, create, update, remove } = useCollection<Resume>('resumes', {
    column: 'updated_at',
    ascending: false,
  });
  const { items: applications } = useCollection<Application>('applications');
  const fileApi = useResumeFiles();
  const { query, registerAdd } = useAppShell();
  const { theme } = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Resume | null>(null);
  const [form, setForm] = useState<NewRecord<Resume>>(empty);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [scrollSig, setScrollSig] = useState(0);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    registerAdd(() => openCreate());
    return () => registerAdd(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerAdd]);

  // 每个简历的关联投递数
  const linkCount = useMemo(() => {
    const m = new Map<string, number>();
    applications.forEach((a) => {
      if (a.resume_id) m.set(a.resume_id, (m.get(a.resume_id) ?? 0) + 1);
    });
    return m;
  }, [applications]);

  // 每个简历的文件分组
  const filesByResume = useMemo(() => {
    const m = new Map<string, ResumeFile[]>();
    fileApi.files.forEach((f) => {
      const arr = m.get(f.resume_id) ?? [];
      arr.push(f);
      m.set(f.resume_id, arr);
    });
    return m;
  }, [fileApi.files]);

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setFormError('');
    setModalOpen(true);
  };
  const openEdit = (r: Resume) => {
    setEditing(r);
    setForm({
      resume_name: r.resume_name,
      target_position: r.target_position ?? '',
      file_url: r.file_url ?? '',
      notes: r.notes ?? '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.resume_name.trim()) {
      setFormError('「简历名称」为必填项，请补全后再保存。');
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
    } catch (e) {
      setFormError('保存失败：' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const del = async (r: Resume) => {
    if (!confirm(`确定删除「${r.resume_name}」吗？相关上传文件也会一并删除。`)) return;
    await remove(r.id);
    fileApi.refresh();
  };

  const filtered = useMemo(
    () =>
      items.filter((r) => {
        if (!query) return true;
        const t = query.toLowerCase();
        return [r.resume_name, r.target_position, r.notes]
          .filter(Boolean)
          .some((v) => (v as string).toLowerCase().includes(t));
      }),
    [items, query],
  );

  return (
    <div className="animate-rise">
      <div className="flex justify-end mb-[18px]">
        <PrimaryButton accent={theme.accent} onClick={openCreate} style={{ height: 44 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <IconPlus size={16} /> 新增简历
          </span>
        </PrimaryButton>
      </div>

      {loading ? (
        <EmptyState text="加载中…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          text={items.length === 0 ? '还没有简历版本，添加一份吧' : '没有符合条件的简历'}
          actionLabel={items.length === 0 ? '新增简历' : undefined}
          onAction={items.length === 0 ? openCreate : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-[18px]">
          {filtered.map((r) => (
            <ResumeCard
              key={r.id}
              resume={r}
              files={filesByResume.get(r.id) ?? []}
              linkCount={linkCount.get(r.id) ?? 0}
              fileApi={fileApi}
              onEdit={() => openEdit(r)}
              onDelete={() => del(r)}
            />
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editing ? '编辑简历' : '新增简历'}
        onClose={() => setModalOpen(false)}
        scrollTopSignal={scrollSig}
        footer={
          <>
            <GhostButton onClick={() => setModalOpen(false)}>取消</GhostButton>
            <PrimaryButton accent={theme.accent} onClick={save} disabled={saving}>
              {saving ? '保存中…' : '保存'}
            </PrimaryButton>
          </>
        }
      >
        <FormError message={formError} />
        <Field label="简历名称 *">
          <TextInput
            ref={nameRef}
            value={form.resume_name}
            onChange={(e) => setForm({ ...form, resume_name: e.target.value })}
            placeholder="如 产品-互联网版"
            style={!form.resume_name.trim() && formError ? { borderColor: '#f0613f', background: '#fff' } : undefined}
          />
        </Field>
        <Field label="适用岗位">
          <TextInput value={form.target_position ?? ''} onChange={(e) => setForm({ ...form, target_position: e.target.value })} placeholder="如 产品经理" />
        </Field>
        <Field label="备注">
          <TextArea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="这一版的侧重点、适用场景等" />
        </Field>
        <p style={{ fontSize: 12.5, color: '#a39d90', margin: '4px 0 0' }}>
          💡 保存后，可在卡片上的「上传简历 / 上传面试稿件」区域上传 PDF/Word 文件（云端存储，随时下载）。
        </p>
      </Modal>
    </div>
  );
}

// ============================================================
// 单个简历卡片：含两个上传区 + 文件列表
// ============================================================
function ResumeCard({
  resume,
  files,
  linkCount,
  fileApi,
  onEdit,
  onDelete,
}: {
  resume: Resume;
  files: ResumeFile[];
  linkCount: number;
  fileApi: ReturnType<typeof useResumeFiles>;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const scriptInputRef = useRef<HTMLInputElement>(null);
  const [uploadingKind, setUploadingKind] = useState<ResumeFileKind | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleFiles = async (kind: ResumeFileKind, list: FileList | null) => {
    if (!list || list.length === 0) return;
    setUploadingKind(kind);
    try {
      for (const file of Array.from(list)) {
        await fileApi.upload(resume.id, kind, file);
      }
    } catch (e) {
      alert('上传失败：' + (e as Error).message);
    } finally {
      setUploadingKind(null);
    }
  };

  const download = async (f: ResumeFile) => {
    setDownloadingId(f.id);
    try {
      const url = await fileApi.getDownloadUrl(f.file_path);
      window.open(url, '_blank');
    } catch (e) {
      alert('下载失败：' + (e as Error).message);
    } finally {
      setDownloadingId(null);
    }
  };

  const delFile = async (f: ResumeFile) => {
    if (!confirm(`删除文件「${f.file_name}」？`)) return;
    try {
      await fileApi.remove(f);
    } catch (e) {
      alert('删除失败：' + (e as Error).message);
    }
  };

  return (
    <div className="card-hover" style={{ ...CARD, padding: 24 }}>
      {/* 头部 */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 style={{ fontFamily: 'Poppins', fontSize: 18, fontWeight: 600, margin: '0 0 10px' }}>{resume.resume_name}</h3>
          <div className="flex gap-2 flex-wrap">
            {resume.target_position && (
              <span style={{ background: '#ece4d6', color: '#5d584d', fontSize: 12, fontWeight: 600, padding: '4px 11px', borderRadius: 999 }}>
                {resume.target_position}
              </span>
            )}
            <span style={{ border: '1px solid #e0d8c9', color: '#8a8478', fontSize: 12, fontWeight: 600, padding: '4px 11px', borderRadius: 999 }}>
              关联投递 {linkCount}
            </span>
          </div>
        </div>
        <div className="flex gap-1 flex-none">
          <button onClick={onEdit} aria-label="编辑" className="btn-press" style={miniBtn}>
            <IconEdit size={14} />
          </button>
          <button onClick={onDelete} aria-label="删除" className="btn-press" style={miniBtn}>
            <IconTrash size={14} />
          </button>
        </div>
      </div>

      {resume.notes && <p style={{ fontSize: 13, lineHeight: 1.6, color: '#8a8478', margin: '14px 0 16px' }}>{resume.notes}</p>}

      {/* 两个上传区 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ margin: '4px 0 14px' }}>
        <input
          ref={resumeInputRef}
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          style={{ display: 'none' }}
          onChange={(e) => {
            handleFiles('resume', e.target.files);
            e.target.value = '';
          }}
        />
        <input
          ref={scriptInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            handleFiles('script', e.target.files);
            e.target.value = '';
          }}
        />
        <UploadZone
          title="上传简历"
          hint="pdf / doc / docx"
          busy={uploadingKind === 'resume'}
          onClick={() => resumeInputRef.current?.click()}
        />
        <UploadZone
          title="上传面试稿件"
          hint="可上传多份"
          busy={uploadingKind === 'script'}
          onClick={() => scriptInputRef.current?.click()}
        />
      </div>

      {/* 文件列表 */}
      <div className="flex flex-col gap-[9px]">
        {files.length === 0 ? (
          <div style={{ fontSize: 12.5, color: '#a39d90', padding: '4px 2px' }}>暂无文件，点上方区域上传。</div>
        ) : (
          files.map((f) => {
            const isResume = f.kind === 'resume';
            const iconBg = isResume ? '#dcebd5' : '#fbeec2';
            const iconFg = isResume ? '#2f5d36' : '#7a5a12';
            return (
              <div
                key={f.id}
                className="flex items-center justify-between gap-3"
                style={{ border: '1px solid #f0ebe0', borderRadius: 13, padding: '11px 14px' }}
              >
                <div className="flex items-center gap-[11px]" style={{ minWidth: 0 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: iconBg, color: iconFg, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                    <IconFile size={16} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.file_name}</div>
                    <div style={{ fontSize: 11.5, color: '#a39d90' }}>
                      {isResume ? '简历本体' : '面试稿件'} · {fmtDateTime(f.created_at)}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 flex-none">
                  <button onClick={() => download(f)} disabled={downloadingId === f.id} className="btn-press" style={dlBtn}>
                    {downloadingId === f.id ? '…' : '下载'}
                  </button>
                  <button onClick={() => delFile(f)} aria-label="删除文件" className="btn-press" style={{ ...miniBtn, width: 32, height: 32 }}>
                    <IconTrash size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function UploadZone({ title, hint, busy, onClick }: { title: string; hint: string; busy: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="btn-press"
      style={{
        border: '1.5px dashed #d8cfbd',
        background: busy ? '#f3ede1' : '#faf7f0',
        borderRadius: 14,
        padding: 16,
        textAlign: 'center',
        cursor: busy ? 'default' : 'pointer',
        width: '100%',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: '#4a463e' }}>{busy ? '上传中…' : title}</div>
      <div style={{ fontSize: 11.5, color: '#a39d90', marginTop: 4 }}>{hint}</div>
    </button>
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
const dlBtn: React.CSSProperties = {
  height: 32,
  padding: '0 12px',
  border: '1px solid #e4ddcf',
  background: '#faf7f0',
  borderRadius: 10,
  fontSize: 12.5,
  fontWeight: 600,
  color: '#4a463e',
  cursor: 'pointer',
};
