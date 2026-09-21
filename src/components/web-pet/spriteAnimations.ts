import type { PetState } from './types';

export type AtlasName = 'happy' | 'crawl' | 'sleep' | 'joy';
export type SpriteRect = readonly [number, number, number, number];
export interface SpriteClip {
  atlas: AtlasName;
  frames: readonly { pose: number; duration: number }[];
  /** Repeat only this tail; undefined holds the final frame. */
  loopFrom?: number;
  reducedPose: number;
}

// Alpha bounds of the six separated cells, in source pixels. A fixed scale per
// atlas preserves head size; feet are aligned, rather than stretching each pose.
export const SPRITE_ATLASES: Record<AtlasName, { src: string; scale: number; rects: readonly SpriteRect[] }> = {
  joy: { src: '/pet/atlases/happy-smooth.png', scale: .53, rects: [
    [73, 7, 156, 251], [324, 7, 154, 251], [572, 6, 154, 252], [818, 6, 155, 252],
    [1071, 6, 150, 252], [1341, 6, 128, 252], [94, 262, 128, 251], [349, 262, 129, 251],
    [597, 262, 129, 251], [848, 262, 128, 251], [1091, 262, 127, 251], [1341, 262, 129, 251],
    [91, 521, 130, 239], [343, 540, 131, 220], [594, 521, 129, 239], [846, 515, 127, 234],
    [1091, 520, 128, 233], [1340, 521, 127, 239], [89, 764, 128, 254], [322, 765, 148, 253],
    [570, 764, 149, 254], [816, 765, 158, 253], [1069, 767, 154, 251], [1317, 765, 157, 253],
  ] },
  happy: { src: '/pet/atlases/happy.png', scale: .276, rects: [
    [132, 13, 269, 490], [661, 15, 221, 488], [1114, 6, 270, 471],
    [159, 523, 247, 488], [646, 526, 223, 485], [1128, 524, 258, 487],
  ] },
  crawl: { src: '/pet/atlases/crawl.png', scale: .205, rects: [
    [107, 22, 302, 457], [594, 23, 304, 458], [1087, 23, 311, 459],
    [108, 530, 315, 461], [598, 534, 310, 457], [1093, 530, 308, 459],
  ] },
  sleep: { src: '/pet/atlases/sleep.png', scale: .217, rects: [
    [113, 14, 326, 495], [602, 12, 320, 496], [1104, 16, 317, 493],
    [89, 523, 344, 476], [591, 523, 341, 476], [1096, 521, 335, 478],
  ] },
};
const frames = (...items: [number, number][]) => items.map(([pose, duration]) => ({ pose, duration }));
const still = (atlas: AtlasName, pose: number): SpriteClip => ({ atlas, frames: frames([pose, 1000]), reducedPose: pose });
const idle = still('joy', 0);
export const SLEEP_REST: SpriteClip = { atlas: 'sleep', frames: frames([3, 1600], [4, 1800], [5, 2000]), loopFrom: 0, reducedPose: 5 };
// Keep gestures in coherent runs: do not dissolve a low arm directly into a clap.
const happyPoses = [...Array.from({ length: 13 }, (_, i) => i + 6), ...Array.from({ length: 11 }, (_, i) => 17 - i)];
const happy: SpriteClip = { atlas: 'joy', frames: happyPoses.map(pose => ({ pose, duration: 100 })), loopFrom: 0, reducedPose: 8 };
const wave: SpriteClip = { atlas: 'joy', frames: [0, 1, 2, 3, 4, 3, 2, 1].map(pose => ({ pose, duration: 200 })), loopFrom: 0, reducedPose: 0 };
const crawl: SpriteClip = { atlas: 'crawl', frames: frames([0, 150], [1, 160], [2, 130], [4, 150], [3, 160], [5, 130]), loopFrom: 0, reducedPose: 0 };
const fastCrawl: SpriteClip = { ...crawl, frames: crawl.frames.map(frame => ({ ...frame, duration: frame.duration * .7 })) };
const sleep: SpriteClip = { atlas: 'sleep', frames: frames([0, 650], [1, 650], [2, 700], ...SLEEP_REST.frames.map(({ pose, duration }): [number, number] => [pose, duration])), loopFrom: 3, reducedPose: 5 };
const clips: Partial<Record<PetState, SpriteClip>> = {
  happy, walk: crawl, crawl, run: fastCrawl, chasing: fastCrawl, runAway: fastCrawl, playing: crawl,
  tired: { atlas: 'sleep', frames: frames([0, 800], [1, 800], [2, 600]), reducedPose: 2 },
  sleep, sitting: still('sleep', 2),
  stretch: { atlas: 'sleep', frames: frames([2, 250], [1, 250], [0, 1000]), reducedPose: 0 },
  curious: still('happy', 3), startled: still('happy', 4), dragged: still('happy', 4),
  intro: wave, peek: wave,
};
export const getSpriteClip = (state: PetState): SpriteClip => clips[state] ?? idle;

/** Sampling density, not a promise that a 60 Hz display presents 120 frames. */
export const SPRITE_SAMPLE_FPS = 120;
export const clipDuration = (clip: SpriteClip) => clip.frames.reduce((sum, frame) => sum + frame.duration, 0);
export const clipSampleCount = (clip: SpriteClip) => Math.ceil(clipDuration(clip) * SPRITE_SAMPLE_FPS / 1000);
export interface SpriteTween { from: number; to: number; mix: number; sample: number }
export const easePose = (value: number) => value * value * (3 - 2 * value);

/** Every key pose moves continuously toward the next, including the loop seam. */
export function sampleSpriteTween(clip: SpriteClip, elapsed: number, reducedMotion = false): SpriteTween {
  if (reducedMotion) return { from: clip.reducedPose, to: clip.reducedPose, mix: 0, sample: 0 };
  const sample = Math.floor(Math.max(0, elapsed) * SPRITE_SAMPLE_FPS / 1000 + 1e-7);
  let time = sample * 1000 / SPRITE_SAMPLE_FPS;
  const duration = clipDuration(clip);
  if (time >= duration) {
    if (clip.loopFrom === undefined) {
      const last = clip.frames[clip.frames.length - 1].pose;
      return { from: last, to: last, mix: 0, sample };
    }
    const intro = clip.frames.slice(0, clip.loopFrom).reduce((sum, frame) => sum + frame.duration, 0);
    time = intro + (time - intro) % (duration - intro);
  }
  for (let index = 0; index < clip.frames.length; index++) {
    const frame = clip.frames[index];
    if (time < frame.duration) {
      const next = clip.frames[index + 1] ?? clip.frames[clip.loopFrom ?? index];
      return { from: frame.pose, to: next.pose, mix: easePose(time / frame.duration), sample };
    }
    time -= frame.duration;
  }
  const last = clip.frames[clip.frames.length - 1].pose;
  return { from: last, to: last, mix: 0, sample };
}

/** Pure elapsed-time sampling: no skipped timers, no accumulating frame drift. */
export function sampleSprite(clip: SpriteClip, elapsed: number, reducedMotion = false): number {
  if (reducedMotion) return clip.reducedPose;
  const total = clip.frames.reduce((sum, frame) => sum + frame.duration, 0);
  let time = Math.max(0, elapsed);
  if (time >= total) {
    if (clip.loopFrom === undefined) return clip.frames[clip.frames.length - 1].pose;
    const intro = clip.frames.slice(0, clip.loopFrom).reduce((sum, frame) => sum + frame.duration, 0);
    time = intro + (time - intro) % (total - intro);
  }
  for (const frame of clip.frames) {
    if (time < frame.duration) return frame.pose;
    time -= frame.duration;
  }
  return clip.frames[clip.frames.length - 1].pose;
}
