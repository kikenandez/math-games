# Bee Buzz Says Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build "Bee Buzz Says" — a honeycomb Simon-style sequence-memory + dyslexia game where a bee hops a growing trail of letters and the player retraces it by tapping letters on a keypad, with a frozen letter→tone association and an optional letter→color cue.

**Architecture:** A single-file HTML5 canvas game in the existing arcade family, but with the *pure* logic split into a UMD `core.js` (browser global `window.BBSCore` + Node `module.exports`) so it can be unit-tested with Node's built-in test runner. `game.js` (IIFE) owns canvas/DOM/audio/state and consumes `BBSCore`. One additive method (`note`) is added to the shared `audio.js`. A hub card is added to the root `index.html`.

**Tech Stack:** Vanilla JS, HTML5 Canvas 2D, Web Audio (via shared `audio.js`), Node v23 built-in `node:test`/`node:assert` for unit tests. No build step, no dependencies.

**Verification reality (read first):** This repo has no bundler or jest. Two verification modes are used below and each task says which:
- **Unit (Node):** for `core.js` only — `node --test "beebuzzsays-html5/test/*.test.js"` gives true red-green TDD. (Note: Node v23's directory form `node --test beebuzzsays-html5/test/` errors without an `index.js`; use the explicit-file or glob form.)
- **Probe/browser:** for `game.js`/`index.html`/`audio.js` — open the page and assert against `window.__bbs()` (a read-only state probe) or visible behavior. Use the `.playwright-mcp` browser tooling already in the repo, or manual checks; commands below use a headless Node+playwright snippet only where noted, otherwise manual steps with exact expected results.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `beebuzzsays-html5/core.js` | Pure, dependency-free logic + frozen constants. UMD: `window.BBSCore` in browser, `module.exports` in Node. No DOM/canvas/audio. |
| `beebuzzsays-html5/test/core.test.js` | Node `node:test` unit tests for `core.js`. |
| `beebuzzsays-html5/index.html` | Game shell: HUD, gear/tweaks (difficulty + age + color cues), title/overlay card, answer strip. Loads `../i18n.js`, `../audio.js`, `core.js`, `game.js`. |
| `beebuzzsays-html5/game.js` | IIFE: canvas/resize, EN/FR/ES `STR`, `TWEAKS`, state machine, watch replay, honeycomb + keypad render, pointer input, audio `note()` on flash+tap, color cues, scoring, metrics, gameOver, tweaks wiring, `window.__bbs` probe. Consumes `BBSCore`. |
| `audio.js` (shared) | Add additive `note(freq, dur, opts)` to `window.MathArcadeAudio`. Only additive. |
| `index.html` (root hub) | Add `.card.beebuzzsays .art` palette rule + a static hub card linking to the game. |

**Frozen constants (defined once in `core.js`, never tuned):**
```
LETTER_FREQ = { b:261.63, d:392.00, p:293.66, q:440.00, m:329.63, w:523.25,
                n:587.33, u:880.00, a:659.25, e:783.99, o:1046.50 }   // Hz, C-major, pairs spread apart
LETTER_COLOR = { b:'#ff5c7c', d:'#3a8ad9', p:'#5cd97a', q:'#ffd24d', m:'#b07cff',
                 w:'#ff8a3d', n:'#2fb8a8', u:'#e2434b', a:'#f4d35e', e:'#7ad1ff', o:'#c87543' }
PAIRS  = [['b','d'],['p','q'],['m','w'],['n','u']]
MIRROR = { b:'d', d:'b', p:'q', q:'p', m:'w', w:'m', n:'u', u:'n' }
KEYPAD_SETS = { easy:['b','d','p','q'],
                normal:['b','d','p','q','m','w','n','u'],
                hard:['b','d','p','q','m','w','n','u','a','e','o'] }
```

---

## Task 1: Core scaffold — frozen constants + Node test harness

**Files:**
- Create: `beebuzzsays-html5/core.js`
- Test: `beebuzzsays-html5/test/core.test.js`

- [ ] **Step 1: Write the failing test**

Create `beebuzzsays-html5/test/core.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../core.js');

test('frozen constants are present and consistent', () => {
  // 11 letters share freq + color tables
  const letters = ['b','d','p','q','m','w','n','u','a','e','o'];
  for (const ch of letters) {
    assert.equal(typeof C.LETTER_FREQ[ch], 'number', `freq for ${ch}`);
    assert.match(C.LETTER_COLOR[ch], /^#[0-9a-f]{6}$/i, `color for ${ch}`);
  }
  // confusable pairs are mutual mirrors
  for (const [a, b] of C.PAIRS) {
    assert.equal(C.MIRROR[a], b);
    assert.equal(C.MIRROR[b], a);
  }
  // pair members are audibly distinct (different frequencies)
  for (const [a, b] of C.PAIRS) {
    assert.notEqual(C.LETTER_FREQ[a], C.LETTER_FREQ[b], `${a}/${b} must differ in pitch`);
  }
  // keypad sets are nested supersets
  assert.deepEqual(C.KEYPAD_SETS.easy, ['b','d','p','q']);
  assert.equal(C.KEYPAD_SETS.normal.length, 8);
  assert.equal(C.KEYPAD_SETS.hard.length, 11);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test beebuzzsays-html5/test/`
Expected: FAIL — `Cannot find module '../core.js'`.

- [ ] **Step 3: Write minimal implementation**

Create `beebuzzsays-html5/core.js`:
```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test beebuzzsays-html5/test/`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add beebuzzsays-html5/core.js beebuzzsays-html5/test/core.test.js
git commit -m "feat(beebuzzsays): core scaffold with frozen letter constants + node tests"
```

---

## Task 2: Keypad set + grid radius derivation

**Files:**
- Modify: `beebuzzsays-html5/core.js`
- Test: `beebuzzsays-html5/test/core.test.js`

- [ ] **Step 1: Write the failing test**

Append to `beebuzzsays-html5/test/core.test.js`:
```js
test('keypadLetters returns the difficulty set, defaulting to normal', () => {
  assert.deepEqual(C.keypadLetters('easy'), ['b','d','p','q']);
  assert.equal(C.keypadLetters('hard').length, 11);
  assert.deepEqual(C.keypadLetters('bogus'), C.KEYPAD_SETS.normal); // safe default
});

test('gridRadius is 1 for easy or young child, else 2', () => {
  assert.equal(C.gridRadius('easy', ''), 1);
  assert.equal(C.gridRadius('normal', '6'), 1); // age 6 -> small grid
  assert.equal(C.gridRadius('normal', '7'), 1); // age 7 -> small grid
  assert.equal(C.gridRadius('normal', '8'), 2);
  assert.equal(C.gridRadius('normal', ''), 2);
  assert.equal(C.gridRadius('hard', ''), 2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test beebuzzsays-html5/test/`
Expected: FAIL — `C.keypadLetters is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `beebuzzsays-html5/core.js`, before the `return { ... }`, add:
```js
  function keypadLetters(difficulty) {
    return KEYPAD_SETS[difficulty] ? KEYPAD_SETS[difficulty].slice() : KEYPAD_SETS.normal.slice();
  }

  function gridRadius(difficulty, age) {
    const a = parseInt(age, 10);
    if (difficulty === 'easy') return 1;
    if (!Number.isNaN(a) && a <= 7) return 1;
    return 2;
  }
```
Then add `keypadLetters, gridRadius` to the returned object.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test beebuzzsays-html5/test/`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add beebuzzsays-html5/core.js beebuzzsays-html5/test/core.test.js
git commit -m "feat(beebuzzsays): keypad set + grid radius derivation"
```

---

## Task 3: Deterministic RNG + trail growth

**Files:**
- Modify: `beebuzzsays-html5/core.js`
- Test: `beebuzzsays-html5/test/core.test.js`

- [ ] **Step 1: Write the failing test**

Append to `beebuzzsays-html5/test/core.test.js`:
```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test beebuzzsays-html5/test/`
Expected: FAIL — `C.makeRng is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `beebuzzsays-html5/core.js`, before the `return`, add:
```js
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
```
Add `makeRng, growTrail` to the returned object.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test beebuzzsays-html5/test/`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add beebuzzsays-html5/core.js beebuzzsays-html5/test/core.test.js
git commit -m "feat(beebuzzsays): deterministic rng + trail growth"
```

---

## Task 4: Tap evaluation + mirror detection

**Files:**
- Modify: `beebuzzsays-html5/core.js`
- Test: `beebuzzsays-html5/test/core.test.js`

- [ ] **Step 1: Write the failing test**

Append to `beebuzzsays-html5/test/core.test.js`:
```js
test('checkTap reports correctness and mirror confusions', () => {
  const seq = [{letter:'b',cell:0},{letter:'p',cell:1}];
  assert.deepEqual(C.checkTap(seq, 0, 'b'), { ok: true,  mirror: false });
  assert.deepEqual(C.checkTap(seq, 0, 'd'), { ok: false, mirror: true  }); // b->d mirror
  assert.deepEqual(C.checkTap(seq, 1, 'q'), { ok: false, mirror: true  }); // p->q mirror
  assert.deepEqual(C.checkTap(seq, 1, 'a'), { ok: false, mirror: false });
});

test('isComplete is true only when typed matches the full trail in order', () => {
  const seq = [{letter:'b',cell:0},{letter:'p',cell:1}];
  assert.equal(C.isComplete(seq, ['b','p']), true);
  assert.equal(C.isComplete(seq, ['b']), false);
  assert.equal(C.isComplete(seq, ['b','q']), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test beebuzzsays-html5/test/`
Expected: FAIL — `C.checkTap is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `beebuzzsays-html5/core.js`, before the `return`, add:
```js
  function checkTap(seq, index, letter) {
    const expected = seq[index] && seq[index].letter;
    const ok = letter === expected;
    return { ok, mirror: !ok && MIRROR[expected] === letter };
  }

  function isComplete(seq, typed) {
    return typed.length === seq.length && seq.every((s, i) => s.letter === typed[i]);
  }
```
Add `checkTap, isComplete` to the returned object.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test beebuzzsays-html5/test/`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add beebuzzsays-html5/core.js beebuzzsays-html5/test/core.test.js
git commit -m "feat(beebuzzsays): tap evaluation + mirror detection"
```

---

## Task 5: Hex geometry (flat-top honeycomb)

**Files:**
- Modify: `beebuzzsays-html5/core.js`
- Test: `beebuzzsays-html5/test/core.test.js`

- [ ] **Step 1: Write the failing test**

Append to `beebuzzsays-html5/test/core.test.js`:
```js
test('axialCells covers the right count per radius', () => {
  assert.equal(C.axialCells(1).length, 7);   // center + 6
  assert.equal(C.axialCells(2).length, 19);  // center + 6 + 12
  // includes the center
  assert.ok(C.axialCells(1).some(c => c.q === 0 && c.r === 0));
});

test('axialToPixel places the center at origin and is flat-top spaced', () => {
  const size = 40;
  assert.deepEqual(C.axialToPixel({q:0,r:0}, size), { x: 0, y: 0 });
  // one step in +q moves 1.5*size in x
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test beebuzzsays-html5/test/`
Expected: FAIL — `C.axialCells is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `beebuzzsays-html5/core.js`, before the `return`, add:
```js
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
```
Add `axialCells, axialToPixel, hexCorners` to the returned object.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test beebuzzsays-html5/test/`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add beebuzzsays-html5/core.js beebuzzsays-html5/test/core.test.js
git commit -m "feat(beebuzzsays): flat-top hex geometry"
```

---

## Task 6: Add additive `note()` to shared audio.js

**Files:**
- Modify: `audio.js` (the `window.MathArcadeAudio` object literal near the end)

- [ ] **Step 1: Add the method**

In `audio.js`, find the public API object:
```js
  window.MathArcadeAudio = {
    click, start, correct, wrong, levelClear, gameOver, boing, zap, pop, explosion, hint,
    missileLaunch, playerBlast, chainBlast, event,
```
Insert a `note` function definition just above it (after the `hint()` function, before `event()` is fine too) :
```js
  // Generic fixed-frequency note — used for letter↔tone association games.
  // Routes through the shared master gain + global mute (so the 🔊 toggle works).
  function note(freq, dur = 0.22, opts = {}) {
    const t = now();
    tone(freq, t, dur, Object.assign({ type: 'triangle', gain: 0.16, cutoff: 2600 }, opts));
  }
```
Then add `note` to the exported object:
```js
  window.MathArcadeAudio = {
    click, start, correct, wrong, levelClear, gameOver, boing, zap, pop, explosion, hint,
    missileLaunch, playerBlast, chainBlast, event, note,
```

- [ ] **Step 2: Verify it does not break existing games (static load check)**

Run:
```bash
node -e "const fs=require('fs');const s=fs.readFileSync('audio.js','utf8');if(!/function note\(/.test(s))throw new Error('note() missing');if(!/event, note/.test(s))throw new Error('note not exported');console.log('audio.js note() present + exported');"
```
Expected: prints `audio.js note() present + exported`.

- [ ] **Step 3: Verify in browser (manual)**

Open any existing game (e.g. `recallcrates-html5/index.html`) in a browser, open devtools console, run:
```js
window.MathArcadeAudio.note(440)
```
Expected: a short tone plays (after one click/keypress to unlock audio); toggling 🔊 off then calling again plays nothing. No console errors.

- [ ] **Step 4: Commit**

```bash
git add audio.js
git commit -m "feat(audio): add additive note(freq) for letter-tone association"
```

---

## Task 7: Game shell — `index.html`

**Files:**
- Create: `beebuzzsays-html5/index.html`

- [ ] **Step 1: Create the shell**

Create `beebuzzsays-html5/index.html` (cloned from Recall Crates, amber honeycomb palette, HUD = Score/Level/Best/Strikes, gear tweaks with a Color-cues row, answer strip, title card; loads `core.js` before `game.js`):
```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Bee Buzz Says</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lilita+One&family=Fredoka:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --ink: #3a2410;
    --paper: #fff6df;
    --accent: #ffc233;
    --hot: #ff5c7c;
    --good: #5cd97a;
  }
  *, *::before, *::after { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden;
    background: #3a2410; font-family: 'Fredoka', sans-serif; color: var(--paper); user-select: none;
  }
  #game-wrap { position: fixed; inset: 0; overflow: hidden; }
  canvas#game { display: block; width: 100%; height: 100%; cursor: pointer; }

  #hud {
    position: absolute; top: 14px; left: 14px; right: 70px;
    display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
    pointer-events: none; font-family: 'Lilita One', sans-serif; z-index: 5;
  }
  .hud-group { display: flex; gap: 10px; }
  .badge {
    background: rgba(58, 36, 16, 0.92); border: 3px solid var(--paper); border-radius: 10px;
    padding: 7px 12px; box-shadow: 0 4px 0 rgba(0,0,0,0.45);
    display: flex; align-items: center; gap: 8px; font-size: 18px; color: var(--paper); line-height: 1;
  }
  .badge .label {
    font-size: 10px; color: rgba(255, 246, 223, 0.55); letter-spacing: 0.2em;
    font-family: 'Fredoka', sans-serif; font-weight: 600; text-transform: uppercase;
  }
  .badge .val { font-size: 20px; min-width: 1ch; }
  .badge.score .val { color: var(--accent); }
  .badge.level .val { color: var(--good); }
  .badge.best  .val { color: #ffe08a; }
  .badge.strikes .val { color: var(--hot); }

  #answer-display { position: absolute; bottom: 22px; left: 50%; transform: translateX(-50%); z-index: 6; text-align: center; pointer-events: none; }
  #answer-display .lcd {
    background: rgba(58, 36, 16, 0.92); border: 3px solid var(--accent); border-radius: 14px;
    padding: 8px 22px 10px; box-shadow: 0 4px 0 rgba(0,0,0,0.5); min-width: 260px;
  }
  #answer-display .lcd-label { font-family: 'Fredoka', sans-serif; font-weight: 600; font-size: 10px; letter-spacing: 0.3em; color: rgba(255,246,223,0.55); text-transform: uppercase; }
  #answer-display .lcd-val { font-family: 'Lilita One', sans-serif; font-size: 40px; letter-spacing: 0.22em; color: var(--paper); line-height: 1.1; min-height: 44px; }
  #answer-display .lcd-val.empty { color: rgba(255,246,223,0.35); }
  #answer-display .lcd-hint { font-family: 'Fredoka', sans-serif; font-size: 12px; color: rgba(255,246,223,0.5); margin-top: 6px; }
  .cursor { animation: blink 1s steps(1) infinite; }
  @keyframes blink { 50% { opacity: 0; } }

  #gear-btn {
    position: absolute; top: 14px; right: 14px; width: 42px; height: 42px;
    background: rgba(58, 36, 16, 0.92); border: 3px solid var(--paper); border-radius: 10px;
    box-shadow: 0 4px 0 rgba(0,0,0,0.45); cursor: pointer; display: flex; align-items: center; justify-content: center;
    z-index: 25; font-family: 'Lilita One', sans-serif; font-size: 20px; color: var(--paper); padding: 0;
  }
  #tweaks {
    position: absolute; top: 68px; right: 14px; width: 260px;
    background: rgba(58, 36, 16, 0.96); border: 3px solid var(--paper); border-radius: 12px;
    box-shadow: 0 6px 0 rgba(0,0,0,0.5); padding: 12px 14px 14px; z-index: 30; display: none; color: var(--paper);
  }
  #tweaks.open { display: block; }
  #tweaks h3 { font-family: 'Lilita One', sans-serif; font-size: 17px; margin: 0 0 10px; letter-spacing: 0.06em; display: flex; align-items: center; justify-content: space-between; }
  #tweaks .close { background: none; border: none; cursor: pointer; color: rgba(255,246,223,0.7); font-size: 20px; font-family: 'Lilita One', sans-serif; }
  .tweak-row { margin: 0 0 10px; }
  .tweak-row .lbl { display: flex; justify-content: space-between; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: rgba(255,246,223,0.6); margin-bottom: 3px; }
  .tweak-row .opts { display: flex; gap: 5px; flex-wrap: wrap; }
  .tweak-row .opt {
    padding: 5px 9px; border: 2px solid var(--paper); border-radius: 8px; background: rgba(0,0,0,0.4); color: var(--paper);
    font-family: 'Lilita One', sans-serif; font-size: 11px; cursor: pointer; box-shadow: 0 2px 0 rgba(0,0,0,0.5);
  }
  .tweak-row .opt.active { background: var(--accent); color: var(--ink); border-color: var(--accent); }

  .overlay { position: absolute; inset: 0; background: radial-gradient(ellipse at center, rgba(58, 36, 16, 0.55), rgba(0,0,0,0.86)); display: flex; align-items: center; justify-content: center; z-index: 20; opacity: 1; transition: opacity 0.25s; }
  .overlay.hidden { opacity: 0; pointer-events: none; }
  .card { background: rgba(58, 36, 16, 0.96); border: 4px solid var(--paper); border-radius: 20px; box-shadow: 0 8px 0 rgba(0,0,0,0.5); padding: 32px 38px; text-align: center; max-width: 560px; }
  .card h1 { font-family: 'Lilita One', sans-serif; font-size: clamp(34px, 7vw, 54px); line-height: 1.05; margin: 0 0 6px; color: var(--paper); letter-spacing: 0.02em; white-space: nowrap; }
  .card h1 .acc { color: var(--accent); }
  .card .sub { font-family: 'Fredoka', sans-serif; font-weight: 600; color: rgba(255,246,223,0.7); font-size: 15px; margin: 4px 0 18px; }
  .card p { font-family: 'Fredoka', sans-serif; font-size: 14px; line-height: 1.55; color: rgba(255,246,223,0.85); margin: 0 0 18px; }
  .card p b { color: var(--paper); }
  .big-btn { font-family: 'Lilita One', sans-serif; font-size: 26px; letter-spacing: 0.05em; background: var(--accent); color: var(--ink); border: 3px solid var(--paper); border-radius: 12px; padding: 10px 30px; box-shadow: 0 5px 0 rgba(0,0,0,0.5); cursor: pointer; white-space: nowrap; }
  .big-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 0 rgba(0,0,0,0.5); }
  .big-btn:active { transform: translateY(3px); box-shadow: 0 2px 0 rgba(0,0,0,0.5); }
  .note { font-family: 'Fredoka', sans-serif; font-size: 11px; color: rgba(255,246,223,0.5); margin-top: 14px; letter-spacing: 0.04em; }
  .stats-row { display: flex; gap: 8px; justify-content: center; margin: 0 0 16px; flex-wrap: wrap; }
  .stat-chip { background: rgba(0,0,0,0.4); border: 2px solid var(--paper); border-radius: 10px; padding: 6px 12px; font-family: 'Lilita One', sans-serif; box-shadow: 0 3px 0 rgba(0,0,0,0.55); min-width: 70px; }
  .stat-chip .stat-label { font-size: 9px; color: rgba(255,246,223,0.6); letter-spacing: 0.16em; font-family: 'Fredoka', sans-serif; font-weight: 600; text-transform: uppercase; }
  .stat-chip .stat-val { font-size: 22px; color: var(--paper); }
  .stat-chip.hi .stat-val { color: var(--accent); }
</style>
</head>
<body>
<div id="game-wrap">
  <canvas id="game"></canvas>

  <div id="hud">
    <div class="hud-group">
      <div class="badge score"><span class="label" id="lbl-score">Score</span><span class="val" id="score">0</span></div>
      <div class="badge level"><span class="label" id="lbl-level">Level</span><span class="val" id="level">1</span></div>
      <div class="badge best"><span class="label" id="lbl-best">Best</span><span class="val" id="best">0</span></div>
      <div class="badge strikes"><span class="label" id="lbl-strikes">Strikes</span><span class="val" id="strikes">○○○</span></div>
    </div>
  </div>

  <button id="gear-btn" title="Tweaks">⚙</button>

  <div id="tweaks">
    <h3><span id="tw-title">Tweaks</span> <button class="close" id="tweaks-close">×</button></h3>
    <div class="tweak-row">
      <div class="lbl"><span id="tw-diff">Difficulty</span></div>
      <div class="opts" id="diff-row">
        <div class="opt" data-value="easy" id="tw-easy">EASY</div>
        <div class="opt active" data-value="normal" id="tw-normal">NORMAL</div>
        <div class="opt" data-value="hard" id="tw-hard">HARD</div>
      </div>
    </div>
    <div class="tweak-row">
      <div class="lbl"><span id="tw-age">Child age</span></div>
      <div class="opts" id="age-row">
        <div class="opt" data-value="6">6</div>
        <div class="opt" data-value="7">7</div>
        <div class="opt" data-value="8">8</div>
        <div class="opt" data-value="9">9</div>
      </div>
    </div>
    <div class="tweak-row">
      <div class="lbl"><span id="tw-color">Color cues</span></div>
      <div class="opts" id="color-row">
        <div class="opt active" data-value="off" id="tw-color-off">OFF</div>
        <div class="opt" data-value="on" id="tw-color-on">ON</div>
      </div>
    </div>
  </div>

  <div id="answer-display">
    <div class="lcd">
      <div class="lcd-label" id="lcd-label">Tap the letters you saw</div>
      <div class="lcd-val empty" id="ans-val"><span class="cursor">_</span></div>
    </div>
    <div class="lcd-hint" id="lcd-hint">tap them in order on the comb keypad</div>
  </div>

  <div class="overlay" id="overlay">
    <div class="card" id="title-card">
      <h1 id="title-h1"><span class="acc">BEE BUZZ</span> SAYS</h1>
      <div class="sub" id="title-sub">watch the bee — then tap the letters back in order</div>
      <p id="title-p">A bee buzzes from cell to cell, lighting up a letter each time. <b>Tap the same letters in the same order</b> on the keypad. Each round adds one more. Listen — every letter has its own buzz. Three slip-ups and the swarm rests.</p>
      <button class="big-btn" id="start-btn">START</button>
      <div class="note" id="title-note">Practice game — not a diagnosis.</div>
    </div>
  </div>
</div>

<script src="../i18n.js"></script>
<script src="../audio.js"></script>
<script src="core.js"></script>
<script src="game.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify the shell loads with core wired (manual)**

Open `beebuzzsays-html5/index.html` in a browser. The title card "BEE BUZZ SAYS" shows. Console: `window.BBSCore.keypadLetters('hard').length` → `11`. (game.js does not exist yet, so a 404 for game.js in the network tab is expected here.)

- [ ] **Step 3: Commit**

```bash
git add beebuzzsays-html5/index.html
git commit -m "feat(beebuzzsays): game shell html (hud, tweaks incl color cues, title card)"
```

---

## Task 8: Game logic — `game.js` (boot, state, i18n)

**Files:**
- Create: `beebuzzsays-html5/game.js`

- [ ] **Step 1: Create the boot + i18n + state skeleton**

Create `beebuzzsays-html5/game.js`:
```js
// =====================================================================
// BEE BUZZ SAYS — honeycomb Simon for memory + dyslexia letter drill.
// A bee hops a growing trail of letters across a honeycomb; retrace it
// by tapping letters on the keypad. Each letter has a FIXED tone (and an
// optional fixed color) so the audiovisual association reinforces.
// Pure logic lives in core.js (window.BBSCore). UI localized EN/FR/ES.
// =====================================================================
(() => {
  const C = window.BBSCore;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.floor(W * DPR); canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    layoutBoard();
  }
  window.addEventListener('resize', resize);

  // ===== Localization =====
  const supported = ['en', 'fr', 'es'];
  const stored = localStorage.getItem('mathArcadeLang');
  const param = new URLSearchParams(location.search).get('lang');
  const LANG = supported.includes(param) ? param : (supported.includes(stored) ? stored : 'en');
  const STR = {
    en: {
      titleAcc: 'BEE BUZZ', titleRest: ' SAYS',
      sub: 'watch the bee — then tap the letters back in order',
      intro: "A bee buzzes from cell to cell, lighting up a letter each time. <b>Tap the same letters in the same order</b> on the keypad. Each round adds one more. Listen — every letter has its own buzz. Three slip-ups and the swarm rests.",
      start: 'START', playAgain: 'PLAY AGAIN', note: 'Practice game — not a diagnosis.',
      tapWhat: 'Tap the letters you saw', hint: 'tap them in order on the comb keypad',
      watch: 'WATCH…', recall: 'YOUR TURN!',
      score: 'Score', level: 'Level', best: 'Best', strikes: 'Strikes',
      correct: 'PERFECT!', wrong: 'OOPS', tooSlow: 'TOO SLOW',
      gameAcc: 'SWARM', gameRest: ' RESTS', tooMany: 'too many slip-ups!',
      maxLen: 'Best trail', tweaks: 'Tweaks', difficulty: 'Difficulty',
      easy: 'EASY', normal: 'NORMAL', hard: 'HARD', age: 'Child age',
      color: 'Color cues', on: 'ON', off: 'OFF', reversals: 'b/d/p/q',
    },
    fr: {
      titleAcc: 'L’ABEILLE', titleRest: ' DIT',
      sub: 'regarde l’abeille — puis retape les lettres dans l’ordre',
      intro: "Une abeille passe de cellule en cellule et allume une lettre à chaque fois. <b>Tape les mêmes lettres dans le même ordre</b> sur le clavier. Chaque manche en ajoute une. Écoute — chaque lettre a son propre bourdonnement. Trois erreurs et l’essaim se repose.",
      start: 'JOUER', playAgain: 'REJOUER', note: "Jeu d'entraînement — pas un diagnostic.",
      tapWhat: 'Tape les lettres vues', hint: 'tape-les dans l’ordre sur le clavier',
      watch: 'REGARDE…', recall: 'À TOI !',
      score: 'Score', level: 'Niveau', best: 'Record', strikes: 'Erreurs',
      correct: 'PARFAIT !', wrong: 'RATÉ', tooSlow: 'TROP LENT',
      gameAcc: 'L’ESSAIM', gameRest: ' SE REPOSE', tooMany: 'trop d’erreurs !',
      maxLen: 'Meilleure série', tweaks: 'Réglages', difficulty: 'Difficulté',
      easy: 'FACILE', normal: 'NORMAL', hard: 'DIFFICILE', age: "Âge de l'enfant",
      color: 'Couleurs', on: 'OUI', off: 'NON', reversals: 'b/d/p/q',
    },
    es: {
      titleAcc: 'LA ABEJA', titleRest: ' DICE',
      sub: 'mira a la abeja — luego toca las letras en orden',
      intro: "Una abeja salta de celda en celda y enciende una letra cada vez. <b>Toca las mismas letras en el mismo orden</b> en el teclado. Cada ronda añade una más. Escucha — cada letra tiene su propio zumbido. Tres fallos y el enjambre descansa.",
      start: 'JUGAR', playAgain: 'JUGAR OTRA VEZ', note: 'Juego de práctica — no es un diagnóstico.',
      tapWhat: 'Toca las letras que viste', hint: 'tócalas en orden en el teclado',
      watch: 'MIRA…', recall: '¡TU TURNO!',
      score: 'Puntos', level: 'Nivel', best: 'Récord', strikes: 'Fallos',
      correct: '¡PERFECTO!', wrong: 'UPS', tooSlow: 'MUY LENTO',
      gameAcc: 'EL ENJAMBRE', gameRest: ' DESCANSA', tooMany: '¡demasiados fallos!',
      maxLen: 'Mejor serie', tweaks: 'Ajustes', difficulty: 'Dificultad',
      easy: 'FÁCIL', normal: 'NORMAL', hard: 'DIFÍCIL', age: 'Edad del niño',
      color: 'Colores', on: 'SÍ', off: 'NO', reversals: 'b/d/p/q',
    },
  };
  const T = STR[LANG];
  function applyStaticText() {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    document.getElementById('title-h1').innerHTML = `<span class="acc">${T.titleAcc}</span>${T.titleRest}`;
    set('title-sub', T.sub);
    document.getElementById('title-p').innerHTML = T.intro;
    set('start-btn', T.start); set('title-note', T.note);
    set('lcd-label', T.tapWhat); set('lcd-hint', T.hint);
    set('lbl-score', T.score); set('lbl-level', T.level); set('lbl-best', T.best); set('lbl-strikes', T.strikes);
    set('tw-title', T.tweaks); set('tw-diff', T.difficulty);
    set('tw-easy', T.easy); set('tw-normal', T.normal); set('tw-hard', T.hard);
    set('tw-age', T.age); set('tw-color', T.color); set('tw-color-on', T.on); set('tw-color-off', T.off);
  }

  const TWEAKS = /*EDITMODE-BEGIN*/{
    "difficulty": "normal",
    "age": "",
    "colorCues": false
  }/*EDITMODE-END*/;

  const rand = (min, max) => Math.random() * (max - min) + min;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const state = {
    phase: 'title',            // title | watch | input | resolve | level_clear | game_over
    score: 0,
    best: parseInt(localStorage.getItem('beebuzzsays_best') || '0', 10) || 0,
    level: 1,
    strikes: 0,
    maxStrikes: 3,
    seq: [],                   // [{letter, cell}]
    typed: [],                 // [letter]
    cells: [],                 // honeycomb cells: {q,r,x,y}
    keypad: [],                // tiles: {letter,x,y,w,h}
    activeLetters: [],
    radius: 2,
    hexSize: 40,
    watchIndex: -1, watchTimer: 0, flashCell: -1,
    inputTimer: 0,
    floaters: [], particles: [],
    shake: 0, shakeX: 0, shakeY: 0, elapsed: 0,
  };

  const metrics = newMetrics();
  function newMetrics() {
    return { rounds: 0, correct: 0, mirrorConfusions: 0, wrongTaps: 0, maxSpan: 0, spanAttempts: {} };
  }
  function recordSpan(len, ok) {
    const s = metrics.spanAttempts[len] || { ok: 0, fail: 0 };
    if (ok) { s.ok++; if (len > metrics.maxSpan) metrics.maxSpan = len; } else s.fail++;
    metrics.spanAttempts[len] = s;
  }

  // Layout + render + flow are added in later tasks. Stub so boot runs:
  function layoutBoard() {}
  function draw() {}
  function update() {}

  applyStaticText();
  updateHUD();

  function updateHUD() {
    document.getElementById('score').textContent = state.score;
    document.getElementById('level').textContent = state.level;
    document.getElementById('best').textContent = state.best;
    document.getElementById('strikes').textContent =
      '✕'.repeat(state.strikes) + '○'.repeat(Math.max(0, state.maxStrikes - state.strikes));
  }

  // Expose a read-only probe for scripted checks.
  window.__bbs = () => ({
    phase: state.phase, seq: state.seq.map(s => s.letter), typed: state.typed.slice(),
    span: state.seq.length, level: state.level, strikes: state.strikes,
  });

  resize();
  let lastTime = performance.now();
  function loop(now) {
    let dt = (now - lastTime) / 1000; lastTime = now; if (dt > 0.1) dt = 0.1;
    update(dt); draw(); requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) lastTime = performance.now() - 16; });
  requestAnimationFrame(loop);
})();
```

- [ ] **Step 2: Verify boot (manual + probe)**

Open `beebuzzsays-html5/index.html`. No console errors. Run in console:
```js
window.__bbs()
```
Expected: `{ phase: 'title', seq: [], typed: [], span: 0, level: 1, strikes: 0 }`. HUD shows Score 0 / Level 1 / Best 0 / Strikes ○○○.

- [ ] **Step 3: Commit**

```bash
git add beebuzzsays-html5/game.js
git commit -m "feat(beebuzzsays): game boot, i18n, state, probe"
```

---

## Task 9: Board layout + honeycomb & keypad rendering

**Files:**
- Modify: `beebuzzsays-html5/game.js`

- [ ] **Step 1: Replace the `layoutBoard`/`draw` stubs with real layout + render**

In `game.js`, replace the stub block:
```js
  function layoutBoard() {}
  function draw() {}
  function update() {}
```
with:
```js
  function colorOn() { return TWEAKS.colorCues === true || TWEAKS.colorCues === 'on'; }
  function letterColor(ch) { return colorOn() ? (C.LETTER_COLOR[ch] || '#ffe0a0') : '#f3d9a6'; }

  function layoutBoard() {
    state.radius = C.gridRadius(TWEAKS.difficulty, TWEAKS.age);
    state.activeLetters = C.keypadLetters(TWEAKS.difficulty);
    // Honeycomb sizing: fit the grid in the upper ~62% of the screen.
    const span = state.radius * 2 + 1;
    const avail = Math.min(W * 0.9, H * 0.62);
    state.hexSize = clamp(avail / (span * 1.6), 26, 64);
    const cx = W / 2, cy = H * 0.40;
    state.cells = C.axialCells(state.radius).map((c) => {
      const p = C.axialToPixel(c, state.hexSize);
      return { q: c.q, r: c.r, x: cx + p.x, y: cy + p.y };
    });
    // Keypad: a centered row (wraps to 2 rows if many letters) near the bottom.
    const letters = state.activeLetters;
    const perRow = letters.length <= 6 ? letters.length : Math.ceil(letters.length / 2);
    const tileW = clamp(W / (perRow + 1.5), 44, 78), tileH = tileW;
    const gap = tileW * 0.22;
    const rows = Math.ceil(letters.length / perRow);
    const baseY = H * 0.74;
    state.keypad = letters.map((ch, i) => {
      const row = Math.floor(i / perRow), col = i % perRow;
      const countThisRow = Math.min(perRow, letters.length - row * perRow);
      const rowW = countThisRow * tileW + (countThisRow - 1) * gap;
      const x0 = W / 2 - rowW / 2;
      return { letter: ch, x: x0 + col * (tileW + gap), y: baseY + row * (tileH + gap), w: tileW, h: tileH };
    });
    void rows;
  }

  function hexPath(cx, cy, size) {
    const pts = C.hexCorners(cx, cy, size);
    ctx.beginPath();
    pts.forEach((p, i) => { i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
    ctx.closePath();
  }

  function drawBg() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#f6b73c'); g.addColorStop(0.55, '#e89a2a'); g.addColorStop(1, '#caa05a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  function drawHoneycomb() {
    for (let i = 0; i < state.cells.length; i++) {
      const cell = state.cells[i];
      const isFlash = state.phase === 'watch' && state.flashCell === i;
      const letter = isFlash ? state.seq[state.watchIndex].letter : null;
      hexPath(cell.x, cell.y, state.hexSize * 0.94);
      ctx.fillStyle = isFlash ? (colorOn() ? letterColor(letter) : '#fff2c4') : '#caa44e';
      ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = '#7a531a'; ctx.stroke();
      // waxy inner ring
      hexPath(cell.x, cell.y, state.hexSize * 0.72);
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(122,83,26,0.35)'; ctx.stroke();
      if (isFlash) {
        ctx.fillStyle = colorOn() ? '#241500' : '#3a2410';
        ctx.font = `bold ${Math.round(state.hexSize * 1.0)}px "Lilita One", sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(letter, cell.x, cell.y + 2);
        drawBee(cell.x, cell.y - state.hexSize * 0.1, state.hexSize * 0.5);
      }
    }
  }

  function drawBee(x, y, s) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#2a1a05'; ctx.strokeStyle = '#2a1a05'; ctx.lineWidth = 2;
    // body
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.55, s * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffcf3a'; ctx.fill(); ctx.stroke();
    // stripes
    ctx.fillStyle = '#2a1a05';
    ctx.fillRect(-s * 0.12, -s * 0.4, s * 0.12, s * 0.8);
    ctx.fillRect(s * 0.12, -s * 0.35, s * 0.1, s * 0.7);
    // wings
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.ellipse(-s * 0.1, -s * 0.45, s * 0.3, s * 0.18, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawKeypad() {
    const active = state.phase === 'input';
    for (const t of state.keypad) {
      const r = 10;
      roundRect(t.x, t.y, t.w, t.h, r);
      ctx.fillStyle = colorOn() ? letterColor(t.letter) : '#fff2c4';
      ctx.globalAlpha = active ? 1 : 0.5; ctx.fill(); ctx.globalAlpha = 1;
      ctx.lineWidth = 3; ctx.strokeStyle = '#7a531a'; ctx.stroke();
      ctx.fillStyle = colorOn() ? '#241500' : '#3a2410';
      ctx.font = `bold ${Math.round(t.h * 0.6)}px "Lilita One", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.globalAlpha = active ? 1 : 0.5;
      ctx.fillText(t.letter, t.x + t.w / 2, t.y + t.h / 2 + 2);
      ctx.globalAlpha = 1;
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }

  function draw() {
    ctx.save(); ctx.translate(state.shakeX, state.shakeY);
    drawBg(); drawHoneycomb(); drawKeypad(); drawParticles(); drawFloaters();
    ctx.restore();
  }
  function drawParticles() {
    for (const p of state.particles) {
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1); ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); ctx.globalAlpha = 1;
    }
  }
  function drawFloaters() {
    for (const f of state.floaters) {
      const t = f.t / f.dur, a = 1 - t, sc = 1 + (1 - Math.min(1, t * 3)) * 0.4;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(f.x, f.y); ctx.scale(sc, sc);
      ctx.font = 'bold 44px "Lilita One", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 5; ctx.strokeStyle = '#3a2410'; ctx.strokeText(f.text, 0, 0);
      ctx.fillStyle = f.color; ctx.fillText(f.text, 0, 0); ctx.restore();
    }
  }

  function update(dt) {
    state.elapsed += dt;
    for (const f of state.floaters) { f.t += dt; f.y -= 30 * dt; }
    state.floaters = state.floaters.filter(f => f.t < f.dur);
    for (const p of state.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.gravity ?? 200) * dt; p.life -= dt; }
    state.particles = state.particles.filter(p => p.life > 0);
    if (state.shake > 0) { state.shake = Math.max(0, state.shake - dt * 3); state.shakeX = (Math.random() - 0.5) * state.shake * 12; state.shakeY = (Math.random() - 0.5) * state.shake * 12; }
    else { state.shakeX = state.shakeY = 0; }
    updatePhase(dt);
  }
  function updatePhase() {}  // replaced in Task 10
```

- [ ] **Step 2: Verify the board renders (manual)**

Open `beebuzzsays-html5/index.html`. Expected: an amber background with a honeycomb of hexes (19 by default) in the upper area and a dimmed row of keypad tiles (`b d p q m w n u`) near the bottom. No console errors. Run `window.BBSCore.axialCells(window.__bbs && 2).length` is not needed; instead check the page shows hexes.

- [ ] **Step 3: Commit**

```bash
git add beebuzzsays-html5/game.js
git commit -m "feat(beebuzzsays): honeycomb + keypad layout and rendering"
```

---

## Task 10: Flow — start, watch replay, input, resolve, scoring, game over, metrics

**Files:**
- Modify: `beebuzzsays-html5/game.js`

- [ ] **Step 1: Replace the `updatePhase` stub with the full flow + wire input/start**

In `game.js`, replace:
```js
  function updatePhase() {}  // replaced in Task 10
```
with the full flow:
```js
  // ----- timing helpers (scale with difficulty + age) -----
  function flashGap() {
    let g = 0.62;
    if (TWEAKS.difficulty === 'easy') g *= 1.4;
    if (TWEAKS.difficulty === 'hard') g *= 0.72;
    const a = parseInt(TWEAKS.age, 10); if (!Number.isNaN(a) && a <= 7) g *= 1.25;
    return g;
  }
  function inputBudget() {
    let s = 3.0;
    if (TWEAKS.difficulty === 'easy') s *= 1.5;
    if (TWEAKS.difficulty === 'hard') s *= 0.7;
    const a = parseInt(TWEAKS.age, 10); if (!Number.isNaN(a) && a <= 7) s *= 1.3;
    return s;
  }

  function startGame() {
    state.score = 0; state.level = 1; state.strikes = 0;
    Object.assign(metrics, newMetrics());
    state.seq = []; state.typed = [];
    layoutBoard();
    document.getElementById('overlay').classList.add('hidden');
    growAndWatch();
  }

  function growAndWatch() {
    const step = C.growTrail(state.seq, state.activeLetters, state.cells.length, Math.random);
    state.seq = state.seq.concat([step]);
    state.level = state.seq.length;
    updateHUD();
    beginWatch();
  }

  function beginWatch() {
    state.phase = 'watch'; state.typed = [];
    state.watchIndex = -1; state.flashCell = -1; state.watchTimer = 0.4;
    updateAnswerDisplay();
    showFloater(T.watch, '#3a2410', -H * 0.30);
  }

  function beginInput() {
    state.phase = 'input'; state.flashCell = -1;
    state.inputTimer = inputBudget();
    showFloater(T.recall, '#ffaa00', -H * 0.30);
  }

  function updatePhase(dt) {
    if (state.phase === 'watch') {
      state.watchTimer -= dt;
      if (state.watchTimer <= 0) {
        state.watchIndex++;
        if (state.watchIndex >= state.seq.length) { beginInput(); return; }
        const step = state.seq[state.watchIndex];
        state.flashCell = step.cell;
        window.MathArcadeAudio?.note(C.LETTER_FREQ[step.letter]);
        state.watchTimer = flashGap();
      } else if (state.watchTimer < flashGap() * 0.45) {
        state.flashCell = -1; // dark gap between flashes
      }
    } else if (state.phase === 'input') {
      state.inputTimer -= dt;
      if (state.inputTimer <= 0) registerMiss('slow');
    }
  }

  function pressLetter(ch) {
    if (state.phase !== 'input') return;
    window.MathArcadeAudio?.note(C.LETTER_FREQ[ch]); // always hear what you pressed
    const idx = state.typed.length;
    const res = C.checkTap(state.seq, idx, ch);
    if (!res.ok) {
      metrics.wrongTaps++;
      if (res.mirror) metrics.mirrorConfusions++;
      registerMiss('wrong');
      return;
    }
    state.typed.push(ch);
    state.inputTimer = inputBudget();
    updateAnswerDisplay();
    flashTile(ch, '#5cd97a');
    if (C.isComplete(state.seq, state.typed)) resolveCorrect();
  }

  function registerMiss(reason) {
    metrics.rounds++;
    recordSpan(state.seq.length, false);
    state.strikes++;
    state.shake = Math.min(0.5, state.shake + 0.3);
    window.MathArcadeAudio?.wrong();
    showFloater(reason === 'slow' ? T.tooSlow : T.wrong, '#ff5c7c', -H * 0.30);
    updateHUD();
    if (state.strikes >= state.maxStrikes) { gameOver(T.tooMany); return; }
    state.phase = 'level_clear';
    setTimeout(() => { if (state.phase === 'level_clear') beginWatch(); }, 1100); // retry SAME trail
  }

  function resolveCorrect() {
    metrics.rounds++; metrics.correct++;
    recordSpan(state.seq.length, true);
    const pts = 50 + state.seq.length * 20 + state.level * 10;
    state.score += pts;
    burst(W / 2, H * 0.40, '#ffd24d');
    showFloater(`${T.correct}  +${pts}`, '#5cd97a', -H * 0.30);
    window.MathArcadeAudio?.levelClear();
    updateHUD();
    state.phase = 'level_clear';
    setTimeout(() => { if (state.phase === 'level_clear') growAndWatch(); }, 1100);
  }

  function flashTile(ch, color) {
    const t = state.keypad.find(k => k.letter === ch); if (!t) return;
    burst(t.x + t.w / 2, t.y + t.h / 2, color);
  }

  function gameOver(reason) {
    state.phase = 'game_over';
    if (state.score > state.best) { state.best = state.score; localStorage.setItem('beebuzzsays_best', String(state.best)); }
    const summary = saveMetrics();
    window.MathArcadeAudio?.gameOver();
    const overlay = document.getElementById('overlay');
    overlay.querySelector('.card')?.remove();
    const card = document.createElement('div'); card.className = 'card';
    const revPct = summary.wrongTaps ? Math.round((summary.mirrorConfusions / summary.wrongTaps) * 100) : 0;
    card.innerHTML = `
      <h1><span class="acc">${T.gameAcc}</span>${T.gameRest}</h1>
      <div class="sub">${reason}</div>
      <div class="stats-row">
        <div class="stat-chip"><div class="stat-label">${T.score}</div><div class="stat-val">${state.score}</div></div>
        <div class="stat-chip hi"><div class="stat-label">${T.maxLen}</div><div class="stat-val">${summary.maxSpan}</div></div>
        <div class="stat-chip"><div class="stat-label">${T.best}</div><div class="stat-val">${state.best}</div></div>
      </div>
      <div class="stats-row">
        <div class="stat-chip"><div class="stat-label">${T.reversals}</div><div class="stat-val">${revPct}%</div></div>
      </div>
      <button class="big-btn" id="restart-btn">${T.playAgain}</button>
      <div class="note">${T.note}</div>`;
    overlay.appendChild(card); overlay.classList.remove('hidden');
    document.getElementById('restart-btn').addEventListener('click', startGame);
  }

  function saveMetrics() {
    const summary = {
      date: new Date().toISOString(), lang: LANG, age: TWEAKS.age || null,
      difficulty: TWEAKS.difficulty, colorCues: colorOn(),
      level: state.level, score: state.score,
      rounds: metrics.rounds, correct: metrics.correct, strikes: state.strikes,
      maxSpan: metrics.maxSpan, spanAttempts: metrics.spanAttempts,
      mirrorConfusions: metrics.mirrorConfusions, wrongTaps: metrics.wrongTaps,
      reversalRate: metrics.wrongTaps ? +(metrics.mirrorConfusions / metrics.wrongTaps).toFixed(3) : 0,
    };
    try {
      const key = 'dyslexiaScreening.beebuzzsays';
      const store = JSON.parse(localStorage.getItem(key) || '{"history":[]}');
      store.lastSession = summary;
      store.history = (store.history || []).concat([summary]).slice(-50);
      localStorage.setItem(key, JSON.stringify(store));
    } catch (e) { /* storage unavailable — game still playable */ }
    return summary;
  }
  window.DyslexiaScreening = window.DyslexiaScreening || {};
  window.DyslexiaScreening.beebuzzsays = () => {
    try { return JSON.parse(localStorage.getItem('dyslexiaScreening.beebuzzsays') || 'null'); }
    catch (e) { return null; }
  };

  function updateAnswerDisplay() {
    const el = document.getElementById('ans-val');
    if (!state.typed.length) { el.classList.add('empty'); el.innerHTML = '<span class="cursor">_</span>'; }
    else { el.classList.remove('empty'); el.innerHTML = `${state.typed.join(' ')}<span class="cursor">|</span>`; }
  }
  function showFloater(text, color, dy) { state.floaters.push({ x: W / 2, y: H * 0.5 + (dy || 0), text, color, t: 0, dur: 1.2 }); }
  function burst(x, y, color) {
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, sp = rand(120, 260);
      state.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: rand(0.5, 0.9), maxLife: 0.9, size: rand(3, 7), color: i % 2 ? color : '#fff2c4', gravity: 320 });
    }
  }

  // ----- input wiring -----
  function canvasPoint(e) {
    const r = canvas.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    return { x: cx, y: cy };
  }
  function hitKeypad(pt) {
    return state.keypad.find(t => pt.x >= t.x && pt.x <= t.x + t.w && pt.y >= t.y && pt.y <= t.y + t.h);
  }
  canvas.addEventListener('pointerdown', (e) => {
    if (state.phase === 'title' || state.phase === 'game_over') return;
    const tile = hitKeypad(canvasPoint(e));
    if (tile) { e.preventDefault(); pressLetter(tile.letter); }
  });
  window.addEventListener('keydown', (e) => {
    if (state.phase === 'title' || state.phase === 'game_over') {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startGame(); }
      return;
    }
    if (/^[a-zA-Z]$/.test(e.key)) {
      const ch = e.key.toLowerCase();
      if (state.activeLetters.includes(ch)) { e.preventDefault(); pressLetter(ch); }
    }
  });
  document.getElementById('start-btn').addEventListener('click', startGame);
```

- [ ] **Step 2: Verify the full loop (browser, scripted)**

Create a temporary verification with the playwright-mcp browser (or manually). Manual script in the page console after clicking START:
```js
// after START, wait for input phase, then auto-play the correct trail:
function autoplayOnce() {
  const s = window.__bbs();
  if (s.phase !== 'input') return 'not input yet: ' + s.phase;
  // tap the known sequence by dispatching keydown events for each letter
  s.seq.forEach(ch => window.dispatchEvent(new KeyboardEvent('keydown', { key: ch })));
  return window.__bbs();
}
```
Expected behavior:
- Click START → floater "WATCH…", bee flashes cells with tones, then "YOUR TURN!".
- Running `autoplayOnce()` during input → trail accepted, "PERFECT!", `span` grows by 1 next round.
- Tapping a wrong tile (click a tile not in `seq`) → red shake, Strikes increments, same trail replays.
- Three misses → "SWARM RESTS" card with Score / Best trail / b/dpq %.
- Console: `window.DyslexiaScreening.beebuzzsays()` returns a summary object with `mirrorConfusions`, `colorCues`, `difficulty`.

- [ ] **Step 3: Commit**

```bash
git add beebuzzsays-html5/game.js
git commit -m "feat(beebuzzsays): full flow — watch replay, keypad input, scoring, metrics, game over"
```

---

## Task 11: Tweaks wiring (difficulty + age + color cues) + edit-mode protocol

**Files:**
- Modify: `beebuzzsays-html5/game.js`

- [ ] **Step 1: Add tweaks setup before the final `resize()` boot call**

In `game.js`, just before the `resize();` boot line near the end, insert:
```js
  function setupTweaks() {
    const wire = (rowId, key, isToggle) => {
      const row = document.getElementById(rowId);
      if (!row) return;
      row.querySelectorAll('.opt').forEach(opt => {
        const v = opt.dataset.value;
        const cur = isToggle ? (colorOn() ? 'on' : 'off') : String(TWEAKS[key]);
        opt.classList.toggle('active', v === cur);
        opt.addEventListener('click', () => {
          if (isToggle) TWEAKS[key] = (v === 'on');
          else TWEAKS[key] = (TWEAKS[key] === v && key === 'age') ? '' : v;
          const now = isToggle ? (colorOn() ? 'on' : 'off') : String(TWEAKS[key]);
          row.querySelectorAll('.opt').forEach(o => o.classList.toggle('active', o.dataset.value === now));
          persistTweaks();
          layoutBoard();
        });
      });
    };
    wire('diff-row', 'difficulty', false);
    wire('age-row', 'age', false);
    wire('color-row', 'colorCues', true);
    document.getElementById('tweaks-close').addEventListener('click', () => { hideTweaks(); try { window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*'); } catch (e) {} });
    document.getElementById('gear-btn').addEventListener('click', () => {
      const open = document.getElementById('tweaks').classList.contains('open');
      if (open) { hideTweaks(); try { window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*'); } catch (e) {} } else showTweaks();
    });
  }
  function persistTweaks() { try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { ...TWEAKS } }, '*'); } catch (e) {} }
  function showTweaks() { document.getElementById('tweaks').classList.add('open'); }
  function hideTweaks() { document.getElementById('tweaks').classList.remove('open'); }
  window.addEventListener('message', (e) => {
    const d = e.data; if (!d || typeof d !== 'object') return;
    if (d.type === '__activate_edit_mode') showTweaks();
    if (d.type === '__deactivate_edit_mode') hideTweaks();
  });
  setupTweaks();
  try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch (e) {}
```

- [ ] **Step 2: Verify tweaks (manual)**

Open the page, click ⚙. Expected:
- Difficulty EASY → honeycomb shrinks to 7 hexes, keypad shows only `b d p q`.
- Difficulty HARD → keypad shows 11 letters (`b d p q m w n u a e o`).
- Color cues ON → keypad tiles + flashes become colored (b pink, d blue, …); OFF → uniform honey tiles.
- Age 6 or 7 → honeycomb stays 7 hexes even on NORMAL.
- Start a game after each change; layout reflects the tweak.

- [ ] **Step 3: Commit**

```bash
git add beebuzzsays-html5/game.js
git commit -m "feat(beebuzzsays): tweaks wiring (difficulty/age/color) + edit-mode protocol"
```

---

## Task 12: Hub card in root `index.html`

**Files:**
- Modify: `index.html` (root) — the `.card.* .art` CSS block (~line 261-265) and the cards grid (insert after the Recall Crates card, ~line 1313).

- [ ] **Step 1: Add the palette rule**

In root `index.html`, find:
```css
  .card.recallcrates .art  { background: radial-gradient(ellipse at center, #7a1230 0%, #4a0a1a 60%, #1c050a 100%); }
```
Add directly below it:
```css
  .card.beebuzzsays .art   { background: radial-gradient(ellipse at center, #f6b73c 0%, #c98a14 60%, #6e4a10 100%); }
```

- [ ] **Step 2: Add the hub card**

In root `index.html`, find the end of the Recall Crates card (the `</a>` that closes `<a class="card recallcrates" ...>`, just before `</div>` of the grid). Insert immediately after that `</a>`:
```html
    <!-- Bee Buzz Says -->
    <a class="card beebuzzsays" href="beebuzzsays-html5/index.html">
      <div class="art">
        <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="200" height="120" fill="none"/>
          <!-- honeycomb cluster -->
          <g stroke="#7a531a" stroke-width="2" fill="#ffd24d">
            <polygon points="100,30 118,40 118,60 100,70 82,60 82,40"/>
            <polygon points="64,50 82,60 82,80 64,90 46,80 46,60"/>
            <polygon points="136,50 154,60 154,80 136,90 118,80 118,60"/>
            <polygon points="100,70 118,80 118,100 100,110 82,100 82,80" fill="#fff2c4"/>
          </g>
          <!-- letter on the lit cell -->
          <text x="100" y="98" text-anchor="middle" font-family="Lilita One" font-size="20" fill="#3a2410">b</text>
          <!-- bee -->
          <g transform="translate(100,50)">
            <ellipse cx="0" cy="0" rx="11" ry="8" fill="#ffcf3a" stroke="#2a1a05" stroke-width="2"/>
            <rect x="-3" y="-8" width="3" height="16" fill="#2a1a05"/>
            <rect x="3" y="-7" width="2.4" height="14" fill="#2a1a05"/>
            <ellipse cx="-3" cy="-9" rx="7" ry="4" fill="rgba(255,255,255,0.75)" transform="rotate(-25 -3 -9)"/>
          </g>
        </svg>
      </div>
      <div class="body">
        <div class="tagline">Sequence memory</div>
        <h2>Bee Buzz Says</h2>
        <p class="desc">Watch the bee buzz a trail of letters across the honeycomb, then tap them back in order on the keypad. Each letter has its own buzz; the trail grows every round. A playful memory + b/d/p/q drill.</p>
        <div class="footer">
          <div class="chips"><span class="chip compat-mobile">mobile ok</span><span class="chip">tap</span><span class="chip">memory</span><span class="chip">puzzle</span></div>
          <div class="play-cta">PLAY ▶</div>
        </div>
      </div>
    </a>
```

- [ ] **Step 3: Verify the hub (manual)**

Open root `index.html`. Expected: a "Bee Buzz Says" card with amber honeycomb art appears next to Recall Crates; clicking it opens `beebuzzsays-html5/index.html`.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(hub): add Bee Buzz Says card"
```

---

## Task 13: Full acceptance pass + regression check

**Files:** none (verification only)

- [ ] **Step 1: Run the unit suite**

Run: `node --test "beebuzzsays-html5/test/*.test.js"`
Expected: all tests PASS (10 tests across 10 cases).

- [ ] **Step 2: Acceptance checklist (browser)**

Open `beebuzzsays-html5/index.html` and confirm each:
- [ ] Title → START enters `watch`; bee replays a length-1 trail with a tone.
- [ ] Correct keypad entry grows the trail (`window.__bbs().span` increments; HUD Level updates).
- [ ] Wrong tap → red shake + Strikes increments + the SAME trail replays.
- [ ] 3 strikes → "SWARM RESTS" card with Score / Best trail / b/dpq %.
- [ ] The bee's flash tone for a letter equals that letter's keypad-tap tone (tap a tile during input and compare to its earlier flash).
- [ ] Color cues OFF (default): uniform honey tiles. ON: per-letter colors on flashes + tiles; b/d, p/q visibly different.
- [ ] Difficulty changes keypad size + grid; age 6–7 keeps the small grid.
- [ ] `?lang=fr` and `?lang=es` localize the title, HUD labels, floaters, and game-over card.
- [ ] Mute 🔊 silences the letter tones too (proves `note()` honors master/mute).
- [ ] Touch: on a narrow viewport, tapping tiles registers.
- [ ] `window.DyslexiaScreening.beebuzzsays()` returns a summary with `mirrorConfusions`, `reversalRate`, `colorCues`, `difficulty`.

- [ ] **Step 3: Regression — other games still load**

Open `recallcrates-html5/index.html` and one math game; confirm no console errors (the `audio.js` change is additive). Run `window.MathArcadeAudio.note` is a function there too.

- [ ] **Step 4: Final commit (docs/status)**

```bash
git add -A
git commit -m "test(beebuzzsays): acceptance pass — bee buzz says complete" --allow-empty
```

---

## Self-Review Notes (spec coverage)

- Cumulative Simon (grow by 1, replay whole trail) → Tasks 3, 10 (`growTrail`, `growAndWatch`, `resolveCorrect`).
- Letter keypad input, scales with difficulty, both pair members present → Tasks 2, 9, 11.
- Wrong tap → strike + replay same trail; 3 strikes → over → Task 10 (`registerMiss`).
- Frozen letter→tone, same on flash + tap; additive `audio.js note()` → Tasks 1, 6, 10.
- Optional letter→color toggle, default OFF, frozen palette, recorded in metrics → Tasks 1, 9, 10, 11.
- Honeycomb 7/19 by difficulty+age, flat-top geometry → Tasks 2, 5, 9.
- Metrics (`dyslexiaScreening.beebuzzsays`), best score, probes → Tasks 8, 10.
- EN/FR/ES, TWEAKS edit-mode, hub card → Tasks 8, 11, 12.
