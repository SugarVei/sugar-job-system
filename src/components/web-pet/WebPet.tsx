import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import PetSprite from './PetSprite';
import PetBubble from './PetBubble';
import PetMenu from './PetMenu';
import { DEBUG_PET, STATE_LABELS } from './petConfig';
import { initialSnapshot, PetController } from './core/petController';
import type { PetAction, PetRenderer } from './types';
import './WebPet.css';

export default function WebPet({ renderer: Character = PetSprite, onChat }: { renderer?: PetRenderer; onChat?: () => void }) {
  const node = useRef<HTMLDivElement>(null);
  const ball = useRef<HTMLButtonElement>(null);
  const petButton = useRef<HTMLButtonElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const controller = useRef<PetController | null>(null);
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [covered, setCovered] = useState(false);
  useEffect(() => {
    if (!node.current || !ball.current) return;
    const pet = new PetController(node.current, ball.current, setSnapshot);
    controller.current = pet; pet.start();
    return () => { pet.dispose(); controller.current = null; };
  }, []);
  useEffect(() => {
    // Some existing navigation overlays live inside a separate stacking context.
    // Temporarily yield the whole pet layer while a dialog or navigation drawer is open.
    const inspect = () => {
      const blocked = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"], [aria-modal="true"], [role="listbox"], [style*="z-index"]')).some(el => {
        if (el.closest('[data-web-pet]') || !el.getClientRects().length) return false;
        const style = getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none') return false;
        return el.matches('[role="dialog"], [aria-modal="true"], [role="listbox"]') || (style.position === 'fixed' && Number(style.zIndex) >= 40 && el.getBoundingClientRect().height > 90);
      });
      setCovered(blocked); controller.current?.setCovered(blocked);
    };
    const observer = new MutationObserver(records => {
      if (records.some(record => !(record.target instanceof Element) || !record.target.closest('[data-web-pet]'))) inspect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!snapshot.menu) return;
    const dismiss = (e: PointerEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest('[data-web-pet]')) controller.current?.action('closeMenu');
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [snapshot.menu]);
  const action = (value: PetAction) => {
    controller.current?.action(value);
    if (!['menu', 'hide'].includes(value)) petButton.current?.focus({ preventScroll: true });
  };
  return createPortal(<div className="web-pet-layer" data-web-pet data-reduced-motion={snapshot.reducedMotion} style={{ visibility: covered ? 'hidden' : undefined }}>
    <div ref={node} className="pet-position" data-state={snapshot.state} style={{ display: snapshot.hidden ? 'none' : undefined }}>
      <div className="pet-shadow" />
      <button ref={petButton} type="button" className="pet-hitbox" aria-label={`小糖豆：${STATE_LABELS[snapshot.state]}。点击互动，右键打开菜单`} aria-haspopup="menu"
        onPointerDown={e => { if (e.button === 0) { e.currentTarget.setPointerCapture(e.pointerId); controller.current?.pointerDown(e); } }}
        onClick={e => { if (e.detail === 0) controller.current?.tap(); }}
        onKeyDown={e => {
          if (e.key === 'Escape') action('closeMenu');
          if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) { e.preventDefault(); action('menu'); }
        }}
        onContextMenu={e => { e.preventDefault(); action('menu'); }}>
          <Character state={snapshot.state} direction={snapshot.direction} paused={snapshot.hidden || covered} />
        <span className="pet-head-zone" onPointerEnter={() => controller.current?.headHover(true)} onPointerLeave={() => controller.current?.headHover(false)} />
      </button>
      <button ref={menuButton} className="pet-menu-toggle" type="button" aria-label="打开萌娃菜单" aria-haspopup="menu" aria-expanded={snapshot.menu} onClick={() => action('menu')}>···</button>
      {!snapshot.menu && <PetBubble text={snapshot.bubble} sleeping={snapshot.state === 'sleep'} />}
      {snapshot.hearts > 0 && <div key={snapshot.hearts} className="pet-hearts" aria-hidden="true">{[0, 1, 2, 3].map(i => <span key={i} style={{ '--heart-index': i } as React.CSSProperties}>♥</span>)}</div>}
      {snapshot.menu && <PetMenu snapshot={snapshot} onAction={action} onChat={onChat ? () => { action('closeMenu'); onChat(); } : undefined} onClose={() => { action('closeMenu'); menuButton.current?.focus(); }} />}
    </div>
    <button ref={ball} type="button" className="pet-ball" style={{ display: snapshot.ball ? undefined : 'none' }} aria-label="小球，拖动后松手可以抛球"
      onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); controller.current?.ballDown(e); }}
      onKeyDown={e => { if (e.key === 'Escape') action('pet'); }} />
    {snapshot.hidden && <button className="pet-recall" aria-label="召回小糖豆" onClick={() => action('show')} title="召回小糖豆">👶</button>}
    {DEBUG_PET && <output className="pet-debug">State: {snapshot.state}<br />Mood: {snapshot.stats.mood.toFixed(0)} · Energy: {snapshot.stats.energy.toFixed(0)}<br />Affection: {snapshot.stats.affection.toFixed(0)} · FPS: {snapshot.fps}</output>}
  </div>, document.body);
}
