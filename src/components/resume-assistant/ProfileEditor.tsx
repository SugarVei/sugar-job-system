import { useId, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react';
import JSZip from 'jszip';
import { mergeResumeProfiles, normalizeImportedJson, sectionCompleteness, type ProfileMergeStats } from '../../lib/resumeAssistantProfile';
import { resumeAssistantApi } from '../../lib/resumeAssistantApi';
import { PROFILE_SECTIONS, type AiCredentialStatus, type ResumeProfile, type ResumeProfileSection } from '../../types/resumeAssistant';
import './ProfileEditor.css';

type Props = { profile: ResumeProfile; setProfile: (next: ResumeProfile) => void; onSave: () => void; saving: boolean; localOnly: boolean; credential: AiCredentialStatus | null };
type Analysis = { profile: ResumeProfile; stats: ProfileMergeStats };
type FieldProps = { label: string; value: unknown; onChange: (value: string) => void; type?: string; options?: string[]; wide?: boolean; multiline?: boolean; placeholder?: string };

const text = (value: unknown) => Array.isArray(value) ? value.join('，') : String(value ?? '');
const list = (value: string) => value.split(/[，,\n]/).map(item => item.trim()).filter(Boolean);
const objectSection = (profile: ResumeProfile, section: ResumeProfileSection) => profile[section] as Record<string, unknown>;
const arraySection = (profile: ResumeProfile, section: ResumeProfileSection) => profile[section] as Array<Record<string, unknown>>;
const explainedError = (message: string, cause: unknown) => { const error = new Error(message); Object.defineProperty(error, 'cause', { value: cause }); return error; };

function Field({ label, value, onChange, type = 'text', options, wide, multiline, placeholder }: FieldProps) {
  const id = useId();
  return <div className={`profile-field${wide ? ' wide' : ''}`}><label htmlFor={id}>{label}</label>{multiline
    ? <textarea id={id} value={text(value)} placeholder={placeholder} onChange={event => onChange(event.target.value)} />
    : options ? <select id={id} value={text(value)} onChange={event => onChange(event.target.value)}><option value="">请选择</option>{options.map(option => <option key={option}>{option}</option>)}</select>
      : <input id={id} type={type} value={text(value)} placeholder={placeholder} onChange={event => onChange(event.target.value)} />}</div>;
}

function Section({ title, index, open, onToggle, onAdd, children, completeness }: { title: string; index: number; open: boolean; onToggle: () => void; onAdd?: () => void; children: ReactNode; completeness?: number }) {
  return <section className="profile-section"><button type="button" className="profile-section-header" onClick={onToggle}><span className="profile-section-title"><span className="profile-section-index">{index}</span>{title}</span><span className="profile-section-tools">{typeof completeness === 'number' && <span>{completeness}%</span>}{onAdd && <span className="profile-add-btn" role="button" onClick={event => { event.stopPropagation(); onAdd(); }}>＋ 添加</span>}<span>{open ? '⌃' : '⌄'}</span></span></button>{open && <div className="profile-section-body">{children}</div>}</section>;
}

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); });
}

async function readDocx(file: File) {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const xml = await zip.file('word/document.xml')?.async('string');
  if (!xml) throw new Error('DOCX 文件结构无效。');
  return xml.replace(/<w:p[ />]/g, '\n__P__').split('__P__').map(segment => [...segment.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map(match => match[1]).join('')).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function ProfileEditor({ profile, setProfile, onSave, saving, localOnly, credential }: Props) {
  const [openSections, setOpenSections] = useState(() => new Set<ResumeProfileSection>(['personal', 'education']));
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState('');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analysisApplied, setAnalysisApplied] = useState(false);
  const [error, setError] = useState('');
  const [jsonOpen, setJsonOpen] = useState(false);
  const importInput = useRef<HTMLInputElement>(null);
  const resumeInput = useRef<HTMLInputElement>(null);
  const personal = objectSection(profile, 'personal');
  const contact = objectSection(profile, 'contact');
  const identity = objectSection(profile, 'identity');
  const preferences = objectSection(profile, 'preferences');
  const skills = objectSection(profile, 'skills');
  const profileJson = useMemo(() => JSON.stringify(profile, null, 2), [profile]);

  const toggle = (section: ResumeProfileSection) => setOpenSections(current => { const next = new Set(current); if (next.has(section)) next.delete(section); else next.add(section); return next; });
  const setObject = (section: ResumeProfileSection, key: string, value: unknown) => setProfile({ ...profile, [section]: { ...objectSection(profile, section), [key]: value } });
  const setRecord = (section: ResumeProfileSection, index: number, key: string, value: unknown) => {
    const records = [...arraySection(profile, section)]; records[index] = { ...records[index], [key]: value }; setProfile({ ...profile, [section]: records });
  };
  const addRecord = (section: ResumeProfileSection) => { setProfile({ ...profile, [section]: [...arraySection(profile, section), {}] }); setOpenSections(current => new Set(current).add(section)); };
  const removeRecord = (section: ResumeProfileSection, index: number) => setProfile({ ...profile, [section]: arraySection(profile, section).filter((_, itemIndex) => itemIndex !== index) });
  const setNamePart = (key: 'surname' | 'givenName', value: string) => {
    const name = String(personal.name ?? '');
    const surname = key === 'surname' ? value : String(personal.surname ?? name.slice(0, 1));
    const givenName = key === 'givenName' ? value : String(personal.givenName ?? name.slice(1));
    setProfile({ ...profile, personal: { ...personal, surname, givenName, name: `${surname}${givenName}` } });
  };

  const acceptResume = (file?: File) => {
    if (!file) return;
    if (!/\.(pdf|docx|txt)$/i.test(file.name)) { setError('请选择 PDF、DOCX 或 TXT 简历。'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('简历文件不能超过 10MB。'); return; }
    setResumeFile(file); setAnalysis(null); setAnalysisApplied(false); setError('');
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(false); acceptResume(event.dataTransfer.files[0]); };
  const extractText = async (file: File) => {
    if (/\.docx$/i.test(file.name)) return readDocx(file);
    if (/\.txt$/i.test(file.name)) return file.text();
    return (await resumeAssistantApi.parseResumePdf(file.name, await fileToDataUrl(file))).text;
  };
  const analyze = async () => {
    if (!resumeFile) { setError('请先选择一份简历。'); return; }
    if (!credential) { setError('请先到“插件与 AI”页面配置并测试 AI Key。'); return; }
    setAnalyzing(true); setAnalysisStatus('正在读取简历…'); setError(''); setAnalysis(null); setAnalysisApplied(false);
    try {
      let resumeText = '';
      try { resumeText = await extractText(resumeFile); }
      catch (cause) { throw explainedError(`简历读取失败：${cause instanceof Error ? cause.message : '无法解析文件。'}`, cause); }
      setAnalysisStatus('正在调用 AI 分析…');
      let result: { profile: ResumeProfile };
      try { result = await resumeAssistantApi.analyzeResumeProfile(resumeText); }
      catch (cause) { throw explainedError(`AI 分析失败：${cause instanceof Error ? cause.message : '服务暂时不可用。'}`, cause); }
      const merged = mergeResumeProfiles(profile, normalizeImportedJson(result.profile));
      setAnalysis(merged);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'AI 分析失败。'); }
    finally { setAnalyzing(false); setAnalysisStatus(''); }
  };
  const applyAnalysis = () => { if (!analysis) return; setProfile(analysis.profile); setAnalysisApplied(true); };
  const importJson = (file?: File) => { if (!file) return; const reader = new FileReader(); reader.onload = () => { try { setProfile(normalizeImportedJson(JSON.parse(String(reader.result)))); setError(''); } catch { setError('JSON 导入失败，请检查文件格式。'); } }; reader.readAsText(file); };
  const downloadJson = () => { const url = URL.createObjectURL(new Blob([profileJson], { type: 'application/json' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `sugar-resume-profile-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url); };

  const repeatable = (section: 'education' | 'internships' | 'work' | 'projects', title: string, fields: Array<{ key: string; label: string; type?: string; wide?: boolean; multiline?: boolean; list?: boolean; options?: string[] }>) => {
    const records = arraySection(profile, section);
    return <Section title={title} index={PROFILE_SECTIONS.findIndex(item => item.key === section) + 1} open={openSections.has(section)} onToggle={() => toggle(section)} onAdd={() => addRecord(section)} completeness={sectionCompleteness(profile, section)}>{records.length ? records.map((record, index) => <div className="profile-entry" key={`${section}-${index}`}><div className="profile-entry-head"><span>{title}（{index + 1}）</span><button type="button" className="profile-link-btn" onClick={() => removeRecord(section, index)}>删除</button></div><div className="profile-grid">{fields.map(field => <Field key={field.key} label={field.label} value={field.list ? (Array.isArray(record[field.key]) ? record[field.key] : text(record[field.key])) : record[field.key]} type={field.type} wide={field.wide} multiline={field.multiline} options={field.options} onChange={value => setRecord(section, index, field.key, field.list ? list(value) : value)} />)}</div></div>) : <p className="profile-help">还没有{title}，点击右上角“添加”开始填写。</p>}</Section>;
  };

  const surname = String(personal.surname ?? text(personal.name).slice(0, 1));
  const givenName = String(personal.givenName ?? text(personal.name).slice(1));
  const currentStep = saving ? 4 : analysisApplied ? 3 : analyzing || analysis ? 2 : 1;
  return <div className="profile-workspace">
    <div className="profile-flow">{['填写资料', 'AI 分析', '确认结果', '保存并同步'].map((label, index) => { const step = index + 1; return <div className={`profile-step ${step === currentStep ? 'active' : ''} ${step < currentStep ? 'done' : ''}`} key={label}><span className="profile-step-number">{step < currentStep ? '✓' : step}</span><span>{label}</span></div>; })}</div>
    <div className="profile-layout"><div className="profile-form-shell">
      <Section title="基本信息" index={1} open={openSections.has('personal')} onToggle={() => toggle('personal')} completeness={Math.round((sectionCompleteness(profile, 'personal') + sectionCompleteness(profile, 'contact') + sectionCompleteness(profile, 'preferences')) / 3)}><div className="profile-grid four">
        <Field label="姓 *" value={surname} onChange={value => setNamePart('surname', value)} /><Field label="名 *" value={givenName} onChange={value => setNamePart('givenName', value)} />
        <Field label="性别 *" value={personal.gender} options={['男', '女', '其他']} onChange={value => setObject('personal', 'gender', value)} /><Field label="出生日期" type="date" value={personal.birthDate} onChange={value => setObject('personal', 'birthDate', value)} />
        <Field label="国家/地区" value={personal.nationality} placeholder="中国大陆" onChange={value => setObject('personal', 'nationality', value)} /><Field label="民族" value={personal.ethnicity} onChange={value => setObject('personal', 'ethnicity', value)} />
        <Field label="手机号码 *" value={contact.phone} onChange={value => setObject('contact', 'phone', value)} /><Field label="电子邮箱 *" type="email" value={contact.email} onChange={value => setObject('contact', 'email', value)} />
        <Field label="微信号" value={contact.wechat} onChange={value => setObject('contact', 'wechat', value)} /><Field label="当前居住城市" value={personal.currentResidence} onChange={value => setObject('personal', 'currentResidence', value)} />
        <Field label="期望工作城市（逗号分隔）" value={preferences.preferredCities} onChange={value => setObject('preferences', 'preferredCities', list(value))} /><Field label="目标岗位（逗号分隔）" value={preferences.targetRoles} onChange={value => setObject('preferences', 'targetRoles', list(value))} />
        <Field label="身份证号" value={identity.idNumber} wide onChange={value => setObject('identity', 'idNumber', value)} />
      </div><p className="profile-help"><span className="profile-lock">🔒 敏感信息仅保存在本机</span> 身份证号和详细地址不会发送给 AI，也不会保存到云端；手机号和邮箱会随标准资料同步给插件。</p></Section>
      {repeatable('education', '教育经历', [{ key: 'school', label: '学校 *' }, { key: 'degree', label: '学历 *', options: ['大专', '本科', '硕士研究生', '博士研究生'] }, { key: 'college', label: '院系' }, { key: 'major', label: '专业 *' }, { key: 'studyMode', label: '培养方式', options: ['全日制', '非全日制'] }, { key: 'startDate', label: '开始时间', type: 'month' }, { key: 'endDate', label: '结束时间', type: 'month' }, { key: 'ranking', label: '年级排名' }, { key: 'researchDirection', label: '研究方向', wide: true }])}
      {repeatable('internships', '实习经历', [{ key: 'company', label: '公司名称 *' }, { key: 'industry', label: '行业类别' }, { key: 'title', label: '职位 *' }, { key: 'location', label: '地点' }, { key: 'startDate', label: '开始时间', type: 'month' }, { key: 'endDate', label: '结束时间', type: 'month' }, { key: 'highlights', label: '工作描述（每行一条）', wide: true, multiline: true, list: true }])}
      {repeatable('work', '工作经历', [{ key: 'company', label: '公司名称 *' }, { key: 'title', label: '职位 *' }, { key: 'startDate', label: '开始时间', type: 'month' }, { key: 'endDate', label: '结束时间', type: 'month' }, { key: 'highlights', label: '工作描述（每行一条）', wide: true, multiline: true, list: true }])}
      {repeatable('projects', '项目经历', [{ key: 'name', label: '项目名称 *' }, { key: 'role', label: '项目职责 *' }, { key: 'startDate', label: '开始时间', type: 'month' }, { key: 'endDate', label: '结束时间', type: 'month' }, { key: 'highlights', label: '项目描述（每行一条）', wide: true, multiline: true, list: true }])}
      <Section title="技能与语言" index={6} open={openSections.has('skills')} onToggle={() => toggle('skills')} completeness={sectionCompleteness(profile, 'skills')}><div className="profile-grid"><Field label="英语等级" value={skills.englishLevel} onChange={value => setObject('skills', 'englishLevel', value)} /><Field label="英语成绩" value={skills.englishScore} onChange={value => setObject('skills', 'englishScore', value)} /><Field label="编程能力（逗号分隔）" value={skills.programming} onChange={value => setObject('skills', 'programming', list(value))} /><Field label="软件技能（逗号分隔）" value={skills.software} onChange={value => setObject('skills', 'software', list(value))} /><Field label="特长和爱好（逗号分隔）" value={skills.hobbies} wide onChange={value => setObject('skills', 'hobbies', list(value))} /></div></Section>
    </div><aside className="profile-ai-panel"><h3 className="profile-ai-title"><span style={{ color: '#d80b55' }}>✦</span> AI 简历分析</h3><p className="profile-ai-note">上传简历后，AI 会提取教育、经历、项目和技能，并与手工资料合并。手工内容优先，AI 只补全空字段。</p><input ref={resumeInput} hidden type="file" accept=".pdf,.docx,.txt" onChange={event => acceptResume(event.target.files?.[0])} /><div className={`profile-dropzone${dragging ? ' dragging' : ''}`} onClick={() => resumeInput.current?.click()} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}><div><div style={{ fontSize: 30, marginBottom: 8 }}>▤</div><strong>拖拽简历到此处，或点击上传</strong><span>支持 PDF、DOCX、TXT，不超过 10MB</span></div></div>{resumeFile && <div className="profile-file"><span>{resumeFile.name}</span><button type="button" className="profile-link-btn" onClick={() => { setResumeFile(null); setAnalysis(null); }}>移除</button></div>}<div className="profile-lock">✓ 默认排除身份证、手机号、邮箱等敏感字段</div><button type="button" className="profile-primary" disabled={analyzing || !resumeFile} onClick={() => void analyze()}>{analyzing ? analysisStatus : '开始 AI 分析'}</button>{!credential && <p className="profile-help">尚未配置 AI Key，请先前往“插件与 AI”页面配置。</p>}{error && <p className="profile-error">{error}</p>}{analysis && <div className="profile-ai-result"><strong>分析结果</strong><div className="profile-ai-stats"><div className="profile-ai-stat"><strong>{analysis.stats.recognized}</strong>识别项</div><div className="profile-ai-stat"><strong>{analysis.stats.added}</strong>新增项</div><div className="profile-ai-stat"><strong>{analysis.stats.conflicts}</strong>冲突项</div></div><p className="profile-help">冲突项保留你的手工内容，不会被 AI 覆盖。</p><button type="button" className="profile-secondary" onClick={applyAnalysis}>{analysisApplied ? '✓ 已应用到表单' : '查看并应用补全结果'}</button></div>}<div className="profile-side-actions"><p className="profile-help">{localOnly ? '当前为本机草稿；云端恢复后可保存同步。' : '资料将保存到网站，并同步给已连接的浏览器插件。'}</p><div className="profile-side-action-buttons"><input ref={importInput} type="file" accept="application/json" hidden onChange={event => importJson(event.target.files?.[0])} /><button type="button" className="profile-secondary" onClick={() => importInput.current?.click()}>导入 JSON</button><button type="button" className="profile-secondary" onClick={() => setJsonOpen(true)}>预览 JSON</button><button type="button" className="profile-primary" disabled={saving} onClick={onSave}>{saving ? '保存中…' : localOnly ? '保存本机草稿' : '保存并同步'}</button></div></div></aside></div>
    {jsonOpen && <div className="profile-modal-backdrop" role="dialog" aria-modal="true" aria-label="标准资料 JSON 预览" onMouseDown={event => { if (event.currentTarget === event.target) setJsonOpen(false); }}><div className="profile-modal"><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}><div><h3 style={{ margin: 0 }}>标准资料 JSON</h3><p className="profile-help">这是插件使用的结构化资料。身份证等本机敏感字段不会上传云端。</p></div><button type="button" className="profile-link-btn" onClick={() => setJsonOpen(false)}>关闭</button></div><textarea className="profile-json" readOnly value={profileJson} /><div className="profile-actions" style={{ justifyContent: 'flex-end', marginTop: 12 }}><button type="button" className="profile-secondary" onClick={downloadJson}>下载 JSON 文件</button><button type="button" className="profile-primary" onClick={() => setJsonOpen(false)}>确认</button></div></div></div>}
  </div>;
}
