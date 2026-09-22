import type { ElephantClip } from './elephantAnimations';

export type ElephantAction = ElephantClip['id'];
export type ElephantAsset = ElephantAction | 'sit-down' | 'lie-down' | 'wake-up' | 'stand-up';
export type PlaybackState = { status: 'loading' | 'ready' | 'blocked' | 'error'; asset: ElephantAsset | null; transitioning: boolean };
const ROOT = '/pet/elephant-v3/';
export const isElephantTransition = (asset: ElephantAsset) => asset.includes('-');
const posture = (asset: ElephantAsset) => asset === 'sleep' || asset === 'lie-down' ? 'lying'
  : ['sit', 'sit-down', 'wake-up'].includes(asset) ? 'sitting' : 'standing';

/** Route through actual forward footage, never reverse a walk or teleport a body pose. */
export function nextElephantAsset(current: ElephantAsset | null, desired: ElephantAction): ElephantAsset {
  if (!current) return desired;
  const from = posture(current), to = posture(desired);
  if (from === to) return desired;
  if (from === 'lying') return 'wake-up';
  if (from === 'standing') return 'sit-down';
  return to === 'lying' ? 'lie-down' : 'stand-up';
}

/** Two hardware-decoded decks. Preload the next pose while the current transition plays. */
export class ElephantPlayback {
  private desired: ElephantAction = 'curious';
  private active: { video: HTMLVideoElement; asset: ElephantAsset } | null = null;
  private staged: { video: HTMLVideoElement; asset: ElephantAsset; ready: boolean; events: AbortController; timeout: ReturnType<typeof setTimeout> } | null = null;
  private animations: Animation[] = [];
  private fading = false;
  private disposed = false;
  private paused = false;
  private speed = 1;
  private status: PlaybackState['status'] = 'loading';
  private events = new AbortController();
  private decks: [HTMLVideoElement, HTMLVideoElement];
  private report: (state: PlaybackState) => void;

  constructor(decks: [HTMLVideoElement, HTMLVideoElement], report: (state: PlaybackState) => void) {
    this.decks = decks; this.report = report;
    for (const video of decks) {
      video.addEventListener('ended', () => { if (this.active?.video === video) this.pump(); }, { signal: this.events.signal });
    }
    document.addEventListener('visibilitychange', this.sync, { signal: this.events.signal });
  }

  request(action: ElephantAction) { this.desired = action; this.pump(); }
  configure(paused: boolean, speed: number) {
    this.paused = paused; this.speed = speed; this.sync();
    if (this.active && matchMedia('(prefers-reduced-motion: reduce)').matches) this.pump();
  }
  retry() { if (this.status === 'blocked') { this.status = 'ready'; this.sync(); this.emit(); } }
  private emit() {
    if (!this.disposed) this.report({ status: this.status, asset: this.active?.asset ?? null,
      transitioning: this.fading || Boolean(this.active && isElephantTransition(this.active.asset)) });
  }
  private play(video: HTMLVideoElement) {
    void video.play().catch((error: DOMException) => {
      if (!this.disposed && error.name !== 'AbortError' && this.active?.video === video) {
        this.status = 'blocked'; this.emit();
      }
    });
  }
  private sync = () => {
    const stopped = this.paused || document.hidden;
    for (const video of this.decks) {
      // Keep posture changes at their authored speed; running only accelerates the gait.
      video.playbackRate = video.dataset.asset === 'walk' ? this.speed : 1;
      if (stopped) video.pause();
      else if (!video.ended && (video === this.active?.video || (this.fading && video.dataset.visible === 'true'))) this.play(video);
    }
    for (const animation of this.animations) {
      if (stopped) animation.pause(); else animation.play();
    }
  };
  private clearStaged() {
    if (!this.staged) return;
    this.staged.events.abort(); clearTimeout(this.staged.timeout); this.staged = null;
  }
  private pump() {
    if (this.disposed || this.fading) return;
    if (this.active?.asset === this.desired) { this.clearStaged(); return; }
    const asset = matchMedia('(prefers-reduced-motion: reduce)').matches ? this.desired : nextElephantAsset(this.active?.asset ?? null, this.desired);
    if (this.staged?.asset === asset) { this.show(); return; }
    this.clearStaged();
    const video = this.active?.video === this.decks[0] ? this.decks[1] : this.decks[0];
    const events = new AbortController();
    const failed = () => {
      if (this.staged?.video !== video || this.disposed) return;
      this.clearStaged(); this.status = 'error'; this.emit();
    };
    this.staged = { video, asset, ready: false, events, timeout: setTimeout(failed, 12000) };
    video.pause(); video.style.opacity = '0'; video.dataset.visible = 'false';
    video.dataset.asset = asset; video.loop = !isElephantTransition(asset);
    video.addEventListener('canplay', () => {
      if (!this.staged || this.staged.video !== video) return;
      this.staged.ready = true; clearTimeout(this.staged.timeout); this.show();
    }, { signal: events.signal });
    video.addEventListener('error', failed, { signal: events.signal });
    video.src = `${ROOT}${asset}.webm`; video.load();
  }
  private show() {
    if (!this.staged?.ready || this.fading || this.disposed) return;
    if (this.active && isElephantTransition(this.active.asset) && !this.active.video.ended && !matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const previous = this.active;
    const { video, asset } = this.staged;
    this.clearStaged();
    this.active = { video, asset }; this.status = 'ready'; video.dataset.visible = 'true';
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = !previous || reduced ? 0 : isElephantTransition(asset) || isElephantTransition(previous.asset) ? 180 : 320;
    if (!duration) {
      video.style.opacity = '1';
      if (previous) { previous.video.style.opacity = '0'; previous.video.dataset.visible = 'false'; previous.video.pause(); }
      this.emit(); this.sync(); this.pump(); return;
    }
    this.fading = true;
    // Both decks continue moving during the blend. Never freeze the outgoing pose.
    this.animations = [video.animate([{ opacity: 0 }, { opacity: 1 }], { duration, easing: 'ease-in-out', fill: 'forwards' }),
      previous!.video.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing: 'ease-in-out', fill: 'forwards' })];
    this.emit(); this.sync();
    void Promise.all(this.animations.map(animation => animation.finished)).then(() => {
      if (this.disposed) return;
      video.style.opacity = '1'; previous!.video.style.opacity = '0';
      previous!.video.dataset.visible = 'false'; previous!.video.pause();
      for (const animation of this.animations) animation.cancel();
      this.animations = []; this.fading = false; this.emit(); this.pump();
    }).catch(() => { /* Disposal cancels the pending fade. */ });
  }
  dispose() {
    this.disposed = true; this.events.abort(); this.clearStaged();
    for (const animation of this.animations) animation.cancel();
    for (const video of this.decks) { video.pause(); video.removeAttribute('src'); video.load(); }
  }
}
