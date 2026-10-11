import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPaletteTheme, isPaletteColors, paletteSlot, type PaletteColors } from './customPalette';
import { contrastRatio, hexToLch, lchToHex } from './colorScience';

test('accepts exactly five full HEX colors and rejects malformed bridge payloads', () => {
  assert.equal(isPaletteColors(['#350015', '#27774c', '#00A7C2', '#FC779A', '#D0DCD5']), true);
  for (const invalid of [null, {}, [], ['#fff'], Array(5).fill('red'), Array(5).fill('#12GG00'), Array(6).fill('#123456')]) {
    assert.equal(isPaletteColors(invalid), false);
  }
});

test('normalizes extreme, grayscale and mixed palettes to readable coordinated surfaces', () => {
  const palettes: PaletteColors[] = [
    ['#350015', '#27774C', '#00A7C2', '#FC779A', '#D0DCD5'],
    ['#000000', '#000000', '#000000', '#000000', '#000000'],
    ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF'],
    ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'],
    ['#020305', '#FDFEFF', '#808080', '#334455', '#99BBDD'],
  ];
  let seed = 12345;
  for (let i = 0; i < 100; i++) {
    palettes.push(Array.from({ length: 5 }, () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return '#' + (seed & 0xffffff).toString(16).padStart(6, '0');
    }) as PaletteColors);
  }
  for (const colors of palettes) {
    const { tokens } = buildPaletteTheme(colors);
    assert.ok(contrastRatio(tokens['--sugar-accent'], '#FFFFFF') >= 4.5);
    assert.ok(contrastRatio(tokens['--sugar-muted'], tokens['--sugar-surface']) >= 4.5);
    for (let slot = 0; slot < 5; slot++) {
      const bg = tokens[`--sugar-card-${slot}-bg`], fg = tokens[`--sugar-card-${slot}-fg`];
      const [L, C] = hexToLch(bg);
      assert.ok(L >= .93 && L <= .96, `${bg} is too dark for a card`);
      assert.ok(C <= .041, `${bg} is too saturated for a card`);
      assert.ok(contrastRatio(bg, fg) >= 7, `${bg} / ${fg} has insufficient contrast`);
      assert.ok(contrastRatio(bg, tokens['--sugar-muted']) >= 4.5);
    }
    Object.values(tokens).forEach(hex => assert.match(hex, /^#[0-9A-F]{6}$/));
  }
});

test('fixed positions cycle evenly and record colors survive filtering and sorting', () => {
  assert.deepEqual(Array.from({ length: 10 }, (_, i) => paletteSlot(i)), [0, 1, 2, 3, 4, 0, 1, 2, 3, 4]);
  const records = Array.from({ length: 1000 }, (_, i) => `record-${i}`);
  const before = new Map(records.map(id => [id, paletteSlot(id)]));
  records.filter((_, i) => i % 2 === 0).reverse().forEach(id => assert.equal(paletteSlot(id), before.get(id)));
  const counts = Array(5).fill(0);
  records.forEach(id => counts[paletteSlot(id)]++);
  counts.forEach(count => assert.ok(count >= 150 && count <= 250));
});

test('OKLCH round trips primary and neutral colors without hue-induced color shifts', () => {
  for (const hex of ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#350015', '#808080']) {
    assert.equal(lchToHex(hexToLch(hex)), hex);
  }
  assert.equal(contrastRatio('#000000', '#FFFFFF'), 21);
});
