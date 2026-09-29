import { useEffect, useRef, useState } from 'react';
import type { ElephantClip } from './elephantAnimations';
import { ElephantPlayback, type PlaybackState } from './elephantPlayback';
import './ElephantVideo.css';

/** Offline optical-flow interpolation, native transparent 60 fps playback. */
export default function ElephantVideo({ clip, paused = false, speed = 1, direction = 1, turnDuration = 0, onPlayback }: {
  clip: ElephantClip; paused?: boolean; speed?: number; direction?: number; turnDuration?: number;
  onPlayback?: (state: PlaybackState) => void;
}) {
  const first = useRef<HTMLVideoElement>(null);
  const second = useRef<HTMLVideoElement>(null);
  const player = useRef<ElephantPlayback | null>(null);
  const [playback, setPlayback] = useState<PlaybackState>({ status: 'loading', asset: null, transitioning: false });
  useEffect(() => {
    const instance = new ElephantPlayback([first.current!, second.current!], setPlayback);
    player.current = instance;
    return () => { instance.dispose(); player.current = null; };
  }, []);
  useEffect(() => { player.current?.configure(paused, speed); }, [paused, speed]);
  useEffect(() => { player.current?.request(clip.id); }, [clip.id]);
  useEffect(() => { onPlayback?.(playback); }, [playback, onPlayback]);

  const visible = playback.asset !== null;
  const motionReady = clip.id !== 'walk' || (playback.asset === 'walk' && !playback.transitioning) || playback.status === 'error';
  return <div className="elephant-video" data-clip={clip.id} data-active-clip={playback.asset}
    data-renderer="original-elephant-smooth-handoff-v2" data-fps="60" data-ready={visible}
    data-playback-status={playback.status}
    data-transitioning={playback.transitioning} data-motion-ready={motionReady} onClick={() => player.current?.retry()}>
    <div className="elephant-facing" style={{ transform: `perspective(600px) rotateY(${direction < 0 ? 180 : 0}deg)`, transitionDuration: `${turnDuration}ms` }}>
      <img className="elephant-poster" src={`/pet/elephant-v4/${clip.id}.png`} alt={`大象宝宝：${clip.name}`} draggable={false} style={{ opacity: visible ? 0 : 1 }} />
      <video ref={first} className="elephant-deck" muted playsInline preload="auto" aria-label={`大象宝宝：${clip.name}`} />
      <video ref={second} className="elephant-deck" muted playsInline preload="auto" aria-hidden="true" />
    </div>
    {playback.status === 'loading' && <span className="video-message">大象宝宝正在赶来…</span>}
    {playback.status === 'error' && <span className="video-message">小象正在休息，刷新可重试动画</span>}
    {playback.status === 'blocked' && <span className="video-message">点击动画或按下播放按钮</span>}
  </div>;
}
