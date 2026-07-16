import { useMemo } from 'react';
import type { Application, ApplicationPriority, Interview } from '../types';
import { useCollection } from '../hooks/useCollection';
import { useAppShell } from '../contexts/AppShellContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  IconArrowRight,
  IconInterviews,
  IconApplications,
  IconTrophy,
  IconChevronRight,
} from '../components/icons';
import { initialOf, avatarColor, CARD, statusTag } from '../lib/appHelpers';
import ActionQueueOrbit from '../components/dashboard/ActionQueueOrbit';

// ── 行动队列卡片色板（暖色调，匹配网页风格）──────────────────────
function priorityRank(priority: ApplicationPriority | null | undefined) {
  return priority === 'urgent' ? 4 : priority === 'high' ? 3 : priority === 'normal' ? 2 : 1;
}

function timeValue(value: string | null) {
  if (!value) return Number.POSITIVE_INFINITY;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

function formatDateTime(value: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
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

// ── 行动队列卡片 ──────────────────────────────────────────────────
// ============================================================
// 总览仪表盘
// ============================================================
export default function Dashboard() {
  const { items: apps } = useCollection<Application>('applications');
  const { items: interviews } = useCollection<Interview>('interviews', {
    column: 'interview_time',
    ascending: true,
  });
  const { setScreen, setQuery, triggerAdd } = useAppShell();
  const { theme } = useTheme();

  const now = new Date();

  const stats = useMemo(() => {
    const total = apps.length;
    const offers = apps.filter((a) => a.status === 'Offer').length;
    const inProgress = apps.filter((a) => !isClosedStatus(a.status)).length;
    const followUps = apps.filter((a) => a.status === '待跟进').length;

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

    return { total, offers, inProgress, followUps, weekInterviews };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apps, interviews]);

  const upcoming = useMemo(() => {
    return [...interviews]
      .filter((iv) => iv.interview_time)
      .sort((a, b) => new Date(a.interview_time!).getTime() - new Date(b.interview_time!).getTime())
      .filter((iv) => new Date(iv.interview_time!).getTime() >= now.getTime() - 86400000)
      .slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviews]);

  // 进行中的投递（无数量上限），按行数动态解锁
  const activeApps = useMemo(
    () => apps
      .filter((a) => !isClosedStatus(a.status))
      .sort((a, b) => urgencyScore(b, now) - urgencyScore(a, now)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apps],
  );

  const todoApps = useMemo(() => {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const tomorrow = new Date(start);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const threeDays = new Date(now);
    threeDays.setDate(threeDays.getDate() + 3);

    return apps
      .filter((app) => {
        if (isClosedStatus(app.status)) return false;
        const next = timeValue(app.next_action_at);
        const deadline = timeValue(app.deadline_at);
        return next < tomorrow.getTime() || deadline <= threeDays.getTime();
      })
      .sort((a, b) => urgencyScore(b, now) - urgencyScore(a, now))
      .slice(0, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apps]);

  const monthDays = useMemo(() => buildMonth(now, interviews), [interviews]); // eslint-disable-line react-hooks/exhaustive-deps

  const goalTarget = 30;
  const goalPct = Math.min(100, Math.round((stats.total / goalTarget) * 100));

  // 跳转到投递记录并筛选该公司
  const handleViewDetail = (app: Application) => {
    setScreen('applications');
    setTimeout(() => setQuery(app.company_name), 0);
  };

  return (
    <div className="flex flex-col gap-[22px] animate-rise">
      {/* 顶部：行动队列 + 月历 */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] items-stretch gap-[22px]">
        {/* 行动队列 */}
        <ActionQueueOrbit
          apps={activeApps}
          onViewDetail={handleViewDetail}
          onViewAll={() => setScreen('applications')}
          onAddAction={triggerAdd}
        />

        {/* 月历 */}
        <div style={{ height: '100%', background: '#dcebd5', borderRadius: 26, padding: 24 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: 'Poppins', fontSize: 17, fontWeight: 600, color: '#2f5d36' }}>本月面试</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#4a7a51' }}>
              {now.getMonth() + 1} 月
            </div>
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
                ) : d.isToday ? (
                  <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#5fa86b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, boxShadow: '0 4px 10px rgba(95,168,107,.4)' }}>{d.num}</span>
                ) : d.hasEvent ? (
                  <span style={{ width: 32, height: 32, borderRadius: '50%', border: '1.8px solid #7cbf85', color: '#3f7a47', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}>{d.num}</span>
                ) : (
                  <span style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500, color: '#5d7a62' }}>{d.num}</span>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-4" style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(95,140,100,.2)', fontSize: 12, color: '#4a7a51' }}>
            <span className="flex items-center gap-[6px]"><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#5fa86b' }} />今天</span>
            <span className="flex items-center gap-[6px]"><span style={{ width: 10, height: 10, borderRadius: '50%', border: '1.8px solid #7cbf85' }} />有面试</span>
          </div>
        </div>
      </div>

      {/* 指标行 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric label="进行中" value={stats.inProgress} bg="#fbeec2" fg="#7a5a12" icon={<IconArrowRight size={22} />} />
        <Metric label="本周面试" value={stats.weekInterviews} bg="#dcebd5" fg="#2f5d36" icon={<IconInterviews size={22} />} />
        <Metric label="投递总数" value={stats.total} bg="#ece4d6" fg="#5d584d" icon={<IconApplications size={22} />} />
        <Metric label="已获 Offer" value={stats.offers} bg="#fbe0d8" fg="#a23d24" icon={<IconTrophy size={22} />} />
      </div>

      {/* 待办 + 近期面试 */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.7fr] gap-[22px]">
        <div className="flex flex-col gap-[18px]">
          <div style={{ ...CARD, padding: 22 }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div style={{ fontFamily: 'Poppins', fontSize: 16, fontWeight: 600 }}>投递进度</div>
                <div style={{ fontSize: 13, color: '#8a8478', marginTop: 3 }}>本季目标 {goalTarget} 份</div>
              </div>
              <div style={{ position: 'relative', width: 96, height: 96, flex: 'none' }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `conic-gradient(${theme.accent} 0% ${goalPct}%, #ece4d6 ${goalPct}% 100%)` }} />
                <div style={{ position: 'absolute', inset: 10, borderRadius: '50%', background: '#fffdf8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontFamily: 'Poppins', fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{stats.total}</div>
                  <div style={{ fontSize: 10.5, color: '#8a8478' }}>/ {goalTarget}</div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ background: '#1b1a17', borderRadius: 22, padding: 22, color: '#f3efe7' }}>
            <div style={{ fontSize: 13, color: '#bdb6a5' }}>待跟进</div>
            <div className="flex items-baseline gap-[6px]" style={{ margin: '6px 0 14px' }}>
              <span style={{ fontFamily: 'Poppins', fontSize: 32, fontWeight: 700 }}>{stats.followUps}</span>
              <span style={{ fontSize: 13, color: '#bdb6a5' }}>条需要处理</span>
            </div>
            <div style={{ height: 10, borderRadius: 999, background: 'rgba(255,255,255,.12)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${stats.total ? Math.round((stats.followUps / stats.total) * 100) : 0}%`, borderRadius: 999, background: 'linear-gradient(90deg,#f4c84a,#f0613f)' }} />
            </div>
          </div>
          <div style={{ ...CARD, padding: 22 }}>
            <div style={{ fontFamily: 'Poppins', fontSize: 16, fontWeight: 600 }}>今日待办 / 临近截止</div>
            <div style={{ fontSize: 12.5, color: '#8a8478', margin: '3px 0 14px' }}>下一步到期或 3 天内截止</div>
            {todoApps.length === 0 ? (
              <div style={{ fontSize: 13, color: '#a39d90', padding: '8px 0' }}>暂无临近事项。</div>
            ) : (
              <div className="flex flex-col gap-2">
                {todoApps.map((app) => {
                  const tag = statusTag(app.status);
                  const deadlineTime = timeValue(app.deadline_at);
                  const overdue = Math.min(deadlineTime, timeValue(app.next_action_at)) < now.getTime();
                  return (
                    <button
                      key={app.id}
                      onClick={() => handleViewDetail(app)}
                      className="btn-press"
                      style={{ border: '1px solid #f0ebe0', background: overdue ? '#fff3ee' : '#faf7f0', borderRadius: 13, padding: 12, textAlign: 'left', cursor: 'pointer' }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <strong style={{ fontSize: 13.5, color: '#1b1a17' }}>{app.company_name}</strong>
                        <span style={{ background: tag.bg, color: tag.fg, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999 }}>{app.status}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#6b665c', marginTop: 4 }}>{app.position_name}</div>
                      <div style={{ fontSize: 11.5, color: overdue ? '#a23d24' : '#8a8478', marginTop: 6, lineHeight: 1.5 }}>
                        {app.next_action && <>下一步：{app.next_action}<br /></>}
                        {app.next_action_at && <>时间：{formatDateTime(app.next_action_at)}<br /></>}
                        {app.deadline_at && <>截止：{formatDateTime(app.deadline_at)}</>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div style={{ ...CARD, padding: 22 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: 'Poppins', fontSize: 17, fontWeight: 600 }}>近期面试</div>
            <button onClick={() => setScreen('interviews')} className="btn-press" style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', fontSize: 13, fontWeight: 600, color: theme.accent, cursor: 'pointer' }}>
              查看全部 <IconChevronRight size={14} />
            </button>
          </div>
          <div className="flex flex-col">
            {upcoming.length === 0 ? (
              <div style={{ fontSize: 13.5, color: '#8a8478', padding: '20px 0' }}>暂无安排，去「面试日历」添加。</div>
            ) : (
              upcoming.map((iv) => {
                const col = avatarColor(iv.company_name);
                const d = new Date(iv.interview_time!);
                return (
                  <div key={iv.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 14, padding: '12px 6px', borderBottom: '1px solid #f0ebe0' }}>
                    <div style={{ width: 42, height: 42, borderRadius: 13, background: col.bg, color: col.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontFamily: 'Poppins', fontSize: 16 }}>
                      {initialOf(iv.company_name)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14.5 }}>{iv.company_name} · {iv.round || '面试'}</div>
                      <div style={{ fontSize: 12.5, color: '#8a8478', marginTop: 2 }}>
                        {iv.position_name ? `${iv.position_name} · ` : ''}
                        {d.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                      </div>
                    </div>
                    <span style={{ background: '#fbeec2', color: '#7a5a12', fontSize: 12, fontWeight: 600, padding: '5px 11px', borderRadius: 999, whiteSpace: 'nowrap' }}>{iv.interview_type || '面试'}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, bg, fg, icon }: { label: string; value: number; bg: string; fg: string; icon: React.ReactNode }) {
  return (
    <div className="card-hover" style={{ ...CARD, borderRadius: 20, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: 13, color: '#8a8478' }}>{label}</div>
        <div style={{ fontFamily: 'Poppins', fontSize: 30, fontWeight: 600, marginTop: 3 }}>{value}</div>
      </div>
      <div style={{ width: 46, height: 46, borderRadius: 14, background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
        {icon}
      </div>
    </div>
  );
}

interface DayCell {
  num: number | '';
  empty: boolean;
  isToday: boolean;
  hasEvent: boolean;
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
  for (let i = 0; i < lead; i++) cells.push({ num: '', empty: true, isToday: false, hasEvent: false });
  for (let n = 1; n <= daysInMonth; n++) {
    cells.push({
      num: n,
      empty: false,
      isToday: n === now.getDate(),
      hasEvent: eventDays.has(n),
    });
  }
  return cells;
}
