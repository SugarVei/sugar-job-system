import { useMemo } from 'react';
import type { Application, ApplicationStatus } from '../../types';
import { useAppShell } from '../../contexts/AppShellContext';
import { STATUS_OPTIONS, statusTag } from '../../lib/appHelpers';
import { APPLICATION_STATUS_COLORS } from '../../lib/applicationStatus';

const LIST_LIMIT = 4;

export default function StatusDistributionCard({ applications, activeStatus, onSelect }: {
  applications: Application[];
  activeStatus: ApplicationStatus | null;
  onSelect: (status: ApplicationStatus | null) => void;
}) {
  const { navigate } = useAppShell();
  const counts = useMemo(
    () => STATUS_OPTIONS.map((status) => ({ status, count: applications.filter((a) => a.status === status).length })).filter((s) => s.count > 0),
    [applications],
  );
  const donut = useMemo(() => {
    const total = applications.length || 1;
    let acc = 0;
    const segments = counts.map(({ status, count }) => {
      const start = (acc / total) * 360;
      acc += count;
      return `${APPLICATION_STATUS_COLORS[status].chart} ${start}deg ${(acc / total) * 360}deg`;
    });
    return segments.length ? `conic-gradient(${segments.join(',')})` : 'var(--do-tint)';
  }, [counts, applications.length]);
  const selected = activeStatus ? applications.filter((a) => a.status === activeStatus) : [];

  return (
    <section className="do-card do-status-card" aria-label="状态分布">
      <header className="do-card-head">
        <div><h3>状态分布</h3><p>点击任一状态，下方展开对应投递</p></div>
      </header>
      <div className="do-status-body">
        <div className="do-donut" style={{ background: donut }}>
          <div><strong>{applications.length}</strong>总计</div>
        </div>
        <div className="do-status-legend">
          {counts.map(({ status, count }) => (
            <button key={status} type="button" aria-pressed={activeStatus === status} onClick={() => onSelect(activeStatus === status ? null : status)}>
              <i style={{ background: APPLICATION_STATUS_COLORS[status].chart }} />
              <span>{status}</span>
              <b>{count}</b>
            </button>
          ))}
        </div>
      </div>
      {!activeStatus && <p className="do-status-hint">选一个状态，这里会列出对应的投递</p>}
      {activeStatus && (
        <div className="do-status-list">
          <div className="do-status-list-head">
            <span>「{activeStatus}」· {selected.length} 条</span>
            <button type="button" className="do-link" onClick={() => navigate('applications', { applicationsFilter: activeStatus })}>打开投递记录 ›</button>
          </div>
          {selected.slice(0, LIST_LIMIT).map((a) => {
            const tag = statusTag(a.status);
            return (
              <button key={a.id} type="button" className="do-status-row" onClick={() => navigate('applications', { query: a.company_name, applicationsFilter: a.status })}>
                <span>
                  <strong>{a.company_name} · {a.position_name}</strong>
                  <small>{[a.city, a.channel].filter(Boolean).join(' · ') || '—'}</small>
                </span>
                <em style={{ background: tag.bg, color: tag.fg }}>{a.status}</em>
              </button>
            );
          })}
          {selected.length > LIST_LIMIT && <p className="do-status-more">还有 {selected.length - LIST_LIMIT} 条，打开投递记录查看全部</p>}
        </div>
      )}
    </section>
  );
}
