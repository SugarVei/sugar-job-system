import { useState } from 'react';
import PetSprite from '../components/web-pet/PetSprite';
import { clipSampleCount, getSpriteClip, SPRITE_SAMPLE_FPS } from '../components/web-pet/spriteAnimations';

const actions = [
  { state: 'happy', label: '开心', detail: '拍拍小手，再轻轻跳一下' },
  { state: 'intro', label: '挥手', detail: '朝你挥挥手，轻轻摇一摇' },
  { state: 'crawl', label: '爬行', detail: '小手向前，慢慢爬过来' },
  { state: 'sleep', label: '睡觉', detail: '打哈欠 · 揉眼睛 · 闭眼入睡' },
] as const;

export default function PetAnimationPreview() {
  const [selected, setSelected] = useState(0);
  const [replay, setReplay] = useState(0);
  const [paused, setPaused] = useState(false);
  const action = actions[selected];
  return <div className="pet-animation-preview" data-pet-avoid>
    <span className="pet-animation-eyebrow">小糖豆 / 动作预览</span>
    <div className="pet-animation-stage"><div className="pet-animation-character" key={`${selected}-${replay}`}>
      <PetSprite state={action.state} direction={1} paused={paused} />
    </div></div>
    <p aria-live="polite">{action.detail}</p>
    <small className="pet-animation-quality" title="中间动作由关键姿势位置补间生成，不是新增摄影帧；实际显示帧率受屏幕刷新率与设备性能限制。">{SPRITE_SAMPLE_FPS} FPS 补间采样 · 每轮 {clipSampleCount(getSpriteClip(action.state))} 帧</small>
    <div className="pet-animation-tabs" role="group" aria-label="选择预览动作">{actions.map((item, index) =>
      <button key={item.state} aria-pressed={selected === index} onClick={() => { setSelected(index); setPaused(false); setReplay(value => value + 1); }}>{item.label}</button>
    )}</div>
    <div className="pet-animation-tools"><button onClick={() => setPaused(value => !value)}>{paused ? '继续播放' : '暂停动画'}</button><span>·</span><button onClick={() => { setReplay(value => value + 1); setPaused(false); }}>重新播放</button></div>
  </div>;
}
