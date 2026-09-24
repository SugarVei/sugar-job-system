import { useEffect, useMemo, useState } from 'react';
import type { Application, Interview } from '../types';
import { useApiKeys } from '../contexts/ApiKeysContext';
import Modal from './Modal';
import { GhostButton } from './Field';
import { buildSteps, statusTag } from '../lib/appHelpers';
import { callAIJson } from '../lib/aiChatClient';
import { automaticInterviewCompany, interviewCompanyKey, matchingInterviewPosition, rankInterviewCompanies } from '../lib/interviewApplicationMatch';
import './InterviewApplicationDetails.css';

function dateTime(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

function Detail({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null;
  return <div className="interview-application-field"><span>{label}</span><strong>{value}</strong></div>;
}

export default function InterviewApplicationDetails({ interview, applications, loading, applicationsError, linkError, linking, onClose, onEdit, onLink }: {
  interview: Interview | null;
  applications: Application[];
  loading: boolean;
  applicationsError: string | null;
  linkError: string;
  linking: boolean;
  onClose: () => void;
  onEdit?: (interview: Interview) => void;
  onLink: (interview: Interview, application: Application) => Promise<void>;
}) {
  const { getActiveConfig } = useApiKeys();
  const [chosenCompany, setChosenCompany] = useState<string | null>(null);
  const [aiCompany, setAiCompany] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const candidates = useMemo(() => interview ? rankInterviewCompanies(interview.company_name, applications) : [], [interview, applications]);
  const linked = interview?.application_id ? applications.find(item => item.id === interview.application_id) : null;
  const autoCompany = automaticInterviewCompany(candidates);
  useEffect(() => {
    if (!interview || loading || applicationsError || linked || autoCompany || candidates.length > 0 || applications.length === 0) return;
    const config = getActiveConfig();
    if (!config) return;
    const names = [...new Map(applications
      .map(application => [interviewCompanyKey(application.company_name), application.company_name])).entries()];
    if (names.length === 0 || names.length > 250) return;
    const controller = new AbortController();
    setAiBusy(true);
    void callAIJson<{ index?: unknown; confidence?: unknown }>({
      config,
      signal: controller.signal,
      timeoutMs: 20_000,
      maxTokens: 80,
      messages: [
        { role: 'system', content: '你只做企业名称匹配。识别简称、俗称、数字场次和轻微错字。仅当候选企业身份确定时返回 {"index":从0开始的整数,"confidence":"high"}；不确定时返回 {"index":null,"confidence":"low"}。不得编造候选列表以外的公司，只输出 JSON。' },
        { role: 'user', content: JSON.stringify({ interview_company: interview.company_name, candidate_companies: names.map(([, name]) => name) }) },
      ],
    }).then(result => {
      if (controller.signal.aborted || result.confidence !== 'high' || !Number.isInteger(result.index)) return;
      const index = result.index as number;
      if (index >= 0 && index < names.length) setAiCompany(names[index][0]);
    }).catch(() => {
      // The local candidates and manual search remain available when AI is unavailable.
    }).finally(() => {
      if (!controller.signal.aborted) setAiBusy(false);
    });
    return () => controller.abort();
  }, [interview, loading, applicationsError, linked, autoCompany, applications, candidates, getActiveConfig]);
  const companyKey = chosenCompany ?? (linked ? interviewCompanyKey(linked.company_name) : autoCompany?.key ?? aiCompany);
  const companyApplications = companyKey ? applications.filter(item => interviewCompanyKey(item.company_name) === companyKey) : [];
  const selected = linked && interviewCompanyKey(linked.company_name) === companyKey
    ? linked
    : interview && !chosenCompany ? matchingInterviewPosition(interview, companyApplications) : null;
  const companyName = companyApplications[0]?.company_name;
  const searchGroups = useMemo(() => {
    const term = search.trim().normalize('NFKC').toLocaleLowerCase('zh-CN');
    const groups = new Map<string, { name: string; count: number }>();
    if (!term) return [];
    for (const application of applications) {
      if (![application.company_name, application.position_name].some(value => value.normalize('NFKC').toLocaleLowerCase('zh-CN').includes(term))) continue;
      const key = interviewCompanyKey(application.company_name);
      const group = groups.get(key);
      if (group) group.count++;
      else groups.set(key, { name: application.company_name, count: 1 });
    }
    return [...groups.entries()].slice(0, 30);
  }, [applications, search]);

  return <Modal open={Boolean(interview)} title="面试与投递详情" onClose={onClose} maxWidth={780} footer={interview && <>
    {onEdit && <GhostButton onClick={() => onEdit(interview)}>编辑面试</GhostButton>}
    <GhostButton onClick={onClose}>关闭</GhostButton>
  </>}>
    {interview && <div className="interview-application-details">
      <section className="interview-application-summary">
        <div className="interview-application-eyebrow">面试安排</div>
        <h3>{interview.company_name}<span>{interview.round || '面试'}</span></h3>
        <div className="interview-application-facts">
          <Detail label="时间" value={dateTime(interview.interview_time)} />
          <Detail label="面试岗位" value={interview.position_name} />
          <Detail label="形式" value={interview.interview_type} />
        </div>
        {interview.notes && <p className="interview-application-note">面试备注：{interview.notes}</p>}
      </section>

      <section className="interview-application-records">
        <div className="interview-application-section-head">
          <div><div className="interview-application-eyebrow">投递记录</div><h3>{companyName ? `${companyName} · 投递岗位` : '关联投递公司'}</h3></div>
          <button type="button" onClick={() => setSearchOpen(value => !value)}>{searchOpen ? '收起查找' : '查找其他公司'}</button>
        </div>
        {loading ? <p className="interview-application-hint">正在加载投递记录…</p>
          : applicationsError ? <p className="interview-application-error">投递记录加载失败：{applicationsError}</p>
          : <>
            {!companyKey && candidates.length > 0 && <>
              <p className="interview-application-hint">找到多个可能的公司，请选择正确的一项：</p>
              <div className="interview-application-candidates">{candidates.map(candidate => <button key={candidate.key} type="button" onClick={() => setChosenCompany(candidate.key)}>{candidate.name}<small>{candidate.applications.length} 个岗位</small></button>)}</div>
            </>}
            {!companyKey && candidates.length === 0 && <p className="interview-application-hint">{aiBusy ? '正在识别公司简称…' : '暂未自动找到对应公司。可搜索投递记录并手动关联。'}</p>}
            {companyApplications.length > 0 && <>
              <p className="interview-application-hint">{linked ? '已关联投递记录。' : autoCompany?.key === companyKey && !chosenCompany ? '已根据公司名称找到投递记录。' : aiCompany === companyKey && !chosenCompany ? 'AI 已识别可能对应的公司，请核对岗位。' : '请选择对应的投递岗位。'} 点击岗位可保存关联。</p>
              <div className="interview-application-roles" aria-label="选择投递岗位">
                {companyApplications.map(application => <button key={application.id} type="button" disabled={linking} aria-pressed={selected?.id === application.id} className={selected?.id === application.id ? 'is-selected' : ''} onClick={() => void onLink(interview, application)}>
                  <strong>{application.position_name}</strong><span>{application.status}{application.apply_date ? ` · ${application.apply_date}` : ''}</span>
                </button>)}
              </div>
              {!selected && <p className="interview-application-hint">请选择一个岗位查看投递详情。</p>}
            </>}
            {searchOpen && <div className="interview-application-search">
              <label htmlFor="interview-application-search">搜索公司或岗位</label>
              <input id="interview-application-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="输入公司简称、全称或岗位" />
              {search.trim() && <div className="interview-application-candidates">{searchGroups.length ? searchGroups.map(([key, group]) => <button key={key} type="button" onClick={() => { setChosenCompany(key); setSearchOpen(false); }}>
                {group.name}<small>{group.count} 个岗位</small>
              </button>) : <p className="interview-application-hint">没有找到投递记录。</p>}</div>}
            </div>}
            {linkError && <p className="interview-application-error">{linkError}</p>}
          </>}
      </section>

      {selected && <section className="interview-application-card">
        <div className="interview-application-card-head">
          <h3>{selected.company_name} · {selected.position_name}</h3>
          <span style={{ background: statusTag(selected.status).bg, color: statusTag(selected.status).fg }}>{selected.status}</span>
        </div>
        <div className="interview-application-progress">{buildSteps(selected.status).map(step => <div key={step.idx}>
          <span style={{ background: step.dotBg, color: step.dotFg }}>{step.idx}</span><small style={{ color: step.labelColor, fontWeight: step.labelWeight }}>{step.label}</small>
        </div>)}</div>
        <div className="interview-application-facts">
          <Detail label="城市" value={selected.city} />
          <Detail label="投递渠道" value={selected.channel} />
          <Detail label="投递日期" value={selected.apply_date} />
          <Detail label="薪资范围" value={selected.salary_range} />
          <Detail label="下一步" value={selected.next_action} />
          <Detail label="下一步时间" value={dateTime(selected.next_action_at)} />
          <Detail label="截止时间" value={dateTime(selected.deadline_at)} />
          <Detail label="匹配度" value={selected.match_score == null ? null : `${selected.match_score}/100`} />
        </div>
        {selected.job_url && /^https?:\/\//i.test(selected.job_url) && <a className="interview-application-link" href={selected.job_url} target="_blank" rel="noopener noreferrer">查看岗位链接 ↗</a>}
        {selected.notes && <p className="interview-application-note">投递备注：{selected.notes}</p>}
        {selected.jd_keywords?.length ? <p className="interview-application-note">岗位关键词：{selected.jd_keywords.join('、')}</p> : null}
        {selected.match_summary && <p className="interview-application-note">匹配分析：{selected.match_summary}</p>}
        {selected.jd_text && <details className="interview-application-jd"><summary>查看岗位 JD</summary><p>{selected.jd_text}</p></details>}
      </section>}
    </div>}
  </Modal>;
}
