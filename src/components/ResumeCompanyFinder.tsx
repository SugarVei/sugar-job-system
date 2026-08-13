import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import JSZip from 'jszip';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useApiKeys } from '../contexts/ApiKeysContext';
import type { HotCompany } from '../data/hotCompanies';
import { IconFile, IconTrash } from './icons';

const PREFERENCES = ['大公司', '小公司', '外企', '国企', '民企', '互联网', '制造业', '服务业', '新能源', '芯片半导体', '汽车', '金融'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

type Result = { name: string; score: number; reason: string; industry?: string; city?: string; companyType?: string; website?: string };
type ApiResult = { standardMatches: Result[]; privateRecommendations: Result[]; error?: string };

function fileExtension(fileName: string) { return fileName.split('.').pop()?.toLowerCase() ?? ''; }
function safeFileName(fileName: string) { return fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80) || 'resume'; }
function readableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/http 400|bad request|mime|file type|extension/i.test(message)) {
    return '上传失败：请确认文件是未加密的 PDF 或 DOCX，且大小不超过 10MB；文件名无需改成英文。';
  }
  if (/row-level security|permission|unauthorized/i.test(message)) return '上传权限已失效，请刷新页面后重新登录再试。';
  return message || '操作失败，请稍后重试。';
}

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('无法读取文件。'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

async function extractDocxText(file: File) {
  const zip = await JSZip.loadAsync(file);
  const documentXml = await zip.file('word/document.xml')?.async('text');
  if (!documentXml) throw new Error('该 DOCX 文件无法读取，请换一份标准 Word 简历。');
  const text = documentXml
    .replace(/<w:tab[^>]*\/>/g, '\t')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (text.length < 20) throw new Error('没有从 DOCX 中读到足够文字，请换一份可复制文字的简历。');
  return text.slice(0, 60_000);
}

export default function ResumeCompanyFinder({
  standardCompanies,
  onSaved,
}: {
  standardCompanies: HotCompany[];
  onSaved: () => Promise<void> | void;
}) {
  const { user } = useAuth();
  const { requireActiveConfig } = useApiKeys();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preferences, setPreferences] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [consented, setConsented] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<ApiResult | null>(null);

  const standardByName = useMemo(() => new Map(standardCompanies.map((company) => [company.name, company])), [standardCompanies]);

  const chooseFile = (candidate: File | undefined) => {
    setError(''); setResults(null);
    if (!candidate) return;
    const ext = fileExtension(candidate.name);
    if (!['pdf', 'docx'].includes(ext)) { setError('目前支持 PDF 和 DOCX 格式的简历。'); return; }
    if (candidate.size > MAX_FILE_SIZE) { setError('简历文件不能超过 10MB。'); return; }
    setFile(candidate);
  };
  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => chooseFile(event.target.files?.[0]);
  const onDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files?.[0]); };
  const togglePreference = (value: string) => setPreferences((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);

  const analyze = async () => {
    if (!file || !user || loading) return;
    if (!consented) { setError('请先确认同意使用脱敏后的简历内容进行 AI 匹配。'); return; }
    const config = requireActiveConfig('通过简历找公司');
    if (!config) return;
    setLoading(true); setError(''); setResults(null);
    let uploadedPath = '';
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error('登录已失效，请重新登录后再试。');
      const extension = fileExtension(file.name);
      const normalizedBaseName = safeFileName(file.name).replace(/\.[^.]+$/, '') || 'resume';
      uploadedPath = `${user.id}/${Date.now()}_${crypto.randomUUID()}_${normalizedBaseName}.${extension}`;
      const contentType = extension === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const { error: uploadError } = await supabase.storage.from('company-resumes').upload(uploadedPath, file, { upsert: false, contentType });
      if (uploadError) throw uploadError;

      let resumeText: string;
      if (extension === 'pdf') {
        const response = await fetch('/api/profile-resume-parse', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ file_name: file.name, file_data: await fileToDataUrl(file) }) });
        const data = await response.json() as { text?: string; error?: string };
        if (!response.ok || !data.text) throw new Error(data.error || 'PDF 解析失败。');
        resumeText = data.text;
      } else {
        resumeText = await extractDocxText(file);
      }

      const response = await fetch('/api/resume-company-match', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume_text: resumeText,
          preferences,
          standard_companies: standardCompanies.map((company) => ({ name: company.name, industry: company.industry, city: company.city })),
          provider: config.provider,
          api_key: config.apiKey,
          model: config.model,
        }),
      });
      const data = await response.json() as ApiResult;
      if (!response.ok) throw new Error(data.error || 'AI 匹配失败。');

      const { data: run, error: runError } = await supabase
        .from('company_recommendation_runs')
        .insert({ user_id: user.id, resume_file_name: file.name, resume_file_path: uploadedPath, preferences })
        .select('id')
        .single();
      if (runError || !run) throw runError || new Error('无法保存本次分析。');

      const rows = [
        ...(data.standardMatches ?? []).map((item) => {
          const company = standardByName.get(item.name);
          return { user_id: user.id, run_id: run.id, source: 'resume', recommendation_type: 'standard', company_name: item.name, industry: company?.industry ?? null, city: company?.city ?? null, company_type: null, website: company?.url ?? null, match_score: item.score, reason: item.reason };
        }),
        ...(data.privateRecommendations ?? []).map((item) => ({ user_id: user.id, run_id: run.id, source: 'resume', recommendation_type: 'private', company_name: item.name, industry: item.industry || null, city: item.city || null, company_type: item.companyType || null, website: item.website || null, match_score: item.score, reason: item.reason })),
      ];
      if (rows.length) {
        const { error: recommendationError } = await supabase.from('company_recommendations').insert(rows);
        if (recommendationError) throw recommendationError;
      }
      const privateRows = (data.privateRecommendations ?? []).filter((item) => item.name && item.industry);
      if (privateRows.length) {
        const { data: existing } = await supabase.from('companies').select('company_name').eq('user_id', user.id);
        const known = new Set((existing ?? []).map((item) => item.company_name));
        const newCompanies = privateRows.filter((item) => !known.has(item.name)).map((item) => ({
          user_id: user.id, company_name: item.name, industry: item.industry || null, city: item.city || null, scale: item.companyType || null, website: item.website || null, notes: `AI 简历推荐：${item.reason || '建议人工核实岗位与官网信息。'}`,
        }));
        if (newCompanies.length) {
          const { error: companyError } = await supabase.from('companies').insert(newCompanies);
          if (companyError) throw companyError;
        }
      }
      setResults(data);
      await onSaved();
    } catch (caught) {
      if (uploadedPath) await supabase.storage.from('company-resumes').remove([uploadedPath]);
      setError(readableError(caught));
    } finally { setLoading(false); }
  };

  return (
    <section style={{ background: '#fffdf8', border: '1px solid #e0d8c9', borderRadius: 22, padding: 18 }}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 750, color: '#1b1a17' }}>通过简历找公司</h2>
          <p style={{ margin: '5px 0 0', fontSize: 12.5, color: '#8a8478', lineHeight: 1.55 }}>上传简历、选择倾向，AI 会优先从标准公司池中为你筛选合适公司，再补充你的私有候选公司。</p>
        </div>
        <span style={{ fontSize: 12, color: '#9a9488' }}>仅当前账号可见</span>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click(); }}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{ marginTop: 15, border: `1.5px dashed ${dragging ? '#9b633d' : '#d8cbb8'}`, background: dragging ? '#fff6eb' : '#faf7f0', borderRadius: 16, padding: '20px 16px', textAlign: 'center', cursor: 'pointer', transition: '0.16s ease' }}
        aria-label="点击或拖拽上传简历"
      >
        <input ref={inputRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={onInputChange} style={{ display: 'none' }} />
        {file ? (
          <div className="flex items-center justify-center gap-2" style={{ color: '#4f7a56' }}><IconFile size={20} /><span style={{ fontSize: 13.5, fontWeight: 700 }}>{file.name}</span><span style={{ fontSize: 12, fontWeight: 500 }}>（{(file.size / 1024 / 1024).toFixed(1)} MB）</span><button type="button" onClick={(event) => { event.stopPropagation(); setFile(null); setResults(null); }} aria-label="移除简历" style={{ border: 0, background: 'transparent', color: '#8a8478', cursor: 'pointer', display: 'inline-flex' }}><IconTrash size={15} /></button></div>
        ) : (
          <><div style={{ color: '#9b633d', display: 'flex', justifyContent: 'center' }}><IconFile size={24} /></div><div style={{ marginTop: 7, fontSize: 13.5, fontWeight: 700, color: '#4a463e' }}>点击上传，或把简历拖到这里</div><div style={{ marginTop: 4, fontSize: 12, color: '#9a9488' }}>支持 PDF、DOCX，最大 10MB</div></>
        )}
      </div>

      <div style={{ marginTop: 15 }}><div style={{ fontSize: 12.5, fontWeight: 700, color: '#6b665c', marginBottom: 9 }}>公司倾向（可多选）</div><div className="flex flex-wrap gap-2">{PREFERENCES.map((item) => { const selected = preferences.includes(item); return <button key={item} type="button" onClick={() => togglePreference(item)} aria-pressed={selected} style={{ border: `1px solid ${selected ? '#1b1a17' : '#e0d8c9'}`, background: selected ? '#1b1a17' : '#fff', color: selected ? '#fff' : '#6b665c', borderRadius: 999, height: 32, padding: '0 12px', cursor: 'pointer', fontSize: 12.5, fontWeight: 650 }}>{item}</button>; })}</div></div>
      <label className="flex items-start gap-2" style={{ marginTop: 15, color: '#6b665c', fontSize: 12, lineHeight: 1.5, cursor: 'pointer' }}><input type="checkbox" checked={consented} onChange={(event) => setConsented(event.target.checked)} style={{ marginTop: 2, accentColor: '#1b1a17' }} />我同意系统先脱敏手机号、邮箱和身份证号后，将简历内容发送给我配置的 AI 服务商用于本次匹配。</label>
      {error && <div style={{ marginTop: 12, color: '#a23d24', fontSize: 12.5, lineHeight: 1.55 }}>{error}</div>}
      <div className="flex items-center justify-between gap-3 flex-wrap" style={{ marginTop: 15 }}><span style={{ fontSize: 11.5, color: '#9a9488' }}>原文件存入私有空间；标准公司不会被修改。</span><button type="button" onClick={() => void analyze()} disabled={!file || loading} className="btn-press" style={{ border: 0, borderRadius: 12, height: 40, padding: '0 18px', background: !file || loading ? '#d8d0c2' : '#1b1a17', color: '#fffdf8', cursor: !file || loading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 750 }}>{loading ? '正在分析简历…' : '开始匹配公司'}</button></div>

      {results && <div style={{ marginTop: 18, borderTop: '1px solid #ebe3d7', paddingTop: 16 }}>
        <div style={{ fontSize: 13.5, fontWeight: 750, color: '#1b1a17' }}>为你匹配的标准公司</div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3" style={{ marginTop: 10 }}>{results.standardMatches.length ? results.standardMatches.map((item) => <ResultCard key={`standard-${item.name}`} item={{ ...item, industry: standardByName.get(item.name)?.industry, city: standardByName.get(item.name)?.city }} standard />) : <span style={{ fontSize: 12.5, color: '#8a8478' }}>本次没有找到足够贴合的标准公司，可以调整偏好后再试。</span>}</div>
        {results.privateRecommendations.length > 0 && <><div style={{ marginTop: 16, fontSize: 13.5, fontWeight: 750, color: '#1b1a17' }}>为你新增的私有候选公司</div><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3" style={{ marginTop: 10 }}>{results.privateRecommendations.map((item) => <ResultCard key={`private-${item.name}`} item={item} />)}</div></>}
      </div>}
    </section>
  );
}

function ResultCard({ item, standard = false }: { item: Result; standard?: boolean }) {
  return <article style={{ border: '1px solid #e0d8c9', borderRadius: 14, background: standard ? '#f6faf6' : '#fff', padding: 13 }}><div className="flex items-start justify-between gap-2"><div style={{ minWidth: 0 }}><div style={{ fontSize: 13.5, color: '#4a463e', fontWeight: 750 }}>{item.name}</div><div style={{ fontSize: 11.5, color: '#9a9488', marginTop: 3 }}>{[item.industry, item.city, item.companyType].filter(Boolean).join(' · ') || (standard ? '标准公司' : '私有候选')}</div></div><span style={{ flex: 'none', borderRadius: 999, background: standard ? '#dceedd' : '#f4e8d8', color: standard ? '#397245' : '#9b633d', padding: '3px 7px', fontSize: 11.5, fontWeight: 750 }}>{item.score}分</span></div><p style={{ margin: '9px 0 0', fontSize: 12, color: '#6b665c', lineHeight: 1.55 }}>{item.reason}</p>{item.website && <a href={item.website} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 8, color: '#8a5a34', fontSize: 12, fontWeight: 700 }}>查看官网</a>}</article>;
}
