import type { ElephantClip } from './elephantAnimations';
import { chooseElephantEntryPose, loadElephantPoses, type PoseSample } from './elephantPoseMatching';

export type ElephantAction = ElephantClip['id'];
export type ElephantAsset = ElephantAction | 'sit-down' | 'lie-down' | 'wake-up' | 'stand-up';
export type PlaybackState = { status: 'loading' | 'ready' | 'blocked' | 'error'; asset: ElephantAsset | null; transitioning: boolean };
const ROOT = '/pet/elephant-v4/';
const LOOP_TAIL = .3;
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

/** Warm the other decoder before every boundary, including a repeat of the same action. */
export class ElephantPlayback {
  private desired: ElephantAction = 'curious';
  private active: { video: HTMLVideoElement; asset: ElephantAsset } | null = null;
  private staged: { video: HTMLVideoElement; asset: ElephantAsset; repeat: boolean; matched: boolean;
    ready: boolean; events: AbortController; timeout: ReturnType<typeof setTimeout> } | null = null;
  private animations: Animation[] = [];
  private fading = false;
  private loopHandoff = false;
  private disposed = false;
  private paused = false;
  private speed = 1;
  private actualSpeed = 1;
  private rateFrame = 0;
  private watchVideo: HTMLVideoElement | null = null;
  private videoFrame = 0;
  private fallbackFrame = 0;
  private poses: Record<string, PoseSample[]> = {};
  private status: PlaybackState['status'] = 'loading';
  private events = new AbortController();
  private decks: [HTMLVideoElement, HTMLVideoElement];
  private report: (state: PlaybackState) => void;

  constructor(decks: [HTMLVideoElement, HTMLVideoElement], report: (state: PlaybackState) => void) {
    this.decks = decks; this.report = report;
    void loadElephantPoses().then(poses => { if (!this.disposed) this.poses = poses; });
    for (const video of decks) {
      video.addEventListener('ended', () => { if (this.active?.video === video) this.pump(); }, { signal: this.events.signal });
    }
    document.addEventListener('visibilitychange', this.sync, { signal: this.events.signal });
  }

  request(action: ElephantAction) { this.desired = action; this.pump(); }
  configure(paused: boolean, speed: number) {
    this.paused = paused;
    if (speed !== this.speed) {
      this.speed = speed;
      cancelAnimationFrame(this.rateFrame);
      const start = performance.now(), from = this.actualSpeed;
      const ramp = (now: number) => {
        if (this.disposed) return;
        const t = Math.min(1, (now - start) / 260);
        this.actualSpeed = from + (this.speed - from) * t * t * (3 - 2 * t);
        this.applyRates();
        if (t < 1) this.rateFrame = requestAnimationFrame(ramp);
      };
      this.rateFrame = requestAnimationFrame(ramp);
    }
    this.sync();
    if (this.active && matchMedia('(prefers-reduced-motion: reduce)').matches) this.pump();
  }
  retry() { if (this.status === 'blocked') { this.status = 'ready'; this.sync(); this.emit(); } }
  private emit() {
    if (!this.disposed) this.report({ status: this.status, asset: this.active?.asset ?? null,
      transitioning: (this.fading && !this.loopHandoff) || Boolean(this.active && isElephantTransition(this.active.asset)) });
  }
  private play(video: HTMLVideoElement) {
    void video.play().catch((error: DOMException) => {
      if (!this.disposed && error.name !== 'AbortError' && this.active?.video === video) {
        this.status = 'blocked'; this.emit();
      }
    });
  }
  private applyRates() {
    for (const video of this.decks) video.playbackRate = video.dataset.asset?.includes('-') ? 1 : this.actualSpeed;
  }
  private sync = () => {
    const stopped = this.paused || document.hidden;
    this.applyRates();
    for (const video of this.decks) {
      if (stopped) video.pause();
      else if (!video.ended && (video === this.active?.video || (this.fading && video.dataset.visible === 'true'))) this.play(video);
    }
    for (const animation of this.animations) { if (stopped) animation.pause(); else animation.play(); }
  };
  private cancelWatch() {
    if (this.videoFrame) this.watchVideo?.cancelVideoFrameCallback(this.videoFrame);
    cancelAnimationFrame(this.fallbackFrame);
    this.videoFrame = this.fallbackFrame = 0;
  }
  private watch() {
    this.cancelWatch();
    const video = this.active?.video;
    if (!video) return;
    this.watchVideo = video;
    const tick = () => {
      if (this.disposed || this.active?.video !== video) return;
      this.show();
      if (this.active?.video !== video) return;
      if ('requestVideoFrameCallback' in video) this.videoFrame = video.requestVideoFrameCallback(tick);
      else this.fallbackFrame = requestAnimationFrame(tick);
    };
    tick();
  }
  private clearStaged() {
    if (!this.staged) return;
    this.staged.events.abort(); clearTimeout(this.staged.timeout); this.staged = null;
  }
  private pump() {
    if (this.disposed || this.fading) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const repeat = this.active?.asset === this.desired;
    if (repeat && reduced) { this.clearStaged(); return; }
    const asset = reduced ? this.desired : nextElephantAsset(this.active?.asset ?? null, this.desired);
    if (this.staged?.asset === asset && this.staged.repeat === repeat) { this.show(); return; }
    this.clearStaged();
    const video = this.active?.video === this.decks[0] ? this.decks[1] : this.decks[0];
    const events = new AbortController();
    const failed = () => {
      if (this.staged?.video !== video || this.disposed) return;
      this.clearStaged(); this.status = 'error'; this.emit();
    };
    this.staged = { video, asset, repeat, matched: false, ready: false, events, timeout: setTimeout(failed, 12000) };
    video.pause(); video.style.opacity = '0'; video.dataset.visible = 'false';
    video.dataset.asset = asset; video.loop = !isElephantTransition(asset);
    const ready = () => {
      if (!this.staged || this.staged.video !== video || video.seeking || video.readyState < 2) return;
      this.staged.ready = true; clearTimeout(this.staged.timeout); this.show();
    };
    video.addEventListener('canplay', ready, { signal: events.signal });
    video.addEventListener('seeked', ready, { signal: events.signal });
    video.addEventListener('error', failed, { signal: events.signal });
    const pixels = (video.parentElement?.getBoundingClientRect().width ?? 480) * devicePixelRatio;
    const compact = pixels > 0 && pixels <= 240;
    video.dataset.resolution = compact ? '240' : '480';
    video.src = `${ROOT}${compact ? 'compact/' : ''}${asset}.webm`; video.load();
  }
  private entryTime(asset: ElephantAsset) {
    const samples = this.poses[asset];
    if (!samples || !this.active || this.active.video.readyState < 2) return 0;
    try {
      const canvas = document.createElement('canvas'); canvas.width = 12; canvas.height = 9;
      const context = canvas.getContext('2d', { willReadFrequently: true })!;
      context.fillStyle = '#000'; context.fillRect(0, 0, 12, 9);
      context.drawImage(this.active.video, 0, 0, 12, 9);
      const rgba = context.getImageData(0, 0, 12, 9).data;
      const current = Array.from({ length: 108 }, (_, i) => (rgba[i * 4] + 2 * rgba[i * 4 + 1] + rgba[i * 4 + 2]) / 4);
      return chooseElephantEntryPose(current, samples);
    } catch { return 0; }
  }
  private show() {
    if (!this.staged?.ready || this.fading || this.disposed) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (this.active && !reduced) {
      const outgoing = this.active.video;
      if (this.staged.repeat && (this.paused || document.hidden || outgoing.currentTime < outgoing.duration - LOOP_TAIL)) return;
      if (isElephantTransition(this.active.asset) && !outgoing.ended && outgoing.currentTime < outgoing.duration - .18) return;
    }
    if (!this.staged.matched) {
      this.staged.matched = true;
      if (!this.staged.repeat && !isElephantTransition(this.staged.asset) && !reduced) {
        const time = this.entryTime(this.staged.asset);
        this.staged.video.dataset.entryTime = String(time);
        if (time > .02) { this.staged.ready = false; this.staged.video.currentTime = time; return; }
      }
    }
    const previous = this.active;
    const { video, asset, repeat } = this.staged;
    this.clearStaged();
    this.active = { video, asset }; this.status = 'ready'; video.dataset.visible = 'true';
    const duration = !previous || reduced ? 0 : repeat ? 160 : isElephantTransition(asset) || isElephantTransition(previous.asset) ? 180 : 240;
    if (!duration) {
      video.style.opacity = '1';
      if (previous) { previous.video.style.opacity = '0'; previous.video.dataset.visible = 'false'; previous.video.pause(); }
      this.emit(); this.sync(); this.watch(); this.pump(); return;
    }
    this.fading = true; this.loopHandoff = repeat;
    // The outgoing clip contains a matching 300 ms head at its tail. Decode overlap
    // hides native loop seeks; posture changes overlap before the last frame freezes.
    this.animations = [video.animate([{ opacity: 0 }, { opacity: 1 }], { duration, easing: 'linear', fill: 'forwards' }),
      previous!.video.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing: 'linear', fill: 'forwards' })];
    this.emit(); this.sync(); this.watch();
    void Promise.all(this.animations.map(animation => animation.finished)).then(() => {
      if (this.disposed) return;
      video.style.opacity = '1'; previous!.video.style.opacity = '0';
      previous!.video.dataset.visible = 'false'; previous!.video.pause();
      for (const animation of this.animations) animation.cancel();
      this.animations = []; this.fading = false; this.loopHandoff = false; this.emit(); this.pump();
    }).catch(() => { /* Disposal cancels the pending fade. */ });
  }
  dispose() {
    this.disposed = true; this.events.abort(); this.clearStaged(); this.cancelWatch(); cancelAnimationFrame(this.rateFrame);
    for (const animation of this.animations) animation.cancel();
    for (const video of this.decks) { video.pause(); video.removeAttribute('src'); video.load(); }
  }
}
