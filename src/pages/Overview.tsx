import { useMemo, useState } from 'react';
import type { Application, ApplicationStatus } from '../types';
import { useCollection } from '../hooks/useCollection';
import { useAppShell } from '../contexts/AppShellContext';
import { STATUS_OPTIONS, statusTag, CARD } from '../lib/appHelpers';
import EmptyState from '../components/EmptyState';

// ============================================================
// 投递总览 —— 按状态/城市/渠道的真实数据概览，支持按状态查看
// ============================================================

// 各状态在环形图中的颜色
const STATUS_COLOR: Record<ApplicationStatus, string> = {
  已投递: '#cfc6b4',
  笔试: '#f4c84a',
  面试: '#7cc4a0',
  Offer: '#5fa86b',
  拒绝: '#f0613f',
  待跟进: '#a89cf0',
};

function countBy<T>(arr: T[], key: (x: T) => string | null | undefined) {
  const m = new Map<string, number>();
  arr.forEach((x) => {
    const k = key(x);
    if (!k) return;
    m.set(k, (m.get(k) ?? 0) + 1);
  });
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
}

export default function Overview() {
  const { items, loading } = useCollection<Application>('applications');
  const { setScreen, setQuery } = useAppShell();
  const [activeStatus, setActiveStatus] = useState<ApplicationStatus | null>(null);

  const stats = useMemo(() => {
    const total = items.length;
    const interviewing = items.filter((a) => ['面试', 'Offer'].includes(a.status)).length;
    const offers = items.filter((a) => a.status === 'Offer').length;
    const followUps = items.filter((a) => a.status === '待跟进').length;
    return { total, interviewing, offers, followUps };
  }, [items]);

  const statusCounts = useMemo(
    () => STATUS_OPTIONS.map((s) => ({ status: s, count: items.filter((a) => a.status === s).length })),
    [items],
  );
  const cityBars = useMemo(() => countBy(items, (a) => a.city).slice(0, 6), [items]);
  const channelBars = useMemo(() => countBy(items, (a) => a.channel).slice(0, 6), [items]);

  // 环形图分段
  const donut = useMemo(() => {
    const total = items.length || 1;
    let acc = 0;
    const segs = statusCounts
      .filter((s) => s.count > 0)
      .map((s) => {
        const start = (acc / total) * 360;
        acc += s.count;
        const end = (acc / total) * 360;
        return `${STATUS_COLOR[s.status]} ${start}deg ${end}deg`;
      });
    return segs.length ? `conic-gradient(${segs.join(',')})` : '#efe9dd';
  }, [statusCounts, items.length]);

  const cMax = Math.max(1, ...cityBars.map((c) => c[1]));
  const chMax = Math.max(1, ...channelBars.map((c) => c[1]));

  const listForStatus = activeStatus ? items.filter((a) => a.status === activeStatus) : [];

  if (loading) return <EmptyState text="加载中…" />;
  if (items.length === 0)
    return (
      <EmptyState
        text="还没有投递数据，先去「投递记录」添加几条，这里会自动生成概览图表。"
        actionLabel="去投递记录"
        onAction={() => setScreen('applications')}
      />
    );

  return (
    <div className="flex flex-col gap-[22px] animate-rise">
      {/* 统计卡 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="投递总数" value={stats.total} sub="全部记录" bg="#d9e6d3" fg="#2f5d36" />
        <StatCard label="进入面试" value={stats.interviewing} sub={`进面率 ${pct(stats.interviewing, stats.total)}`} bg="#fbeec2" fg="#7a5a12" />
        <StatCard label="获得 Offer" value={stats.offers} sub={`Offer 率 ${pct(stats.offers, stats.total)}`} bg="#fbe0d8" fg="#a23d24" />
        <StatCard label="待跟进" value={stats.followUps} sub="需要处理" bg="#e4e0f7" fg="#4a3f96" />
      </div>

      {/* 状态环形图 + 状态筛选 */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-[22px]">
        <div style={{ ...CARD, padding: 24 }}>
          <div style={{ fontFamily: 'Poppins', fontSize: 17, fontWeight: 600 }}>状态分布</div>
          <div className="flex items-center gap-5" style={{ marginTop: 18, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: 172, height: 172, borderRadius: '50%', background: donut, flex: 'none' }}>
              <div style={{ position: 'absolute', inset: 34, borderRadius: '50%', background: '#fffdf8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 11, color: '#8a8478' }}>总计</div>
                <div style={{ fontFamily: 'Poppins', fontSize: 24, fontWeight: 700 }}>{stats.total}</div>
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-[10px]" style={{ minWidth: 160 }}>
              {statusCounts.map((s) => (
                <button
                  key={s.status}
                  onClick={() => setActiveStatus(activeStatus === s.status ? null : s.status)}
                  className="btn-press"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    fontSize: 13,
                    background: activeStatus === s.status ? '#f5f0e7' : 'transparent',
                    border: 'none',
                    borderRadius: 10,
                    padding: '6px 8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ width: 11, height: 11, borderRadius: 3, background: STATUS_COLOR[s.status], flex: 'none' }} />
                  <span style={{ flex: 1, color: '#5d584d' }}>{s.status}</span>
                  <strong style={{ fontFamily: 'Poppins' }}>{s.count}</strong>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 城市分布 */}
        <div style={{ ...CARD, padding: 24 }}>
          <div style={{ fontFamily: 'Poppins', fontSize: 17, fontWeight: 600 }}>投递城市分布</div>
          <div style={{ fontSize: 13, color: '#8a8478', marginTop: 3 }}>按城市统计全部 {stats.total} 份投递</div>
          {cityBars.length === 0 ? (
            <div style={{ fontSize: 13, color: '#a39d90', marginTop: 20 }}>暂无城市信息</div>
          ) : (
            <div className="flex items-end justify-between gap-[14px]" style={{ height: 200, marginTop: 22 }}>
              {cityBars.map(([city, v]) => (
                <div key={city} className="flex flex-col items-center gap-[10px]" style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ fontFamily: 'Poppins', fontSize: 14, fontWeight: 700 }}>{v}</div>
                  <div style={{ position: 'relative', width: '100%', maxWidth: 44, flex: 1, background: '#efe9dd', borderRadius: 999 }}>
                    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, borderRadius: 999, background: '#1b1a17', height: `${Math.round((v / cMax) * 100)}%` }} />
                  </div>
                  <div style={{ fontSize: 12.5, color: '#6b665c', fontWeight: 600, whiteSpace: 'nowrap' }}>{city}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 渠道分布 + 按状态查看列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[22px]">
        <div style={{ ...CARD, padding: 24 }}>
          <div style={{ fontFamily: 'Poppins', fontSize: 17, fontWeight: 600, marginBottom: 18 }}>投递渠道</div>
          {channelBars.length === 0 ? (
            <div style={{ fontSize: 13, color: '#a39d90' }}>暂无渠道信息</div>
          ) : (
            <div className="flex flex-col gap-[14px]">
              {channelBars.map(([ch, v]) => (
                <div key={ch}>
                  <div className="flex justify-between" style={{ fontSize: 12.5, color: '#6b665c', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{ch}</span>
                    <span>{v}</span>
                  </div>
                  <div style={{ background: '#eef0e8', borderRadius: 999, height: 10 }}>
                    <div style={{ height: 10, borderRadius: 999, background: '#5fa86b', width: `${Math.round((v / chMax) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ ...CARD, padding: 24 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: 'Poppins', fontSize: 17, fontWeight: 600 }}>
              {activeStatus ? `「${activeStatus}」的投递` : '按状态查看'}
            </div>
            {activeStatus && (
              <button onClick={() => setActiveStatus(null)} className="btn-press" style={{ background: 'none', border: 'none', fontSize: 13, color: '#8a8478', cursor: 'pointer' }}>
                清除
              </button>
            )}
          </div>
          {!activeStatus ? (
            <div style={{ fontSize: 13.5, color: '#8a8478' }}>点击左侧状态图例，可在此查看该状态下的投递列表。</div>
          ) : listForStatus.length === 0 ? (
            <div style={{ fontSize: 13.5, color: '#8a8478' }}>该状态暂无投递。</div>
          ) : (
            <div className="flex flex-col gap-2">
              {listForStatus.map((a) => {
                const tag = statusTag(a.status);
                return (
                  <div
                    key={a.id}
                    onClick={() => {
                      setQuery(a.company_name);
                      setScreen('applications');
                    }}
                    className="flex items-center justify-between"
                    style={{ border: '1px solid #f0ebe0', borderRadius: 13, padding: '11px 14px', cursor: 'pointer' }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {a.company_name} · {a.position_name}
                      </div>
                      <div style={{ fontSize: 12, color: '#8a8478', marginTop: 2 }}>{[a.city, a.channel].filter(Boolean).join(' · ') || '—'}</div>
                    </div>
                    <span style={{ background: tag.bg, color: tag.fg, fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, flex: 'none' }}>{a.status}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, bg, fg }: { label: string; value: number; sub: string; bg: string; fg: string }) {
  return (
    <div style={{ background: bg, borderRadius: 20, padding: '20px 22px' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: fg, opacity: 0.85 }}>{label}</div>
      <div style={{ fontFamily: 'Poppins', fontSize: 34, fontWeight: 700, color: fg, margin: '6px 0 2px' }}>{value}</div>
      <div style={{ fontSize: 12, color: fg, opacity: 0.72 }}>{sub}</div>
    </div>
  );
}

function pct(n: number, total: number) {
  if (!total) return '0%';
  return `${Math.round((n / total) * 100)}%`;
}
