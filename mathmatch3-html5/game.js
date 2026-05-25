// =====================================================================
// MATH MATCH-3
// Swap adjacent tiles. Clear lines of 3+ in a row/column whose values
// all satisfy the active rule. Cascades drop new tiles from above.
// =====================================================================

(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  const COLS = 8, ROWS = 8;
  const HINT_MOVE_COST = 1;
  const CUE_MARK_COST = 25;
  function getMetrics() {
    const availW = W - 80;
    const availH = H - 240;
    const cell = Math.max(36, Math.min(72, Math.min(availW / COLS, availH / ROWS)));
    const gridW = cell * COLS;
    const gridH = cell * ROWS;
    const x0 = (W - gridW) / 2;
    const y0 = Math.max(140, (H - gridH) / 2 + 20);
    return { cell, gridW, gridH, x0, y0 };
  }

  const TWEAKS = /*EDITMODE-BEGIN*/{
    "difficulty": "normal",
    "minLine": 3
  }/*EDITMODE-END*/;

  function isPrime(n) {
    if (n < 2) return false;
    if (n < 4) return true;
    if (n % 2 === 0) return false;
    for (let i = 3; i * i <= n; i += 2) if (n % i === 0) return false;
    return true;
  }
  // Rules: each has a label, test(value), and gen() biased toward valid values.
  const RULES = [
    { label: 'EVEN NUMBERS',    test: (n) => n % 2 === 0,                color: '#5cd97a', gen: () => randInt(1, 9) * 2 },
    { label: 'ODD NUMBERS',     test: (n) => n % 2 === 1,                color: '#ff8a3d', gen: () => randInt(0, 8) * 2 + 1 },
    { label: 'MULTIPLES of 3',  test: (n) => n > 0 && n % 3 === 0,       color: '#5cd9ff', gen: () => randInt(1, 8) * 3 },
    { label: 'PRIMES',          test: (n) => isPrime(n),                  color: '#ffd24d', gen: () => choice([2, 3, 5, 7, 11, 13, 17, 19, 23]) },
    { label: 'VALUES \u2265 7',  test: (n) => n >= 7,                      color: '#e36ce0', gen: () => randInt(7, 18) },
    { label: 'MULTIPLES of 5',  test: (n) => n > 0 && n % 5 === 0,       color: '#ff5c7c', gen: () => randInt(1, 6) * 5 },
  ];
  function getRule(level) { return RULES[(level - 1) % RULES.length]; }

  // ===== State =====
  const state = {
    phase: 'title',
    score: 0,
    best: parseInt(localStorage.getItem('mathmatch3_best') || '0', 10) || 0,
    level: 1,
    moves: 20,
    levelTarget: 500,
    levelProgress: 0,
    rule: RULES[0],
    grid: [],                  // grid[r][c] = { value, falling, fallT, fallFromY, removing, removeT }
    selected: null,            // { c, r }
    swapAnim: null,            // { a, b, t, dur, back }
    busy: false,               // true during cascades/animations
    elapsed: 0,
    paused: false,
    floaters: [],
    particles: [],
    hint: null,                 // { a, b, t, dur }
    shake: 0, shakeX: 0, shakeY: 0,
    comboMul: 1,
  };

  const rand = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  // ===== Grid =====
  function makeTile(value) {
    return {
      value,
      falling: false, fallT: 0, fallFromY: 0,
      removing: false, removeT: 0,
      bornT: 0,
      marked: false,
    };
  }
  function pickTileValue(biasMatch = true) {
    // 50–60% chance to spawn a value matching the rule, rest random.
    const matchProb = biasMatch ? (TWEAKS.difficulty === 'easy' ? 0.65 : TWEAKS.difficulty === 'hard' ? 0.4 : 0.55) : 0;
    if (Math.random() < matchProb) return state.rule.gen();
    let v;
    let safety = 0;
    do { v = randInt(1, 30); } while (state.rule.test(v) && safety++ < 30);
    return v;
  }
  function newGrid() {
    let g;
    let outer = 0;
    do {
      g = [];
      for (let r = 0; r < ROWS; r++) {
        g.push([]);
        for (let c = 0; c < COLS; c++) g[r].push(makeTile(pickTileValue()));
      }
      // Break any pre-existing matches by replacing ONLY ONE cell per run
      // (the middle one) with a non-matching tile. Preserves overall match density.
      let safety = 0;
      let matches;
      while ((matches = findMatches(g)).length && safety++ < 60) {
        for (const m of matches) {
          const mid = m.cells[Math.floor(m.cells.length / 2)];
          g[mid.r][mid.c] = makeTile(pickTileValue(false));
        }
      }
      outer++;
      // Re-roll the whole board if it has no possible swap that creates a match.
    } while (!findPossibleMove(g) && outer < 100);
    if (!findPossibleMove(g)) seedGuaranteedMove(g);
    return g;
  }

  function findPossibleMove(g) {
    if (!state.rule) return null;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        // Try right and down only — covers all adjacent pairs without double-counting.
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
          const r2 = r + dr, c2 = c + dc;
          if (r2 >= ROWS || c2 >= COLS) continue;
          // Swap
          const a = g[r][c], b = g[r2][c2];
          g[r][c] = b; g[r2][c2] = a;
          const matches = findMatches(g);
          const found = matches.some(m => m.cells.some(cell =>
            (cell.r === r && cell.c === c) || (cell.r === r2 && cell.c === c2)
          ));
          // Restore
          g[r][c] = a; g[r2][c2] = b;
          if (found) return { a: { r, c }, b: { r: r2, c: c2 } };
        }
      }
    }
    return null;
  }

  function hasPossibleMove(g) {
    return Boolean(findPossibleMove(g));
  }

  function seedGuaranteedMove(g) {
    const row = Math.min(3, ROWS - 2);
    const start = TWEAKS.minLine === 4 ? 1 : 2;
    const end = start + TWEAKS.minLine - 1;
    for (let c = Math.max(0, start - 1); c <= Math.min(COLS - 1, end + 1); c++) {
      g[row][c] = makeTile(pickTileValue(false));
      g[row + 1][c] = makeTile(pickTileValue(false));
    }
    for (let r = Math.max(0, row - 1); r <= Math.min(ROWS - 1, row + TWEAKS.minLine); r++) {
      if (r !== row + 1) g[r][end] = makeTile(pickTileValue(false));
    }
    for (let c = start; c < end; c++) g[row][c] = makeTile(state.rule.gen());
    g[row][end] = makeTile(pickTileValue(false));
    g[row + 1][end] = makeTile(state.rule.gen());
  }

  // Shuffle existing tile values in place until a playable board exists. Used after
  // cascades settle if the player has been stranded with no useful adjacent swap.
  function shuffleBoardForPlayability() {
    clearCueMarks();
    const values = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (state.grid[r][c]) values.push(state.grid[r][c].value);
    }
    let safety = 0;
    do {
      // Fisher–Yates
      for (let i = values.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [values[i], values[j]] = [values[j], values[i]];
      }
      let k = 0;
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        if (state.grid[r][c]) state.grid[r][c].value = values[k++];
      }
      // Break any matches the shuffle accidentally created.
      let inner = 0;
      let ms;
      while ((ms = findMatches(state.grid)).length && inner++ < 30) {
        for (const m of ms) {
          const mid = m.cells[Math.floor(m.cells.length / 2)];
          state.grid[mid.r][mid.c].value = pickTileValue(false);
        }
      }
      safety++;
    } while (!hasPossibleMove(state.grid) && safety < 40);
    if (!hasPossibleMove(state.grid)) {
      state.grid = newGrid();
      showFloaterCenter('NEW NUMBERS!', '#5cd9ff');
    } else {
      showFloaterCenter('SHUFFLE!', '#5cd9ff');
    }
    state.hint = null;
  }

  function findMatches(g) {
    const rule = state.rule;
    const minLen = TWEAKS.minLine;
    const matches = [];
    // Rows
    for (let r = 0; r < ROWS; r++) {
      let run = [];
      for (let c = 0; c < COLS; c++) {
        const t = g[r][c];
        if (t && !t.removing && rule.test(t.value)) {
          run.push({ r, c });
        } else {
          if (run.length >= minLen) matches.push({ cells: run, dir: 'row' });
          run = [];
        }
      }
      if (run.length >= minLen) matches.push({ cells: run, dir: 'row' });
    }
    // Cols
    for (let c = 0; c < COLS; c++) {
      let run = [];
      for (let r = 0; r < ROWS; r++) {
        const t = g[r][c];
        if (t && !t.removing && rule.test(t.value)) {
          run.push({ r, c });
        } else {
          if (run.length >= minLen) matches.push({ cells: run, dir: 'col' });
          run = [];
        }
      }
      if (run.length >= minLen) matches.push({ cells: run, dir: 'col' });
    }
    return matches;
  }

  // ===== Input =====
  function pickCellAt(x, y) {
    const m = getMetrics();
    const c = Math.floor((x - m.x0) / m.cell);
    const r = Math.floor((y - m.y0) / m.cell);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return null;
    return { c, r };
  }
  canvas.addEventListener('mousedown', handleClick);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    handleClick({ clientX: t.clientX, clientY: t.clientY, preventDefault: () => e.preventDefault() });
  }, { passive: false });
  function handleClick(e) {
    if (state.phase !== 'playing' || state.busy || state.paused) return;
    e.preventDefault();
    const hit = pickCellAt(e.clientX, e.clientY);
    if (!hit) return;
    if (e.button === 2 || e.ctrlKey) {
      toggleCueMark(hit);
      return;
    }
    state.hint = null;
    if (!state.selected) {
      state.selected = hit;
      return;
    }
    const a = state.selected;
    const b = hit;
    const adjacent = (Math.abs(a.c - b.c) + Math.abs(a.r - b.r)) === 1;
    if (a.c === b.c && a.r === b.r) {
      state.selected = null;
      return;
    }
    if (!adjacent) {
      // Switch selection
      state.selected = hit;
      return;
    }
    // Start swap animation
    state.swapAnim = { a, b, t: 0, dur: 0.18, back: false };
    state.busy = true;
    state.selected = null;
  }

  function toggleCueMark(cell) {
    state.hint = null;
    state.selected = null;
    const tile = state.grid[cell.r]?.[cell.c];
    if (!tile) return;
    if (tile.marked) {
      tile.marked = false;
      return;
    }
    tile.marked = true;
    state.score = Math.max(0, state.score - CUE_MARK_COST);
    showFloater(cell.c, cell.r, `-${CUE_MARK_COST}`, '#ff5c7c');
    updateHUD();
  }

  function clearCueMarks() {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (state.grid[r]?.[c]) state.grid[r][c].marked = false;
    }
  }

  // ===== Loop =====
  let lastTime = performance.now();
  function loop(now) {
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.1) dt = 0.1;
    if (state.phase === 'playing' && !state.paused) update(dt);
    else updateIdle(dt);
    draw();
    requestAnimationFrame(loop);
  }
  function updateIdle(dt) { state.elapsed += dt * 0.5; }

  function update(dt) {
    state.elapsed += dt;

    if (state.swapAnim) {
      state.swapAnim.t += dt;
      if (state.swapAnim.t >= state.swapAnim.dur) {
        // Swap completed
        const { a, b, back } = state.swapAnim;
        swapCells(a, b);
        state.swapAnim = null;
        if (!back) {
          // Check for matches
          const matches = findMatches(state.grid);
          if (matches.length === 0) {
            // No match — start reverse swap
            state.swapAnim = { a: b, b: a, t: 0, dur: 0.18, back: true };
          } else {
            // Consume the move; process cascades
            state.moves--;
            state.comboMul = 1;
            processMatches(matches);
          }
        } else {
          state.busy = false;
          if (!hasPossibleMove(state.grid)) shuffleBoardForPlayability();
        }
      }
    }

    // Animate tile fall + remove timers
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = state.grid[r][c];
        if (!t) continue;
        t.bornT += dt;
        if (t.falling) {
          t.fallT += dt;
          if (t.fallT >= 0.22) {
            t.falling = false;
            t.fallT = 0;
          }
        }
        if (t.removing) {
          t.removeT += dt;
          if (t.removeT > 0.4) {
            // Replace with nullish so gravity step will fill
            state.grid[r][c] = null;
          }
        }
      }
    }

    // After a removal pass, apply gravity + refill (delayed for animation)
    if (state.busy && state.grid.flat().some(t => t === null)) {
      applyGravityAndRefill();
      // Re-check for cascades after a short beat
      setTimeout(() => {
        if (state.phase !== 'playing') return;
        const next = findMatches(state.grid);
        if (next.length) {
          state.comboMul = Math.min(5, state.comboMul + 1);
          processMatches(next);
        } else {
          state.busy = false;
          // If the player has been stranded with no useful swap, reshuffle.
          if (!hasPossibleMove(state.grid)) {
            shuffleBoardForPlayability();
          }
          checkLevelProgress();
        }
      }, 280);
    }

    for (const f of state.floaters) { f.t += dt; f.y -= 40 * dt; }
    state.floaters = state.floaters.filter(f => f.t < f.dur);
    if (state.hint) {
      state.hint.t += dt;
      if (state.hint.t >= state.hint.dur) state.hint = null;
    }
    for (const p of state.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.gravity ?? 220) * dt; p.life -= dt;
    }
    state.particles = state.particles.filter(p => p.life > 0);
    if (state.shake > 0) {
      state.shake = Math.max(0, state.shake - dt * 3);
      state.shakeX = (Math.random() - 0.5) * state.shake * 10;
      state.shakeY = (Math.random() - 0.5) * state.shake * 10;
    } else { state.shakeX = state.shakeY = 0; }

    // Out of moves?
    if (state.moves <= 0 && !state.busy && !state.swapAnim) {
      if (state.levelProgress >= state.levelTarget) {
        // Already cleared, just advance
        advanceLevel();
      } else {
        gameOver('out of moves!');
      }
    }
    updateHUD();
  }

  function swapCells(a, b) {
    const tmp = state.grid[a.r][a.c];
    state.grid[a.r][a.c] = state.grid[b.r][b.c];
    state.grid[b.r][b.c] = tmp;
  }

  function processMatches(matches) {
    // Collect all unique cells
    const cellSet = new Set();
    let totalValue = 0;
    let totalCount = 0;
    for (const m of matches) {
      for (const cell of m.cells) {
        const k = `${cell.r},${cell.c}`;
        if (cellSet.has(k)) continue;
        cellSet.add(k);
        const t = state.grid[cell.r][cell.c];
        if (t && !t.removing) {
          t.marked = false;
          t.removing = true;
          t.removeT = 0;
          totalValue += t.value;
          totalCount++;
          burstAt(cell.c, cell.r);
        }
      }
    }
    const pts = Math.floor((totalValue + totalCount * 10) * state.comboMul);
    state.score += pts;
    state.levelProgress += pts;
    const cx = matches.length ? matches[0].cells[0].c : 4;
    const cy = matches.length ? matches[0].cells[0].r : 4;
    const tag = state.comboMul > 1 ? `+${pts}  \u00d7${state.comboMul}!` : `+${pts}`;
    showFloater(cx, cy, tag, state.rule.color);
    state.shake = Math.min(0.3, state.shake + 0.15);
    state.busy = true;
  }

  function applyGravityAndRefill() {
    for (let c = 0; c < COLS; c++) {
      // Collect non-null tiles, top to bottom
      const stack = [];
      for (let r = ROWS - 1; r >= 0; r--) {
        if (state.grid[r][c]) stack.push(state.grid[r][c]);
      }
      // Fill from bottom up with kept tiles
      let r = ROWS - 1;
      for (const t of stack) {
        if (state.grid[r][c] !== t) {
          state.grid[r][c] = t;
          t.falling = true;
          t.fallT = 0;
        }
        r--;
      }
      // Refill remaining with new tiles
      while (r >= 0) {
        const t = makeTile(pickTileValue());
        t.falling = true;
        t.fallT = 0;
        state.grid[r][c] = t;
        r--;
      }
    }
  }

  function checkLevelProgress() {
    if (state.levelProgress >= state.levelTarget) {
      advanceLevel();
    }
  }
  function advanceLevel() {
    const bonus = 200 + state.level * 100;
    state.score += bonus;
    showFloaterCenter(`LEVEL ${state.level} CLEAR  +${bonus}`, '#ffd24d');
    state.level++;
    startLevel();
  }

  function startLevel() {
    state.rule = getRule(state.level);
    state.moves = 18 + state.level;
    state.levelTarget = 400 + state.level * 200;
    state.levelProgress = 0;
    state.grid = newGrid();
    state.selected = null;
    state.swapAnim = null;
    state.busy = false;
    state.hint = null;
    state.comboMul = 1;
    updateHUD();
    updateRuleHUD();
    showFloaterCenter(`LEVEL ${state.level}: ${state.rule.label}`, '#ffd24d');
  }

  function startGame() {
    state.phase = 'playing';
    state.score = 0;
    state.level = 1;
    startLevel();
    document.getElementById('overlay').classList.add('hidden');
  }
  function gameOver(reason) {
    state.phase = 'game_over';
    if (state.score > state.best) {
      state.best = state.score;
      localStorage.setItem('mathmatch3_best', String(state.best));
    }
    state.shake = Math.min(0.6, state.shake + 0.4);
    showFloaterCenter(reason, '#ff5c7c');
    const overlay = document.getElementById('overlay');
    overlay.querySelector('.card').remove();
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h1><span class="acc">GAME</span> OVER</h1>
      <div class="sub">${reason}</div>
      <div class="stats-row">
        <div class="stat-chip"><div class="stat-label">Score</div><div class="stat-val">${state.score}</div></div>
        <div class="stat-chip"><div class="stat-label">Level</div><div class="stat-val">${state.level}</div></div>
        <div class="stat-chip hi"><div class="stat-label">Best</div><div class="stat-val">${state.best}</div></div>
      </div>
      <button class="big-btn" id="restart-btn">PLAY AGAIN</button>
    `;
    overlay.appendChild(card);
    overlay.classList.remove('hidden');
    document.getElementById('restart-btn').addEventListener('click', startGame);
  }
  document.getElementById('start-btn').addEventListener('click', startGame);
  document.getElementById('hint-btn').addEventListener('click', useHint);

  window.addEventListener('keydown', (e) => {
    if (state.phase === 'title' || state.phase === 'game_over') {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startGame(); return; }
    }
    if (e.key === 'p' || e.key === 'P') { e.preventDefault(); state.paused = !state.paused; }
    if (e.key === 'h' || e.key === 'H') { e.preventDefault(); useHint(); }
  });

  function useHint() {
    if (state.phase !== 'playing' || state.busy || state.paused || state.moves <= 0) return;
    const move = findPossibleMove(state.grid);
    if (!move) {
      shuffleBoardForPlayability();
      return;
    }
    state.moves = Math.max(0, state.moves - HINT_MOVE_COST);
    state.selected = null;
    state.hint = { ...move, t: 0, dur: 1.8 };
    showFloaterCenter(`HINT  -${HINT_MOVE_COST} MOVE`, '#ffd24d');
    updateHUD();
  }

  function burstAt(c, r) {
    const m = getMetrics();
    const x = m.x0 + (c + 0.5) * m.cell;
    const y = m.y0 + (r + 0.5) * m.cell;
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rand(120, 280);
      state.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
        life: rand(0.4, 0.8), maxLife: 0.8, size: rand(3, 7),
        color: choice([state.rule.color, '#fff']),
        gravity: 250,
      });
    }
  }
  function showFloater(c, r, text, color) {
    const m = getMetrics();
    const x = m.x0 + (c + 0.5) * m.cell;
    const y = m.y0 + (r + 0.5) * m.cell;
    state.floaters.push({ x, y, text, color, t: 0, dur: 1.0, big: false });
  }
  function showFloaterCenter(text, color) {
    state.floaters.push({ x: W / 2, y: H * 0.42, text, color, t: 0, dur: 1.4, big: true });
  }

  // ===== HUD =====
  function updateHUD() {
    document.getElementById('score').textContent = state.score;
    document.getElementById('level').textContent = state.level;
    document.getElementById('moves').textContent = state.moves;
    document.getElementById('progress-text').textContent =
      `${state.levelProgress} / ${state.levelTarget}`;
  }
  function updateRuleHUD() {
    document.getElementById('rule-text').textContent =
      `${TWEAKS.minLine}+ ${state.rule.label}`;
  }

  // ===== Drawing =====
  function draw() {
    ctx.save();
    ctx.translate(state.shakeX, state.shakeY);
    drawBg();
    drawBoardFrame();
    drawTiles();
    drawHint();
    drawSelected();
    drawParticles();
    drawFloaters();
    if (state.paused) drawPaused();
    ctx.restore();
  }
  function drawBg() {
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) / 1.4);
    g.addColorStop(0, '#26204a');
    g.addColorStop(0.6, '#1a1428');
    g.addColorStop(1, '#0f0820');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // Stars
    for (let i = 0; i < 50; i++) {
      const sx = (i * 9973) % W;
      const sy = (i * 7919) % (H * 0.85);
      const tw = (Math.sin(state.elapsed * 1.5 + i * 0.6) + 1) * 0.5;
      ctx.globalAlpha = 0.2 + tw * 0.35;
      ctx.fillStyle = '#fff';
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }
    ctx.globalAlpha = 1;
  }
  function drawBoardFrame() {
    const m = getMetrics();
    ctx.fillStyle = '#1a1428';
    ctx.fillRect(m.x0 - 8, m.y0 - 8, m.gridW + 16, m.gridH + 16);
    ctx.strokeStyle = state.rule.color;
    ctx.lineWidth = 4;
    ctx.strokeRect(m.x0 - 8, m.y0 - 8, m.gridW + 16, m.gridH + 16);
    // Checker base
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        ctx.fillStyle = ((r + c) % 2 === 0) ? '#231a3a' : '#1c1530';
        ctx.fillRect(m.x0 + c * m.cell, m.y0 + r * m.cell, m.cell, m.cell);
      }
    }
  }
  function drawTiles() {
    const m = getMetrics();
    const swap = state.swapAnim;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = state.grid[r][c];
        if (!t) continue;
        let cx = m.x0 + (c + 0.5) * m.cell;
        let cy = m.y0 + (r + 0.5) * m.cell;
        // Swap animation offset
        if (swap) {
          let other = null;
          if (swap.a.r === r && swap.a.c === c) other = swap.b;
          else if (swap.b.r === r && swap.b.c === c) other = swap.a;
          if (other) {
            const tt = Math.min(1, swap.t / swap.dur);
            const e = easeOut(tt);
            const ox = m.x0 + (other.c + 0.5) * m.cell;
            const oy = m.y0 + (other.r + 0.5) * m.cell;
            cx = lerp(cx, ox, e);
            cy = lerp(cy, oy, e);
          }
        }
        // Fall animation: tile starts above its destination and slides down
        if (t.falling) {
          const ft = Math.min(1, t.fallT / 0.22);
          const e = easeOut(ft);
          cy = lerp(cy - m.cell * 1.2, cy, e);
        }
        drawTile(cx, cy, m.cell, t, r, c);
      }
    }
  }
  function drawTile(cx, cy, size, t, r, c) {
    const inset = size * 0.08;
    const rectS = size - inset * 2;
    let alpha = 1;
    if (t.removing) {
      const rt = Math.min(1, t.removeT / 0.4);
      alpha = 1 - rt;
      const scale = 1 + rt * 0.3;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;
      ctx.translate(-cx, -cy);
    }
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    roundRect(cx - rectS / 2 + 2, cy - rectS / 2 + 3, rectS, rectS, size * 0.18);
    ctx.fill();
    // Body
    const body = '#8a83b0';
    const dark = '#3e3858';
    const grd = ctx.createLinearGradient(cx, cy - rectS / 2, cx, cy + rectS / 2);
    grd.addColorStop(0, body);
    grd.addColorStop(1, dark);
    ctx.fillStyle = grd;
    roundRect(cx - rectS / 2, cy - rectS / 2, rectS, rectS, size * 0.18);
    ctx.fill();
    ctx.strokeStyle = '#0f0820';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Glossy highlight on top
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    roundRect(cx - rectS / 2 + 4, cy - rectS / 2 + 3, rectS - 8, size * 0.18, size * 0.1);
    ctx.fill();
    // Value
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#0f0820';
    ctx.lineWidth = 4;
    ctx.font = `bold ${Math.round(size * 0.45)}px "Lilita One", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText(String(t.value), cx, cy + 2);
    ctx.fillText(String(t.value), cx, cy + 2);
    if (t.marked) drawCueFrame(cx, cy, size);
    if (t.removing) {
      ctx.restore();
    }
  }
  function drawCueFrame(cx, cy, size) {
    const inset = size * 0.08;
    const rectS = size - inset * 2;
    const pad = size * 0.04;
    const radius = Math.max(7, size * 0.16);
    ctx.strokeStyle = '#0f0820';
    ctx.lineWidth = 7;
    roundRect(cx - rectS / 2 + pad, cy - rectS / 2 + pad, rectS - pad * 2, rectS - pad * 2, radius);
    ctx.stroke();
    ctx.strokeStyle = '#ffd24d';
    ctx.lineWidth = 4;
    roundRect(cx - rectS / 2 + pad, cy - rectS / 2 + pad, rectS - pad * 2, rectS - pad * 2, radius);
    ctx.stroke();
  }
  function drawHint() {
    if (!state.hint) return;
    const m = getMetrics();
    const pulse = (Math.sin(state.elapsed * 12) + 1) * 0.5;
    const alpha = Math.max(0, 1 - state.hint.t / state.hint.dur);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = `rgba(255, 210, 77, ${0.75 + pulse * 0.25})`;
    ctx.lineWidth = 5;
    ctx.setLineDash([8, 6]);
    for (const cell of [state.hint.a, state.hint.b]) {
      const x = m.x0 + cell.c * m.cell;
      const y = m.y0 + cell.r * m.cell;
      roundRect(x + 4, y + 4, m.cell - 8, m.cell - 8, 8);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    const ax = m.x0 + (state.hint.a.c + 0.5) * m.cell;
    const ay = m.y0 + (state.hint.a.r + 0.5) * m.cell;
    const bx = m.x0 + (state.hint.b.c + 0.5) * m.cell;
    const by = m.y0 + (state.hint.b.r + 0.5) * m.cell;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.restore();
  }
  function drawSelected() {
    if (!state.selected) return;
    const m = getMetrics();
    const { c, r } = state.selected;
    const x = m.x0 + c * m.cell;
    const y = m.y0 + r * m.cell;
    const pulse = (Math.sin(state.elapsed * 6) + 1) * 0.5;
    ctx.strokeStyle = `rgba(255, 210, 77, ${0.7 + pulse * 0.3})`;
    ctx.lineWidth = 4;
    roundRect(x + 3, y + 3, m.cell - 6, m.cell - 6, 8);
    ctx.stroke();
  }
  function drawParticles() {
    for (const p of state.particles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.globalAlpha = 1;
    }
  }
  function drawFloaters() {
    for (const f of state.floaters) {
      const t = f.t / f.dur; const a = 1 - t;
      const sc = f.big ? 1 + (1 - Math.min(1, t * 3)) * 0.4 : 1;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(f.x, f.y); ctx.scale(sc, sc);
      ctx.font = f.big ? 'bold 44px "Lilita One", sans-serif' : 'bold 22px "Lilita One", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = f.big ? 5 : 3;
      ctx.strokeStyle = '#0f0820';
      ctx.strokeText(f.text, 0, 0);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, 0, 0);
      ctx.restore();
    }
  }
  function drawPaused() {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H);
    ctx.font = 'bold 80px "Lilita One", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 6; ctx.strokeStyle = '#0f0820';
    ctx.strokeText('PAUSED', W / 2, H / 2);
    ctx.fillStyle = '#f4ecff'; ctx.fillText('PAUSED', W / 2, H / 2);
  }
  function roundRect(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }

  // ===== Tweaks =====
  function setupTweaks() {
    const setRow = (id, key, onChange) => {
      const row = document.getElementById(id);
      row.querySelectorAll('.opt').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.value === String(TWEAKS[key]));
        opt.addEventListener('click', () => {
          TWEAKS[key] = isNaN(parseInt(opt.dataset.value)) ? opt.dataset.value : parseInt(opt.dataset.value);
          row.querySelectorAll('.opt').forEach(o => o.classList.toggle('active', o.dataset.value === String(TWEAKS[key])));
          if (onChange) onChange();
          persistTweaks();
        });
      });
    };
    setRow('diff-row', 'difficulty');
    setRow('min-row', 'minLine', () => updateRuleHUD());
    document.getElementById('tweaks-close').addEventListener('click', () => {
      hideTweaks();
      try { window.parent.postMessage({type: '__edit_mode_dismissed'}, '*'); } catch(e) {}
    });
    document.getElementById('gear-btn').addEventListener('click', () => {
      const open = document.getElementById('tweaks').classList.contains('open');
      if (open) { hideTweaks(); try { window.parent.postMessage({type: '__edit_mode_dismissed'}, '*'); } catch(e) {} }
      else showTweaks();
    });
  }
  function persistTweaks() {
    try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { ...TWEAKS } }, '*'); } catch(e) {}
  }
  function showTweaks() { document.getElementById('tweaks').classList.add('open'); }
  function hideTweaks() { document.getElementById('tweaks').classList.remove('open'); }
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === '__activate_edit_mode') showTweaks();
    if (d.type === '__deactivate_edit_mode') hideTweaks();
  });
  setupTweaks();
  try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch(e) {}

  // ===== Boot (idle title-screen board) =====
  state.rule = RULES[0];
  state.grid = newGrid();
  updateHUD();
  updateRuleHUD();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) lastTime = performance.now() - 16;
  });
  requestAnimationFrame(loop);
})();
