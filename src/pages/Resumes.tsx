import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { DragEvent } from 'react';
import type { Application, Resume, ResumeFile, ResumeFileKind, NewRecord } from '../types';
import { useCollection } from '../hooks/useCollection';
import { useResumeFiles } from '../hooks/useResumeFiles';
import { useAppShell } from '../contexts/AppShellContext';
import { useTheme } from '../contexts/ThemeContext';
import { useApiKeys } from '../contexts/ApiKeysContext';
import Modal from '../components/Modal';
import { Field, TextInput, TextArea, PrimaryButton, GhostButton, FormError } from '../components/Field';
import { IconEdit, IconTrash, IconPlus, IconFile } from '../components/icons';
import { CARD } from '../lib/appHelpers';
import EmptyState from '../components/EmptyState';
import { generateDocx, downloadBlob } from '../lib/generateDocx';
import { extractResumeText } from '../lib/resumeText';
import { streamAIChat } from '../lib/aiChatClient';
import { RESUME_INTERVIEW_SCRIPT_PROMPT } from '../lib/resumeInterviewPrompt';

const JobAssistDrawer = lazy(() => import('../components/job-assist/JobAssistDrawer'));

const empty: NewRecord<Resume> = {
  resume_name: '',
  target_position: '',
  file_url: '',
  notes: '',
};

const JOB_ASSIST_EXPLAINER = (
  <section
    aria-labelledby="job-assist-explainer-title"
    style={{
      flex: 1,
      minHeight: 72,
      display: 'flex',
      alignItems: 'center',
      gap: 13,
      padding: '13px 16px',
      border: '1px solid rgba(223,156,99,0.48)',
      borderRadius: 16,
      background: 'linear-gradient(135deg, rgba(255,248,238,0.92), rgba(255,253,249,0.78))',
      boxShadow: '0 8px 24px rgba(123,91,54,0.06)',
    }}
  >
    <span
      aria-hidden="true"
      style={{
        width: 38,
        height: 38,
        flex: '0 0 38px',
        display: 'grid',
        placeItems: 'center',
        borderRadius: 12,
        background: '#fff0de',
        fontSize: 19,
      }}
    >
      ✨
    </span>
    <div>
      <h2 id="job-assist-explainer-title" style={{ margin: 0, color: '#5f371b', fontSize: 14, fontWeight: 700 }}>
        什么是“求职辅助”？
      </h2>
      <p style={{ margin: '4px 0 0', color: '#756b5e', fontSize: 12.5, lineHeight: 1.6 }}>
        它会结合你上传的简历和目标岗位，帮你梳理求职方向、分析 JD 匹配、生成定制简历草稿、记录投递进度并进行模拟面试。内容由你确认，不会自动投递。
      </p>
    </div>
  </section>
);

const SUPPORTED_UPLOAD_ACCEPT = '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const SUPPORTED_UPLOAD_EXTENSIONS = new Set(['pdf', 'docx']);
const SUPPORTED_UPLOAD_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function validateUploadFile(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!SUPPORTED_UPLOAD_EXTENSIONS.has(ext)) return false;
  return !file.type || SUPPORTED_UPLOAD_MIME_TYPES.has(file.type);
}

function fmtDateTime(iso: string) {
  try {
    const d = new Date(iso);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  } catch {
    return iso;
  }
}

function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export default function Resumes() {
  const { items, loading, create, update, remove } = useCollection<Resume>('resumes', {
    column: 'updated_at',
    ascending: false,
  });
  const { items: applications, create: createApplication } = useCollection<Application>('applications');
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
  }, [registerAdd]);

  const linkCount = useMemo(() => {
    const m = new Map<string, number>();
    applications.forEach((a) => {
      if (a.resume_id) m.set(a.resume_id, (m.get(a.resume_id) ?? 0) + 1);
    });
    return m;
  }, [applications]);

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
      setFormError('保存失败：' + errorText(e));
    } finally {
      setSaving(false);
    }
  };

  const del = async (r: Resume) => {
    if (!confirm(`确定删除「${r.resume_name}」吗？相关上传文件也会一并删除。`)) return;
    await remove(r.id);
    fileApi.refresh();
  };

  const createTailoredResumeVersion = async (
    name: string,
    targetPosition: string,
    notes: string,
    draft: string,
  ) => {
    const created = await create({
      resume_name: name,
      target_position: targetPosition,
      file_url: '',
      notes,
    });
    try {
      await fileApi.saveAIContent(created.id, `${name}-文字草稿`, 'resume', draft);
    } catch (error) {
      await remove(created.id);
      throw error;
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-[18px]">
        {JOB_ASSIST_EXPLAINER}
        <div className="flex justify-end flex-none">
          <PrimaryButton accent={theme.accent} onClick={openCreate} style={{ height: 44 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <IconPlus size={16} /> 新增简历
            </span>
          </PrimaryButton>
        </div>
      </div>

      {loading ? (
        <EmptyState text="加载中..." />
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
              onCreateApplication={createApplication}
              onCreateResumeVersion={createTailoredResumeVersion}
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
              {saving ? '保存中...' : '保存'}
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
            placeholder="如：产品-互联网版"
            style={!form.resume_name.trim() && formError ? { borderColor: '#f0613f', background: '#fff' } : undefined}
          />
        </Field>
        <Field label="适用岗位">
          <TextInput
            value={form.target_position ?? ''}
            onChange={(e) => setForm({ ...form, target_position: e.target.value })}
            placeholder="如：产品经理"
          />
        </Field>
        <Field label="备注">
          <TextArea
            value={form.notes ?? ''}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="这一版的侧重点、适用场景等"
          />
        </Field>
        <p style={{ fontSize: 12.5, color: '#a39d90', margin: '4px 0 0' }}>
          保存后，可在卡片上的“上传简历 / 上传面试稿件”区域上传 PDF / DOCX 文件。
        </p>
      </Modal>
    </div>
  );
}

function ResumeCard({
  resume,
  files,
  linkCount,
  fileApi,
  onCreateApplication,
  onCreateResumeVersion,
  onEdit,
  onDelete,
}: {
  resume: Resume;
  files: ResumeFile[];
  linkCount: number;
  fileApi: ReturnType<typeof useResumeFiles>;
  onCreateApplication: (payload: Record<string, unknown>) => Promise<Application>;
  onCreateResumeVersion: (name: string, targetPosition: string, notes: string, draft: string) => Promise<void>;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { requireActiveConfig } = useApiKeys();
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const scriptInputRef = useRef<HTMLInputElement>(null);
  const [uploadingKind, setUploadingKind] = useState<ResumeFileKind | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [expandedScripts, setExpandedScripts] = useState<Set<string>>(new Set());
  const [jobAssistOpen, setJobAssistOpen] = useState(false);

  // AI 生成状态
  const [aiOpen, setAiOpen] = useState(false);
  // 'select' = 选择简历文件（多份时）; 'working' = 提取+生成中; 'done' = 完成
  const [aiStep, setAiStep] = useState<'select' | 'working' | 'done'>('select');
  const [aiProgress, setAiProgress] = useState('');
  const [aiStreamText, setAiStreamText] = useState('');
  const [aiSelectedId, setAiSelectedId] = useState<string | null>(null);
  const [aiFileName, setAiFileName] = useState('');  // 上传简历文件名（不含扩展名）

  // 已上传的简历文件（非 AI 生成）
  const uploadedResumes = files.filter((f) => f.kind === 'resume' && f.source !== 'ai' && f.file_path);

  const closeAiModal = () => {
    setAiOpen(false);
    setAiStep('select');
    setAiStreamText('');
    setAiProgress('');
    setAiSelectedId(null);
    setAiFileName('');
  };

  useEffect(() => {
    if (!aiOpen) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeAiModal(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [aiOpen]);

  const handleFiles = async (kind: ResumeFileKind, list: FileList | null) => {
    if (!list || list.length === 0) return;

    setUploadingKind(kind);
    try {
      for (const file of Array.from(list)) {
        if (!validateUploadFile(file)) {
          throw new Error('暂不支持该格式，请上传 PDF 或 DOCX 文件。');
        }
        await fileApi.upload(resume.id, kind, file);
      }
    } catch (e) {
      alert('上传失败：' + errorText(e));
    } finally {
      setUploadingKind(null);
    }
  };

  const download = async (f: ResumeFile) => {
    if (!f.file_path) return;
    setDownloadingId(f.id);
    try {
      const url = await fileApi.getDownloadUrl(f.file_path);
      window.open(url, '_blank');
    } catch (e) {
      alert('下载失败：' + errorText(e));
    } finally {
      setDownloadingId(null);
    }
  };

  const startGeneration = async (fileId?: string) => {
    const targetId = fileId ?? aiSelectedId ?? uploadedResumes[0]?.id;
    const targetFile = uploadedResumes.find((f) => f.id === targetId);
    if (!targetFile) return;
    const aiConfig = requireActiveConfig('AI 生成面试稿件');
    if (!aiConfig) return;

    setAiStep('working');
    setAiProgress('📄 正在读取简历文件…');
    setAiStreamText('');

    try {
      const resumeText = await extractResumeText(targetFile, fileApi.getDownloadUrl);
      if (!resumeText.trim()) throw new Error('简历内容为空，无法生成稿件');

      setAiProgress('🤖 AI 正在生成面试稿件…');

      const fullText = await streamAIChat({
        config: aiConfig,
        messages: [
          { role: 'system', content: RESUME_INTERVIEW_SCRIPT_PROMPT },
          { role: 'user', content: `以下是我的简历内容：\n\n${resumeText}` },
        ],
        maxTokens: 8192,
        onToken: setAiStreamText,
      });

      if (fullText) {
        // 用上传文件名（去扩展名）作为稿件名，避免 resume_name 为空的问题
        const scriptName = targetFile.file_name.replace(/\.[^.]+$/, '');
        setAiFileName(scriptName);
        await fileApi.saveAIScript(resume.id, scriptName, fullText);
        setAiStep('done');
        setAiProgress('');
      }
    } catch (e) {
      alert('生成失败：' + errorText(e));
      closeAiModal();
    }
  };

  const handleDownloadDocx = async () => {
    const docName = `${aiFileName}-面试稿件`;
    const blob = await generateDocx(docName, aiStreamText);
    downloadBlob(blob, `${docName}.docx`);
  };

  const delFile = async (f: ResumeFile) => {
    if (!confirm(`删除文件「${f.file_name}」？`)) return;
    try {
      await fileApi.remove(f);
    } catch (e) {
      alert('删除失败：' + errorText(e));
    }
  };

  return (
    <div className="card-hover" style={{ ...CARD, padding: 24 }}>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ margin: '4px 0 14px', alignItems: 'stretch' }}>
        <input
          ref={resumeInputRef}
          type="file"
          accept={SUPPORTED_UPLOAD_ACCEPT}
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
          accept={SUPPORTED_UPLOAD_ACCEPT}
          style={{ display: 'none' }}
          onChange={(e) => {
            handleFiles('script', e.target.files);
            e.target.value = '';
          }}
        />
        <UploadZone
          title="上传简历"
          hint="PDF / DOCX"
          busy={uploadingKind === 'resume'}
          onClick={() => resumeInputRef.current?.click()}
          onFiles={(files) => handleFiles('resume', files)}
        />
        <UploadZone
          title="上传面试稿件"
          hint="可一次拖入多份"
          busy={uploadingKind === 'script'}
          onClick={() => scriptInputRef.current?.click()}
          onFiles={(files) => handleFiles('script', files)}
          compact
        />
        {/* AI 生成按钮 */}
        <button
          type="button"
          onClick={() => {
            if (!requireActiveConfig('AI 生成面试稿件')) return;
            if (uploadedResumes.length === 0) {
              alert('请先在上方上传一份简历文件（PDF / DOCX）');
              return;
            }
            setAiOpen(true);
            setAiStep(uploadedResumes.length === 1 ? 'working' : 'select');
            setAiStreamText('');
            setAiProgress('');
            setAiSelectedId(uploadedResumes[0].id);
            if (uploadedResumes.length === 1) startGeneration(uploadedResumes[0].id);
          }}
          className="btn-press"
          style={{
            border: '1.5px dashed #a89cf0',
            background: '#f3f1fc',
            borderRadius: 14,
            padding: '14px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            minHeight: 70,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            minWidth: 110,
            transition: 'background 160ms',
          }}
        >
          <span style={{ fontSize: 20 }}>🤖</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#4a3f96', lineHeight: 1.3 }}>AI 生成面试稿件</span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (!requireActiveConfig('AI 求职辅助')) return;
            setJobAssistOpen(true);
          }}
          className="btn-press"
          style={{
            border: '1.5px dashed #df9c63',
            background: '#fff4e8',
            borderRadius: 14,
            padding: '14px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            minHeight: 70,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'background 160ms',
          }}
        >
          <span style={{ fontSize: 20 }}>✨</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#8d4f20', lineHeight: 1.3 }}>求职辅助</span>
        </button>
      </div>

      {/* AI 生成弹窗 */}
      {aiOpen && createPortal(
        <div
          onClick={() => { if (aiStep !== 'working') closeAiModal(); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(40,30,25,0.38)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, animation: 'fadeIn .2s ease' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'rgba(255,253,250,0.98)', borderRadius: 24, width: '100%', maxWidth: 620, maxHeight: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 80px rgba(120,40,70,.22)', overflow: 'hidden', animation: 'popIn .26s ease both' }}
          >
            {/* Header */}
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f0ebe0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <div style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: 16, color: '#1b1a17' }}>🤖 AI 生成面试稿件</div>
                <div style={{ fontSize: 12, color: '#8a8478', marginTop: 3 }}>
                  {aiStep === 'select' && '选择要使用的简历文件'}
                  {aiStep === 'working' && (aiProgress || 'AI 正在处理…')}
                  {aiStep === 'done' && '✅ 生成完成，已保存到文件列表'}
                </div>
              </div>
              {aiStep !== 'working' && (
                <button onClick={closeAiModal} style={{ width: 34, height: 34, border: '1px solid #e4ddcf', background: '#faf7f0', borderRadius: 10, cursor: 'pointer', color: '#8a8478', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
              )}
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px' }}>

              {/* 选择简历文件（多份时） */}
              {aiStep === 'select' && (
                <div className="flex flex-col gap-2">
                  <p style={{ fontSize: 13, color: '#6b665c', marginBottom: 8 }}>检测到多份简历，请选择本次要生成稿件的版本：</p>
                  {uploadedResumes.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setAiSelectedId(f.id)}
                      className="btn-press"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                        border: `1.5px solid ${aiSelectedId === f.id ? '#a89cf0' : '#e4ddcf'}`,
                        background: aiSelectedId === f.id ? '#f3f1fc' : '#faf7f0',
                        borderRadius: 13, cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: '#e0daf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>📄</div>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1b1a17' }}>{f.file_name}</div>
                        <div style={{ fontSize: 11.5, color: '#a39d90', marginTop: 2 }}>{fmtDateTime(f.created_at)}</div>
                      </div>
                      {aiSelectedId === f.id && <span style={{ marginLeft: 'auto', color: '#a89cf0', fontSize: 18 }}>✓</span>}
                    </button>
                  ))}
                </div>
              )}

              {/* 生成中 */}
              {aiStep === 'working' && (
                <div>
                  {!aiStreamText && (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#8a8478' }}>
                      <div style={{ fontSize: 36, marginBottom: 14 }}>⏳</div>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{aiProgress}</div>
                      <div style={{ fontSize: 12, marginTop: 6 }}>预计需要 30-90 秒，请勿关闭窗口</div>
                    </div>
                  )}
                  {aiStreamText && (
                    <div style={{ background: '#faf7f0', border: '1px solid #f0ebe0', borderRadius: 12, padding: '14px 16px', fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap', maxHeight: 400, overflowY: 'auto', color: '#2a2720', wordBreak: 'break-word' }}>
                      {aiStreamText}▌
                    </div>
                  )}
                </div>
              )}

              {/* 完成 */}
              {aiStep === 'done' && (
                <div style={{ background: '#faf7f0', border: '1px solid #f0ebe0', borderRadius: 12, padding: '14px 16px', fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap', maxHeight: 400, overflowY: 'auto', color: '#2a2720', wordBreak: 'break-word' }}>
                  {aiStreamText}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 24px 20px', borderTop: '1px solid #f0ebe0', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
              {aiStep !== 'working' && (
                <button onClick={closeAiModal} style={{ height: 42, padding: '0 20px', border: '1px solid #e4ddcf', background: '#faf7f0', borderRadius: 13, fontSize: 13, fontWeight: 600, color: '#4a463e', cursor: 'pointer' }}>
                  {aiStep === 'done' ? '关闭' : '取消'}
                </button>
              )}
              {aiStep === 'select' && (
                <button
                  onClick={() => { setAiStep('working'); startGeneration(aiSelectedId ?? undefined); }}
                  style={{ height: 42, padding: '0 24px', border: 'none', background: '#a89cf0', color: '#fff', borderRadius: 13, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  🚀 开始生成
                </button>
              )}
              {aiStep === 'done' && (
                <button
                  onClick={handleDownloadDocx}
                  style={{ height: 42, padding: '0 24px', border: 'none', background: '#5fa86b', color: '#fff', borderRadius: 13, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  ⬇️ 下载 Word 文档
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}

      {jobAssistOpen && (
        <Suspense fallback={null}>
          <JobAssistDrawer
            open
            resume={resume}
            files={files}
            onClose={() => setJobAssistOpen(false)}
            getDownloadUrl={fileApi.getDownloadUrl}
            onCreateApplication={onCreateApplication}
            onCreateResumeVersion={onCreateResumeVersion}
          />
        </Suspense>
      )}

      <div className="flex flex-col gap-[9px]">
        {files.length === 0 ? (
          <div style={{ fontSize: 12.5, color: '#a39d90', padding: '4px 2px' }}>暂无文件，点击或拖拽文件到上方区域上传。</div>
        ) : (
          files.map((f) => {
            const isResume = f.kind === 'resume';
            const isAI = f.source === 'ai';
            const iconBg = isAI ? '#ede9fc' : isResume ? '#dcebd5' : '#fbeec2';
            const iconFg = isAI ? '#4a3f96' : isResume ? '#2f5d36' : '#7a5a12';
            const expanded = expandedScripts.has(f.id);
            return (
              <div key={f.id}>
                <div
                  className="flex items-center justify-between gap-3"
                  style={{ border: '1px solid #f0ebe0', borderRadius: expanded ? '13px 13px 0 0' : 13, padding: '11px 14px' }}
                >
                  <div className="flex items-center gap-[11px]" style={{ minWidth: 0 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: iconBg, color: iconFg, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                      {isAI ? <span style={{ fontSize: 14 }}>🤖</span> : <IconFile size={16} />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.file_name}</div>
                      <div style={{ fontSize: 11.5, color: '#a39d90' }}>
                        {isAI ? (isResume ? 'AI 定制简历草稿' : 'AI 生成面试稿件') : isResume ? '简历本体' : '面试稿件'} · {fmtDateTime(f.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-none">
                    {isAI ? (
                      <button
                        onClick={() => setExpandedScripts(prev => {
                          const next = new Set(prev);
                          if (next.has(f.id)) next.delete(f.id); else next.add(f.id);
                          return next;
                        })}
                        className="btn-press"
                        style={dlBtn}
                      >
                        {expanded ? '收起' : '查看'}
                      </button>
                    ) : (
                      <button onClick={() => download(f)} disabled={downloadingId === f.id} className="btn-press" style={dlBtn}>
                        {downloadingId === f.id ? '...' : '下载'}
                      </button>
                    )}
                    <button onClick={() => delFile(f)} aria-label="删除文件" className="btn-press" style={{ ...miniBtn, width: 32, height: 32 }}>
                      <IconTrash size={13} />
                    </button>
                  </div>
                </div>
                {isAI && expanded && f.content && (
                  <div style={{ border: '1px solid #f0ebe0', borderTop: 'none', borderRadius: '0 0 13px 13px', padding: '16px 18px', background: '#faf7f0', fontSize: 13, lineHeight: 1.85, whiteSpace: 'pre-wrap', color: '#2a2720', wordBreak: 'break-word', maxHeight: 480, overflowY: 'auto' }}>
                    {f.content}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function UploadZone({
  title,
  hint,
  busy,
  onClick,
  onFiles,
  compact,
}: {
  title: string;
  hint: string;
  busy: boolean;
  onClick: () => void;
  onFiles: (files: FileList) => void;
  compact?: boolean;
}) {
  const [dragging, setDragging] = useState(false);

  const handleDrag = (event: DragEvent<HTMLButtonElement>, active: boolean) => {
    event.preventDefault();
    event.stopPropagation();
    if (!busy) setDragging(active);
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
    if (!busy && event.dataTransfer.files.length > 0) onFiles(event.dataTransfer.files);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      onDragEnter={(event) => handleDrag(event, true)}
      onDragOver={(event) => handleDrag(event, true)}
      onDragLeave={(event) => handleDrag(event, false)}
      onDrop={handleDrop}
      disabled={busy}
      className="btn-press"
      style={{
        border: dragging ? '1.5px solid #7c5f4b' : '1.5px dashed #d8cfbd',
        background: busy ? '#f3ede1' : dragging ? '#fff4df' : '#faf7f0',
        borderRadius: 14,
        padding: compact ? '12px 12px' : '18px 16px',
        textAlign: 'center',
        cursor: busy ? 'default' : 'pointer',
        width: '100%',
        minHeight: compact ? 70 : 86,
        transition: 'border-color 160ms ease, background 160ms ease, transform 160ms ease',
      }}
    >
      <div style={{ fontSize: compact ? 12 : 13, fontWeight: 700, color: '#4a463e' }}>{busy ? '上传中...' : dragging ? '松开即可上传' : title}</div>
      <div style={{ fontSize: 11, color: '#8f8879', marginTop: compact ? 4 : 6 }}>{dragging ? '文件会保存到当前简历版本' : compact ? hint : `拖拽到这里，或点击选择 · ${hint}`}</div>
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
