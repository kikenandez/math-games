// =====================================================================
// BEE BUZZ SAYS — pure logic core (no DOM / canvas / audio).
// UMD: window.BBSCore in the browser, module.exports in Node.
// Frozen constants (LETTER_FREQ / LETTER_COLOR) must never change —
// they back a reinforced audiovisual letter association.
// =====================================================================
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BBSCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const LETTER_FREQ = {
    b: 261.63, d: 392.00, p: 293.66, q: 440.00, m: 329.63, w: 523.25,
    n: 587.33, u: 880.00, a: 659.25, e: 783.99, o: 1046.50,
  };
  const LETTER_COLOR = {
    b: '#ff5c7c', d: '#3a8ad9', p: '#5cd97a', q: '#ffd24d', m: '#b07cff',
    w: '#ff8a3d', n: '#2fb8a8', u: '#e2434b', a: '#f4d35e', e: '#7ad1ff', o: '#c87543',
  };
  const PAIRS = [['b', 'd'], ['p', 'q'], ['m', 'w'], ['n', 'u']];
  const MIRROR = { b: 'd', d: 'b', p: 'q', q: 'p', m: 'w', w: 'm', n: 'u', u: 'n' };
  const KEYPAD_SETS = {
    easy: ['b', 'd', 'p', 'q'],
    normal: ['b', 'd', 'p', 'q', 'm', 'w', 'n', 'u'],
    hard: ['b', 'd', 'p', 'q', 'm', 'w', 'n', 'u', 'a', 'e', 'o'],
  };

  function keypadLetters(difficulty) {
    return KEYPAD_SETS[difficulty] ? KEYPAD_SETS[difficulty].slice() : KEYPAD_SETS.normal.slice();
  }

  function gridRadius(difficulty, age) {
    const a = parseInt(age, 10);
    if (difficulty === 'easy') return 1;
    if (!Number.isNaN(a) && a <= 7) return 1;
    return 2;
  }

  // mulberry32 — small deterministic PRNG for tests/reproducibility.
  function makeRng(seed) {
    let s = seed >>> 0;
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(arr, rng) { return arr[Math.floor(rng() * arr.length)]; }

  // Returns the next {letter, cell} for the trail, avoiding an immediate
  // repeat of the previous letter AND previous cell (clarity for kids).
  function growTrail(seq, letters, cellCount, rng) {
    const r = rng || Math.random;
    const prev = seq.length ? seq[seq.length - 1] : null;
    let letter;
    do { letter = pick(letters, r); } while (prev && letters.length > 1 && letter === prev.letter);
    let cell;
    do { cell = Math.floor(r() * cellCount); } while (prev && cellCount > 1 && cell === prev.cell);
    return { letter, cell };
  }

  return { LETTER_FREQ, LETTER_COLOR, PAIRS, MIRROR, KEYPAD_SETS, keypadLetters, gridRadius, makeRng, growTrail };
});
