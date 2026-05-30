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

test('growTrail appends one step using only active letters, no immediate letter repeat', () => {
  const letters = ['b','d','p','q'];
  const cellCount = 7;
  const rng = C.makeRng(1);
  let seq = [];
  for (let i = 0; i < 30; i++) {
    const step = C.growTrail(seq, letters, cellCount, rng);
    assert.ok(letters.includes(step.letter), 'letter from active set');
    assert.ok(step.cell >= 0 && step.cell < cellCount, 'cell in range');
    if (seq.length) {
      assert.notEqual(step.letter, seq[seq.length - 1].letter, 'no immediate letter repeat');
      assert.notEqual(step.cell, seq[seq.length - 1].cell, 'no immediate cell repeat');
    }
    seq = seq.concat([step]);
  }
  assert.equal(seq.length, 30);
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
