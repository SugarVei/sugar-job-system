import { useEffect, useRef, useState } from 'react';
import type { ElephantClip } from './elephantAnimations';
import './ElephantVideo.css';

/** Pre-keyed transparent video: the browser decodes the original forward 24 fps. */
export default function ElephantVideo({ clip, paused = false, speed = 1, direction = 1, turnDuration = 0 }: {
  clip: ElephantClip; paused?: boolean; speed?: number; direction?: number; turnDuration?: number;
}) {
  const first = useRef<HTMLVideoElement>(null);
  const second = useRef<HTMLVideoElement>(null);
  const active = useRef<HTMLVideoElement | null>(null);
  const options = useRef({ paused, speed });
  const [status, setStatus] = useState('loading');
  useEffect(() => {
    options.current = { paused, speed };
    const source = active.current;
    if (!source) return;
    source.playbackRate = speed;
    if (paused || document.hidden) source.pause();
    else void source.play().catch(error => { if (error.name !== 'AbortError') setStatus('blocked'); });
  }, [paused, speed]);

  useEffect(() => {
    const previous = active.current;
    const source = previous === first.current ? second.current! : first.current!;
    let disposed = false;
    const show = () => {
      if (disposed) return;
      source.style.opacity = '1';
      source.dataset.ready = 'true';
      active.current = source;
      if (previous && previous !== source) { previous.style.opacity = '0'; previous.pause(); }
      setStatus('ready');
      source.playbackRate = options.current.speed;
      if (!options.current.paused && !document.hidden) {
        void source.play().catch(error => { if (!disposed && error.name !== 'AbortError') setStatus('blocked'); });
      }
    };
    const fail = () => {
      if (disposed) return;
      source.style.opacity = '0'; source.pause();
      if (previous) { previous.style.opacity = '0'; previous.pause(); }
      active.current = null;
      setStatus('error');
    };
    source.addEventListener('loadeddata', show);
    source.addEventListener('error', fail);
    source.style.opacity = '0';
    source.dataset.ready = 'false';
    source.src = `/pet/elephant-v2/${clip.id}.webm`;
    source.load();
    return () => {
      disposed = true;
      source.removeEventListener('loadeddata', show);
      source.removeEventListener('error', fail);
    };
  }, [clip.id]);

  useEffect(() => {
    const a = first.current!, b = second.current!;
    const visibility = () => {
      if (document.hidden || options.current.paused) { a.pause(); b.pause(); }
      else void active.current?.play().catch(error => { if (error.name !== 'AbortError') setStatus('blocked'); });
    };
    document.addEventListener('visibilitychange', visibility);
    return () => { a.pause(); b.pause(); document.removeEventListener('visibilitychange', visibility); };
  }, []);

  const retry = () => {
    if (status === 'blocked' && !options.current.paused) {
      void active.current?.play().then(() => setStatus('ready')).catch(() => setStatus('blocked'));
    }
  };
  return <div className="elephant-video" data-clip={clip.id} data-renderer="native-alpha-video" data-ready={status === 'ready'} onClick={retry}>
    <div className="elephant-facing" style={{ transform: `perspective(600px) rotateY(${direction < 0 ? 180 : 0}deg)`, transitionDuration: `${turnDuration}ms` }}>
      <img className="elephant-poster" src={`/pet/elephant-v2/${clip.id}.png`} alt={`大象宝宝：${clip.name}`} draggable={false} style={{ opacity: status === 'ready' || status === 'blocked' ? 0 : 1 }} />
      <video ref={first} className="elephant-deck" muted playsInline loop preload="auto" aria-label={`大象宝宝：${clip.name}`} />
      <video ref={second} className="elephant-deck" muted playsInline loop preload="auto" aria-hidden="true" />
    </div>
    {status === 'loading' && <span className="video-message">大象宝宝正在赶来…</span>}
    {status === 'error' && <span className="video-message">小象正在休息，刷新可重试动画</span>}
    {status === 'blocked' && <span className="video-message">点击动画或按下播放按钮</span>}
  </div>;
}
