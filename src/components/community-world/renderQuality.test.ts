import test from 'node:test';
import assert from 'node:assert/strict';
import { worldPixelRatio } from './renderQuality.ts';

test('4K mode uses a real 3840 x 2160 drawing buffer on a Full HD screen', () => {
  const ratio = worldPixelRatio('ultra', 1920, 1080, 1, 16384);
  assert.deepEqual([1920 * ratio, 1080 * ratio], [3840, 2160]);
});

test('native 4K and retina screens do not multiply beyond the 4K pixel budget', () => {
  assert.equal(worldPixelRatio('ultra', 3840, 2160, 2, 16384), 1);
  assert.equal(worldPixelRatio('ultra', 1920, 1080, 2, 16384), 2);
  const ratio = worldPixelRatio('ultra', 5120, 1440, 2, 16384);
  assert.ok(5120 * 1440 * ratio * ratio <= 3840 * 2160 + .01);
});

test('mobile supersampling and GPU limits remain bounded', () => {
  assert.equal(worldPixelRatio('ultra', 390, 844, 3, 4096), 2);
  const ratio = worldPixelRatio('ultra', 3840, 2160, 2, 2048);
  assert.ok(3840 * ratio <= 2048);
  assert.ok(2160 * ratio <= 2048);
});

test('high quality exceeds native Full HD while allowing a lighter render than 4K', () => {
  const ratio = worldPixelRatio('high', 1920, 1080, 1, 16384);
  assert.ok(ratio > 1);
  assert.ok(1920 * 1080 * ratio * ratio <= 2560 * 1440 + .01);
  assert.ok(ratio < worldPixelRatio('ultra', 1920, 1080, 1, 16384));
});

test('the existing adaptive quality retains its original device ratio cap', () => {
  assert.equal(worldPixelRatio('adaptive', 1920, 1080, 2, 16384), 1);
  assert.equal(worldPixelRatio('adaptive', 1920, 1080, .8, 16384), .8);
});
