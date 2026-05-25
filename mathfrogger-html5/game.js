// =====================================================================
// MATH FROGGER — rule-hunter edition
// One active rule per crossing (odd/even/x2/x5/prime).
// Eat 10 numbers that match the rule before time runs out.
// Sparse golden time-bubbles give bonus seconds.
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

  const ROW_COUNT = 13;
  const COL_COUNT = 9;
  function getMetrics() {
    const playTop = 155;
    const playBottom = H - 160;
    const rowH = Math.min(60, (playBottom - playTop) / ROW_COUNT);
    const colW = Math.min(rowH * 1.1, (W - 32) / COL_COUNT);
    const gridW = colW * COL_COUNT;
    const gridH = rowH * ROW_COUNT;
    const gridX = (W - gridW) / 2;
    const gridY = playTop;
    return { rowH, colW, gridW, gridH, gridX, gridY };
  }
  function rowToType(r) {
    if (r === 0) return 'finish';
    if (r >= 1 && r <= 5) return 'river';
    if (r === 6) return 'median';
    if (r >= 7 && r <= 11) return 'road';
    return 'start';
  }

  const TWEAKS = /*EDITMODE-BEGIN*/{
    "difficulty": "normal",
    "trafficSpeed": 1.0,
    "riverSpeed": 1.0,
    "startTime": 60
  }/*EDITMODE-END*/;

  const state = {
    phase: 'title',
    score: 0,
    best: parseInt(localStorage.getItem('mathfrogger_best') || '0', 10) || 0,
    lives: 3,
    round: 1,
    frog: { col: 4, row: 12, x: 0, y: 0, tx: 0, ty: 0, hopT: 0, facing: 0 },
    lanes: [],
    activeRule: null,
    combo: 0,
    bestCombo: 0,
    solvesNeeded: 10,
    solvedCount: 0,
    nextRuleSwitch: 0,
    ruleSwitchFlash: 0,
    countdown: 60,
    maxCountdown: 60,
    elapsed: 0,
    floaters: [],
    particles: [],
    shake: 0, shakeX: 0, shakeY: 0,
    deathT: 0, deathReason: null,
    paused: false,
    rowFlash: null,
    finishFlash: 0,
    timeBubbleSpawnT: 0,
  };

  const rand = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  // Rule catalog — each round picks one. Frog must eat 10 matching numbers.
  const RULES = [
    { type: 'even',     label: 'EVEN NUMBERS',      short: 'EVEN',    test: (n) => n > 0 && n % 2 === 0 },
    { type: 'odd',      label: 'ODD NUMBERS',       short: 'ODD',     test: (n) => n % 2 === 1 },
    { type: 'mult2',    label: 'MULTIPLES OF 2',    short: '×2',      test: (n) => n > 0 && n % 2 === 0 },
    { type: 'mult5',    label: 'MULTIPLES OF 5',    short: '×5',      test: (n) => n > 0 && n % 5 === 0 },
    { type: 'mult3',    label: 'MULTIPLES OF 3',    short: '×3',      test: (n) => n > 0 && n % 3 === 0 },
    { type: 'prime',    label: 'PRIME NUMBERS',     short: 'PRIME',   test: (n) => isPrime(n) },
  ];
  function isPrime(n) {
    if (n < 2) return false;
    if (n < 4) return true;
    if (n % 2 === 0) return false;
    for (let i = 3; i * i <= n; i += 2) if (n % i === 0) return false;
    return true;
  }
  let _lastRuleType = null;
  function genRule(round) {
    // Restrict by round so early rounds stay friendly.
    let pool = RULES.filter(r => r.type === 'even' || r.type === 'odd');
    if (round >= 2) pool = RULES.filter(r => ['even','odd','mult2','mult5'].includes(r.type));
    if (round >= 3) pool = RULES.filter(r => r.type !== 'prime');
    if (round >= 4) pool = RULES.slice();
    // Avoid repeating the same rule back-to-back.
    const filtered = pool.filter(r => r.type !== _lastRuleType);
    const rule = choice(filtered.length ? filtered : pool);
    _lastRuleType = rule.type;
    return rule;
  }

  // Sparse: spawn fresh time-bubbles on a global timer instead of seeding them
  // statically. Each one converts back to a regular number after a few seconds.
  const TIME_BUBBLE_TTL = 3.0;       // seconds visible before reverting
  const TIME_BUBBLE_SPAWN_MIN = 4.5; // seconds between time-bubble spawns
  const TIME_BUBBLE_SPAWN_MAX = 9.0;
  function scheduleNextTimeBubble() {
    state.timeBubbleSpawnT = rand(TIME_BUBBLE_SPAWN_MIN, TIME_BUBBLE_SPAWN_MAX);
  }
  function trySpawnTimeBubble() {
    // Pick a random off-screen bubble in a random lane and convert it.
    if (!state.lanes.length) return;
    const candidates = [];
    for (const lane of state.lanes) {
      if (!lane.bubbles) continue;
      for (const b of lane.bubbles) {
        if (b.isTime) continue;
        // Prefer bubbles that are still off-screen so the appearance feels natural.
        if (b.x < -10 || b.x > W + 10) candidates.push(b);
      }
    }
    const pool = candidates.length ? candidates : (() => {
      const all = [];
      for (const lane of state.lanes) if (lane.bubbles) for (const b of lane.bubbles) if (!b.isTime) all.push(b);
      return all;
    })();
    if (!pool.length) return;
    const b = choice(pool);
    b.isTime = true;
    b.timeTTL = TIME_BUBBLE_TTL;
  }

  // Pool of bubble numbers across all lanes for the round.
  // Mixed numbers — some will match the active rule, some won't.
  function makeBubbleNumbersForLane(round) {
    // 5 bubbles per lane, varied range so rule has plenty of hits + misses.
    const maxN = Math.max(20, 12 + round * 3);
    const numbers = [];
    let safety = 0;
    while (numbers.length < 5 && safety++ < 200) {
      const n = randInt(1, maxN);
      if (!numbers.includes(n)) numbers.push(n);
    }
    return numbers;
  }
  // Sparse: ~one time-bubble for every ~3 lanes. Returns true to make this slot a time bubble.
  function maybeTimeBubble() {
    // Initial seed is rare — most time-bubbles spawn on the global timer.
    return Math.random() < 0.025;
  }

  function buildLanes(round) {
    const lanes = [];
    // Road lanes 7-11
    for (let r = 7; r <= 11; r++) {
      const dir = (r % 2 === 0) ? 1 : -1;
      const baseSpeed = (50 + round * 8 + (r - 7) * 6) * TWEAKS.trafficSpeed;
      const lane = { row: r, type: 'road', dir, speed: baseSpeed, entities: [], bubbles: [] };
      const carCount = 2 + Math.floor(Math.random() * 2);
      const carW = 80 + Math.random() * 30;
      const stride = (W + 200) / carCount;
      for (let i = 0; i < carCount; i++) {
        lane.entities.push({
          x: -50 + i * stride + Math.random() * 80,
          w: carW + Math.random() * 30,
          color: choice(['#e85a5a', '#5aa8e8', '#e8b85a', '#8a5ae8', '#5ae8a8']),
        });
      }
      // Bubbles
      const numbers = makeBubbleNumbersForLane(round);
      const bubbleStride = (W + 220) / numbers.length;
      const bubbleSpeed = baseSpeed * 0.45;
      for (let i = 0; i < numbers.length; i++) {
        const isTime = maybeTimeBubble();
        lane.bubbles.push({
          x: -40 + i * bubbleStride + Math.random() * 60,
          number: numbers[i],
          isTime,
          w: 56,
          dir,
          speed: bubbleSpeed,
        });
      }
      lanes.push(lane);
    }
    // River lanes 1-5 — logs/lilies are safe transport. Bubbles float separately.
    for (let r = 1; r <= 5; r++) {
      const dir = (r % 2 === 0) ? -1 : 1;
      const baseSpeed = (40 + round * 5 + (5 - r) * 4) * TWEAKS.riverSpeed;
      const isLogLane = r % 2 === 1;
      const lane = { row: r, type: 'river', dir, speed: baseSpeed, entities: [], bubbles: [] };
      // More logs/lilies for easier transport
      const count = 4 + Math.floor(Math.random() * 2);
      const stride = (W + 240) / count;
      for (let i = 0; i < count; i++) {
        const w = isLogLane ? 140 + Math.random() * 30 : 90 + Math.random() * 10;
        lane.entities.push({
          x: -60 + i * stride + Math.random() * 40,
          w,
          isLog: isLogLane,
        });
      }
      // Bubbles
      const numbers = makeBubbleNumbersForLane(round);
      const bubbleStride = (W + 220) / numbers.length;
      const bubbleSpeed = baseSpeed * 0.5;
      for (let i = 0; i < numbers.length; i++) {
        const isTime = maybeTimeBubble();
        lane.bubbles.push({
          x: -40 + i * bubbleStride + Math.random() * 60,
          number: numbers[i],
          isTime,
          w: 52,
          dir,
          speed: bubbleSpeed,
        });
      }
      lanes.push(lane);
    }
    return lanes;
  }

  function frogGridPos(col, row) {
    const m = getMetrics();
    return {
      x: m.gridX + (col + 0.5) * m.colW,
      y: m.gridY + (row + 0.5) * m.rowH,
    };
  }
  function placeFrogAtGrid(col, row) {
    const p = frogGridPos(col, row);
    state.frog.col = col;
    state.frog.row = row;
    state.frog.x = p.x;
    state.frog.y = p.y;
    state.frog.tx = p.x;
    state.frog.ty = p.y;
    state.frog.hopT = 0;
  }

  function newRule() {
    state.activeRule = genRule(state.round);
    updateBottomEq();
  }
  function scheduleNextRuleSwitch() {
    // After every 5–10 hits the rule swaps to keep the player on their toes.
    state.nextRuleSwitch = state.solvedCount + randInt(5, 10);
  }
  function switchRule() {
    const prev = state.activeRule;
    state.activeRule = genRule(state.round);
    state.ruleSwitchFlash = 1.2;
    showFloaterCenter(`NEW RULE: ${state.activeRule.label}`, '#ffd24d');
    // CSS pulse on the bottom banner
    const wrap = document.getElementById('bottom-eq');
    if (wrap) {
      wrap.classList.remove('rule-warn');
      wrap.classList.remove('rule-pulse');
      void wrap.offsetWidth;
      wrap.classList.add('rule-pulse');
    }
    // Brief reward for staying flexible
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rand(120, 260);
      state.particles.push({
        x: W / 2, y: H * 0.42,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
        life: rand(0.6, 1.2), maxLife: 1.2,
        size: rand(4, 9),
        color: choice(['#ffd24d', '#ff8a3d', '#fff', '#5cd97a']),
        gravity: 280,
      });
    }
    scheduleNextRuleSwitch();
    updateBottomEq();
  }

  function startRound() {
    state.lanes = buildLanes(state.round);
    state.maxCountdown = Math.max(25, TWEAKS.startTime - (state.round - 1) * 3);
    state.countdown = state.maxCountdown;
    state.solvesNeeded = 10;
    state.solvedCount = 0;
    state.combo = 0;
    placeFrogAtGrid(4, 12);
    state.frog.facing = 0;
    newRule();
    scheduleNextRuleSwitch();
    scheduleNextTimeBubble();
    updateHUD();
    updateCountdownBanner();
  }

  function updateHUD() {
    document.getElementById('score').textContent = state.score;
    document.getElementById('lives').textContent = '❤'.repeat(state.lives);
    document.getElementById('round').textContent = state.round;
  }
  function updateCountdownBanner() {
    const eq = document.getElementById('countdown-eq');
    const wrap = document.getElementById('target');
    if (!eq || !wrap) return;
    const s = Math.max(0, Math.ceil(state.countdown));
    eq.textContent = `${s}s`;
    if (s <= 10) wrap.classList.add('warn');
    else wrap.classList.remove('warn');
  }
  function updateBottomEq() {
    const wrap = document.getElementById('bottom-eq');
    const txt = document.getElementById('bottom-eq-text');
    const sub = wrap ? wrap.querySelector('.small') : null;
    if (!wrap || !txt) return;
    if (state.solvedCount >= state.solvesNeeded) {
      wrap.classList.add('cleared');
      wrap.classList.remove('rule-warn');
      txt.innerHTML = 'FULL BELLY — HOP TO THE LILY PAD';
      if (sub) sub.textContent = `combo ×${state.combo}  ·  best ×${state.bestCombo}`;
      return;
    }
    wrap.classList.remove('cleared');
    const rule = state.activeRule;
    if (rule) {
      txt.innerHTML = `EAT <span class="op">${rule.label}</span>`;
    }
    if (sub) sub.textContent = `food ${state.solvedCount}/${state.solvesNeeded}  ·  combo ×${state.combo}`;
    // Blink warning when the next correct hit will swap the rule.
    const hitsLeftBeforeSwitch = state.nextRuleSwitch - state.solvedCount;
    if (hitsLeftBeforeSwitch === 1) wrap.classList.add('rule-warn');
    else wrap.classList.remove('rule-warn');
  }

  function tryHop(dCol, dRow) {
    if (state.phase !== 'playing') return;
    if (state.frog.hopT > 0) return;
    if (state.deathT > 0) return;
    const nc = clamp(state.frog.col + dCol, 0, COL_COUNT - 1);
    const nr = clamp(state.frog.row + dRow, 0, ROW_COUNT - 1);
    if (nc === state.frog.col && nr === state.frog.row) return;
    const p = frogGridPos(nc, nr);
    state.frog.tx = p.x;
    state.frog.ty = p.y;
    state.frog.col = nc;
    state.frog.row = nr;
    state.frog.hopT = 0.001;
    if (dCol > 0) state.frog.facing = 1;
    else if (dCol < 0) state.frog.facing = 3;
    else if (dRow < 0) state.frog.facing = 0;
    else state.frog.facing = 2;
  }
  window.addEventListener('keydown', (e) => {
    if (state.phase === 'title' || state.phase === 'game_over') {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startGame(); return; }
    }
    if (e.key === 'p' || e.key === 'P') { e.preventDefault(); togglePause(); return; }
    if (state.phase !== 'playing') return;
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { e.preventDefault(); tryHop(0, -1); return; }
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { e.preventDefault(); tryHop(0, 1); return; }
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { e.preventDefault(); tryHop(-1, 0); return; }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { e.preventDefault(); tryHop(1, 0); return; }
  });
  const mc = (id, dc, dr) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', () => tryHop(dc, dr));
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); tryHop(dc, dr); }, { passive: false });
  };
  mc('mc-up', 0, -1); mc('mc-down', 0, 1); mc('mc-left', -1, 0); mc('mc-right', 1, 0);
  if ('ontouchstart' in window) document.getElementById('mobile-controls').classList.add('show');

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
  function updateIdle(dt) {
    state.elapsed += dt * 0.5;
    if (state.lanes.length) for (const lane of state.lanes) updateLane(lane, dt * 0.3);
  }
  function updateLane(lane, dt) {
    for (const ent of lane.entities) {
      ent.x += lane.dir * lane.speed * dt;
      if (lane.dir > 0 && ent.x > W + 50) ent.x = -ent.w - rand(20, 120);
      else if (lane.dir < 0 && ent.x + ent.w < -50) ent.x = W + rand(20, 120);
    }
    if (lane.bubbles) {
      for (const b of lane.bubbles) {
        b.x += b.dir * b.speed * dt;
        if (b.dir > 0 && b.x > W + 50) b.x = -b.w - rand(20, 120);
        else if (b.dir < 0 && b.x + b.w < -50) b.x = W + rand(20, 120);
        // Time bubbles expire after a couple of seconds and revert to a number.
        if (b.isTime) {
          b.timeTTL -= dt;
          if (b.timeTTL <= 0) {
            b.isTime = false;
            b.number = randInt(1, Math.max(20, 12 + state.round * 3));
          }
        }
      }
    }
  }

  function update(dt) {
    state.elapsed += dt;
    state.countdown -= dt;
    updateCountdownBanner();
    if (state.countdown <= 0) {
      state.countdown = state.maxCountdown;
      killFrog("TIME'S UP!");
    }
    // Time-bubble spawner
    state.timeBubbleSpawnT -= dt;
    if (state.timeBubbleSpawnT <= 0) {
      trySpawnTimeBubble();
      scheduleNextTimeBubble();
    }
    for (const lane of state.lanes) updateLane(lane, dt);

    if (state.frog.hopT > 0) {
      state.frog.hopT += dt;
      const dur = 0.18;
      const t = Math.min(1, state.frog.hopT / dur);
      const e = easeOut(t);
      state.frog.x = lerp(state.frog.x, state.frog.tx, e);
      state.frog.y = lerp(state.frog.y, state.frog.ty, e);
      if (t >= 1) {
        state.frog.x = state.frog.tx;
        state.frog.y = state.frog.ty;
        state.frog.hopT = 0;
        onLanded();
      }
    } else {
      const m = getMetrics();
      const lane = state.lanes.find(l => l.row === state.frog.row);
      if (lane && lane.type === 'river') {
        const ent = findFrogEntity();
        if (ent) {
          state.frog.x += lane.dir * lane.speed * dt;
          state.frog.col = clamp(Math.round((state.frog.x - m.gridX) / m.colW - 0.5), 0, COL_COUNT - 1);
          if (state.frog.x < m.gridX || state.frog.x > m.gridX + m.gridW) killFrog('swept off!');
        }
      }
    }

    if (state.deathT > 0) {
      state.deathT -= dt;
      if (state.deathT <= 0) {
        state.deathT = 0;
        if (state.lives <= 0) gameOver();
        else resetFrog();
      }
    }

    if (state.deathT === 0 && state.frog.hopT === 0) {
      const lane = state.lanes.find(l => l.row === state.frog.row);
      if (lane && lane.type === 'road') {
        for (const car of lane.entities) {
          if (state.frog.x > car.x && state.frog.x < car.x + car.w) { killFrog('squashed!'); break; }
        }
      }
      // Continuous bubble check — a bubble drifting into the frog should pop
      // even if the frog stands still.
      if (state.deathT === 0) {
        const bubble = findFrogBubble();
        if (bubble) handleBubble(bubble, state.frog.row);
      }
    }

    if (state.rowFlash) {
      state.rowFlash.t -= dt;
      if (state.rowFlash.t <= 0) state.rowFlash = null;
    }
    if (state.finishFlash > 0) state.finishFlash = Math.max(0, state.finishFlash - dt);
    if (state.ruleSwitchFlash > 0) state.ruleSwitchFlash = Math.max(0, state.ruleSwitchFlash - dt);
    for (const f of state.floaters) { f.t += dt; f.y -= 40 * dt; }
    state.floaters = state.floaters.filter(f => f.t < f.dur);
    for (const p of state.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.gravity ?? 400) * dt; p.life -= dt;
    }
    state.particles = state.particles.filter(p => p.life > 0);
    if (state.shake > 0) {
      state.shake = Math.max(0, state.shake - dt * 3);
      state.shakeX = (Math.random() - 0.5) * state.shake * 14;
      state.shakeY = (Math.random() - 0.5) * state.shake * 14;
    } else { state.shakeX = state.shakeY = 0; }
  }

  function findFrogEntity() {
    const lane = state.lanes.find(l => l.row === state.frog.row);
    if (!lane || lane.type !== 'river') return null;
    for (const ent of lane.entities) {
      if (state.frog.x >= ent.x && state.frog.x <= ent.x + ent.w) return ent;
    }
    return null;
  }
  function findFrogBubble() {
    const lane = state.lanes.find(l => l.row === state.frog.row);
    if (!lane || !lane.bubbles) return null;
    for (const b of lane.bubbles) {
      const cx = b.x + b.w / 2;
      const dx = state.frog.x - cx;
      if (dx * dx <= (b.w * 0.5) * (b.w * 0.5)) return b;
    }
    return null;
  }
  // Move a consumed bubble off-screen on its spawn side so it drifts back in fresh.
  function respawnBubble(bubble, lane) {
    if (lane && lane.bubbles) {
      // Find a free off-screen slot taking the other bubbles into account so they don't stack.
      const sameDir = lane.bubbles.filter(b => b !== bubble && b.dir === bubble.dir);
      const xs = sameDir.map(b => b.x);
      const baseOffset = rand(40, 180);
      if (bubble.dir > 0) {
        const leftmost = xs.length ? Math.min(...xs) : 0;
        bubble.x = Math.min(-bubble.w - baseOffset, leftmost - bubble.w - rand(60, 140));
      } else {
        const rightmost = xs.length ? Math.max(...xs) : W;
        bubble.x = Math.max(W + baseOffset, rightmost + rand(60, 140));
      }
    } else {
      bubble.x = bubble.dir > 0 ? -bubble.w - rand(40, 180) : W + rand(40, 180);
    }
    bubble.isTime = false;
    bubble.number = randInt(1, Math.max(20, 12 + state.round * 3));
  }

  function onLanded() {
    const r = state.frog.row;
    const type = rowToType(r);

    if (type === 'finish') {
      if (state.solvedCount < state.solvesNeeded) {
        // Bounce back — finish locked
        state.finishFlash = 0.5;
        showFloaterCenter(`EAT ${state.solvesNeeded - state.solvedCount} MORE!`, '#ff5c7c');
        // Push frog back to median
        placeFrogAtGrid(state.frog.col, 6);
        return;
      }
      // Win round
      const timeBonus = Math.round(state.countdown) * 10;
      const comboBonus = state.bestCombo * 25;
      const total = 300 + state.round * 80 + timeBonus + comboBonus;
      state.score += total;
      showFloaterCenter(`LEVEL CLEAR  +${total}`, '#ffd24d');
      for (let i = 0; i < 50; i++) {
        state.particles.push({
          x: state.frog.x, y: state.frog.y,
          vx: rand(-280, 280), vy: rand(-380, -120),
          life: rand(0.7, 1.4), maxLife: 1.4,
          size: rand(4, 9),
          color: choice(['#5cd97a', '#ffd24d', '#ff8a3d', '#ff5c7c', '#fff', '#7ad1ff']),
        });
      }
      setTimeout(() => { state.round++; startRound(); }, 1100);
      updateHUD();
      return;
    }

    // Check bubble first
    const bubble = findFrogBubble();
    if (bubble) {
      handleBubble(bubble, r);
      return;
    }

    // No bubble — normal lane safety
    if (type === 'river') {
      const ent = findFrogEntity();
      if (!ent) killFrog('SPLASH!');
      return;
    }
    if (type === 'road') {
      const lane = state.lanes.find(l => l.row === r);
      if (lane) {
        for (const car of lane.entities) {
          if (state.frog.x > car.x && state.frog.x < car.x + car.w) { killFrog('squashed!'); return; }
        }
      }
    }
  }

  function handleBubble(bubble, r) {
    const lane = state.lanes.find(l => l.row === r);
    // Time bubbles — always a positive grab, regardless of rule.
    if (bubble.isTime) {
      const bonus = 5;
      state.countdown = Math.min(state.maxCountdown + 10, state.countdown + bonus);
      state.score += 25;
      state.rowFlash = { row: r, ok: true, t: 0.5 };
      showFloater(state.frog.x, state.frog.y - 14, `+${bonus}s`, '#ffd24d');
      // Send it off-screen — a brand-new bubble drifts in from the spawn side.
      respawnBubble(bubble, lane);
      for (let i = 0; i < 16; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = rand(160, 320);
        state.particles.push({
          x: state.frog.x, y: state.frog.y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80,
          life: rand(0.5, 1.0), maxLife: 1.0,
          size: rand(4, 9),
          color: choice(['#ffd24d', '#ff8a3d', '#fff']),
        });
      }
      updateHUD();
      updateBottomEq();
      // Lane safety still applies.
      checkLaneSafety(r);
      return;
    }

    const correct = state.activeRule && state.activeRule.test(bubble.number);
    if (correct) {
      state.combo++;
      if (state.combo > state.bestCombo) state.bestCombo = state.combo;
      const base = 40 + state.round * 8;
      const mul = state.combo;
      const points = base * mul;
      state.score += points;
      state.solvedCount++;
      state.rowFlash = { row: r, ok: true, t: 0.6 };
      showFloater(state.frog.x, state.frog.y - 14, `+${points}  ×${mul}`, '#5cd97a');
      // Send it off-screen — fresh number drifts in from the spawn side.
      respawnBubble(bubble, lane);
      // Mid-round rule swap so play stays dynamic.
      if (state.solvedCount < state.solvesNeeded && state.solvedCount >= state.nextRuleSwitch) {
        switchRule();
      }
      // Burst
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = rand(140, 280);
        state.particles.push({
          x: state.frog.x, y: state.frog.y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80,
          life: rand(0.5, 0.9), maxLife: 0.9,
          size: rand(4, 8),
          color: choice(['#5cd97a', '#ffd24d', '#fff']),
        });
      }
      updateHUD();
      updateBottomEq();
    } else {
      // Wrong bubble: combo reset + small time penalty, no kill.
      state.combo = 0;
      state.score = Math.max(0, state.score - 10);
      state.countdown = Math.max(0, state.countdown - 2);
      state.shake = Math.min(0.4, state.shake + 0.2);
      state.rowFlash = { row: r, ok: false, t: 0.4 };
      showFloater(state.frog.x, state.frog.y - 14, '−2s', '#ff5c7c');
      respawnBubble(bubble, lane);
      updateHUD();
      updateBottomEq();
    }
    checkLaneSafety(r);
  }

  function checkLaneSafety(r) {
    const type = rowToType(r);
    if (type === 'river') {
      const ent = findFrogEntity();
      if (!ent) killFrog('SPLASH!');
    } else if (type === 'road') {
      const lane = state.lanes.find(l => l.row === r);
      if (lane) for (const car of lane.entities) {
        if (state.frog.x > car.x && state.frog.x < car.x + car.w) { killFrog('squashed!'); return; }
      }
    }
  }

  function killFrog(reason) {
    state.lives--;
    state.deathT = 1.0;
    state.deathReason = reason;
    state.combo = 0;
    state.shake = Math.min(0.8, state.shake + 0.5);
    showFloaterCenter(reason, '#ff5c7c');
    explode(state.frog.x, state.frog.y, '#5cd97a');
    updateHUD();
    updateBottomEq();
  }
  function resetFrog() {
    placeFrogAtGrid(4, 12);
    state.deathReason = null;
  }
  function explode(x, y, color) {
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rand(120, 320);
      state.particles.push({
        x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80,
        life: rand(0.5, 0.9), maxLife: 0.9,
        size: rand(4, 8),
        color: choice([color, '#fff', '#ff8a3d']),
      });
    }
  }
  function showFloater(x, y, text, color) {
    state.floaters.push({ x, y, text, color, t: 0, dur: 1.1, big: false });
  }
  function showFloaterCenter(text, color) {
    state.floaters.push({ x: W / 2, y: H * 0.4, text, color, t: 0, dur: 1.2, big: true });
  }

  function startGame() {
    state.phase = 'playing';
    state.score = 0; state.lives = 3; state.round = 1;
    state.bestCombo = 0;
    state.floaters = []; state.particles = []; state.deathT = 0;
    startRound();
    document.getElementById('overlay').classList.add('hidden');
  }
  function togglePause() {
    if (state.phase !== 'playing') return;
    state.paused = !state.paused;
  }
  function gameOver() {
    state.phase = 'game_over';
    if (state.score > state.best) {
      state.best = state.score;
      localStorage.setItem('mathfrogger_best', String(state.best));
    }
    const overlay = document.getElementById('overlay');
    overlay.querySelector('.card').remove();
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h1><span class="acc">CROAK!</span></h1>
      <div class="sub">game over</div>
      <div class="stats-row">
        <div class="stat-chip"><div class="stat-label">Score</div><div class="stat-val">${state.score}</div></div>
        <div class="stat-chip"><div class="stat-label">Round</div><div class="stat-val">${state.round}</div></div>
        <div class="stat-chip"><div class="stat-label">Best Combo</div><div class="stat-val">×${state.bestCombo}</div></div>
        <div class="stat-chip hi"><div class="stat-label">Best</div><div class="stat-val">${state.best}</div></div>
      </div>
      <button class="big-btn" id="restart-btn">PLAY AGAIN</button>
    `;
    overlay.appendChild(card);
    overlay.classList.remove('hidden');
    document.getElementById('restart-btn').addEventListener('click', startGame);
  }
  document.getElementById('start-btn').addEventListener('click', startGame);

  function draw() {
    ctx.save();
    ctx.translate(state.shakeX, state.shakeY);
    drawBackdrop();
    drawGrid();
    drawLanes();
    drawFinish();
    drawFrog();
    drawParticles();
    drawFloaters();
    if (state.paused) drawPaused();
    ctx.restore();
  }
  function drawBackdrop() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#8acff5'); g.addColorStop(0.5, '#a8e0f5'); g.addColorStop(1, '#cff0d8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.strokeStyle = '#1c2a18'; ctx.lineWidth = 2;
    const clouds = [{x:80,y:50,s:0.8},{x:360,y:30,s:1},{x:720,y:60,s:0.7},{x:1100,y:40,s:0.9}];
    const drift = (state.elapsed * 8) % 1400;
    for (const c of clouds) {
      const cx = ((c.x - drift) % 1600 + 1600) % 1600 - 100;
      drawCloud(cx, c.y, c.s);
    }
  }
  function drawCloud(x, y, s) {
    const arcs = [[0,0,22],[22,-8,18],[42,0,22],[16,6,20]];
    for (const [ox, oy, r] of arcs) {
      ctx.beginPath();
      ctx.arc(x + ox*s, y + oy*s, r*s, 0, Math.PI*2);
      ctx.fill(); ctx.stroke();
    }
  }
  function drawGrid() {
    const m = getMetrics();
    for (let r = 0; r < ROW_COUNT; r++) {
      const type = rowToType(r);
      const y = m.gridY + r * m.rowH;
      let col;
      if (type === 'finish') col = '#3a7a3a';
      else if (type === 'river') col = '#4a8acf';
      else if (type === 'median') col = '#6cc26b';
      else if (type === 'road') col = '#3a3a3e';
      else col = '#6cc26b';
      ctx.fillStyle = col;
      ctx.fillRect(m.gridX, y, m.gridW, m.rowH);
    }
    // River waves
    for (let r = 1; r <= 5; r++) {
      const y = m.gridY + r * m.rowH;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      const off = (state.elapsed * 30) % 40;
      for (let x = m.gridX - off; x < m.gridX + m.gridW; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, y + m.rowH * 0.5);
        ctx.quadraticCurveTo(x + 10, y + m.rowH * 0.4, x + 20, y + m.rowH * 0.5);
        ctx.quadraticCurveTo(x + 30, y + m.rowH * 0.6, x + 40, y + m.rowH * 0.5);
        ctx.lineTo(x + 40, y + m.rowH * 0.6);
        ctx.lineTo(x, y + m.rowH * 0.6);
        ctx.closePath(); ctx.fill();
      }
    }
    for (let r = 7; r <= 10; r++) {
      const y = m.gridY + (r + 1) * m.rowH;
      ctx.strokeStyle = '#ffd24d'; ctx.lineWidth = 2;
      ctx.setLineDash([16, 14]);
      ctx.lineDashOffset = (state.elapsed * 30) % 30;
      ctx.beginPath();
      ctx.moveTo(m.gridX, y); ctx.lineTo(m.gridX + m.gridW, y);
      ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.fillStyle = '#5a5a5e';
    ctx.fillRect(m.gridX, m.gridY + 7 * m.rowH - 4, m.gridW, 4);
    ctx.fillRect(m.gridX, m.gridY + 12 * m.rowH, m.gridW, 4);
    const medY = m.gridY + 6 * m.rowH;
    ctx.fillStyle = '#3a7a3a';
    for (let i = 0; i < 8; i++) {
      ctx.fillRect(m.gridX + i * (m.gridW / 8) + 8, medY + m.rowH * 0.7, 16, 6);
    }
    if (state.rowFlash) {
      const dur = state.rowFlash.ok ? 0.6 : 0.4;
      const a = state.rowFlash.t / dur;
      ctx.fillStyle = state.rowFlash.ok
        ? `rgba(92, 217, 122, ${a * 0.55})`
        : `rgba(255, 92, 124, ${a * 0.55})`;
      ctx.fillRect(m.gridX, m.gridY + state.rowFlash.row * m.rowH, m.gridW, m.rowH);
    }
    ctx.strokeStyle = '#1c2a18'; ctx.lineWidth = 4;
    ctx.strokeRect(m.gridX, m.gridY, m.gridW, m.gridH);
  }
  function drawLanes() {
    const m = getMetrics();
    ctx.save();
    ctx.beginPath();
    ctx.rect(m.gridX, m.gridY, m.gridW, m.gridH);
    ctx.clip();
    for (const lane of state.lanes) {
      const y = m.gridY + lane.row * m.rowH;
      for (const ent of lane.entities) {
        const ey = y + m.rowH * 0.5;
        if (lane.type === 'road') drawCar(ent.x, ey, ent.w, m.rowH * 0.62, ent.color, lane.dir);
        else if (lane.type === 'river') {
          if (ent.isLog) drawLog(ent.x, ey, ent.w, m.rowH * 0.55);
          else drawLilypad(ent.x, ey, ent.w, m.rowH * 0.55);
        }
      }
      if (lane.bubbles) {
        for (const b of lane.bubbles) {
          // Visual cue: matching-number glow fades out past round 2 to crank up difficulty.
          const showCue = state.round <= 2;
          const matches = showCue && !b.isTime && state.activeRule && state.activeRule.test(b.number);
          drawBubble(b.x + b.w / 2, y + m.rowH * 0.5, b.w * 0.5, b.number, matches, b.isTime);
        }
      }
    }
    ctx.restore();
  }
  function drawBubble(cx, cy, r, number, matches, isTime) {
    const bob = Math.sin(state.elapsed * 4 + cx * 0.01) * 2;
    cy += bob;
    if (isTime) {
      drawTimeBubble(cx, cy, r);
      return;
    }
    // Outer glow ring — brighter when matches active rule
    const grd = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 1.3);
    if (matches) {
      grd.addColorStop(0, 'rgba(140, 240, 160, 0.85)');
      grd.addColorStop(0.6, 'rgba(120, 220, 140, 0.45)');
      grd.addColorStop(1, 'rgba(120, 220, 140, 0)');
    } else {
      grd.addColorStop(0, 'rgba(255,255,255,0.85)');
      grd.addColorStop(0.7, 'rgba(180, 230, 250, 0.55)');
      grd.addColorStop(1, 'rgba(120, 200, 240, 0.0)');
    }
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.25, 0, Math.PI * 2);
    ctx.fill();
    // Bubble body
    ctx.fillStyle = matches ? '#d8f5cd' : 'rgba(255, 255, 255, 0.85)';
    ctx.strokeStyle = matches ? '#2a7a3a' : '#1c2a18';
    ctx.lineWidth = matches ? 3 : 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Inner highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.beginPath();
    ctx.arc(cx - r * 0.32, cy - r * 0.32, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    // Number
    ctx.fillStyle = '#1c2a18';
    ctx.font = `bold ${Math.round(r * 0.95)}px "Lilita One", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(number), cx, cy + 1);
  }
  function drawTimeBubble(cx, cy, r) {
    // Pulsing golden bonus orb with a clock face.
    const pulse = 1 + Math.sin(state.elapsed * 6 + cx * 0.02) * 0.06;
    const rr = r * pulse;
    // Soft glow halo
    const grd = ctx.createRadialGradient(cx, cy, rr * 0.2, cx, cy, rr * 1.5);
    grd.addColorStop(0, 'rgba(255, 230, 130, 1)');
    grd.addColorStop(0.55, 'rgba(255, 180, 80, 0.55)');
    grd.addColorStop(1, 'rgba(255, 160, 60, 0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(cx, cy, rr * 1.45, 0, Math.PI * 2);
    ctx.fill();
    // Body
    ctx.fillStyle = '#ffd24d';
    ctx.strokeStyle = '#7a4a10';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Clock face inner ring
    ctx.strokeStyle = '#7a4a10';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, rr * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    // Tick marks at 12/3/6/9
    ctx.fillStyle = '#7a4a10';
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 - Math.PI / 2;
      const tx = cx + Math.cos(a) * rr * 0.62;
      const ty = cy + Math.sin(a) * rr * 0.62;
      ctx.beginPath();
      ctx.arc(tx, ty, rr * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
    // Clock hands — spinning slowly
    const t = state.elapsed;
    ctx.strokeStyle = '#1c2a18';
    ctx.lineCap = 'round';
    ctx.lineWidth = 3;
    const hourA = t * 0.6 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(hourA) * rr * 0.35, cy + Math.sin(hourA) * rr * 0.35);
    ctx.stroke();
    ctx.lineWidth = 2;
    const minA = t * 2.2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(minA) * rr * 0.55, cy + Math.sin(minA) * rr * 0.55);
    ctx.stroke();
    ctx.lineCap = 'butt';
    // Center pin
    ctx.fillStyle = '#1c2a18';
    ctx.beginPath();
    ctx.arc(cx, cy, rr * 0.1, 0, Math.PI * 2);
    ctx.fill();
    // "+" badge top-right
    ctx.fillStyle = '#5cd97a';
    ctx.strokeStyle = '#1c2a18';
    ctx.lineWidth = 2;
    const bx = cx + rr * 0.72;
    const by = cy - rr * 0.72;
    ctx.beginPath();
    ctx.arc(bx, by, rr * 0.36, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1c2a18';
    ctx.font = `bold ${Math.round(rr * 0.5)}px "Lilita One", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', bx, by + 1);
  }
  function drawFinish() {
    const m = getMetrics();
    const y = m.gridY;
    const rowH = m.rowH;
    const flagW = 16;
    ctx.save();
    ctx.beginPath(); ctx.rect(m.gridX, y, m.gridW, rowH); ctx.clip();
    const unlocked = state.solvedCount >= state.solvesNeeded;
    for (let x = m.gridX; x < m.gridX + m.gridW; x += flagW) {
      for (let yy = y; yy < y + rowH; yy += flagW) {
        const dark = ((Math.floor((x - m.gridX) / flagW) + Math.floor((yy - y) / flagW)) % 2) === 0;
        if (unlocked) ctx.fillStyle = dark ? '#fff7c8' : '#1c2a18';
        else ctx.fillStyle = dark ? '#a8a39a' : '#3a3a3a';
        ctx.fillRect(x, yy, flagW, flagW);
      }
    }
    ctx.restore();
    ctx.fillStyle = unlocked ? '#ffd24d' : '#ffffff';
    ctx.strokeStyle = '#1c2a18'; ctx.lineWidth = 5;
    ctx.font = `bold ${Math.round(rowH * 0.5)}px "Lilita One", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const label = unlocked ? 'FINISH' : `${state.solvedCount}/${state.solvesNeeded} EATEN`;
    ctx.strokeText(label, m.gridX + m.gridW / 2, y + rowH / 2 + 1);
    ctx.fillText(label, m.gridX + m.gridW / 2, y + rowH / 2 + 1);
    // Lock-flash overlay
    if (state.finishFlash > 0) {
      const a = state.finishFlash / 0.5;
      ctx.fillStyle = `rgba(255, 92, 124, ${a * 0.5})`;
      ctx.fillRect(m.gridX, y, m.gridW, rowH);
    }
  }
  function drawCar(x, y, w, h, color, dir) {
    ctx.save();
    ctx.translate(x + w / 2, y);
    if (dir < 0) ctx.scale(-1, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, h * 0.55, w * 0.45, 4, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = color; ctx.strokeStyle = '#1c2a18'; ctx.lineWidth = 3;
    roundRect(-w/2, -h*0.5, w, h, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1c2a18';
    roundRect(-w*0.25, -h*0.5, w*0.55, h*0.4, 3); ctx.fill();
    ctx.fillStyle = '#a5d8f0';
    roundRect(-w*0.22, -h*0.45, w*0.5, h*0.32, 2); ctx.fill();
    ctx.fillStyle = '#fff4dc';
    ctx.fillRect(w*0.42, -h*0.2, 4, 6);
    ctx.fillRect(w*0.42, h*0.1, 4, 6);
    ctx.fillStyle = '#1c2a18';
    ctx.beginPath();
    ctx.arc(-w*0.3, h*0.45, h*0.15, 0, Math.PI*2);
    ctx.arc(w*0.3, h*0.45, h*0.15, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#cfcfcf';
    ctx.beginPath();
    ctx.arc(-w*0.3, h*0.45, h*0.06, 0, Math.PI*2);
    ctx.arc(w*0.3, h*0.45, h*0.06, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
  function drawLog(x, y, w, h) {
    ctx.save();
    ctx.translate(x + w / 2, y);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath(); ctx.ellipse(0, h*0.4, w*0.5, 4, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#8b5a2b'; ctx.strokeStyle = '#3a2418'; ctx.lineWidth = 3;
    roundRect(-w/2, -h*0.5, w, h, h*0.4); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#5a3a18'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const ly = -h*0.3 + i * h*0.3;
      ctx.beginPath();
      ctx.moveTo(-w*0.45, ly);
      ctx.bezierCurveTo(-w*0.15, ly + 1, w*0.15, ly - 1, w*0.45, ly);
      ctx.stroke();
    }
    ctx.fillStyle = '#5a3a18';
    ctx.beginPath(); ctx.ellipse(-w/2 + 4, 0, h*0.18, h*0.4, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(w/2 - 4, 0, h*0.18, h*0.4, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
  function drawLilypad(x, y, w, h) {
    ctx.save();
    ctx.translate(x + w / 2, y);
    ctx.fillStyle = '#3aa45a'; ctx.strokeStyle = '#1c5a2a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, w/2, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#4a8acf';
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.arc(0, 0, w/2 + 1, -Math.PI/6, Math.PI/6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#2a7a3a'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3 + Math.PI / 6;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * w * 0.4, Math.sin(a) * w * 0.4); ctx.stroke();
    }
    ctx.restore();
  }
  function drawFrog() {
    if (state.lives <= 0 && state.phase === 'game_over') return;
    const m = getMetrics();
    const size = Math.min(m.colW, m.rowH) * 0.62;
    const fx = state.frog.x; const fy = state.frog.y;
    let arc = 0;
    if (state.frog.hopT > 0) {
      const t = state.frog.hopT / 0.18;
      arc = -Math.sin(t * Math.PI) * size * 0.5;
    }
    let deathScale = 1; let deathAlpha = 1;
    if (state.deathT > 0) {
      const dt = 1 - (state.deathT / 1.0);
      deathScale = 1 + dt * 0.5; deathAlpha = 1 - dt * 0.8;
    }
    ctx.save();
    ctx.translate(fx, fy + arc);
    ctx.scale(deathScale, deathScale);
    ctx.globalAlpha = deathAlpha;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, size*0.45 - arc*0.2, size*0.4, 4, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#3a7a3a'; ctx.strokeStyle = '#1c2a18'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(-size*0.32, size*0.2, size*0.18, size*0.1, 0.3, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(size*0.32, size*0.2, size*0.18, size*0.1, -0.3, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#6cc26b';
    ctx.beginPath(); ctx.ellipse(0, 0, size*0.36, size*0.32, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#cfe8b5';
    ctx.beginPath(); ctx.ellipse(0, size*0.05, size*0.24, size*0.16, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#3a7a3a';
    ctx.beginPath();
    ctx.arc(-size*0.18, -size*0.1, size*0.05, 0, Math.PI*2);
    ctx.arc(size*0.15, -size*0.15, size*0.04, 0, Math.PI*2);
    ctx.arc(size*0.05, size*0.1, size*0.04, 0, Math.PI*2);
    ctx.fill();
    const eyeY = -size*0.3; const eyeR = size*0.13;
    ctx.fillStyle = '#6cc26b';
    ctx.beginPath();
    ctx.arc(-size*0.18, eyeY, eyeR, 0, Math.PI*2);
    ctx.arc(size*0.18, eyeY, eyeR, 0, Math.PI*2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-size*0.18, eyeY - 1, eyeR*0.75, 0, Math.PI*2);
    ctx.arc(size*0.18, eyeY - 1, eyeR*0.75, 0, Math.PI*2);
    ctx.fill();
    const facing = state.frog.facing;
    const pdx = facing === 1 ? eyeR * 0.18 : facing === 3 ? -eyeR * 0.18 : 0;
    const pdy = facing === 2 ? eyeR * 0.18 : -eyeR * 0.1;
    ctx.fillStyle = '#1c2a18';
    ctx.beginPath();
    ctx.arc(-size*0.18 + pdx, eyeY - 1 + pdy, eyeR*0.4, 0, Math.PI*2);
    ctx.arc(size*0.18 + pdx, eyeY - 1 + pdy, eyeR*0.4, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = '#1c2a18'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, -size*0.02, size*0.12, 0.15*Math.PI, 0.85*Math.PI); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.restore();
  }
  function drawParticles() {
    for (const p of state.particles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
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
      ctx.strokeStyle = '#1c2a18';
      ctx.strokeText(f.text, 0, 0);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, 0, 0);
      ctx.restore();
    }
  }
  function drawPaused() {
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, H);
    ctx.font = 'bold 80px "Lilita One", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 6; ctx.strokeStyle = '#1c2a18';
    ctx.strokeText('PAUSED', W/2, H/2);
    ctx.fillStyle = '#f4f0d8'; ctx.fillText('PAUSED', W/2, H/2);
  }
  function roundRect(x, y, w, h, r) {
    const rr = Math.min(r, w/2, h/2);
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

  function setupTweaks() {
    const diffRow = document.getElementById('diff-row');
    diffRow.querySelectorAll('.opt').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.value === TWEAKS.difficulty);
      opt.addEventListener('click', () => {
        TWEAKS.difficulty = opt.dataset.value;
        diffRow.querySelectorAll('.opt').forEach(o => o.classList.toggle('active', o.dataset.value === TWEAKS.difficulty));
        if (TWEAKS.difficulty === 'easy') TWEAKS.startTime = 80;
        else if (TWEAKS.difficulty === 'normal') TWEAKS.startTime = 60;
        else TWEAKS.startTime = 45;
        persistTweaks();
      });
    });
    const slider = (id, key, valId, fmt) => {
      const el = document.getElementById(id);
      const val = document.getElementById(valId);
      el.value = TWEAKS[key];
      val.textContent = fmt(TWEAKS[key]);
      el.addEventListener('input', () => {
        TWEAKS[key] = parseFloat(el.value);
        val.textContent = fmt(TWEAKS[key]);
        persistTweaks();
      });
    };
    slider('traffic', 'trafficSpeed', 'traffic-val', v => `${v.toFixed(1)}×`);
    slider('river', 'riverSpeed', 'river-val', v => `${v.toFixed(1)}×`);
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

  state.lanes = buildLanes(1);
  state.activeRule = genRule(1);
  placeFrogAtGrid(4, 12);
  updateHUD();
  updateCountdownBanner();
  updateBottomEq();
  requestAnimationFrame(loop);

  setInterval(() => {
    const now = performance.now();
    if (now - lastTime > 200) {
      lastTime = now - 16;
      loop(now);
    }
  }, 100);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      lastTime = performance.now() - 16;
      requestAnimationFrame(loop);
    }
  });
})();
