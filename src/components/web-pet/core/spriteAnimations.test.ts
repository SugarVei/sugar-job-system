import test from 'node:test';
import assert from 'node:assert/strict';
import { getSpriteClip, sampleSprite, SPRITE_ATLASES, sampleSpriteTween, clipDuration, clipSampleCount, SPRITE_SAMPLE_FPS } from '../spriteAnimations';

test('happy and crawling timelines visit their poses and loop without drift', () => {
  for (const state of ['happy', 'crawl'] as const) {
    const clip = getSpriteClip(state);
    const total = clip.frames.reduce((sum, frame) => sum + frame.duration, 0);
    let elapsed = 0;
    for (const frame of clip.frames) {
      assert.equal(sampleSprite(clip, elapsed), frame.pose);
      assert.equal(sampleSprite(clip, elapsed + total * 100), frame.pose);
      elapsed += frame.duration;
    }
    assert.equal(sampleSprite(clip, total), clip.frames[0].pose);
  }
});

test('sleep plays the yawn once, then loops only closed-eye resting poses', () => {
  const clip = getSpriteClip('sleep');
  assert.equal(sampleSprite(clip, 0), 0);
  assert.equal(sampleSprite(clip, 650), 1);
  assert.equal(sampleSprite(clip, 1300), 2);
  assert.equal(sampleSprite(clip, 2000), 3);
  for (let elapsed = 2000; elapsed < 100000; elapsed += 137) {
    assert([3, 4, 5].includes(sampleSprite(clip, elapsed)));
  }
});

test('one-shot tired clip holds its last pose; reduced motion uses a stable pose', () => {
  assert.equal(sampleSprite(getSpriteClip('tired'), 90000), 2);
  for (const elapsed of [0, 650, 2300, 98000]) {
    assert.equal(sampleSprite(getSpriteClip('sleep'), elapsed, true), 5);
    assert.equal(sampleSprite(getSpriteClip('happy'), elapsed, true), 8);
  }
});

test('all alpha bounds with sampling padding stay inside their atlas and render viewport', () => {
  for (const [name, atlas] of Object.entries(SPRITE_ATLASES)) {
    assert.equal(atlas.rects.length, name === 'joy' ? 24 : 6);
    for (const [index, [x, y, w, h]] of atlas.rects.entries()) {
      assert(x >= 2 && y >= 2 && x + w + 2 <= 1536 && y + h + 2 <= 1024);
      assert((w + 4) * atlas.scale < 95);
      assert((h + 4) * atlas.scale + (name === 'happy' && index === 2 ? 7 : 0) < 139);
    }
  }
});

test('all three animated cycles contain more than 60 motion samples', () => {
  assert.equal(SPRITE_SAMPLE_FPS, 120);
  for (const state of ['happy', 'crawl', 'sleep'] as const) {
    assert(clipSampleCount(getSpriteClip(state)) > 60);
    const unique = new Set();
    for (let frame = 0; frame < 120; frame++) {
      const t = sampleSpriteTween(getSpriteClip(state), frame * 1000 / 120);
      unique.add(`${t.from}:${t.to}:${t.mix.toFixed(7)}`);
    }
    assert.equal(unique.size, 120);
  }
});

test('pose interpolation meets exact endpoints and has a continuous loop seam', () => {
  for (const state of ['happy', 'crawl', 'sleep'] as const) {
    const clip = getSpriteClip(state);
    const total = clipDuration(clip);
    const before = sampleSpriteTween(clip, total - 1000 / 120);
    const after = sampleSpriteTween(clip, clipSampleCount(clip) * 1000 / SPRITE_SAMPLE_FPS);
    assert.equal(before.to, after.from);
    assert(before.mix > .97);
    assert(after.mix < .01);
  }
});

test('reduced motion and one-shot completion hold stable poses', () => {
  for (const state of ['happy', 'crawl', 'sleep'] as const) {
    const clip = getSpriteClip(state);
    const reduced = sampleSpriteTween(clip, 4200, true);
    assert.equal(reduced.from, clip.reducedPose); assert.equal(reduced.to, clip.reducedPose); assert.equal(reduced.mix, 0);
  }
  assert.deepEqual(sampleSpriteTween(getSpriteClip('tired'), 9000), { from: 2, to: 2, mix: 0, sample: 1080 });
});
