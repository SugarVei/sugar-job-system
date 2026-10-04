import { useEffect, useRef, useState, type RefObject } from 'react';
import { ArrowLeft, ArrowRight, Compass, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import type { WorldScene } from './WorldScene';
import { CAMERA_PRESETS, MIN_ELEVATION, MAX_ELEVATION, type CameraViewState } from './cameraView';

type Props = {
  scene: RefObject<WorldScene | null>;
  view: CameraViewState;
  firstPerson: boolean;
  mode: 'pan' | 'rotate';
  setMode: (mode: 'pan' | 'rotate') => void;
};

export default function CameraViewControls({ scene, view, firstPerson, mode, setMode }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  return <div className="world-view-control" ref={root}>
    <button ref={trigger} className="world-view-trigger" aria-label="调整视角" title={firstPerson ? '返回俯瞰视角后调整' : '旋转、调整高度与自动视角'} aria-expanded={open && !firstPerson} aria-controls="world-view-settings" disabled={firstPerson} onClick={() => setOpen(!open)}>
      <SlidersHorizontal size={16}/><span>视角</span>
    </button>
    {open && !firstPerson && <section id="world-view-settings" className="world-view-settings" aria-label="视角设置">
      <header><strong><Compass size={16}/>自由视角</strong><button aria-label="关闭视角设置" onClick={() => { setOpen(false); trigger.current?.focus(); }}><X size={16}/></button></header>
      <div className="view-drag-modes" aria-label="拖动方式">
        <button aria-pressed={mode === 'pan'} onClick={() => setMode('pan')}>拖动平移</button>
        <button aria-pressed={mode === 'rotate'} onClick={() => setMode('rotate')}>拖动旋转</button>
      </div>
      <label className="view-angle-label" htmlFor="world-view-elevation">观察角度 <output>{view.elevation}°</output></label>
      <input id="world-view-elevation" type="range" min={MIN_ELEVATION} max={MAX_ELEVATION} step={1} value={view.elevation} aria-valuetext={`${view.elevation}度，距地面的观察角度`} onChange={event => scene.current?.setElevation(Number(event.target.value))}/>
      <div className="view-angle-scale"><span>低处看</span><span>高空俯瞰</span></div>
      <div className="view-presets">{(['low', 'oblique', 'overhead'] as const).map((preset, index) => <button key={preset} aria-pressed={!view.autoTilt && Math.abs(view.elevation - CAMERA_PRESETS[preset]) <= 1} onClick={() => scene.current?.setCameraPreset(preset)}>{['低角度', '斜俯视', '鸟瞰'][index]}</button>)}</div>
      <div className="view-orbit-buttons"><button aria-label="向左旋转视角" onClick={() => scene.current?.rotate(-1)}><ArrowLeft size={15}/>向左转</button><button aria-label="向右旋转视角" onClick={() => scene.current?.rotate(1)}>向右转<ArrowRight size={15}/></button></div>
      <label className="view-auto-tilt"><input type="checkbox" checked={view.autoTilt} onChange={event => scene.current?.setAutoTilt(event.target.checked)}/><span>缩放时自动调整角度<small>拉近降低视角，拉远升高视角</small></span></label>
      <button className="view-reset" onClick={() => scene.current?.overview()}><RotateCcw size={14}/>恢复默认全景</button>
      <p>右键或选择“拖动旋转”：左右转向，上下调角度。手机单指按所选方式拖动，双指缩放和平移。手动调角度后保留你的选择。</p>
    </section>}
  </div>;
}
