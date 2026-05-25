// =====================================================================
// MATH INVADERS — HTML5 cartoon redesign
// Faithful gameplay rules adapted from kikenandez/retroGames mathinvaders.py
// =====================================================================

(() => {
  // ---------- Canvas ----------
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

  // ---------- Constants (faithful to mathinvaders.py) ----------
  const FPS_BASE = 60;
  const BASE_SPEED = 0.38;         // px/frame at wave 1
  const WAVE_SPEED_STEP = 0.09;    // per speed tier
  const DROP_DISTANCE = 28;        // px per side-touch drop (slightly bigger for HTML5 scale)
  const DROP_SPEED = 2.4;          // px/frame while dropping
  const KILL_POINTS = 100;
  const COMBO_BONUS = 50;
  const WRONG_PENALTY = 25;
  const WAVE_BASE_BONUS = 500;
  const WAVE_PER_BONUS = 100;
  const BOUNCE_BONUS = 10;
  const WRONG_SPEED_PENALTY = 0.05;
  const WRONG_SPEED_MAX = 0.50;
  const MOTHERSHIP_KILL_POINTS = 500;
  const MOTHERSHIP_MIN_DELAY = 5.0;  // seconds
  const MOTHERSHIP_MAX_DELAY = 11.0;
  const MOTHERSHIP_SPEED = 1.6;      // px/frame
  const INPUT_MAX_LEN = 5;

  // Operation colors
  const OP_COLORS = {
    '+': { body: '#5cd97a', dark: '#2b8a45', glow: 'rgba(92,217,122,0.55)', name: 'add' },
    '−': { body: '#5ccfe6', dark: '#2b7a8a', glow: 'rgba(92,207,230,0.55)', name: 'sub' },
    '×': { body: '#f4c84c', dark: '#a5851f', glow: 'rgba(244,200,76,0.55)', name: 'mul' },
    '÷': { body: '#e36ce0', dark: '#8a3b8a', glow: 'rgba(227,108,224,0.55)', name: 'div' },
  };

  // ---------- Tweaks ----------
  const TWEAKS = /*EDITMODE-BEGIN*/{
    "difficulty": "inferno",
    "formSpeed": 1.0,
    "ufoFreq": 1.0,
    "bgSpeed": 1.0,
    "allowNegatives": false,
    "antiSpam": true
  }/*EDITMODE-END*/;

  // ---------- Difficulty config ----------
  // Translates the pygame DifficultyConfig — formation grid + op unlocks + speed
  const DIFFICULTY = {
    easy:     { rows: [2, 3, 3, 3, 4],     cols: [4, 4, 5, 5, 5], speedMul: 0.75, opWave: { '−': 3, '×': 5, '÷': 7 }, negWave: 99 },
    moderate: { rows: [3, 3, 4, 4, 5],     cols: [5, 5, 5, 6, 6], speedMul: 0.9,  opWave: { '−': 2, '×': 4, '÷': 6 }, negWave: 8 },
    hard:     { rows: [3, 4, 4, 5, 5],     cols: [5, 6, 6, 7, 7], speedMul: 1.0,  opWave: { '−': 2, '×': 4, '÷': 6 }, negWave: 7 },
    inferno:  { rows: [3, 4, 4, 5, 5],     cols: [5, 6, 7, 7, 7], speedMul: 1.1,  opWave: { '−': 2, '×': 4, '÷': 6 }, negWave: 7 },
  };
  function getDiffConfig() { return DIFFICULTY[TWEAKS.difficulty] || DIFFICULTY.inferno; }
  function getFormationSize(wave) {
    const d = getDiffConfig();
    const idx = Math.min(wave - 1, d.rows.length - 1);
    return { rows: d.rows[idx], cols: d.cols[idx] };
  }
  function getAvailableOps(wave) {
    const d = getDiffConfig();
    const ops = ['+'];
    if (wave >= d.opWave['−']) ops.push('−');
    if (wave >= d.opWave['×']) ops.push('×');
    if (wave >= d.opWave['÷']) ops.push('÷');
    return ops;
  }
  function negativesAllowed(wave) {
    if (TWEAKS.allowNegatives) return true;
    const d = getDiffConfig();
    return wave >= d.negWave;
  }
  function getFormationSpeed(wave) {
    const d = getDiffConfig();
    // Compound +10% per wave
    return BASE_SPEED * Math.pow(1.1, wave - 1) * d.speedMul * TWEAKS.formSpeed;
  }

  // ---------- State ----------
  const state = {
    phase: 'title', // title | playing | wave_clear | paused | game_over
    score: 0,
    best: parseInt(localStorage.getItem('mathinvaders_best') || '0', 10) || 0,
    wave: 1,
    invaders: [],
    mothership: null,
    particles: [],
    flashes: [],
    floaters: [],
    beams: [],
    inputBuffer: '',
    formationDir: 1,
    formationDropping: false,
    formationDropTarget: 0,
    formationDropDone: false,
    wrongSpeedBonus: 0,
    bounces: 0,
    kills: 0,
    ufoKills: 0,
    multiKillSubmits: 0,
    bestCombo: 0,
    actions: 0,
    wrongs: 0,
    mothershipTimer: 6.0,
    mothershipSelfBonus: 0,
    waveClearTimer: 0,
    elapsed: 0,
    starfield: null,
    nebulaSurface: null,
    shake: 0,
    shakeX: 0, shakeY: 0,
    baseRecoil: 0,
    basePulse: 0,
  };

  // ---------- Helpers ----------
  const rand = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // ---------- Math expression generator ----------
  // Returns {left, op, right, result, text}
  function genExpression(wave, hardMode = false) {
    const ops = getAvailableOps(wave);
    const op = choice(ops);
    const allowNeg = negativesAllowed(wave);
    const maxN = hardMode ? Math.min(30, 8 + wave * 2) : Math.min(20, 5 + wave);
    let a, b, result;
    if (op === '+') {
      a = randInt(1, maxN); b = randInt(1, maxN);
      if (allowNeg && Math.random() < 0.3) a = -a;
      if (allowNeg && Math.random() < 0.25) b = -b;
      result = a + b;
    } else if (op === '−') {
      a = randInt(1, maxN + 5); b = randInt(1, maxN);
      if (!allowNeg && b > a) { const t = a; a = b; b = t; }
      if (allowNeg && Math.random() < 0.25) b = -b;
      if (allowNeg && Math.random() < 0.2) a = -a;
      result = a - b;
    } else if (op === '×') {
      const cap = Math.min(9, 3 + Math.floor(wave / 2));
      a = randInt(2, cap); b = randInt(2, cap);
      if (allowNeg && Math.random() < 0.2) a = -a;
      result = a * b;
    } else { // ÷
      b = randInt(2, Math.min(9, 4 + Math.floor(wave / 2)));
      result = randInt(2, 12);
      a = b * result;
      if (allowNeg && Math.random() < 0.18) { a = -a; result = -result; }
    }
    const fmt = (n) => n < 0 ? `(${n})` : `${n}`;
    return { left: fmt(a), op, right: fmt(b), result };
  }

  // ---------- Formation / invaders ----------
  function getCellSize() {
    return {
      w: clamp(W * 0.092, 78, 130),
      h: clamp(H * 0.072, 56, 92),
      padX: 14,
      padY: 12,
    };
  }
  function getPlayAreaBounds() {
    const top = 80; // below HUD
    const bottom = H - 130; // above input bar
    return { top, bottom, left: 24, right: W - 24 };
  }

  function spawnFormation(wave) {
    const { rows, cols } = getFormationSize(wave);
    const cs = getCellSize();
    const formationW = cols * cs.w + (cols - 1) * cs.padX;
    const startX = (W - formationW) / 2;
    const startY = 110;
    state.invaders = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const expr = genExpression(wave);
        state.invaders.push({
          row: r, col: c, rows, cols,
          x: startX + c * (cs.w + cs.padX),
          y: startY + r * (cs.h + cs.padY),
          w: cs.w, h: cs.h,
          expr,
          alive: true,
          deathT: 0,
          bobPhase: Math.random() * Math.PI * 2,
        });
      }
    }
    state.formationDir = 1;
    state.formationDropping = false;
    state.formationDropDone = false;
  }

  function getFormationBounds() {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const iv of state.invaders) {
      if (!iv.alive) continue;
      minX = Math.min(minX, iv.x);
      maxX = Math.max(maxX, iv.x + iv.w);
      minY = Math.min(minY, iv.y);
      maxY = Math.max(maxY, iv.y + iv.h);
    }
    if (minX === Infinity) return null;
    return { minX, maxX, minY, maxY };
  }

  function mutateBorderColumn(touchedSide) {
    // 'left' or 'right' — only the outer-edge ships in the touched column re-roll
    const b = getFormationBounds();
    if (!b) return;
    const cs = getCellSize();
    const edgeX = touchedSide === 'left' ? b.minX : b.maxX - cs.w;
    for (const iv of state.invaders) {
      if (!iv.alive) continue;
      if (Math.abs(iv.x - edgeX) < 2) {
        iv.expr = genExpression(state.wave);
        // flash
        state.flashes.push({
          x: iv.x, y: iv.y, w: iv.w, h: iv.h,
          color: '#fff',
          life: 0.4, total: 0.4,
        });
      }
    }
  }

  // ---------- Mothership ----------
  function maybeSpawnMothership(dt) {
    if (state.mothership) return;
    state.mothershipTimer -= dt * TWEAKS.ufoFreq;
    if (state.mothershipTimer <= 0) {
      spawnMothership();
      state.mothershipTimer = rand(MOTHERSHIP_MIN_DELAY, MOTHERSHIP_MAX_DELAY);
    }
  }
  function spawnMothership() {
    const expr = genExpression(state.wave, true);
    const dir = Math.random() < 0.5 ? 1 : -1;
    const mw = 180, mh = 56;
    state.mothership = {
      x: dir > 0 ? -mw - 20 : W + 20,
      y: 78,
      w: mw, h: mh,
      vx: dir * (MOTHERSHIP_SPEED + state.mothershipSelfBonus) * FPS_BASE,
      expr,
      alive: true,
      deathT: 0,
      pulse: 0,
    };
  }
  function updateMothership(dt) {
    const m = state.mothership;
    if (!m) return;
    if (!m.alive) {
      m.deathT += dt;
      if (m.deathT > 0.5) state.mothership = null;
      return;
    }
    m.x += m.vx * dt;
    m.pulse += dt;
    if ((m.vx > 0 && m.x > W + 20) || (m.vx < 0 && m.x + m.w < -20)) {
      state.mothership = null;
    }
  }

  // ---------- Update ----------
  let lastTime = performance.now();
  function loop(now) {
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.1) dt = 0.1;
    if (state.phase === 'playing') update(dt);
    else if (state.phase === 'wave_clear') updateWaveClear(dt);
    else updateIdle(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function updateIdle(dt) {
    state.elapsed += dt * 0.5;
    state.basePulse += dt;
  }

  function update(dt) {
    state.elapsed += dt;
    state.basePulse += dt;

    // Update mothership
    maybeSpawnMothership(dt);
    updateMothership(dt);

    // Formation movement (px/sec)
    const baseSpeed = (getFormationSpeed(state.wave) + state.wrongSpeedBonus) * FPS_BASE;
    const bounds = getFormationBounds();
    const playB = getPlayAreaBounds();

    if (state.invaders.some(iv => iv.alive)) {
      if (state.formationDropping) {
        // Drop until we've moved DROP_DISTANCE
        const drop = DROP_SPEED * FPS_BASE * dt;
        for (const iv of state.invaders) iv.y += drop;
        state.formationDropTarget -= drop;
        if (state.formationDropTarget <= 0) {
          state.formationDropping = false;
        }
      } else if (bounds) {
        const dx = baseSpeed * state.formationDir * dt;
        let willHit = null;
        if (state.formationDir > 0 && bounds.maxX + dx >= playB.right) willHit = 'right';
        if (state.formationDir < 0 && bounds.minX + dx <= playB.left) willHit = 'left';
        if (willHit) {
          // Snap to edge
          const snapDx = willHit === 'right' ? playB.right - bounds.maxX : playB.left - bounds.minX;
          for (const iv of state.invaders) iv.x += snapDx;
          state.formationDir *= -1;
          state.formationDropping = true;
          state.formationDropTarget = DROP_DISTANCE;
          state.bounces++;
          state.score += BOUNCE_BONUS;
          updateHUD();
          mutateBorderColumn(willHit);
        } else {
          for (const iv of state.invaders) iv.x += dx;
        }
      }

      // Bob phase update
      for (const iv of state.invaders) {
        iv.bobPhase += dt * 4;
      }

      // Check if any invader has crossed the defense line
      const defenseY = playB.bottom - 14;
      for (const iv of state.invaders) {
        if (iv.alive && iv.y + iv.h * 0.6 >= defenseY) {
          gameOver();
          return;
        }
      }
    }

    // Dying invaders
    for (const iv of state.invaders) {
      if (!iv.alive) {
        iv.deathT += dt;
      }
    }
    state.invaders = state.invaders.filter(iv => iv.alive || iv.deathT < 0.6);

    // Wave clear check
    if (!state.invaders.some(iv => iv.alive)) {
      // Wave cleared!
      const waveBonus = WAVE_BASE_BONUS + WAVE_PER_BONUS * state.wave;
      state.score += waveBonus;
      showFloaterCenter(`WAVE ${state.wave} CLEAR  +${waveBonus}`, '#ffc94d');
      state.phase = 'wave_clear';
      state.waveClearTimer = 1.8;
      state.mothershipSelfBonus = 0;
      updateHUD();
    }

    // Particles
    for (const p of state.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.gravity ?? 0) * dt;
      p.rot += p.rotV * dt;
      p.life -= dt;
    }
    state.particles = state.particles.filter(p => p.life > 0);

    // Flashes
    for (const f of state.flashes) f.life -= dt;
    state.flashes = state.flashes.filter(f => f.life > 0);

    // Floaters
    for (const f of state.floaters) {
      f.t += dt;
      f.y -= 50 * dt;
    }
    state.floaters = state.floaters.filter(f => f.t < f.dur);

    // Beams
    for (const b of state.beams) b.life -= dt;
    state.beams = state.beams.filter(b => b.life > 0);

    // Base recoil decay
    if (state.baseRecoil > 0) state.baseRecoil = Math.max(0, state.baseRecoil - dt * 4);

    // Screen shake decay
    if (state.shake > 0) {
      state.shake = Math.max(0, state.shake - dt * 3);
      state.shakeX = (Math.random() - 0.5) * state.shake * 14;
      state.shakeY = (Math.random() - 0.5) * state.shake * 14;
    } else {
      state.shakeX = state.shakeY = 0;
    }
  }

  function updateWaveClear(dt) {
    state.elapsed += dt;
    state.basePulse += dt;
    // Ambient ticks
    for (const p of state.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
    state.particles = state.particles.filter(p => p.life > 0);
    for (const f of state.floaters) { f.t += dt; f.y -= 50 * dt; }
    state.floaters = state.floaters.filter(f => f.t < f.dur);

    state.waveClearTimer -= dt;
    if (state.waveClearTimer <= 0) {
      state.wave++;
      spawnFormation(state.wave);
      state.phase = 'playing';
      updateHUD();
    }
  }

  // ---------- Submit ----------
  function submitAnswer() {
    if (state.phase !== 'playing') return;
    const buf = state.inputBuffer;
    if (buf === '' || buf === '-') return;
    const val = parseInt(buf, 10);
    if (isNaN(val)) { state.inputBuffer = ''; updateAnswerDisplay(); return; }
    state.actions++;
    state.inputBuffer = '';
    updateAnswerDisplay();

    let hits = 0;
    let hitInvaders = [];
    let hitMothership = false;

    for (const iv of state.invaders) {
      if (!iv.alive) continue;
      if (iv.expr.result === val) {
        hitInvaders.push(iv);
      }
    }
    if (state.mothership && state.mothership.alive && state.mothership.expr.result === val) {
      hitMothership = true;
    }

    if (hitInvaders.length === 0 && !hitMothership) {
      // Wrong
      onWrong();
      return;
    }

    // Score
    let gained = 0;
    if (hitInvaders.length > 0) {
      gained += KILL_POINTS * hitInvaders.length;
      gained += COMBO_BONUS * Math.max(0, hitInvaders.length - 1);
      state.kills += hitInvaders.length;
      if (hitInvaders.length > state.bestCombo) state.bestCombo = hitInvaders.length;
      if (hitInvaders.length > 1) state.multiKillSubmits++;
    }
    if (hitMothership) {
      gained += MOTHERSHIP_KILL_POINTS;
      state.ufoKills++;
    }
    state.score += gained;

    // Visuals: beam from base to each, then explode
    const baseX = W / 2;
    const baseY = H - 140;
    for (const iv of hitInvaders) {
      state.beams.push({ x1: baseX, y1: baseY, x2: iv.x + iv.w / 2, y2: iv.y + iv.h / 2, life: 0.2, total: 0.2, color: '#ffc94d' });
      iv.alive = false;
      iv.deathT = 0;
      explodeInvader(iv);
    }
    if (hitMothership) {
      const m = state.mothership;
      state.beams.push({ x1: baseX, y1: baseY, x2: m.x + m.w / 2, y2: m.y + m.h / 2, life: 0.25, total: 0.25, color: '#e36ce0' });
      m.alive = false;
      m.deathT = 0;
      explodeMothership(m);
    }
    state.baseRecoil = 1;

    // Floating "+pts"
    if (hitInvaders.length > 0) {
      const cx = hitInvaders.reduce((s, i) => s + i.x + i.w / 2, 0) / hitInvaders.length;
      const cy = hitInvaders.reduce((s, i) => s + i.y, 0) / hitInvaders.length;
      showFloater(cx, cy - 10, `+${gained}`, '#ffc94d');
      if (hitInvaders.length >= 2) {
        showFloaterCenter(`COMBO ×${hitInvaders.length}!`, '#ff6b3d');
      }
    }
    if (hitMothership && hitInvaders.length === 0) {
      const m = state.mothership;
      showFloater(m.x + m.w / 2, m.y, `+${MOTHERSHIP_KILL_POINTS}`, '#e36ce0');
    }

    updateHUD();
    // Hide first hint
    document.getElementById('first-hint').classList.remove('show');
  }

  function onWrong() {
    state.wrongs++;
    state.score = Math.max(0, state.score - WRONG_PENALTY);
    if (TWEAKS.antiSpam) {
      state.wrongSpeedBonus = Math.min(WRONG_SPEED_MAX, state.wrongSpeedBonus + WRONG_SPEED_PENALTY);
    }
    state.shake = Math.min(0.5, state.shake + 0.3);
    showFloaterCenter(`MISS −${WRONG_PENALTY}`, '#ff4d6b');
    updateHUD();
    // LCD shake
    const lcd = document.querySelector('.lcd');
    if (lcd) lcd.animate(
      [{transform: 'translateX(-6px)'}, {transform: 'translateX(6px)'}, {transform: 'translateX(0)'}],
      { duration: 200 }
    );
  }

  function explodeInvader(iv) {
    const col = OP_COLORS[iv.expr.op];
    const cx = iv.x + iv.w / 2;
    const cy = iv.y + iv.h / 2;
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rand(120, 360);
      state.particles.push({
        x: cx, y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        rot: 0, rotV: rand(-8, 8),
        size: rand(5, 11),
        life: rand(0.4, 0.8),
        maxLife: 0.8,
        color: choice([col.body, '#fff4dc', '#ffc94d', col.dark]),
        gravity: 400,
        kind: 'spark',
      });
    }
    // Star ring
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      state.particles.push({
        x: cx, y: cy,
        vx: Math.cos(a) * 220,
        vy: Math.sin(a) * 220,
        rot: 0, rotV: 0,
        size: 7,
        life: 0.28, maxLife: 0.28,
        color: '#fff',
        gravity: 0,
        kind: 'ring',
      });
    }
  }
  function explodeMothership(m) {
    const cx = m.x + m.w / 2;
    const cy = m.y + m.h / 2;
    for (let i = 0; i < 32; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rand(180, 480);
      state.particles.push({
        x: cx, y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        rot: 0, rotV: rand(-10, 10),
        size: rand(7, 14),
        life: rand(0.6, 1.1),
        maxLife: 1.1,
        color: choice(['#e36ce0', '#ffc94d', '#fff', '#5ccfe6']),
        gravity: 300,
        kind: 'spark',
      });
    }
    state.shake = Math.min(1, state.shake + 0.6);
  }

  function showFloater(x, y, text, color) {
    state.floaters.push({ x, y, text, color, t: 0, dur: 1.1, big: false });
  }
  function showFloaterCenter(text, color) {
    state.floaters.push({ x: W / 2, y: H * 0.35, text, color, t: 0, dur: 1.4, big: true });
  }

  // ---------- HUD ----------
  function updateHUD() {
    document.getElementById('score').textContent = state.score;
    document.getElementById('wave').textContent = state.wave;
    const wg = document.getElementById('warn-group');
    if (state.wrongSpeedBonus > 0) {
      wg.style.display = 'flex';
      document.getElementById('spd-val').textContent = '+' + state.wrongSpeedBonus.toFixed(2);
    } else {
      wg.style.display = 'none';
    }
  }
  function updateAnswerDisplay() {
    const el = document.getElementById('ans-val');
    if (!el) return;
    if (state.inputBuffer === '') {
      el.innerHTML = '<span class="cursor">_</span>';
    } else {
      el.innerHTML = `${state.inputBuffer}<span class="cursor">|</span>`;
    }
  }

  // ---------- Input ----------
  function pressDigit(d) {
    if (state.phase !== 'playing') return;
    if (state.inputBuffer.length >= INPUT_MAX_LEN) return;
    if (state.inputBuffer === '0') state.inputBuffer = '';
    state.inputBuffer += d;
    updateAnswerDisplay();
  }
  function pressMinus() {
    if (state.phase !== 'playing') return;
    if (state.inputBuffer === '') state.inputBuffer = '-';
    else if (state.inputBuffer.startsWith('-')) state.inputBuffer = state.inputBuffer.slice(1);
    else state.inputBuffer = '-' + state.inputBuffer;
    updateAnswerDisplay();
  }
  function pressBackspace() {
    if (state.phase !== 'playing') return;
    state.inputBuffer = state.inputBuffer.slice(0, -1);
    updateAnswerDisplay();
  }

  window.addEventListener('keydown', (e) => {
    if (state.phase === 'title' || state.phase === 'game_over') {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startGame(); return; }
    }
    if (e.key === 'p' || e.key === 'P') { e.preventDefault(); togglePause(); return; }
    if (e.key === 'Enter') { e.preventDefault(); submitAnswer(); return; }
    if (e.key === 'Backspace') { e.preventDefault(); pressBackspace(); return; }
    if (/^[0-9]$/.test(e.key)) { e.preventDefault(); pressDigit(e.key); return; }
    if (e.key === '-' || e.key === '_' || e.key === 'Subtract') { e.preventDefault(); pressMinus(); return; }
  });

  // ---------- Phase changes ----------
  function startGame() {
    state.phase = 'playing';
    state.score = 0;
    state.wave = 1;
    state.invaders = [];
    state.particles = [];
    state.floaters = [];
    state.beams = [];
    state.flashes = [];
    state.mothership = null;
    state.mothershipTimer = 6.0;
    state.mothershipSelfBonus = 0;
    state.inputBuffer = '';
    state.wrongSpeedBonus = 0;
    state.bounces = 0;
    state.kills = 0;
    state.ufoKills = 0;
    state.multiKillSubmits = 0;
    state.bestCombo = 0;
    state.actions = 0;
    state.wrongs = 0;
    state.shake = 0;
    state.baseRecoil = 0;
    spawnFormation(1);
    document.getElementById('overlay').classList.add('hidden');
    updateHUD();
    updateAnswerDisplay();
    setTimeout(() => {
      document.getElementById('first-hint').classList.add('show');
      setTimeout(() => document.getElementById('first-hint').classList.remove('show'), 4500);
    }, 600);
  }

  function togglePause() {
    if (state.phase === 'playing') {
      state.phase = 'paused';
      document.body.classList.add('paused');
    } else if (state.phase === 'paused') {
      state.phase = 'playing';
      document.body.classList.remove('paused');
    }
  }

  function gameOver() {
    state.phase = 'game_over';
    if (state.score > state.best) {
      state.best = state.score;
      localStorage.setItem('mathinvaders_best', String(state.best));
    }
    showGameOverCard();
  }
  function showGameOverCard() {
    const overlay = document.getElementById('overlay');
    overlay.querySelector('.card').remove();
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h1><span class="math">GAME</span> <span class="inv">OVER</span></h1>
      <div class="sub">the formation breached the defense line</div>
      <div class="stats-row">
        <div class="stat-chip"><div class="stat-label">Score</div><div class="stat-val">${state.score}</div></div>
        <div class="stat-chip"><div class="stat-label">Wave</div><div class="stat-val">${state.wave}</div></div>
        <div class="stat-chip"><div class="stat-label">Kills</div><div class="stat-val">${state.kills}</div></div>
        <div class="stat-chip hi"><div class="stat-label">Best</div><div class="stat-val">${state.best}</div></div>
      </div>
      <button class="big-btn" id="restart-btn">PLAY AGAIN</button>
    `;
    overlay.appendChild(card);
    overlay.classList.remove('hidden');
    document.getElementById('restart-btn').addEventListener('click', startGame);
  }
  document.getElementById('start-btn').addEventListener('click', startGame);

  // =====================================================================
  // RENDERING
  // =====================================================================

  function draw() {
    ctx.save();
    ctx.translate(state.shakeX, state.shakeY);

    drawSpace();
    drawNebula();
    drawStars();
    drawDistantPlanet();
    drawDefenseLine();
    drawPlayerBase();
    drawInvaders();
    drawMothership();
    drawBeams();
    drawParticles();
    drawFlashes();
    drawFloaters();

    ctx.restore();
  }

  // ---------- Space background ----------
  function drawSpace() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#040414');
    g.addColorStop(0.5, '#0a0e26');
    g.addColorStop(1, '#04050f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawNebula() {
    // Drifting nebula blobs
    const t = state.elapsed * 5 * TWEAKS.bgSpeed;
    const blobs = [
      { x: W * 0.2, y: H * 0.35, r: 240, c: 'rgba(120, 60, 180, 0.18)' },
      { x: W * 0.7, y: H * 0.55, r: 280, c: 'rgba(60, 80, 200, 0.16)' },
      { x: W * 0.85, y: H * 0.25, r: 200, c: 'rgba(220, 100, 200, 0.13)' },
      { x: W * 0.15, y: H * 0.7, r: 220, c: 'rgba(80, 200, 220, 0.12)' },
    ];
    for (const b of blobs) {
      const ox = Math.sin(t * 0.02 + b.x * 0.01) * 30;
      const oy = Math.cos(t * 0.015 + b.y * 0.01) * 25;
      const g = ctx.createRadialGradient(b.x + ox, b.y + oy, 20, b.x + ox, b.y + oy, b.r);
      g.addColorStop(0, b.c);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(b.x + ox - b.r, b.y + oy - b.r, b.r * 2, b.r * 2);
    }
  }

  // Starfield: 3 layers parallax + twinkle
  function initStarfield() {
    state.starfield = [];
    const count = 180;
    for (let i = 0; i < count; i++) {
      const layer = Math.floor(Math.random() * 3); // 0..2
      state.starfield.push({
        x: Math.random(),
        y: Math.random(),
        layer,
        r: layer === 0 ? rand(0.5, 1.2) : layer === 1 ? rand(0.9, 1.8) : rand(1.5, 2.6),
        col: choice(['#fff', '#cfe0ff', '#ffd8c8', '#d8ffe8']),
        tw: rand(0.6, 1),
        ph: Math.random() * Math.PI * 2,
      });
    }
  }
  initStarfield();
  function drawStars() {
    const speeds = [4, 12, 24];
    const t = state.elapsed * TWEAKS.bgSpeed;
    for (const s of state.starfield) {
      const vy = speeds[s.layer] * t;
      const x = s.x * W;
      const y = ((s.y * H + vy) % H + H) % H;
      const tw = 0.5 + 0.5 * Math.sin(t * s.tw * 2 + s.ph);
      ctx.globalAlpha = 0.4 + 0.6 * tw;
      ctx.fillStyle = s.col;
      ctx.beginPath();
      ctx.arc(x, y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawDistantPlanet() {
    // A friendly planet far in the background
    const cx = W * 0.85;
    const cy = H * 0.18;
    const r = clamp(W * 0.07, 50, 110);
    // halo
    const halo = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r * 1.7);
    halo.addColorStop(0, 'rgba(120, 200, 255, 0.25)');
    halo.addColorStop(1, 'rgba(120, 200, 255, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(cx - r * 1.7, cy - r * 1.7, r * 3.4, r * 3.4);
    // planet
    const grd = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.4, r * 0.2, cx, cy, r);
    grd.addColorStop(0, '#a5cdf2');
    grd.addColorStop(0.5, '#5a8acf');
    grd.addColorStop(1, '#2a4a8a');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // ring
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.3);
    ctx.strokeStyle = 'rgba(200, 220, 255, 0.5)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.4, r * 0.3, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawDefenseLine() {
    const playB = getPlayAreaBounds();
    const y = playB.bottom - 14;
    const pulse = 0.5 + 0.5 * Math.sin(state.basePulse * 3);
    // Glow strip
    const g = ctx.createLinearGradient(0, y - 6, 0, y + 6);
    g.addColorStop(0, 'rgba(120, 200, 255, 0)');
    g.addColorStop(0.5, `rgba(120, 200, 255, ${0.45 + pulse * 0.25})`);
    g.addColorStop(1, 'rgba(120, 200, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 6, W, 12);
    // Dashed line
    ctx.strokeStyle = `rgba(200, 230, 255, ${0.7 + pulse * 0.2})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 8]);
    ctx.lineDashOffset = -state.elapsed * 30;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
  }

  // ---------- Player base character ----------
  function drawPlayerBase() {
    const cx = W / 2;
    const cy = H - 130;
    const recoil = state.baseRecoil;
    const bob = Math.sin(state.basePulse * 2) * 1.5;
    const lookUp = recoil * 6;
    // Base/turret platform
    ctx.save();
    ctx.translate(cx, cy + bob);
    // Outer ring (base platform)
    ctx.fillStyle = '#3a4470';
    ctx.strokeStyle = '#f4f0e4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 12, 50, 10, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Pillar
    ctx.fillStyle = '#5a6494';
    ctx.fillRect(-22, -6, 44, 22);
    ctx.strokeRect(-22, -6, 44, 22);
    // Head dome (the character)
    ctx.save();
    ctx.translate(0, -lookUp);
    // Dome shadow under
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 18, 36, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Dome body
    const g = ctx.createRadialGradient(-8, -8, 4, 0, 0, 32);
    g.addColorStop(0, '#a4f0c4');
    g.addColorStop(0.6, '#5cd97a');
    g.addColorStop(1, '#2b8a45');
    ctx.fillStyle = g;
    ctx.strokeStyle = '#f4f0e4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Antenna
    ctx.strokeStyle = '#f4f0e4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -32);
    ctx.lineTo(0, -52);
    ctx.stroke();
    // Antenna ball
    const antPulse = 0.5 + 0.5 * Math.sin(state.basePulse * 6);
    ctx.fillStyle = '#ffc94d';
    ctx.beginPath();
    ctx.arc(0, -56, 5 + antPulse * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f4f0e4';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Big single eye (cyclops style for cute)
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#0a0e1e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, -2, 14, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Pupil
    ctx.fillStyle = '#0a0e1e';
    const px = lerp(0, 0, recoil); // could track input direction
    const py = -3 - recoil * 4; // looks up when firing
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.fill();
    // Shine
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px - 2, py - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Mouth (small smile)
    ctx.strokeStyle = '#0a0e1e';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 14, 6, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.restore();
    ctx.restore();
  }

  // ---------- Invaders ----------
  function drawInvaders() {
    for (const iv of state.invaders) {
      if (iv.alive) drawAlienShip(iv);
      else drawDyingShip(iv);
    }
  }

  function drawAlienShip(iv) {
    const col = OP_COLORS[iv.expr.op];
    const cx = iv.x + iv.w / 2;
    const bob = Math.sin(iv.bobPhase) * 2;
    const cy = iv.y + iv.h / 2 + bob;
    ctx.save();
    ctx.translate(cx, cy);

    // Body shadow / glow
    const glow = ctx.createRadialGradient(0, 0, iv.w * 0.3, 0, 0, iv.w * 0.7);
    glow.addColorStop(0, col.glow);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-iv.w, -iv.h, iv.w * 2, iv.h * 2);

    // Body — saucer-shaped with eyes
    const bw = iv.w * 0.92;
    const bh = iv.h * 0.78;
    // Lower hull
    ctx.fillStyle = col.dark;
    ctx.strokeStyle = '#0a0e1e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 4, bw / 2, bh * 0.4, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Upper hull (dome)
    ctx.fillStyle = col.body;
    ctx.beginPath();
    ctx.ellipse(0, -bh * 0.1, bw * 0.42, bh * 0.45, 0, Math.PI, 0);
    ctx.fill(); ctx.stroke();

    // Eyes
    const eyeY = -bh * 0.18;
    const eyeR = clamp(iv.h * 0.09, 5, 8);
    const eyeDX = bw * 0.13;
    drawAlienEye(-eyeDX, eyeY, eyeR);
    drawAlienEye(eyeDX, eyeY, eyeR);

    // Math sticker on belly
    drawShipExpr(iv);

    // Bottom lights (3 dots)
    const lightCol = (Math.floor(state.elapsed * 6 + iv.col + iv.row) % 3 === 0) ? '#fff' : col.body;
    for (let i = -1; i <= 1; i++) {
      ctx.fillStyle = i === 0 ? lightCol : col.body;
      ctx.beginPath();
      ctx.arc(i * bw * 0.18, bh * 0.32, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawAlienEye(x, y, r) {
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#0a0e1e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#0a0e1e';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x - r * 0.2, y - r * 0.3, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawShipExpr(iv) {
    const col = OP_COLORS[iv.expr.op];
    const e = iv.expr;
    // Background sticker
    const numFont = `bold ${Math.round(iv.h * 0.32)}px "Lilita One", sans-serif`;
    const opFont  = `bold ${Math.round(iv.h * 0.5)}px "Lilita One", sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = numFont;
    const lw = ctx.measureText(e.left).width;
    const rw = ctx.measureText(e.right).width;
    ctx.font = opFont;
    const ow = ctx.measureText(e.op).width;
    const gap = 4;
    const totalW = lw + gap + ow + gap + rw;
    const padX = 8, padY = 2;
    const stickerW = totalW + padX * 2;
    const stickerH = iv.h * 0.45;
    const sx = -stickerW / 2;
    const sy = iv.h * 0.10;
    // Sticker bg
    ctx.fillStyle = '#fff4dc';
    ctx.strokeStyle = '#0a0e1e';
    ctx.lineWidth = 2;
    roundRect(sx, sy, stickerW, stickerH, 5);
    ctx.fill(); ctx.stroke();
    // Text
    let cx = sx + padX;
    const cy = sy + stickerH / 2;
    ctx.font = numFont;
    ctx.fillStyle = '#0a0e1e';
    ctx.fillText(e.left, cx, cy);
    cx += lw + gap;
    ctx.font = opFont;
    ctx.fillStyle = col.dark;
    ctx.fillText(e.op, cx, cy);
    cx += ow + gap;
    ctx.font = numFont;
    ctx.fillStyle = '#0a0e1e';
    ctx.fillText(e.right, cx, cy);
  }

  function drawDyingShip(iv) {
    const t = iv.deathT / 0.6;
    const a = 1 - t;
    const s = 1 + t * 0.4;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(iv.x + iv.w / 2, iv.y + iv.h / 2);
    ctx.scale(s, s);
    ctx.translate(-iv.w / 2, -iv.h / 2);
    drawAlienShip({ ...iv, x: 0, y: 0, bobPhase: 0 });
    ctx.restore();
  }

  // ---------- Mothership ----------
  function drawMothership() {
    const m = state.mothership;
    if (!m) return;
    if (!m.alive) return; // particles handle death
    const cx = m.x + m.w / 2;
    const cy = m.y + m.h / 2 + Math.sin(m.pulse * 4) * 2;
    ctx.save();
    ctx.translate(cx, cy);
    // Glow
    const glow = ctx.createRadialGradient(0, 0, m.w * 0.3, 0, 0, m.w * 0.8);
    glow.addColorStop(0, 'rgba(227, 108, 224, 0.5)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-m.w, -m.h, m.w * 2, m.h * 2);

    // Disc — bottom half (silver)
    ctx.fillStyle = '#cfd4e6';
    ctx.strokeStyle = '#0a0e1e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 6, m.w / 2, m.h * 0.35, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Disc top (purple/magenta)
    ctx.fillStyle = '#e36ce0';
    ctx.beginPath();
    ctx.ellipse(0, -2, m.w * 0.36, m.h * 0.35, 0, Math.PI, 0);
    ctx.fill(); ctx.stroke();

    // Dome
    ctx.fillStyle = '#a5e0f0';
    ctx.beginPath();
    ctx.ellipse(0, -m.h * 0.18, m.w * 0.2, m.h * 0.4, 0, Math.PI, 0);
    ctx.fill(); ctx.stroke();
    // Dome shine
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.ellipse(-m.w * 0.05, -m.h * 0.28, m.w * 0.04, m.h * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bottom lights (rotating)
    const lightCount = 6;
    for (let i = 0; i < lightCount; i++) {
      const lx = -m.w * 0.32 + (i / (lightCount - 1)) * m.w * 0.64;
      const ly = m.h * 0.28;
      const on = (Math.floor(m.pulse * 10 + i) % 3) === 0;
      ctx.fillStyle = on ? '#fff4dc' : '#ffc94d';
      ctx.strokeStyle = '#0a0e1e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }

    // Expression sticker (centered)
    const e = m.expr;
    ctx.translate(0, -2);
    drawShipExpr({ ...m, expr: e, h: m.h * 1.3 });

    ctx.restore();
  }

  // ---------- Beams (shot trails) ----------
  function drawBeams() {
    for (const b of state.beams) {
      const t = b.life / b.total;
      ctx.globalAlpha = t;
      // Outer glow
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      // Core
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
    ctx.globalAlpha = 1;
  }

  // ---------- Particles ----------
  function drawParticles() {
    for (const p of state.particles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = a;
      if (p.kind === 'ring') {
        ctx.fillStyle = p.color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        drawStar(p.x, p.y, p.size * (1 + (1 - a) * 1.6), 4, 0);
        ctx.fill();
      } else {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawStar(cx, cy, r, points, rotation) {
    const step = Math.PI / points;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? r : r * 0.45;
      const a = rotation + i * step;
      const x = cx + Math.cos(a) * radius;
      const y = cy + Math.sin(a) * radius;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  // ---------- Flashes (mutation indicators) ----------
  function drawFlashes() {
    for (const f of state.flashes) {
      const a = f.life / f.total;
      ctx.globalAlpha = a;
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 4;
      roundRect(f.x - 4, f.y - 4, f.w + 8, f.h + 8, 8);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // ---------- Floaters ----------
  function drawFloaters() {
    for (const f of state.floaters) {
      const t = f.t / f.dur;
      const a = 1 - t;
      const scale = f.big ? (1 + (1 - Math.min(1, t * 3)) * 0.4) : (1 + t * 0.3);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(f.x, f.y);
      ctx.scale(scale, scale);
      ctx.font = f.big ? 'bold 44px "Lilita One", sans-serif' : 'bold 26px "Lilita One", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = f.big ? 5 : 3;
      ctx.strokeStyle = '#0a0e1e';
      ctx.strokeText(f.text, 0, 0);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, 0, 0);
      ctx.restore();
    }
  }

  // ---------- Utility ----------
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

  // =====================================================================
  // TWEAKS PANEL
  // =====================================================================
  function setupTweaks() {
    // Difficulty
    const diffRow = document.getElementById('diff-row');
    diffRow.querySelectorAll('.opt').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.value === TWEAKS.difficulty);
      opt.addEventListener('click', () => {
        TWEAKS.difficulty = opt.dataset.value;
        diffRow.querySelectorAll('.opt').forEach(o => o.classList.toggle('active', o.dataset.value === TWEAKS.difficulty));
        persistTweaks();
      });
    });
    // Sliders
    const slider = (id, key, fmt) => {
      const el = document.getElementById(id);
      const val = document.getElementById(id + '-val');
      el.value = TWEAKS[key];
      val.textContent = fmt(TWEAKS[key]);
      el.addEventListener('input', () => {
        TWEAKS[key] = parseFloat(el.value);
        val.textContent = fmt(TWEAKS[key]);
        persistTweaks();
      });
    };
    slider('form-speed', 'formSpeed', v => `${v.toFixed(1)}×`);
    slider('ufo-freq', 'ufoFreq', v => `${v.toFixed(1)}×`);
    slider('bg-speed', 'bgSpeed', v => `${v.toFixed(1)}×`);
    // Checkboxes
    const negCheck = document.getElementById('neg-check');
    negCheck.checked = !!TWEAKS.allowNegatives;
    negCheck.addEventListener('change', () => { TWEAKS.allowNegatives = negCheck.checked; persistTweaks(); });
    const spamCheck = document.getElementById('spam-check');
    spamCheck.checked = !!TWEAKS.antiSpam;
    spamCheck.addEventListener('change', () => { TWEAKS.antiSpam = spamCheck.checked; persistTweaks(); });

    document.getElementById('tweaks-close').addEventListener('click', () => {
      hideTweaks();
      try { window.parent.postMessage({type: '__edit_mode_dismissed'}, '*'); } catch (e) {}
    });
    const gear = document.getElementById('gear-btn');
    gear.addEventListener('click', () => {
      const isOpen = document.getElementById('tweaks').classList.contains('open');
      if (isOpen) {
        hideTweaks();
        try { window.parent.postMessage({type: '__edit_mode_dismissed'}, '*'); } catch (e) {}
      } else {
        showTweaks();
      }
    });
  }
  function persistTweaks() {
    try {
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { ...TWEAKS } }, '*');
    } catch (e) {}
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
  try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch (e) {}

  // ---------- Kick off ----------
  updateHUD();
  updateAnswerDisplay();
  requestAnimationFrame(loop);

  // Visibility-aware fallback: if RAF stops firing (hidden tab / throttled
  // iframe), poll with setInterval so the game still ticks. When the page
  // becomes visible again, reset the dt clock so we don't fast-forward.
  setInterval(() => {
    const now = performance.now();
    if (now - lastTime > 200) {
      lastTime = now - 16; // reset to a sane dt
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
