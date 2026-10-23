import { useMemo, useState, type ReactNode } from 'react';
import type { DateTime } from 'luxon';
import { interviewDate } from '../lib/interviewCalendar';
import type { Application, ApplicationPriority, ApplicationStatus, Interview } from '../types';
import { useCollection } from '../hooks/useCollection';
import { useProfile } from '../hooks/useProfile';
import { useAppShell } from '../contexts/AppShellContext';
import { useTheme } from '../contexts/ThemeContext';
import { greetFor } from '../components/navConfig';
import {
  IconApplications,
  IconClock,
  IconInterviews,
  IconOverview,
  IconTrophy,
} from '../components/icons';
import { STATUS_OPTIONS } from '../lib/appHelpers';
import { normalizeApplicationCity } from '../lib/applicationsOverview';
import AIChatDialog from '../components/AIChatDialog';
import OverviewTrendCard from '../components/OverviewTrendCard';
import ActionQueueOrbit from '../components/dashboard/ActionQueueOrbit';
import RecentInterviewFolder from '../components/dashboard/RecentInterviewFolder';
import StatusDistributionCard from '../components/dashboard/StatusDistributionCard';
import ApplicationDistributionCard from '../components/dashboard/ApplicationDistributionCard';
import ApiBalanceStrip from '../components/dashboard/ApiBalanceStrip';
import { dashboardPaletteStyle } from '../components/dashboard/dashboardPalette';
import '../components/dashboard/dashboardOverview.css';

// ============================================================
// 总览 —— 上半部分是今天要做的事，下半部分是原「投递总览」的整体进展
// ============================================================

function priorityRank(priority: ApplicationPriority | null | undefined) {
  return priority === 'urgent' ? 4 : priority === 'high' ? 3 : priority === 'normal' ? 2 : 1;
}

function timeValue(value: string | null) {
  if (!value) return Number.POSITIVE_INFINITY;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

function isClosedStatus(status: string) {
  return ['Offer', '已拒绝', '已放弃', '人才库'].includes(status);
}

function urgencyScore(app: Application, now: Date) {
  const nowTime = now.getTime();
  const deadline = timeValue(app.deadline_at);
  const nextAction = timeValue(app.next_action_at);
  const overdue = deadline < nowTime || nextAction < nowTime;
  return (
    (overdue ? 1000 : 0) +
    priorityRank(app.priority) * 100 +
    (app.status === '待跟进' ? 50 : 0) -
    Math.min(deadline, nextAction, nowTime + 365 * 86400000) / 100000000000
  );
}

function pct(n: number, total: number) {
  if (!total) return '0%';
  return `${Math.round((n / total) * 100)}%`;
}

export default function Dashboard() {
  const { items: apps, loading: appsLoading, error: appsError, refresh: refreshApps } = useCollection<Application>('applications');
  const { items: interviews, loading: interviewsLoading, error: interviewsError, refresh: refreshInterviews } = useCollection<Interview>('interviews', {
    column: 'interview_time',
    ascending: true,
  });
  const { navigate, triggerAdd } = useAppShell();
  const { themeKey } = useTheme();
  const { name } = useProfile();
  const [activeStatus, setActiveStatus] = useState<ApplicationStatus | null>(null);

  const now = new Date();
  const calendarNow = interviewDate();

  const stats = useMemo(() => {
    const nowTime = now.getTime();
    const total = apps.length;
    const active = apps.filter((a) => !isClosedStatus(a.status));
    const interviewing = apps.filter((a) => ['一面', '二面', 'AI面', 'HR面', 'Offer'].includes(a.status)).length;
    const offers = apps.filter((a) => a.status === 'Offer').length;
    const followUps = active.filter((a) => a.status === '待跟进');
    const dueSoon = active.filter((a) => timeValue(a.deadline_at) <= nowTime + 3 * 86400000);
    const todo = new Set([...followUps, ...dueSoon].map((a) => a.id)).size;

    const weekStart = interviewDate().startOf('week');
    const weekEnd = weekStart.plus({ weeks: 1 });
    const weekInterviews = interviews.filter((iv) => {
      if (!iv.interview_time) return false;
      const t = interviewDate(iv.interview_time);
      return t >= weekStart && t < weekEnd;
    }).length;

    return { total, inProgress: active.length, interviewing, offers, followUps: followUps.length, dueSoon: dueSoon.length, todo, weekInterviews };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apps, interviews]);

  const activeApps = useMemo(
    () =>
      apps
        .filter((a) => !isClosedStatus(a.status))
        .sort((a, b) => urgencyScore(b, now) - urgencyScore(a, now)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apps],
  );

  const monthDays = useMemo(() => buildMonth(calendarNow, interviews), [interviews]); // eslint-disable-line react-hooks/exhaustive-deps
  const aiSystemPrompt = useMemo(() => buildAiSystemPrompt(apps), [apps]);

  const handleViewDetail = (app: Application) => {
    navigate('applications', { query: app.company_name });
  };

  return (
    <div className="do-root flex flex-col gap-5 animate-rise" style={dashboardPaletteStyle(themeKey)}>
      <div className="do-greeting">
        <div>
          <h2>{greetFor('dashboard', name).title}</h2>
          <p>
            {stats.dueSoon > 0
              ? <>今天有 <b>{stats.dueSoon}</b> 件事临近截止，先把它们处理掉</>
              : '近 3 天没有临近截止的投递，按自己的节奏推进就好'}
          </p>
        </div>
        {apps.length > 0 && (
          <AIChatDialog systemPrompt={aiSystemPrompt} placeholder="问我任何关于你的投递情况的问题…" buttonLabel="AI 投递分析" />
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          label="投递总数"
          value={stats.total}
          sub={<>进行中 <b>{stats.inProgress}</b> · 已结束 {stats.total - stats.inProgress}</>}
          tone="neutral"
          icon={<IconApplications size={21} />}
          onClick={() => navigate('applications', { applicationsFilter: 'all' })}
          hint="全部投递记录"
        />
        <Kpi
          label="进入面试"
          value={stats.interviewing}
          sub={<>进面率 <b>{pct(stats.interviewing, stats.total)}</b> · 本周 <b>{stats.weekInterviews}</b> 场</>}
          tone="interview"
          icon={<IconInterviews size={21} />}
          onClick={() => navigate('interviews')}
          hint="打开面试日历"
        />
        <Kpi
          label="已获 Offer"
          value={stats.offers}
          sub={<>Offer 率 <b>{pct(stats.offers, stats.total)}</b></>}
          tone="success"
          icon={<IconTrophy size={21} />}
          onClick={() => navigate('applications', { applicationsFilter: 'Offer' })}
          hint="筛选 Offer 状态"
        />
        <Kpi
          label="需要处理"
          value={stats.todo}
          sub={<>待跟进 <b>{stats.followUps}</b> · 3 天内截止 <b>{stats.dueSoon}</b></>}
          tone="danger"
          icon={<IconClock size={21} />}
          onClick={() => navigate('applications', { applicationsFilter: 'active' })}
          hint="查看进行中投递"
          alert
        />
      </div>

      <div className="do-zone">今天 · 要做的事</div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] items-stretch gap-5">
        <ActionQueueOrbit
          apps={activeApps}
          onViewDetail={handleViewDetail}
          onViewAll={() => navigate('applications', { applicationsFilter: 'active' })}
          onAddAction={triggerAdd}
          fillHeight
        />

        <section className="do-card do-cal-card" aria-label="本月面试">
          <header className="do-card-head">
            <h3>本月面试</h3>
            <button type="button" className="do-link" onClick={() => navigate('interviews')}>{calendarNow.month} 月 · 查看全部 ›</button>
          </header>
          <div className="do-cal-week">
            {['一', '二', '三', '四', '五', '六', '日'].map((w) => <span key={w}>{w}</span>)}
          </div>
          <div className="do-cal-days">
            {monthDays.map((d, i) => (
              <div key={i}>
                {!d.empty && (
                  <button
                    type="button"
                    title={d.hasEvent ? `${d.num} 日有面试，点击查看` : `${d.num} 日`}
                    onClick={() => {
                      if (d.hasEvent && d.dateKey) navigate('interviews', { interviewDate: d.dateKey });
                      else navigate('interviews');
                    }}
                    className={`do-cal-day${d.isToday ? ' is-today' : d.hasEvent ? ' has-event' : ''}`}
                  >
                    {d.num}
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="do-cal-legend">
            <span><i className="is-today" />今天</span>
            <span><i className="is-event" />有面试 · 可点</span>
          </div>
        </section>
      </div>

      <div className="do-zone">整体 · 投递进展</div>

      {appsLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] gap-5" role="status" aria-label="正在加载投递数据">
          <div className="do-card do-skeleton" />
          <div className="do-card do-skeleton" />
        </div>
      ) : appsError ? (
        <section className="do-card do-empty" role="alert">
          <p>投递数据暂时没能加载：{appsError}</p>
          <button type="button" className="do-primary btn-press" onClick={() => { void refreshApps(); }}>重试</button>
        </section>
      ) : apps.length === 0 ? (
        <section className="do-card do-empty">
          <span className="do-empty-icon"><IconOverview size={24} /></span>
          <p>还没有投递数据，先去「投递记录」添加几条，这里会自动生成图表。</p>
          <button type="button" className="do-primary btn-press" onClick={() => navigate('applications')}>去投递记录</button>
        </section>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] items-stretch gap-5">
            <div className="do-trend">
              <OverviewTrendCard applications={apps} activeStatus={activeStatus} />
            </div>
            <StatusDistributionCard applications={apps} activeStatus={activeStatus} onSelect={setActiveStatus} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch gap-5">
            <ApplicationDistributionCard applications={apps} />
            <div className="do-folder">
              <RecentInterviewFolder
                interviews={interviews}
                loading={interviewsLoading}
                error={interviewsError}
                onRetry={refreshInterviews}
                onViewAll={() => navigate('interviews')}
                onViewCalendar={(iv) => {
                  const date = iv.interview_time ? interviewDate(iv.interview_time) : null;
                  navigate('interviews', {
                    query: iv.company_name,
                    interviewDate: date?.isValid ? date.toISODate() : null,
                  });
                }}
              />
            </div>
          </div>
        </>
      )}

      <ApiBalanceStrip />
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone,
  icon,
  onClick,
  hint,
  alert = false,
}: {
  label: string;
  value: number;
  sub: ReactNode;
  tone: 'neutral' | 'interview' | 'success' | 'danger';
  icon: ReactNode;
  onClick: () => void;
  hint: string;
  alert?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} title={hint} className={`do-kpi card-hover btn-press${alert ? ' is-alert' : ''}`}>
      <div style={{ minWidth: 0 }}>
        <div className="do-kpi-label">{label}</div>
        <div className="do-kpi-value">{value}</div>
        <div className="do-kpi-sub">{sub}</div>
      </div>
      <span className={`do-kpi-icon do-tone-${tone}`}>{icon}</span>
    </button>
  );
}

function buildAiSystemPrompt(items: Application[]) {
  const byStatus: Record<string, number> = {};
  STATUS_OPTIONS.forEach(s => (byStatus[s] = 0));
  items.forEach(a => (byStatus[a.status] = (byStatus[a.status] ?? 0) + 1));
  const cityMap: Record<string, number> = {};
  const chMap: Record<string, number> = {};
  items.forEach(a => {
    const city = normalizeApplicationCity(a.city);
    if (city) cityMap[city] = (cityMap[city] ?? 0) + 1;
    if (a.channel) chMap[a.channel] = (chMap[a.channel] ?? 0) + 1;
  });
  const topCities = Object.entries(cityMap).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>`${k}(${v})`).join('、');
  const topCh = Object.entries(chMap).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>`${k}(${v})`).join('、');
  const recent = items.slice(0, 5).map(a => `${a.company_name}·${a.position_name}(${a.status})`).join('；');
  const highPriority = items.filter((a) => a.priority === 'high' || a.priority === 'urgent').length;
  const nearDeadline = items.filter((a) => timeValue(a.deadline_at) <= Date.now() + 3 * 86400000).length;
  const withJd = items.filter((a) => Boolean(a.jd_text?.trim())).length;
  return `你是一名专业的求职顾问，请根据以下用户的真实投递数据给出分析和建议，回答要具体、实用，语气亲切。
投递统计：总计 ${items.length} 条，待投递 ${byStatus['待投递']}，已投递 ${byStatus['已投递']}，在线测评 ${byStatus['在线测评']}，AI面 ${byStatus['AI面']}，HR面 ${byStatus['HR面']}，一面 ${byStatus['一面']}，二面 ${byStatus['二面']}，Offer ${byStatus['Offer']}，已拒绝 ${byStatus['已拒绝']}，已放弃 ${byStatus['已放弃']}，人才库 ${byStatus['人才库']}，待跟进 ${byStatus['待跟进']}。
Offer 转化率：${items.length > 0 ? Math.round((byStatus['Offer']/items.length)*100) : 0}%。
高优先级投递 ${highPriority} 条，临近截止 ${nearDeadline} 条，有 JD 记录 ${withJd} 条。
主要投递城市：${topCities || '未记录'}。投递渠道：${topCh || '未记录'}。
最近投递：${recent || '暂无'}。
请根据这些数据帮助用户分析求职状况，并给出有针对性的建议。`;
}

interface DayCell {
  num: number | '';
  empty: boolean;
  isToday: boolean;
  hasEvent: boolean;
  dateKey: string | null;
}

function buildMonth(now: DateTime, interviews: Interview[]): DayCell[] {
  const year = now.year;
  const month = now.month;
  const lead = now.startOf('month').weekday - 1;
  const daysInMonth = now.daysInMonth!;
  const eventDays = new Set<number>();
  interviews.forEach((iv) => {
    if (!iv.interview_time) return;
    const t = interviewDate(iv.interview_time);
    if (t.year === year && t.month === month) eventDays.add(t.day);
  });
  const cells: DayCell[] = [];
  for (let i = 0; i < lead; i++) cells.push({ num: '', empty: true, isToday: false, hasEvent: false, dateKey: null });
  for (let n = 1; n <= daysInMonth; n++) {
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
    cells.push({
      num: n,
      empty: false,
      isToday: n === now.day,
      hasEvent: eventDays.has(n),
      dateKey,
    });
  }
  return cells;
}
