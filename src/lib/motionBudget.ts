// ============================================================
// 动效预算：一个极小的“当前是否忙”信号
//
// 滚动、看板拖拽、地图漫游、弹窗打开这些时刻，屏幕上已经有
// 高成本合成工作。此时把弥散背景的 SVG 滤镜与漂移动画暂停，
// 可以把这一帧的预算让给用户正在操作的内容。
//
// 只暂停动画，不改变任何颜色、构图或布局。
// ============================================================

type Listener = (busy: boolean) => void;

const listeners = new Set<Listener>();

/** 显式占用计数：弹窗、拖拽、长按等有明确起止的场景 */
let holds = 0;
/** 瞬时活动的结束时间戳（滚动、漫游等只有“正在发生”的场景） */
let pulseUntil = 0;
let pulseTimer = 0;
let busy = false;

const DEFAULT_PULSE_MS = 220;

function recompute() {
  const next = holds > 0 || pulseUntil > performance.now();
  if (next === busy) return;
  busy = next;
  listeners.forEach((listener) => listener(busy));
}

function checkPulse() {
  const remaining = pulseUntil - performance.now();
  if (remaining > 0) {
    pulseTimer = window.setTimeout(checkPulse, remaining);
    return;
  }
  // 必须先清掉截止时间：否则 recompute 仍会认为处于活动中，
  // 而此时已经没有定时器会再来唤醒它，忙碌状态就卡住了。
  pulseTimer = 0;
  pulseUntil = 0;
  recompute();
}

/**
 * 标记一次瞬时活动，并在 `ms` 毫秒无新活动后恢复空闲。
 * 高频事件（滚动、漫游）每次只更新一个时间戳，不反复创建定时器。
 */
export function pulseMotionBudget(ms: number = DEFAULT_PULSE_MS) {
  pulseUntil = performance.now() + ms;
  if (!pulseTimer) pulseTimer = window.setTimeout(checkPulse, ms);
  recompute();
}

/** 占用动效预算，返回释放函数。重复释放安全。 */
export function holdMotionBudget(): () => void {
  holds += 1;
  recompute();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holds = Math.max(0, holds - 1);
    recompute();
  };
}

export function subscribeMotionBudget(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isMotionBudgetBusy(): boolean {
  return busy;
}

/** 系统减弱动效开关，供命令式渲染（ECharts、SVG SMIL）读取。 */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
