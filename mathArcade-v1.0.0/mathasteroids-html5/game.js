// =====================================================================
// MATH ASTEROIDS
// Classic 360° asteroids with one twist: every rock carries an
// arithmetic expression. The HUD shows a TARGET answer — shoot only
// the rocks that evaluate to it.
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

  const TWEAKS = /*EDITMODE-BEGIN*/{
    "difficulty": "normal",
    "aim": "rotate",
    "speed": 1.0,
    "ops": "all"
  }/*EDITMODE-END*/;

  const state = {
    phase: 'title',
    score: 0,
    best: parseInt(localStorage.getItem('mathasteroids_best') || '0', 10) || 0,
    lives: 3,
    shield: 3,
    level: 1,
    levelHits: 0,
    levelGoal: 8,
    ship: {
      x: 0, y: 0,
      vx: 0, vy: 0,
      angle: -Math.PI / 2,
      thrusting: false,
      cooldown: 0,
      invincible: 0,
    },
    bullets: [],
    asteroids: [],
    particles: [],
    floaters: [],
    target: 0,
    matchCount: 0,
    elapsed: 0,
    paused: false,
    deathT: 0,
    levelClearT: 0,
    shake: 0, shakeX: 0, shakeY: 0,
    mouseX: 0, mouseY: 0,
    numberSpawnT: 4.0,
    bonusSpawnT: 14.0,
    targetTimer: 0,
    targetTimerMax: 15,
  };

  const rand = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const TAU = Math.PI * 2;
  function wrap(p) {
    if (p.x < -40) p.x = W + 40;
    if (p.x > W + 40) p.x = -40;
    if (p.y < -40) p.y = H + 40;
    if (p.y > H + 40) p.y = -40;
  }
  function angleDiff(a, b) {
    let d = (a - b) % TAU;
    if (d < -Math.PI) d += TAU;
    if (d > Math.PI) d -= TAU;
    return d;
  }

  // ===== Expressions =====
  function genExpression(level) {
    const opsAvailable = TWEAKS.ops === 'add' ? ['+', '−']
      : (level === 1 ? ['+', '−'] : level === 2 ? ['+', '−', '×'] : ['+', '−', '×', '÷']);
    const op = choice(opsAvailable);
    let a, b, value;
    const cap = Math.min(12, 6 + level);
    if (op === '+') {
      a = randInt(1, cap); b = randInt(1, cap); value = a + b;
    } else if (op === '−') {
      a = randInt(4, cap + 6); b = randInt(1, a - 1); value = a - b;
    } else if (op === '×') {
      const m = Math.min(9, 4 + Math.floor(level / 2));
      a = randInt(2, m); b = randInt(2, m); value = a * b;
    } else { // ÷
      b = randInt(2, Math.min(9, 4 + Math.floor(level / 2)));
      value = randInt(2, 12);
      a = b * value;
    }
    return { text: `${a}${op}${b}`, value };
  }

  // ===== Asteroid generation =====
  // kind: 'expression' (big, math), 'number' (small, single digit), 'bonus' (fast, gold, time-bound)
  const ASTEROID_SIZES = { big: 50, med: 36, small: 26 };
  function makeAsteroidShape(radius) {
    const verts = [];
    const count = 10 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU;
      const r = radius * (0.78 + Math.random() * 0.35);
      verts.push({ a, r });
    }
    return verts;
  }
  function spawnAsteroid(opts = {}) {
    const level = state.level;
    const kind = opts.kind || 'expression';
    const speedMul = kind === 'bonus' ? 2.0 : (kind === 'number' ? 1.2 : 1.0);
    const speedBase = (35 + level * 8) * TWEAKS.speed * speedMul;
    const speed = speedBase * (0.6 + Math.random() * 0.8);
    const angle = Math.random() * TAU;
    let x, y;
    if (opts.x != null) { x = opts.x; y = opts.y; }
    else {
      const side = Math.floor(Math.random() * 4);
      const margin = 40;
      if (side === 0) { x = -margin; y = Math.random() * H; }
      else if (side === 1) { x = W + margin; y = Math.random() * H; }
      else if (side === 2) { x = Math.random() * W; y = -margin; }
      else { x = Math.random() * W; y = H + margin; }
    }
    let radius, expression, bonusTTL = 0;
    if (kind === 'expression') {
      radius = opts.radius ?? ASTEROID_SIZES.big;
      expression = genExpression(level);
    } else if (kind === 'number') {
      radius = 20;
      const cap = Math.min(9, 3 + level);
      const v = randInt(1, cap);
      expression = { text: String(v), value: v };
    } else { // bonus
      radius = 24;
      expression = { text: '★', value: null };
      bonusTTL = 5.0;
    }
    state.asteroids.push({
      kind,
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius,
      shape: makeAsteroidShape(radius),
      rot: Math.random() * TAU,
      rotV: rand(-0.6, 0.6) * (kind === 'bonus' ? 2 : 1),
      expression,
      bonusTTL,
      flashT: 0,
    });
  }
  function targetAsteroidCount() {
    return clamp(7 + Math.floor(state.level / 2), 7, 12);
  }
  function refillAsteroids() {
    let expressionCount = state.asteroids.filter(a => a.kind === 'expression').length;
    const target = targetAsteroidCount();
    const before = expressionCount;
    while (expressionCount < target) {
      spawnAsteroid({ kind: 'expression' });
      expressionCount++;
    }
    if (expressionCount !== before) updateMatchCount();
  }

  // ===== Target selection =====
  function pickTarget() {
    const values = state.asteroids.filter(a => a.kind === 'expression').map(a => a.expression.value);
    if (values.length === 0) { state.target = 0; updateMatchCount(); return; }
    const counts = {};
    for (const v of values) counts[v] = (counts[v] || 0) + 1;
    const candidates = Object.keys(counts).map(Number);
    state.target = choice(candidates);
    // Reset the target solve timer. Faster at higher levels.
    const seconds = Math.max(8, 16 - state.level);
    state.targetTimer = seconds;
    state.targetTimerMax = seconds;
    updateTargetHUD();
    updateMatchCount();
  }
  function updateMatchCount() {
    state.matchCount = state.asteroids.filter(a => a.kind === 'expression' && a.expression.value === state.target).length;
    const el = document.getElementById('match-count');
    if (el) el.textContent = state.matchCount;
  }
  function updateTargetTimerHUD() {
    const bar = document.getElementById('target-timer-fill');
    const wrap = document.getElementById('target');
    if (!bar || !wrap) return;
    const frac = clamp(state.targetTimer / state.targetTimerMax, 0, 1);
    bar.style.width = `${frac * 100}%`;
    if (frac < 0.25) wrap.classList.add('warn'); else wrap.classList.remove('warn');
  }
  function ensureTargetMatchExists() {
    const matches = state.asteroids.filter(a => a.kind === 'expression' && a.expression.value === state.target);
    if (matches.length === 0) {
      const exprAsteroids = state.asteroids.filter(a => a.kind === 'expression');
      const cand = exprAsteroids[Math.floor(Math.random() * exprAsteroids.length)];
      if (!cand) return;
      const t = state.target;
      let exp = null;
      for (let i = 0; i < 30 && !exp; i++) {
        const op = choice(['+', '−', '×', '÷']);
        if (op === '+') {
          if (t >= 2) { const a = randInt(1, Math.min(t - 1, 12)); exp = { text: `${a}+${t - a}`, value: t }; }
        } else if (op === '−') {
          const a = randInt(t + 1, t + 12); exp = { text: `${a}−${a - t}`, value: t };
        } else if (op === '×') {
          const factors = [];
          for (let b = 2; b <= 9; b++) if (t % b === 0 && t / b >= 2 && t / b <= 12) factors.push(b);
          if (factors.length) { const b = choice(factors); exp = { text: `${t / b}×${b}`, value: t }; }
        } else if (op === '÷') {
          if (t >= 2 && t <= 12) {
            const b = randInt(2, 9); exp = { text: `${b * t}÷${b}`, value: t };
          }
        }
      }
      if (!exp) exp = { text: `${t}+0`, value: t };
      cand.expression = exp;
      updateMatchCount();
    }
  }

  // ===== Bullets =====
  function fire() {
    if (state.ship.cooldown > 0) return;
    const speed = 520;
    const tipX = state.ship.x + Math.cos(state.ship.angle) * 18;
    const tipY = state.ship.y + Math.sin(state.ship.angle) * 18;
    state.bullets.push({
      x: tipX, y: tipY,
      vx: Math.cos(state.ship.angle) * speed + state.ship.vx,
      vy: Math.sin(state.ship.angle) * speed + state.ship.vy,
      life: 1.0, maxLife: 1.0,
    });
    state.ship.cooldown = 0.18;
  }
  function hyperspace() {
    if (state.ship.cooldown > 0) return;
    state.ship.x = rand(80, W - 80);
    state.ship.y = rand(120, H - 120);
    state.ship.vx *= 0.3;
    state.ship.vy *= 0.3;
    state.ship.invincible = 0.6;
    state.ship.cooldown = 0.5;
    // FX
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * TAU;
      const sp = rand(120, 280);
      state.particles.push({
        x: state.ship.x, y: state.ship.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(0.4, 0.7), maxLife: 0.7,
        size: rand(2, 5), color: choice(['#5cd9ff', '#fff', '#a45cd9']),
        gravity: 0,
      });
    }
  }

  // ===== Input =====
  const keys = {};
  window.addEventListener('keydown', (e) => {
    if (state.phase === 'title' || state.phase === 'game_over') {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startGame(); return; }
    }
    if (e.key === 'p' || e.key === 'P') { e.preventDefault(); togglePause(); return; }
    if (state.phase !== 'playing') return;
    keys[e.key.toLowerCase()] = true;
    if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); fire(); }
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { e.preventDefault(); hyperspace(); }
  });
  window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
  });
  window.addEventListener('mousemove', (e) => {
    state.mouseX = e.clientX;
    state.mouseY = e.clientY;
  });
  window.addEventListener('mousedown', (e) => {
    if (state.phase !== 'playing') return;
    // Only fire on left button in the canvas area (not on tweaks UI)
    const target = e.target;
    if (target && target.closest && target.closest('#tweaks, #gear-btn, #mobile-controls, .overlay')) return;
    if (e.button === 0) fire();
  });
  // Mobile buttons (continuous-press via pointer events)
  function hold(id, key) {
    const el = document.getElementById(id);
    if (!el) return;
    const down = (e) => { e.preventDefault(); keys[key] = true; };
    const up   = (e) => { e.preventDefault(); keys[key] = false; };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
  }
  hold('mc-left', 'arrowleft');
  hold('mc-right', 'arrowright');
  hold('mc-thrust', 'arrowup');
  document.getElementById('mc-fire').addEventListener('pointerdown', (e) => { e.preventDefault(); fire(); });
  document.getElementById('mc-hyper').addEventListener('pointerdown', (e) => { e.preventDefault(); hyperspace(); });
  if ('ontouchstart' in window) document.getElementById('mobile-controls').classList.add('show');

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
  function updateIdle(dt) {
    state.elapsed += dt * 0.5;
    for (const a of state.asteroids) {
      a.x += a.vx * dt * 0.3;
      a.y += a.vy * dt * 0.3;
      a.rot += a.rotV * dt * 0.5;
      wrap(a);
    }
  }

  function update(dt) {
    state.elapsed += dt;
    // Ship controls
    if (TWEAKS.aim === 'mouse') {
      const dx = state.mouseX - state.ship.x;
      const dy = state.mouseY - state.ship.y;
      const target = Math.atan2(dy, dx);
      const diff = angleDiff(target, state.ship.angle);
      state.ship.angle += clamp(diff, -6 * dt, 6 * dt);
    } else {
      if (keys['arrowleft'] || keys['a']) state.ship.angle -= 4.6 * dt;
      if (keys['arrowright'] || keys['d']) state.ship.angle += 4.6 * dt;
    }
    state.ship.thrusting = !!(keys['arrowup'] || keys['w']);
    if (state.ship.thrusting) {
      const acc = 360;
      state.ship.vx += Math.cos(state.ship.angle) * acc * dt;
      state.ship.vy += Math.sin(state.ship.angle) * acc * dt;
    }
    // Drag
    state.ship.vx *= Math.pow(0.5, dt * 0.6);
    state.ship.vy *= Math.pow(0.5, dt * 0.6);
    // Cap speed
    const sp = Math.hypot(state.ship.vx, state.ship.vy);
    const maxSp = 420;
    if (sp > maxSp) { state.ship.vx *= maxSp / sp; state.ship.vy *= maxSp / sp; }
    state.ship.x += state.ship.vx * dt;
    state.ship.y += state.ship.vy * dt;
    wrap(state.ship);
    state.ship.cooldown = Math.max(0, state.ship.cooldown - dt);
    state.ship.invincible = Math.max(0, state.ship.invincible - dt);

    // Bullets
    for (const b of state.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      wrap(b);
    }
    state.bullets = state.bullets.filter(b => b.life > 0);

    // Asteroids
    for (const a of state.asteroids) {
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.rot += a.rotV * dt;
      if (a.flashT > 0) a.flashT = Math.max(0, a.flashT - dt);
      if (a.kind === 'bonus') a.bonusTTL -= dt;
      // Overload fuse — detonates if not shot in time.
      if (a.overloadTTL > 0) {
        a.overloadTTL -= dt;
        if (a.overloadTTL <= 0) {
          // Detonate: malus + spawn small number pieces.
          state.shield = Math.max(0, state.shield - 1);
          state.score = Math.max(0, state.score - 50);
          showFloater(a.x, a.y, 'BOOM  −50', '#ff5c7c');
          explodeAsteroid(a, true);
          updateHUD();
          if (state.shield <= 0) { killShip('overload!'); break; }
        }
      }
      wrap(a);
    }
    // Remove expired bonus asteroids
    state.asteroids = state.asteroids.filter(a => !(a.kind === 'bonus' && a.bonusTTL <= 0));

    // Target solve timer
    if (state.deathT === 0 && state.levelClearT === 0) {
      state.targetTimer -= dt;
      if (state.targetTimer <= 0) targetTimeout();
      updateTargetTimerHUD();
    }

    // Number-into-expression merging
    handleNumberMerges();

    // Spawn timers for number + bonus rocks
    state.numberSpawnT -= dt;
    if (state.numberSpawnT <= 0) {
      spawnAsteroid({ kind: 'number' });
      state.numberSpawnT = rand(3.5, 6.5);
    }
    state.bonusSpawnT -= dt;
    if (state.bonusSpawnT <= 0) {
      const hasBonus = state.asteroids.some(a => a.kind === 'bonus');
      if (!hasBonus) spawnAsteroid({ kind: 'bonus' });
      state.bonusSpawnT = rand(12, 22);
    }

    // Bullet-asteroid collision
    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const b = state.bullets[i];
      for (let j = state.asteroids.length - 1; j >= 0; j--) {
        const a = state.asteroids[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        if (dx * dx + dy * dy < a.radius * a.radius) {
          // Hit!
          handleAsteroidHit(a, j, b);
          state.bullets.splice(i, 1);
          break;
        }
      }
    }

    // Ship-asteroid collision (skip bonus rocks — they're harmless pickups)
    if (state.deathT === 0 && state.ship.invincible === 0) {
      for (const a of state.asteroids) {
        if (a.kind === 'bonus') continue;
        const dx = a.x - state.ship.x;
        const dy = a.y - state.ship.y;
        const minD = a.radius + 12;
        if (dx * dx + dy * dy < minD * minD) {
          killShip('collision!');
          break;
        }
      }
    }

    // Death timer
    if (state.deathT > 0) {
      state.deathT -= dt;
      if (state.deathT <= 0) {
        state.deathT = 0;
        if (state.lives <= 0) gameOver();
        else respawnShip();
      }
    }
    // Level clear
    if (state.levelClearT > 0) {
      state.levelClearT -= dt;
      if (state.levelClearT <= 0) {
        state.levelClearT = 0;
        state.level++;
        startLevel();
      }
    }

    // Particles + floaters
    for (const p of state.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += (p.gravity ?? 0) * dt;
      p.life -= dt;
    }
    state.particles = state.particles.filter(p => p.life > 0);
    for (const f of state.floaters) { f.t += dt; f.y -= 40 * dt; }
    state.floaters = state.floaters.filter(f => f.t < f.dur);

    if (state.shake > 0) {
      state.shake = Math.max(0, state.shake - dt * 3);
      state.shakeX = (Math.random() - 0.5) * state.shake * 12;
      state.shakeY = (Math.random() - 0.5) * state.shake * 12;
    } else { state.shakeX = state.shakeY = 0; }

    refillAsteroids();
    ensureTargetMatchExists();
  }

  function handleNumberMerges() {
    const numbers = state.asteroids.filter(a => a.kind === 'number');
    if (!numbers.length) return;
    const expressions = state.asteroids.filter(a => a.kind === 'expression');
    for (const n of numbers) {
      for (const e of expressions) {
        const dx = n.x - e.x;
        const dy = n.y - e.y;
        const minD = n.radius + e.radius * 0.85;
        if (dx * dx + dy * dy < minD * minD) {
          // Merge: add the number's value to the expression's value.
          const v = n.expression.value;
          e.expression = {
            text: `${e.expression.text}+${v}`,
            value: e.expression.value + v,
          };
          e.mergeCount = (e.mergeCount || 0) + 1;
          e.flashT = 0.5;
          // > 3 merges → overload fuse starts.
          if (e.mergeCount > 3 && !e.overloadTTL) {
            e.overloadTTL = 4.0;
            e.overloadMax = 4.0;
            showFloater(e.x, e.y - 14, 'OVERLOAD!', '#ff5c7c');
            state.shake = Math.min(0.3, state.shake + 0.15);
          }
          burst(n.x, n.y, '#a5cdf2', 10);
          showFloater(e.x, e.y - 8, `+${v}`, '#a5cdf2');
          n.dead = true;
          break;
        }
      }
    }
    if (numbers.some(n => n.dead)) {
      state.asteroids = state.asteroids.filter(a => !a.dead);
      updateMatchCount();
    }
  }

  function explodeAsteroid(a, intoNumbers) {
    const idx = state.asteroids.indexOf(a);
    if (idx >= 0) state.asteroids.splice(idx, 1);
    burst(a.x, a.y, '#ff5c7c', 22);
    state.shake = Math.min(0.5, state.shake + 0.3);
    if (intoNumbers) {
      const count = randInt(2, 3);
      const cap = Math.min(9, 3 + state.level);
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * TAU + Math.random() * 0.6;
        const speed = 80 + Math.random() * 80;
        const v = randInt(1, cap);
        const radius = 20;
        state.asteroids.push({
          kind: 'number',
          x: a.x + Math.cos(ang) * 10,
          y: a.y + Math.sin(ang) * 10,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          radius,
          shape: makeAsteroidShape(radius),
          rot: Math.random() * TAU,
          rotV: rand(-0.6, 0.6),
          expression: { text: String(v), value: v },
          bonusTTL: 0,
          flashT: 0,
        });
      }
    }
  }

  function targetTimeout() {
    state.shield = Math.max(0, state.shield - 1);
    state.score = Math.max(0, state.score - 50);
    showFloaterCenter("TIME'S UP — −50", '#ff5c7c');
    state.shake = Math.min(0.55, state.shake + 0.35);
    // Explode one matching asteroid (if any) into number pieces.
    const matches = state.asteroids.filter(a => a.kind === 'expression' && a.expression.value === state.target);
    if (matches.length) explodeAsteroid(choice(matches), true);
    if (state.shield <= 0) { killShip('time expired'); return; }
    pickTarget();
    updateHUD();
  }

  function handleAsteroidHit(a, idx, bullet) {
    // Number asteroid — small free score, no shield damage.
    if (a.kind === 'number') {
      const pts = 20;
      state.score += pts;
      showFloater(a.x, a.y, `+${pts}`, '#a5cdf2');
      burst(a.x, a.y, '#a5cdf2', 10);
      state.asteroids.splice(idx, 1);
      updateHUD();
      return;
    }
    // Bonus asteroid — mega score, no shield damage.
    if (a.kind === 'bonus') {
      const pts = 500;
      state.score += pts;
      showFloater(a.x, a.y, `BONUS  +${pts}`, '#ffd24d');
      burst(a.x, a.y, '#ffd24d', 26);
      state.shake = Math.min(0.3, state.shake + 0.15);
      state.asteroids.splice(idx, 1);
      updateHUD();
      return;
    }
    // Overloaded expression — defuse! Bonus regardless of target match.
    if (a.overloadTTL > 0) {
      const pts = 300 + state.level * 30;
      state.score += pts;
      showFloater(a.x, a.y, `DEFUSED +${pts}`, '#5cd97a');
      burst(a.x, a.y, '#5cd97a', 28);
      state.shake = Math.min(0.3, state.shake + 0.15);
      state.asteroids.splice(idx, 1);
      pickTarget();
      updateHUD();
      return;
    }
    // Normal expression asteroid — must match target.
    const correct = a.expression.value === state.target;
    if (correct) {
      const base = 100 + state.level * 20;
      state.score += base;
      state.levelHits++;
      showFloater(a.x, a.y, `+${base}  ✓`, '#5cd97a');
      burst(a.x, a.y, '#5cd97a', 22);
      state.shake = Math.min(0.25, state.shake + 0.1);
      state.asteroids.splice(idx, 1);
      pickTarget();
      updateHUD();
      if (state.levelHits >= state.levelGoal) levelClear();
    } else {
      state.shield = Math.max(0, state.shield - 1);
      state.score = Math.max(0, state.score - 25);
      showFloater(a.x, a.y, `WRONG  −25`, '#ff5c7c');
      burst(a.x, a.y, '#ff5c7c', 12);
      state.shake = Math.min(0.4, state.shake + 0.2);
      a.expression = genExpression(state.level);
      a.mergeCount = 0;
      a.overloadTTL = 0;
      a.flashT = 0.5;
      updateMatchCount();
      updateHUD();
      if (state.shield <= 0) killShip('shield depleted');
    }
  }

  function killShip(reason) {
    state.lives--;
    state.deathT = 1.2;
    state.shake = Math.min(0.8, state.shake + 0.5);
    showFloaterCenter(reason, '#ff5c7c');
    explode(state.ship.x, state.ship.y);
    updateHUD();
  }
  function respawnShip() {
    state.ship.x = W / 2;
    state.ship.y = H / 2;
    state.ship.vx = 0; state.ship.vy = 0;
    state.ship.angle = -Math.PI / 2;
    state.ship.invincible = 2.0;
    state.shield = 3;
    updateHUD();
  }
  function levelClear() {
    state.score += 500 + state.level * 100;
    showFloaterCenter(`LEVEL ${state.level} CLEAR  +${500 + state.level * 100}`, '#ffd24d');
    state.levelClearT = 1.6;
    for (let i = 0; i < 50; i++) {
      const a = Math.random() * TAU;
      const sp = rand(180, 400);
      state.particles.push({
        x: W / 2, y: H / 2,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(0.8, 1.5), maxLife: 1.5,
        size: rand(3, 8),
        color: choice(['#5cd9ff', '#ffd24d', '#5cd97a', '#fff']),
      });
    }
  }
  function burst(x, y, color, n = 14) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const sp = rand(120, 280);
      state.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(0.4, 0.9), maxLife: 0.9, size: rand(3, 7),
        color: choice([color, '#fff']),
      });
    }
  }
  function explode(x, y) {
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * TAU;
      const sp = rand(140, 360);
      state.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(0.6, 1.2), maxLife: 1.2, size: rand(3, 8),
        color: choice(['#5cd9ff', '#fff', '#ff8a3d', '#ffd24d']),
      });
    }
  }
  function showFloater(x, y, text, color) {
    state.floaters.push({ x, y, text, color, t: 0, dur: 1.0, big: false });
  }
  function showFloaterCenter(text, color) {
    state.floaters.push({ x: W / 2, y: H * 0.42, text, color, t: 0, dur: 1.3, big: true });
  }

  // ===== Game flow =====
  function startGame() {
    state.phase = 'playing';
    state.score = 0; state.lives = 3; state.shield = 3; state.level = 1;
    state.bullets = []; state.asteroids = [];
    state.particles = []; state.floaters = [];
    startLevel();
    document.getElementById('overlay').classList.add('hidden');
  }
  function startLevel() {
    state.levelHits = 0;
    state.levelGoal = 6 + state.level * 2;
    state.asteroids = [];
    state.numberSpawnT = rand(3.0, 5.0);
    state.bonusSpawnT = rand(8.0, 14.0);
    refillAsteroids();
    pickTarget();
    respawnShip();
    state.ship.x = W / 2; state.ship.y = H / 2;
    state.ship.invincible = 1.5;
    showFloaterCenter(`LEVEL ${state.level}`, '#5cd9ff');
    updateHUD();
  }
  function togglePause() {
    if (state.phase !== 'playing') return;
    state.paused = !state.paused;
  }
  function gameOver() {
    state.phase = 'game_over';
    if (state.score > state.best) {
      state.best = state.score;
      localStorage.setItem('mathasteroids_best', String(state.best));
    }
    const overlay = document.getElementById('overlay');
    overlay.querySelector('.card').remove();
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h1><span class="acc">SHIP</span> LOST</h1>
      <div class="sub">all hands down</div>
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

  // ===== HUD =====
  function updateHUD() {
    document.getElementById('score').textContent = state.score;
    document.getElementById('lives').textContent = '♥'.repeat(state.lives);
    document.getElementById('level').textContent = state.level;
    document.getElementById('shield').textContent = '▮'.repeat(state.shield) + '▯'.repeat(Math.max(0, 3 - state.shield));
    updateProgress();
  }
  function updateTargetHUD() {
    document.getElementById('target-val').textContent = state.target;
  }
  function updateProgress() {
    const pct = clamp((state.levelHits / state.levelGoal) * 100, 0, 100);
    document.getElementById('progress-fill').style.width = `${pct}%`;
  }

  // ===== Drawing =====
  function draw() {
    ctx.save();
    ctx.translate(state.shakeX, state.shakeY);
    drawBackdrop();
    drawAsteroids();
    drawBullets();
    if (state.deathT === 0 || (state.deathT > 0 && Math.floor(state.deathT * 10) % 2 === 0)) drawShip();
    drawParticles();
    drawFloaters();
    if (state.paused) drawPaused();
    ctx.restore();
  }
  function drawBackdrop() {
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) / 1.2);
    g.addColorStop(0, '#0c1230');
    g.addColorStop(0.6, '#070a1c');
    g.addColorStop(1, '#03040e');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // Stars (parallax-ish, drift very slowly with time)
    for (let layer = 0; layer < 2; layer++) {
      const speed = layer === 0 ? 8 : 18;
      const size = layer === 0 ? 1 : 1.6;
      const alpha = layer === 0 ? 0.4 : 0.75;
      const drift = (state.elapsed * speed) % W;
      for (let i = 0; i < (layer === 0 ? 80 : 35); i++) {
        const baseX = (i * 9973 + layer * 137) % W;
        const baseY = (i * 7919 + layer * 311) % H;
        const tw = (Math.sin(state.elapsed * 1.5 + i * 0.4) + 1) * 0.5;
        const sx = (baseX - drift + W) % W;
        ctx.globalAlpha = alpha * (0.4 + tw * 0.6);
        ctx.fillStyle = layer === 0 ? '#a5cdf2' : '#fff';
        ctx.fillRect(sx, baseY, size, size);
      }
    }
    ctx.globalAlpha = 1;
  }
  function drawAsteroids() {
    for (const a of state.asteroids) {
      const isBonus = a.kind === 'bonus';
      const isNumber = a.kind === 'number';
      // Bonus has a pulsing gold halo + TTL ring
      if (isBonus) {
        const pulse = (Math.sin(state.elapsed * 8 + a.x * 0.01) + 1) * 0.5;
        const haloR = a.radius * (1.5 + pulse * 0.2);
        const grd = ctx.createRadialGradient(a.x, a.y, a.radius * 0.5, a.x, a.y, haloR);
        grd.addColorStop(0, 'rgba(255, 210, 77, 0.65)');
        grd.addColorStop(1, 'rgba(255, 210, 77, 0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(a.x, a.y, haloR, 0, TAU);
        ctx.fill();
        // TTL ring (depletes as bonusTTL drops from 5 → 0)
        const ttlFrac = clamp(a.bonusTTL / 5.0, 0, 1);
        ctx.strokeStyle = '#ffd24d';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.radius + 6, -Math.PI / 2, -Math.PI / 2 + TAU * ttlFrac);
        ctx.stroke();
      }
      // Overload fuse ring on overloaded expression rocks
      if (a.overloadTTL > 0) {
        const pulse = (Math.sin(state.elapsed * 12) + 1) * 0.5;
        const haloR = a.radius * (1.35 + pulse * 0.12);
        const grd2 = ctx.createRadialGradient(a.x, a.y, a.radius * 0.6, a.x, a.y, haloR);
        grd2.addColorStop(0, `rgba(255, 92, 124, ${0.45 + pulse * 0.25})`);
        grd2.addColorStop(1, 'rgba(255, 92, 124, 0)');
        ctx.fillStyle = grd2;
        ctx.beginPath();
        ctx.arc(a.x, a.y, haloR, 0, TAU);
        ctx.fill();
        // Fuse arc (red, depletes)
        const frac = clamp(a.overloadTTL / (a.overloadMax || 4), 0, 1);
        ctx.strokeStyle = '#ff5c7c';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.radius + 8, -Math.PI / 2, -Math.PI / 2 + TAU * frac);
        ctx.stroke();
      }
      // Body
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rot);
      ctx.beginPath();
      for (let i = 0; i < a.shape.length; i++) {
        const v = a.shape[i];
        const x = Math.cos(v.a) * v.r;
        const y = Math.sin(v.a) * v.r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      // Rock fill
      let g0, g1, stroke;
      if (isBonus) { g0 = '#ffd24d'; g1 = '#a87a14'; stroke = '#7a4a10'; }
      else if (isNumber) { g0 = '#8a9bbc'; g1 = '#3a4866'; stroke = '#1a1e30'; }
      else { g0 = '#bdb094'; g1 = '#6a6253'; stroke = '#1a1e30'; }
      const grad = ctx.createLinearGradient(-a.radius, -a.radius, a.radius, a.radius);
      grad.addColorStop(0, g0);
      grad.addColorStop(1, g1);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = isBonus ? 3 : 2.5;
      ctx.strokeStyle = stroke;
      ctx.stroke();
      // Crater specks
      if (!isBonus) {
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        for (let i = 0; i < 3; i++) {
          const ang = (i * 2.094) + a.rot * 0.4;
          ctx.beginPath();
          ctx.arc(Math.cos(ang) * a.radius * 0.3, Math.sin(ang) * a.radius * 0.4, a.radius * 0.08, 0, TAU);
          ctx.fill();
        }
      }
      // Flash overlay on recent merge / hit
      if (a.flashT > 0) {
        ctx.globalAlpha = a.flashT / 0.5;
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      // Expression text — non-rotated chip
      const txt = a.expression.text;
      const chipFontSize = isNumber ? Math.round(a.radius * 0.7) : Math.round(a.radius * 0.42);
      ctx.font = `bold ${chipFontSize}px "Lilita One", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const padX = isNumber ? 6 : 8, padY = 4;
      const w = ctx.measureText(txt).width + padX * 2;
      const h = isNumber ? a.radius * 0.8 : a.radius * 0.55;
      let chipFill, chipStroke, textColor;
      if (isBonus) { chipFill = '#ffd24d'; chipStroke = '#7a4a10'; textColor = '#0a0e1e'; }
      else if (isNumber) { chipFill = '#a5cdf2'; chipStroke = '#1a1e30'; textColor = '#0a0e1e'; }
      else { chipFill = 'rgba(10, 12, 30, 0.92)'; chipStroke = '#e8ecff'; textColor = '#fff'; }
      ctx.fillStyle = chipFill;
      ctx.strokeStyle = chipStroke;
      ctx.lineWidth = 2;
      const chipX = a.x - w / 2;
      const chipY = a.y - h / 2;
      roundRect(chipX, chipY, w, h, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = textColor;
      ctx.fillText(txt, a.x, a.y + 1);
    }
  }
  function drawBullets() {
    ctx.strokeStyle = '#ffd24d';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (const b of state.bullets) {
      const len = 8;
      const sp = Math.hypot(b.vx, b.vy) || 1;
      const dx = b.vx / sp * len;
      const dy = b.vy / sp * len;
      ctx.beginPath();
      ctx.moveTo(b.x - dx, b.y - dy);
      ctx.lineTo(b.x + dx, b.y + dy);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
  function drawShip() {
    const s = state.ship;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle);
    const inv = s.invincible > 0;
    const main   = inv ? '#a5e8ff' : '#5cd9ff';
    const accent = inv ? '#4d8aa8' : '#2a6c87';
    const outline = '#0a0e1e';

    // Thrust flame (drawn first so it's behind the hull)
    if (s.thrusting && state.deathT === 0) {
      const fl = 14 + Math.random() * 8;
      ctx.fillStyle = '#ff5c5c';
      ctx.beginPath();
      ctx.moveTo(-13, -5);
      ctx.quadraticCurveTo(-15 - fl, 0, -13, 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ff8a3d';
      ctx.beginPath();
      ctx.moveTo(-13, -3);
      ctx.quadraticCurveTo(-13 - fl * 0.7, 0, -13, 3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffd24d';
      ctx.beginPath();
      ctx.moveTo(-13, -1.5);
      ctx.quadraticCurveTo(-13 - fl * 0.4, 0, -13, 1.5);
      ctx.closePath();
      ctx.fill();
    }

    // Side fins (behind the main hull)
    ctx.fillStyle = accent;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2;
    // Top fin
    ctx.beginPath();
    ctx.moveTo(-4, -7);
    ctx.lineTo(-12, -14);
    ctx.lineTo(-13, -8);
    ctx.lineTo(-7, -5);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Bottom fin
    ctx.beginPath();
    ctx.moveTo(-4, 7);
    ctx.lineTo(-12, 14);
    ctx.lineTo(-13, 8);
    ctx.lineTo(-7, 5);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Thruster nozzle (small rectangle sticking out the back)
    ctx.fillStyle = accent;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-12, -3.5);
    ctx.lineTo(-14, -3);
    ctx.lineTo(-14, 3);
    ctx.lineTo(-12, 3.5);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Main hull — chunky teardrop pointing right
    ctx.fillStyle = main;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.bezierCurveTo(16, -9, 4, -10, -8, -7);
    ctx.lineTo(-12, -4);
    ctx.lineTo(-12, 4);
    ctx.bezierCurveTo(4, 10, 16, 9, 18, 0);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Underside accent stripe
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(14, 1);
    ctx.bezierCurveTo(2, 8, -6, 7, -10, 4);
    ctx.lineTo(-10, 2);
    ctx.bezierCurveTo(-2, 3, 8, 2, 14, 1);
    ctx.closePath();
    ctx.fill();

    // Cockpit dome
    ctx.fillStyle = outline;
    ctx.beginPath();
    ctx.arc(3, 0, 5.5, 0, TAU);
    ctx.fill();
    // Glass
    ctx.fillStyle = 'rgba(180, 230, 255, 0.92)';
    ctx.beginPath();
    ctx.arc(3, 0, 4.5, 0, TAU);
    ctx.fill();
    // Highlights
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.arc(1.5, -1.8, 1.5, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4.5, -2, 0.7, 0, TAU);
    ctx.fill();

    // Antenna + blinking light
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-2, -8);
    ctx.lineTo(-5, -13);
    ctx.stroke();
    const blink = Math.sin(state.elapsed * 5) > 0;
    ctx.fillStyle = blink ? '#ff5c7c' : '#ffd24d';
    ctx.beginPath();
    ctx.arc(-5, -13, 1.9, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.restore();

    // Invincibility halo
    if (inv) {
      ctx.strokeStyle = `rgba(92, 217, 255, ${0.4 + Math.sin(state.elapsed * 20) * 0.2})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 24, 0, TAU);
      ctx.stroke();
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
      ctx.font = f.big ? 'bold 44px "Lilita One", sans-serif' : 'bold 22px "Lilita One", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = f.big ? 5 : 3;
      ctx.strokeStyle = '#0a0e1e';
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
    ctx.lineWidth = 6; ctx.strokeStyle = '#0a0e1e';
    ctx.strokeText('PAUSED', W / 2, H / 2);
    ctx.fillStyle = '#e8ecff'; ctx.fillText('PAUSED', W / 2, H / 2);
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
    const setRow = (id, key) => {
      const row = document.getElementById(id);
      row.querySelectorAll('.opt').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.value === TWEAKS[key]);
        opt.addEventListener('click', () => {
          TWEAKS[key] = opt.dataset.value;
          row.querySelectorAll('.opt').forEach(o => o.classList.toggle('active', o.dataset.value === TWEAKS[key]));
          if (key === 'difficulty') {
            if (TWEAKS[key] === 'easy') TWEAKS.speed = 0.7;
            else if (TWEAKS[key] === 'normal') TWEAKS.speed = 1.0;
            else TWEAKS.speed = 1.5;
            document.getElementById('speed').value = TWEAKS.speed;
            document.getElementById('speed-val').textContent = `${TWEAKS.speed.toFixed(1)}×`;
          }
          persistTweaks();
        });
      });
    };
    setRow('diff-row', 'difficulty');
    setRow('aim-row', 'aim');
    setRow('ops-row', 'ops');
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

  // ===== Boot (title-screen idle background) =====
  state.ship.x = W / 2; state.ship.y = H / 2;
  // Seed some asteroids for the title screen backdrop
  for (let i = 0; i < 7; i++) {
    spawnAsteroid({
      x: rand(80, W - 80), y: rand(80, H - 80),
    });
  }
  pickTarget();
  updateHUD();

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      lastTime = performance.now() - 16;
      requestAnimationFrame(loop);
    }
  });
  requestAnimationFrame(loop);
})();
