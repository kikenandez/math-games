// =====================================================================
// NUMBERFALL — cargo edition
// Procedural cartoon game on canvas. Vanilla JS.
// =====================================================================

(() => {
  // ---------- Canvas ----------
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0;
  let DPR = Math.min(window.devicePixelRatio || 1, 2);
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

  // ---------- Palettes ----------
  const PALETTES = {
    sunset: {
      name: 'Sunset',
      skyTop: '#ffd29a',
      skyMid: '#ffb89e',
      skyBot: '#a9d8e8',
      sun: '#ffeaa3',
      sunGlow: 'rgba(255, 220, 140, 0.55)',
      mountainsFar: '#8b7aa8',
      mountainsNear: '#6b5d8e',
      hillsFar: '#7ab66a',
      hillsNear: '#4f9a55',
      hillsShadow: '#3a7842',
      road: '#d4a574',
      roadDark: '#b3895a',
      roadEdge: '#8c6940',
      roadLine: '#fff4dc',
      poleColor: '#553a26',
      treeTrunk: '#5a3a26',
      treeLeaf: '#3b8848',
      cloud: '#fff4dc',
      ink: '#1d2939',
      swatch: '#ff9c5a',
    },
    noon: {
      name: 'Noon',
      skyTop: '#7ccfee',
      skyMid: '#b9e5f4',
      skyBot: '#e7f5fb',
      sun: '#fff6a8',
      sunGlow: 'rgba(255, 246, 168, 0.55)',
      mountainsFar: '#8aa5c0',
      mountainsNear: '#6388aa',
      hillsFar: '#8acf6f',
      hillsNear: '#5fb05a',
      hillsShadow: '#4a8a47',
      road: '#cfb999',
      roadDark: '#a89578',
      roadEdge: '#7c6a52',
      roadLine: '#fff4dc',
      poleColor: '#4a3525',
      treeTrunk: '#5a3a26',
      treeLeaf: '#3fa14a',
      cloud: '#ffffff',
      ink: '#1d2939',
      swatch: '#7ccfee',
    },
    dusk: {
      name: 'Dusk',
      skyTop: '#3b2d63',
      skyMid: '#7a4a8a',
      skyBot: '#ee8a6a',
      sun: '#ffd17e',
      sunGlow: 'rgba(255, 170, 110, 0.45)',
      mountainsFar: '#4a3964',
      mountainsNear: '#322447',
      hillsFar: '#3a5a5e',
      hillsNear: '#28464a',
      hillsShadow: '#1c343a',
      road: '#6b5772',
      roadDark: '#4d3e58',
      roadEdge: '#2e2438',
      roadLine: '#ffe2a8',
      poleColor: '#1a1424',
      treeTrunk: '#1a1424',
      treeLeaf: '#1f3a3a',
      cloud: '#d6b9d8',
      ink: '#1d2939',
      swatch: '#7a4a8a',
    },
  };
  const TRUCK_COLORS = {
    red:    { name:'Red',    body:'#e74c3c', cab:'#fff4dc', accent:'#b1331f', detail:'#1d2939' },
    teal:   { name:'Teal',   body:'#3aa6a0', cab:'#fff4dc', accent:'#1f6e6a', detail:'#1d2939' },
    yellow: { name:'Yellow', body:'#ffc94d', cab:'#fff4dc', accent:'#b7842a', detail:'#1d2939' },
    blue:   { name:'Blue',   body:'#4a78d4', cab:'#fff4dc', accent:'#2a4a90', detail:'#1d2939' },
  };

  // ---------- Tweakable defaults ----------
  const TWEAKS = /*EDITMODE-BEGIN*/{
    "palette": "sunset",
    "truckColor": "red",
    "bgSpeed": 1.0,
    "spawnRate": 1.0,
    "gravity": 1.0,
    "launchPower": 1.0,
    "allowNegatives": false
  }/*EDITMODE-END*/;

  // ---------- State ----------
  const state = {
    phase: 'title', // title | playing | paused | gameover
    score: 0,
    best: parseInt(localStorage.getItem('numberfall_best') || '0', 10) || 0,
    level: 1,
    lives: 3,
    boxes: [],
    particles: [],
    floaters: [], // floating "+10" texts
    roadRocks: [], // visual rocks scrolling on the road
    ambientRockTimer: 0,
    spawnTimer: 1.2,
    spawnInterval: 2.6,
    pendingBumpRock: false, // a rock has been queued; wait until it crosses the wheel
    boxesSpawned: 0, // counter for level progression
    elapsed: 0,
    shake: 0,
    shakeX: 0, shakeY: 0,
    truckBumpT: 0, // active bump animation timer
    truckBumpDur: 0.7,
    truckPendingLaunch: false,
    pendingLaunchCount: 1,
    truckDriveBounce: 0,
    pendingClear: null, // {value, x, y} for the latest combo
    sunPulse: 0,
    inputBuffer: '',
  };

  // ---------- Helpers ----------
  const rand = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const easeOutBack = (t) => {
    const c1 = 1.70158; const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOut = (t) => t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2;

  // ---------- Math expression generator ----------
  function genExpression(level) {
    const allowNeg = !!TWEAKS.allowNegatives;
    const ops = ['+', '−'];
    if (level >= 3) ops.push('×');
    if (level >= 5) ops.push('÷');
    const op = choice(ops);
    const maxN = Math.min(20, 4 + level * 2);
    let a, b, result;
    if (op === '+') {
      a = randInt(1, maxN); b = randInt(1, maxN);
      if (allowNeg && Math.random() < 0.3) a = -a;
      if (allowNeg && Math.random() < 0.25) b = -b;
      result = a + b;
    } else if (op === '−') {
      a = randInt(2, maxN + 5); b = randInt(1, maxN);
      if (!allowNeg && b > a) { const t = a; a = b; b = t; } // ensure non-neg result
      if (allowNeg && Math.random() < 0.25) b = -b;
      if (allowNeg && Math.random() < 0.2) a = -a;
      result = a - b;
    } else if (op === '×') {
      const cap = Math.min(9, 3 + Math.floor(level / 2));
      a = randInt(2, cap); b = randInt(2, cap);
      if (allowNeg && Math.random() < 0.2) a = -a;
      result = a * b;
    } else { // ÷
      b = randInt(2, Math.min(9, 4 + Math.floor(level/2)));
      result = randInt(2, 12);
      a = b * result;
      if (allowNeg && Math.random() < 0.18) { a = -a; result = -result; }
    }
    const fmt = (n) => n < 0 ? `(${n})` : `${n}`;
    return { left: fmt(a), op, right: fmt(b), result };
  }

  // ---------- Box types ----------
  const BOX_TYPES = ['cardboard', 'crate', 'barrel'];

  // ---------- Spawn / launch ----------
  const ROAD_SCROLL = 500; // px/sec at bgSpeed=1
  const GROUND_Y_OFFSET = 100; // road top distance from bottom of screen

  function getTruckMetrics() {
    const cargoH = clamp(H * 0.42, 240, 420);
    // Long cargo; half-ish is offscreen so we see only the rear side
    const cargoW = clamp(W * 0.78, 540, 1100);
    return { cargoH, cargoW };
  }
  function getTruckPos() {
    const m = getTruckMetrics();
    return {
      // Anchor so roughly half the cargo is offscreen to the right
      x: W - 60, // center 60px inset from right edge
      y: H - GROUND_Y_OFFSET - 50 - m.cargoH / 2,
    };
  }
  // Front-most back wheel (the one that hits an incoming rock first)
  function getBackWheelXR() {
    const t = getTruckPos();
    const m = getTruckMetrics();
    return t.x - m.cargoW * 0.25;
  }
  function getBackWheelXL() {
    const t = getTruckPos();
    const m = getTruckMetrics();
    return t.x - m.cargoW * 0.35;
  }

  function getSpawnInterval(level) {
    if (level === 1) return 4.5;
    if (level === 2) return 3.8;
    if (level === 3) return 3.2;
    if (level === 4) return 2.8;
    if (level === 5) return 2.4;
    if (level === 6) return 2.1;
    if (level === 7) return 1.8;
    return Math.max(1.4, 1.8 - (level - 7) * 0.1);
  }
  function getBoxesPerBump(level) {
    if (level >= 8) return Math.random() < 0.6 ? 3 : 2;
    if (level >= 6) return Math.random() < 0.3 ? 3 : 2;
    if (level >= 4) return 2;
    if (level >= 3) return Math.random() < 0.5 ? 2 : 1;
    return 1;
  }

  function spawnBox(idx, total) {
    idx = idx || 0; total = total || 1;
    const type = choice(BOX_TYPES);
    const expr = genExpression(state.level);
    const t = getTruckPos();
    const m = getTruckMetrics();
    const cargoTop = t.y - m.cargoH / 2;
    // Multi-box spread: -0.5 .. +0.5 across the batch
    const spread = total > 1 ? (idx - (total - 1) / 2) / Math.max(1, total - 1) : 0;

    // ---- Spawn position: top of cargo near the rear (left half of cargo) ----
    const hudBottom = 80;
    const launchBumpOffset = -20;
    // Rear quarter of the visible cargo top so boxes pop from behind
    let startX = t.x - m.cargoW * 0.32 + rand(-30, 30);
    let startY = cargoTop + launchBumpOffset - 4;
    if (startY < hudBottom + 80) startY = hudBottom + 80;

    // ---- Trajectory: target a constant flight time across screen sizes ----
    const groundY = H - GROUND_Y_OFFSET;
    const power = TWEAKS.launchPower;

    // Cap rise so the box stays under HUD
    const maxSafeRise = startY - (hudBottom + 10);
    // Desired rise: scale with available vertical room
    const desiredRise = clamp(Math.min(maxSafeRise, H * 0.22), 30, 220) * (1 + spread * 0.10);

    // Solve for g given target flight time so reaction time is consistent.
    // T = sqrt(2*rise/g) + sqrt(2*fall/g)  =>  g = ((sqrt(2*rise)+sqrt(2*fall))/T)^2
    const fallDist = desiredRise + (groundY - startY);
    const T_target = 4.2; // seconds, slightly long for comfortable reactions
    const flightSum = Math.sqrt(2 * desiredRise) + Math.sqrt(2 * fallDist);
    let g = Math.pow(flightSum / T_target, 2);
    g *= TWEAKS.gravity; // user tweak
    const baseVy = Math.sqrt(2 * g * desiredRise);
    const vy = -baseVy * power;

    const peakTime = baseVy / g;
    const fallTime = Math.sqrt(2 * fallDist / g);
    const T = peakTime + fallTime;

    // Pick landing X within viewport so box never leaves the screen.
    const landMin = W * 0.08;
    const landMax = W * 0.62;
    const landBand = lerp(landMin, landMax, (spread + 0.5));
    const landingX = clamp(landBand + rand(-40, 40), landMin, landMax);
    const vx = ((landingX - startX) / T) * power;

    const size = type === 'barrel' ? 82 : 92;
    state.boxes.push({
      type, expr,
      x: startX, y: startY,
      vx, vy,
      g, // per-box gravity so physics matches launch calc
      w: size, h: size,
      rot: rand(-0.15, 0.15),
      rotV: rand(-1.2, 1.2),
      landed: false,
      gone: false,
      popped: false,
      popT: 0,
      age: 0,
      seed: Math.random() * 1000,
    });
  }

  function tickSpawn(dt) {
    if (state.phase !== 'playing') return;
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0 && !state.pendingBumpRock && state.truckBumpT === 0) {
      // Queue a bump-rock that will trigger the bump when it crosses the wheel
      state.roadRocks.push({
        x: W + 30, // spawn offscreen right
        kind: 'bump',
        size: rand(22, 30),
        life: 0,
        bumpTrigger: true,
      });
      const base = getSpawnInterval(state.level);
      state.spawnInterval = base / TWEAKS.spawnRate;
      state.spawnTimer = state.spawnInterval + rand(-0.2, 0.3);
      state.pendingBumpRock = true;
    }
  }

  // ---------- Update ----------
  let lastTime = performance.now();
  function loop(now) {
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.1) dt = 0.1;
    try {
      if (state.phase === 'playing') update(dt);
      if (state.phase === 'paused' || state.phase === 'title' || state.phase === 'gameover') updateIdle(dt);
      draw();
    } catch (err) { console.error('Numberfall loop error:', err); }
    requestAnimationFrame(loop);
  }

  function updateIdle(dt) {
    // Keep ambient motion going even when paused/title (slower)
    state.elapsed += dt * 0.5;
    state.sunPulse += dt;
    state.truckDriveBounce += dt * 0.6;
    // Ambient road decorations keep ticking for visual life
    tickAmbientRocks(dt * 0.5);
    tickRocks(dt * 0.5);
  }

  function update(dt) {
    state.elapsed += dt;
    state.sunPulse += dt;
    state.truckDriveBounce += dt;

    // Truck bump animation
    if (state.truckBumpT > 0) {
      const prevT = state.truckBumpT;
      state.truckBumpT -= dt;
      if (state.truckBumpT < 0) state.truckBumpT = 0;
      // Launch at the peak (about 35% into anim)
      const launchPoint = state.truckBumpDur * 0.65; // remaining time at peak
      if (state.truckPendingLaunch && prevT > launchPoint && state.truckBumpT <= launchPoint) {
        const count = state.pendingLaunchCount || 1;
        for (let i = 0; i < count; i++) {
          spawnBox(i, count);
          state.boxesSpawned++;
        }
        // Puff at cargo top
        spawnEjectPuff();
        state.truckPendingLaunch = false;
      }
    }

    tickSpawn(dt);
    tickAmbientRocks(dt);
    tickRocks(dt);

    // Level progression: every 7 boxes spawned
    const targetLevel = 1 + Math.floor(state.boxesSpawned / 7);
    if (targetLevel > state.level) {
      state.level = targetLevel;
      updateHUD();
      showFloaterCenter(`LEVEL ${state.level}`, '#ff6b3d');
    }

    // Box physics
    for (const box of state.boxes) {
      if (box.gone) continue;
      if (box.popped) {
        box.popT += dt;
        if (box.popT > 0.45) box.gone = true;
        continue;
      }
      if (box.landed) {
        box.popT += dt;
        if (box.popT > 0.6) box.gone = true;
        continue;
      }
      // Per-box gravity (matches launch trajectory exactly)
      box.vy += (box.g || 120) * dt;
      box.vx += 0; // (no horizontal drag for predictable arcs)
      box.x += box.vx * dt;
      box.y += box.vy * dt;
      box.rot += box.rotV * dt;
      box.age += dt;

      const groundY = H - GROUND_Y_OFFSET;
      if (box.y + box.h * 0.4 >= groundY) {
        box.y = groundY - box.h * 0.4;
        box.landed = true;
        box.popT = 0;
        onBoxLanded(box);
      }
      // If somehow escapes off the left, count as miss too
      if (box.x + box.w < -50) {
        box.landed = true;
        box.popT = 0;
        onBoxLanded(box);
      }
    }
    state.boxes = state.boxes.filter(b => !b.gone);

    // Particles
    for (const p of state.particles) {
      p.vy += (p.gravity ?? 700) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.rotV * dt;
      p.life -= dt;
    }
    state.particles = state.particles.filter(p => p.life > 0);

    // Floaters
    for (const f of state.floaters) {
      f.t += dt;
      f.y -= 60 * dt;
    }
    state.floaters = state.floaters.filter(f => f.t < f.dur);

    // Screen shake decay
    if (state.shake > 0) {
      state.shake = Math.max(0, state.shake - dt * 3);
      state.shakeX = (Math.random() - 0.5) * state.shake * 18;
      state.shakeY = (Math.random() - 0.5) * state.shake * 18;
    } else {
      state.shakeX = state.shakeY = 0;
    }

    // Level up handled above (every 10 boxes spawned)
  }

  function tickAmbientRocks(dt) {
    if (state.phase !== 'playing' && state.phase !== 'paused' && state.phase !== 'title') return;
    state.ambientRockTimer -= dt;
    if (state.ambientRockTimer <= 0) {
      state.roadRocks.push({
        x: W + 40 + rand(0, 100),
        kind: 'pebble',
        size: rand(6, 12),
        life: 0,
      });
      state.ambientRockTimer = rand(0.5, 1.4);
    }
  }
  function tickRocks(dt) {
    const v = ROAD_SCROLL * TWEAKS.bgSpeed;
    const wheelX = getBackWheelXR();
    for (const r of state.roadRocks) {
      const prevX = r.x;
      r.x -= v * dt;
      r.life += dt;
      // Trigger bump when bump-rock crosses front-most back wheel
      if (r.bumpTrigger && prevX > wheelX && r.x <= wheelX) {
        if (state.phase === 'playing') {
          state.truckBumpT = state.truckBumpDur;
          state.truckPendingLaunch = true;
          state.pendingLaunchCount = getBoxesPerBump(state.level);
          state.pendingBumpRock = false;
        }
        r.bumpTrigger = false; // consumed
      }
    }
    state.roadRocks = state.roadRocks.filter(r => r.x > -60);
  }

  function spawnEjectPuff() {
    const t = getTruckPos();
    const m = getTruckMetrics();
    const cargoTop = t.y - m.cargoH / 2;
    for (let i = 0; i < 8; i++) {
      state.particles.push({
        x: t.x + rand(-40, 30),
        y: cargoTop + rand(-4, 6),
        vx: rand(-60, 60),
        vy: rand(-160, -40),
        rot: 0, rotV: 0,
        size: rand(14, 22),
        life: rand(0.4, 0.7),
        maxLife: 0.7,
        color: '#fff4dc',
        gravity: -40,
        kind: 'dust',
      });
    }
  }

  function onBoxLanded(box) {
    state.lives--;
    spawnImpact(box.x, H - GROUND_Y_OFFSET);
    state.shake = Math.min(1.2, state.shake + 0.8);
    updateHUD();
    if (state.lives <= 0) {
      setTimeout(gameOver, 350);
    }
  }

  // ---------- Particles ----------
  function spawnImpact(x, y) {
    const palette = PALETTES[TWEAKS.palette];
    for (let i = 0; i < 18; i++) {
      const angle = Math.PI + (Math.random() - 0.5) * Math.PI; // upward fan
      const speed = rand(120, 360);
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rot: rand(0, Math.PI * 2),
        rotV: rand(-6, 6),
        size: rand(5, 12),
        life: rand(0.5, 1.1),
        maxLife: 1.1,
        color: choice([palette.road, palette.roadDark, palette.roadEdge, '#c2a87a']),
        gravity: 800,
        kind: 'chunk',
      });
    }
    // Dust puff
    for (let i = 0; i < 10; i++) {
      state.particles.push({
        x: x + rand(-30, 30), y: y - rand(0, 20),
        vx: rand(-120, 120), vy: rand(-180, -50),
        rot: 0, rotV: 0,
        size: rand(14, 26),
        life: rand(0.5, 0.9),
        maxLife: 0.9,
        color: '#e8d4ac',
        gravity: -60,
        kind: 'dust',
      });
    }
  }

  function spawnPopBurst(box) {
    // Cartoon "POP!" burst
    const palette = PALETTES[TWEAKS.palette];
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = rand(150, 380);
      state.particles.push({
        x: box.x, y: box.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80,
        rot: rand(0, Math.PI * 2),
        rotV: rand(-8, 8),
        size: rand(7, 14),
        life: rand(0.4, 0.8),
        maxLife: 0.8,
        color: choice(['#ff6b3d', '#ffc94d', '#fff4dc', '#5fc26e', palette.swatch]),
        gravity: 600,
        kind: 'confetti',
      });
    }
    // Star ring
    for (let i = 0; i < 8; i++) {
      const angle = i / 8 * Math.PI * 2;
      state.particles.push({
        x: box.x, y: box.y,
        vx: Math.cos(angle) * 260,
        vy: Math.sin(angle) * 260,
        rot: 0, rotV: 0,
        size: 8,
        life: 0.35,
        maxLife: 0.35,
        color: '#fff4dc',
        gravity: 0,
        kind: 'star',
      });
    }
  }

  // ---------- Floaters ----------
  function showFloater(x, y, text, color) {
    window.MathArcadeAudio?.event(text);
    state.floaters.push({ x, y, text, color, t: 0, dur: 1.1, big: false });
  }
  function showFloaterCenter(text, color) {
    window.MathArcadeAudio?.event(text);
    state.floaters.push({ x: W/2, y: H * 0.4, text, color, t: 0, dur: 1.4, big: true });
  }

  // ---------- Submit answer ----------
  function submitAnswer() {
    if (state.phase !== 'playing') return;
    const buf = state.inputBuffer;
    if (buf === '' || buf === '-' || buf === '(-)') { return; }
    const val = parseInt(buf, 10);
    if (isNaN(val)) { state.inputBuffer = ''; updateAnswerDisplay(); return; }
    let hits = 0;
    for (const box of state.boxes) {
      if (box.popped || box.landed || box.gone) continue;
      if (box.expr.result === val) {
        box.popped = true;
        box.popT = 0;
        spawnPopBurst(box);
        const points = 10 + Math.max(0, Math.floor((1 - box.age / 4) * 10));
        state.score += points;
        showFloater(box.x, box.y - box.h/2, `+${points}`, '#ffc94d');
        hits++;
      }
    }
    if (hits >= 2) {
      showFloaterCenter(`COMBO ×${hits}!`, '#ff6b3d');
    } else if (hits === 0) {
      // Miss: small shake of LCD
      const lcd = document.querySelector('.lcd');
      if (lcd) {
        lcd.animate(
          [{transform: 'translateX(-6px)'}, {transform: 'translateX(6px)'}, {transform: 'translateX(0)'}],
          { duration: 200 }
        );
      }
    }
    state.inputBuffer = '';
    updateAnswerDisplay();
    updateHUD();
    // Hide tutorial hint after first submit
    document.getElementById('first-hint').classList.remove('show');
  }

  // ---------- Input ----------
  function updateAnswerDisplay() {
    const el = document.getElementById('ans-val');
    if (!el) return;
    if (state.inputBuffer === '') {
      el.classList.add('empty');
      el.innerHTML = '<span class="cursor">_</span>';
    } else {
      el.classList.remove('empty');
      el.innerHTML = `${state.inputBuffer}<span class="cursor">|</span>`;
    }
  }
  function updateHUD() {
    document.getElementById('score').textContent = state.score;
    document.getElementById('level').textContent = state.level;
    const hearts = document.querySelectorAll('#lives .heart');
    hearts.forEach((h, i) => {
      h.classList.toggle('lost', i >= state.lives);
    });
  }

  function pressDigit(d) {
    if (state.phase !== 'playing') return;
    if (state.inputBuffer.length >= 5) return;
    if (state.inputBuffer === '0') state.inputBuffer = '';
    state.inputBuffer += d;
    updateAnswerDisplay();
  }
  function pressMinus() {
    if (state.phase !== 'playing') return;
    // Toggle the sign of the current input (works whether allowNegatives or not
    // — some operations can still produce negative results even without the tweak)
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
    // Title / gameover: Enter to start
    if (state.phase === 'title' || state.phase === 'gameover') {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        startGame();
        return;
      }
    }
    if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      togglePause();
      return;
    }
    if (e.key === 'Enter') { e.preventDefault(); submitAnswer(); return; }
    if (e.key === 'Backspace') { e.preventDefault(); pressBackspace(); return; }
    if (/^[0-9]$/.test(e.key)) { e.preventDefault(); pressDigit(e.key); return; }
    if (e.key === '-' || e.key === '_' || e.key === 'Subtract') { e.preventDefault(); pressMinus(); return; }
  });

  // Touch keypad? Skipping for now — desktop-first.

  // ---------- Phase changes ----------
  function startGame() {
    state.phase = 'playing';
    state.score = 0;
    state.level = 1;
    state.lives = 3;
    state.boxes = [];
    state.particles = [];
    state.floaters = [];
    state.roadRocks = [];
    state.ambientRockTimer = 0.5;
    state.spawnTimer = 1.8;
    state.boxesSpawned = 0;
    state.pendingBumpRock = false;
    state.inputBuffer = '';
    state.shake = 0;
    state.truckBumpT = 0;
    state.truckPendingLaunch = false;
    document.getElementById('overlay').classList.add('hidden');
    updateHUD();
    updateAnswerDisplay();
    setTimeout(() => {
      document.getElementById('first-hint').classList.add('show');
      setTimeout(() => {
        document.getElementById('first-hint').classList.remove('show');
      }, 4500);
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
    state.phase = 'gameover';
    if (state.score > state.best) {
      state.best = state.score;
      localStorage.setItem('numberfall_best', String(state.best));
    }
    showGameOverCard();
  }

  function showGameOverCard() {
    const overlay = document.getElementById('overlay');
    overlay.querySelector('.card').remove();
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h1><span class="num">GAME</span> <span class="fall">OVER</span></h1>
      <div class="sub">the boxes won this round</div>
      <div class="stats-row">
        <div class="stat-chip">
          <div class="stat-label">Score</div>
          <div class="stat-val">${state.score}</div>
        </div>
        <div class="stat-chip">
          <div class="stat-label">Level</div>
          <div class="stat-val">${state.level}</div>
        </div>
        <div class="stat-chip hi">
          <div class="stat-label">Best</div>
          <div class="stat-val">${state.best}</div>
        </div>
      </div>
      <button class="big-btn" id="restart-btn">PLAY AGAIN</button>
    `;
    overlay.appendChild(card);
    overlay.classList.remove('hidden');
    document.getElementById('restart-btn').addEventListener('click', startGame);
  }

  document.getElementById('start-btn').addEventListener('click', startGame);

  // ---------- Drawing ----------
  function P() { return PALETTES[TWEAKS.palette] || PALETTES.sunset; }

  function draw() {
    ctx.save();
    ctx.translate(state.shakeX, state.shakeY);

    drawSky();
    drawSun();
    drawClouds();
    drawMountains();
    drawHillsFar();
    drawHillsNear();
    drawTreesFar();
    drawPoles();
    drawRoad();
    drawTruck();
    drawBoxes();
    drawParticles();
    drawFloaters();

    ctx.restore();
  }

  function drawSky() {
    const p = P();
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, p.skyTop);
    grad.addColorStop(0.55, p.skyMid);
    grad.addColorStop(1, p.skyBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  function drawSun() {
    const p = P();
    const cx = W * 0.18;
    const cy = H * 0.32;
    const pulse = 1 + Math.sin(state.sunPulse * 1.2) * 0.04;
    const r = 80 * pulse;
    // Glow
    const glow = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 3);
    glow.addColorStop(0, p.sunGlow);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - r*3, cy - r*3, r*6, r*6);
    // Body
    ctx.fillStyle = p.sun;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // Outline
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  function drawClouds() {
    const p = P();
    const speed = 15 * TWEAKS.bgSpeed;
    const layer = state.elapsed * speed;
    // A few cloud puffs
    const clouds = [
      { x: 200, y: 110, s: 1.0 },
      { x: 520, y: 170, s: 0.7 },
      { x: 880, y: 90,  s: 1.1 },
      { x: 1280, y: 200, s: 0.85 },
      { x: 1620, y: 130, s: 0.95 },
    ];
    const totalWrap = 2200;
    ctx.fillStyle = p.cloud;
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 4;
    for (const c of clouds) {
      let cx = ((c.x - layer) % totalWrap + totalWrap) % totalWrap - 200;
      drawCloud(cx, c.y, c.s);
    }
  }
  function drawCloud(x, y, s) {
    const arcs = [
      [0, 0, 26],
      [28, -12, 22],
      [50, 0, 26],
      [20, 8, 24],
    ];
    for (const [ox, oy, r] of arcs) {
      ctx.beginPath();
      ctx.arc(x + ox * s, y + oy * s, r * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  function drawMountains() {
    const p = P();
    const speed = 25 * TWEAKS.bgSpeed;
    const layer = state.elapsed * speed;
    const baseY = H * 0.55;
    ctx.fillStyle = p.mountainsFar;
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 4;
    // far mountains: low-amplitude polyline tiled
    drawMountainTier(layer * 0.6, baseY, p.mountainsFar, 0.6, 80, 320, 360);
    drawMountainTier(layer, baseY + 30, p.mountainsNear, 0.9, 120, 260, 280);
  }
  function drawMountainTier(offset, baseY, color, alpha, amp, wavelen, seed) {
    const p = P();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-50, H);
    const step = 80;
    for (let x = -50; x <= W + 50; x += step) {
      const wx = (x + offset) * 0.01;
      const h = Math.abs(Math.sin(wx + seed * 0.1)) * amp + Math.abs(Math.sin(wx * 2.3 + seed)) * amp * 0.4;
      ctx.lineTo(x, baseY - h);
    }
    ctx.lineTo(W + 50, H);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 3;
    // Outline only the top edge
    ctx.beginPath();
    let first = true;
    for (let x = -50; x <= W + 50; x += step) {
      const wx = (x + offset) * 0.01;
      const h = Math.abs(Math.sin(wx + seed * 0.1)) * amp + Math.abs(Math.sin(wx * 2.3 + seed)) * amp * 0.4;
      if (first) { ctx.moveTo(x, baseY - h); first = false; }
      else ctx.lineTo(x, baseY - h);
    }
    ctx.stroke();
  }

  function drawHillsFar() {
    const p = P();
    const offset = state.elapsed * 60 * TWEAKS.bgSpeed;
    const baseY = H - 180;
    ctx.fillStyle = p.hillsFar;
    ctx.beginPath();
    ctx.moveTo(-50, H);
    const wave = 60;
    const step = 40;
    for (let x = -50; x <= W + 50; x += step) {
      const wx = (x + offset) * 0.008;
      const h = Math.sin(wx) * wave + Math.sin(wx * 2.5 + 1.2) * 20 + 80;
      ctx.lineTo(x, baseY - h);
    }
    ctx.lineTo(W + 50, H);
    ctx.closePath();
    ctx.fill();
    // Top edge stroke
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    let first = true;
    for (let x = -50; x <= W + 50; x += step) {
      const wx = (x + offset) * 0.008;
      const h = Math.sin(wx) * wave + Math.sin(wx * 2.5 + 1.2) * 20 + 80;
      if (first) { ctx.moveTo(x, baseY - h); first = false; }
      else ctx.lineTo(x, baseY - h);
    }
    ctx.stroke();
  }

  function drawHillsNear() {
    const p = P();
    const offset = state.elapsed * 130 * TWEAKS.bgSpeed;
    const baseY = H - 130;
    ctx.fillStyle = p.hillsNear;
    ctx.beginPath();
    ctx.moveTo(-50, H);
    const wave = 45;
    const step = 32;
    for (let x = -50; x <= W + 50; x += step) {
      const wx = (x + offset) * 0.011;
      const h = Math.sin(wx + 1.5) * wave + Math.sin(wx * 3 + 0.7) * 12 + 60;
      ctx.lineTo(x, baseY - h);
    }
    ctx.lineTo(W + 50, H);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    let first = true;
    for (let x = -50; x <= W + 50; x += step) {
      const wx = (x + offset) * 0.011;
      const h = Math.sin(wx + 1.5) * wave + Math.sin(wx * 3 + 0.7) * 12 + 60;
      if (first) { ctx.moveTo(x, baseY - h); first = false; }
      else ctx.lineTo(x, baseY - h);
    }
    ctx.stroke();
  }

  function drawTreesFar() {
    const p = P();
    const offset = state.elapsed * 200 * TWEAKS.bgSpeed;
    const baseY = H - 140;
    const wrap = 280;
    // Random-ish trees at fixed positions
    const trees = [
      { x: 60, s: 0.9 },
      { x: 200, s: 0.7 },
      { x: 370, s: 1.0 },
      { x: 520, s: 0.85 },
      { x: 720, s: 0.95 },
      { x: 940, s: 0.75 },
      { x: 1120, s: 1.05 },
      { x: 1340, s: 0.9 },
    ];
    for (const t of trees) {
      let cx = ((t.x - offset) % (wrap * 5) + (wrap * 5)) % (wrap * 5) - 100;
      // Only draw if onscreen
      if (cx > -120 && cx < W + 120) drawTree(cx, baseY, t.s);
    }
  }
  function drawTree(x, baseY, s) {
    const p = P();
    // Trunk
    ctx.fillStyle = p.treeTrunk;
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 3;
    const trunkW = 14 * s, trunkH = 30 * s;
    ctx.beginPath();
    ctx.rect(x - trunkW/2, baseY - trunkH, trunkW, trunkH);
    ctx.fill(); ctx.stroke();
    // Leaves: three round puffs (separate paths to avoid connecting lines)
    const puffs = [
      [0, -trunkH - 22*s, 28*s],
      [-22*s, -trunkH - 8*s, 22*s],
      [22*s, -trunkH - 8*s, 22*s],
    ];
    for (const [ox, oy, r] of puffs) {
      ctx.fillStyle = p.treeLeaf;
      ctx.beginPath();
      ctx.arc(x + ox, baseY + oy, r, 0, Math.PI*2);
      ctx.fill(); ctx.stroke();
    }
  }

  function drawPoles() {
    // Foreground telephone poles whipping by
    const p = P();
    const offset = state.elapsed * 320 * TWEAKS.bgSpeed;
    const wrap = 380;
    const baseY = H - 100;
    for (let i = 0; i < 6; i++) {
      const baseX = i * wrap + 100;
      let x = ((baseX - offset) % (wrap * 6) + (wrap * 6)) % (wrap * 6) - 100;
      if (x < -60 || x > W + 60) continue;
      drawPole(x, baseY);
    }
  }
  function drawPole(x, baseY) {
    const p = P();
    ctx.strokeStyle = p.ink;
    ctx.fillStyle = p.poleColor;
    ctx.lineWidth = 3;
    // Pole
    ctx.beginPath();
    ctx.rect(x - 4, baseY - 180, 8, 180);
    ctx.fill(); ctx.stroke();
    // Crossbar
    ctx.beginPath();
    ctx.rect(x - 28, baseY - 165, 56, 6);
    ctx.fill(); ctx.stroke();
    // Wires (subtle)
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(x - 24, baseY - 162);
    ctx.quadraticCurveTo(x + 200, baseY - 145, x + 400, baseY - 162);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 24, baseY - 162);
    ctx.quadraticCurveTo(x + 200, baseY - 140, x + 400, baseY - 162);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawRoad() {
    const p = P();
    const roadTop = H - GROUND_Y_OFFSET;
    const roadBot = H;
    // Road body
    ctx.fillStyle = p.road;
    ctx.fillRect(0, roadTop, W, roadBot - roadTop);
    // Darker shoulder
    ctx.fillStyle = p.roadDark;
    ctx.fillRect(0, roadTop, W, 8);
    ctx.fillStyle = p.roadEdge;
    ctx.fillRect(0, roadTop - 4, W, 4);
    // Top stroke
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, roadTop);
    ctx.lineTo(W, roadTop);
    ctx.stroke();
    // Dashed centerline (scrolling)
    const cy = roadTop + 55;
    const dashW = 60, gap = 50;
    const period = dashW + gap;
    const offset = (state.elapsed * ROAD_SCROLL * TWEAKS.bgSpeed) % period;
    ctx.fillStyle = p.roadLine;
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 2.5;
    for (let x = -offset - period; x < W + period; x += period) {
      ctx.beginPath();
      ctx.rect(x, cy - 5, dashW, 10);
      ctx.fill();
      ctx.stroke();
    }
    // Sparse fine pebbles
    ctx.fillStyle = p.roadDark;
    const pebOff = (state.elapsed * ROAD_SCROLL * TWEAKS.bgSpeed) % 240;
    for (let x = -pebOff; x < W; x += 240) {
      ctx.beginPath();
      ctx.ellipse(x + 30, roadTop + 80, 8, 3, 0, 0, Math.PI*2);
      ctx.ellipse(x + 110, roadTop + 88, 5, 2, 0, 0, Math.PI*2);
      ctx.fill();
    }
    // Chunky scrolling rocks (managed by state.roadRocks)
    for (const r of state.roadRocks) {
      drawRoadRock(r, roadTop);
    }
  }

  function drawRoadRock(r, roadTop) {
    const p = P();
    const isBump = r.kind === 'bump';
    const x = r.x;
    // Lay rock on/near road surface; bump rocks slightly bigger and sit higher
    const y = roadTop + (isBump ? 6 : 14);
    const w = r.size * 2.2;
    const h = r.size * 1.2;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(x, y + h * 0.55, w * 0.55, 4, 0, 0, Math.PI*2);
    ctx.fill();
    // Rock body
    ctx.fillStyle = isBump ? '#8d8076' : '#a89c8c';
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    // Irregular pentagon-ish blob
    const cx = x, cy = y;
    const pts = [
      [-w*0.5, h*0.15],
      [-w*0.32, -h*0.45],
      [w*0.08, -h*0.55],
      [w*0.42, -h*0.30],
      [w*0.5, h*0.20],
    ];
    ctx.moveTo(cx + pts[0][0], cy + pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(cx + pts[i][0], cy + pts[i][1]);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Highlight
    ctx.fillStyle = isBump ? '#b3a698' : '#c9bdae';
    ctx.beginPath();
    ctx.ellipse(cx - w * 0.1, cy - h * 0.25, w * 0.18, h * 0.14, -0.3, 0, Math.PI*2);
    ctx.fill();
  }

  function drawTruck() {
    const p = P();
    const tc = TRUCK_COLORS[TWEAKS.truckColor] || TRUCK_COLORS.red;
    const pos = getTruckPos();
    const m = getTruckMetrics();
    // Bump animation offset
    let bumpY = 0;
    let bumpRotL = 0;
    if (state.truckBumpT > 0) {
      const t = 1 - state.truckBumpT / state.truckBumpDur; // 0..1
      const lift = Math.sin(t * Math.PI) * 24;
      bumpY = -lift;
      bumpRotL = Math.sin(t * Math.PI * 2) * 0.025;
    }
    // Idle drive bounce — small
    const drv = Math.sin(state.truckDriveBounce * 8) * 1.5 + Math.max(0, Math.sin(state.truckDriveBounce * 16)) * 1;
    const tx = pos.x;
    const ty = pos.y + bumpY + drv;

    // ---- Wheel positions (in world space, on road) ----
    const wheelR = clamp(m.cargoH * 0.18, 46, 64);
    const roadTop = H - GROUND_Y_OFFSET;
    const wheelY = roadTop - wheelR + 2;
    const wheelXL = getBackWheelXL();
    const wheelXR = getBackWheelXR();
    // Wheels lift less than body during bump (suspension)
    const wheelLift = bumpY * 0.35;

    // Shadow on road (long oval under the visible cargo)
    ctx.fillStyle = 'rgba(29,41,57,0.28)';
    ctx.beginPath();
    ctx.ellipse(tx - m.cargoW * 0.15, roadTop + 14, m.cargoW * 0.42, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wheels (draw first so cargo overlaps tops)
    drawWheel(wheelXL, wheelY + wheelLift, wheelR);
    drawWheel(wheelXR, wheelY + wheelLift, wheelR);

    // ---- Cargo container ----
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(bumpRotL);
    drawCargoSide(tc, m);
    ctx.restore();
  }

  function drawCargoSide(tc, m) {
    const p = P();
    const W2 = m.cargoW;
    const H2 = m.cargoH;
    const x1 = -W2 / 2;
    const y1 = -H2 / 2;
    const ink = '#1d2939';

    // ---- Subtle roof bevel (perspective hint) ----
    ctx.fillStyle = shade(tc.body, 0.18);
    ctx.beginPath();
    ctx.moveTo(x1 + 8, y1 + 6);
    ctx.lineTo(x1 + W2 - 8, y1 + 6);
    ctx.lineTo(x1 + W2 - 14, y1 - 8);
    ctx.lineTo(x1 + 14, y1 - 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3;
    ctx.stroke();

    // ---- Main side body ----
    ctx.fillStyle = tc.body;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 5;
    roundRect(x1, y1, W2, H2, 14);
    ctx.fill(); ctx.stroke();

    // ---- Top rail (horizontal band along the top) ----
    ctx.fillStyle = shade(tc.body, -0.22);
    ctx.fillRect(x1 + 8, y1 + 6, W2 - 16, 24);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3;
    ctx.strokeRect(x1 + 8, y1 + 6, W2 - 16, 24);

    // ---- Rear edge: vertical dark strip on the LEFT (the back of the truck) ----
    const rearW = 14;
    ctx.fillStyle = shade(tc.body, -0.28);
    ctx.fillRect(x1 + 6, y1 + 36, rearW, H2 - 56);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3;
    ctx.strokeRect(x1 + 6, y1 + 36, rearW, H2 - 56);
    // Tiny taillight on the rear edge
    ctx.fillStyle = '#e8392b';
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x1 + 6 + rearW/2, y1 + 60, 8, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Rear vertical seam (where back doors meet body)
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1 + rearW + 8, y1 + 36);
    ctx.lineTo(x1 + rearW + 8, y1 + H2 - 20);
    ctx.stroke();

    // ---- Panel seams (vertical divisions along the side) ----
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 2;
    const panelW = (W2 - rearW - 40) / 5;
    for (let i = 1; i <= 4; i++) {
      const x = x1 + rearW + 20 + i * panelW;
      ctx.beginPath();
      ctx.moveTo(x, y1 + 36);
      ctx.lineTo(x, y1 + H2 - 30);
      ctx.stroke();
    }

    // ---- Horizontal corrugation lines (subtle) ----
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1.5;
    const ridgeStart = y1 + 50;
    const ridgeEnd = y1 + H2 - 70;
    for (let i = 0; i < 6; i++) {
      const yy = ridgeStart + (ridgeEnd - ridgeStart) * (i / 6);
      ctx.beginPath();
      ctx.moveTo(x1 + rearW + 14, yy);
      ctx.lineTo(x1 + W2 - 14, yy);
      ctx.stroke();
    }

    // ---- Big logo sticker on the side (centered on visible portion of cargo) ----
    // The right half of the cargo is offscreen, so place the logo on the visible left half
    const lw = Math.min(W2 * 0.40, 360);
    const lh = H2 * 0.32;
    const lx = x1 + W2 * 0.10;
    const ly = y1 + H2 * 0.36;
    ctx.fillStyle = '#fff4dc';
    ctx.strokeStyle = ink;
    ctx.lineWidth = 4;
    roundRect(lx, ly, lw, lh, 12);
    ctx.fill(); ctx.stroke();
    // Logo content: NUMBERS! mark
    ctx.fillStyle = '#ff6b3d';
    ctx.font = `bold ${Math.round(H2 * 0.16)}px "Lilita One", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cx = lx + lw / 2;
    const cy = ly + lh / 2 - lh * 0.1;
    ctx.fillText('NUMBERS', cx, cy);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3;
    ctx.strokeText('NUMBERS', cx, cy);
    ctx.fillStyle = ink;
    ctx.font = `600 ${Math.round(H2 * 0.07)}px "Fredoka", sans-serif`;
    ctx.fillText('· CARGO CO. ·', cx, cy + H2 * 0.13);
    // Cargo stars
    ctx.fillStyle = '#ffc94d';
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.5;
    drawStar(lx + 18, ly + 14, 9, 5, -Math.PI/2);
    ctx.fill(); ctx.stroke();
    drawStar(lx + lw - 18, ly + 14, 9, 5, -Math.PI/2);
    ctx.fill(); ctx.stroke();

    // ---- Chassis bar along bottom ----
    ctx.fillStyle = '#3a4655';
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3;
    ctx.fillRect(x1 + 4, y1 + H2 - 22, W2 - 8, 18);
    ctx.strokeRect(x1 + 4, y1 + H2 - 22, W2 - 8, 18);
    // Mud flap behind back wheel (rear bottom)
    ctx.fillStyle = '#1d2939';
    ctx.fillRect(x1 + rearW + 4, y1 + H2 - 22, 22, 36);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3;
    ctx.strokeRect(x1 + rearW + 4, y1 + H2 - 22, 22, 36);
    // Rivets along chassis
    ctx.fillStyle = '#cfcfcf';
    for (let i = 0; i < 8; i++) {
      const xx = x1 + 30 + i * (W2 - 60) / 7;
      ctx.beginPath();
      ctx.arc(xx, y1 + H2 - 13, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // ---- Cargo open hint at top (where boxes pop out) ----
    if (state.truckBumpT > 0) {
      const openT = 1 - state.truckBumpT / state.truckBumpDur;
      const openA = Math.sin(openT * Math.PI);
      ctx.fillStyle = `rgba(0,0,0,${0.4 * openA})`;
      // Open at the rear portion where boxes spawn
      const openX = x1 + W2 * 0.10;
      const openW = W2 * 0.32;
      ctx.fillRect(openX, y1 - 6 * openA, openW, 5 + 6 * openA);
    }

    // ---- Cute side mirror eye on the front edge (just before going offscreen) ----
    // Only draw if the mirror would be on-screen (we still draw it; it's near right edge)
    const mx = x1 + W2 * 0.46;
    const my = y1 + H2 * 0.22;
    // arm
    ctx.strokeStyle = ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(mx - 6, my + 10);
    ctx.lineTo(mx + 4, my - 6);
    ctx.stroke();
    // mirror housing
    ctx.fillStyle = tc.body;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3;
    roundRect(mx - 4, my - 16, 18, 22, 4);
    ctx.fill(); ctx.stroke();
    // mirror surface (eye)
    ctx.fillStyle = '#bfe4f2';
    roundRect(mx - 1, my - 13, 12, 16, 3);
    ctx.fill();
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.arc(mx + 5, my - 5, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(mx + 4, my - 6, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawWheel(x, y, r) {
    const ink = '#1d2939';
    // Tire
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // Outer tread highlight ring
    ctx.strokeStyle = '#3a4150';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, r - 4, 0, Math.PI * 2);
    ctx.stroke();
    // Hub
    ctx.fillStyle = '#cfcfcf';
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Spinning spokes
    const spin = state.elapsed * (ROAD_SCROLL / r) * TWEAKS.bgSpeed;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spin);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 4;
    for (let i = 0; i < 5; i++) {
      ctx.save();
      ctx.rotate((i / 5) * Math.PI * 2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(r * 0.42, 0);
      ctx.stroke();
      ctx.restore();
    }
    // Center cap
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Color shade helper: amount in -1..1 (-1=black, +1=white)
  function shade(hex, amount) {
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    const adj = (v) => {
      if (amount >= 0) return Math.round(v + (255 - v) * amount);
      return Math.round(v * (1 + amount));
    };
    const r2 = clamp(adj(r), 0, 255);
    const g2 = clamp(adj(g), 0, 255);
    const b2 = clamp(adj(b), 0, 255);
    return `#${r2.toString(16).padStart(2,'0')}${g2.toString(16).padStart(2,'0')}${b2.toString(16).padStart(2,'0')}`;
  }

  // ---------- Boxes (in-flight) ----------
  function drawBoxes() {
    for (const box of state.boxes) {
      if (box.popped) {
        drawPoppingBox(box);
      } else if (box.landed) {
        drawSquashedBox(box);
      } else {
        drawFlyingBox(box);
      }
    }
  }

  function drawFlyingBox(box) {
    ctx.save();
    ctx.translate(box.x, box.y);
    ctx.rotate(box.rot);

    // Slight drop shadow
    ctx.fillStyle = 'rgba(29,41,57,0.18)';
    ctx.beginPath();
    ctx.ellipse(0, box.h * 0.6, box.w * 0.42, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    if (box.type === 'cardboard') drawCardboardBox(box);
    else if (box.type === 'crate') drawWoodCrate(box);
    else drawBarrel(box);

    // Label (math) — keep upright by counter-rotating
    ctx.save();
    ctx.rotate(-box.rot);
    drawBoxLabel(box);
    ctx.restore();

    ctx.restore();
  }

  function drawCardboardBox(box) {
    const w = box.w, h = box.h;
    // Box body
    ctx.fillStyle = '#c89865';
    ctx.strokeStyle = '#1d2939';
    ctx.lineWidth = 4;
    roundRect(-w/2, -h/2, w, h, 5);
    ctx.fill(); ctx.stroke();
    // Top flap line
    ctx.strokeStyle = '#1d2939';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-w/2 + 4, -h/2 + 10);
    ctx.lineTo(w/2 - 4, -h/2 + 10);
    ctx.stroke();
    // Tape strip down the middle (top)
    ctx.fillStyle = '#e8d4a0';
    ctx.fillRect(-8, -h/2, 16, h);
    ctx.strokeStyle = '#a08252';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-8, -h/2); ctx.lineTo(-8, h/2);
    ctx.moveTo(8, -h/2); ctx.lineTo(8, h/2);
    ctx.stroke();
    // Corner shading
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(-w/2 + 4, h/2 - 12, w - 8, 8);
  }

  function drawWoodCrate(box) {
    const w = box.w, h = box.h;
    // Crate body
    ctx.fillStyle = '#d6a868';
    ctx.strokeStyle = '#5a3a26';
    ctx.lineWidth = 4;
    roundRect(-w/2, -h/2, w, h, 4);
    ctx.fill(); ctx.stroke();
    // Plank lines
    ctx.strokeStyle = '#5a3a26';
    ctx.lineWidth = 2;
    for (let i = 1; i < 4; i++) {
      const y = -h/2 + (h * i / 4);
      ctx.beginPath();
      ctx.moveTo(-w/2 + 3, y);
      ctx.lineTo(w/2 - 3, y);
      ctx.stroke();
    }
    // Diagonal cross brace — pale
    ctx.strokeStyle = 'rgba(90,58,38,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w/2 + 4, -h/2 + 4);
    ctx.lineTo(w/2 - 4, h/2 - 4);
    ctx.moveTo(w/2 - 4, -h/2 + 4);
    ctx.lineTo(-w/2 + 4, h/2 - 4);
    ctx.stroke();
    // Outer outline darker
    ctx.strokeStyle = '#1d2939';
    ctx.lineWidth = 4;
    roundRect(-w/2, -h/2, w, h, 4);
    ctx.stroke();
  }

  function drawBarrel(box) {
    const w = box.w, h = box.h;
    // Barrel — cylinder feel: rounded rect tall, with bands
    ctx.fillStyle = '#c43838';
    ctx.strokeStyle = '#1d2939';
    ctx.lineWidth = 4;
    roundRect(-w/2, -h/2, w, h, 14);
    ctx.fill(); ctx.stroke();
    // Bands
    ctx.fillStyle = '#8a2424';
    ctx.fillRect(-w/2 + 2, -h/2 + 14, w - 4, 6);
    ctx.fillRect(-w/2 + 2, h/2 - 20, w - 4, 6);
    // Hazard stripe
    ctx.fillStyle = '#ffc94d';
    ctx.fillRect(-w/2 + 2, -6, w - 4, 12);
    // Outline
    ctx.strokeStyle = '#1d2939';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-w/2 + 2, -6); ctx.lineTo(w/2 - 2, -6);
    ctx.moveTo(-w/2 + 2, 6); ctx.lineTo(w/2 - 2, 6);
    ctx.stroke();
    // Top oval
    ctx.fillStyle = '#a02424';
    ctx.beginPath();
    ctx.ellipse(0, -h/2 + 4, w/2 - 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1d2939';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  function drawBoxLabel(box) {
    // Render as 3 parts: leftNum [OP] rightNum, with the operator larger + accent-colored
    const e = box.expr;
    const numFont = 'bold 24px "Lilita One", sans-serif';
    const opFont  = 'bold 40px "Lilita One", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    // Measure
    ctx.font = numFont;
    const lw = ctx.measureText(e.left).width;
    const rw = ctx.measureText(e.right).width;
    ctx.font = opFont;
    const ow = ctx.measureText(e.op).width;
    const gap = 8;
    const totalW = lw + gap + ow + gap + rw;
    const padX = 12, padY = 4;
    const stickerW = totalW + padX * 2;
    const stickerH = 44;
    const sx = -stickerW / 2;
    const sy = -stickerH / 2;
    // Sticker bg
    ctx.fillStyle = '#fff4dc';
    ctx.strokeStyle = '#1d2939';
    ctx.lineWidth = 2.5;
    roundRect(sx, sy, stickerW, stickerH, 7);
    ctx.fill(); ctx.stroke();
    // Sticker tape corners
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.beginPath();
    ctx.moveTo(sx + 2, sy + 2); ctx.lineTo(sx + 10, sy + 2); ctx.lineTo(sx + 2, sy + 10); ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sx + stickerW - 2, sy + stickerH - 2); ctx.lineTo(sx + stickerW - 10, sy + stickerH - 2); ctx.lineTo(sx + stickerW - 2, sy + stickerH - 10); ctx.closePath();
    ctx.fill();
    // Draw text starting at left edge of inner area
    let cx = sx + padX;
    // Left number
    ctx.font = numFont;
    ctx.fillStyle = '#1d2939';
    ctx.fillText(e.left, cx, 1);
    cx += lw + gap;
    // Operator (bigger, accent color)
    ctx.font = opFont;
    ctx.fillStyle = '#ff6b3d';
    // Outline for legibility
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#1d2939';
    ctx.strokeText(e.op, cx, 1);
    ctx.fillText(e.op, cx, 1);
    cx += ow + gap;
    // Right number
    ctx.font = numFont;
    ctx.fillStyle = '#1d2939';
    ctx.fillText(e.right, cx, 1);
  }

  function drawPoppingBox(box) {
    const t = box.popT / 0.45;
    const scale = 1 + t * 0.6;
    const alpha = 1 - t;
    ctx.save();
    ctx.translate(box.x, box.y);
    ctx.rotate(box.rot);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;
    if (box.type === 'cardboard') drawCardboardBox(box);
    else if (box.type === 'crate') drawWoodCrate(box);
    else drawBarrel(box);
    ctx.restore();
  }

  function drawSquashedBox(box) {
    const t = box.popT / 0.6;
    const squashY = 1 - t * 0.7;
    const squashX = 1 + t * 0.4;
    const alpha = 1 - t * 0.6;
    ctx.save();
    ctx.translate(box.x, box.y + box.h * 0.2 * t);
    ctx.scale(squashX, squashY);
    ctx.globalAlpha = alpha;
    if (box.type === 'cardboard') drawCardboardBox(box);
    else if (box.type === 'crate') drawWoodCrate(box);
    else drawBarrel(box);
    ctx.restore();
  }

  // ---------- Particles ----------
  function drawParticles() {
    for (const p of state.particles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = a;
      if (p.kind === 'dust') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 + (1 - a) * 0.6), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'star') {
        ctx.fillStyle = p.color;
        ctx.strokeStyle = '#1d2939';
        ctx.lineWidth = 2;
        drawStar(p.x, p.y, p.size * (1 + (1-a) * 1.5), 4, 0);
        ctx.fill();
      } else if (p.kind === 'confetti') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size/2, -p.size/4, p.size, p.size/2);
        ctx.restore();
      } else {
        // chunk
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.strokeStyle = '#1d2939';
        ctx.lineWidth = 1.5;
        ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
        ctx.strokeRect(-p.size/2, -p.size/2, p.size, p.size);
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

  // ---------- Floaters ----------
  function drawFloaters() {
    for (const f of state.floaters) {
      const t = f.t / f.dur;
      const a = 1 - t;
      const scale = f.big ? (easeOutBack(Math.min(1, t * 3)) * (1 - t * 0.2)) : (1 + t * 0.3);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(f.x, f.y);
      ctx.scale(scale, scale);
      ctx.font = f.big ? 'bold 56px "Lilita One", sans-serif' : 'bold 30px "Lilita One", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = f.big ? 6 : 4;
      ctx.strokeStyle = '#1d2939';
      ctx.strokeText(f.text, 0, 0);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, 0, 0);
      ctx.restore();
    }
  }

  // ---------- Utility: rounded rect ----------
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

  // ---------- Tweaks panel ----------
  function setupTweaks() {
    const root = document.getElementById('tweaks');
    // Palette swatches
    const paletteRow = document.getElementById('palette-row');
    paletteRow.innerHTML = '';
    Object.entries(PALETTES).forEach(([key, p]) => {
      const sw = document.createElement('div');
      sw.className = 'swatch';
      sw.style.background = `linear-gradient(135deg, ${p.skyTop} 0%, ${p.skyMid} 50%, ${p.hillsNear} 100%)`;
      sw.title = p.name;
      sw.dataset.value = key;
      if (key === TWEAKS.palette) sw.classList.add('active');
      sw.addEventListener('click', () => {
        TWEAKS.palette = key;
        paletteRow.querySelectorAll('.swatch').forEach(s => s.classList.toggle('active', s.dataset.value === key));
        persistTweaks();
      });
      paletteRow.appendChild(sw);
    });
    // Truck swatches
    const tcRow = document.getElementById('truck-color-row');
    tcRow.innerHTML = '';
    Object.entries(TRUCK_COLORS).forEach(([key, c]) => {
      const sw = document.createElement('div');
      sw.className = 'swatch';
      sw.style.background = c.body;
      sw.title = c.name;
      sw.dataset.value = key;
      if (key === TWEAKS.truckColor) sw.classList.add('active');
      sw.addEventListener('click', () => {
        TWEAKS.truckColor = key;
        tcRow.querySelectorAll('.swatch').forEach(s => s.classList.toggle('active', s.dataset.value === key));
        persistTweaks();
      });
      tcRow.appendChild(sw);
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
    slider('bgspeed', 'bgSpeed', v => `${v.toFixed(1)}×`);
    slider('spawn', 'spawnRate', v => `${v.toFixed(1)}×`);
    slider('grav', 'gravity', v => `${v.toFixed(2)}×`);
    slider('launch', 'launchPower', v => `${v.toFixed(2)}×`);

    // Negative numbers checkbox
    const negCheck = document.getElementById('neg-check');
    if (negCheck) {
      negCheck.checked = !!TWEAKS.allowNegatives;
      negCheck.addEventListener('change', () => {
        TWEAKS.allowNegatives = negCheck.checked;
        persistTweaks();
      });
    }

    document.getElementById('tweaks-close').addEventListener('click', () => {
      hideTweaks();
      // Tell host to flip toggle off
      try { window.parent.postMessage({type: '__edit_mode_dismissed'}, '*'); } catch (e) {}
    });

    // Gear button toggles tweaks panel (always available)
    const gear = document.getElementById('gear-btn');
    if (gear) {
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
  }

  function persistTweaks() {
    try {
      window.parent.postMessage({
        type: '__edit_mode_set_keys',
        edits: { ...TWEAKS }
      }, '*');
    } catch (e) {}
  }

  function showTweaks() { document.getElementById('tweaks').classList.add('open'); }
  function hideTweaks() { document.getElementById('tweaks').classList.remove('open'); }

  // Edit-mode protocol
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === '__activate_edit_mode') showTweaks();
    if (d.type === '__deactivate_edit_mode') hideTweaks();
  });
  setupTweaks();
  // Announce availability after listener is set
  try { window.parent.postMessage({type: '__edit_mode_available'}, '*'); } catch (e) {}

  // ---------- Kick off ----------
  updateHUD();
  updateAnswerDisplay();
  draw(); // paint one frame immediately so the scene is never blank before rAF starts
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { lastTime = performance.now() - 16; try { draw(); } catch (e) {} }
  });
  window.addEventListener('focus', () => { lastTime = performance.now() - 16; try { draw(); } catch (e) {} });
  requestAnimationFrame(loop);

})();
