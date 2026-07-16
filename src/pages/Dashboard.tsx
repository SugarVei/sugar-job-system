import { useEffect, useMemo, useRef, useState } from 'react';
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
  return d.toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
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

function signedCycleDistance(value: number, length: number) {
  if (length <= 0) return 0;
  let result = ((value % length) + length) % length;
  if (result > length / 2) result -= length;
  return result;
}

function ActionQueue({
  apps,
  onViewDetail,
}: {
  apps: Application[];
  onViewDetail: (app: Application) => void;
}) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [stageWidth, setStageWidth] = useState(760);
  const [offset, setOffset] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const orbitApps = useMemo(() => {
    if (apps.length === 0) return [];
    const targetLength = Math.max(9, apps.length);
    return Array.from({ length: targetLength }, (_, index) => apps[index % apps.length]);
  }, [apps]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;

    const update = () => setStageWidth(node.clientWidth || 760);
    update();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }

    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (orbitApps.length === 0 || reduceMotion) return;

    let frameId = 0;
    let previous = performance.now();

    const tick = (time: number) => {
      const delta = Math.min(64, time - previous);
      previous = time;

      if (!isHovered && selectedKey === null) {
        setOffset((current) => (current + delta / 2600) % orbitApps.length);
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [isHovered, orbitApps.length, reduceMotion, selectedKey]);

  useEffect(() => {
    if (orbitApps.length > 0) setOffset((current) => current % orbitApps.length);
    setSelectedKey(null);
  }, [orbitApps.length]);

  const isCompact = stageWidth < 560;
  const cardWidth = Math.max(108, Math.min(154, stageWidth * (isCompact ? 0.29 : 0.19)));
  const cardHeight = cardWidth * 1.36;
  const slotWidth = cardWidth * (isCompact ? 0.67 : 0.72);
  const stageHeight = isCompact ? 242 : 292;
  const visibleLimit = isCompact ? 3.15 : 4.55;

  return (
    <section
      style={{
        background: '#ece4d6',
        borderRadius: 26,
        minHeight: 360,
        padding: '22px 0 0',
        position: 'relative',
        overflow: 'hidden',
        isolation: 'isolate',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="行动队列"
    >
      <div
        style={{
          position: 'absolute',
          right: -42,
          top: -48,
          width: 210,
          height: 210,
          borderRadius: '50%',
          background: 'radial-gradient(circle,rgba(244,200,74,.55),transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: -80,
          top: 104,
          width: 210,
          height: 210,
          borderRadius: '50%',
          background: 'radial-gradient(circle,rgba(152,190,154,.24),transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <header style={{ position: 'relative', zIndex: 100, padding: '0 22px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#a23d24', letterSpacing: '.04em' }}>
          行动队列
        </div>
        <p style={{ fontSize: 13, color: '#7a7468', margin: '4px 0 0' }}>
          进行中的投递 · 卡片沿轨道循环，悬停暂停
        </p>
      </header>

      {apps.length === 0 ? (
        <div style={{ margin: '18px 22px 22px', background: '#fffdf8', borderRadius: 16, padding: 18, fontSize: 13.5, color: '#8a8478' }}>
          暂无待办，去「投递记录」添加一条吧。
        </div>
      ) : (
        <div
          ref={stageRef}
          style={{
            height: stageHeight,
            marginTop: 10,
            position: 'relative',
            overflow: 'hidden',
            perspective: 900,
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
            maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
          }}
        >
          {orbitApps.map((app, index) => {
            const key = `${app.id}-${index}`;
            const distance = signedCycleDistance(index - offset, orbitApps.length);
            const absDistance = Math.abs(distance);
            const visible = absDistance <= visibleLimit + 0.8;
            const selected = selectedKey === key;
            const dimmed = selectedKey !== null && !selected;
            const palette = AQ_PALETTES[index % AQ_PALETTES.length];

            const x = stageWidth / 2 - cardWidth / 2 + distance * slotWidth;
            const y = 17 + Math.pow(absDistance, 1.42) * (isCompact ? 10 : 12);
            const rotate = distance * (isCompact ? 4.2 : 4.8);
            const scale = Math.max(0.77, 1.07 - absDistance * 0.055) + (selected ? 0.08 : 0);
            const zIndex = selected ? 90 : 55 - Math.round(absDistance * 8);
            const opacity = !visible ? 0 : dimmed ? 0.34 : Math.max(0.42, 1 - absDistance * 0.11);

            return (
              <div
                key={key}
                role="button"
                tabIndex={visible ? 0 : -1}
                aria-label={`${app.company_name} ${app.position_name}`}
                aria-pressed={selected}
                onClick={() => setSelectedKey((current) => current === key ? null : key)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedKey((current) => current === key ? null : key);
                  }
                }}
                style={{
                  width: cardWidth,
                  height: cardHeight,
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  zIndex,
                  padding: isCompact ? '13px 12px' : '16px 15px',
                  borderRadius: isCompact ? 15 : 18,
                  background: palette.bg,
                  color: palette.fg,
                  border: selected ? `2px solid ${palette.fg}55` : '1px solid rgba(255,255,255,.42)',
                  boxShadow: selected
                    ? '0 22px 36px rgba(44,39,31,.24)'
                    : '0 12px 26px rgba(44,39,31,.15)',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  opacity,
                  pointerEvents: visible ? 'auto' : 'none',
                  transform: `translate3d(${x}px, ${y}px, 0) rotate(${rotate}deg) scale(${scale})`,
                  transformOrigin: '50% 78%',
                  transition: selectedKey
                    ? 'opacity .24s ease, box-shadow .24s ease, border-color .24s ease, transform .28s cubic-bezier(.22,.8,.24,1)'
                    : 'opacity .18s linear, box-shadow .22s ease',
                  willChange: 'transform, opacity',
                  userSelect: 'none',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    width: cardWidth * 0.8,
                    height: cardWidth * 0.8,
                    borderRadius: '50%',
                    right: -cardWidth * 0.28,
                    top: -cardWidth * 0.32,
                    background: 'rgba(255,255,255,.26)',
                  }}
                />

                <div
                  style={{
                    opacity: selected ? 0 : 1,
                    transform: selected ? 'translateY(-8px)' : 'translateY(0)',
                    transition: 'opacity .18s ease, transform .24s ease',
                  }}
                >
                  <div style={{ fontFamily: 'Poppins', fontSize: isCompact ? 34 : 44, fontWeight: 700, lineHeight: .92 }}>
                    {app.company_name.charAt(0)}
                  </div>
                  <div style={{ marginTop: isCompact ? 16 : 22, fontSize: isCompact ? 12 : 13.5, fontWeight: 700, lineHeight: 1.25 }}>
                    {app.company_name}
                  </div>
                  <div style={{ marginTop: 4, fontSize: isCompact ? 9.5 : 10.5, lineHeight: 1.35, opacity: .74 }}>
                    {app.position_name}
                  </div>
                  <span
                    style={{
                      display: 'inline-block',
                      marginTop: 9,
                      padding: '3px 7px',
                      borderRadius: 999,
                      background: 'rgba(0,0,0,.09)',
                      fontSize: 9,
                      fontWeight: 700,
                    }}
                  >
                    {app.status}
                  </span>
                </div>

                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    padding: isCompact ? '13px 12px' : '15px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    opacity: selected ? 1 : 0,
                    transform: selected ? 'translateY(0)' : 'translateY(10px)',
                    pointerEvents: selected ? 'auto' : 'none',
                    transition: 'opacity .2s .08s ease, transform .24s .08s ease',
                  }}
                >
                  <div>
                    <div style={{ fontSize: isCompact ? 12 : 13.5, fontWeight: 700, lineHeight: 1.25 }}>
                      {app.company_name}
                    </div>
                    <div style={{ fontSize: isCompact ? 9.5 : 10.5, marginTop: 3, opacity: .78 }}>
                      {app.position_name}
                    </div>
                    <div style={{ fontSize: isCompact ? 8.8 : 9.5, marginTop: 8, lineHeight: 1.55, opacity: .7 }}>
                      {[app.city, app.channel].filter(Boolean).join(' · ') || '待补充地点与渠道'}
                      <br />
                      {app.next_action || '等待下一步安排'}
                      {app.deadline_at ? <><br />截止 {formatDateTime(app.deadline_at)}</> : null}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                      <span style={{ fontSize: 8.5, fontWeight: 700, padding: '2px 6px', borderRadius: 999, background: 'rgba(0,0,0,.09)' }}>
                        {app.status}
                      </span>
                      <span style={{ fontSize: 8.5, fontWeight: 700, padding: '2px 6px', borderRadius: 999, background: 'rgba(0,0,0,.09)' }}>
                        {priorityLabel(app.priority)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onViewDetail(app);
                    }}
                    style={{
                      width: '100%',
                      border: '1px solid rgba(0,0,0,.14)',
                      borderRadius: 9,
                      padding: '6px 8px',
                      background: 'rgba(255,255,255,.24)',
                      color: palette.fg,
                      fontSize: isCompact ? 9.5 : 10.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    查看详情 →
                  </button>
                </div>
              </div>
            );
          })}

          <div
            aria-hidden
            style={{
              position: 'absolute',
              zIndex: 70,
              left: '50%',
              bottom: isCompact ? -92 : -112,
              width: '132%',
              height: isCompact ? 138 : 170,
              transform: 'translateX(-50%)',
              borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
              background: 'linear-gradient(180deg,#dedbd5 0%,#ece4d6 78%)',
              boxShadow: '0 -18px 34px rgba(74,67,56,.08)',
              pointerEvents: 'none',
            }}
          />

          <div
            aria-hidden
            style={{
              position: 'absolute',
              zIndex: 72,
              left: '50%',
              bottom: isCompact ? 13 : 17,
              width: 5,
              height: 5,
              borderRadius: '50%',
              transform: 'translateX(-50%)',
              background: '#8e887c',
              opacity: .7,
            }}
          />
        </div>
      )}

      {selectedKey && (
        <div
          style={{
            position: 'absolute',
            zIndex: 110,
            left: 0,
            right: 0,
            bottom: 12,
            textAlign: 'center',
            fontSize: 10.5,
            color: '#777166',
            pointerEvents: 'none',
          }}
        >
          再次点击卡片收起
        </div>
      )}
    </section>
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

  const handleViewDetail = (app: Application) => {
    setScreen('applications');
    setTimeout(() => setQuery(app.company_name), 0);
  };

  return (
    <div className="flex flex-col gap-[22px] animate-rise">
      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-[22px] items-stretch">
        <ActionQueue apps={activeApps} onViewDetail={handleViewDetail} />

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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric label="进行中" value={stats.inProgress} bg="#fbeec2" fg="#7a5a12" icon={<IconArrowRight size={22} />} />
        <Metric label="本周面试" value={stats.weekInterviews} bg="#dcebd5" fg="#2f5d36" icon={<IconInterviews size={22} />} />
        <Metric label="投递总数" value={stats.total} bg="#ece4d6" fg="#5d584d" icon={<IconApplications size={22} />} />
        <Metric label="已获 Offer" value={stats.offers} bg="#fbe0d8" fg="#a23d24" icon={<IconTrophy size={22} />} />
      </div>

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
