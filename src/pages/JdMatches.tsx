import { useEffect, useState } from 'react';
import type { Application, JdMatch, MatchLevel, NewJdMatch, RecommendAction, Resume } from '../types';
import { useCollection } from '../hooks/useCollection';
import { useAppShell } from '../contexts/AppShellContext';
import { useTheme } from '../contexts/ThemeContext';
import { CARD } from '../lib/appHelpers';
import { Field, FormError, GhostButton, PrimaryButton, Select, TextArea, TextInput } from '../components/Field';
import EmptyState from '../components/EmptyState';

type State='input'|'analyzing'|'result'|'history';
const WORDS=['Python','SQL','Excel','VBA','CAD','SolidWorks','React','TypeScript','Supabase','生产计划','调度','供应链','BOM','库存','IE','工时','流程优化','数据分析','本科','硕士','研究生','实习','项目','制造','互联网','数据','产品'];
const blank={company_name:'',position_name:'',city:'',salary_range:'',jd_text:'',job_url:'',channel:'',resume_id:''};
const arr=(v:unknown)=>Array.isArray(v)?v.map(String):[];

export default function JdMatches(){
  const matches=useCollection<JdMatch>('jd_matches'); const resumes=useCollection<Resume>('resumes');
  const apps=useCollection<Application>('applications'); const {registerAdd}=useAppShell(); const {theme}=useTheme();
  const [state,setState]=useState<State>('input'); const [form,setForm]=useState(blank); const [current,setCurrent]=useState<JdMatch|null>(null);
  const [progress,setProgress]=useState(0); const [error,setError]=useState(''); const [saving,setSaving]=useState(false);
  const fresh=()=>{setForm(blank);setCurrent(null);setError('');setState('input')};
  useEffect(()=>{registerAdd(fresh);return()=>registerAdd(null)},[registerAdd]);
  const resume=resumes.items.find(x=>x.id===form.resume_id);
  const analyze=async()=>{
    if(!form.jd_text.trim())return setError('请粘贴完整的 JD 文本。'); if(!form.resume_id)return setError('请选择一版简历。');
    setError('');setState('analyzing');setProgress(0);
    for(let i=1;i<=4;i++){await new Promise(r=>setTimeout(r,280));setProgress(i)}
    const jdKeys=WORDS.filter(x=>form.jd_text.toLowerCase().includes(x.toLowerCase()));
    const resumeText=[resume?.resume_name,resume?.target_position,resume?.notes].filter(Boolean).join(' ');
    const resumeKeys=WORDS.filter(x=>resumeText.toLowerCase().includes(x.toLowerCase()));
    const matched=jdKeys.filter(x=>resumeKeys.includes(x)); const missing=jdKeys.filter(x=>!resumeKeys.includes(x));
    const coverage=jdKeys.length?matched.length/jdKeys.length:.35; const score=Math.max(20,Math.min(100,Math.round(35+coverage*60+(form.position_name&&resume?.target_position?.includes(form.position_name)?5:0))));
    const level:MatchLevel=score>=80?'高匹配':score>=60?'中匹配':'低匹配';
    const action:RecommendAction=score>=80?'建议投递':score>=60?'建议修改后投递':'不建议优先投递';
    const payload:NewJdMatch={application_id:null,resume_id:form.resume_id,company_name:form.company_name||null,position_name:form.position_name||null,
      city:form.city||null,salary_range:form.salary_range||null,jd_text:form.jd_text,job_url:form.job_url||null,channel:form.channel||null,
      jd_duties:form.jd_text.split(/[。；\n]/).filter(x=>/负责|职责|工作/.test(x)).slice(0,6),jd_requirements:form.jd_text.split(/[。；\n]/).filter(x=>/要求|熟悉|具备|优先/.test(x)).slice(0,8),
      skill_keywords:jdKeys,industry_keywords:jdKeys.filter(x=>['生产计划','调度','供应链','BOM','库存','制造','互联网','数据','产品'].includes(x)),
      exp_required:(form.jd_text.match(/\d+\s*年[^，。；\n]*/)?.[0]??null),edu_required:['硕士','研究生','本科'].find(x=>form.jd_text.includes(x))??null,
      hidden_requirements:[],match_score:score,match_level:level,recommend_action:action,matched_keywords:matched,missing_keywords:missing,
      strong_exp:matched,weak_exp:missing,risk_note:missing.length?`仍缺少 ${missing.slice(0,5).join('、')} 等关键词。`:'关键词覆盖较完整。',
      suggestions:missing.map(x=>({title:`补充 ${x}`,detail:`在简历中用真实项目或成果体现 ${x}，不要只堆关键词。`})),
      interview_prep:[...matched.slice(0,3),...missing.slice(0,3)].map(x=>`准备一个与 ${x} 相关的具体案例`),
      analysis_summary:`基础规则分析：匹配 ${matched.length} 个关键词，缺少 ${missing.length} 个关键词。`,analysis_method:'基础规则分析',applied:false};
    try{const row=await matches.create(payload);setCurrent(row);setState('result')}catch(e){setError(e instanceof Error?e.message:String(e));setState('input')}
  };
  const apply=async(m:JdMatch)=>{if(m.applied)return;setSaving(true);setError('');try{const app=await apps.create({company_name:m.company_name||'未命名公司',position_name:m.position_name||'未命名岗位',city:m.city,channel:m.channel,apply_date:null,status:'待投递',salary_range:m.salary_range,job_url:m.job_url,notes:null,resume_id:m.resume_id,jd_text:m.jd_text,jd_keywords:m.skill_keywords,match_score:m.match_score,match_summary:m.analysis_summary,next_action:null,next_action_at:null,deadline_at:null,priority:(m.match_score??0)>=80?'high':(m.match_score??0)>=60?'normal':'low'});const updated=await matches.update(m.id,{applied:true,application_id:app.id});setCurrent(updated)}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setSaving(false)}};
  const selectedResume=(m:JdMatch)=>resumes.items.find(x=>x.id===m.resume_id);
  return <div className="flex flex-col gap-[18px] animate-rise">
    <div className="flex flex-wrap justify-between gap-3 p-3" style={{...CARD,borderRadius:18}}><div className="flex gap-2"><GhostButton onClick={()=>setState('history')}>历史分析 ({matches.items.length})</GhostButton><PrimaryButton accent={theme.accent} onClick={fresh}>＋ 新建分析</PrimaryButton></div><span className="text-xs text-[#8a8478] self-center">无 AI Key 也可用 · 结果会保存到账号</span></div>
    {(error||matches.error)&&<FormError message={error||matches.error||''}/>}
    {state==='input'&&<div className="grid lg:grid-cols-[1.4fr_.8fr] gap-4">
      <section style={{...CARD,padding:22}}><h2 className="mt-0">粘贴岗位 JD</h2><div className="grid sm:grid-cols-2 gap-x-3"><Field label="公司名称"><TextInput value={form.company_name} onChange={e=>setForm(v=>({...v,company_name:e.target.value}))}/></Field><Field label="岗位名称"><TextInput value={form.position_name} onChange={e=>setForm(v=>({...v,position_name:e.target.value}))}/></Field><Field label="城市"><TextInput value={form.city} onChange={e=>setForm(v=>({...v,city:e.target.value}))}/></Field><Field label="薪资范围"><TextInput value={form.salary_range} onChange={e=>setForm(v=>({...v,salary_range:e.target.value}))}/></Field></div><Field label="JD 文本 *"><TextArea style={{minHeight:260}} value={form.jd_text} placeholder="粘贴岗位职责、任职要求等完整内容…" onChange={e=>setForm(v=>({...v,jd_text:e.target.value}))}/></Field><div className="grid sm:grid-cols-2 gap-x-3"><Field label="岗位链接"><TextInput value={form.job_url} onChange={e=>setForm(v=>({...v,job_url:e.target.value}))}/></Field><Field label="来源渠道"><TextInput value={form.channel} onChange={e=>setForm(v=>({...v,channel:e.target.value}))}/></Field></div></section>
      <aside style={{...CARD,padding:22}}><h2 className="mt-0">选择简历</h2><Field label="已有简历版本 *"><Select value={form.resume_id} onChange={e=>setForm(v=>({...v,resume_id:e.target.value}))}><option value="">请选择简历</option>{resumes.items.map(x=><option key={x.id} value={x.id}>{x.resume_name}</option>)}</Select></Field>{resume?<div className="rounded-2xl bg-[#faf7f0] p-4 mb-5"><b>{resume.resume_name}</b><p className="text-sm">目标岗位：{resume.target_position||'未填写'}</p><div className="flex flex-wrap gap-2">{WORDS.filter(x=>(resume.notes||'').includes(x)).map(x=><span style={tag} key={x}>{x}</span>)}</div><p className="text-xs text-[#8a8478]">{resume.notes||'暂无简历备注，将主要依据目标岗位分析。'}</p></div>:<EmptyState text="选择一版已有简历后，将展示目标岗位和关键词。"/>}<PrimaryButton accent={theme.accent} onClick={()=>void analyze()} style={{width:'100%'}}>生成匹配分析 →</PrimaryButton></aside>
    </div>}
    {state==='analyzing'&&<section style={{...CARD,padding:32,maxWidth:720,margin:'40px auto',width:'100%'}}><h2>正在生成匹配分析</h2><p className="text-[#8a8478]">使用稳定的基础规则分析，不会伪装成 AI 深度分析。</p>{['正在解析 JD','正在提取关键词','正在匹配简历','正在生成优化建议'].map((x,i)=><div className="flex items-center gap-3 my-5" key={x}><div className="w-9 h-9 rounded-full flex items-center justify-center font-bold" style={{background:i<progress?theme.accent:theme.accentSoft,color:i<progress?'white':theme.accent}}>{i<progress?'✓':i+1}</div><div className="flex-1"><b>{x}</b><div className="h-2 rounded-full bg-[#f0ebe0] mt-2 overflow-hidden"><div className="h-full transition-all" style={{width:i<progress?'100%':'0',background:theme.accent}}/></div></div></div>)}</section>}
    {state==='result'&&current&&<Result m={current} resumeName={selectedResume(current)?.resume_name} accent={theme.accent} onApply={()=>void apply(current)} saving={saving}/>}
    {state==='history'&&(matches.loading?<EmptyState text="正在加载历史分析…"/>:matches.items.length===0?<EmptyState text="粘贴一个岗位 JD，选择一版简历，即可生成匹配分析。" actionLabel="新建分析" onAction={fresh}/>:<div className="grid gap-3">{matches.items.map(m=><article key={m.id} style={{...CARD,padding:20}} className="flex flex-wrap items-center gap-4"><Score value={m.match_score??0} accent={theme.accent}/><div className="flex-1 min-w-[180px]"><h3 className="m-0">{m.company_name||'未命名公司'} · {m.position_name||'未命名岗位'}</h3><p className="text-sm text-[#8a8478]">{selectedResume(m)?.resume_name||'简历已删除'} · {new Date(m.created_at).toLocaleString('zh-CN')}</p><span style={tag}>{m.match_level}</span> {m.applied&&<span style={{...tag,background:'#dcebd5'}}>已投递</span>}</div><div className="flex gap-2"><GhostButton onClick={()=>{setCurrent(m);setState('result')}}>查看结果</GhostButton>{!m.applied&&<PrimaryButton accent={theme.accent} onClick={()=>void apply(m)}>保存为投递</PrimaryButton>}</div></article>)}</div>)}
  </div>
}
function Result({m,resumeName,accent,onApply,saving}:{m:JdMatch;resumeName?:string;accent:string;onApply:()=>void;saving:boolean}){return <div className="grid lg:grid-cols-[.7fr_1.3fr] gap-4"><section style={{...CARD,padding:26,textAlign:'center'}}><Score value={m.match_score??0} accent={accent} large/><h2>{m.match_level}</h2><p className="font-bold" style={{color:accent}}>{m.recommend_action}</p><p className="text-sm text-[#8a8478]">{m.analysis_method} · {resumeName}</p><PrimaryButton accent={accent} onClick={onApply} disabled={m.applied||saving} style={{width:'100%'}}>{m.applied?'已保存到投递记录':saving?'保存中…':'保存为投递记录'}</PrimaryButton></section><div className="grid gap-4"><Panel title="JD 解析结果"><Tags title="技能关键词" values={arr(m.skill_keywords)}/><Tags title="岗位要求" values={arr(m.jd_requirements)}/></Panel><Panel title="简历匹配结果"><Tags title="已匹配" values={arr(m.matched_keywords)} good/><Tags title="缺失关键词" values={arr(m.missing_keywords)}/><p>{m.analysis_summary}</p></Panel><Panel title="修改建议">{Array.isArray(m.suggestions)&&m.suggestions.length?m.suggestions.map((x,i)=><div className="mb-2" key={i}>{typeof x==='object'&&x?`${String((x as Record<string,unknown>).title)}：${String((x as Record<string,unknown>).detail)}`:String(x)}</div>):'暂无'}</Panel><Panel title="面试准备建议">{arr(m.interview_prep).map((x,i)=><p key={i}>• {x}</p>)}</Panel></div></div>}
function Score({value,accent,large}:{value:number;accent:string;large?:boolean}){return <div className={`rounded-full flex items-center justify-center font-bold ${large?'w-36 h-36 text-4xl mx-auto':'w-16 h-16 text-xl'}`} style={{background:`conic-gradient(${accent} ${value}%,#ece7de 0)`,boxShadow:'inset 0 0 0 10px rgba(255,253,250,.85)'}}>{value}</div>}
function Panel({title,children}:{title:string;children:React.ReactNode}){return <section style={{...CARD,padding:22}}><h3 className="mt-0">{title}</h3><div className="text-sm leading-7">{children}</div></section>}
function Tags({title,values,good}:{title:string;values:string[];good?:boolean}){return <div className="mb-3"><b>{title}</b><div className="flex flex-wrap gap-2 mt-2">{values.length?values.map(x=><span key={x} style={{...tag,background:good?'#dcebd5':'#fbeec2'}}>{x}</span>):<span className="text-[#9a9488]">暂无</span>}</div></div>}
const tag:React.CSSProperties={display:'inline-block',fontSize:12,fontWeight:700,padding:'4px 9px',borderRadius:999,background:'#dde8fb'};
