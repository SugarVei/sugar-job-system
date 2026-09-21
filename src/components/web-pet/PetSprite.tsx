import { useEffect, useRef } from 'react';
import { PET_CONFIG } from './petConfig';
import { getSpriteClip, sampleSpriteTween, SLEEP_REST, SPRITE_SAMPLE_FPS } from './spriteAnimations';
import { drawSpriteTween, loadSpriteAtlas } from './spriteTweenRenderer';
import type { PetCharacterProps } from './types';

/** 120 Hz motion samples, presented at display refresh. No per-frame React state. */
export default function PetSprite({ state, direction, paused = false }: PetCharacterProps) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const playhead = useRef({ state, elapsed: 0, clip: getSpriteClip(state) });
  useEffect(() => {
    const element = root.current;
    const surface = canvas.current;
    const ctx = surface?.getContext('2d');
    if (!element || !surface || !ctx) return;
    if (playhead.current.state !== state) {
      const clip = state === 'sleep' && playhead.current.state === 'tired' ? SLEEP_REST : getSpriteClip(state);
      playhead.current = { state, elapsed: 0, clip };
    }
    const clip = playhead.current.clip;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let disposed = false;
    let animationFrame = 0;
    let visible = true;
    let lastSample = -1;
    let elapsed = playhead.current.elapsed;
    let lastTime = performance.now();
    let statsTime = lastTime;
    let presented = 0;
    let renders = 0;
    let image: HTMLImageElement | null = null;
    element.dataset.animation = clip.atlas;
    element.dataset.sampleFps = String(SPRITE_SAMPLE_FPS);

    const draw = () => {
      if (!image) return;
      const tween = sampleSpriteTween(clip, elapsed, preference.matches);
      if (tween.sample === lastSample) return;
      lastSample = tween.sample;
      const renderStarted = performance.now();
      element.dataset.renderer = drawSpriteTween(ctx, clip.atlas, image, tween, elapsed, preference.matches);
      surface.dataset.frame = String(tween.from);
      surface.dataset.nextFrame = String(tween.to);
      surface.dataset.blend = tween.mix.toFixed(5);
      surface.dataset.sample = String(tween.sample);
      surface.dataset.renderCount = String(++renders);
      surface.dataset.renderMs = (performance.now() - renderStarted).toFixed(2);
      element.dataset.ready = 'true';
    };
    const canPlay = () => !disposed && image && visible && !paused && !document.hidden && !preference.matches;
    const tick = (now: number) => {
      animationFrame = 0;
      if (!canPlay()) return;
      elapsed += Math.max(0, now - lastTime);
      lastTime = now;
      draw();
      presented++;
      if (now - statsTime >= 1000) {
        element.dataset.presentedFps = String(Math.round(presented * 1000 / (now - statsTime)));
        statsTime = now; presented = 0;
      }
      animationFrame = requestAnimationFrame(tick);
    };
    const schedule = () => {
      cancelAnimationFrame(animationFrame);
      lastTime = performance.now();
      statsTime = lastTime; presented = 0;
      lastSample = -1;
      draw();
      if (canPlay()) animationFrame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); });
    observer.observe(surface);
    document.addEventListener('visibilitychange', schedule);
    preference.addEventListener('change', schedule);
    void loadSpriteAtlas(clip.atlas).then(loaded => {
      if (disposed) return;
      image = loaded;
      schedule();
    }).catch(() => { if (!disposed) element.dataset.ready = 'false'; });
    return () => {
      disposed = true;
      playhead.current.elapsed = elapsed;
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      document.removeEventListener('visibilitychange', schedule);
      preference.removeEventListener('change', schedule);
    };
  }, [state, paused]);
  return <div ref={root} className="pet-sprite pet-sprite-sequence" data-pose-state={state} data-paused={paused} aria-hidden="true">
    <canvas ref={canvas} width={380} height={560} style={{ transform: `scaleX(${direction})` }} />
    <img className="pet-sprite-loading" src={PET_CONFIG.stateSprites[state] ?? PET_CONFIG.sprite} alt="" draggable={false} />
  </div>;
}
