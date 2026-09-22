import type { Point } from '../types';

export interface Bounds { left: number; top: number; right: number; bottom: number }
export const PET_TURN_MS = 360;
export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(Math.max(min, max), value));
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export const random = (min: number, max: number) => min + Math.random() * (max - min);
export const clampPoint = (p: Point, b: Bounds): Point => ({ x: clamp(p.x, b.left, b.right), y: clamp(p.y, b.top, b.bottom) });

/** Plan a short corridor route around cached control rectangles, without reading layout. */
export function routeAround(start: Point, target: Point, bounds: Bounds, obstacles: Bounds[]): Point[] | null {
  const inside = (p: Point, r: Bounds) => p.x > r.left && p.x < r.right && p.y > r.top && p.y < r.bottom;
  const clear = (a: Point, b: Point) => !obstacles.some(r => {
    // A user can drop the pet over a control; always permit it to leave that control.
    if (inside(a, r)) return false;
    let low = 0; let high = 1;
    for (const axis of ['x', 'y'] as const) {
      const min = axis === 'x' ? r.left : r.top;
      const max = axis === 'x' ? r.right : r.bottom;
      const delta = b[axis] - a[axis];
      if (Math.abs(delta) < .001) { if (a[axis] <= min || a[axis] >= max) return false; }
      else {
        const t1 = (min - a[axis]) / delta; const t2 = (max - a[axis]) / delta;
        low = Math.max(low, Math.min(t1, t2)); high = Math.min(high, Math.max(t1, t2));
      }
    }
    return low < high && high > 0 && low < 1;
  });
  if (obstacles.some(r => inside(target, r))) return null;
  if (clear(start, target)) return [target];
  const paths: Point[][] = [
    [{ x: start.x, y: target.y }, target], [{ x: target.x, y: start.y }, target],
  ];
  const xs = [bounds.left, bounds.right, ...obstacles.flatMap(r => [r.left - 2, r.right + 2])];
  const ys = [bounds.top, bounds.bottom, ...obstacles.flatMap(r => [r.top - 2, r.bottom + 2])];
  for (const x of xs) if (x >= bounds.left && x <= bounds.right) paths.push([{ x, y: start.y }, { x, y: target.y }, target]);
  for (const y of ys) if (y >= bounds.top && y <= bounds.bottom) paths.push([{ x: start.x, y }, { x: target.x, y }, target]);
  return paths.filter(path => path.every((p, i) => clear(i ? path[i - 1] : start, p)))
    .sort((a, b) => a.reduce((sum, p, i) => sum + distance(i ? a[i - 1] : start, p), 0) - b.reduce((sum, p, i) => sum + distance(i ? b[i - 1] : start, p), 0))[0] ?? null;
}

export class MovementEngine {
  position: Point = { x: 0, y: 0 };
  velocity: Point = { x: 0, y: 0 };
  target: Point | null = null;
  direction: 1 | -1 = 1;
  private turnRemaining = 0;
  get turning() { return this.turnRemaining > 0; }
  face(direction: 1 | -1) {
    if (direction === this.direction) return;
    this.direction = direction;
    this.velocity = { x: 0, y: 0 };
    this.turnRemaining = PET_TURN_MS / 1000;
  }
  advanceTurn(dt: number) { this.turnRemaining = Math.max(0, this.turnRemaining - dt); }
  stop() { this.target = null; this.velocity = { x: 0, y: 0 }; }
  step(dt: number, speed: number, bounds: Bounds) {
    if (!this.target) return false;
    this.target = clampPoint(this.target, bounds);
    const dx = this.target.x - this.position.x;
    const dy = this.target.y - this.position.y;
    const length = Math.hypot(dx, dy);
    // Finish the visual turn in place before taking even the first step backwards.
    // Clear old momentum so the newly faced pet never slides the wrong way.
    const facing = Math.abs(dx) > .01 ? (dx > 0 ? 1 : -1) : this.direction;
    if (facing !== this.direction) {
      this.face(facing);
      return false;
    }
    if (this.turnRemaining > 0) {
      this.advanceTurn(dt);
      return false;
    }
    if (length < 3) { this.position = { ...this.target }; this.stop(); return true; }
    // Exponential velocity smoothing gives acceleration; distance taper gives arrival ease-out.
    const effectiveSpeed = Math.min(speed, length * 2.6);
    const blend = 1 - Math.exp(-5.5 * dt);
    this.velocity.x += ((dx / length) * effectiveSpeed - this.velocity.x) * blend;
    this.velocity.y += ((dy / length) * effectiveSpeed - this.velocity.y) * blend;
    // Never overshoot a waypoint, including when a moving ball changes destination.
    const advance = (delta: number, velocity: number) => Math.sign(delta) * Math.min(Math.abs(delta), Math.max(0, velocity * Math.sign(delta)) * dt);
    this.position = clampPoint({ x: this.position.x + advance(dx, this.velocity.x), y: this.position.y + advance(dy, this.velocity.y) }, bounds);
    return false;
  }
}
