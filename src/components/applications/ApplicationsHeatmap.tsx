import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { Application, ApplicationStatus } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { HEATMAP_OTHER_STAGES, HEATMAP_STAGES, filterHeatmapCompanies, heatmapStatusColors, summarizeApplicationHeatmap, type HeatmapSort } from '../../lib/applicationsHeatmap';
import { IconClose, IconSearch } from '../icons';
import './ApplicationsHeatmap.css';

interface Props {
  applications: Application[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

export default function ApplicationsHeatmap({ applications, loading, error, onClose }: Props) {
  const { theme } = useTheme();
  const dialog = useRef<HTMLDialogElement>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState<ApplicationStatus | 'all'>('all');
  const [sort, setSort] = useState<HeatmapSort>('progress');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selectedTile = useRef<HTMLButtonElement | null>(null);
  const summary = useMemo(() => summarizeApplicationHeatmap(applications), [applications]);
  const visible = useMemo(() => filterHeatmapCompanies(summary.companies, query, stage, sort), [summary.companies, query, stage, sort]);
  const selected = summary.companies.find(company => company.key === selectedKey);
  const statusColors = useMemo(() => Object.fromEntries([...HEATMAP_STAGES, ...HEATMAP_OTHER_STAGES].map(status =>
    [status, heatmapStatusColors(status, theme.accent, theme.accentSoft)])) as Record<ApplicationStatus, CSSProperties>, [theme.accent, theme.accentSoft]);
  const visibleJobs = visible.reduce((total, company) => total + company.applications.length, 0);

  useEffect(() => {
    const panel = dialog.current;
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    if (panel && !panel.open) panel.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      panel?.close();
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, []);

  useEffect(() => {
    if (selected) detailHeading.current?.focus({ preventScroll: true });
  }, [selectedKey, selected]);

  const clearSelection = () => {
    setSelectedKey(null);
    // The mobile grid becomes visible after React commits the detail dismissal.
    requestAnimationFrame(() => selectedTile.current?.focus({ preventScroll: true }));
  };
  const changeStage = (next: ApplicationStatus | 'all') => { setStage(next); setSelectedKey(null); };

  return createPortal(
    <dialog ref={dialog} className="applications-heatmap-dialog" aria-labelledby={titleId} aria-describedby={descriptionId}
      style={{ '--ah-accent': theme.accent, '--ah-accent-soft': theme.accentSoft } as CSSProperties}
      onCancel={event => { event.preventDefault(); if (selected) clearSelection(); else onClose(); }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      }}>
      <div className="ah-panel">
        <header className="ah-header">
          <div><h2 id={titleId}>求职进度热力图</h2><p id={descriptionId}>每格一家企业，颜色越深，进度越靠前。</p></div>
          <button type="button" className="ah-icon-button btn-press" aria-label="关闭热力图" onClick={onClose}><IconClose size={19} /></button>
        </header>
        {loading || error ? <div className="ah-state" role={error ? 'alert' : 'status'}><p>{error ? '暂时无法读取投递记录' : '正在加载投递记录…'}</p>{error && <span>{error}</span>}</div> : <>
          <section className="ah-summary" aria-label="全部投递记录统计">
            {[
              ['已投递企业', summary.companies.length, '按企业名称合并'],
              ['已投递岗位', summary.applied, '含已结束流程'],
              ['面试及 Offer 企业', summary.interviewing, 'AI 面至 Offer'],
              ['获得 Offer', summary.offers, '企业数量'],
            ].map(([label, value, note]) => <div key={label}><span>{label}</span><strong>{value}<small>{label === '已投递岗位' ? '条' : '家'}</small></strong><p>{note}</p></div>)}
          </section>
          <div className="ah-controls">
            <div className="ah-legend" role="group" aria-label="热力图进度筛选">
              <button type="button" className="ah-stage" aria-pressed={stage === 'all'} onClick={() => changeStage('all')}>全部 <span>{summary.companies.length}</span></button>
              {[...HEATMAP_STAGES, ...HEATMAP_OTHER_STAGES.filter(status => summary.counts[status] > 0)].map(status =>
                <button key={status} type="button" className="ah-stage" aria-pressed={stage === status} onClick={() => changeStage(status)}>
                  <i aria-hidden="true" style={statusColors[status]} className={HEATMAP_OTHER_STAGES.includes(status) ? 'ah-special-swatch' : ''} />{status}<span>{summary.counts[status]}</span>
                </button>)}
            </div>
            <div className="ah-tools">
              <label className="ah-search"><IconSearch size={16} aria-hidden="true" /><input type="search" aria-label="搜索热力图企业、岗位或城市" placeholder="搜索企业、岗位或城市" value={query} onChange={event => { setQuery(event.target.value); setSelectedKey(null); }} /></label>
              <select aria-label="热力图排列方式" value={sort} onChange={event => setSort(event.target.value as HeatmapSort)}><option value="progress">按进度排列</option><option value="name">按名称排列</option><option value="date">按投递日期排列</option><option value="count">按岗位数量排列</option></select>
              <span className="ah-count" role="status">{visible.length} 家企业 · {visibleJobs} 条岗位</span>
              <span className="ah-hint">点击色块查看岗位</span>
            </div>
          </div>
          <div className={`ah-layout${selected ? ' has-selection' : ''}`}>
            <div className="ah-main scrolly">
              {summary.companies.length === 0 ? <div className="ah-state"><p>{summary.pending > 0 ? '记录中的岗位都还未投递' : '还没有已投递的企业'}</p><span>新增投递记录后，企业进度会自动显示在这里。</span></div>
                : visible.length === 0 ? <div className="ah-state"><p>没有匹配的企业</p><button type="button" className="ah-text-button" onClick={() => { setQuery(''); changeStage('all'); }}>清除搜索和阶段筛选</button></div>
                  : <section className="ah-grid" aria-label="企业进度热力图">{visible.map(company => {
                    const special = HEATMAP_OTHER_STAGES.includes(company.stage);
                    return <button type="button" className={`ah-tile${special ? ' is-special' : ''}${selectedKey === company.key ? ' is-selected' : ''}`} key={company.key} style={statusColors[company.stage]}
                      data-company-key={company.key} data-stage={company.stage} aria-pressed={selectedKey === company.key}
                      aria-label={`${company.name}，当前${special ? '状态' : '最高进度'}${company.stage}，${company.applications.length}条岗位，查看详情`}
                      title={`${company.name} · ${company.stage} · ${company.applications.length} 个岗位`}
                      onClick={event => { selectedTile.current = event.currentTarget; setSelectedKey(company.key); }}>
                      <strong>{company.name}</strong><span><span>{company.stage}</span><span>{company.applications.length} 岗</span></span>
                    </button>;
                  })}</section>}
            </div>
            {selected && <aside className="ah-detail scrolly" aria-label="企业岗位详情">
              <div className="ah-detail-heading"><div><h3 ref={detailHeading} tabIndex={-1}>{selected.name}</h3><p>{selected.applications.length} 条已投递岗位记录</p></div><button type="button" className="ah-icon-button" onClick={clearSelection} aria-label="返回热力图"><IconClose size={16} /></button></div>
              {selected.applications.map(application => <article className="ah-job" key={application.id}>
                <h4>{application.position_name || '岗位名称未填写'}</h4><span className="ah-status" style={statusColors[application.status]}>{application.status}</span>
                <dl><dt>投递日期</dt><dd>{application.apply_date || '未填写'}</dd><dt>城市</dt><dd>{application.city || '未填写'}</dd><dt>投递渠道</dt><dd>{application.channel || '未填写'}</dd>{application.salary_range && <><dt>薪资范围</dt><dd>{application.salary_range}</dd></>}{application.next_action && <><dt>下一步</dt><dd>{application.next_action}</dd></>}</dl>
                {application.notes && <details><summary>查看备注</summary><p>{application.notes}</p></details>}
              </article>)}
            </aside>}
          </div>
          <footer className="ah-footer"><span>同企业多个岗位取当前最高阶段，详情保留各岗位状态。</span><span>{summary.pending > 0 ? `${summary.pending} 条待投递未计入。` : ''} 待跟进和归档状态单列。</span></footer>
        </>}
      </div>
    </dialog>, document.body,
  );
}
