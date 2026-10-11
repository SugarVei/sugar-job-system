import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useRef, useState } from 'react';
import type { Application, Interview, InterviewType, MailboxMessage, NewRecord } from '../types';
import { mailSourceMarker, parseMailDate, mailInterviewId } from '../lib/mailInterview';
export default function MailInterviewDraft({ message, accountId, applications, create, onCreated, onCancel }: {
  message: MailboxMessage; accountId: string; applications: Application[];
  create: (payload: NewRecord<Interview>) => Promise<Interview>; onCreated: (interview: Interview) => void; onCancel: () => void;
}) {
  const { user } = useAuth();
  const raw = `${message.subject} ${message.snippet} ${(message.html || '').replace(/<[^>]+>/g, ' ')}`.replace(/&nbsp;/g, ' ');
  const match = applications.find(a => raw.toLowerCase().includes(a.company_name.trim().toLowerCase()) && a.company_name.trim().length > 1);
  const [company, setCompany] = useState(match?.company_name ?? '');
  const [position, setPosition] = useState(match?.position_name ?? raw.match(/([\u4e00-\u9fa5A-Za-z0-9+.#-]{2,24}(?:工程师|分析师|设计师|产品经理|管培生|专员))/)?.[1] ?? '');
  const [when, setWhen] = useState(() => parseMailDate(raw, message.date));
  const [type, setType] = useState<InterviewType | ''>(() => /电话/.test(raw) ? '电话' : /线下|现场|到场/.test(raw) ? '现场' : /线上|视频|腾讯会议|飞书|zoom/i.test(raw) ? '视频' : '');
  const [applicationId, setApplicationId] = useState(match?.id ?? '');
  const [round, setRound] = useState(raw.match(/(一面|二面|三面|终面|HR面|初面)/i)?.[1] ?? '');
  const [error, setError] = useState(''), [saving, setSaving] = useState(false);
  const lock = useRef(false);
  return <form className="sugar-mail-draft sugar-content-enter" aria-label="确认邮件面试安排" onSubmit={async event => {
    event.preventDefault(); if (lock.current) return;
    const date = new Date(when);
    if (!company.trim() || !when || Number.isNaN(date.getTime())) { setError('请确认公司名称和有效的面试时间'); return; }
    lock.current = true; setSaving(true); setError('');
    try {
      if (!user) throw new Error('请先登录');
      const id = await mailInterviewId(user.id, accountId, message);
      const lookup = async () => {
        const { data, error } = await supabase.from('interviews').select('*').eq('id', id).eq('user_id', user.id).maybeSingle();
        if (error) throw new Error(error.message);
        return data as Interview | null;
      };
      const existing = await lookup();
      if (existing) { onCreated(existing); return; }
      const payload = { id, company_name: company.trim(), position_name: position.trim() || null, interview_time: date.toISOString(), interview_type: type || null, round: round.trim() || null, application_id: applicationId || null, notes: `${mailSourceMarker(accountId, message)}\n来源邮件：${message.subject}` };
      try { onCreated(await create(payload)); }
      catch (failure) { const existing = await lookup(); if (existing) onCreated(existing); else throw failure; }
    } catch (error) { setError(`保存失败：${error instanceof Error ? error.message : String(error)}。输入已保留，可重试。`); }
    finally { lock.current = false; setSaving(false); }
  }}>
    <strong style={{ fontSize: 14 }}>确认面试安排</strong><div style={{ fontSize: 11, color: '#8a8478', marginTop: 7 }}>已从邮件中预填可识别的信息，请核对后保存。</div>
    <fieldset disabled={saving} style={{ border: 0, padding: 0, margin: 0 }}><div className="sugar-mail-draft-grid">
      <label>公司名称<input required value={company} onChange={e => setCompany(e.target.value)} /></label>
      <label>岗位<input value={position} onChange={e => setPosition(e.target.value)} /></label>
      <label>面试时间<input type="datetime-local" required value={when} onChange={e => setWhen(e.target.value)} /></label>
      <label>面试形式<select value={type} onChange={e => setType(e.target.value as InterviewType | '')}><option value="">待确认</option>{(['视频', '电话', '现场'] as const).map(t => <option key={t}>{t}</option>)}</select></label>
      <label>面试轮次<input value={round} onChange={e => setRound(e.target.value)} /></label>
      <label>关联投递<select value={applicationId} onChange={e => { setApplicationId(e.target.value); const app = applications.find(a => a.id === e.target.value); if (app) { setCompany(app.company_name); setPosition(app.position_name); } }}><option value="">暂不关联</option>{applications.map(a => <option key={a.id} value={a.id}>{a.company_name} · {a.position_name}</option>)}</select></label>
    </div></fieldset>
    {error && <div className="sugar-inline-error" role="alert">{error}</div>}
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}><button type="button" disabled={saving} onClick={onCancel}>收起</button><button type="submit" disabled={saving} aria-busy={saving}>{saving ? <><span className="sugar-spinner" /> 保存中</> : error ? '重试保存' : '确认并加入日历'}</button></div>
  </form>;
}
