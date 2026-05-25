// =====================================================================
// MISSILE COMMAND — HTML5 cartoon redesign
// Adapted from kikenandez/retroGames missilecommand.py
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

  // ---------- Constants ----------
  const CITY_COUNT = 6;
  const SILO_COUNT = 3;
  const DEFAULT_AMMO = 10;
  const SCORE_ENEMY = 25;
  const SCORE_MIRV = 75;
  const SCORE_CITY = 100;
  const SCORE_AMMO = 5;
  const CITY_AWARD_EVERY = 10000;
  const PLAYER_MAX_RADIUS = 78;
  const ENEMY_MAX_RADIUS = 42;
  const PLAYER_SPEED = 720; // px/sec
  const ENEMY_BASE_SPEED = 80; // px/sec at wave 1
  const ENEMY_WAVE_STEP = 18; // px/sec added per wave

  // ---------- Palettes ----------
  const PALETTES = {
    twilight: {
      skyTop: '#1a0a3a', skyMid: '#5a2a6a', skyBot: '#ff7a8a',
      mountainsFar: '#3a2a5a', mountainsNear: '#241738',
      groundTop: '#5a3a78', groundBot: '#2a1840',
      starColor: '#fff4dc',
      cityColors: ['#ff6b9d', '#7ad1ff', '#8aea7a', '#ffd17a', '#ff9d7a', '#c97aff'],
      siloColor: '#ffd17a',
    },
    dawn: {
      skyTop: '#1a3a6a', skyMid: '#ff8a9a', skyBot: '#ffd17a',
      mountainsFar: '#5a4a7a', mountainsNear: '#3a2a4a',
      groundTop: '#6a4a3a', groundBot: '#3a2418',
      starColor: '#fff4dc',
      cityColors: ['#ff6b6b', '#ffba6b', '#ffe06b', '#a8e86b', '#6bcfe8', '#a86bff'],
      siloColor: '#ffba6b',
    },
    storm: {
      skyTop: '#0a1a2a', skyMid: '#1a3a5a', skyBot: '#3a6a8a',
      mountainsFar: '#1a2a3a', mountainsNear: '#0a1525',
      groundTop: '#2a3a4a', groundBot: '#0a1525',
      starColor: '#a5c5e0',
      cityColors: ['#7ad1ff', '#5a9fd6', '#5cd9e6', '#7ae8a8', '#c4e0e8', '#a5b5d6'],
      siloColor: '#7ad1ff',
    },
  };

  // ---------- Tweaks ----------
  const TWEAKS = /*EDITMODE-BEGIN*/{
    "palette": "twilight",
    "enemySpeed": 1.0,
    "spawnRate": 1.0,
    "ammoCount": 10,
    "blastRadius": 1.0
  }/*EDITMODE-END*/;

  // ---------- State ----------
  const state = {
    phase: 'title',
    score: 0,
    best: parseInt(localStorage.getItem('missilecommand_best') || '0', 10) || 0,
    wave: 1,
    cities: [],
    silos: [],
    enemies: [],
    players: [],
    explosions: [],
    particles: [],
    floaters: [],
    mouseX: 0, mouseY: 0,
    spawnTimer: 1.5,
    waveBudget: 0, // enemies remaining to spawn this wave
    waveActive: false,
    waveClearTimer: 0,
    awardThreshold: CITY_AWARD_EVERY,
    elapsed: 0,
    shake: 0, shakeX: 0, shakeY: 0,
    starfield: null,
  };

  // ---------- Helpers ----------
  const rand = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const dist2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
  function P() { return PALETTES[TWEAKS.palette] || PALETTES.twilight; }

  function getGroundY() { return H - 90; }
  function getCityY() { return getGroundY() - 4; }
  function getSiloY() { return getGroundY() - 4; }

  // ---------- Setup cities and silos ----------
  function setupBase() {
    state.cities = [];
    state.silos = [];
    const groundY = getCityY();
    // 6 cities + 3 silos in a layout: silo, 2 cities, silo, 2 cities, silo, 2 cities
    // Total slots = 9 (3 silos + 6 cities)
    const totalSlots = 9;
    const slotW = W / (totalSlots + 1);
    // Order: silo, city, city, silo, city, city, silo, city, city
    // Actually classic is: silo at 1, 5, 9; cities in between
    const layout = ['silo', 'city', 'city', 'silo', 'city', 'city', 'silo', 'city', 'city'];
    // Better: silo, city, city, city, silo, city, city, city, silo (more symmetric)
    const layout2 = ['silo', 'city', 'city', 'city', 'silo', 'city', 'city', 'city', 'silo'];
    // We have 6 cities + 3 silos = 9 slots
    let cIdx = 0, sIdx = 0;
    for (let i = 0; i < totalSlots; i++) {
      const x = slotW * (i + 1);
      if (layout2[i] === 'silo') {
        state.silos.push({
          id: sIdx,
          x, y: groundY,
          ammo: TWEAKS.ammoCount,
          maxAmmo: TWEAKS.ammoCount,
          alive: true,
          deathT: 0,
          bobPhase: Math.random() * Math.PI * 2,
        });
        sIdx++;
      } else {
        state.cities.push({
          id: cIdx,
          x, y: groundY,
          color: P().cityColors[cIdx],
          alive: true,
          deathT: 0,
          bobPhase: Math.random() * Math.PI * 2,
        });
        cIdx++;
      }
    }
  }

  // ---------- Stars ----------
  function initStarfield() {
    state.starfield = [];
    for (let i = 0; i < 120; i++) {
      state.starfield.push({
        x: Math.random(),
        y: Math.random() * 0.6, // upper area
        r: rand(0.6, 2.4),
        ph: Math.random() * Math.PI * 2,
        tw: rand(0.6, 1.2),
      });
    }
  }
  initStarfield();

  // ---------- Wave ----------
  function startWave(wave) {
    state.wave = wave;
    state.waveBudget = 6 + Math.floor(wave * 1.4); // enemies this wave
    state.spawnTimer = 1.5;
    state.waveActive = true;
    // Replenish silo ammo
    for (const s of state.silos) {
      if (s.alive) s.ammo = s.maxAmmo;
    }
    updateHUD();
    showFloaterCenter(`WAVE ${wave}`, '#ffd17a');
  }

  function checkWaveComplete() {
    if (!state.waveActive) return;
    if (state.waveBudget > 0) return;
    if (state.enemies.some(e => !e.dead)) return;
    // Wave complete — we don't wait on player missiles / explosions to finish,
    // so the next wave starts promptly even if chain blasts are still resolving.
    state.waveActive = false;
    state.waveClearTimer = 2.0;
    // Award bonus for remaining ammo + alive cities
    let bonus = 0;
    for (const s of state.silos) if (s.alive) bonus += s.ammo * SCORE_AMMO;
    for (const c of state.cities) if (c.alive) bonus += SCORE_CITY;
    state.score += bonus;
    showFloaterCenter(`WAVE CLEAR  +${bonus}`, '#ffd17a');
    updateHUD();
  }

  // ---------- Enemy spawning ----------
  function pickEnemyTarget() {
    // Always aim at a living city or silo so enemies never land harmlessly
    const targets = [
      ...state.cities.filter(c => c.alive),
      ...state.silos.filter(s => s.alive),
    ];
    if (targets.length === 0) return { x: W / 2, y: getGroundY() - 10 };
    const t = choice(targets);
    return { x: t.x + rand(-10, 10), y: getGroundY() - 10 };
  }
  function spawnEnemy() {
    const sx = rand(50, W - 50);
    const target = pickEnemyTarget();
    const baseSpeed = (ENEMY_BASE_SPEED + (state.wave - 1) * ENEMY_WAVE_STEP) * TWEAKS.enemySpeed;
    const isMirv = state.wave >= 3 && Math.random() < 0.15;
    const e = {
      sx, sy: -20,
      x: sx, y: -20,
      tx: target.x, ty: target.y,
      vx: 0, vy: 0,
      speed: baseSpeed * (isMirv ? 0.85 : 1),
      isMirv,
      split: false,
      dead: false,
      trail: [],
      glow: Math.random() * Math.PI * 2,
    };
    const dx = e.tx - e.sx;
    const dy = e.ty - e.sy;
    const len = Math.sqrt(dx * dx + dy * dy);
    e.vx = (dx / len) * e.speed;
    e.vy = (dy / len) * e.speed;
    state.enemies.push(e);
  }

  function splitMirv(e) {
    e.split = true;
    e.dead = true;
    const baseSpeed = (ENEMY_BASE_SPEED + (state.wave - 1) * ENEMY_WAVE_STEP) * TWEAKS.enemySpeed;
    for (let i = 0; i < 3; i++) {
      const target = pickEnemyTarget();
      const dx = target.x - e.x;
      const dy = target.y - e.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      state.enemies.push({
        sx: e.x, sy: e.y,
        x: e.x, y: e.y,
        tx: target.x, ty: target.y,
        vx: (dx / len) * baseSpeed,
        vy: (dy / len) * baseSpeed,
        speed: baseSpeed,
        isMirv: false,
        split: false,
        dead: false,
        trail: [],
        glow: Math.random() * Math.PI * 2,
      });
    }
    state.explosions.push({
      x: e.x, y: e.y,
      r: 0, maxR: 24,
      t: 0, dur: 0.4,
      color: '#ffd17a',
      enemy: true,
      mini: true,
    });
  }

  // ---------- Player missile ----------
  function fireMissile(targetX, targetY, siloIdx) {
    // Pick silo
    let silo;
    if (siloIdx != null) silo = state.silos[siloIdx];
    else {
      // Nearest with ammo
      let best = null, bestD = Infinity;
      for (const s of state.silos) {
        if (!s.alive || s.ammo <= 0) continue;
        const d = Math.abs(s.x - targetX);
        if (d < bestD) { bestD = d; best = s; }
      }
      silo = best;
    }
    if (!silo || !silo.alive || silo.ammo <= 0) {
      // No ammo — beep
      showFloater(targetX, targetY, 'NO AMMO', '#ff5c7c');
      return false;
    }
    silo.ammo--;
    const sx = silo.x, sy = silo.y - 22;
    // Clamp the target so missiles never fire downward.
    // The target must be at least 40px above the silo's launch point.
    if (targetY > sy - 40) targetY = sy - 40;
    // Also keep it inside the play area horizontally.
    targetX = clamp(targetX, 20, W - 20);
    const dx = targetX - sx, dy = targetY - sy;
    const len = Math.sqrt(dx * dx + dy * dy);
    state.players.push({
      sx, sy, x: sx, y: sy,
      tx: targetX, ty: targetY,
      vx: (dx / len) * PLAYER_SPEED,
      vy: (dy / len) * PLAYER_SPEED,
      exploded: false,
      trail: [],
    });
    return true;
  }

  // ---------- Update ----------
  let lastTime = performance.now();
  function loop(now) {
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.1) dt = 0.1;
    if (state.phase === 'playing') update(dt);
    else updateIdle(dt);
    draw();
    requestAnimationFrame(loop);
  }
  function updateIdle(dt) {
    state.elapsed += dt * 0.5;
  }
  function update(dt) {
    state.elapsed += dt;

    // Enemy spawning
    if (state.waveActive && state.waveBudget > 0) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        spawnEnemy();
        state.waveBudget--;
        const interval = Math.max(0.3, (1.6 - state.wave * 0.06) / TWEAKS.spawnRate);
        state.spawnTimer = interval * rand(0.7, 1.3);
      }
    }

    // Enemy movement
    const ammoEmpty = state.silos.every(s => !s.alive || s.ammo <= 0);
    const desperateMul = ammoEmpty ? 2.6 : 1.0;
    for (const e of state.enemies) {
      // Trail decay always runs so stale trails fade out even after the enemy dies
      for (const t of e.trail) t.life -= dt;
      if (e.dead) continue;
      e.x += e.vx * dt * desperateMul;
      e.y += e.vy * dt * desperateMul;
      e.glow += dt * 4;
      e.trail.push({ x: e.x, y: e.y, life: 0.5 });
      if (e.trail.length > 24) e.trail.shift();
      // MIRV split midway
      if (e.isMirv && !e.split && e.y > H * 0.35) splitMirv(e);
      // Reached ground?
      if (e.y >= e.ty) {
        // Hit a city or silo at this x?
        e.dead = true;
        // Find nearest city/silo
        let target = null, targetType = null, bestD = 60 * 60;
        for (const c of state.cities) {
          if (!c.alive) continue;
          const d = (c.x - e.x) ** 2;
          if (d < bestD) { bestD = d; target = c; targetType = 'city'; }
        }
        for (const s of state.silos) {
          if (!s.alive) continue;
          const d = (s.x - e.x) ** 2;
          if (d < bestD) { bestD = d; target = s; targetType = 'silo'; }
        }
        // Explosion
        state.explosions.push({
          x: e.x, y: e.ty - 4,
          r: 0, maxR: 36,
          t: 0, dur: 0.5,
          color: '#ff5c7c',
          enemy: true,
        });
        state.shake = Math.min(0.8, state.shake + 0.3);
        if (target) {
          target.alive = false;
          target.deathT = 0;
        }
      }
    }
    state.enemies = state.enemies.filter(e => !e.dead || e.trail.some(t => t.life > 0));

    // Player missiles
    for (const p of state.players) {
      for (const t of p.trail) t.life -= dt; // always decay
      if (p.exploded) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.trail.push({ x: p.x, y: p.y, life: 0.6 });
      if (p.trail.length > 24) p.trail.shift();
      // Reached target
      const d = dist2(p.x, p.y, p.tx, p.ty);
      if (d < 200) {
        p.exploded = true;
        p.trail = []; // clear trail immediately on explosion
        state.explosions.push({
          x: p.tx, y: p.ty,
          r: 0, maxR: PLAYER_MAX_RADIUS * TWEAKS.blastRadius,
          t: 0, dur: 0.85,
          color: '#7ad1ff',
          enemy: false,
          primary: true, // marks the initial player blast for perfect-hit bonus
        });
      }
    }
    state.players = state.players.filter(p => !p.exploded || p.trail.some(t => t.life > 0));

    // Explosions
    for (const ex of state.explosions) {
      // Delayed explosions wait before activating (allows chain pacing)
      if (ex.delay && ex.delay > 0) {
        ex.delay -= dt;
        continue;
      }
      ex.t += dt;
      // Grow then hold then fade
      const g = ex.dur * 0.35;
      if (ex.t < g) ex.r = ex.maxR * (ex.t / g);
      else if (ex.t < ex.dur * 0.6) ex.r = ex.maxR;
      else ex.r = ex.maxR * (1 - (ex.t - ex.dur * 0.6) / (ex.dur * 0.4));
      // Damage check (player explosions only)
      if (!ex.enemy) {
        for (const e of state.enemies) {
          if (e.dead) continue;
          const d2 = dist2(e.x, e.y, ex.x, ex.y);
          if (d2 <= ex.r * ex.r) {
            e.dead = true;
            const depth = ex.chainDepth || 0;
            const isPerfect = depth === 0 && ex.primary && d2 < 18 * 18;
            const base = e.isMirv ? SCORE_MIRV : SCORE_ENEMY;
            const chainMul = 1 + depth * 0.5; // +50% per chain depth
            const points = Math.round(base * chainMul * (isPerfect ? 3 : 1));
            state.score += points;
            updateHUD();
            // Spawn chain explosions
            if (depth < 4) {
              if (depth === 0) {
                // First chain: single secondary, offset along the kill direction
                spawnChainBlast(e.x, e.y, ex.x, ex.y, depth + 1, isPerfect);
              } else {
                // Deeper chains: two angled sub-blasts at ±45° of the approach
                const approachAng = Math.atan2(e.y - ex.y, e.x - ex.x);
                spawnAngledBlast(e.x, e.y, approachAng + Math.PI / 4, depth + 1);
                spawnAngledBlast(e.x, e.y, approachAng - Math.PI / 4, depth + 1);
              }
            }
            // Feedback
            if (isPerfect) {
              state.shake = Math.min(0.6, state.shake + 0.3);
              showFloater(e.x, e.y - 14, `PERFECT! +${points}`, '#ff6b9d');
              for (let i = 0; i < 16; i++) {
                const a = Math.random() * Math.PI * 2;
                const sp = rand(140, 360);
                state.particles.push({
                  x: e.x, y: e.y,
                  vx: Math.cos(a) * sp,
                  vy: Math.sin(a) * sp - 120,
                  life: rand(0.5, 0.9),
                  size: rand(4, 8),
                  color: choice(['#ff6b9d', '#ffd17a', '#7ad1ff', '#fff4dc']),
                });
              }
            } else if (depth > 0) {
              showFloater(e.x, e.y, `CHAIN ×${depth + 1}  +${points}`, '#ffba6b');
            } else {
              showFloater(e.x, e.y, `+${points}`, '#ffd17a');
            }
            // City award threshold
            if (state.score >= state.awardThreshold) {
              awardCity();
              state.awardThreshold += CITY_AWARD_EVERY;
            }
          }
        }
      }
    }
    state.explosions = state.explosions.filter(e => (e.delay && e.delay > 0) || e.t < e.dur);

    // Floaters
    for (const f of state.floaters) {
      f.t += dt;
      f.y -= 40 * dt;
    }
    state.floaters = state.floaters.filter(f => f.t < f.dur);

    // Particles
    for (const p of state.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 300 * dt;
      p.life -= dt;
    }
    state.particles = state.particles.filter(p => p.life > 0);

    // Shake decay
    if (state.shake > 0) {
      state.shake = Math.max(0, state.shake - dt * 3);
      state.shakeX = (Math.random() - 0.5) * state.shake * 14;
      state.shakeY = (Math.random() - 0.5) * state.shake * 14;
    } else {
      state.shakeX = state.shakeY = 0;
    }

    // Check wave complete
    checkWaveComplete();

    // Wave clear timer
    if (state.waveClearTimer > 0) {
      state.waveClearTimer -= dt;
      if (state.waveClearTimer <= 0) {
        startWave(state.wave + 1);
      }
    }

    // Check game over: all cities destroyed
    if (state.cities.every(c => !c.alive)) {
      gameOver();
    }
  }

  function spawnChainBlast(targetX, targetY, fromX, fromY, depth, isPerfect) {
    // Offset along the kill direction so the new blast doesn't fully overlap
    const dx = targetX - fromX, dy = targetY - fromY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / len, uy = dy / len;
    const offDist = rand(12, 22);
    state.explosions.push({
      x: targetX + ux * offDist,
      y: targetY + uy * offDist,
      r: 0,
      maxR: (isPerfect ? 110 : 100) * TWEAKS.blastRadius, // ~2× the old chain size
      t: 0, dur: 0.85,
      color: isPerfect ? '#ff6b9d' : '#ffba6b',
      enemy: false,
      delay: rand(0.1, 0.2),
      chainDepth: depth,
    });
  }

  function spawnAngledBlast(targetX, targetY, angle, depth) {
    const offDist = rand(16, 26);
    state.explosions.push({
      x: targetX + Math.cos(angle) * offDist,
      y: targetY + Math.sin(angle) * offDist,
      r: 0,
      maxR: 84 * TWEAKS.blastRadius,
      t: 0, dur: 0.75,
      color: depth >= 3 ? '#7ad1ff' : '#ffd17a',
      enemy: false,
      delay: rand(0.12, 0.22),
      chainDepth: depth,
    });
  }

  function awardCity() {
    // Find a destroyed city and revive it
    const dead = state.cities.filter(c => !c.alive);
    if (dead.length === 0) return;
    const c = choice(dead);
    c.alive = true;
    showFloater(c.x, c.y - 30, 'BONUS CITY', '#8aea7a');
    updateHUD();
  }

  function showFloater(x, y, text, color) {
    window.MathArcadeAudio?.event(text);
    state.floaters.push({ x, y, text, color, t: 0, dur: 1.1, big: false });
  }
  function showFloaterCenter(text, color) {
    window.MathArcadeAudio?.event(text);
    state.floaters.push({ x: W / 2, y: H * 0.35, text, color, t: 0, dur: 1.4, big: true });
  }

  // ---------- HUD ----------
  function updateHUD() {
    document.getElementById('score').textContent = state.score;
    document.getElementById('wave').textContent = state.wave;
    const strip = document.getElementById('cities-strip');
    strip.innerHTML = '';
    for (const c of state.cities) {
      const el = document.createElement('span');
      el.className = 'city-icon' + (c.alive ? '' : ' gone');
      el.style.background = c.color;
      strip.appendChild(el);
    }
  }

  // ---------- Mouse / keys ----------
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    state.mouseX = e.clientX - rect.left;
    state.mouseY = e.clientY - rect.top;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (state.phase !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    fireMissile(e.clientX - rect.left, e.clientY - rect.top, null);
  });
  window.addEventListener('keydown', (e) => {
    if (state.phase === 'title' || state.phase === 'game_over') {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startGame(); return; }
    }
    if (e.key === 'p' || e.key === 'P') { e.preventDefault(); togglePause(); return; }
    if (state.phase !== 'playing') return;
    if (e.key === 'a' || e.key === 'A') fireMissile(state.mouseX, state.mouseY, 0);
    if (e.key === 's' || e.key === 'S') fireMissile(state.mouseX, state.mouseY, 1);
    if (e.key === 'd' || e.key === 'D') fireMissile(state.mouseX, state.mouseY, 2);
  });

  // ---------- Phases ----------
  function startGame() {
    state.phase = 'playing';
    state.score = 0;
    state.wave = 0;
    state.enemies = [];
    state.players = [];
    state.explosions = [];
    state.particles = [];
    state.floaters = [];
    state.shake = 0;
    state.awardThreshold = CITY_AWARD_EVERY;
    setupBase();
    startWave(1);
    document.getElementById('overlay').classList.add('hidden');
    updateHUD();
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
      localStorage.setItem('missilecommand_best', String(state.best));
    }
    showGameOverCard();
  }
  function showGameOverCard() {
    const overlay = document.getElementById('overlay');
    overlay.querySelector('.card').remove();
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h1><span class="acc">CITIES</span> <span class="acc2">LOST</span></h1>
      <div class="sub">the meteor swarm got through</div>
      <div class="stats-row">
        <div class="stat-chip"><div class="stat-label">Score</div><div class="stat-val">${state.score}</div></div>
        <div class="stat-chip"><div class="stat-label">Wave</div><div class="stat-val">${state.wave}</div></div>
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
    drawSky();
    drawStars();
    drawMountains();
    drawGround();
    drawCities();
    drawSilos();
    drawEnemies();
    drawPlayerMissiles();
    drawExplosions();
    drawParticles();
    drawFloaters();
    drawCrosshair();
    ctx.restore();
  }

  function drawSky() {
    const p = P();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, p.skyTop);
    g.addColorStop(0.6, p.skyMid);
    g.addColorStop(1, p.skyBot);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawStars() {
    const p = P();
    const t = state.elapsed;
    ctx.fillStyle = p.starColor;
    for (const s of state.starfield) {
      const x = s.x * W;
      const y = s.y * H;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * s.tw + s.ph));
      ctx.globalAlpha = tw;
      ctx.beginPath();
      ctx.arc(x, y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawMountains() {
    const p = P();
    const baseY = getGroundY();
    // Far mountains
    ctx.fillStyle = p.mountainsFar;
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    const step = 40;
    for (let x = 0; x <= W; x += step) {
      const h = 60 + 40 * Math.abs(Math.sin(x * 0.012 + 1));
      ctx.lineTo(x, baseY - h);
    }
    ctx.lineTo(W, baseY);
    ctx.closePath();
    ctx.fill();
    // Near mountains
    ctx.fillStyle = p.mountainsNear;
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    for (let x = 0; x <= W; x += step) {
      const h = 30 + 25 * Math.abs(Math.sin(x * 0.018 + 0.3));
      ctx.lineTo(x, baseY - h);
    }
    ctx.lineTo(W, baseY);
    ctx.closePath();
    ctx.fill();
  }

  function drawGround() {
    const p = P();
    const top = getGroundY();
    const g = ctx.createLinearGradient(0, top, 0, H);
    g.addColorStop(0, p.groundTop);
    g.addColorStop(1, p.groundBot);
    ctx.fillStyle = g;
    ctx.fillRect(0, top, W, H - top);
    // Top edge highlight
    ctx.strokeStyle = '#fff4dc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, top);
    ctx.lineTo(W, top);
    ctx.stroke();
  }

  function drawCities() {
    for (const c of state.cities) {
      drawCity(c);
    }
  }
  function drawCity(c) {
    const groundY = c.y;
    const bob = c.alive ? Math.sin(state.elapsed * 2 + c.bobPhase) * 1 : 0;
    if (!c.alive) {
      // Rubble
      ctx.fillStyle = '#3a2a4a';
      ctx.strokeStyle = '#1a1428';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(c.x - 24, groundY);
      ctx.lineTo(c.x - 18, groundY - 10);
      ctx.lineTo(c.x - 8, groundY - 6);
      ctx.lineTo(c.x, groundY - 12);
      ctx.lineTo(c.x + 10, groundY - 4);
      ctx.lineTo(c.x + 20, groundY - 8);
      ctx.lineTo(c.x + 24, groundY);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      return;
    }
    // Building cluster: 3 buildings
    const buildings = [
      { dx: -18, w: 14, h: 28 },
      { dx: -2, w: 16, h: 38 },
      { dx: 14, w: 14, h: 24 },
    ];
    for (const b of buildings) {
      const bx = c.x + b.dx - b.w / 2;
      const by = groundY - b.h + bob;
      // Body
      ctx.fillStyle = c.color;
      ctx.strokeStyle = '#1a1428';
      ctx.lineWidth = 2;
      ctx.fillRect(bx, by, b.w, b.h);
      ctx.strokeRect(bx, by, b.w, b.h);
      // Roof
      ctx.fillStyle = '#fff4dc';
      ctx.fillRect(bx - 2, by - 4, b.w + 4, 4);
      ctx.strokeRect(bx - 2, by - 4, b.w + 4, 4);
      // Windows (eyes)
      ctx.fillStyle = '#ffd17a';
      const wRows = Math.floor(b.h / 8);
      for (let i = 0; i < wRows - 1; i++) {
        const wy = by + 4 + i * 8;
        ctx.fillRect(bx + 2, wy, 3, 3);
        ctx.fillRect(bx + b.w - 5, wy, 3, 3);
      }
    }
    // Smile under (face)
    ctx.strokeStyle = '#1a1428';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(c.x, groundY - 6 + bob, 8, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  function drawSilos() {
    for (const s of state.silos) {
      drawSilo(s);
    }
  }
  function drawSilo(s) {
    if (!s.alive) {
      ctx.fillStyle = '#3a2a4a';
      ctx.strokeStyle = '#1a1428';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.x - 24, s.y);
      ctx.lineTo(s.x - 18, s.y - 10);
      ctx.lineTo(s.x - 4, s.y - 4);
      ctx.lineTo(s.x + 8, s.y - 12);
      ctx.lineTo(s.x + 24, s.y);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      return;
    }
    const p = P();
    const bob = Math.sin(state.elapsed * 2.5 + s.bobPhase) * 1;
    // Base trapezoid
    ctx.fillStyle = p.siloColor;
    ctx.strokeStyle = '#1a1428';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(s.x - 28, s.y);
    ctx.lineTo(s.x - 22, s.y - 24);
    ctx.lineTo(s.x + 22, s.y - 24);
    ctx.lineTo(s.x + 28, s.y);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Turret top (dome)
    ctx.save();
    ctx.translate(s.x, s.y - 22 + bob);
    ctx.fillStyle = '#fff4dc';
    ctx.beginPath();
    ctx.arc(0, 0, 12, Math.PI, 0);
    ctx.lineTo(12, 4);
    ctx.lineTo(-12, 4);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Eyes
    ctx.fillStyle = '#1a1428';
    ctx.beginPath();
    ctx.arc(-4, -3, 2, 0, Math.PI * 2);
    ctx.arc(4, -3, 2, 0, Math.PI * 2);
    ctx.fill();
    // Smile
    ctx.strokeStyle = '#1a1428';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 1, 4, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.lineCap = 'butt';
    // Missile spike on top
    ctx.fillStyle = '#ff5c7c';
    ctx.strokeStyle = '#1a1428';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-3, -9);
    ctx.lineTo(0, -16);
    ctx.lineTo(3, -9);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
    // Ammo dots
    for (let i = 0; i < s.maxAmmo; i++) {
      const ax = s.x - 22 + (i % 5) * 9;
      const ay = s.y - 8 + Math.floor(i / 5) * 6;
      ctx.fillStyle = i < s.ammo ? '#ff5c7c' : 'rgba(255, 92, 124, 0.18)';
      ctx.strokeStyle = '#1a1428';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ax, ay, 2.5, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
  }

  // ---------- Enemies ----------
  function drawEnemies() {
    for (const e of state.enemies) {
      // Trail
      for (let i = 0; i < e.trail.length; i++) {
        const t = e.trail[i];
        if (t.life <= 0) continue;
        const a = t.life / 0.5;
        ctx.globalAlpha = a * 0.7;
        ctx.fillStyle = '#ff5c7c';
        ctx.beginPath();
        ctx.arc(t.x, t.y, 3 * a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (e.dead) continue;
      // Body
      const pulse = 0.5 + 0.5 * Math.sin(e.glow);
      ctx.save();
      ctx.translate(e.x, e.y);
      // Rotate to direction
      const ang = Math.atan2(e.vy, e.vx) - Math.PI / 2;
      ctx.rotate(ang);
      // Glow
      const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 18);
      glow.addColorStop(0, 'rgba(255, 92, 124, 0.7)');
      glow.addColorStop(1, 'rgba(255, 92, 124, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(-20, -20, 40, 40);
      // Missile body (oval)
      ctx.fillStyle = e.isMirv ? '#ff8a3d' : '#ff5c7c';
      ctx.strokeStyle = '#1a1428';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 12, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      // Grumpy eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-3, -3, 2.5, 0, Math.PI * 2);
      ctx.arc(3, -3, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1428';
      ctx.beginPath();
      ctx.arc(-3, -2, 1.3, 0, Math.PI * 2);
      ctx.arc(3, -2, 1.3, 0, Math.PI * 2);
      ctx.fill();
      // Frown
      ctx.strokeStyle = '#1a1428';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 4, 3, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
      ctx.lineCap = 'butt';
      // Tail flame
      ctx.fillStyle = '#ffd17a';
      ctx.beginPath();
      ctx.moveTo(-3, 11);
      ctx.lineTo(0, 18 + pulse * 3);
      ctx.lineTo(3, 11);
      ctx.closePath();
      ctx.fill();
      if (e.isMirv) {
        // MIRV badge
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px "Lilita One", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('M', 0, 0);
      }
      ctx.restore();
    }
  }

  function drawPlayerMissiles() {
    for (const p of state.players) {
      // Trail
      for (let i = 0; i < p.trail.length; i++) {
        const t = p.trail[i];
        if (t.life <= 0) continue;
        const a = t.life / 0.6;
        ctx.globalAlpha = a * 0.85;
        ctx.fillStyle = '#7ad1ff';
        ctx.beginPath();
        ctx.arc(t.x, t.y, 3 * a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (p.exploded) continue;
      // Head
      ctx.fillStyle = '#fff4dc';
      ctx.strokeStyle = '#1a1428';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      // Aim line (faded line to target)
      ctx.strokeStyle = 'rgba(122, 209, 255, 0.2)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.tx, p.ty);
      ctx.stroke();
      ctx.setLineDash([]);
      // Target marker
      ctx.strokeStyle = '#7ad1ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.tx, p.ty, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p.tx - 8, p.ty); ctx.lineTo(p.tx - 3, p.ty);
      ctx.moveTo(p.tx + 3, p.ty); ctx.lineTo(p.tx + 8, p.ty);
      ctx.moveTo(p.tx, p.ty - 8); ctx.lineTo(p.tx, p.ty - 3);
      ctx.moveTo(p.tx, p.ty + 3); ctx.lineTo(p.tx, p.ty + 8);
      ctx.stroke();
    }
  }

  // ---------- Explosions ----------
  function drawExplosions() {
    for (const ex of state.explosions) {
      if (ex.delay && ex.delay > 0) continue;
      const t = ex.t / ex.dur;
      const a = 1 - t * 0.4;
      ctx.globalAlpha = a;
      // Outer glow
      const grd = ctx.createRadialGradient(ex.x, ex.y, ex.r * 0.3, ex.x, ex.y, ex.r);
      grd.addColorStop(0, ex.color);
      grd.addColorStop(0.7, hexA(ex.color, 0.4));
      grd.addColorStop(1, hexA(ex.color, 0));
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI * 2);
      ctx.fill();
      // Core
      ctx.fillStyle = '#fff4dc';
      ctx.globalAlpha = a * 0.85;
      ctx.beginPath();
      ctx.arc(ex.x, ex.y, ex.r * 0.35, 0, Math.PI * 2);
      ctx.fill();
      // Outline
      ctx.globalAlpha = a;
      ctx.strokeStyle = ex.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function hexA(hex, a) {
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  function drawParticles() {
    for (const p of state.particles) {
      const a = clamp(p.life / 0.8, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.globalAlpha = 1;
    }
  }

  function drawFloaters() {
    for (const f of state.floaters) {
      const t = f.t / f.dur;
      const a = 1 - t;
      const scale = f.big ? (1 + (1 - Math.min(1, t * 3)) * 0.4) : (1 + t * 0.3);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(f.x, f.y);
      ctx.scale(scale, scale);
      ctx.font = f.big ? 'bold 42px "Lilita One", sans-serif' : 'bold 22px "Lilita One", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = f.big ? 5 : 3;
      ctx.strokeStyle = '#1a1428';
      ctx.strokeText(f.text, 0, 0);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, 0, 0);
      ctx.restore();
    }
  }

  function drawCrosshair() {
    if (state.phase !== 'playing') return;
    const x = state.mouseX, y = state.mouseY;
    // Pick the silo that would fire (nearest with ammo)
    let bestS = null, bestD = Infinity;
    for (const s of state.silos) {
      if (!s.alive || s.ammo <= 0) continue;
      const d = Math.abs(s.x - x);
      if (d < bestD) { bestD = d; bestS = s; }
    }
    // If cursor is too low (would clamp), show the clamped target instead
    let aimY = y;
    let clamped = false;
    if (bestS && y > bestS.y - 22 - 40) { aimY = bestS.y - 22 - 40; clamped = true; }
    // Crosshair (at actual cursor)
    ctx.strokeStyle = bestS ? (clamped ? '#ffba6b' : '#7ad1ff') : '#ff5c7c';
    ctx.lineWidth = 2;
    const r = 14;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.moveTo(x - r - 4, y); ctx.lineTo(x - r + 4, y);
    ctx.moveTo(x + r - 4, y); ctx.lineTo(x + r + 4, y);
    ctx.moveTo(x, y - r - 4); ctx.lineTo(x, y - r + 4);
    ctx.moveTo(x, y + r - 4); ctx.lineTo(x, y + r + 4);
    ctx.stroke();
    // Dot center
    ctx.fillStyle = bestS ? (clamped ? '#ffba6b' : '#7ad1ff') : '#ff5c7c';
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
    // Trajectory hint — always from silo to the *actual* aim point
    if (bestS) {
      ctx.strokeStyle = 'rgba(122, 209, 255, 0.25)';
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.moveTo(bestS.x, bestS.y - 22);
      ctx.lineTo(x, aimY);
      ctx.stroke();
      ctx.setLineDash([]);
      // If clamped, show a small marker where the missile will actually go
      if (clamped) {
        ctx.strokeStyle = '#ffba6b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, aimY, 5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  // =====================================================================
  // TWEAKS
  // =====================================================================
  function setupTweaks() {
    // Palette
    const paletteRow = document.getElementById('palette-row');
    paletteRow.querySelectorAll('.opt').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.value === TWEAKS.palette);
      opt.addEventListener('click', () => {
        TWEAKS.palette = opt.dataset.value;
        paletteRow.querySelectorAll('.opt').forEach(o => o.classList.toggle('active', o.dataset.value === TWEAKS.palette));
        // Update city colors live
        const p = P();
        for (let i = 0; i < state.cities.length; i++) state.cities[i].color = p.cityColors[i];
        updateHUD();
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
    slider('enemy-speed', 'enemySpeed', 'enemy-val', v => `${v.toFixed(1)}×`);
    slider('spawn-rate', 'spawnRate', 'spawn-val', v => `${v.toFixed(1)}×`);
    slider('ammo-count', 'ammoCount', 'ammo-val', v => `${v}`);
    slider('blast-radius', 'blastRadius', 'blast-val', v => `${v.toFixed(1)}×`);

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

  // ---------- Kick off ----------
  setupBase();
  updateHUD();
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
