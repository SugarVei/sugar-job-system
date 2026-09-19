import { useMemo, useState, type CSSProperties } from 'react';
import type { Application, ApplicationStatus, Interview } from '../../types';
import { useCollection } from '../../hooks/useCollection';
import { useAppShell } from '../../contexts/AppShellContext';
import { avatarColor, initialOf, statusTag } from '../../lib/appHelpers';
import { APPLICATION_STATUSES, APPLICATION_STATUS_FLOW } from '../../lib/applicationStatus';
import { relatedInterviews, summarizeApplications, timestamp } from '../../lib/applicationsOverview';
import { IconChevronRight, IconClock, IconResumes, IconTrophy } from '../icons';
import './ApplicationsOverview.css';

const STAGE_COLORS = ['#ece5d7', '#ffebaf', '#dfd1f5', '#bddafa', '#a8dddd', '#b3e1ca', '#abd8b2', '#82c99a'];
const PAGE_SIZE = 8;
const OTHER_STATUSES = APPLICATION_STATUSES.filter(status => !APPLICATION_STATUS_FLOW.includes(status as typeof APPLICATION_STATUS_FLOW[number]));
const INTERVIEW_BADGES: Partial<Record<ApplicationStatus, { bg: string; fg: string }>> = {
  'AI面': { bg: '#e4e0f7', fg: '#4a3f96' },
  'HR面': { bg: '#d4efed', fg: '#267779' },
  '一面': { bg: '#dde8fb', fg: '#345b9a' },
  '二面': { bg: '#d4edcd', fg: '#397b32' },
};

function dateLabel(value: string | null, time = false) {
  const date = timestamp(value);
  if (date === null) return time ? '时间待定' : '—';
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric', day: 'numeric',
    ...(new Date(date).getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } as const : {}),
    ...(time ? { hour: '2-digit', minute: '2-digit', hour12: false } as const : {}),
  }).format(date);
}

function StatusBadge({ status }: { status: string }) {
  const tag = APPLICATION_STATUSES.includes(status as ApplicationStatus)
    ? INTERVIEW_BADGES[status as ApplicationStatus] ?? statusTag(status as ApplicationStatus) : { bg: '#ece8fb', fg: '#5a4fb0' };
  return <span className="ao-status" style={{ background: tag.bg, color: tag.fg }}>{status}</span>;
}

function PeopleIcon() {
  return <svg width="29" height="29" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="9" cy="7" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3H3ZM16 4a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v3" />
  </svg>;
}

function ProgressDots({ status }: { status: ApplicationStatus }) {
  const index = APPLICATION_STATUS_FLOW.indexOf(status as typeof APPLICATION_STATUS_FLOW[number]);
  // A terminal/follow-up status contains no history of the last interview round.
  if (index < 0) return <span className="ao-progress-note">{status === '待跟进' ? '等待后续反馈' : '本次流程已归档'}</span>;
  return <div className="ao-progress" role="img" aria-label={`当前阶段：${status}；圆点表示流程位置，不代表历史通过记录`} title={`当前阶段：${status}`}>
    {APPLICATION_STATUS_FLOW.map((step, i) => <span key={step} className={`ao-dot${i < index ? ' is-reached' : ''}${i === index ? ' is-current' : ''}`} />)}
  </div>;
}

interface Props {
  applications: Application[];
  allApplications: Application[];
  filterKey: string;
  onEdit: (application: Application) => void;
  onCreate: () => void;
  onSelectStatus: (status: ApplicationStatus) => void;
  hasRecords: boolean;
}

export default function ApplicationsOverview({ applications, allApplications, filterKey, onEdit, onCreate, onSelectStatus, hasRecords }: Props) {
  const { items: interviews, loading: interviewsLoading, error: interviewsError, refresh } = useCollection<Interview>('interviews');
  const { navigate } = useAppShell();
  const [pagination, setPagination] = useState({ filterKey, page: 0 });
  const page = pagination.filterKey === filterKey ? pagination.page : 0;
  const setPage = (nextPage: number) => setPagination({ filterKey, page: nextPage });
  const summary = useMemo(() => summarizeApplications(applications), [applications]);
  const activity = useMemo(() => relatedInterviews(interviews, applications, Date.now(), allApplications).slice(0, 3), [interviews, applications, allApplications]);
  const sorted = useMemo(() => [...applications].sort((a, b) =>
    (timestamp(b.updated_at) ?? timestamp(b.created_at) ?? 0) - (timestamp(a.updated_at) ?? timestamp(a.created_at) ?? 0)
    || a.company_name.localeCompare(b.company_name, 'zh-CN') || a.id.localeCompare(b.id)), [applications]);
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages - 1);
  const rows = sorted.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const metrics = [
    { label: '累计投递', value: summary.applied, detail: `${summary.companies} 家公司`, title: '当前筛选中的投递记录，不含待投递；同公司多个岗位分别计数', icon: <IconResumes size={29} />, color: '#4c7b54', bg: '#e7f2e3' },
    { label: '面试进行中', value: summary.interviewing, detail: 'AI面 · HR面 · 一面 · 二面', title: '当前处于 AI面、HR面、一面、二面的投递记录数', icon: <PeopleIcon />, color: '#3f75ed', bg: '#e5effc' },
    { label: '获得 Offer', value: summary.offers, detail: '当前投递结果', title: '当前状态为 Offer 的投递记录数', icon: <IconTrophy size={29} />, color: '#397b21', bg: '#e6f4df' },
    { label: '待跟进', value: summary.followUp, detail: '等待下一次推进', title: '当前状态为待跟进的投递记录数', icon: <IconClock size={29} />, color: '#ce6508', bg: '#fff0dc' },
  ];

  return <div className="applications-overview">
    <section className="ao-metrics" aria-label="投递统计">
      {metrics.map(metric => <article className="ao-card ao-metric" key={metric.label} title={metric.title}>
        <div className="ao-metric-icon" style={{ color: metric.color, background: metric.bg }} aria-hidden="true">{metric.icon}</div>
        <div className="ao-metric-copy"><h2>{metric.label}</h2><div className="ao-metric-value">{metric.value}<span>{metric.detail}</span></div></div>
      </article>)}
    </section>

    <div className="ao-middle">
      <section className="ao-card ao-pipeline" aria-labelledby="ao-pipeline-title">
        <h2 id="ao-pipeline-title">投递进度</h2>
        <p className="ao-subtitle">各阶段当前记录数，点击查看对应投递</p>
        <div className="ao-stages" aria-label="投递阶段分布">
          {summary.stages.map(({ status, count }, index) => <button type="button" key={status}
            className="ao-stage" style={{ '--stage-color': STAGE_COLORS[index] } as CSSProperties}
            onClick={() => onSelectStatus(status)} aria-label={`${status}，${count} 条，筛选此阶段`}>
            <span>{status}</span><strong>{count}</strong>
          </button>)}
        </div>
        <div className="ao-other-stages">
          {OTHER_STATUSES.map(status => <button type="button" key={status} onClick={() => onSelectStatus(status)}>
            <span style={{ background: statusTag(status).fg }} />{status}<strong>{summary.counts[status]}</strong>
          </button>)}
        </div>
      </section>

      <section className="ao-card ao-activity" aria-labelledby="ao-activity-title">
        <div className="ao-section-heading"><h2 id="ao-activity-title">面试动态</h2><button className="ao-text-button" type="button" onClick={() => navigate('interviews', { query: '', interviewDate: null })}>查看更多<IconChevronRight size={14} /></button></div>
        {interviewsLoading ? <p className="ao-inline-empty" role="status">正在加载面试安排…</p>
          : interviewsError ? <div className="ao-inline-empty" role="alert">面试安排加载失败<button type="button" className="ao-text-button" onClick={() => void refresh()}>重试</button></div>
          : activity.length === 0 ? <p className="ao-inline-empty">暂无与当前投递匹配的面试安排</p>
          : <ol className="ao-timeline">{activity.map((interview, index) => <li key={interview.id} style={{ '--event-color': ['#5286f5', '#56babc', '#73b773'][index] } as CSSProperties}>
            <button type="button" className="ao-event" onClick={() => navigate('interviews', { query: interview.company_name, interviewDate: null })}>
              <div className="ao-event-copy"><strong>{interview.company_name}{interview.position_name ? ` · ${interview.position_name}` : ''}</strong>
                <span>{dateLabel(interview.interview_time, true)}{interview.interview_type ? ` · ${interview.interview_type}` : ''}</span></div>
              <StatusBadge status={interview.round || '轮次待定'} />
            </button>
          </li>)}</ol>}
      </section>
    </div>

    <section className="ao-card ao-companies" aria-labelledby="ao-companies-title">
      <h2 id="ao-companies-title">公司与岗位进展</h2>
      <p className="ao-subtitle">按公司和岗位查看投递进展</p>
      {rows.length === 0 ? <div className="ao-empty"><p>{hasRecords ? '没有符合当前筛选条件的投递记录' : '还没有投递记录，添加第一家公司开始记录吧'}</p>{!hasRecords && <button type="button" className="ao-page-button" onClick={onCreate}>新增投递</button>}</div>
        : <>
          <div className="ao-table-scroll" tabIndex={0} role="region" aria-label="公司与岗位进展表格">
            <table className="ao-table"><thead><tr><th scope="col">公司</th><th scope="col">岗位</th><th scope="col">当前进度</th><th scope="col">下一步</th><th scope="col">最近更新</th></tr></thead>
              <tbody>{rows.map(application => {
                const avatar = avatarColor(application.company_name);
                return <tr key={application.id}>
                  <td><button className="ao-company-button" type="button" onClick={() => onEdit(application)} aria-label={`编辑 ${application.company_name} · ${application.position_name}`}>
                    <span className="ao-avatar" style={{ color: avatar.fg, background: avatar.bg }} aria-hidden="true">{initialOf(application.company_name)}</span><strong>{application.company_name || '未填写公司'}</strong>
                  </button></td>
                  <td>{application.position_name || '未填写岗位'}</td>
                  <td><div className="ao-progress-cell"><StatusBadge status={application.status} /><ProgressDots status={application.status} /></div></td>
                  <td><div className="ao-next-action">{application.next_action?.trim() || '—'}{application.next_action_at && <span>{dateLabel(application.next_action_at, true)}</span>}</div></td>
                  <td className="ao-updated"><time dateTime={application.updated_at}>{dateLabel(application.updated_at)}</time></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
          <div className="ao-pagination"><span>共 {sorted.length} 条记录</span><div><button type="button" className="ao-page-button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>上一页</button><span aria-live="polite">{currentPage + 1} / {pages}</span><button type="button" className="ao-page-button" disabled={currentPage >= pages - 1} onClick={() => setPage(currentPage + 1)}>下一页</button></div></div>
        </>}
    </section>
  </div>;
}
