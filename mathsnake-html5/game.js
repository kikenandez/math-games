// =====================================================================
// MATH SNAKE
// Classic snake with one twist: only apples matching the active rule
// grow you. Wrong apples shrink you by one segment.
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

  const COLS = 24, ROWS = 16;
  function getMetrics() {
    const availW = W - 60;
    const availH = H - 240;
    const cellSize = Math.max(18, Math.min(48, Math.min(availW / COLS, availH / ROWS)));
    const gridW = cellSize * COLS;
    const gridH = cellSize * ROWS;
    const x0 = (W - gridW) / 2;
    const y0 = Math.max(130, (H - gridH) / 2 + 10);
    return { cellSize, gridW, gridH, x0, y0 };
  }

  const TWEAKS = /*EDITMODE-BEGIN*/{
    "difficulty": "normal",
    "speed": 1.0,
    "walls": "solid"
  }/*EDITMODE-END*/;

  // ===== Rules =====
  // Each level has a rule with:
  //   label  — short text shown in HUD
  //   test(value, ctx) — returns true if value satisfies the rule
  //   sequence — optional; if true, value must equal ctx.nextExpected
  //   genValid — generate a value that satisfies the rule (for spawning)
  function isPrime(n) {
    if (n < 2) return false;
    if (n < 4) return true;
    if (n % 2 === 0) return false;
    for (let i = 3; i * i <= n; i += 2) if (n % i === 0) return false;
    return true;
  }
  const RULES = [
    { label: 'Eat anything',          test: () => true,                       gen: () => randInt(1, 20) },
    { label: 'Eat EVEN numbers',      test: (n) => n > 0 && n % 2 === 0,      gen: () => randInt(1, 12) * 2 },
    { label: 'Eat ODD numbers',       test: (n) => n % 2 === 1,               gen: () => randInt(0, 12) * 2 + 1 },
    { label: 'Eat MULTIPLES of 3',    test: (n) => n > 0 && n % 3 === 0,      gen: () => randInt(1, 10) * 3 },
    { label: 'Eat MULTIPLES of 5',    test: (n) => n > 0 && n % 5 === 0,      gen: () => randInt(1, 8) * 5 },
    { label: 'Eat PRIMES',            test: (n) => isPrime(n),                gen: () => choice([2, 3, 5, 7, 11, 13, 17, 19, 23, 29]) },
    { label: 'Eat in ASCENDING order', sequence: true,                         test: () => true, gen: () => randInt(1, 30) },
    { label: 'Eat in DESCENDING order', sequence: true, descending: true,      test: () => true, gen: () => randInt(1, 30) },
  ];
  function getRuleForLevel(level) {
    return RULES[(level - 1) % RULES.length];
  }
  // Apple pool spawned each level — 3..5 apples, refreshed when one is eaten.
  const APPLES_ON_BOARD = 5;

  // ===== State =====
  const state = {
    phase: 'title',
    score: 0,
    best: parseInt(localStorage.getItem('mathsnake_best') || '0', 10) || 0,
    level: 1,
    rule: RULES[0],
    nextExpected: null,       // for sequence rules: next number that should be eaten
    seqIndex: 0,
    eatsThisLevel: 0,
    eatsToClear: 8,
    snake: [],                // [{x, y}, ...] head first
    dir: { x: 1, y: 0 },
    pendingDir: { x: 1, y: 0 },
    moveTimer: 0,
    moveInterval: 0.16,
    levelClearing: false,
    apples: [],
    pulse: 0,
    elapsed: 0,
    paused: false,
    floaters: [],
    particles: [],
    shake: 0, shakeX: 0, shakeY: 0,
  };

  const rand = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // ===== Setup =====
  function startGame() {
    state.phase = 'playing';
    state.score = 0;
    state.level = 1;
    startLevel();
    document.getElementById('overlay').classList.add('hidden');
  }
  function startLevel() {
    state.rule = getRuleForLevel(state.level);
    state.eatsThisLevel = 0;
    state.eatsToClear = Math.max(6, 8 + Math.floor(state.level / 2));
    state.seqIndex = 0;
    state.nextExpected = state.rule.sequence ? (state.rule.descending ? 20 : 1) : null;
    state.snake = [
      { x: Math.floor(COLS / 2) - 1, y: Math.floor(ROWS / 2) },
      { x: Math.floor(COLS / 2) - 2, y: Math.floor(ROWS / 2) },
      { x: Math.floor(COLS / 2) - 3, y: Math.floor(ROWS / 2) },
    ];
    state.dir = { x: 1, y: 0 };
    state.pendingDir = { x: 1, y: 0 };
    state.moveTimer = 0;
    state.moveInterval = getBaseInterval();
    state.levelClearing = false;
    state.apples = [];
    state.particles = []; state.floaters = [];
    for (let i = 0; i < APPLES_ON_BOARD; i++) spawnApple();
    updateHUD();
    updateRuleHUD();
  }
  function getBaseInterval() {
    const diffMul = TWEAKS.difficulty === 'easy' ? 1.3
                  : TWEAKS.difficulty === 'hard' ? 0.7 : 1.0;
    const base = 0.18 - state.level * 0.008;
    return Math.max(0.06, base * diffMul / TWEAKS.speed);
  }

  function spawnApple() {
    // 60% chance to spawn a "correct" apple (matches rule).
    let value;
    if (Math.random() < 0.6) {
      value = pickValidValue();
    } else {
      // wrong apple: any number in range that does NOT match the rule
      let safety = 0;
      do {
        value = randInt(1, 30);
      } while (state.rule.test(value) && safety++ < 30);
    }
    // Find a free cell
    const cell = randomEmptyCell();
    if (!cell) return;
    state.apples.push({ x: cell.x, y: cell.y, value, t: 0 });
  }
  function pickValidValue() {
    // Sequence rule: spawn the next expected number with bias, plus some
    // decoys above/below the current target.
    if (state.rule.sequence) {
      if (Math.random() < 0.5) return state.nextExpected;
      const range = state.rule.descending ? randInt(1, state.nextExpected) : state.nextExpected + randInt(1, 10);
      return Math.max(1, range);
    }
    return state.rule.gen();
  }
  function randomEmptyCell() {
    const occupied = new Set();
    for (const s of state.snake) occupied.add(`${s.x},${s.y}`);
    for (const a of state.apples) occupied.add(`${a.x},${a.y}`);
    const candidates = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!occupied.has(`${x},${y}`)) candidates.push({ x, y });
      }
    }
    return candidates.length ? choice(candidates) : null;
  }

  // ===== Input =====
  function setDir(dx, dy) {
    // Prevent reversing into yourself, including multiple key presses before
    // the next movement tick applies pendingDir.
    if (state.pendingDir.x === -dx && state.pendingDir.y === -dy) return;
    state.pendingDir = { x: dx, y: dy };
  }
  window.addEventListener('keydown', (e) => {
    if (state.phase === 'title' || state.phase === 'game_over') {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startGame(); return; }
    }
    if (e.key === 'p' || e.key === 'P') { e.preventDefault(); togglePause(); return; }
    if (state.phase !== 'playing') return;
    if (e.key === 'ArrowUp'    || e.key === 'w' || e.key === 'W') { e.preventDefault(); setDir(0, -1); return; }
    if (e.key === 'ArrowDown'  || e.key === 's' || e.key === 'S') { e.preventDefault(); setDir(0,  1); return; }
    if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') { e.preventDefault(); setDir(-1, 0); return; }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { e.preventDefault(); setDir( 1, 0); return; }
  });
  const mc = (id, dx, dy) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', () => setDir(dx, dy));
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); setDir(dx, dy); }, { passive: false });
  };
  mc('mc-up', 0, -1); mc('mc-down', 0, 1); mc('mc-left', -1, 0); mc('mc-right', 1, 0);
  if ('ontouchstart' in window) document.getElementById('mobile-controls').classList.add('show');

  function togglePause() {
    if (state.phase !== 'playing') return;
    state.paused = !state.paused;
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
    state.pulse += dt;
    state.moveTimer += dt;
    while (!state.levelClearing && state.moveTimer >= state.moveInterval) {
      state.moveTimer -= state.moveInterval;
      step();
      if (state.phase !== 'playing') break;
    }
    for (const a of state.apples) a.t += dt;
    for (const f of state.floaters) { f.t += dt; f.y -= 40 * dt; }
    state.floaters = state.floaters.filter(f => f.t < f.dur);
    for (const p of state.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.gravity ?? 0) * dt; p.life -= dt;
    }
    state.particles = state.particles.filter(p => p.life > 0);
    if (state.shake > 0) {
      state.shake = Math.max(0, state.shake - dt * 3);
      state.shakeX = (Math.random() - 0.5) * state.shake * 12;
      state.shakeY = (Math.random() - 0.5) * state.shake * 12;
    } else { state.shakeX = state.shakeY = 0; }
  }

  function step() {
    state.dir = state.pendingDir;
    const head = state.snake[0];
    let nx = head.x + state.dir.x;
    let ny = head.y + state.dir.y;
    // Walls
    if (TWEAKS.walls === 'wrap') {
      nx = (nx + COLS) % COLS;
      ny = (ny + ROWS) % ROWS;
    } else {
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
        return gameOver('wall!');
      }
    }
    // Check apple at new head position before self-collision. The tail is
    // only safe to ignore when this move will not grow the snake.
    const appleIdx = state.apples.findIndex(a => a.x === nx && a.y === ny);
    const apple = appleIdx >= 0 ? state.apples[appleIdx] : null;
    const correct = apple ? isAppleCorrect(apple) : false;
    const willGrow = Boolean(apple && correct);

    const collisionLimit = willGrow ? state.snake.length : state.snake.length - 1;
    for (let i = 0; i < collisionLimit; i++) {
      if (state.snake[i].x === nx && state.snake[i].y === ny) {
        return gameOver('self bite!');
      }
    }

    state.snake.unshift({ x: nx, y: ny });

    if (appleIdx >= 0) {
      state.apples.splice(appleIdx, 1);
      if (correct) {
        const pts = 50 + state.level * 10;
        state.score += pts;
        state.eatsThisLevel++;
        if (state.rule.sequence) {
          state.nextExpected = state.rule.descending
            ? Math.max(1, state.nextExpected - 1)
            : state.nextExpected + 1;
        }
        showFloater(nx, ny, `+${pts}`, '#5cd97a');
        burst(nx, ny, '#5cd97a');
        // Speed up slightly
        state.moveInterval = Math.max(0.06, state.moveInterval * 0.985);
        if (state.eatsThisLevel >= state.eatsToClear) {
          // Level clear
          const bonus = 200 + state.level * 50;
          state.score += bonus;
          showFloaterCenter(`LEVEL ${state.level} CLEAR  +${bonus}`, '#ffd24d');
          state.level++;
          state.levelClearing = true;
          setTimeout(() => {
            if (state.phase === 'playing' && state.levelClearing) startLevel();
          }, 1200);
        } else {
          spawnApple();
        }
      } else {
        // Wrong apple: shrink
        showFloater(nx, ny, 'WRONG!', '#ff5c7c');
        burst(nx, ny, '#ff5c7c');
        state.shake = Math.min(0.4, state.shake + 0.2);
        state.snake.pop();
        if (state.snake.length <= 1) return gameOver('shrunk away!');
        state.snake.pop();
        state.score = Math.max(0, state.score - 25);
        spawnApple();
      }
      updateHUD();
      updateRuleHUD();
    } else {
      state.snake.pop();
    }
  }

  function isAppleCorrect(apple) {
    if (state.rule.sequence) {
      return apple.value === state.nextExpected;
    }
    return state.rule.test(apple.value);
  }

  function gameOver(reason) {
    state.phase = 'game_over';
    if (state.score > state.best) {
      state.best = state.score;
      localStorage.setItem('mathsnake_best', String(state.best));
    }
    state.shake = Math.min(0.8, state.shake + 0.5);
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
        <div class="stat-chip"><div class="stat-label">Length</div><div class="stat-val">${state.snake.length}</div></div>
        <div class="stat-chip hi"><div class="stat-label">Best</div><div class="stat-val">${state.best}</div></div>
      </div>
      <button class="big-btn" id="restart-btn">SLITHER AGAIN</button>
    `;
    overlay.appendChild(card);
    overlay.classList.remove('hidden');
    document.getElementById('restart-btn').addEventListener('click', startGame);
  }
  document.getElementById('start-btn').addEventListener('click', startGame);

  function burst(gx, gy, color) {
    const m = getMetrics();
    const x = m.x0 + (gx + 0.5) * m.cellSize;
    const y = m.y0 + (gy + 0.5) * m.cellSize;
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rand(120, 280);
      state.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(0.5, 0.9), maxLife: 0.9, size: rand(3, 7),
        color: choice([color, '#fff']),
        gravity: 200,
      });
    }
  }
  function showFloater(gx, gy, text, color) {
    window.MathArcadeAudio?.event(text);
    const m = getMetrics();
    const x = m.x0 + (gx + 0.5) * m.cellSize;
    const y = m.y0 + (gy + 0.5) * m.cellSize - 8;
    state.floaters.push({ x, y, text, color, t: 0, dur: 1.0, big: false });
  }
  function showFloaterCenter(text, color) {
    window.MathArcadeAudio?.event(text);
    state.floaters.push({ x: W / 2, y: H * 0.42, text, color, t: 0, dur: 1.4, big: true });
  }

  // ===== HUD =====
  function updateHUD() {
    document.getElementById('score').textContent = state.score;
    document.getElementById('level').textContent = state.level;
    document.getElementById('length').textContent = state.snake.length;
  }
  function updateRuleHUD() {
    const ruleEl = document.getElementById('rule-text');
    const nextEl = document.getElementById('next-line');
    if (!ruleEl) return;
    ruleEl.innerHTML = state.rule.sequence
      ? `${state.rule.label} <span class="acc">· next: ${state.nextExpected}</span>`
      : state.rule.label;
    const remaining = Math.max(0, state.eatsToClear - state.eatsThisLevel);
    nextEl.textContent = `${state.eatsThisLevel}/${state.eatsToClear} eaten`;
  }

  // ===== Drawing =====
  function draw() {
    ctx.save();
    ctx.translate(state.shakeX, state.shakeY);
    drawBg();
    drawGrid();
    drawApples();
    drawSnake();
    drawParticles();
    drawFloaters();
    if (state.paused) drawPaused();
    ctx.restore();
  }
  function drawBg() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0e1a14');
    g.addColorStop(1, '#0a1410');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  function drawGrid() {
    const m = getMetrics();
    // Frame
    ctx.fillStyle = '#1b2c20';
    ctx.fillRect(m.x0 - 6, m.y0 - 6, m.gridW + 12, m.gridH + 12);
    ctx.strokeStyle = '#5cd97a';
    ctx.lineWidth = 4;
    ctx.strokeRect(m.x0 - 6, m.y0 - 6, m.gridW + 12, m.gridH + 12);
    // Checker cells for grid feel
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        ctx.fillStyle = ((x + y) % 2 === 0) ? '#16241b' : '#1b2c20';
        ctx.fillRect(m.x0 + x * m.cellSize, m.y0 + y * m.cellSize, m.cellSize, m.cellSize);
      }
    }
  }
  function drawApples() {
    const m = getMetrics();
    for (const a of state.apples) {
      const correct = isAppleCorrect(a);
      const cx = m.x0 + (a.x + 0.5) * m.cellSize;
      const cy = m.y0 + (a.y + 0.5) * m.cellSize;
      const r = m.cellSize * 0.4;
      // Floating wobble
      const bob = Math.sin(state.pulse * 4 + a.x * 0.7 + a.y * 0.5) * 2;
      // Drop shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + r * 0.95, r * 0.7, r * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      // Body
      const bodyColor = correct ? '#ff5c5c' : '#b5b078';
      const bodyDark  = correct ? '#7a1f24' : '#62603c';
      ctx.save();
      ctx.translate(cx, cy + bob);
      ctx.fillStyle = bodyColor;
      ctx.strokeStyle = '#0e1a14';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      // Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc(-r * 0.3, -r * 0.35, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
      // Stem + leaf
      ctx.strokeStyle = '#3a2418';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(2, -r - 4);
      ctx.stroke();
      ctx.fillStyle = '#5cd97a';
      ctx.beginPath();
      ctx.ellipse(5, -r - 2, 4, 2, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1c5a2a';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Number
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#0e1a14';
      ctx.lineWidth = 3;
      ctx.font = `bold ${Math.round(r * 0.85)}px "Lilita One", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeText(String(a.value), 0, 1);
      ctx.fillText(String(a.value), 0, 1);
      ctx.restore();
    }
  }
  function drawSnake() {
    const m = getMetrics();
    const cs = m.cellSize;
    // Body segments
    for (let i = state.snake.length - 1; i >= 0; i--) {
      const s = state.snake[i];
      const cx = m.x0 + (s.x + 0.5) * cs;
      const cy = m.y0 + (s.y + 0.5) * cs;
      const isHead = i === 0;
      const rad = cs * (isHead ? 0.46 : 0.42);
      // Color: alternating bands
      ctx.fillStyle = isHead ? '#7ae89a' : ((i % 2 === 0) ? '#5cd97a' : '#3aa55a');
      ctx.strokeStyle = '#1c5a2a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      if (isHead) {
        // Eyes facing direction
        const dx = state.dir.x;
        const dy = state.dir.y;
        const ex = cx + dx * rad * 0.3;
        const ey = cy + dy * rad * 0.3;
        // Perpendicular for two eyes
        const px = -dy;
        const py = dx;
        const eyeR = rad * 0.28;
        const eyeOff = rad * 0.42;
        // Whites
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(ex + px * eyeOff, ey + py * eyeOff, eyeR, 0, Math.PI * 2);
        ctx.arc(ex - px * eyeOff, ey - py * eyeOff, eyeR, 0, Math.PI * 2);
        ctx.fill();
        // Pupils
        ctx.fillStyle = '#1c1a18';
        ctx.beginPath();
        ctx.arc(ex + px * eyeOff + dx * eyeR * 0.3, ey + py * eyeOff + dy * eyeR * 0.3, eyeR * 0.55, 0, Math.PI * 2);
        ctx.arc(ex - px * eyeOff + dx * eyeR * 0.3, ey - py * eyeOff + dy * eyeR * 0.3, eyeR * 0.55, 0, Math.PI * 2);
        ctx.fill();
        // Forked tongue (occasionally)
        const flick = Math.sin(state.elapsed * 6) > 0.7;
        if (flick) {
          const tl = rad * 1.0;
          ctx.strokeStyle = '#ff5c7c';
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(cx + dx * rad, cy + dy * rad);
          ctx.lineTo(cx + dx * (rad + tl), cy + dy * (rad + tl));
          ctx.moveTo(cx + dx * (rad + tl), cy + dy * (rad + tl));
          ctx.lineTo(cx + dx * (rad + tl) + px * rad * 0.3, cy + dy * (rad + tl) + py * rad * 0.3);
          ctx.moveTo(cx + dx * (rad + tl), cy + dy * (rad + tl));
          ctx.lineTo(cx + dx * (rad + tl) - px * rad * 0.3, cy + dy * (rad + tl) - py * rad * 0.3);
          ctx.stroke();
          ctx.lineCap = 'butt';
        }
      }
    }
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
      ctx.font = f.big ? 'bold 44px "Lilita One", sans-serif' : 'bold 20px "Lilita One", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = f.big ? 5 : 3;
      ctx.strokeStyle = '#0e1a14';
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
    ctx.lineWidth = 6; ctx.strokeStyle = '#0e1a14';
    ctx.strokeText('PAUSED', W / 2, H / 2);
    ctx.fillStyle = '#e8f2db'; ctx.fillText('PAUSED', W / 2, H / 2);
  }

  // ===== Tweaks =====
  function setupTweaks() {
    const setRow = (id, key) => {
      const row = document.getElementById(id);
      row.querySelectorAll('.opt').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.value === TWEAKS[key]);
        opt.addEventListener('click', () => {
          TWEAKS[key] = opt.dataset.value;
          row.querySelectorAll('.opt').forEach(o => o.classList.toggle('active', o.dataset.value === TWEAKS[key]));
          if (key === 'difficulty') {
            state.moveInterval = getBaseInterval();
          }
          persistTweaks();
        });
      });
    };
    setRow('diff-row', 'difficulty');
    setRow('wall-row', 'walls');
    const sp = document.getElementById('speed');
    const spVal = document.getElementById('speed-val');
    sp.value = TWEAKS.speed;
    spVal.textContent = `${TWEAKS.speed.toFixed(1)}×`;
    sp.addEventListener('input', () => {
      TWEAKS.speed = parseFloat(sp.value);
      spVal.textContent = `${TWEAKS.speed.toFixed(1)}×`;
      state.moveInterval = getBaseInterval();
      persistTweaks();
    });
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

  // ===== Boot (idle background) =====
  state.snake = [
    { x: Math.floor(COLS / 2) - 1, y: Math.floor(ROWS / 2) },
    { x: Math.floor(COLS / 2) - 2, y: Math.floor(ROWS / 2) },
    { x: Math.floor(COLS / 2) - 3, y: Math.floor(ROWS / 2) },
  ];
  for (let i = 0; i < APPLES_ON_BOARD; i++) spawnApple();
  updateHUD();
  updateRuleHUD();

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) lastTime = performance.now() - 16;
  });
  requestAnimationFrame(loop);
})();
