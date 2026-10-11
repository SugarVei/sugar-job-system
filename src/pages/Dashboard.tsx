import { useMemo } from 'react';
import type { Application, ApplicationPriority, Interview } from '../types';
import { useCollection } from '../hooks/useCollection';
import { useAppShell } from '../contexts/AppShellContext';
import {
  IconArrowRight,
  IconInterviews,
  IconApplications,
  IconTrophy,
} from '../components/icons';
import { CARD } from '../lib/appHelpers';
import DashboardWorkspaceCards from '../components/dashboard/DashboardWorkspaceCards';
import ActionQueueOrbit from '../components/dashboard/ActionQueueOrbit';
import RecentInterviewFolder from '../components/dashboard/RecentInterviewFolder';

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

function toDateKey(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
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

export default function Dashboard() {
  const { items: apps, loading: appsLoading, error: appsError, refresh: refreshApps } = useCollection<Application>('applications');
  const { items: interviews, loading: interviewsLoading, error: interviewsError, refresh: refreshInterviews } = useCollection<Interview>('interviews', {
    column: 'interview_time',
    ascending: true,
  });
  const { navigate, triggerAdd } = useAppShell();

  const now = new Date();

  const stats = useMemo(() => {
    const total = apps.length;
    const offers = apps.filter((a) => a.status === 'Offer').length;
    const inProgress = apps.filter((a) => !isClosedStatus(a.status)).length;

    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekInterviews = interviews.filter((iv) => {
      if (!iv.interview_time) return false;
      const t = new Date(iv.interview_time);
      return t >= weekStart && t < weekEnd;
    }).length;

    return { total, offers, inProgress, weekInterviews };
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

  const monthDays = useMemo(() => buildMonth(now, interviews), [interviews]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleViewDetail = (app: Application) => {
    navigate('applications', { query: app.company_name });
  };

  return (
    <div className="flex flex-col gap-[22px] animate-rise">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] items-stretch gap-[22px]">
        <ActionQueueOrbit
          apps={activeApps}
          onViewDetail={handleViewDetail}
          onViewAll={() => navigate('applications', { applicationsFilter: 'active' })}
          onAddAction={triggerAdd}
          fillHeight
        />

        <div style={{ height: '100%', background: '#dcebd5', borderRadius: 26, padding: 24 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: 'Poppins', fontSize: 17, fontWeight: 600, color: '#2f5d36' }}>本月面试</div>
            <button
              type="button"
              onClick={() => navigate('interviews')}
              className="btn-press"
              style={{ fontSize: 13, fontWeight: 600, color: '#4a7a51', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {now.getMonth() + 1} 月 · 查看全部
            </button>
          </div>
          <div className="grid grid-cols-7 gap-[2px]" style={{ marginBottom: 6 }}>
            {['一', '二', '三', '四', '五', '六', '日'].map((w) => (
              <div key={w} style={{ textAlign: 'center', fontSize: 11.5, fontWeight: 600, color: '#8aa890', padding: '4px 0' }}>{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((d, i) => (
              <div key={i} style={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {d.empty ? (
                  <span />
                ) : (
                  <button
                    type="button"
                    title={d.hasEvent ? `${d.num} 日有面试，点击查看` : `${d.num} 日`}
                    onClick={() => {
                      if (d.hasEvent && d.dateKey) {
                        navigate('interviews', { interviewDate: d.dateKey });
                      } else {
                        navigate('interviews');
                      }
                    }}
                    className="btn-press"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      border: d.isToday ? 'none' : d.hasEvent ? '1.8px solid #7cbf85' : 'none',
                      background: d.isToday ? '#5fa86b' : 'transparent',
                      color: d.isToday ? '#fff' : d.hasEvent ? '#3f7a47' : '#5d7a62',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: d.isToday || d.hasEvent ? 700 : 500,
                      boxShadow: d.isToday ? '0 4px 10px rgba(95,168,107,.4)' : 'none',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {d.num}
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-4" style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(95,140,100,.2)', fontSize: 12, color: '#4a7a51' }}>
            <span className="flex items-center gap-[6px]"><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#5fa86b' }} />今天</span>
            <span className="flex items-center gap-[6px]"><span style={{ width: 10, height: 10, borderRadius: '50%', border: '1.8px solid #7cbf85' }} />有面试 · 可点</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric
          label="进行中"
          value={stats.inProgress}
          bg="#fbeec2"
          fg="#7a5a12"
          icon={<IconArrowRight size={22} />}
          onClick={() => navigate('applications', { applicationsFilter: 'active' })}
          hint="查看进行中投递"
        />
        <Metric
          label="本周面试"
          value={stats.weekInterviews}
          bg="#dcebd5"
          fg="#2f5d36"
          icon={<IconInterviews size={22} />}
          onClick={() => navigate('interviews')}
          hint="打开面试日历"
        />
        <Metric
          label="投递总数"
          value={stats.total}
          bg="#ece4d6"
          fg="#5d584d"
          icon={<IconApplications size={22} />}
          onClick={() => navigate('applications', { applicationsFilter: 'all' })}
          hint="全部投递记录"
        />
        <Metric
          label="已获 Offer"
          value={stats.offers}
          bg="#fbe0d8"
          fg="#a23d24"
          icon={<IconTrophy size={22} />}
          onClick={() => navigate('applications', { applicationsFilter: 'Offer' })}
          hint="筛选 Offer 状态"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,.95fr)_minmax(0,1.35fr)] gap-[22px] items-start">
        <DashboardWorkspaceCards applications={apps} interviews={interviews} loading={appsLoading || interviewsLoading} error={appsError || interviewsError} onRetry={() => { void refreshApps(); void refreshInterviews(); }} />

        <RecentInterviewFolder
          interviews={interviews}
          loading={interviewsLoading}
          error={interviewsError}
          onRetry={refreshInterviews}
          onViewAll={() => navigate('interviews')}
          onViewCalendar={(iv) => {
            const date = iv.interview_time ? new Date(iv.interview_time) : null;
            navigate('interviews', {
              query: iv.company_name,
              interviewDate: date && Number.isFinite(date.getTime()) ? toDateKey(date) : null,
            });
          }}
        />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  bg,
  fg,
  icon,
  onClick,
  hint,
}: {
  label: string;
  value: number;
  bg: string;
  fg: string;
  icon: React.ReactNode;
  onClick?: () => void;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={hint}
      className="card-hover btn-press"
      style={{
        ...CARD,
        borderRadius: 20,
        padding: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        textAlign: 'left',
        border: 'none',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div>
        <div style={{ fontSize: 13, color: '#8a8478' }}>{label}</div>
        <div style={{ fontFamily: 'Poppins', fontSize: 30, fontWeight: 600, marginTop: 3 }}>{value}</div>
        {hint && <div style={{ fontSize: 11, color: '#b0a898', marginTop: 4 }}>{hint}</div>}
      </div>
      <div style={{ width: 46, height: 46, borderRadius: 14, background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
        {icon}
      </div>
    </button>
  );
}

interface DayCell {
  num: number | '';
  empty: boolean;
  isToday: boolean;
  hasEvent: boolean;
  dateKey: string | null;
}

function buildMonth(now: Date, interviews: Interview[]): DayCell[] {
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const eventDays = new Set<number>();
  interviews.forEach((iv) => {
    if (!iv.interview_time) return;
    const t = new Date(iv.interview_time);
    if (t.getFullYear() === year && t.getMonth() === month) eventDays.add(t.getDate());
  });
  const cells: DayCell[] = [];
  for (let i = 0; i < lead; i++) cells.push({ num: '', empty: true, isToday: false, hasEvent: false, dateKey: null });
  for (let n = 1; n <= daysInMonth; n++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
    cells.push({
      num: n,
      empty: false,
      isToday: n === now.getDate(),
      hasEvent: eventDays.has(n),
      dateKey,
    });
  }
  return cells;
}
