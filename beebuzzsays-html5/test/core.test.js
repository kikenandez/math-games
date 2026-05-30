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
