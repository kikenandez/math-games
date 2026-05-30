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

  return { LETTER_FREQ, LETTER_COLOR, PAIRS, MIRROR, KEYPAD_SETS };
});
