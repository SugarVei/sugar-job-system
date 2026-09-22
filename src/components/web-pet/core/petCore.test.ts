import test from 'node:test';
import assert from 'node:assert/strict';
import { PetStateMachine } from './stateMachine';
import { clampPoint, MovementEngine, PET_TURN_MS, routeAround } from './movementEngine';

test('drag cannot be interrupted by autonomous actions; explicit release can replace it', () => {
  const state = new PetStateMachine();
  assert.equal(state.enter('dragged', 100, Infinity, true), true);
  for (const next of ['walk', 'chasing', 'sleep', 'playing'] as const) assert.equal(state.enter(next, 5000, 1000), false);
  assert.equal(state.state, 'dragged');
  assert.equal(state.enter('falling', 6000, 1500, true), true);
  assert.equal(state.enter('idle', 7600, 2000), true);
});

test('new behavior replaces old deadline so a stale walk cannot restore itself', () => {
  const state = new PetStateMachine();
  state.enter('walk', 0, 6000);
  state.enter('happy', 1200, 1800);
  assert.equal(state.until, 3000);
  assert.equal(state.enter('walk', 1500, 6000), false);
  assert.equal(state.enter('idle', 3100, 2000), true);
});

test('movement arrives without overshooting and remains inside resized viewport', () => {
  const engine = new MovementEngine();
  const bounds = { left: 12, top: 100, right: 600, bottom: 500 };
  engine.position = { x: 20, y: 110 }; engine.target = { x: 900, y: 900 };
  for (let i = 0; i < 1800; i++) {
    engine.step(1 / 60, 150, bounds);
    assert.ok(engine.position.x >= bounds.left && engine.position.x <= bounds.right);
    assert.ok(engine.position.y >= bounds.top && engine.position.y <= bounds.bottom);
  }
  assert.deepEqual(engine.position, { x: 600, y: 500 });
  assert.equal(engine.target, null);
  assert.deepEqual(clampPoint(engine.position, { left: 12, top: 100, right: 230, bottom: 280 }), { x: 230, y: 280 });
});

test('movement starts gently, flips left, and cancellation freezes position', () => {
  const engine = new MovementEngine(); const bounds = { left: 0, top: 0, right: 1000, bottom: 1000 };
  engine.position = { x: 800, y: 500 }; engine.target = { x: 50, y: 500 };
  engine.step(1 / 60, 150, bounds);
  assert.ok(800 - engine.position.x < 150 / 60);
  for (let i = 0; i < 30; i++) engine.step(1 / 60, 150, bounds);
  assert.equal(engine.direction, -1);
  engine.stop(); const position = { ...engine.position };
  engine.step(1, 150, bounds); assert.deepEqual(engine.position, position);
});

test('planned route goes around a button, and refuses a target inside it', () => {
  const bounds = { left: 0, top: 0, right: 600, bottom: 500 };
  const obstacles = [{ left: 200, top: 100, right: 300, bottom: 400 }];
  const route = routeAround({ x: 50, y: 250 }, { x: 500, y: 250 }, bounds, obstacles);
  assert.ok(route && route.length > 1);
  assert.ok(route.some(p => p.y <= 100 || p.y >= 400));
  assert.equal(routeAround({ x: 50, y: 250 }, { x: 250, y: 250 }, bounds, obstacles), null);
});

test('reversing a destination stops in place until the turn finishes', () => {
  const engine = new MovementEngine();
  const bounds = { left: 0, top: 0, right: 1000, bottom: 1000 };
  engine.position = { x: 450, y: 300 }; engine.target = { x: 900, y: 300 };
  for (let i = 0; i < 30; i++) engine.step(1 / 60, 120, bounds);
  assert.ok(engine.velocity.x > 0);
  const before = { ...engine.position };
  engine.target = { x: 100, y: 300 };
  engine.step(1 / 60, 120, bounds);
  assert.equal(engine.direction, -1);
  assert.equal(engine.turning, true);
  assert.deepEqual(engine.velocity, { x: 0, y: 0 });
  for (let i = 0; i < Math.ceil(PET_TURN_MS / 1000 * 60); i++) {
    engine.step(1 / 60, 120, bounds);
    assert.deepEqual(engine.position, before);
  }
  engine.step(1 / 60, 120, bounds);
  assert.ok(engine.position.x < before.x);
});

test('changing chase targets never produces a step opposite the current facing', () => {
  const engine = new MovementEngine();
  const bounds = { left: 0, top: 0, right: 1000, bottom: 1000 };
  engine.position = { x: 450, y: 300 };
  for (const target of [{ x: 900, y: 250 }, { x: 100, y: 350 }, { x: 850, y: 180 }, { x: 200, y: 600 }]) {
    engine.target = target;
    for (let i = 0; i < 120; i++) {
      const x = engine.position.x;
      engine.step(1 / 60, 170, bounds);
      assert.ok((engine.position.x - x) * engine.direction >= -1e-8);
      if (engine.turning) assert.equal(engine.position.x, x);
    }
  }
});

test('a behavior change cannot bypass a turn already in progress', () => {
  const engine = new MovementEngine();
  const bounds = { left: 0, top: 0, right: 1000, bottom: 1000 };
  engine.position = { x: 500, y: 300 };
  engine.face(-1);
  engine.advanceTurn(.1);
  engine.stop();
  engine.target = { x: 100, y: 300 };
  engine.step(.1, 150, bounds);
  assert.equal(engine.turning, true);
  assert.equal(engine.position.x, 500);
  engine.advanceTurn(.2);
  engine.step(1 / 60, 150, bounds);
  assert.ok(engine.position.x < 500);
});
