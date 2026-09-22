import test from 'node:test';
import assert from 'node:assert/strict';
import { nextElephantAsset, type ElephantAsset, type ElephantAction } from './elephantPlayback';
import { chooseElephantEntryPose } from './elephantPoseMatching';

function route(from: ElephantAsset, to: ElephantAction) {
  const result: ElephantAsset[] = [];
  let current = from;
  while (current !== to && result.length < 5) { current = nextElephantAsset(current, to); result.push(current); }
  assert.equal(current, to, `${from} -> ${to} must converge`);
  return result;
}

test('sleep and locomotion use complete forward posture transitions', () => {
  assert.deepEqual(route('walk', 'sleep'), ['sit-down', 'lie-down', 'sleep']);
  assert.deepEqual(route('sleep', 'walk'), ['wake-up', 'stand-up', 'walk']);
  assert.deepEqual(route('sit', 'walk'), ['stand-up', 'walk']);
  assert.deepEqual(route('sleep', 'sit'), ['wake-up', 'sit']);
});
test('rapid input replans from the landing pose of the transition already playing', () => {
  assert.deepEqual(route('lie-down', 'hello'), ['wake-up', 'stand-up', 'hello']);
  assert.deepEqual(route('sit-down', 'curious'), ['stand-up', 'curious']);
  assert.deepEqual(route('wake-up', 'sleep'), ['lie-down', 'sleep']);
});
test('all action pairs reach the latest request without looping through transitions', () => {
  const actions: ElephantAction[] = ['walk', 'hello', 'curious', 'sit', 'sleep', 'play'];
  for (const from of actions) for (const to of actions) assert.ok(route(from, to).length <= 3);
});

test('entry pose matching selects the closer silhouette instead of resetting to frame zero', () => {
  assert.equal(chooseElephantEntryPose([30, 70, 140], [
    { time: 0, pixels: [120, 150, 20] }, { time: .4, pixels: [32, 65, 139] }, { time: .8, pixels: [90, 20, 70] },
  ]), .4);
  assert.equal(chooseElephantEntryPose([30, 70, 140], []), 0);
  assert.equal(chooseElephantEntryPose([30, 70, 140], [{ time: 0, pixels: [31, 69, 139] }, { time: 1, pixels: [31, 69, 141] }]), 0);
});
