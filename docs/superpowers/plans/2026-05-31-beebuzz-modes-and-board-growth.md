# Bee Buzz Says — Board-Growth Levels & Multiplayer Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Bee Buzz Says into a board-growth game (unique cells per board, grow a honeycomb ring on clear) with three hot-seat modes: 1P Standard, 2P Co-op relay, 2P Versus challenge.

**Architecture:** Keep the existing round engine (watch → input → resolve) in `game.js`. Add a `session` object on top that owns `mode`, a `players[]` array (per-player score/strikes/metrics), whose turn is active, the board radius, and a shared RNG seed. Pure trail/board logic lives in `core.js` and is unit-tested with `node --test`.

**Tech Stack:** Vanilla ES (IIFE) + Canvas 2D, no build step. `core.js` is UMD (browser global `BBSCore` + Node `require`). Tests: `node:test` + `node:assert`. Spec: `docs/superpowers/specs/2026-05-31-beebuzz-modes-and-board-growth-design.md`.

**Run tests (Node v23 needs the glob form — see project memory):**
```bash
cd beebuzzsays-html5 && export PATH="/usr/local/bin:$PATH" && node --test 'test/**/*.test.js'
```

**Manual browser verify (canvas; no headless E2E):** `open beebuzzsays-html5/index.html`. The read-only probe `window.__bbs()` is extended in Task 4 to expose session state for inspection in the devtools console.

---

## Task 1: Core — unique-cell trail growth + `boardFull`

**Files:**
- Modify: `beebuzzsays-html5/core.js` (`growTrail` at lines 56-64; add `boardFull`; export at line 105)
- Test: `beebuzzsays-html5/test/core.test.js` (rewrite the `growTrail` test at lines 46-62; add new tests)

- [ ] **Step 1: Rewrite the existing `growTrail` test and add new failing tests**

Replace the whole test block at `test/core.test.js:46-62` with:

```javascript
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
  assert.equal(C.boardFull(seq.concat([{letter:'d',cell:0}]), 7), true);
});

test('growTrail is deterministic for a given seed (Versus fairness)', () => {
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
```

Also extend the radius-count test at `test/core.test.js:79-83` by adding this line inside it (after the radius-2 assert):

```javascript
  assert.equal(C.axialCells(3).length, 37);
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd beebuzzsays-html5 && export PATH="/usr/local/bin:$PATH" && node --test 'test/**/*.test.js'`
Expected: FAIL — `growTrail` still allows cell reuse / never returns null, and `C.boardFull is not a function`.

- [ ] **Step 3: Implement unique-cell `growTrail` + `boardFull` in `core.js`**

Replace `growTrail` (lines 56-64) with:

```javascript
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
    let cell;
    do { cell = Math.floor(r() * cellCount); } while (used.has(cell));
    return { letter, cell };
  }

  function boardFull(seq, cellCount) {
    return seq.length >= cellCount;
  }
```

Add `boardFull` to the export object at line 105 (insert after `growTrail,`):

```javascript
  return { LETTER_FREQ, LETTER_COLOR, PAIRS, MIRROR, KEYPAD_SETS, keypadLetters, gridRadius, makeRng, growTrail, boardFull, checkTap, isComplete, axialCells, axialToPixel, hexCorners };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd beebuzzsays-html5 && export PATH="/usr/local/bin:$PATH" && node --test 'test/**/*.test.js'`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
cd "/Users/guillermoblanco/Library/CloudStorage/GoogleDrive-guillermoeblancoh@gmail.com/Mon Drive/retro_games"
export PATH="/usr/local/bin:$PATH"
git add beebuzzsays-html5/core.js beebuzzsays-html5/test/core.test.js
git commit -m "feat(beebuzzsays): unique-cell growTrail + boardFull (board-growth core)"
```

---

## Task 2: Session object + route solo scoring through the active player

**Files:**
- Modify: `beebuzzsays-html5/game.js` (`state` at lines 95-113; `startGame` 280-287; `resolveCorrect` 360-371; `registerMiss` 347-358; `gameOver` 378-402; `updateHUD` 472-478)

This task preserves current 1P behaviour but moves `score`/`strikes` into a `session.players[]` array so later modes can have per-player tallies. No board-growth yet.

- [ ] **Step 1: Add the `session` object and helpers after `state` (insert after line 113, before `const metrics = newMetrics();`)**

```javascript
  // ===== Session: owns mode, players, board radius, RNG (layered over `state`) =====
  const session = {
    mode: 'solo',          // 'solo' | 'coop' | 'versus'
    seed: 0,               // shared per match (versus); set at startGame
    boardRadius: 1,        // starts at 1; +1 per board cleared
    players: [],           // [{ id, score, strikes, maxSpan, metrics }]
    active: 0,             // index of the player whose taps count now
    versusRun: 0,          // versus: which player's full run is in progress (0,1)
  };
  function activePlayer() { return session.players[session.active]; }
  function makePlayer(id) { return { id, score: 0, strikes: 0, maxSpan: 0, metrics: newMetrics() }; }
  function newRng() { return session.mode === 'versus' ? C.makeRng(session.seed) : Math.random; }
```

- [ ] **Step 2: Point the `metrics` references at the active player**

The module-level `const metrics = newMetrics();` (line 115) and `recordSpan` (lines 119-123) currently use one global `metrics`. Replace line 115 and the `recordSpan` body so they use the active player's metrics:

Replace line 115 `const metrics = newMetrics();` with:

```javascript
  function metrics() { return activePlayer().metrics; }
```

Replace `recordSpan` (lines 119-123) with:

```javascript
  function recordSpan(len, ok) {
    const m = metrics();
    const s = m.spanAttempts[len] || { ok: 0, fail: 0 };
    if (ok) { s.ok++; if (len > m.maxSpan) m.maxSpan = len; } else s.fail++;
    m.spanAttempts[len] = s;
  }
```

Then replace every remaining bare `metrics.X` with `metrics().X`:
- `pressLetter` (lines 336-337): `metrics.wrongTaps++;` → `metrics().wrongTaps++;` and `metrics.mirrorConfusions++;` → `metrics().mirrorConfusions++;`
- `registerMiss` (line 348): `metrics.rounds++;` → `metrics().rounds++;`
- `resolveCorrect` (line 361): `metrics.rounds++; metrics.correct++;` → `metrics().rounds++; metrics().correct++;`
- `Object.assign(metrics, newMetrics());` in `startGame` (line 282): delete this line (players are freshly created in Step 3).

- [ ] **Step 3: Rewrite `startGame` (lines 280-287) to build the session**

```javascript
  function startGame() {
    session.players = session.mode === 'solo' ? [makePlayer(1)] : [makePlayer(1), makePlayer(2)];
    session.active = 0;
    session.versusRun = 0;
    session.boardRadius = 1;
    session.seed = (Math.floor(Math.random() * 0x7fffffff)) || 1;
    state.rng = newRng();
    state.seq = []; state.typed = [];
    layoutBoard();
    document.getElementById('overlay').classList.add('hidden');
    growAndWatch();
  }
```

- [ ] **Step 4: Route scoring/strikes through `activePlayer()`**

In `resolveCorrect` (lines 360-371) replace the score lines:

```javascript
    const pts = 50 + state.seq.length * 20 + session.boardRadius * 10;
    activePlayer().score += pts;
```

In `registerMiss` (lines 347-358) replace `state.strikes++;` (line 350) and the strike check (line 355):

```javascript
    activePlayer().strikes++;
```
```javascript
    if (activePlayer().strikes >= state.maxStrikes) { gameOver(T.tooMany); return; }
```

In `gameOver` (lines 378-402) replace the best-score block (lines 380) and `saveMetrics()` usage so it reads the active player. Replace line 380:

```javascript
    const p = activePlayer();
    if (p.score > state.best) { state.best = p.score; localStorage.setItem('beebuzzsays_best', String(state.best)); }
```

And in the card HTML inside `gameOver`, replace `${state.score}` (line 391) with `${p.score}` and `${summary.maxSpan}` stays (Task 7 revisits `saveMetrics`). Leave the rest of `gameOver` for now.

- [ ] **Step 5: Update `updateHUD` (lines 472-478) to read the active player**

```javascript
  function updateHUD() {
    const p = activePlayer() || { score: 0, strikes: 0 };
    document.getElementById('score').textContent = p.score;
    document.getElementById('level').textContent = session.boardRadius;
    document.getElementById('best').textContent = state.best;
    document.getElementById('strikes').textContent =
      '✕'.repeat(p.strikes) + '○'.repeat(Math.max(0, state.maxStrikes - p.strikes));
  }
```

Note: `updateHUD` is also called at module load (line 470) before any player exists — the `|| { score: 0, strikes: 0 }` guard handles that.

- [ ] **Step 6: Manual verify solo still works**

Run: `cd beebuzzsays-html5 && export PATH="/usr/local/bin:$PATH" && node --test 'test/**/*.test.js'` → still PASS (core untouched).
Then `open beebuzzsays-html5/index.html`, click START, play a few rounds: score increments, strikes show, 3 misses → game over card with the score. Confirm no console errors.

- [ ] **Step 7: Commit**

```bash
cd "/Users/guillermoblanco/Library/CloudStorage/GoogleDrive-guillermoeblancoh@gmail.com/Mon Drive/retro_games"
export PATH="/usr/local/bin:$PATH"
git add beebuzzsays-html5/game.js
git commit -m "refactor(beebuzzsays): session object + per-player score/strikes (solo unchanged)"
```

---

## Task 3: Board-growth levels (radius from session, unique cells, ring grow)

**Files:**
- Modify: `beebuzzsays-html5/game.js` (`layoutBoard` 128-129; `growAndWatch` 289-295; `resolveCorrect` 360-371; add `boardClear`)

- [ ] **Step 1: Drive the grid radius from the session**

In `layoutBoard` replace line 129:

```javascript
    state.radius = session.boardRadius;
```

(Removes the `C.gridRadius(...)` call so every mode/difficulty starts at radius 1; `state.activeLetters` on line 130 stays.)

- [ ] **Step 2: Make `growAndWatch` (lines 289-295) handle a full board**

```javascript
  function growAndWatch() {
    const step = C.growTrail(state.seq, state.activeLetters, state.cells.length, state.rng);
    if (step === null) { boardClear(); return; }
    state.seq = state.seq.concat([step]);
    state.level = state.seq.length;
    updateHUD();
    beginWatch();
  }
```

- [ ] **Step 3: In `resolveCorrect`, clear the board when it is full**

In `resolveCorrect` (lines 360-371), replace the final transition (lines 369-370):

```javascript
    state.phase = 'level_clear';
    if (C.boardFull(state.seq, state.cells.length)) {
      setTimeout(() => { if (state.phase === 'level_clear') boardClear(); }, 1100);
    } else {
      setTimeout(() => { if (state.phase === 'level_clear') growAndWatch(); }, 1100);
    }
```

- [ ] **Step 4: Add `boardClear` (insert immediately after `resolveCorrect`, before `flashTile`)**

```javascript
  // Whole honeycomb recalled — celebrate, grow one ring, reset the trail.
  function boardClear() {
    burst(W / 2, H * 0.40, '#ffd24d');
    showFloater(T.boardClear, '#5cd97a', -H * 0.30);
    window.MathArcadeAudio?.levelClear();
    state.phase = 'level_clear';
    setTimeout(() => {
      if (state.phase !== 'level_clear') return;
      session.boardRadius++;
      state.seq = []; state.typed = [];
      layoutBoard();
      updateHUD();
      growAndWatch();
    }, 1300);
  }
```

- [ ] **Step 5: Add the `boardClear` string to all three locales**

In the `STR` table (lines 28-71) add a `boardClear` key to each locale object:
- `en`: `boardClear: 'HIVE COMPLETE!',`
- `fr`: `boardClear: 'RUCHE COMPLÈTE !',`
- `es`: `boardClear: '¡PANAL COMPLETO!',`

- [ ] **Step 6: Manual verify board growth**

`open beebuzzsays-html5/index.html`, set difficulty EASY isn't required — every mode now starts at radius 1 (7 cells). Play and intentionally clear the 7-cell board (recall all 7 in order). Expected: "HIVE COMPLETE!" floater, then the honeycomb visibly grows to 19 cells and a fresh 1-length trail begins. HUD "Level" shows 2. In the devtools console, `__bbs()` (after Task 4 extends it) or inspect that the grid enlarged. No console errors.

- [ ] **Step 7: Commit**

```bash
cd "/Users/guillermoblanco/Library/CloudStorage/GoogleDrive-guillermoeblancoh@gmail.com/Mon Drive/retro_games"
export PATH="/usr/local/bin:$PATH"
git add beebuzzsays-html5/game.js
git commit -m "feat(beebuzzsays): board-growth levels — fill the comb, grow a ring (1P)"
```

---

## Task 4: Title-screen mode selector + localized strings + probe

**Files:**
- Modify: `beebuzzsays-html5/index.html` (title card at lines 153-159)
- Modify: `beebuzzsays-html5/game.js` (`STR` 28-71; `applyStaticText` 73-84; add mode-selector wiring; `__bbs` probe 481-484)

- [ ] **Step 1: Add the mode selector to the title card (`index.html`)**

Inside `#title-card`, between the `<div class="sub">` (line 155) and `<p id="title-p">` (line 156), insert:

```html
      <div class="tweak-row" style="margin: 14px auto 4px; max-width: 320px;">
        <div class="lbl" style="justify-content:center;"><span id="lbl-mode">Players</span></div>
        <div class="opts" id="mode-row" style="justify-content:center;">
          <div class="opt active" data-value="solo" id="mode-solo">1 PLAYER</div>
          <div class="opt" data-value="coop" id="mode-coop">2P CO-OP</div>
          <div class="opt" data-value="versus" id="mode-versus">2P VERSUS</div>
        </div>
      </div>
```

(Reuses the existing `.tweak-row`/`.opts`/`.opt` styles already defined in `index.html`.)

- [ ] **Step 2: Add mode-selector strings to all three locales (`STR`, lines 28-71)**

Add these keys to each locale object:
- `en`: `players: 'Players', modeSolo: '1 PLAYER', modeCoop: '2P CO-OP', modeVersus: '2P VERSUS', yourTurn: 'YOUR TURN', team: 'Team', pass: 'PASS TO', tap: 'CONTINUE', wins: 'WINS!', draw: "IT'S A DRAW!", toBeat: 'to beat', player: 'Player',`
- `fr`: `players: 'Joueurs', modeSolo: '1 JOUEUR', modeCoop: '2J COOP', modeVersus: '2J DUEL', yourTurn: 'À TOI', team: 'Équipe', pass: 'AU TOUR DE', tap: 'CONTINUER', wins: 'GAGNE !', draw: 'ÉGALITÉ !', toBeat: 'à battre', player: 'Joueur',`
- `es`: `players: 'Jugadores', modeSolo: '1 JUGADOR', modeCoop: '2J COOP', modeVersus: '2J DUELO', yourTurn: 'TU TURNO', team: 'Equipo', pass: 'TURNO DE', tap: 'CONTINUAR', wins: '¡GANA!', draw: '¡EMPATE!', toBeat: 'a batir', player: 'Jugador',`

- [ ] **Step 3: Localize the mode labels in `applyStaticText` (lines 73-84)**

Add inside `applyStaticText`, before its closing brace:

```javascript
    set('lbl-mode', T.players);
    set('mode-solo', T.modeSolo); set('mode-coop', T.modeCoop); set('mode-versus', T.modeVersus);
```

- [ ] **Step 4: Wire the mode selector (add a `setupModeSelector` call near `setupTweaks()` at line 521)**

Add this function just before the `setupTweaks();` call (line 521) and call it:

```javascript
  function setupModeSelector() {
    const row = document.getElementById('mode-row');
    if (!row) return;
    row.querySelectorAll('.opt').forEach((opt) => {
      opt.addEventListener('click', () => {
        session.mode = opt.dataset.value;
        row.querySelectorAll('.opt').forEach((o) => o.classList.toggle('active', o === opt));
      });
    });
  }
  setupModeSelector();
```

- [ ] **Step 5: Extend the `__bbs` probe (lines 481-484) to expose session state**

```javascript
  window.__bbs = () => ({
    phase: state.phase, seq: state.seq.map(s => s.letter), typed: state.typed.slice(),
    span: state.seq.length, level: session.boardRadius, cells: state.cells.length,
    mode: session.mode, active: session.active, versusRun: session.versusRun,
    players: session.players.map(p => ({ id: p.id, score: p.score, strikes: p.strikes })),
  });
```

- [ ] **Step 6: Manual verify**

`open beebuzzsays-html5/index.html`. The title card shows a Players row with 1 PLAYER / 2P CO-OP / 2P VERSUS; clicking toggles the active highlight. Switch language via `?lang=fr` / `?lang=es` and confirm the labels translate. Picking 1 PLAYER + START still plays solo. In console, `__bbs().mode` reflects the selection.

- [ ] **Step 7: Commit**

```bash
cd "/Users/guillermoblanco/Library/CloudStorage/GoogleDrive-guillermoeblancoh@gmail.com/Mon Drive/retro_games"
export PATH="/usr/local/bin:$PATH"
git add beebuzzsays-html5/index.html beebuzzsays-html5/game.js
git commit -m "feat(beebuzzsays): title-screen mode selector + EN/FR/ES strings + probe"
```

---

## Task 5: 2P Co-op relay

**Files:**
- Modify: `beebuzzsays-html5/game.js` (`beginWatch` 297-302 or `beginInput` 304-308 for the turn banner; `resolveCorrect`/`boardClear`/`registerMiss` transitions; `gameOver` 378-402 for the team card)

Co-op: both players share one trail, one strike pool (3) and one combined score, alternating who inputs each round. A miss is a team strike and retries with the same player (mirrors solo). Game over at 3 team strikes.

- [ ] **Step 1: Alternate the active player each round in `growAndWatch`**

In `growAndWatch` (now from Task 3), set the active player from the round number for co-op. Replace the body so the active player alternates by trail length:

```javascript
  function growAndWatch() {
    const step = C.growTrail(state.seq, state.activeLetters, state.cells.length, state.rng);
    if (step === null) { boardClear(); return; }
    state.seq = state.seq.concat([step]);
    state.level = state.seq.length;
    if (session.mode === 'coop') session.active = (state.seq.length - 1) % 2; // P1 round1, P2 round2, ...
    updateHUD();
    beginWatch();
  }
```

(For `solo`/`versus`, `session.active` stays as set by start/run logic.)

- [ ] **Step 2: Show a turn banner in co-op at the start of input**

In `beginInput` (lines 304-308), after `showFloater(T.recall, ...)`, add a co-op turn banner:

```javascript
    if (session.mode === 'coop') {
      showFloater(`${T.player} ${activePlayer().id} — ${T.yourTurn}`, '#ffd24d', -H * 0.40);
    }
```

- [ ] **Step 3: Make the co-op combined score read naturally**

Co-op shows the *team* total. Update `updateHUD` (from Task 2) so co-op sums both players' scores and shows shared strikes:

```javascript
  function updateHUD() {
    const sumScore = session.players.reduce((a, p) => a + p.score, 0);
    const p = activePlayer() || { score: 0, strikes: 0 };
    const score = session.mode === 'coop' ? sumScore : p.score;
    const strikes = session.mode === 'coop'
      ? session.players.reduce((a, x) => Math.max(a, x.strikes), 0)
      : p.strikes;
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = session.boardRadius;
    document.getElementById('best').textContent = state.best;
    document.getElementById('strikes').textContent =
      '✕'.repeat(strikes) + '○'.repeat(Math.max(0, state.maxStrikes - strikes));
  }
```

- [ ] **Step 4: Make co-op strikes a shared pool in `registerMiss`**

In `registerMiss`, increment a shared strike so either player's miss counts once for the team. Replace `activePlayer().strikes++;` (from Task 2) with:

```javascript
    if (session.mode === 'coop') {
      session.players.forEach((pl) => { pl.strikes++; }); // shared pool: keep both in lockstep
    } else {
      activePlayer().strikes++;
    }
```

And the strike-out check becomes:

```javascript
    const strikeCount = session.mode === 'coop' ? session.players[0].strikes : activePlayer().strikes;
    if (strikeCount >= state.maxStrikes) { gameOver(T.tooMany); return; }
```

- [ ] **Step 5: Team result card in `gameOver`**

In `gameOver` (lines 378-402), branch the card for co-op. After computing `const p = activePlayer();` (Task 2), add at the top of the function body a co-op short-circuit that builds a team card:

```javascript
    if (session.mode === 'coop') {
      const team = session.players.reduce((a, x) => a + x.score, 0);
      const span = Math.max(...session.players.map((x) => x.metrics.maxSpan), state.seq.length);
      if (team > state.best) { state.best = team; localStorage.setItem('beebuzzsays_best', String(state.best)); }
      window.MathArcadeAudio?.gameOver();
      const overlay = document.getElementById('overlay');
      overlay.querySelector('.card')?.remove();
      const card = document.createElement('div'); card.className = 'card';
      card.innerHTML = `
        <h1><span class="acc">${T.gameAcc}</span>${T.gameRest}</h1>
        <div class="sub">${reason}</div>
        <div class="stats-row">
          <div class="stat-chip hi"><div class="stat-label">${T.team} ${T.score}</div><div class="stat-val">${team}</div></div>
          <div class="stat-chip"><div class="stat-label">${T.maxLen}</div><div class="stat-val">${span}</div></div>
          <div class="stat-chip"><div class="stat-label">${T.level}</div><div class="stat-val">${session.boardRadius}</div></div>
        </div>
        <button class="big-btn" id="restart-btn">${T.playAgain}</button>
        <div class="note">${T.note}</div>`;
      overlay.appendChild(card); overlay.classList.remove('hidden');
      document.getElementById('restart-btn').addEventListener('click', startGame);
      state.phase = 'game_over';
      return;
    }
```

- [ ] **Step 6: Manual verify co-op**

`open beebuzzsays-html5/index.html`, pick 2P CO-OP, START. Expected: round 1 banner "Player 1 — YOUR TURN", round 2 "Player 2 — YOUR TURN", alternating. HUD score is the team total. Three misses (any mix of players) → team card showing Team Score + best trail. `__bbs().active` flips 0/1 each round.

- [ ] **Step 7: Commit**

```bash
cd "/Users/guillermoblanco/Library/CloudStorage/GoogleDrive-guillermoeblancoh@gmail.com/Mon Drive/retro_games"
export PATH="/usr/local/bin:$PATH"
git add beebuzzsays-html5/game.js
git commit -m "feat(beebuzzsays): 2P co-op relay mode (shared trail, alternating turns, team card)"
```

---

## Task 6: 2P Versus challenge (seeded dual runs)

**Files:**
- Modify: `beebuzzsays-html5/game.js` (`gameOver` 378-402 to hand off to player 2 / show scoreboard; add `startVersusRun` + a pass interstitial)

Versus: P1 plays a full run to 3 strikes on `session.seed`; then P2 plays the same seed; compare scores.

- [ ] **Step 1: Add a pass interstitial + per-run starter (insert near `startGame`)**

```javascript
  // Versus: begin a fresh run for session.players[session.versusRun] on the shared seed.
  function startVersusRun() {
    session.active = session.versusRun;
    session.boardRadius = 1;
    state.rng = C.makeRng(session.seed); // identical board sequence for both players
    state.seq = []; state.typed = [];
    layoutBoard();
    document.getElementById('overlay').classList.add('hidden');
    growAndWatch();
  }

  function showVersusPass() {
    const overlay = document.getElementById('overlay');
    overlay.querySelector('.card')?.remove();
    const next = session.players[session.versusRun];
    const beat = session.players[0].score;
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML = `
      <h1>${T.pass} <span class="acc">${T.player} ${next.id}</span></h1>
      <div class="sub">${T.player} 1: ${beat} ${T.toBeat}</div>
      <button class="big-btn" id="pass-btn">${T.tap}</button>`;
    overlay.appendChild(card); overlay.classList.remove('hidden');
    document.getElementById('pass-btn').addEventListener('click', () => { startVersusRun(); });
    state.phase = 'title'; // freeze input until CONTINUE
  }
```

- [ ] **Step 2: Make `startGame` launch versus via the seeded runner**

At the end of `startGame` (Task 2), branch so versus uses the seeded run. Replace the tail (`state.rng = newRng(); ... growAndWatch();`) with:

```javascript
    if (session.mode === 'versus') { session.versusRun = 0; startVersusRun(); return; }
    state.rng = newRng();
    state.seq = []; state.typed = [];
    layoutBoard();
    document.getElementById('overlay').classList.add('hidden');
    growAndWatch();
```

- [ ] **Step 3: In `gameOver`, hand off after P1, show scoreboard after P2 (versus branch)**

Add a versus short-circuit at the top of `gameOver` (after the co-op branch from Task 5):

```javascript
    if (session.mode === 'versus') {
      if (session.versusRun === 0) {
        window.MathArcadeAudio?.levelClear?.();
        session.versusRun = 1;
        showVersusPass();
        return;
      }
      // both runs done — scoreboard
      const [a, b] = session.players;
      const winner = a.score === b.score
        ? (a.metrics.maxSpan === b.metrics.maxSpan ? 0 : (a.metrics.maxSpan > b.metrics.maxSpan ? 1 : 2))
        : (a.score > b.score ? 1 : 2);
      const best = Math.max(a.score, b.score);
      if (best > state.best) { state.best = best; localStorage.setItem('beebuzzsays_best', String(state.best)); }
      window.MathArcadeAudio?.gameOver();
      const overlay = document.getElementById('overlay');
      overlay.querySelector('.card')?.remove();
      const headline = winner === 0 ? T.draw : `${T.player} ${winner} ${T.wins}`;
      const card = document.createElement('div'); card.className = 'card';
      card.innerHTML = `
        <h1><span class="acc">${headline}</span></h1>
        <div class="stats-row">
          <div class="stat-chip ${winner === 1 ? 'hi' : ''}"><div class="stat-label">${T.player} 1</div><div class="stat-val">${a.score}</div></div>
          <div class="stat-chip ${winner === 2 ? 'hi' : ''}"><div class="stat-label">${T.player} 2</div><div class="stat-val">${b.score}</div></div>
        </div>
        <button class="big-btn" id="restart-btn">${T.playAgain}</button>
        <div class="note">${T.note}</div>`;
      overlay.appendChild(card); overlay.classList.remove('hidden');
      document.getElementById('restart-btn').addEventListener('click', startGame);
      state.phase = 'game_over';
      return;
    }
```

- [ ] **Step 4: Manual verify versus fairness**

`open beebuzzsays-html5/index.html`, pick 2P VERSUS, START. P1 plays to 3 strikes → "PASS TO Player 2 / Player 1: NNN to beat" → CONTINUE. Confirm P2 sees the **same** bee path/letters as P1 did (watch the first few flashes — identical cells/letters). After P2's 3 strikes, scoreboard shows both scores with the winner highlighted; equal scores with equal max-span → "IT'S A DRAW!". `__bbs().versusRun` is 1 during P2's run.

- [ ] **Step 5: Commit**

```bash
cd "/Users/guillermoblanco/Library/CloudStorage/GoogleDrive-guillermoeblancoh@gmail.com/Mon Drive/retro_games"
export PATH="/usr/local/bin:$PATH"
git add beebuzzsays-html5/game.js
git commit -m "feat(beebuzzsays): 2P versus challenge (seeded dual runs + scoreboard)"
```

---

## Task 7: Screening-data gating + final pass

**Files:**
- Modify: `beebuzzsays-html5/game.js` (`saveMetrics` 404-422; its call in `gameOver` 381)

Only solo runs should feed the dyslexia-screening store; co-op/versus are tagged and excluded.

- [ ] **Step 1: Guard `saveMetrics` so only solo writes the screening history**

In `saveMetrics` (lines 404-422), make the summary read the active player's metrics and tag the mode; skip the `localStorage` write for non-solo. Replace the function body's summary construction and the try-block guard:

Change the summary object (lines 405-413) to pull from `activePlayer()`:

```javascript
    const m = activePlayer().metrics;
    const summary = {
      date: new Date().toISOString(), lang: LANG, age: TWEAKS.age || null,
      difficulty: TWEAKS.difficulty, colorCues: colorOn(), mode: session.mode,
      level: session.boardRadius, score: activePlayer().score,
      rounds: m.rounds, correct: m.correct, strikes: activePlayer().strikes,
      maxSpan: m.maxSpan, spanAttempts: m.spanAttempts,
      mirrorConfusions: m.mirrorConfusions, wrongTaps: m.wrongTaps,
      reversalRate: m.wrongTaps ? +(m.mirrorConfusions / m.wrongTaps).toFixed(3) : 0,
    };
```

Wrap the persistence so only solo writes history (replace the `try { ... }` block at lines 414-420):

```javascript
    if (session.mode === 'solo') {
      try {
        const key = 'dyslexiaScreening.beebuzzsays';
        const store = JSON.parse(localStorage.getItem(key) || '{"history":[]}');
        store.lastSession = summary;
        store.history = (store.history || []).concat([summary]).slice(-50);
        localStorage.setItem(key, JSON.stringify(store));
      } catch (e) { /* storage unavailable — game still playable */ }
    }
    return summary;
```

Note: in the versus/co-op branches of `gameOver` (Tasks 5-6) `saveMetrics()` is not called; only the original solo path (line 381) calls it. Confirm the solo path still calls `const summary = saveMetrics();` and uses `summary.maxSpan` in its card.

- [ ] **Step 2: Full regression + manual sweep**

Run: `cd beebuzzsays-html5 && export PATH="/usr/local/bin:$PATH" && node --test 'test/**/*.test.js'` → PASS.
Manual: play all three modes once end-to-end. Verify in console after a solo game: `JSON.parse(localStorage['dyslexiaScreening.beebuzzsays']).lastSession.mode === 'solo'`. After a co-op or versus game, confirm no new entry with `mode !== 'solo'` was appended (history length unchanged).

- [ ] **Step 3: Commit**

```bash
cd "/Users/guillermoblanco/Library/CloudStorage/GoogleDrive-guillermoeblancoh@gmail.com/Mon Drive/retro_games"
export PATH="/usr/local/bin:$PATH"
git add beebuzzsays-html5/game.js
git commit -m "feat(beebuzzsays): keep screening data solo-only; tag mode in metrics"
```

- [ ] **Step 4: Push the branch**

```bash
cd "/Users/guillermoblanco/Library/CloudStorage/GoogleDrive-guillermoeblancoh@gmail.com/Mon Drive/retro_games"
export PATH="/usr/local/bin:$PATH"
git push origin main
```

---

## Notes for the implementer

- **Immutability:** `state.seq` is rebuilt with `concat` (new array) rather than `push` — keep that pattern.
- **Phase guard:** all deferred transitions check `state.phase === 'level_clear'` before firing so a game-over mid-timeout cannot resurrect a round. Preserve these guards.
- **No new files:** everything lives in the existing `core.js` / `game.js` / `index.html` / `test/core.test.js`. Keep `core.js` DOM-free so tests stay fast.
- **Difficulty/age now affect timing only** (`flashGap`, `inputBudget`), not board size — `C.gridRadius` is no longer called from `game.js` but stays exported (still unit-tested).
- **`innerHTML` on result cards** is safe here and matches the existing `gameOver` pattern: every interpolated value is an integer (`score`, `boardRadius`, `id`) or a static locale string from the `STR` table — no user-supplied text. Do not introduce free-text/name entry into these templates without switching to `textContent`/sanitization.
