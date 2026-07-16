import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Application } from '../../types';
import './ActionQueueOrbit.css';

interface ActionQueueOrbitProps {
  apps: Application[];
  onViewDetail: (app: Application) => void;
  onViewAll?: () => void;
  onAddAction?: () => void;
  /** Keeps the dashboard's desktop two-column row at its established height. */
  fillHeight?: boolean;
}

type QueueStatus = 'pending' | 'interview' | 'follow-up' | 'review';
type ColorVariant = 'blue' | 'purple' | 'mint' | 'peach' | 'sand' | 'slate';

interface ActionQueueItem {
  id: string;
  app: Application;
  companyName: string;
  positionName: string;
  companyInitial: string;
  status: QueueStatus;
  colorVariant: ColorVariant;
  width: number;
  nextAction: string;
  updated: string;
}

const STATUS: Record<QueueStatus, { label: string; next: string }> = {
  pending: { label: '待投递', next: '完善简历后完成投递' },
  interview: { label: '待面试', next: '准备面试题库与自我介绍' },
  'follow-up': { label: '待沟通', next: '回复 HR 消息确认时间' },
  review: { label: '待复盘', next: '记录面试问题与改进点' },
};

const VARIANTS: ColorVariant[] = ['blue', 'purple', 'peach', 'mint', 'slate', 'sand'];
const DURATIONS = [38, 45, 40, 48];
const DELAYS = [-6, -19, -11, -27];

function rotate<T>(items: T[], amount: number) {
  if (items.length === 0) return items;
  const start = amount % items.length;
  return items.slice(start).concat(items.slice(0, start));
}

function queueStatusFor(app: Application): QueueStatus {
  if (app.status === '待投递') return 'pending';
  if (['笔试', '一面', '二面', 'HR面'].includes(app.status)) return 'interview';
  if (['已投递', '简历筛选', '待跟进'].includes(app.status)) return 'follow-up';
  return 'review';
}

function relativeUpdated(value: string | null) {
  if (!value) return '最近更新';
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return value;
  const days = Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  return `${days} 天前`;
}

function toQueueItem(app: Application, index: number): ActionQueueItem {
  const status = queueStatusFor(app);
  return {
    id: app.id,
    app,
    companyName: app.company_name,
    positionName: app.position_name,
    companyInitial: app.company_name.trim().charAt(0) || '企',
    status,
    colorVariant: VARIANTS[index % VARIANTS.length],
    width: 232 + (index % 3) * 14,
    nextAction: app.next_action || STATUS[status].next,
    updated: relativeUpdated(app.updated_at || app.created_at),
  };
}

function QueueCard({ item, duplicate, onOpen }: {
  item: ActionQueueItem;
  duplicate?: boolean;
  onOpen?: (item: ActionQueueItem) => void;
}) {
  const content = (
    <>
      <span className="action-queue-card__avatar" aria-hidden="true">{item.companyInitial}</span>
      <span className="action-queue-card__copy">
        <span className="action-queue-card__company">{item.companyName}</span>
        <span className="action-queue-card__position">{item.positionName}</span>
      </span>
    </>
  );
  const style = { '--aq-card-width': `${item.width}px` } as React.CSSProperties;

  if (duplicate) {
    return <div className={`action-queue-card action-queue-card--${item.colorVariant}`} style={style}>{content}</div>;
  }

  return (
    <button
      className={`action-queue-card action-queue-card--${item.colorVariant}`}
      style={style}
      type="button"
      aria-label={`查看 ${item.companyName} ${item.positionName} 的行动详情`}
      onClick={() => onOpen?.(item)}
    >
      {content}
    </button>
  );
}

function QueueRow({ items, index, onOpen }: {
  items: ActionQueueItem[];
  index: number;
  onOpen: (item: ActionQueueItem) => void;
}) {
  const trackStyle = {
    animation: `aqMarquee ${DURATIONS[index]}s linear infinite`,
    animationDelay: `${DELAYS[index]}s`,
  } as React.CSSProperties;

  return (
    <div className="action-queue-row">
      <div className="action-queue-track" style={trackStyle}>
        <div className="action-queue-card-set">
          {items.map((item) => <QueueCard key={item.id} item={item} onOpen={onOpen} />)}
        </div>
        <div className="action-queue-card-set action-queue-card-set--duplicate aq-dup" aria-hidden="true">
          {items.map((item) => <QueueCard key={`duplicate-${item.id}`} item={item} duplicate />)}
        </div>
      </div>
    </div>
  );
}

function DetailDrawer({ item, onClose, onViewDetail }: {
  item: ActionQueueItem;
  onClose: () => void;
  onViewDetail: (app: Application) => void;
}) {
  const status = STATUS[item.status];
  const handleProcess = () => {
    onClose();
    onViewDetail(item.app);
  };

  return (
    <div className="action-queue-drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className="action-queue-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="行动详情"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="action-queue-drawer__topline">
          <span className="action-queue-drawer__status">{status.label}</span>
          <button className="action-queue-drawer__close" type="button" aria-label="关闭详情" onClick={onClose}>×</button>
        </div>
        <div className="action-queue-drawer__identity">
          <span className={`action-queue-drawer__avatar action-queue-drawer__avatar--${item.colorVariant}`} aria-hidden="true">{item.companyInitial}</span>
          <div>
            <p>{item.companyName}</p>
            <h3>{item.positionName}</h3>
          </div>
        </div>
        <dl className="action-queue-drawer__facts">
          <div><dt>当前阶段</dt><dd>{status.label}</dd></div>
          <div><dt>建议下一步</dt><dd>{item.nextAction}</dd></div>
          <div><dt>最近更新</dt><dd>{item.updated}</dd></div>
        </dl>
        <div className="action-queue-drawer__actions">
          <button className="action-queue-drawer__primary" type="button" onClick={handleProcess}>去处理</button>
          <button className="action-queue-drawer__secondary" type="button" onClick={onClose}>稍后处理</button>
        </div>
      </aside>
    </div>
  );
}

export default function ActionQueueOrbit({ apps, onViewDetail, onViewAll, onAddAction, fillHeight = false }: ActionQueueOrbitProps) {
  const [selected, setSelected] = useState<ActionQueueItem | null>(null);
  const items = useMemo(() => apps.map(toQueueItem), [apps]);
  const rows = useMemo(
    () => [items, rotate(items, 5), [...rotate(items, 8)].reverse(), rotate(items, 3)],
    [items],
  );
  const closeDetail = useCallback(() => setSelected(null), []);

  useEffect(() => {
    if (!selected) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDetail();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeDetail, selected]);

  return (
    <section className={`action-queue${fillHeight ? ' action-queue--fill-height' : ''}`} data-theme="light" aria-labelledby="action-queue-heading">
      <div className="action-queue-panel">
        <header className="action-queue-header">
          <div className="action-queue-heading">
            <div className="action-queue-heading__titleline">
              <h2 id="action-queue-heading">行动队列</h2>
              <span>{items.length} 条待推进</span>
            </div>
            <p>集中查看当前需要继续推进的求职任务</p>
          </div>
          <div className="action-queue-header__actions">
            <button className="action-queue-ghost" type="button">筛选</button>
            <button className="action-queue-ghost" type="button" onClick={onViewAll}>查看全部</button>
            <button className="action-queue-add" type="button" onClick={onAddAction}>＋ 添加行动</button>
          </div>
        </header>

        {items.length > 0 ? (
          <div className="action-queue-mask">
            {rows.map((row, index) => <QueueRow key={index} items={row} index={index} onOpen={setSelected} />)}
            <div className="action-queue-edge action-queue-edge--left" aria-hidden="true" />
            <div className="action-queue-edge action-queue-edge--right" aria-hidden="true" />
          </div>
        ) : (
          <p className="action-queue-empty">暂无待推进的投递，去「投递记录」添加一条吧。</p>
        )}
      </div>

      {selected && <DetailDrawer item={selected} onClose={closeDetail} onViewDetail={onViewDetail} />}
    </section>
  );
}
