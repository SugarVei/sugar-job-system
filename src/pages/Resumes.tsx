import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { DragEvent } from 'react';
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
          保存后，可在卡片上的“上传简历 / 上传面试稿件”区域上传 PDF/Word 文件。
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
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiResumeText, setAiResumeText] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiStreamText, setAiStreamText] = useState('');
  const [aiDone, setAiDone] = useState(false);
  const [expandedScripts, setExpandedScripts] = useState<Set<string>>(new Set());
  const aiTextareaRef = useRef<HTMLTextAreaElement>(null);

  const closeAiModal = () => { setAiModalOpen(false); setAiStreamText(''); setAiDone(false); };

  // 锁定 body 滚动 + ESC 关闭
  useEffect(() => {
    if (!aiModalOpen) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeAiModal(); };
    document.addEventListener('keydown', onKey);
    setTimeout(() => aiTextareaRef.current?.focus(), 120);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiModalOpen]);

  const handleFiles = async (kind: ResumeFileKind, list: FileList | null) => {
    if (!list || list.length === 0) return;

    setUploadingKind(kind);
    try {
      for (const file of Array.from(list)) {
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

  const generateAIScript = async () => {
    if (!aiResumeText.trim()) { alert('请先粘贴简历内容'); return; }
    setAiGenerating(true);
    setAiStreamText('');
    setAiDone(false);

    const SYSTEM_PROMPT = `你现在是一名资深求职面试辅导老师，请根据我提供的简历内容，帮我生成一份"实习面试稿件"。

要求你严格围绕我的简历内容展开，不要编造不存在的经历。如果简历中信息不足，可以用【需要我补充】标注。

我的目标是：准备实习面试，希望能够流畅、自信、逻辑清楚地回答面试官的问题。

请你按照以下结构输出：

一、1分钟中文自我介绍
要求：
1. 语言自然，不要太像背稿；
2. 体现我的学历背景、研究方向、项目经历、技能优势和求职意向；
3. 控制在面试时1分钟左右能说完；
4. 适合实习面试场景。

二、3分钟中文自我介绍
要求：
1. 比1分钟版本更完整；
2. 按照"教育背景—研究/项目经历—技能能力—岗位匹配—求职动机"的逻辑展开；
3. 重点突出我简历中最有竞争力的经历；
4. 语言要稳重、真实，不要夸张。

三、面试官高频问题与参考回答
请至少生成25个问题，分为以下类别：
1. 基础类问题
2. 简历深挖类问题（根据每段经历设计追问）
3. 论文/科研/项目类问题
4. 技能类问题（Python、R、SQL、Excel、建模等）
5. 行为面试问题
6. 压力面试问题
每个问题都给出参考回答，回答使用"背景—任务—方法—结果—反思"结构。

四、根据我的简历，指出面试官最可能重点追问的5个地方
每个地方说明：为什么容易被追问、可能问什么、应该怎么答、哪些话不要说。

五、项目经历讲述模板
选择最重要的1-2个项目，按照：项目背景、目标、我负责的内容、使用方法/工具、遇到的问题、解决方案、最终结果、体现的能力。

六、反问面试官的问题
给我10个适合实习生在面试最后反问的问题，每个说明为什么适合问。

七、面试前速记版
用条目形式整理：自我介绍关键词、项目关键词、技能关键词、优势关键词。

语言要求：真实、清晰、不油腻、不像AI生成、适合硕士研究生/实习生表达，不使用"赋能""闭环""抓手""沉淀""深度参与"等模板词。`;

    let fullText = '';
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `以下是我的简历内容：\n\n${aiResumeText}` },
          ],
          maxTokens: 8192,
        }),
      });

      if (!res.body) throw new Error('无响应流');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const json = JSON.parse(data);
            if (json.error) throw new Error(json.error);
            const token: string | undefined = json.choices?.[0]?.delta?.content;
            if (token) {
              fullText += token;
              setAiStreamText(fullText);
            }
          } catch { /* skip */ }
        }
      }

      if (fullText) {
        await fileApi.saveAIScript(resume.id, resume.resume_name, fullText);
        setAiDone(true);
      }
    } catch (e) {
      alert('AI 生成失败：' + errorText(e));
    } finally {
      setAiGenerating(false);
    }
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

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3" style={{ margin: '4px 0 14px', alignItems: 'stretch' }}>
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
          hint="PDF / DOC / DOCX"
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
          onClick={() => { setAiModalOpen(true); setAiStreamText(''); setAiDone(false); setAiResumeText(''); }}
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
          <span style={{ fontSize: 12, fontWeight: 700, color: '#4a3f96', lineHeight: 1.3 }}>AI 生成<br />面试稿件</span>
        </button>
      </div>

      {/* AI 生成弹窗 —— 用 Portal 渲染到 body，避免被卡片 stacking context 遮挡 */}
      {aiModalOpen && createPortal(
        <div
          onClick={closeAiModal}
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
                <div style={{ fontSize: 12, color: '#8a8478', marginTop: 3 }}>粘贴简历文本，DeepSeek 将根据专业模板生成完整面试稿</div>
              </div>
              <button onClick={closeAiModal} style={{ width: 34, height: 34, border: '1px solid #e4ddcf', background: '#faf7f0', borderRadius: 10, cursor: 'pointer', color: '#8a8478', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px' }}>
              {!aiGenerating && !aiDone && (
                <>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#4a463e', display: 'block', marginBottom: 8 }}>
                    粘贴你的简历内容（复制 PDF 或 Word 中的文字即可）
                  </label>
                  <textarea
                    ref={aiTextareaRef}
                    value={aiResumeText}
                    onChange={e => setAiResumeText(e.target.value)}
                    placeholder={'姓名：...\n教育背景：...\n项目经历：...\n技能：...'}
                    rows={12}
                    style={{ width: '100%', resize: 'vertical', border: '1.5px solid #e4ddcf', borderRadius: 12, padding: '12px 14px', fontSize: 13, lineHeight: 1.6, outline: 'none', background: '#faf7f0', color: '#1b1a17', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                  <p style={{ fontSize: 12, color: '#a39d90', marginTop: 8 }}>提示：内容越详细，生成质量越高。预计生成时间 30-90 秒。</p>
                </>
              )}
              {(aiGenerating || aiDone) && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#4a463e', marginBottom: 12 }}>
                    {aiGenerating ? '🔄 AI 正在生成中，请稍候…' : '✅ 生成完成，已保存到简历文件列表'}
                  </div>
                  <div style={{ background: '#faf7f0', border: '1px solid #f0ebe0', borderRadius: 12, padding: '14px 16px', fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap', maxHeight: 400, overflowY: 'auto', color: '#2a2720', wordBreak: 'break-word' }}>
                    {aiStreamText || '▌'}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 24px 20px', borderTop: '1px solid #f0ebe0', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
              <button onClick={closeAiModal} style={{ height: 42, padding: '0 20px', border: '1px solid #e4ddcf', background: '#faf7f0', borderRadius: 13, fontSize: 13, fontWeight: 600, color: '#4a463e', cursor: 'pointer' }}>
                {aiDone ? '关闭' : '取消'}
              </button>
              {!aiGenerating && !aiDone && (
                <button
                  onClick={generateAIScript}
                  disabled={!aiResumeText.trim()}
                  style={{ height: 42, padding: '0 24px', border: 'none', background: !aiResumeText.trim() ? '#c8c0f0' : '#a89cf0', color: '#fff', borderRadius: 13, fontSize: 13, fontWeight: 700, cursor: !aiResumeText.trim() ? 'not-allowed' : 'pointer' }}
                >
                  🚀 开始生成
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body,
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
                        {isAI ? 'AI 生成稿件' : isResume ? '简历本体' : '面试稿件'} · {fmtDateTime(f.created_at)}
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
