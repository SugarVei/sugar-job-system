import { useEffect, useRef, useState } from 'react';
import './ElephantVideo.css';

import type { ElephantClip } from './elephantAnimations';

/** Key the connected near-black backdrop; keep the elephant's RGB and shading intact. */
function removeBackdrop(frame: ImageData, visited: Uint8Array, queue: Int32Array) {
  const { data, width, height } = frame;
  visited.fill(0);
  let head = 0, tail = 0;
  const visit = (p: number) => {
    if (visited[p]) return;
    visited[p] = 1;
    const i = p * 4;
    if (Math.max(data[i], data[i + 1], data[i + 2]) < 60) {
      visited[p] = 2;
      queue[tail++] = p;
    }
  };
  for (let x = 0; x < width; x++) { visit(x); visit((height - 1) * width + x); }
  for (let y = 1; y < height - 1; y++) { visit(y * width); visit(y * width + width - 1); }
  while (head < tail) {
    const p = queue[head++], i = p * 4, x = p % width;
    data[i + 3] = 0;
    if (x > 0) visit(p - 1);
    if (x < width - 1) visit(p + 1);
    if (p >= width) visit(p - width);
    if (p < width * (height - 1)) visit(p + width);
  }
  // Estimate edge coverage from nearby foreground, confined to the silhouette.
  // Applying this correction to broad dark areas creates pale, translucent patches.
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p = y * width + x;
      if (visited[p] !== 1) continue;
      let background = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (visited[p + dy * width + dx] === 2) background++;
      }
      if (background) {
        const i = p * 4;
        const brightness = Math.max(data[i], data[i + 1], data[i + 2]);
        let foreground = brightness;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const q = ny * width + nx, j = q * 4;
          if (visited[q] === 0) foreground = Math.max(foreground, data[j], data[j + 1], data[j + 2]);
        }
        const alpha = Math.min(1, Math.max(0, (brightness - 22) / Math.max(1, foreground - 22)));
        data[i + 3] = Math.round(alpha * 255);
        // This is black-matte decontamination on the contour only, not a skin color edit.
        if (alpha > 0) for (let c = 0; c < 3; c++) data[i + c] = Math.min(255, data[i + c] * foreground / brightness);
      }
    }
  }
}

export default function ElephantVideo({ clip, paused = false, speed = 1, direction = 1 }: {
  clip: ElephantClip; paused?: boolean; speed?: number; direction?: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const settings = useRef({ clip, paused, speed });
  useEffect(() => { settings.current = { clip, paused, speed }; }, [clip, paused, speed]);
  const [status, setStatus] = useState('loading');
  useEffect(() => {
    const surface = canvas.current!, source = video.current!;
    const ctx = surface.getContext('2d', { willReadFrequently: true });
    if (!ctx) { setStatus('error'); return; }
    const size = surface.width * surface.height;
    const visited = new Uint8Array(size), queue = new Int32Array(size);
    let raf = 0, disposed = false, last = -1;
    const draw = () => {
      if (disposed) return;
      // The source is 24 fps. Do not re-key duplicate decoded frames on 60/120 Hz screens.
      const sourceFrame = Math.floor(source.currentTime * 24);
      if (source.readyState >= 2 && !source.seeking && sourceFrame !== last) {
        if (source.currentTime >= settings.current.clip.end) { source.currentTime = settings.current.clip.start; }
        else {
          last = sourceFrame;
          ctx.drawImage(source, 160, 0, 960, 720, 0, 0, surface.width, surface.height);
          const frame = ctx.getImageData(0, 0, surface.width, surface.height);
          removeBackdrop(frame, visited, queue);
          ctx.putImageData(frame, 0, 0);
          surface.dataset.time = source.currentTime.toFixed(3);
          surface.dataset.ready = 'true';
          setStatus(current => current === 'ready' ? current : 'ready');
        }
      }
      raf = requestAnimationFrame(draw);
    };
    const play = () => {
      if (settings.current.paused || document.hidden) source.pause();
      else void source.play().then(() => { if (disposed) source.pause(); }).catch(() => { if (!disposed) setStatus('blocked'); });
    };
    const ready = () => { source.currentTime = settings.current.clip.start; play(); };
    source.addEventListener('loadedmetadata', ready);
    document.addEventListener('visibilitychange', play);
    if (source.readyState >= 1) ready();
    raf = requestAnimationFrame(draw);
    return () => { disposed = true; cancelAnimationFrame(raf); source.pause(); source.removeEventListener('loadedmetadata', ready); document.removeEventListener('visibilitychange', play); };
  }, []);
  useEffect(() => {
    const source = video.current!;
    if (source.readyState >= 1) source.currentTime = clip.start;
  }, [clip]);
  useEffect(() => {
    const source = video.current!;
    source.playbackRate = speed;
    if (paused || document.hidden) source.pause();
    else void source.play().catch(() => setStatus('blocked'));
  }, [paused, speed]);
  return <div className="elephant-video" data-clip={clip.id} onClick={() => { if (status === 'blocked') void video.current?.play().then(() => setStatus('ready')).catch(() => setStatus('blocked')); }}>
    <video ref={video} src="/pet/elephant.mp4" muted playsInline preload="auto" onError={() => setStatus('error')} hidden />
    {status !== 'ready' && <img className="elephant-poster" src="/pet/elephant-poster.png" alt="大象宝宝小糖豆" draggable={false} />}
    <canvas ref={canvas} width={480} height={360} style={{ transform: `scaleX(${direction})` }} aria-label={`大象宝宝：${clip.name}`} role="img" />
    {status === 'loading' && <span className="video-message">大象宝宝正在赶来…</span>}
    {status === 'error' && <span className="video-message">小象正在休息，刷新可重试动画</span>}
    {status === 'blocked' && <span className="video-message">点击动画或按下播放按钮</span>}
  </div>;
}
