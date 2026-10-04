import { useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, CalendarDays, ChevronDown, ChevronRight, MousePointer2, X } from 'lucide-react';
import type { Interview } from '../../types';
import { initialOf } from '../../lib/appHelpers';
import './RecentInterviewFolder.css';

const PALETTES = [
  ['#477b61', '#eaf1e8'], ['#62819a', '#eaf0f3'], ['#a8794c', '#f5edde'],
  ['#93809d', '#f0ebf2'], ['#7b8860', '#edf0e4'],
];
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function interviewDate(value: string | null) {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date : null;
}
function shortTime(date: Date | null) {
  return date?.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) ?? '时间待定';
}
function colors(index: number): CSSProperties {
  const [accent, tint] = PALETTES[index % PALETTES.length];
  return { '--rif-accent': accent, '--rif-tint': tint } as CSSProperties;
}

interface CardOrigin { x: number; y: number; width: number; height: number; angle: number }
function measureOrigin(element: HTMLElement): CardOrigin {
  const rect = element.getBoundingClientRect();
  const matrix = new DOMMatrix(getComputedStyle(element).transform);
  const scene = element.closest('.rif-scene');
  const sceneMatrix = new DOMMatrix(scene ? getComputedStyle(scene).transform : undefined);
  const scale = Math.hypot(matrix.a, matrix.b) * Math.hypot(sceneMatrix.a, sceneMatrix.b);
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2,
    width: element.offsetWidth * scale, height: element.offsetHeight * scale,
    angle: Math.atan2(matrix.b, matrix.a) * 180 / Math.PI };
}
function transformFrom(origin: CardOrigin, sheet: HTMLElement) {
  const rect = sheet.getBoundingClientRect();
  return `translate(${origin.x - rect.x - rect.width / 2}px, ${origin.y - rect.y - rect.height / 2}px) rotate(${origin.angle}deg) scale(${origin.width / rect.width}, ${origin.height / rect.height})`;
}

interface Selection { interview: Interview; index: number; source: HTMLButtonElement; origin: CardOrigin }
interface Props { interviews: Interview[]; onViewAll: () => void; onViewCalendar: (interview: Interview) => void; loading?: boolean; error?: string | null; onRetry?: () => void }

export default function RecentInterviewFolder({ interviews, onViewAll, onViewCalendar, loading, error, onRetry }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardsId = useId();
  const visible = interviews.slice(0, 5);
  const hasCards = visible.length > 0;
  const isOpen = hasCards && expanded;

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const resize = () => {
      const width = stage.clientWidth;
      const compact = width < 480;
      const scale = Math.min(1, Math.max(0.2, (width - 12) / (compact ? 650 : 800)));
      stage.style.setProperty('--rif-scale', String(scale));
      stage.style.setProperty('--rif-spread', compact ? '78px' : '112px');
      stage.style.height = `${475 * scale + 20}px`;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="recent-interview-folder" aria-label="近期面试">
      <header className="rif-header">
        <h2>近期面试</h2>
        <button type="button" className="rif-link" onClick={onViewAll}>查看全部 <ChevronRight size={14} /></button>
      </header>
      <p className="rif-intro">把每一次机会，认真收藏。</p>
      <div ref={stageRef} className={`rif-stage${isOpen ? ' rif-open' : ''}${!hasCards ? ' rif-empty' : ''}`} aria-busy={loading}>
        <div className="rif-scene">
          <div className="rif-shadow" /><div className="rif-back" />
          <div id={cardsId}>
            {visible.map((iv, index) => {
              const c = index - (visible.length - 1) / 2;
              return (
                <button key={iv.id} type="button"
                  className={`rif-card${selection?.interview.id === iv.id ? ' rif-selected' : ''}`}
                  style={{ ...colors(index), '--rif-i': index, '--rif-c': c, '--rif-y': `${-135 + Math.abs(c) * 24}px`, '--rif-r': `${c * 12}deg` } as CSSProperties}
                  tabIndex={isOpen ? 0 : -1} aria-hidden={!isOpen} disabled={!isOpen}
                  aria-label={`${iv.company_name}，${iv.position_name || '岗位待补充'}，${shortTime(interviewDate(iv.interview_time))}，查看面试详情`}
                  onClick={(event) => setSelection({ interview: iv, index, source: event.currentTarget, origin: measureOrigin(event.currentTarget) })}>
                  <span className="rif-card-top"><span className="rif-mark">{initialOf(iv.company_name)}</span><span className="rif-round">{iv.round || '面试'}</span></span>
                  <span className="rif-company" title={iv.company_name}>{iv.company_name}</span>
                  <span className="rif-role" title={iv.position_name || undefined}>{iv.position_name || '岗位待补充'}</span>
                  <span className="rif-divider" />
                  <span className="rif-date"><CalendarDays size={13} />{shortTime(interviewDate(iv.interview_time))}</span>
                  <span className="rif-mode">{iv.interview_type || '方式待确认'}</span>
                  <span className="rif-index">{String(index + 1).padStart(2, '0')}</span>
                </button>
              );
            })}
          </div>
          {!hasCards && <p className="rif-empty-hint">{loading ? '正在整理面试安排…' : error ? '面试安排暂时未能加载' : '新的机会，会在这里等你。'}</p>}
          <button type="button" className="rif-front" disabled={loading}
            aria-label={hasCards ? isOpen ? '收起面试文件夹' : '展开面试文件夹' : '去面试日历添加'}
            aria-expanded={isOpen} aria-controls={cardsId}
            onClick={() => hasCards ? setExpanded((value) => !value) : onViewAll()}>
            <span className="rif-folder-label"><CalendarDays size={22} />我的面试</span>
            <span className="rif-folder-meta">{String(visible.length).padStart(2, '0')} INTERVIEWS</span>
            <span className="rif-seal"><ChevronDown size={17} /></span>
          </button>
        </div>
      </div>
      <div className="rif-caption">
        <p className="rif-caption-title">{hasCards ? '下一站，新的可能' : '给下一次机会，留一个位置'}</p>
        <p className="rif-caption-desc" aria-live="polite">
          {loading ? '正在加载面试安排…' : error ? <button type="button" className="rif-link" onClick={onRetry}>加载失败，点击重试</button> : hasCards
            ? isOpen ? '选择一张卡片，展开这次机会的全部细节' : `点击文件夹，展开 ${visible.length} 场近期面试`
            : <>暂无安排。<button type="button" className="rif-link" onClick={onViewAll}>去面试日历添加 <ChevronRight size={13} /></button></>}
        </p>
      </div>
      {hasCards && <div className="rif-bottom"><span><MousePointer2 size={14} /><span className="rif-desktop-hint">展开文件夹 · 悬停选卡 · 点击放大</span><span className="rif-touch-hint">点击文件夹展开 · 轻点卡片放大</span></span><button type="button" onClick={() => setExpanded((value) => !value)}>{isOpen ? '收起卡片' : '展开卡片'}</button></div>}
      {selection && visible.some((iv) => iv.id === selection.interview.id) && <InterviewDetail selection={selection} onClose={() => setSelection(null)} onViewCalendar={onViewCalendar} />}
    </section>
  );
}

function InterviewDetail({ selection, onClose, onViewCalendar }: { selection: Selection; onClose: () => void; onViewCalendar: (interview: Interview) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const closingRef = useRef(false);
  const aliveRef = useRef(false);
  const titleId = useId();
  const { interview: iv, index, source, origin } = selection;
  const date = interviewDate(iv.interview_time);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const sheet = sheetRef.current;
    if (!dialog || !sheet) return;
    aliveRef.current = true;
    closingRef.current = false;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    const animation = sheet.animate([{ transform: transformFrom(origin, sheet), opacity: 0.7, borderRadius: '14px' }, { transform: 'none', opacity: 1, borderRadius: '23px' }], { duration: reducedMotion() ? 1 : 680, easing: 'cubic-bezier(.2,.8,.2,1)' });
    animationRef.current = animation;
    return () => {
      aliveRef.current = false;
      animationRef.current?.cancel();
      dialog.close();
      document.body.style.overflow = overflow;
      if (source.isConnected) source.focus({ preventScroll: true });
    };
  }, [origin, source]);

  const close = async (viewCalendar = false) => {
    if (closingRef.current || !sheetRef.current || !dialogRef.current) return;
    closingRef.current = true;
    animationRef.current?.finish();
    dialogRef.current.classList.add('rif-closing');
    const sheet = sheetRef.current;
    const target = source.isConnected ? measureOrigin(source) : origin;
    const animation = sheet.animate([{ transform: 'none', opacity: 1 }, { transform: transformFrom(target, sheet), opacity: 0.1 }], { duration: reducedMotion() ? 1 : 460, easing: 'cubic-bezier(.4,0,.2,1)' });
    animationRef.current = animation;
    try { await animation.finished; } catch { return; }
    if (!aliveRef.current) return;
    onClose();
    if (viewCalendar) onViewCalendar(iv);
  };

  return createPortal(
    <dialog ref={dialogRef} className="rif-dialog" aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); void close(); }}
      onClick={(event) => { if (event.target === event.currentTarget) void close(); }}>
      <article ref={sheetRef} className="rif-detail-sheet" style={colors(index)}>
        <button type="button" className="rif-close" aria-label="关闭面试详情" onClick={() => void close()}><X size={15} /></button>
        <div className="rif-card-top"><span className="rif-mark">{initialOf(iv.company_name)}</span><span className="rif-round">{iv.round || '面试'}</span></div>
        <h2 className="rif-company" id={titleId}>{iv.company_name}</h2><span className="rif-role">{iv.position_name || '岗位待补充'}</span>
        <div className="rif-details">
          <div className="rif-detail-time"><span className="rif-day">{date ? String(date.getDate()).padStart(2, '0') : '—'}<small>{date ? `${date.getMonth() + 1}月` : ''}</small></span><div className="rif-time-copy"><span>{date?.toLocaleDateString('zh-CN', { year: 'numeric', weekday: 'long' }) ?? '日期待定'}</span><strong>{date?.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }) ?? '时间待定'}</strong></div></div>
          <dl className="rif-fields"><dt>面试岗位</dt><dd>{iv.position_name || '待补充'}</dd><dt>面试轮次</dt><dd>{iv.round || '待确认'}</dd><dt>面试方式</dt><dd>{iv.interview_type || '待确认'}</dd></dl>
          <div className="rif-note"><span>面试备忘</span><p>{iv.notes || '暂无备注，可前往面试日历补充。'}</p></div>
          <button type="button" className="rif-return" onClick={() => void close()}><ArrowLeft size={16} />放回文件夹</button>
          <button type="button" className="rif-calendar-link" onClick={() => void close(true)}>在面试日历中查看 <ChevronRight size={13} /></button>
        </div>
      </article>
    </dialog>, document.body,
  );
}
