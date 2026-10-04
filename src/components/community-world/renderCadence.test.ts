import test from 'node:test';
import assert from 'node:assert/strict';
import { RenderCadence } from './renderCadence.ts';

function simulate(refreshHz: number, seconds: number, jitter = false) {
  const cadence = new RenderCadence();
  assert.equal(cadence.accept(0), 0);
  const elapsed: number[] = [];
  let lastAccepted = 0;
  for (let frame = 1; frame <= refreshHz * seconds; frame++) {
    const timestamp = frame * 1000 / refreshHz + (jitter ? (frame % 2 ? -.04 : .04) : 0);
    const delta = cadence.accept(timestamp);
    if (delta !== null) {
      elapsed.push(delta);
      lastAccepted = timestamp;
    }
  }
  return { elapsed, lastAccepted };
}

test('144 Hz produces 60 rendered frames per second without accumulated deadline drift', () => {
  const { elapsed } = simulate(144, 10);
  assert.equal(elapsed.length, 600);
  // Actual intervals alternate between two and three display refreshes.
  assert.ok(elapsed.some(value => value < 15));
  assert.ok(elapsed.some(value => value > 20));
});

test('60 Hz renders every callback and 120 Hz renders every other callback', () => {
  for (const refreshHz of [60, 120]) {
    const { elapsed } = simulate(refreshHz, 10);
    assert.equal(elapsed.length, 600);
    assert.ok(elapsed.every(value => Math.abs(value - 1000 / 60) < 1e-8));
  }
});

test('floating timestamp jitter does not halve a 60 Hz display cadence', () => {
  const { elapsed } = simulate(60, 10, true);
  assert.equal(elapsed.length, 600);
});

test('accepted elapsed times preserve real elapsed time rather than speeding up movement', () => {
  for (const refreshHz of [60, 120, 144]) {
    const { elapsed, lastAccepted } = simulate(refreshHz, 10, true);
    const totalElapsed = elapsed.reduce((sum, value) => sum + value, 0);
    assert.ok(Math.abs(totalElapsed - lastAccepted) < 1e-8);
    assert.ok(Math.abs(lastAccepted - 10000) < 1);
  }
});

test('long pauses return real elapsed time and restart without catch-up frames', () => {
  const cadence = new RenderCadence();
  assert.equal(cadence.accept(0), 0);
  assert.equal(cadence.accept(1000 / 60), 1000 / 60);
  const resumedAt = 5023;
  assert.equal(cadence.accept(resumedAt), resumedAt - 1000 / 60);
  assert.equal(cadence.accept(resumedAt), null);
  assert.equal(cadence.accept(resumedAt + 1000 / 144), null);
  assert.equal(cadence.accept(resumedAt + 2000 / 144), null);
  const next = resumedAt + 3000 / 144;
  assert.equal(cadence.accept(next), next - resumedAt);
});

test('a slow render skips missed deadlines without scheduling immediate catch-up work', () => {
  const cadence = new RenderCadence();
  assert.equal(cadence.accept(0), 0);
  assert.equal(cadence.accept(75), 75);
  assert.equal(cadence.accept(76), null);
  const elapsed = cadence.accept(1000 / 12);
  assert.ok(elapsed !== null && Math.abs(elapsed - (1000 / 12 - 75)) < 1e-8);
});
