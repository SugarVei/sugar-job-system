import test from 'node:test';
import assert from 'node:assert/strict';
import { nextElephantAsset, canMatchElephantEntry, elephantBlendDuration, type ElephantAsset, type ElephantAction } from './elephantPlayback';
import { chooseElephantEntryPose, chooseElephantExitTime } from './elephantPoseMatching';

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

test('deliberate gestures and posture transitions retain their opening frames', () => {
  for (const clip of ['hello', 'play', 'sit-down', 'wake-up', 'stand-up', 'lie-down'] as ElephantAsset[]) assert.equal(canMatchElephantEntry(clip), false);
  assert.equal(canMatchElephantEntry('walk'), true);
});

test('fast loops finish blending before the outgoing matching tail ends', () => {
  assert.ok(elephantBlendDuration(true, false, 1.4, .2) < .2 / 1.4 * 1000);
  assert.ok(elephantBlendDuration(true, false, 1.4, .3) < elephantBlendDuration(true, false, .7, .3));
});

test('pose handoff waits briefly for a better outgoing pose, never a distant frame', () => {
  const samples = [{time:1,pixels:[200,180]}, {time:1.2,pixels:[20,40]}, {time:2,pixels:[20,40]}];
  assert.equal(chooseElephantExitTime(1,4,[20,40],samples),1.2);
  assert.equal(chooseElephantExitTime(1.3,4,[20,40],samples),1.3);
  assert.equal(chooseElephantExitTime(1,4,[],samples),1);
  assert.equal(chooseElephantExitTime(1,1.4,[20,40],samples),1);
});
