import { useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowRight, ArrowUpRight, BriefcaseBusiness, CalendarDays, ChevronDown, ChevronRight, FileText, FolderOpen, History, Plus, Upload, X } from 'lucide-react';
import type { Application, Interview, Resume, ResumeFile, ResumeFileKind } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppShell } from '../../contexts/AppShellContext';
import { useCollection } from '../../hooks/useCollection';
import { useResumeFiles } from '../../hooks/useResumeFiles';
import { useToast } from '../Toast';
import MotionTabs from '../MotionTabs';
import { buildDashboardWorkspace, workspaceDate, workspaceTime, type WorkspaceActivity, type WorkspaceActivityKind, type WorkspaceVersion } from '../../lib/dashboardWorkspace';
import './dashboardWorkspace.css';

type Filter = WorkspaceActivityKind | 'all';
type Modal = { type: 'version'; id: string } | { type: 'file'; file: ResumeFile } | { type: 'activity'; item: WorkspaceActivity } | { type: 'library' } | { type: 'history' };
interface Props { applications: Application[]; interviews: Interview[]; loading: boolean; error: string | null; onRetry: () => void }
const labels = { application: '投递', resume: '简历', interview: '面试' };
const icons = { application: BriefcaseBusiness, resume: FileText, interview: CalendarDays };
const filters: { value: Filter; label: string }[] = [{ value: 'all', label: '全部' }, { value: 'application', label: '投递' }, { value: 'resume', label: '简历' }, { value: 'interview', label: '面试' }];
const palettes = {
  peach: { bg: '#f6eee6', surface: '#fff8f0', line: '#eaded2', accent: '#a46545', tint: '#f0dccd' },
  cream: { bg: '#f5f1eb', surface: '#fffaf4', line: '#e6ded2', accent: '#956f4e', tint: '#efe4d5' },
  pink: { bg: '#f5eeec', surface: '#fff9f7', line: '#eadcda', accent: '#9a5b62', tint: '#f0ddde' },
  green: { bg: '#eff1e9', surface: '#fffdf7', line: '#e0e5d7', accent: '#507447', tint: '#e4eddc' },
  blue: { bg: '#eef1f4', surface: '#fafcfe', line: '#dee4eb', accent: '#527390', tint: '#e0e9f0' },
  gray: { bg: '#efefec', surface: '#fcfcf8', line: '#e2e2dc', accent: '#696d65', tint: '#e5e7e0' },
};

function WorkspaceDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.documentElement.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={ref} className="dw-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="dw-dialog-sheet"><header className="dw-dialog-header"><h2 id={titleId}>{title}</h2><button type="button" className="dw-icon-button" aria-label="关闭面板" onClick={onClose}><X size={20} /></button></header>{children}</div>
  </dialog>;
}
function ActivityRow({ item, onOpen }: { item: WorkspaceActivity; onOpen: (item: WorkspaceActivity) => void }) {
  const Icon = icons[item.kind];
  return <button type="button" className="dw-activity-row" onClick={() => onOpen(item)} aria-label={`${labels[item.kind]}：${item.title}，查看详情`}>
    <span className="dw-row-icon"><Icon size={18} /></span><span className="dw-row-copy"><strong title={item.title}>{item.title}</strong><span>{item.subtitle}<i aria-hidden="true">·</i>{workspaceDate(item.updatedAt)}</span></span><ChevronRight size={15} className="dw-row-chevron" />
  </button>;
}
function FileRow({ file, onOpen }: { file: ResumeFile; onOpen: (file: ResumeFile) => void }) {
  const format = file.content && !file.file_path ? '稿件' : file.file_name.split('.').pop()?.toUpperCase() || '文件';
  return <button type="button" className="dw-file-row" onClick={() => onOpen(file)} aria-label={`查看${file.file_name}`}>
    <span className="dw-file-format">{format}</span><span className="dw-row-copy"><strong title={file.file_name}>{file.file_name}</strong><span>{workspaceDate(workspaceTime(file.created_at))}</span></span><ArrowUpRight size={17} />
  </button>;
}

export default function DashboardWorkspaceCards(props: Props) {
  const { user } = useAuth();
  // Reset selection, open panels and pending operations when the account changes.
  return <AccountWorkspace key={user?.id ?? 'signed-out'} {...props} userId={user?.id} />;
}
function AccountWorkspace({ applications, interviews, loading: recordsLoading, error: recordsError, onRetry, userId }: Props & { userId: string | undefined }) {
  const { items: resumes, loading: resumesLoading, error: resumesError, refresh: refreshResumes } = useCollection<Resume>('resumes', { column: 'updated_at', ascending: false });
  const fileApi = useResumeFiles();
  const { themeKey } = useTheme();
  const { navigate } = useAppShell();
  const toast = useToast();
  const { versions, activities } = useMemo(() => buildDashboardWorkspace(userId, resumes, fileApi.files, applications, interviews), [userId, resumes, fileApi.files, applications, interviews]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [kind, setKind] = useState<ResumeFileKind>('resume');
  const [filter, setFilter] = useState<Filter>('all');
  const [modal, setModal] = useState<Modal | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const current = versions.find(version => version.resume.id === selectedId) ?? versions[0];
  const materials = current?.files.filter(file => file.kind === kind) ?? [];
  const matching = filter === 'all' ? activities : activities.filter(item => item.kind === filter);
  const palette = themeKey === 'custom' ? {
    bg: 'var(--sugar-background)', surface: 'var(--sugar-card-2-bg)',
    line: 'var(--sugar-card-2-border)', accent: 'var(--sugar-card-2-fg)', tint: 'var(--sugar-accent-soft)',
  } : palettes[themeKey];
  const style = Object.fromEntries(Object.entries(palette).map(([key, value]) => [`--dw-${key}`, value])) as CSSProperties;
  const loading = recordsLoading || resumesLoading || fileApi.loading;
  const error = recordsError || resumesError || fileApi.error;
  const retry = () => { onRetry(); void refreshResumes(); void fileApi.refresh(); };
  const openFile = (file: ResumeFile) => setModal({ type: 'file', file });
  const openActivity = (item: WorkspaceActivity) => setModal({ type: 'activity', item });
  const close = () => setModal(null);

  const download = async (file: ResumeFile) => {
    if (!file.file_path || busy) return;
    setBusy(true);
    try {
      const url = await fileApi.getDownloadUrl(file.file_path);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.file_name;
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : '文件下载失败，请重试。'); }
    finally { setBusy(false); }
  };
  const upload = async (selected: FileList | null) => {
    if (!current || !selected?.length || busy) return;
    const target = current.resume;
    const materialKind = kind;
    const chosen = Array.from(selected);
    setBusy(true);
    let added = 0;
    try {
      for (const file of chosen) {
        try { await fileApi.upload(target.id, materialKind, file); added++; }
        catch (cause) { toast.error(`${file.name}：${cause instanceof Error ? cause.message : '添加失败，请重试。'}`); }
      }
      if (added) toast.success(`已向「${target.resume_name}」添加 ${added} 份${materialKind === 'resume' ? '简历' : '稿件'}。`);
    } finally { setBusy(false); if (inputRef.current) inputRef.current.value = ''; }
  };
  const versionPanel = (version: WorkspaceVersion) => <>
    <p className="dw-dialog-note">{version.resume.target_position || '尚未设置目标岗位'} · 关联 {version.links} 条投递</p>
    <div className="dw-dialog-files">{version.files.length ? version.files.map(file => <FileRow key={file.id} file={file} onOpen={openFile} />) : <div className="dw-empty"><span>此版本还没有文件，可在工作台添加 PDF 或 DOCX。</span></div>}</div>
    <button type="button" className="dw-primary dw-wide" onClick={() => { close(); navigate('resumes', { query: version.resume.resume_name }); }}><FolderOpen size={17} />在简历库管理</button>
  </>;
  const dialogContent = () => {
    if (!modal) return null;
    if (modal.type === 'file') return <>
      <div className="dw-document-meta"><span>{modal.file.kind === 'script' ? '自我介绍稿' : '简历文件'}</span><span>{workspaceDate(workspaceTime(modal.file.created_at))}</span></div>
      {modal.file.content ? <div className="dw-document-body">{modal.file.content}</div> : <p className="dw-dialog-note">下载文件后，可使用 PDF 阅读器或 Word 查看完整内容。</p>}
      {modal.file.file_path && <button type="button" className="dw-primary dw-wide" disabled={busy} onClick={() => void download(modal.file)}>{busy ? '正在准备文件…' : '下载文件'}<ArrowUpRight size={17} /></button>}
      {!modal.file.content && !modal.file.file_path && <p className="dw-dialog-note">此文件暂不可访问，请在简历库重新添加。</p>}
    </>;
    if (modal.type === 'version') {
      const version = versions.find(item => item.resume.id === modal.id);
      return version ? versionPanel(version) : <div className="dw-empty"><span>这个简历版本已移除。</span></div>;
    }
    if (modal.type === 'library') return <>
      <p className="dw-dialog-note">选择一个版本，回到工作台查看它的简历与自我介绍稿。</p>
      <div className="dw-library-list">{versions.map(version => <button key={version.resume.id} type="button" className="dw-library-row" onClick={() => { setSelectedId(version.resume.id); close(); }}>
        <FileText size={20} /><span className="dw-row-copy"><strong>{version.resume.resume_name}</strong><span>{version.resume.target_position || '目标岗位未填写'} · {version.files.length} 份文件</span></span><ChevronRight size={16} />
      </button>)}</div>
      <button type="button" className="dw-primary dw-wide" onClick={() => { close(); navigate('resumes', { add: true }); }}><Plus size={17} />新增简历版本</button>
    </>;
    if (modal.type === 'history') return <>
      <p className="dw-dialog-note">按记录的最近更新时间排序，每条记录显示一项最近更新。</p>
      <MotionTabs value={filter} onChange={setFilter} options={filters} label="全部更新类型" className="dw-tabs" />
      <div className="dw-history-list">{matching.length ? matching.map(item => <ActivityRow key={item.id} item={item} onOpen={openActivity} />) : <div className="dw-empty"><span>暂无{filter === 'all' ? '' : labels[filter]}更新。</span></div>}</div>
    </>;
    const item = modal.item;
    const related = versions.find(version => version.resume.id === item.resumeId);
    const file = related?.files.find(material => material.id === item.fileId);
    return <>
      <div className="dw-document-meta"><span>{labels[item.kind]}</span><span>{item.subtitle}</span></div>
      <dl className="dw-record-fields">{item.fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {related && <button type="button" className="dw-secondary dw-wide" onClick={() => { setSelectedId(related.resume.id); setModal({ type: 'version', id: related.resume.id }); }}><FileText size={17} />查看关联简历</button>}
      {file ? <button type="button" className="dw-primary dw-wide" onClick={() => openFile(file)}>查看文件<ArrowRight size={16} /></button> : <button type="button" className="dw-primary dw-wide" onClick={() => {
        close();
        if (item.kind === 'interview') navigate('interviews', { query: item.query, interviewDate: item.interviewDate ?? null });
        else navigate(item.kind === 'resume' ? 'resumes' : 'applications', { query: item.query });
      }}>打开{labels[item.kind]}记录<ArrowRight size={16} /></button>}
    </>;
  };
  const title = modal?.type === 'file' ? modal.file.file_name : modal?.type === 'activity' ? modal.item.title : modal?.type === 'library' ? '我的简历版本' : modal?.type === 'history' ? '全部更新' : versions.find(version => modal?.type === 'version' && version.resume.id === modal.id)?.resume.resume_name || '简历版本';
  return <div className="dw-root" style={style}>
    <section className="dw-card" aria-label="简历工作台">
      <header className="dw-card-header"><div><h2>简历工作台</h2><p>版本、文件和自我介绍稿，放在一起。</p></div><button type="button" className="dw-text-button" onClick={() => setModal({ type: 'library' })}>查看全部<ArrowUpRight size={14} /></button></header>
      {resumesLoading ? <div className="dw-empty" role="status"><span>正在读取简历…</span></div> : resumesError ? <div className="dw-inline-error" role="alert">简历暂时无法加载。<button type="button" className="dw-text-button" onClick={retry}>重试</button></div> : current ? <>
        <div className="dw-version-hero"><span className="dw-document-icon"><FileText size={32} strokeWidth={1.35} /></span><div className="dw-version-copy">
          <div className="dw-version-select"><select aria-label="选择简历版本" disabled={busy} value={current.resume.id} onChange={event => setSelectedId(event.target.value)}>{versions.map(version => <option key={version.resume.id} value={version.resume.id}>{version.resume.resume_name}</option>)}</select><ChevronDown size={16} /></div>
          <p>{current.resume.target_position || '尚未设置目标岗位'}</p><small><span>更新于 {workspaceDate(current.updatedAt)}</span><span>·</span><span>关联 {current.links} 条投递</span></small>
        </div></div>
        <MotionTabs value={kind} onChange={setKind} options={[{ value: 'resume', label: `简历文件 ${current.files.filter(file => file.kind === 'resume').length}` }, { value: 'script', label: `自我介绍稿 ${current.files.filter(file => file.kind === 'script').length}` }]} label="简历资料类型" className="dw-tabs" />
        <div className="dw-material-list dw-content-enter" key={`${current.resume.id}:${kind}`}>
          {fileApi.loading ? <div className="dw-empty" role="status"><span>正在读取文件…</span></div> : fileApi.error ? <div className="dw-inline-error" role="alert">文件暂时无法加载。<button type="button" className="dw-text-button" onClick={retry}>重试</button></div> : materials.length ? <>{materials.slice(0, 2).map(file => <FileRow key={file.id} file={file} onOpen={openFile} />)}{materials.length > 2 && <button type="button" className="dw-text-button dw-more-files" onClick={() => setModal({ type: 'version', id: current.resume.id })}>还有 {materials.length - 2} 份文件<ChevronRight size={13} /></button>}</> : <div className="dw-empty"><FileText size={20} /><span>这个版本还没有{kind === 'resume' ? '简历文件' : '自我介绍稿'}。</span></div>}
        </div>
        <div className="dw-card-actions"><button type="button" className="dw-primary" onClick={() => setModal({ type: 'version', id: current.resume.id })}><FolderOpen size={17} />打开版本</button><button type="button" className="dw-secondary" disabled={busy} onClick={() => inputRef.current?.click()}><Upload size={16} />{busy ? '添加中…' : kind === 'resume' ? '添加简历' : '添加稿件'}</button></div>
        <input ref={inputRef} type="file" accept=".pdf,.docx" multiple hidden aria-label="添加简历或自我介绍文件" onChange={event => void upload(event.target.files)} />
      </> : <div className="dw-empty"><FileText size={24} /><span>建立第一个简历版本，把求职资料整理在这里。</span><button type="button" className="dw-primary" onClick={() => navigate('resumes', { add: true })}><Plus size={16} />新增简历</button></div>}
    </section>
    <section className="dw-card dw-updates-card" aria-label="最近更新">
      <header className="dw-card-header"><div><h2>最近更新</h2><p>每一次推进，都有迹可循。</p></div><span className="dw-history-mark"><History size={17} /></span></header>
      <MotionTabs value={filter} onChange={setFilter} options={filters} label="最近更新类型" className="dw-tabs" />
      <div className="dw-activity-list dw-content-enter" key={filter}>
        {loading ? <div className="dw-empty" role="status"><span>正在读取最近更新…</span></div> : error ? <div className="dw-inline-error" role="alert">部分更新暂时无法加载。<button type="button" className="dw-text-button" onClick={retry}>重试</button></div> : matching.length ? matching.slice(0, 3).map(item => <ActivityRow key={item.id} item={item} onOpen={openActivity} />) : <div className="dw-empty"><span>暂无{filter === 'all' ? '' : labels[filter]}更新，新增或修改记录后会出现在这里。</span></div>}
      </div>
      <button type="button" className="dw-updates-all" disabled={loading || !!error} onClick={() => setModal({ type: 'history' })}>查看全部更新<ArrowRight size={14} /></button>
    </section>
    {modal && <WorkspaceDialog title={title} onClose={close}>{dialogContent()}</WorkspaceDialog>}
  </div>;
}
