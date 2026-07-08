import { useMemo, useState } from 'react';
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

// ── 行动队列卡片色板（暖色调，匹配网页风格）──────────────────────
const AQ_PALETTES: { bg: string; fg: string }[] = [
  { bg: '#f2ddd0', fg: '#7a3a1e' },
  { bg: '#d4e8d0', fg: '#2a5e34' },
  { bg: '#f0e4b8', fg: '#6a4a08' },
  { bg: '#ddd4ec', fg: '#4a3670' },
  { bg: '#c8e0d4', fg: '#1e5a44' },
  { bg: '#f4d4c8', fg: '#7a3228' },
  { bg: '#e0dcc8', fg: '#5a4018' },
  { bg: '#d0dcec', fg: '#2a4070' },
  { bg: '#eed4d8', fg: '#6a2838' },
  { bg: '#d8e8d0', fg: '#285828' },
  { bg: '#f4e0c0', fg: '#6a3808' },
  { bg: '#d8d4e8', fg: '#382e60' },
];

function priorityLabel(priority: ApplicationPriority | null | undefined) {
  switch (priority) {
    case 'urgent': return '紧急';
    case 'high': return '高';
    case 'low': return '低';
    default: return '普通';
  }
}

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
function AQCard({
  app, palette, isSelected, isDimmed, onSelect, onViewDetail,
}: {
  app: Application;
  palette: { bg: string; fg: string };
  isSelected: boolean;
  isDimmed: boolean;
  onSelect: () => void;
  onViewDetail: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      style={{
        width: isSelected ? 236 : 104,
        height: isSelected ? 140 : 62,
        borderRadius: 11,
        padding: '9px 11px',
        background: palette.bg,
        color: palette.fg,
        cursor: 'pointer',
        flexShrink: 0,
        overflow: 'hidden',
        position: 'relative',
        opacity: isDimmed ? 0.38 : 1,
        transform: isDimmed ? 'scaleY(0.86)' : 'none',
        transition: 'width .44s cubic-bezier(.34,1.15,.64,1), height .44s cubic-bezier(.34,1.15,.64,1), opacity .28s, transform .36s cubic-bezier(.34,1.15,.64,1)',
        userSelect: 'none',
      }}
    >
      {/* 未展开视图 */}
      <div style={{ opacity: isSelected ? 0 : 1, transition: 'opacity .18s', pointerEvents: isSelected ? 'none' : 'auto' }}>
        <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1, marginBottom: 3 }}>
          {app.company_name.charAt(0)}
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {app.company_name}
        </div>
          <div style={{ fontSize: 10, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: 0.72 }}>
          {app.position_name}
        </div>
        <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999, background: 'rgba(0,0,0,.1)', marginTop: 4 }}>
          {app.status}
        </span>
      </div>

      {/* 展开视图 */}
      <div style={{
        position: 'absolute', inset: 0, padding: '11px 13px',
        opacity: isSelected ? 1 : 0,
        transition: isSelected ? 'opacity .22s .2s' : 'opacity .1s',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        pointerEvents: isSelected ? 'auto' : 'none',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{app.company_name}</div>
          <div style={{ fontSize: 10.5, marginTop: 1, opacity: 0.75 }}>{app.position_name}</div>
          <div style={{ fontSize: 9.5, marginTop: 4, lineHeight: 1.6, opacity: 0.62 }}>
            {[app.city, app.channel].filter(Boolean).join(' · ')}
            <br />
            <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999, background: 'rgba(0,0,0,.1)' }}>
              {app.status}
            </span>
            <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999, background: 'rgba(0,0,0,.1)', marginLeft: 4 }}>
              {priorityLabel(app.priority)}
            </span>
            {(app.next_action || app.deadline_at) && (
              <>
                <br />
                {app.next_action || '待处理'}{app.deadline_at ? ` · ${formatDateTime(app.deadline_at)}` : ''}
              </>
            )}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onViewDetail(); }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: 'rgba(0,0,0,.1)', border: '1px solid rgba(0,0,0,.14)',
            borderRadius: 7, padding: '4px 9px', fontSize: 10.5, fontWeight: 700,
            color: palette.fg, cursor: 'pointer',
          }}
        >
          查看详情 →
        </button>
      </div>
    </div>
  );
}

// ── 行动队列单行 ──────────────────────────────────────────────────
function AQRow({
  apps, direction, selectedId, colorOffset, onSelect, onViewDetail,
}: {
  apps: Application[];
  direction: 'ltr' | 'rtl';
  selectedId: string | null;
  colorOffset: number;
  onSelect: (id: string) => void;
  onViewDetail: (app: Application) => void;
}) {
  // 不足 7 张时重复填满，保证滚动顺畅；再翻倍实现无缝循环
  const track = useMemo(() => {
    let cycle = [...apps];
    while (cycle.length < 7) cycle = [...cycle, ...apps];
    return [...cycle, ...cycle];
  }, [apps]);

  const anim = direction === 'ltr' ? 'aqLTR 30s linear infinite' : 'aqRTL 30s linear infinite';
  const paused = selectedId !== null;

  return (
    <div style={{
      overflow: 'hidden',
      position: 'relative',
      WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
      maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
    }}>
      <div style={{
        display: 'flex',
        gap: 7,
        width: 'max-content',
        animation: anim,
        animationPlayState: paused ? 'paused' : 'running',
      }}>
        {track.map((app, i) => (
          <AQCard
            key={`${app.id}-${i}`}
            app={app}
            palette={AQ_PALETTES[(colorOffset + (i % apps.length)) % AQ_PALETTES.length]}
            isSelected={selectedId === app.id}
            isDimmed={selectedId !== null && selectedId !== app.id}
            onSelect={() => onSelect(app.id)}
            onViewDetail={() => onViewDetail(app)}
          />
        ))}
      </div>
    </div>
  );
}

// ── 行动队列容器：根据投递数量自动解锁行数 ───────────────────────
function ActionQueue({ apps, onViewDetail }: {
  apps: Application[];
  onViewDetail: (app: Application) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 1–6 → 1行  7–12 → 2行  13–18 → 3行  19+ → 4行
  const rowCount = apps.length <= 6 ? 1 : apps.length <= 12 ? 2 : apps.length <= 18 ? 3 : 4;

  const rows = useMemo(() => {
    if (apps.length === 0) return [];
    const result: Application[][] = Array.from({ length: rowCount }, () => []);
    apps.forEach((app, i) => result[i % rowCount].push(app));
    return result;
  }, [apps, rowCount]);

  const handleSelect = (id: string) => setSelectedId(prev => prev === id ? null : id);

  return (
    <div style={{ background: '#ece4d6', borderRadius: 26, padding: '22px 22px 18px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes aqLTR{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes aqRTL{0%{transform:translateX(-50%)}100%{transform:translateX(0)}}
      `}</style>
      <div style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle,rgba(244,200,74,.5),transparent 70%)' }} />
      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#a23d24', letterSpacing: '.04em', textTransform: 'uppercase' }}>行动队列</div>
        <p style={{ fontSize: 13, color: '#7a7468', margin: '4px 0 14px' }}>
          进行中的投递 · 点击卡片展开详情
        </p>

        {apps.length === 0 ? (
          <div style={{ background: '#fffdf8', borderRadius: 16, padding: 18, fontSize: 13.5, color: '#8a8478' }}>
            暂无待办，去「投递记录」添加一条吧。
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {rows.map((row, ri) => (
              <AQRow
                key={ri}
                apps={row}
                direction={ri % 2 === 0 ? 'ltr' : 'rtl'}
                selectedId={selectedId}
                colorOffset={ri * 6}
                onSelect={handleSelect}
                onViewDetail={onViewDetail}
              />
            ))}
          </div>
        )}

        {selectedId && (
          <p style={{ margin: '8px 0 0', fontSize: 11, color: '#9a9488', textAlign: 'center' }}>
            再次点击收起
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 总览仪表盘
// ============================================================
export default function Dashboard() {
  const { items: apps } = useCollection<Application>('applications');
  const { items: interviews } = useCollection<Interview>('interviews', {
    column: 'interview_time',
    ascending: true,
  });
  const { setScreen, setQuery } = useAppShell();
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
      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-[22px]">
        {/* 行动队列 */}
        <ActionQueue apps={activeApps} onViewDetail={handleViewDetail} />

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
