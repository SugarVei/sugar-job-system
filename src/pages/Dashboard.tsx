import { useMemo } from 'react';
import type { Application, Interview } from '../types';
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
import { initialOf, avatarColor, statusTag, CARD } from '../lib/appHelpers';

// ============================================================
// 总览仪表盘 —— 全部统计由真实数据计算
// ============================================================
export default function Dashboard() {
  const { items: apps } = useCollection<Application>('applications');
  const { items: interviews } = useCollection<Interview>('interviews', {
    column: 'interview_time',
    ascending: true,
  });
  const { setScreen } = useAppShell();
  const { theme } = useTheme();

  const now = new Date();

  const stats = useMemo(() => {
    const total = apps.length;
    const offers = apps.filter((a) => a.status === 'Offer').length;
    const inProgress = apps.filter((a) => !['Offer', '拒绝'].includes(a.status)).length;
    const followUps = apps.filter((a) => a.status === '待跟进').length;

    // 本周面试数
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

  // 近期面试（未来 / 最近）
  const upcoming = useMemo(() => {
    return [...interviews]
      .filter((iv) => iv.interview_time)
      .sort((a, b) => new Date(a.interview_time!).getTime() - new Date(b.interview_time!).getTime())
      .filter((iv) => new Date(iv.interview_time!).getTime() >= now.getTime() - 86400000)
      .slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviews]);

  // 待办：待跟进 / 进行中的投递
  const todos = useMemo(
    () => apps.filter((a) => ['待跟进', '笔试', '面试'].includes(a.status)).slice(0, 4),
    [apps],
  );

  // 当月日历：标记有面试的日期
  const monthDays = useMemo(() => buildMonth(now, interviews), [interviews]); // eslint-disable-line react-hooks/exhaustive-deps

  const goalTarget = 30;
  const goalPct = Math.min(100, Math.round((stats.total / goalTarget) * 100));

  return (
    <div className="flex flex-col gap-[22px] animate-rise">
      {/* 顶部：行动队列 + 月历 */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-[22px]">
        {/* 行动队列 */}
        <div style={{ background: '#ece4d6', borderRadius: 26, padding: '26px 26px 22px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle,rgba(244,200,74,.5),transparent 70%)' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#a23d24', letterSpacing: '.04em', textTransform: 'uppercase' }}>行动队列</div>
            <p style={{ fontSize: 13.5, color: '#7a7468', margin: '6px 0 18px' }}>待跟进与进行中的投递，优先处理。</p>
            <div className="flex flex-col gap-[11px]">
              {todos.length === 0 ? (
                <div style={{ background: '#fffdf8', borderRadius: 16, padding: 18, fontSize: 13.5, color: '#8a8478' }}>
                  暂无待办，去「投递记录」添加一条吧。
                </div>
              ) : (
                todos.map((a) => {
                  const tag = statusTag(a.status);
                  const col = avatarColor(a.company_name);
                  return (
                    <div
                      key={a.id}
                      onClick={() => setScreen('applications')}
                      style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 14, background: '#fffdf8', borderRadius: 16, padding: '14px 16px', boxShadow: '0 4px 14px rgba(60,50,35,.05)', cursor: 'pointer' }}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: col.bg, color: col.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontFamily: 'Poppins' }}>
                        {initialOf(a.company_name)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {a.company_name} · {a.position_name}
                        </div>
                        <div style={{ fontSize: 12.5, color: '#8a8478', marginTop: 2 }}>
                          {[a.city, a.channel].filter(Boolean).join(' · ') || '—'}
                        </div>
                      </div>
                      <span style={{ background: tag.bg, color: tag.fg, fontSize: 12, fontWeight: 600, padding: '5px 11px', borderRadius: 999, whiteSpace: 'nowrap' }}>{a.status}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* 月历 */}
        <div style={{ background: '#dcebd5', borderRadius: 26, padding: 24 }}>
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

      {/* 进度 + 近期面试 */}
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
  const lead = (first.getDay() + 6) % 7; // 周一开头
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
