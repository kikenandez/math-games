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

  // Returns the next {letter, cell} for the trail, avoiding an immediate repeat
  // of the previous letter and using each cell at most once. Returns null when
  // every cell is already used (the board is full).
  function growTrail(seq, letters, cellCount, rng) {
    const r = rng || Math.random;
    const used = new Set(seq.map((s) => s.cell));
    if (used.size >= cellCount) return null;
    const prev = seq.length ? seq[seq.length - 1] : null;
    let letter;
    do { letter = pick(letters, r); } while (prev && letters.length > 1 && letter === prev.letter);
    // Rejection-sample a free cell: the early null-return above guarantees one exists.
    let cell;
    do { cell = Math.floor(r() * cellCount); } while (used.has(cell));
    return { letter, cell };
  }

  // True when the trail covers every cell. Assumes seq has no duplicate cells
  // (as guaranteed by growTrail), so trail length equals occupied-cell count.
  function boardFull(seq, cellCount) {
    return seq.length >= cellCount;
  }

  function checkTap(seq, index, letter) {
    const expected = seq[index] && seq[index].letter;
    const ok = letter === expected;
    return { ok, mirror: !ok && MIRROR[expected] === letter };
  }

  function isComplete(seq, typed) {
    return typed.length === seq.length && seq.every((s, i) => s.letter === typed[i]);
  }

  // Axial coordinates for a hexagon of the given radius (center + rings).
  function axialCells(radius) {
    const cells = [];
    for (let q = -radius; q <= radius; q++) {
      const r1 = Math.max(-radius, -q - radius);
      const r2 = Math.min(radius, -q + radius);
      for (let r = r1; r <= r2; r++) cells.push({ q, r });
    }
    return cells;
  }

  // Flat-top hex layout. size = center-to-corner distance.
  function axialToPixel(cell, size) {
    return {
      x: size * 1.5 * cell.q,
      y: size * Math.sqrt(3) * (cell.r + cell.q / 2),
    };
  }

  // Flat-top corners at angles 0,60,...,300 degrees.
  function hexCorners(cx, cy, size) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 180) * (60 * i);
      pts.push({ x: cx + size * Math.cos(a), y: cy + size * Math.sin(a) });
    }
    return pts;
  }

  return { LETTER_FREQ, LETTER_COLOR, PAIRS, MIRROR, KEYPAD_SETS, keypadLetters, gridRadius, makeRng, growTrail, boardFull, checkTap, isComplete, axialCells, axialToPixel, hexCorners };
});
