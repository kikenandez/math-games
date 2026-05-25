// =====================================================================
// MATH WHACK-A-MOLE
// Moles pop up with numbers. Whack only those that match the active rule.
// Wrong whacks = miss. Letting correct moles escape = miss. 3 misses lose.
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

  const COLS = 4, ROWS = 3;
  function getMetrics() {
    const availW = W - 80;
    const availH = H - 280;
    const cellW = Math.min(180, availW / COLS);
    const cellH = Math.min(160, availH / ROWS);
    const cell = Math.min(cellW, cellH);
    const gridW = cell * COLS;
    const gridH = cell * ROWS;
    const x0 = (W - gridW) / 2;
    const y0 = Math.max(150, (H - gridH) / 2 + 30);
    return { cell, gridW, gridH, x0, y0 };
  }

  const TWEAKS = /*EDITMODE-BEGIN*/{
    "difficulty": "normal",
    "speed": 1.0
  }/*EDITMODE-END*/;

  function isPrime(n) {
    if (n < 2) return false;
    if (n < 4) return true;
    if (n % 2 === 0) return false;
    for (let i = 3; i * i <= n; i += 2) if (n % i === 0) return false;
    return true;
  }
  const RULES = [
    { label: 'EVEN NUMBERS',    test: (n) => n > 0 && n % 2 === 0,    gen: () => randInt(1, 12) * 2 },
    { label: 'ODD NUMBERS',     test: (n) => n % 2 === 1,             gen: () => randInt(0, 12) * 2 + 1 },
    { label: 'MULTIPLES of 3',  test: (n) => n > 0 && n % 3 === 0,    gen: () => randInt(1, 10) * 3 },
    { label: 'MULTIPLES of 5',  test: (n) => n > 0 && n % 5 === 0,    gen: () => randInt(1, 8) * 5 },
    { label: 'PRIMES',          test: (n) => isPrime(n),              gen: () => choice([2, 3, 5, 7, 11, 13, 17, 19, 23, 29]) },
  ];
  function getRule(level) { return RULES[(level - 1) % RULES.length]; }

  const state = {
    phase: 'title',
    score: 0,
    best: parseInt(localStorage.getItem('mathwhack_best') || '0', 10) || 0,
    level: 1,
    misses: 0,
    maxMisses: 3,
    moles: [],                // [{ col, row, value, t, dur, popDur, state, hitT }]
    rule: RULES[0],
    elapsed: 0,
    timeLeft: 30,
    levelDuration: 30,
    spawnTimer: 0,
    spawnInterval: 1.0,
    paused: false,
    floaters: [],
    particles: [],
    shake: 0, shakeX: 0, shakeY: 0,
    hammer: { x: 0, y: 0, t: 0 },
  };

  const rand = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function startGame() {
    state.phase = 'playing';
    state.score = 0;
    state.level = 1;
    state.misses = 0;
    startLevel();
    document.getElementById('overlay').classList.add('hidden');
  }
  function startLevel() {
    state.rule = getRule(state.level);
    state.timeLeft = state.levelDuration = Math.max(20, 35 - state.level * 2);
    state.spawnTimer = 0.5;
    state.spawnInterval = Math.max(0.35, 1.0 - state.level * 0.07) / TWEAKS.speed;
    if (TWEAKS.difficulty === 'easy') state.spawnInterval *= 1.3;
    if (TWEAKS.difficulty === 'hard') state.spawnInterval *= 0.75;
    state.moles = [];
    state.floaters = []; state.particles = [];
    updateHUD();
    updateRuleHUD();
    showFloaterCenter(`LEVEL ${state.level}: ${state.rule.label}`, '#ffd24d');
  }

  // ===== Mole spawn =====
  function spawnMole() {
    // Find a free hole
    const occupied = new Set(state.moles.filter(m => m.alive).map(m => `${m.col},${m.row}`));
    const candidates = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!occupied.has(`${c},${r}`)) candidates.push({ c, r });
      }
    }
    if (!candidates.length) return;
    const { c, r } = choice(candidates);
    // 65% chance to spawn a "correct" mole; 35% wrong (decoy)
    let value;
    if (Math.random() < 0.65) {
      value = state.rule.gen();
    } else {
      let safety = 0;
      do { value = randInt(1, 30); } while (state.rule.test(value) && safety++ < 30);
    }
    // Duration shrinks with level
    const popDur = Math.max(1.3, 2.6 - state.level * 0.15) / TWEAKS.speed;
    state.moles.push({
      col: c, row: r, value,
      t: 0, dur: popDur, popDur,
      state: 'rising',
      hitT: 0,
      alive: true,
    });
  }

  // ===== Input =====
  function pickHoleAt(x, y) {
    const m = getMetrics();
    const gx = Math.floor((x - m.x0) / m.cell);
    const gy = Math.floor((y - m.y0) / m.cell);
    if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) return null;
    return { col: gx, row: gy };
  }
  canvas.addEventListener('mousedown', handleClick);
  canvas.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    handleClick({ clientX: t.clientX, clientY: t.clientY, preventDefault: () => e.preventDefault() });
  }, { passive: false });
  function handleClick(e) {
    if (state.phase !== 'playing') return;
    e.preventDefault();
    const x = e.clientX;
    const y = e.clientY;
    state.hammer.x = x;
    state.hammer.y = y;
    state.hammer.t = 0.25;
    const hole = pickHoleAt(x, y);
    if (!hole) return;
    const mole = state.moles.find(m => m.alive && m.col === hole.col && m.row === hole.row && m.state !== 'hit' && m.state !== 'dropping');
    if (!mole) {
      // Whacked an empty hole — minor penalty.
      state.score = Math.max(0, state.score - 5);
      showFloater(hole.col, hole.row, '−5', '#ff5c7c');
      updateHUD();
      return;
    }
    const correct = state.rule.test(mole.value);
    if (correct) {
      const pts = 50 + state.level * 10;
      state.score += pts;
      mole.state = 'hit';
      mole.hitT = 0;
      showFloater(mole.col, mole.row, `+${pts}`, '#5cd97a');
      burst(mole.col, mole.row, '#5cd97a');
    } else {
      // Wrong mole — miss!
      state.misses++;
      mole.state = 'dropping';
      mole.t = 0;
      mole.dur = 0.3;
      showFloater(mole.col, mole.row, 'WRONG!', '#ff5c7c');
      burst(mole.col, mole.row, '#ff5c7c');
      state.shake = Math.min(0.5, state.shake + 0.3);
      if (state.misses >= state.maxMisses) gameOver('too many misses!');
    }
    updateHUD();
  }
  function togglePause() {
    if (state.phase !== 'playing') return;
    state.paused = !state.paused;
  }
  window.addEventListener('keydown', (e) => {
    if (state.phase === 'title' || state.phase === 'game_over') {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startGame(); return; }
    }
    if (e.key === 'p' || e.key === 'P') { e.preventDefault(); togglePause(); }
  });

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
    state.timeLeft -= dt;
    state.hammer.t -= dt;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      // Level cleared by surviving!
      const bonus = 100 + state.level * 50;
      state.score += bonus;
      showFloaterCenter(`LEVEL ${state.level} CLEAR  +${bonus}`, '#ffd24d');
      state.level++;
      state.phase = 'level_clear';
      // Drop all live moles so the field clears for the next level.
      for (const mole of state.moles) {
        if (mole.alive && mole.state !== 'hit') {
          mole.state = 'dropping';
          mole.t = 0;
          mole.dur = 0.3;
        }
      }
      // Single timed transition — when it fires, start the new level AND flip phase back atomically.
      setTimeout(() => {
        if (state.phase !== 'level_clear') return;
        state.phase = 'playing';
        startLevel();
      }, 1400);
      return;
    }
    updateHUD();

    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnMole();
      state.spawnTimer = state.spawnInterval * rand(0.7, 1.3);
    }

    for (const m of state.moles) {
      if (!m.alive) continue;
      m.t += dt;
      if (m.state === 'rising') {
        if (m.t > 0.25) m.state = 'up';
      } else if (m.state === 'up') {
        if (m.t > m.dur) {
          // Time-out: if correct & not whacked, that's a miss.
          if (state.rule.test(m.value)) {
            state.misses++;
            showFloater(m.col, m.row, 'ESCAPED!', '#ff5c7c');
            state.shake = Math.min(0.3, state.shake + 0.15);
            updateHUD();
            if (state.misses >= state.maxMisses) gameOver('too many escapes!');
          }
          m.state = 'dropping';
          m.t = 0;
          m.dur = 0.3;
        }
      } else if (m.state === 'dropping') {
        if (m.t > m.dur) m.alive = false;
      } else if (m.state === 'hit') {
        m.hitT += dt;
        if (m.hitT > 0.5) m.alive = false;
      }
    }
    state.moles = state.moles.filter(m => m.alive);

    for (const f of state.floaters) { f.t += dt; f.y -= 40 * dt; }
    state.floaters = state.floaters.filter(f => f.t < f.dur);
    for (const p of state.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.gravity ?? 200) * dt; p.life -= dt;
    }
    state.particles = state.particles.filter(p => p.life > 0);
    if (state.shake > 0) {
      state.shake = Math.max(0, state.shake - dt * 3);
      state.shakeX = (Math.random() - 0.5) * state.shake * 12;
      state.shakeY = (Math.random() - 0.5) * state.shake * 12;
    } else { state.shakeX = state.shakeY = 0; }
  }

  function gameOver(reason) {
    state.phase = 'game_over';
    if (state.score > state.best) {
      state.best = state.score;
      localStorage.setItem('mathwhack_best', String(state.best));
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

  function burst(col, row, color) {
    const m = getMetrics();
    const x = m.x0 + (col + 0.5) * m.cell;
    const y = m.y0 + (row + 0.6) * m.cell;
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rand(120, 260);
      state.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
        life: rand(0.5, 0.9), maxLife: 0.9, size: rand(3, 7),
        color: choice([color, '#fff']),
        gravity: 300,
      });
    }
  }
  function showFloater(col, row, text, color) {
    window.MathArcadeAudio?.event(text);
    const m = getMetrics();
    const x = m.x0 + (col + 0.5) * m.cell;
    const y = m.y0 + (row + 0.3) * m.cell;
    state.floaters.push({ x, y, text, color, t: 0, dur: 1.0, big: false });
  }
  function showFloaterCenter(text, color) {
    window.MathArcadeAudio?.event(text);
    state.floaters.push({ x: W / 2, y: H * 0.42, text, color, t: 0, dur: 1.4, big: true });
  }

  function updateHUD() {
    document.getElementById('score').textContent = state.score;
    document.getElementById('level').textContent = state.level;
    document.getElementById('time').textContent = Math.ceil(state.timeLeft);
    const m = document.getElementById('misses');
    m.textContent = '✕'.repeat(state.misses) + '○'.repeat(Math.max(0, state.maxMisses - state.misses));
  }
  function updateRuleHUD() {
    document.getElementById('rule-text').textContent = state.rule.label;
  }

  // ===== Drawing =====
  function draw() {
    ctx.save();
    ctx.translate(state.shakeX, state.shakeY);
    drawBg();
    drawHoles();
    drawMoles();
    drawHammer();
    drawParticles();
    drawFloaters();
    if (state.paused) drawPaused();
    ctx.restore();
  }
  function drawBg() {
    // Grassy field
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#3a7a3a');
    g.addColorStop(0.7, '#5cb85c');
    g.addColorStop(1, '#2e8a3e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // Subtle grass blades
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 100; i++) {
      const x = (i * 137) % W;
      const y = (i * 211) % H;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 1, y - 4);
      ctx.stroke();
    }
    // Sun rays from top center
    ctx.fillStyle = 'rgba(255, 240, 180, 0.05)';
    for (let i = 0; i < 8; i++) {
      ctx.save();
      ctx.translate(W / 2, -40);
      ctx.rotate((i / 8) * Math.PI * 2 + state.elapsed * 0.05);
      ctx.fillRect(-40, 0, 80, H + 100);
      ctx.restore();
    }
  }
  function drawHoles() {
    const m = getMetrics();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cx = m.x0 + (c + 0.5) * m.cell;
        const cy = m.y0 + (r + 0.55) * m.cell;
        const rad = m.cell * 0.35;
        // Mound (light grassy ring)
        ctx.fillStyle = '#4ba14b';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 4, rad * 1.4, rad * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3a8a3a';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 2, rad * 1.2, rad * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        // Dirt rim
        ctx.fillStyle = '#6b4421';
        ctx.beginPath();
        ctx.ellipse(cx, cy, rad * 1.1, rad * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
        // Hole interior (dark)
        ctx.fillStyle = '#1a0c08';
        ctx.beginPath();
        ctx.ellipse(cx, cy, rad, rad * 0.36, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  function drawMoles() {
    const m = getMetrics();
    for (const mole of state.moles) {
      const cx = m.x0 + (mole.col + 0.5) * m.cell;
      const cyHole = m.y0 + (mole.row + 0.55) * m.cell;
      const rad = m.cell * 0.32;
      // Compute vertical offset based on state
      let popY = 0;
      if (mole.state === 'rising') {
        popY = -rad * 1.2 * Math.min(1, mole.t / 0.25);
      } else if (mole.state === 'up') {
        popY = -rad * 1.2;
        const oscPhase = clamp((mole.t - 0.0) / mole.dur, 0, 1);
        // Slight bobble while up
        popY += Math.sin(mole.t * 6) * 1.5;
      } else if (mole.state === 'dropping') {
        popY = -rad * 1.2 * (1 - Math.min(1, mole.t / mole.dur));
      } else if (mole.state === 'hit') {
        // Stunned: tilts back, drops
        popY = -rad * 1.2 + mole.hitT * 30;
      }
      // Hole clip — only show mole above the hole edge
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx - rad * 1.2, cyHole - rad * 2.5, rad * 2.4, rad * 2.5);
      ctx.clip();
      // Mole body
      const cy = cyHole + popY;
      const bodyColor = (mole.state === 'hit') ? '#7a3a3a' : '#9c6638';
      ctx.fillStyle = bodyColor;
      ctx.strokeStyle = '#3a2418';
      ctx.lineWidth = 3;
      // Head + body as one rounded oval
      ctx.beginPath();
      ctx.ellipse(cx, cy, rad, rad * 1.05, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      // Lighter belly
      ctx.fillStyle = '#e8c89a';
      ctx.beginPath();
      ctx.ellipse(cx, cy + rad * 0.3, rad * 0.55, rad * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      if (mole.state !== 'hit') {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx - rad * 0.32, cy - rad * 0.25, rad * 0.18, 0, Math.PI * 2);
        ctx.arc(cx + rad * 0.32, cy - rad * 0.25, rad * 0.18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a1410';
        ctx.beginPath();
        ctx.arc(cx - rad * 0.32, cy - rad * 0.23, rad * 0.09, 0, Math.PI * 2);
        ctx.arc(cx + rad * 0.32, cy - rad * 0.23, rad * 0.09, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // X eyes
        ctx.strokeStyle = '#1a1410';
        ctx.lineWidth = 2.5;
        const drawX = (xx, yy) => {
          ctx.beginPath();
          ctx.moveTo(xx - rad * 0.16, yy - rad * 0.16);
          ctx.lineTo(xx + rad * 0.16, yy + rad * 0.16);
          ctx.moveTo(xx + rad * 0.16, yy - rad * 0.16);
          ctx.lineTo(xx - rad * 0.16, yy + rad * 0.16);
          ctx.stroke();
        };
        drawX(cx - rad * 0.32, cy - rad * 0.25);
        drawX(cx + rad * 0.32, cy - rad * 0.25);
      }
      // Nose
      ctx.fillStyle = '#ff5c7c';
      ctx.beginPath();
      ctx.ellipse(cx, cy - rad * 0.05, rad * 0.14, rad * 0.10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3a2418';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // Whiskers
      ctx.strokeStyle = '#1a1410';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - rad * 0.1, cy + rad * 0.05);
      ctx.lineTo(cx - rad * 0.6, cy);
      ctx.moveTo(cx - rad * 0.1, cy + rad * 0.1);
      ctx.lineTo(cx - rad * 0.55, cy + rad * 0.15);
      ctx.moveTo(cx + rad * 0.1, cy + rad * 0.05);
      ctx.lineTo(cx + rad * 0.6, cy);
      ctx.moveTo(cx + rad * 0.1, cy + rad * 0.1);
      ctx.lineTo(cx + rad * 0.55, cy + rad * 0.15);
      ctx.stroke();
      // Number sign on belly
      if (mole.state === 'up' || mole.state === 'rising') {
        ctx.fillStyle = '#fff7e0';
        ctx.strokeStyle = '#2a1a10';
        ctx.lineWidth = Math.max(2, rad * 0.08);
        const valueText = String(mole.value);
        const sw = rad * 1.35;
        const sh = rad * 0.72;
        ctx.beginPath();
        const sx = cx - sw / 2;
        const sy = cy + rad * 0.1;
        const rr = Math.max(5, rad * 0.14);
        ctx.moveTo(sx + rr, sy);
        ctx.lineTo(sx + sw - rr, sy);
        ctx.quadraticCurveTo(sx + sw, sy, sx + sw, sy + rr);
        ctx.lineTo(sx + sw, sy + sh - rr);
        ctx.quadraticCurveTo(sx + sw, sy + sh, sx + sw - rr, sy + sh);
        ctx.lineTo(sx + rr, sy + sh);
        ctx.quadraticCurveTo(sx, sy + sh, sx, sy + sh - rr);
        ctx.lineTo(sx, sy + rr);
        ctx.quadraticCurveTo(sx, sy, sx + rr, sy);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#2a1a10';
        const maxTextWidth = sw * 0.86;
        let fontSize = sh * 0.95;
        if (valueText.length >= 3) fontSize = sh * 0.78;
        ctx.font = `bold ${Math.round(fontSize)}px "Lilita One", sans-serif`;
        while (ctx.measureText(valueText).width > maxTextWidth && fontSize > rad * 0.34) {
          fontSize -= 1;
          ctx.font = `bold ${Math.round(fontSize)}px "Lilita One", sans-serif`;
        }
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(valueText, cx, sy + sh / 2 + rad * 0.02);
      }
      ctx.restore();
    }
  }
  function drawHammer() {
    if (state.hammer.t <= 0) return;
    const x = state.hammer.x;
    const y = state.hammer.y;
    const t = state.hammer.t / 0.25; // 1 → 0
    const scale = 0.6 + (1 - t) * 0.5;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.5 + (1 - t) * 0.8);
    ctx.scale(scale, scale);
    // Handle
    ctx.fillStyle = '#7a5a3a';
    ctx.strokeStyle = '#2a1a10';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.rect(-4, -50, 8, 50);
    ctx.fill(); ctx.stroke();
    // Head
    ctx.fillStyle = '#9c8a7a';
    ctx.beginPath();
    ctx.rect(-22, -60, 44, 22);
    ctx.fill(); ctx.stroke();
    // Stripe
    ctx.fillStyle = '#5a4a3a';
    ctx.fillRect(-22, -52, 44, 4);
    ctx.restore();
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
      ctx.strokeStyle = '#2a1a10';
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
    ctx.lineWidth = 6; ctx.strokeStyle = '#2a1a10';
    ctx.strokeText('PAUSED', W / 2, H / 2);
    ctx.fillStyle = '#fff7e0'; ctx.fillText('PAUSED', W / 2, H / 2);
  }

  // ===== Tweaks =====
  function setupTweaks() {
    const diffRow = document.getElementById('diff-row');
    diffRow.querySelectorAll('.opt').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.value === TWEAKS.difficulty);
      opt.addEventListener('click', () => {
        TWEAKS.difficulty = opt.dataset.value;
        diffRow.querySelectorAll('.opt').forEach(o => o.classList.toggle('active', o.dataset.value === TWEAKS.difficulty));
        persistTweaks();
      });
    });
    const sp = document.getElementById('speed');
    const spVal = document.getElementById('speed-val');
    sp.value = TWEAKS.speed;
    spVal.textContent = `${TWEAKS.speed.toFixed(1)}×`;
    sp.addEventListener('input', () => {
      TWEAKS.speed = parseFloat(sp.value);
      spVal.textContent = `${TWEAKS.speed.toFixed(1)}×`;
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

  // Title-screen idle: spawn a few decorative moles
  for (let i = 0; i < 3; i++) {
    state.moles.push({
      col: randInt(0, COLS - 1), row: randInt(0, ROWS - 1),
      value: randInt(1, 20),
      t: 0, dur: 999, popDur: 999,
      state: 'up',
      hitT: 0, alive: true,
    });
  }
  state.rule = RULES[0];
  updateHUD();
  updateRuleHUD();

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) lastTime = performance.now() - 16;
  });
  requestAnimationFrame(loop);
})();
