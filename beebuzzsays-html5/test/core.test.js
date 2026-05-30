const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../core.js');

test('frozen constants are present and consistent', () => {
  const letters = ['b','d','p','q','m','w','n','u','a','e','o'];
  for (const ch of letters) {
    assert.equal(typeof C.LETTER_FREQ[ch], 'number', `freq for ${ch}`);
    assert.match(C.LETTER_COLOR[ch], /^#[0-9a-f]{6}$/i, `color for ${ch}`);
  }
  for (const [a, b] of C.PAIRS) {
    assert.equal(C.MIRROR[a], b);
    assert.equal(C.MIRROR[b], a);
  }
  for (const [a, b] of C.PAIRS) {
    assert.notEqual(C.LETTER_FREQ[a], C.LETTER_FREQ[b], `${a}/${b} must differ in pitch`);
  }
  assert.deepEqual(C.KEYPAD_SETS.easy, ['b','d','p','q']);
  assert.equal(C.KEYPAD_SETS.normal.length, 8);
  assert.equal(C.KEYPAD_SETS.hard.length, 11);
});

test('keypadLetters returns the difficulty set, defaulting to normal', () => {
  assert.deepEqual(C.keypadLetters('easy'), ['b','d','p','q']);
  assert.equal(C.keypadLetters('hard').length, 11);
  assert.deepEqual(C.keypadLetters('bogus'), C.KEYPAD_SETS.normal);
});

test('gridRadius is 1 for easy or young child, else 2', () => {
  assert.equal(C.gridRadius('easy', ''), 1);
  assert.equal(C.gridRadius('normal', '6'), 1);
  assert.equal(C.gridRadius('normal', '7'), 1);
  assert.equal(C.gridRadius('normal', '8'), 2);
  assert.equal(C.gridRadius('normal', ''), 2);
  assert.equal(C.gridRadius('hard', ''), 2);
});

test('makeRng is deterministic for a given seed', () => {
  const r1 = C.makeRng(42), r2 = C.makeRng(42);
  const a = [r1(), r1(), r1()];
  const b = [r2(), r2(), r2()];
  assert.deepEqual(a, b);
  a.forEach(v => { assert.ok(v >= 0 && v < 1); });
});

test('growTrail uses each cell at most once, then returns null when the board is full', () => {
  const letters = ['b','d','p','q'];
  const cellCount = 7;
  const rng = C.makeRng(1);
  let seq = [];
  const usedCells = new Set();
  for (let i = 0; i < cellCount; i++) {
    const step = C.growTrail(seq, letters, cellCount, rng);
    assert.ok(step, `step ${i} should exist`);
    assert.ok(letters.includes(step.letter), 'letter from active set');
    assert.ok(step.cell >= 0 && step.cell < cellCount, 'cell in range');
    assert.ok(!usedCells.has(step.cell), 'cell not reused');
    usedCells.add(step.cell);
    if (seq.length) {
      assert.notEqual(step.letter, seq[seq.length - 1].letter, 'no immediate letter repeat');
    }
    seq = seq.concat([step]);
  }
  assert.equal(usedCells.size, cellCount, 'every cell used exactly once');
  assert.equal(C.growTrail(seq, letters, cellCount, rng), null, 'full board returns null');
});

test('boardFull is true exactly when the trail covers every cell', () => {
  assert.equal(C.boardFull([], 7), false);
  assert.equal(C.boardFull([{letter:'b',cell:0}], 7), false);
  const seq = Array.from({ length: 7 }, (_, i) => ({ letter: 'b', cell: i }));
  assert.equal(C.boardFull(seq, 7), true);
  // length-based: 8 steps >= 7 cells is "full" even though one cell repeats
  assert.equal(C.boardFull(seq.concat([{letter:'d',cell:0}]), 7), true);
});

test('growTrail produces identical sequences for the same seed', () => {
  const letters = ['b','d','p','q','m','w','n','u'];
  const cellCount = 19;
  const run = () => {
    const rng = C.makeRng(777);
    let seq = [];
    for (let i = 0; i < cellCount; i++) seq = seq.concat([C.growTrail(seq, letters, cellCount, rng)]);
    return seq;
  };
  assert.deepEqual(run(), run());
});

test('checkTap reports correctness and mirror confusions', () => {
  const seq = [{letter:'b',cell:0},{letter:'p',cell:1}];
  assert.deepEqual(C.checkTap(seq, 0, 'b'), { ok: true,  mirror: false });
  assert.deepEqual(C.checkTap(seq, 0, 'd'), { ok: false, mirror: true  });
  assert.deepEqual(C.checkTap(seq, 1, 'q'), { ok: false, mirror: true  });
  assert.deepEqual(C.checkTap(seq, 1, 'a'), { ok: false, mirror: false });
});

test('isComplete is true only when typed matches the full trail in order', () => {
  const seq = [{letter:'b',cell:0},{letter:'p',cell:1}];
  assert.equal(C.isComplete(seq, ['b','p']), true);
  assert.equal(C.isComplete(seq, ['b']), false);
  assert.equal(C.isComplete(seq, ['b','q']), false);
});

test('axialCells covers the right count per radius', () => {
  assert.equal(C.axialCells(1).length, 7);
  assert.equal(C.axialCells(2).length, 19);
  assert.equal(C.axialCells(3).length, 37);
  assert.ok(C.axialCells(1).some(c => c.q === 0 && c.r === 0));
});

test('axialToPixel places the center at origin and is flat-top spaced', () => {
  const size = 40;
  assert.deepEqual(C.axialToPixel({q:0,r:0}, size), { x: 0, y: 0 });
  assert.equal(C.axialToPixel({q:1,r:0}, size).x, 60);
});

test('hexCorners returns 6 points around the center', () => {
  const pts = C.hexCorners(0, 0, 40);
  assert.equal(pts.length, 6);
  pts.forEach(p => {
    const d = Math.hypot(p.x, p.y);
    assert.ok(Math.abs(d - 40) < 1e-6, 'corner is `size` from center');
  });
});
