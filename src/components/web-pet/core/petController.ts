import { PET_CONFIG as C } from '../petConfig';
import type { PetAction, PetSnapshot, PetStats, PetState, Point } from '../types';
import { PetStateMachine, PRIORITY } from './stateMachine';
import { clamp, clampPoint, distance, MovementEngine, random, routeAround, type Bounds } from './movementEngine';

const DEFAULT_STATS: PetStats = { mood: 75, energy: 80, affection: 20 };
const moving = new Set<PetState>(['walk', 'crawl', 'run', 'runAway', 'chasing', 'playing', 'falling']);
function readStored(): { stats: PetStats; hidden: boolean } {
  try {
    const data = JSON.parse(localStorage.getItem(C.storageKey) ?? '{}');
    const stats = { ...DEFAULT_STATS };
    for (const key of Object.keys(stats) as (keyof PetStats)[]) {
      if (typeof data.stats?.[key] === 'number' && Number.isFinite(data.stats[key])) stats[key] = clamp(data.stats[key], 0, 100);
    }
    return { stats, hidden: data.hidden === true };
  } catch { return { stats: { ...DEFAULT_STATS }, hidden: false }; }
}

export const initialSnapshot = (): PetSnapshot => ({ state: 'idle', ...readStored(), menu: false, bubble: '', hearts: 0, ball: false, reducedMotion: false, direction: 1, fps: 0 });

/** DOM writes happen here in rAF; React only sees state transitions and slow stat updates. */
export class PetController {
  machine = new PetStateMachine();
  movement = new MovementEngine();
  snapshot = initialSnapshot();
  bounds: Bounds = { left: 12, top: 110, right: 1000, bottom: 600 };
  width = 95;
  height = 140;
  private frame = 0;
  private lastFrame = 0;
  private lastThink = 0;
  private lastStats = 0;
  private lastSave = 0;
  private lastScan = -10000;
  private lastActive = performance.now();
  private lastScroll = 0;
  private nextEvent = performance.now() + random(C.randomEventMin, C.randomEventMax);
  private mouse = { x: -9999, y: -9999, speed: 0, time: 0 };
  private taps: number[] = [];
  private headSince = 0;
  private bubbleUntil = 0;
  private held: { id: number; start: Point; offset: Point; moved: boolean } | null = null;
  private ballHeld: { id: number; previous: Point; time: number } | null = null;
  private ballPosition: Point = { x: 0, y: 0 };
  private ballVelocity: Point = { x: 0, y: 0 };
  private obstacles: DOMRect[] = [];
  private cards: HTMLElement[] = [];
  private interestTargets: HTMLElement[] = [];
  private destinationCard: HTMLElement | null = null;
  private route: Point[] = [];
  private covered = false;
  private cardAnimation: Animation | null = null;
  private disposed = false;
  private media = matchMedia('(prefers-reduced-motion: reduce)');
  private fine = matchMedia('(hover: hover) and (pointer: fine)');
  private fpsCount = 0;
  private fpsTime = 0;
  fps = 0;

  constructor(private node: HTMLElement, private ballNode: HTMLElement, private notify: (value: PetSnapshot) => void) {}
  private emit() { this.snapshot.fps = this.fps; this.notify({ ...this.snapshot, stats: { ...this.snapshot.stats } }); }
  private save() {
    try { localStorage.setItem(C.storageKey, JSON.stringify({ stats: this.snapshot.stats, hidden: this.snapshot.hidden })); } catch { /* storage is optional */ }
  }
  private stats(delta: Partial<PetStats>) {
    for (const key of Object.keys(delta) as (keyof PetStats)[]) this.snapshot.stats[key] = clamp(this.snapshot.stats[key] + (delta[key] ?? 0), 0, 100);
  }
  private say(message: string, duration = 2300) { this.snapshot.bubble = message; this.bubbleUntil = performance.now() + duration; }
  private enter(state: PetState, duration: number, force = false) {
    if (!this.machine.enter(state, performance.now(), duration, force)) return false;
    this.movement.stop();
    this.route = [];
    this.destinationCard = null;
    if (state !== 'curious') this.headSince = 0;
    this.snapshot.state = state;
    if (state !== 'happy') this.snapshot.hearts = 0;
    this.node.dataset.state = state;
    this.emit();
    return true;
  }
  private move(state: PetState, target: Point, duration = 6000, force = false) {
    if (this.enter(state, duration, force)) {
      const end = clampPoint(target, this.bounds);
      const obstacles = this.obstacles.map(r => ({ left: r.left - this.width - 8, right: r.right + 8, top: r.top - this.height - 8, bottom: r.bottom + 8 }));
      this.route = state === 'falling' ? [end] : routeAround(this.movement.position, end, this.bounds, obstacles) ?? [];
      this.movement.target = this.route.shift() ?? null;
    }
  }
  private free(point: Point) {
    return !this.obstacles.some(r => point.x < r.right + 8 && point.x + this.width > r.left - 8 && point.y < r.bottom + 8 && point.y + this.height > r.top - 8);
  }
  private scan(now: number) {
    if (now - this.lastScan < 2500) return;
    this.lastScan = now;
    const visible = (el: HTMLElement) => !el.closest('[data-web-pet]') && el.getClientRects().length > 0;
    this.obstacles = Array.from(document.querySelectorAll<HTMLElement>('button, a, input, select, textarea, [data-pet-avoid]'))
      .filter(visible).map(el => el.getBoundingClientRect()).filter(r => r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth);
    this.cards = Array.from(document.querySelectorAll<HTMLElement>('[data-pet-card], .project-card, .card, .card-hover'))
      .filter(visible).filter(el => { const r = el.getBoundingClientRect(); return r.top > 80 && r.bottom < innerHeight - 50; });
    this.interestTargets = Array.from(document.querySelectorAll<HTMLElement>('a, button'))
      .filter(visible).filter(el => !el.closest('[data-pet-avoid], nav, aside') && !el.matches(':disabled'))
      .filter(el => { const r = el.getBoundingClientRect(); return r.top > this.bounds.top && r.bottom < this.bounds.bottom; });
  }
  private randomPoint() {
    const { left, top, right, bottom } = this.bounds;
    for (let i = 0; i < 18; i++) {
      // Spend most time around the lower and side margins, with occasional short trips inside.
      const p = { x: random(left, right), y: Math.random() < .7 ? random(Math.max(top, bottom - 160), bottom) : random(top, bottom) };
      if (this.free(p)) return p;
    }
    return { ...this.movement.position };
  }
  private resume() { this.enter('idle', random(C.minIdleTime, C.maxIdleTime), true); }
  private wake() {
    this.lastActive = performance.now();
    if (this.machine.state === 'sleep' || this.machine.state === 'tired') {
      this.say('你回来啦～'); this.enter('stretch', 1600, true);
    }
  }
  private resize = () => {
    const mobile = innerWidth < 768;
    this.height = mobile ? C.mobileHeight : C.desktopHeight;
    this.width = Math.round(this.height * C.aspect);
    this.bounds = { left: innerWidth >= 1024 ? 282 : 12, top: mobile ? 110 : 145,
      right: Math.max(12, innerWidth - this.width - 16), bottom: Math.max(110, innerHeight - this.height - (mobile ? 94 : 24)) };
    this.bounds.left = Math.min(this.bounds.left, this.bounds.right);
    this.bounds.top = Math.min(this.bounds.top, this.bounds.bottom);
    this.movement.position = clampPoint(this.movement.position, this.bounds);
    if (this.movement.target) this.movement.target = clampPoint(this.movement.target, this.bounds);
    this.node.style.setProperty('--pet-width', `${this.width}px`);
    this.node.style.setProperty('--pet-height', `${this.height}px`);
    this.lastScan = -10000;
    this.paint();
  };
  private motionChange = () => {
    this.snapshot.reducedMotion = this.media.matches;
    this.movement.stop();
    this.enter('sitting', 5000, true);
  };
  private pointerMove = (e: PointerEvent) => {
    const now = performance.now();
    if (distance(this.mouse, e) > 0) this.wake();
    const elapsed = Math.max(16, now - this.mouse.time);
    this.mouse = { x: e.clientX, y: e.clientY, speed: distance(this.mouse, { x: e.clientX, y: e.clientY }) / elapsed * 1000, time: now };
    if (this.held?.id === e.pointerId) {
      if (distance(this.held.start, { x: e.clientX, y: e.clientY }) > 5) this.held.moved = true;
      if (this.held.moved) {
        if (this.machine.state !== 'dragged') this.enter('dragged', Infinity, true);
        this.movement.position = clampPoint({ x: e.clientX - this.held.offset.x, y: e.clientY - this.held.offset.y }, this.bounds);
      }
    }
    if (this.ballHeld?.id === e.pointerId) {
      const point = { x: e.clientX, y: e.clientY };
      const delta = Math.max(.016, (now - this.ballHeld.time) / 1000);
      this.ballVelocity = { x: clamp((point.x - this.ballHeld.previous.x) / delta, -650, 650), y: clamp((point.y - this.ballHeld.previous.y) / delta, -650, 650) };
      this.ballPosition = this.clampBall(point);
      this.ballHeld = { ...this.ballHeld, previous: point, time: now };
    }
  };
  private pointerUp = (e: PointerEvent) => {
    if (this.held?.id === e.pointerId) {
      const moved = this.held.moved;
      this.held = null;
      if (moved) {
        this.say('稳稳落地～');
        if (this.snapshot.reducedMotion) this.resume();
        else this.move('falling', { x: this.movement.position.x, y: this.movement.position.y + 52 }, 1500, true);
      } else if (e.type !== 'pointercancel') this.tap();
    }
    if (this.ballHeld?.id === e.pointerId) {
      this.ballHeld = null;
      if (this.snapshot.reducedMotion) this.ballVelocity = { x: 0, y: 0 };
    }
  };
  private scroll = () => {
    const now = performance.now();
    this.wake(); this.lastScan = -10000;
    if (now - this.lastScroll < 110 && PRIORITY[this.machine.state] < 3 && !this.snapshot.reducedMotion) {
      this.say('慢一点，等等我～'); this.enter('startled', 1200);
    }
    this.lastScroll = now;
  };
  private activity = () => { this.wake(); };
  private visibility = () => {
    cancelAnimationFrame(this.frame);
    this.held = null; this.ballHeld = null;
    if (this.machine.state === 'dragged') this.resume();
    this.save();
    if (!document.hidden && !this.disposed && !this.snapshot.hidden && !this.covered) { this.lastFrame = performance.now(); this.frame = requestAnimationFrame(this.tick); }
  };

  start() {
    this.disposed = false;
    this.resize(); this.snapshot.reducedMotion = this.media.matches;
    this.movement.position = { x: this.bounds.right - 20, y: this.bounds.bottom };
    let seen = false;
    try { seen = localStorage.getItem(C.introKey) === '1'; } catch { /* optional */ }
    if (!seen && !this.snapshot.hidden && !this.snapshot.reducedMotion) {
      this.say('Hi 👋 我来陪你啦', 5200);
      this.enter('intro', 3200, true);
    } else this.resume();
    this.paint();
    window.addEventListener('pointermove', this.pointerMove, { passive: true });
    window.addEventListener('pointerup', this.pointerUp);
    window.addEventListener('pointercancel', this.pointerUp);
    window.addEventListener('pointerdown', this.activity, { passive: true });
    window.addEventListener('keydown', this.activity);
    window.addEventListener('scroll', this.scroll, { passive: true, capture: true });
    window.addEventListener('resize', this.resize);
    window.addEventListener('pagehide', this.saveOnExit);
    document.addEventListener('visibilitychange', this.visibility);
    this.media.addEventListener('change', this.motionChange);
    if (!this.snapshot.hidden) this.frame = requestAnimationFrame(this.tick);
  }
  private saveOnExit = () => this.save();
  setCovered(covered: boolean) {
    if (this.covered === covered) return;
    this.covered = covered; cancelAnimationFrame(this.frame);
    if (covered) { this.held = null; this.ballHeld = null; if (this.machine.state === 'dragged') this.resume(); }
    else if (!this.snapshot.hidden && !document.hidden && !this.disposed) { this.lastFrame = performance.now(); this.frame = requestAnimationFrame(this.tick); }
  }
  dispose() {
    this.disposed = true; cancelAnimationFrame(this.frame); this.cardAnimation?.cancel(); this.save();
    window.removeEventListener('pointermove', this.pointerMove);
    window.removeEventListener('pointerup', this.pointerUp);
    window.removeEventListener('pointercancel', this.pointerUp);
    window.removeEventListener('pointerdown', this.activity);
    window.removeEventListener('keydown', this.activity);
    window.removeEventListener('scroll', this.scroll, true);
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('pagehide', this.saveOnExit);
    document.removeEventListener('visibilitychange', this.visibility);
    this.media.removeEventListener('change', this.motionChange);
  }
  pointerDown(e: { pointerId: number; clientX: number; clientY: number; button: number }) {
    if (e.button !== 0) return;
    this.snapshot.menu = false;
    this.movement.stop();
    this.held = { id: e.pointerId, start: { x: e.clientX, y: e.clientY },
      offset: { x: e.clientX - this.movement.position.x, y: e.clientY - this.movement.position.y }, moved: false };
    this.emit();
  }
  headHover(inside: boolean) { this.headSince = inside && !this.held && this.fine.matches ? performance.now() : 0; }
  tap() {
    if (this.machine.state === 'dragged') return;
    const now = performance.now(); this.wake();
    this.taps = this.taps.filter(t => now - t < 2000); this.taps.push(now);
    this.snapshot.ball = false;
    if (this.taps.length >= 5) {
      this.stats({ mood: -10 }); this.say('哼，别戳啦！'); this.enter('angry', 850, true);
    } else if (this.taps.length >= 3) {
      this.say('轻轻一点嘛～'); this.enter('annoyed', 1300, true);
    } else {
      this.stats({ mood: 2, affection: 1 }); this.say('嘿嘿，好开心！');
      this.enter('happy', 1800, true); this.snapshot.hearts++; this.emit();
    }
    this.save();
  }
  action(action: PetAction) {
    const wasHidden = this.snapshot.hidden;
    this.wake();
    if (this.machine.state === 'dragged') return;
    this.snapshot.menu = action === 'menu' ? !this.snapshot.menu : false;
    if (action === 'menu' || action === 'closeMenu') { this.movement.stop(); this.emit(); return; }
    if (action !== 'play') { this.snapshot.ball = false; this.ballHeld = null; }
    switch (action) {
      case 'pet':
        this.taps = []; this.stats({ mood: 5, affection: 2 }); this.say('最喜欢摸摸头了 ♡');
        this.enter('happy', 2400, true); this.snapshot.hearts++; break;
      case 'sleep':
        this.lastActive = performance.now(); this.say('晚安，待会儿见～'); this.enter('sleep', Infinity, true); break;
      case 'hide':
        this.snapshot.hidden = true; this.snapshot.bubble = ''; this.movement.stop(); this.resume(); break;
      case 'show':
        this.snapshot.hidden = false; this.resize(); this.movement.position = { x: this.bounds.right - 16, y: this.bounds.bottom };
        this.say('我又回来啦！'); this.enter('happy', 1600, true); break;
      case 'play':
        this.snapshot.hidden = false;
        this.ballPosition = this.clampBall({ x: this.movement.position.x - 160, y: this.movement.position.y + this.height - 18 });
        this.ballVelocity = { x: 0, y: 0 }; this.snapshot.ball = true;
        this.say('把小球丢给我吧！'); this.enter('playing', 25000, true); break;
    }
    this.emit(); this.save();
    if (wasHidden && !this.snapshot.hidden && !this.covered) { this.lastFrame = performance.now(); this.frame = requestAnimationFrame(this.tick); }
  }
  ballDown(e: { pointerId: number; clientX: number; clientY: number }) {
    this.wake(); this.ballHeld = { id: e.pointerId, previous: { x: e.clientX, y: e.clientY }, time: performance.now() };
    this.ballVelocity = { x: 0, y: 0 };
    if (this.machine.state !== 'playing') this.enter('playing', 25000, true);
  }
  private clampBall(p: Point) { return { x: clamp(p.x, 22, innerWidth - 22), y: clamp(p.y, this.bounds.top + 30, this.bounds.bottom + this.height - 16) }; }
  private finishBall() {
    this.snapshot.ball = false; this.stats({ mood: 10, affection: 3, energy: -3 });
    this.say('接到啦！再来一次？'); this.enter('happy', 2400, true); this.snapshot.hearts++; this.emit(); this.save();
  }
  private think(now: number) {
    if (this.snapshot.hidden || this.snapshot.menu || this.held) return;
    const state = this.machine.state;
    if (this.headSince && now - this.headSince > C.headPetTime && state !== 'happy') { this.headSince = 0; this.action('pet'); return; }
    if ((now - this.lastActive > C.sleepTimeout || this.snapshot.stats.energy < 15) && PRIORITY[state] < 4) {
      this.say('唔…有点困啦'); this.enter('tired', 2200); return;
    }
    if (now > this.machine.until) {
      if (state === 'tired') { this.enter('sleep', Infinity, true); return; }
      if (state === 'angry' && !this.snapshot.reducedMotion) {
        const far = this.randomPoint(); far.x = this.movement.position.x > (this.bounds.left + this.bounds.right) / 2 ? this.bounds.left : this.bounds.right;
        this.move('runAway', far, 4500, true); return;
      }
      if (state === 'intro') {
        try { localStorage.setItem(C.introKey, '1'); } catch { /* optional */ }
        this.enter('sitting', 2000, true); return;
      }
      if (state === 'stretch') { this.enter('happy', 1300, true); return; }
      if (state === 'falling') { this.enter('happy', 1000, true); return; }
      if (state === 'playing') this.snapshot.ball = false;
      if (PRIORITY[state] > 0 || moving.has(state) || state === 'peek' || state === 'startled') { this.resume(); return; }
      if (!this.snapshot.reducedMotion) {
        if (Math.random() < .6) this.move(Math.random() < .65 ? 'walk' : 'crawl', this.randomPoint(), random(3000, 6000));
        else this.enter('sitting', random(2500, 6500));
      } else this.enter('sitting', 6000, true);
    }
    if (this.snapshot.reducedMotion || state === 'sleep') return;
    if (this.fine.matches && now - this.mouse.time < 400 && PRIORITY[state] < 4) {
      const center = { x: this.movement.position.x + this.width / 2, y: this.movement.position.y + this.height / 2 };
      const dist = distance(center, this.mouse);
      if (dist < C.chaseDistance && this.mouse.speed > C.mouseSpeedThreshold * (1 - this.snapshot.stats.affection / 250)) {
        if (state !== 'chasing') { this.say('等等我～'); this.enter('chasing', 3500); }
        const target = clampPoint({ x: this.mouse.x - this.width / 2, y: this.mouse.y - this.height / 2 }, this.bounds);
        if (this.free(target)) this.movement.target = target;
      } else if (dist < C.curiousDistance && PRIORITY[state] < 2) {
        this.enter('curious', 2000); this.movement.direction = this.mouse.x > center.x ? 1 : -1;
      }
    }
    if (now > this.nextEvent && PRIORITY[this.machine.state] === 0) {
      this.nextEvent = now + random(C.randomEventMin, C.randomEventMax);
      const pool = Math.random() < .75 ? this.cards : this.interestTargets;
      const card = pool[Math.floor(Math.random() * pool.length)];
      if (card && Math.random() < .55) {
        const r = card.getBoundingClientRect();
        const target = [
          { x: r.left + r.width / 2 - this.width / 2, y: r.bottom + 12 },
          { x: r.right + 12, y: r.top + 8 },
          { x: r.left - this.width - 12, y: r.top + 8 },
          { x: r.left + r.width / 2 - this.width / 2, y: r.top - this.height - 12 },
        ].map(p => clampPoint(p, this.bounds)).find(p => this.free(p));
        if (target) { this.move('walk', target, 9000); this.destinationCard = card; this.say('这里写了什么呀？'); }
      } else {
        const options: PetState[] = ['sitting', 'stretch', 'curious', 'peek'];
        const next = options[Math.floor(Math.random() * options.length)];
        if (next === 'peek') this.movement.position = { x: this.bounds.right, y: this.bounds.bottom };
        this.enter(next, 2500); if (next === 'peek') this.say('你看不见我～');
      }
    }
  }
  private tick = (now: number) => {
    if (this.disposed || document.hidden || this.covered) return;
    const dt = Math.min(.05, Math.max(0, (now - (this.lastFrame || now)) / 1000)); this.lastFrame = now;
    this.fpsCount++; if (now - this.fpsTime > 1000) { this.fps = this.fpsCount; this.fpsCount = 0; this.fpsTime = now; }
    if (!this.snapshot.hidden) {
      if (now - this.lastThink > 140) { this.scan(now); this.think(now); this.lastThink = now; }
      if (this.snapshot.ball) {
        if (!this.ballHeld && !this.snapshot.reducedMotion) {
          const next = { x: this.ballPosition.x + this.ballVelocity.x * dt, y: this.ballPosition.y + this.ballVelocity.y * dt };
          const bounded = this.clampBall(next);
          if (next.x !== bounded.x) this.ballVelocity.x *= -.65;
          if (next.y !== bounded.y) this.ballVelocity.y *= -.65;
          this.ballPosition = bounded; this.ballVelocity.x *= Math.exp(-1.5 * dt); this.ballVelocity.y *= Math.exp(-1.5 * dt);
        }
        if (this.machine.state === 'playing' && !this.held && !this.snapshot.menu && !this.ballHeld) {
          const target = clampPoint({ x: this.ballPosition.x - this.width / 2, y: this.ballPosition.y - this.height + 18 }, this.bounds);
          if (!this.snapshot.reducedMotion && this.free(target)) this.movement.target = target;
          const feet = { x: this.movement.position.x + this.width / 2, y: this.movement.position.y + this.height - 18 };
          if (distance(feet, this.ballPosition) < 44) this.finishBall();
        }
      }
      if (!this.held && !this.snapshot.menu && !this.snapshot.reducedMotion && moving.has(this.machine.state)) {
        const previous = { ...this.movement.position };
        const card = this.destinationCard;
        const state = this.machine.state;
        const arrived = this.movement.step(dt, state === 'falling' ? 280 : ['run', 'runAway'].includes(state) ? C.runSpeed : ['chasing', 'playing'].includes(state) ? C.chaseSpeed : state === 'crawl' ? 48 : C.moveSpeed, this.bounds);
        // Stop before covering an interactive control; dragging remains under user control.
        if (this.free(previous) && !this.free(this.movement.position)) { this.movement.position = previous; this.movement.stop(); if (state !== 'playing') this.resume(); }
        if (arrived && this.route.length) {
          this.movement.target = this.route.shift() ?? null;
        } else if (arrived && card?.isConnected) {
          if (card.matches('a, button')) {
            this.say('这个按钮是做什么的呀？'); this.enter('curious', 2200, true);
          } else {
            this.cardAnimation?.cancel();
            this.cardAnimation = card.animate([{ transform: 'rotate(0) scale(1)' }, { transform: 'rotate(1deg) scale(1.01)' }, { transform: 'rotate(0) scale(1)' }], { duration: 420, easing: 'ease-in-out' });
            this.say('哎呀，它动了！'); this.enter('startled', 1200, true);
          }
        } else if (arrived && !['playing', 'chasing'].includes(state)) this.machine.until = now;
      }
      if (now - this.lastStats > 5000) {
        this.stats({ energy: this.machine.state === 'sleep' ? 3 : moving.has(this.machine.state) ? -.5 : -.1 });
        this.lastStats = now; this.emit();
      }
      if (this.snapshot.bubble && now > this.bubbleUntil) { this.snapshot.bubble = ''; this.emit(); }
      this.paint();
    }
    if (now - this.lastSave > 10000) { this.save(); this.lastSave = now; }
    if (!this.snapshot.hidden) this.frame = requestAnimationFrame(this.tick);
  };
  private paint() {
    const { x, y } = this.movement.position;
    this.node.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    this.node.style.setProperty('--pet-facing', `${this.movement.direction}`);
    if (this.snapshot.direction !== this.movement.direction) { this.snapshot.direction = this.movement.direction; this.emit(); }
    this.node.dataset.side = x > innerWidth / 2 ? 'right' : 'left';
    this.node.dataset.menuBelow = y < 330 ? 'true' : 'false';
    const menuHeight = Math.min(325, innerHeight - 135);
    const menuWidth = innerWidth < 768 ? 196 : 208;
    const menuX = clamp(x > innerWidth / 2 ? x + this.width - menuWidth : x, 12, innerWidth - menuWidth - 12);
    const menuY = clamp(y >= menuHeight + 24 ? y - menuHeight - 12 : y + this.height + 12, 12, innerHeight - menuHeight - 12);
    this.node.style.setProperty('--pet-menu-left', `${menuX - x}px`);
    this.node.style.setProperty('--pet-menu-top', `${menuY - y}px`);
    this.ballNode.style.transform = `translate3d(${this.ballPosition.x - 16}px, ${this.ballPosition.y - 16}px, 0)`;
  }
}
