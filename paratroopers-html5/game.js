// =====================================================================
// PARATROOPERS — Retro Arcade Dyslexia Training
// Classic DOS Sabotage gameplay with a letter-orientation twist
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

  // ===== Game Configuration & State =====
  const LEVEL_DATA = [
    { type: 'para', shoot: 'p', save: 'q', desc: 'Shoot ONLY "p" paratroopers! Save "q" & ALL helicopters.', cue: 'Shoot "p" paratroopers · save "q" + helicopters' },
    { type: 'para', shoot: 'q', save: 'p', desc: 'Shoot ONLY "q" paratroopers! Save "p" & ALL helicopters.', cue: 'Shoot "q" paratroopers · save "p" + helicopters' },
    { type: 'heli', shoot: 'b', save: 'd', desc: 'Shoot ONLY "b" helicopters! Save "d" & ALL paratroopers.', cue: 'Shoot "b" helicopters · save "d" + paratroopers' },
    { type: 'heli', shoot: 'd', save: 'b', desc: 'Shoot ONLY "d" helicopters! Save "b" & ALL paratroopers.', cue: 'Shoot "d" helicopters · save "b" + paratroopers' },
    { type: 'both', shootPara: 'p', shootHeli: 'b', savePara: 'q', saveHeli: 'd', desc: 'Shoot "p" paratroopers & "b" helicopters! Save "q" & "d".', cue: 'Shoot paratrooper "p" + helicopter "b"' },
    { type: 'both', shootPara: 'q', shootHeli: 'd', savePara: 'p', saveHeli: 'b', desc: 'Shoot "q" paratroopers & "d" helicopters! Save "p" & "b".', cue: 'Shoot paratrooper "q" + helicopter "d"' }
  ];

  const state = {
    phase: 'title', // 'title', 'briefing', 'playing', 'level_clear', 'game_over'
    score: 0,
    best: parseInt(localStorage.getItem('paratroopers_best') || '0', 10) || 0,
    level: 1,
    lives: 3,
    maxLives: 3,
    activeRule: null,
    
    // Game entities
    turret: {
      x: 0,
      y: 0,
      angle: -Math.PI / 2,
      recoil: 0,
      baseRadius: 28,
      barrelLength: 32,
      barrelWidth: 8
    },
    lasers: [],
    helicopters: [],
    paratroopers: [],
    particles: [],
    floaters: [],
    clouds: [],
    
    // Trucks (left and right)
    trucks: {
      left: { x: -80, targetX: 60, status: 'parked', doorsOpen: 0, passengers: 0, speed: 120 },
      right: { x: 0, targetX: 0, status: 'parked', doorsOpen: 0, passengers: 0, speed: 120 }
    },
    
    // Pile positions for bad paratroopers (landed)
    leftPile: [],  // array of positions/heights
    rightPile: [], // array of positions/heights
    
    // Spawners
    spawners: {
      heliTimer: 0,
      heliInterval: 3.5,
      clearedSpawns: 0,
      maxSpawns: 12,
      parasTotal: 12,
      parasSpawned: 0,
      parasRemaining: 12
    },
    
    elapsed: 0,
    levelClearTimer: null,
    keys: {},
    mouse: { x: 0, y: 0 },
    fireCooldown: 0,
    metrics: { shots: 0, badHits: 0, friendlyFire: 0, rescues: 0 }
  };

  // Mirror pairs powering the look-alike (reversal) confusion metric.
  const MIRROR = { b: 'd', d: 'b', p: 'q', q: 'p' };
  function resetMetrics() { state.metrics = { shots: 0, badHits: 0, friendlyFire: 0, rescues: 0 }; }

  const rand = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // ===== Tweaks (editable from the gear panel / hub edit-mode) =====
  const TWEAKS = /*EDITMODE-BEGIN*/{
    "pace": "normal",
    "colorCues": true,
    "theme": "day"
  }/*EDITMODE-END*/;

  // Color cues are a *visual aid* — bad/good is shown by colour. Off by intent
  // for letter-orientation training (read the letter, not the colour); on as help.
  function colorOn() { return TWEAKS.colorCues === true || TWEAKS.colorCues === 'on'; }

  // Spawn pacing per setting. Defaults are deliberately brisker than the old
  // values so the action ramps up quickly instead of trickling at the start.
  function paceCfg() {
    switch (TWEAKS.pace) {
      case 'relaxed': return { base: 8,  per: 5, int0: 3.0, intMin: 1.3, intPer: 0.35, first: 0.5 };
      case 'fast':    return { base: 14, per: 7, int0: 1.5, intMin: 0.6, intPer: 0.28, first: 0.3 };
      default:        return { base: 10, per: 6, int0: 2.2, intMin: 0.95, intPer: 0.34, first: 0.4 }; // normal
    }
  }

  // Initialize background clouds
  for (let i = 0; i < 5; i++) {
    state.clouds.push({
      x: rand(0, window.innerWidth),
      y: rand(40, window.innerHeight * 0.35),
      speed: rand(10, 25),
      size: rand(30, 60)
    });
  }

  // ===== Controls / Input Handlers =====
  window.addEventListener('mousemove', (e) => {
    state.mouse.x = e.clientX;
    state.mouse.y = e.clientY;
    
    // Update turret aim angle
    const dx = state.mouse.x - state.turret.x;
    const dy = state.mouse.y - state.turret.y;
    state.turret.angle = clamp(Math.atan2(dy, dx), -Math.PI * 0.9, -Math.PI * 0.1);
  });

  window.addEventListener('mousedown', (e) => {
    if (state.phase === 'playing') {
      fireTurret();
    }
  });

  window.addEventListener('touchstart', (e) => {
    if (state.phase === 'playing') {
      const t = e.touches[0];
      state.mouse.x = t.clientX;
      state.mouse.y = t.clientY;
      const dx = state.mouse.x - state.turret.x;
      const dy = state.mouse.y - state.turret.y;
      state.turret.angle = clamp(Math.atan2(dy, dx), -Math.PI * 0.9, -Math.PI * 0.1);
      fireTurret();
      e.preventDefault();
    }
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (state.phase === 'title') {
        startGame();
      } else if (state.phase === 'briefing') {
        commenceLevel();
      } else if (state.phase === 'game_over') {
        startGame();
      }
    }
  });

  // ===== Game flow triggers =====
  function startGame() {
    clearPendingLevelTransition();
    resetMetrics();
    state.score = 0;
    state.level = 1;
    state.lives = state.maxLives;
    state.leftPile = [];
    state.rightPile = [];
    
    document.getElementById('overlay-title').classList.add('hidden');
    document.getElementById('overlay-over').classList.add('hidden');
    
    setupLevelBriefing();
  }

  function setupLevelBriefing() {
    clearPendingLevelTransition();
    state.phase = 'briefing';
    state.lasers = [];
    state.helicopters = [];
    state.paratroopers = [];
    state.particles = [];
    state.floaters = [];
    
    // Level rule select
    const ruleIdx = (state.level - 1) % LEVEL_DATA.length;
    state.activeRule = LEVEL_DATA[ruleIdx];
    
    // Adjust spawners for the chosen pace (Harder levels = more paratroopers + faster intervals)
    const cfg = paceCfg();
    state.spawners.parasTotal = cfg.base + state.level * cfg.per;
    state.spawners.parasSpawned = 0;
    state.spawners.parasRemaining = state.spawners.parasTotal;
    state.spawners.clearedSpawns = 0;
    state.spawners.maxSpawns = state.spawners.parasTotal;
    state.spawners.heliInterval = Math.max(cfg.intMin, cfg.int0 - state.level * cfg.intPer);
    state.spawners.heliTimer = cfg.first; // Quick spawn first heli
    
    // Truck positioning resets
    state.trucks.left = { x: -80, targetX: 60, status: 'driving_in', doorsOpen: 0, passengers: 0, speed: 120 };
    state.trucks.right = { x: W + 80, targetX: W - 140, status: 'driving_in', doorsOpen: 0, passengers: 0, speed: 120 };
    
    // Update overlays
    document.getElementById('rule-level-num').textContent = state.level;
    document.getElementById('rule-legend').innerHTML = buildLegend(state.activeRule);
    document.getElementById('overlay-rule').classList.remove('hidden');
    
    updateHUD();
  }

  function commenceLevel() {
    document.getElementById('overlay-rule').classList.add('hidden');
    state.phase = 'playing';
    updateHUD();
  }

  function fireTurret() {
    if (state.fireCooldown > 0) return; // gentle cadence: read, then shoot
    state.fireCooldown = 0.16;
    const barrelX = state.turret.x + Math.cos(state.turret.angle) * state.turret.barrelLength;
    const barrelY = state.turret.y + Math.sin(state.turret.angle) * state.turret.barrelLength;
    
    state.lasers.push({
      x: barrelX,
      y: barrelY,
      vx: Math.cos(state.turret.angle) * 750,
      vy: Math.sin(state.turret.angle) * 750,
      radius: 4,
      color: '#ffd24d'
    });
    
    state.metrics.shots++;
    // Trigger sound if helper loaded
    window.MathArcadeAudio?.event('SHOOT');
    
    // Recoil spring effect
    state.turret.recoil = 8;
    
    // Particle flash at muzzle
    for (let i = 0; i < 5; i++) {
      const a = state.turret.angle + rand(-0.2, 0.2);
      const spd = rand(100, 200);
      state.particles.push({
        x: barrelX,
        y: barrelY,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        color: '#ff8a3d',
        size: rand(3, 5),
        life: rand(0.15, 0.3),
        maxLife: 0.3,
        gravity: 0
      });
    }
  }

  // Helper to define 12 exact columns on each side of the turret (24 total)
  function getColumns() {
    const leftCols = [];
    const rightCols = [];
    const count = 12; // 12 columns on each side
    const colWidth = (W / 2 - 140) / (count - 1);
    for (let i = 0; i < count; i++) {
      leftCols.push(80 + i * colWidth);
      rightCols.push(W / 2 + 60 + i * colWidth);
    }
    return { left: leftCols, right: rightCols };
  }

  function spawnHelicopter() {
    if (state.spawners.parasSpawned >= state.spawners.parasTotal) return;
    state.spawners.clearedSpawns++;

    const side = Math.random() < 0.5 ? 'left' : 'right';
    const x = side === 'left' ? -60 : W + 60;
    // Harder levels = higher speed drop (helicopter speed scales with level)
    const baseSpeed = rand(90, 150) + state.level * 15;
    const vx = side === 'left' ? baseSpeed : -baseSpeed;
    const y = rand(40, H * 0.22);
    
    // letter select b vs d
    const letter = Math.random() < 0.5 ? 'b' : 'd';
    
    // Choose a random column from the 24 columns
    const cols = getColumns();
    const allCols = [...cols.left, ...cols.right];
    const dropX = allCols[randInt(0, allCols.length - 1)];
    
    state.helicopters.push({
      id: state.spawners.clearedSpawns,
      x,
      y,
      vx,
      vy: 0,
      letter,
      active: true,
      hasDropped: false,
      rotorAngle: 0,
      dropX,
      size: 38
    });
  }

  function checkLevelClear() {
    if (state.phase !== 'playing') return;

    const allPayloadsResolved = state.spawners.parasRemaining <= 0;
    const noActiveParatroopers = state.paratroopers.length === 0;
    // Anti-softlock: once every payload has been launched (no more drops coming)
    // and the field is empty, the level is over even if the remaining-counter
    // drifted out of sync — otherwise passive play could stall forever.
    const spawnsExhausted = state.spawners.parasSpawned >= state.spawners.parasTotal;
    const fieldEmpty = state.helicopters.length === 0 && state.paratroopers.length === 0;
    const cleared = (allPayloadsResolved && noActiveParatroopers) || (spawnsExhausted && fieldEmpty);
    if (!cleared) return;

    state.phase = 'level_clear';
    state.lasers = [];
    state.helicopters = [];
    showFloaterAt(W / 2, Math.max(110, H * 0.24), 'LEVEL CLEAR!', '#ffd24d');

    // Cheering sound
    window.MathArcadeAudio?.event('LEVEL CLEAR');

    // Rescue trucks drive away
    state.trucks.left.status = 'driving_out';
    state.trucks.right.status = 'driving_out';
    updateHUD();

    state.levelClearTimer = setTimeout(() => {
      state.level++;
      setupLevelBriefing();
    }, 1800);
  }

  function clearPendingLevelTransition() {
    if (!state.levelClearTimer) return;
    clearTimeout(state.levelClearTimer);
    state.levelClearTimer = null;
  }

  function handleGameOver(reason) {
    state.phase = 'game_over';
    
    // Save high score
    if (state.score > state.best) {
      state.best = state.score;
      localStorage.setItem('paratroopers_best', String(state.best));
    }
    
    window.MathArcadeAudio?.event('GAME OVER');
    
    // Big explosion at turret
    for (let i = 0; i < 40; i++) {
      const a = rand(0, Math.PI * 2);
      const spd = rand(100, 300);
      state.particles.push({
        x: state.turret.x,
        y: state.turret.y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        color: i % 2 ? '#ff5c7c' : '#ffd24d',
        size: rand(4, 9),
        life: rand(0.6, 1.2),
        maxLife: 1.2,
        gravity: 120
      });
    }
    
    // Set overlays
    document.getElementById('over-reason').textContent = reason;
    document.getElementById('over-score').textContent = state.score;
    document.getElementById('over-level').textContent = state.level;
    document.getElementById('over-best').textContent = state.best;
    // Look-alike (reversal) insight: how many connected shots hit the wrong, mirror letter.
    const m = state.metrics;
    const connected = m.badHits + m.friendlyFire;
    const pct = connected ? Math.round((m.friendlyFire / connected) * 100) : 0;
    const mixEl = document.getElementById('over-mix');
    const barEl = document.getElementById('over-mix-bar');
    const capEl = document.getElementById('over-cap');
    if (mixEl) mixEl.textContent = m.friendlyFire;
    if (barEl) barEl.style.width = pct + '%';
    if (capEl) {
      capEl.textContent = m.friendlyFire === 0
        ? `Zero look-alike mix-ups — you read every letter. ${m.rescues} rescued.`
        : `${pct}% of your hits struck the look-alike letter (b↔d, p↔q) by mistake. ${m.rescues} rescued. Fewer mix-ups is sharper.`;
    }
    document.getElementById('overlay-over').classList.remove('hidden');
    
    updateHUD();
  }

  // ===== Update functions (Simulation physics) =====
  function update(dt) {
    state.elapsed += dt;
    
    // Turret center base positioning
    state.turret.x = W / 2;
    state.turret.y = H - 32; // positioned just above grass floor
    
    // Spring recoil return
    if (state.turret.recoil > 0) {
      state.turret.recoil -= dt * 25;
      if (state.turret.recoil < 0) state.turret.recoil = 0;
    }
    if (state.fireCooldown > 0) state.fireCooldown -= dt;

    if (state.phase === 'playing') {
      // 1. Spawners updates
      state.spawners.heliTimer -= dt;
      if (state.spawners.heliTimer <= 0 && state.spawners.parasSpawned < state.spawners.parasTotal) {
        spawnHelicopter();
        // Dynamically speed up spawns toward the end of the level (even faster accelerator: up to 55%)
        const progress = state.spawners.parasSpawned / state.spawners.parasTotal;
        const currentInterval = state.spawners.heliInterval * (1 - progress * 0.55);
        state.spawners.heliTimer = currentInterval;
      }
    }

    // 2. Clouds physics
    for (const c of state.clouds) {
      c.x += c.speed * dt;
      if (c.x - c.size > W) {
        c.x = -c.size;
        c.y = rand(40, H * 0.35);
      }
    }

    // 3. Laser physics
    for (const l of state.lasers) {
      l.x += l.vx * dt;
      l.y += l.vy * dt;
    }
    // Filter out-of-bounds lasers
    state.lasers = state.lasers.filter(l => l.x > -50 && l.x < W + 50 && l.y > -50 && l.y < H + 50);

    // 4. Helicopter physics
    for (const h of state.helicopters) {
      h.x += h.vx * dt;
      h.rotorAngle += 28 * dt;
      
      // Spawn drops during play
      if (state.phase === 'playing' && !h.hasDropped && state.spawners.parasSpawned < state.spawners.parasTotal) {
        const crossed = h.vx > 0 ? h.x >= h.dropX : h.x <= h.dropX;
        if (crossed && h.x > 80 && h.x < W - 80) {
          h.hasDropped = true;
          state.spawners.parasSpawned++;
          
          // Drop paratrooper carrying p vs q
          const letter = Math.random() < 0.5 ? 'p' : 'q';
          state.paratroopers.push({
            x: h.dropX, // Drop exactly at column center for perfect vertical alignment
            y: h.y + h.size * 0.4,
            vy: 45 + state.level * 8, // Drift speed scales with level
            letter,
            status: 'drift', // 'drift', 'plunge', 'landed', 'running'
            flailPhase: 0,
            hasChute: true,
            size: 35
          });
        }
      }
    }
    // Filter helicopters that went offscreen
    const originalHeliCount = state.helicopters.length;
    state.helicopters = state.helicopters.filter(h => {
      const onScreen = h.vx > 0 ? h.x < W + 80 : h.x > -80;
      if (!onScreen) resolveHelicopterPayload(h);
      return onScreen;
    });
    if (state.phase === 'playing' && state.helicopters.length < originalHeliCount) {
      checkLevelClear();
    }

    // 5. Paratrooper physics
    const groundY = H - 32;
    for (const p of state.paratroopers) {
      p.flailPhase += 14 * dt;
      
      if (p.status === 'drift') {
        p.y += p.vy * dt;
        if (p.y >= groundY - 8) {
          landParatrooper(p);
        }
      } else if (p.status === 'plunge') {
        p.y += p.vy * dt; // fast plunge y velocity
        if (p.y >= groundY - 6) {
          crashParatrooper(p);
        }
      } else if (p.status === 'running') {
        // Run towards target truck back doors
        const targetTruck = p.x < W / 2 ? state.trucks.left : state.trucks.right;
        const targetX = p.x < W / 2 ? state.trucks.left.x + 62 : state.trucks.right.x;
        const dx = targetX - p.x;
        
        // Open doors as they get close
        if (Math.abs(dx) < 60) {
          targetTruck.doorsOpen = lerp(targetTruck.doorsOpen, 1.0, 0.15);
        }
        
        if (Math.abs(dx) < 8) {
          // Hop inside!
          targetTruck.passengers++;
          p.alive = false;
          
          // Star sparkles on rescue
          for (let i = 0; i < 8; i++) {
            const a = rand(-Math.PI * 0.9, -Math.PI * 0.1);
            const spd = rand(40, 100);
            state.particles.push({
              x: p.x,
              y: p.y,
              vx: Math.cos(a) * spd,
              vy: Math.sin(a) * spd,
              color: '#ffd24d',
              size: rand(2.5, 4.5),
              life: rand(0.3, 0.6),
              maxLife: 0.6,
              gravity: 50
            });
          }
          
          // Bonus points
          state.metrics.rescues++;
          state.score += 20;
          showFloaterAt(p.x, p.y - 25, `RESCUE +20!`, '#5cd97a');
          window.MathArcadeAudio?.event('SOLVED');
          updateHUD();
        } else {
          p.x += Math.sign(dx) * 120 * dt;
        }
      }
    }
    state.paratroopers = state.paratroopers.filter(p => p.alive !== false);
    checkLevelClear();

    // 6. Truck physics
    // Left Truck
    if (state.trucks.left.status === 'driving_in') {
      state.trucks.left.x += state.trucks.left.speed * dt;
      if (state.trucks.left.x >= state.trucks.left.targetX) {
        state.trucks.left.x = state.trucks.left.targetX;
        state.trucks.left.status = 'parked';
      }
    } else if (state.trucks.left.status === 'driving_out') {
      state.trucks.left.doorsOpen = lerp(state.trucks.left.doorsOpen, 0.0, 0.15);
      state.trucks.left.x -= state.trucks.left.speed * 1.5 * dt;
    }
    // Right Truck
    if (state.trucks.right.status === 'driving_in') {
      state.trucks.right.x -= state.trucks.right.speed * dt;
      if (state.trucks.right.x <= state.trucks.right.targetX) {
        state.trucks.right.x = state.trucks.right.targetX;
        state.trucks.right.status = 'parked';
      }
    } else if (state.trucks.right.status === 'driving_out') {
      state.trucks.right.doorsOpen = lerp(state.trucks.right.doorsOpen, 0.0, 0.15);
      state.trucks.right.x += state.trucks.right.speed * 1.5 * dt;
    }

    // 7. Collision detection (Lasers vs Helicopters/Paratroopers)
    for (const l of state.lasers) {
      // A. Check against helicopters
      for (const h of state.helicopters) {
        if (!h.active) continue;
        const dx = l.x - h.x;
        const dy = l.y - h.y;
        const distSq = dx * dx + dy * dy;
        const colRad = h.size * 1.2;
        if (distSq < colRad * colRad) {
          // Hit helicopter!
          l.x = -9999; // destroy laser
          h.active = false;
          
          destroyHelicopter(h);
          break;
        }
      }
      
      // B. Check against paratroopers
      for (const p of state.paratroopers) {
        if (p.status === 'running') continue;
        
        // Shoot parachute or body
        const dx = l.x - p.x;
        // parachute is around y - (p.size * 0.9)
        const dyChute = l.y - (p.y - p.size * 0.9);
        const distChuteSq = dx * dx + dyChute * dyChute;
        const colChute = p.size * 0.75;
        
        if (p.hasChute && distChuteSq < colChute * colChute) {
          // Destroy parachute only!
          l.x = -9999;
          p.hasChute = false;
          p.status = 'plunge';
          p.plungeStartY = p.y;
          p.vy = 300 + state.level * 25; // scaled plunge speed
          
          showFloaterAt(p.x, p.y - p.size * 1.0, 'POP!', '#ff8a3d');
          
          // Particle shreds of parachute
          for (let i = 0; i < 8; i++) {
            state.particles.push({
              x: p.x + rand(-p.size * 0.5, p.size * 0.5),
              y: p.y - p.size * 0.9,
              vx: rand(-80, 80),
              vy: rand(-60, 40),
              color: '#ffd24d',
              size: rand(2.5, 4.5),
              life: rand(0.3, 0.6),
              maxLife: 0.6,
              gravity: 120
            });
          }
          break;
        }
        
        // Check body hit
        const dyBody = l.y - p.y;
        const distBodySq = dx * dx + dyBody * dyBody;
        const colBody = p.size * 0.5;
        if (distBodySq < colBody * colBody) {
          l.x = -9999;
          p.alive = false;
          
          destroyParatrooper(p);
          break;
        }
      }
    }
    // Filter out destroyed lasers
    state.lasers = state.lasers.filter(l => l.x > 0);

    // 8. Particles physics
    for (const p of state.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.life -= dt;
    }
    state.particles = state.particles.filter(p => p.life > 0);

    // 9. Floaters update
    for (const f of state.floaters) {
      f.t += dt;
      f.y -= 25 * dt;
    }
    state.floaters = state.floaters.filter(f => f.t < f.dur);
  }

  // ===== Entity Handlers (Interception & Scoring) =====
  function destroyHelicopter(h) {
    h.vx = 0;
    resolveHelicopterPayload(h);
    
    // Determine if bad vs good
    let isBad = false;
    if (state.activeRule.type === 'heli') {
      isBad = h.letter === state.activeRule.shoot;
    } else if (state.activeRule.type === 'both') {
      isBad = h.letter === state.activeRule.shootHeli;
    }
    
    if (isBad) {
      state.metrics.badHits++;
      state.score += 50;
      showFloaterAt(h.x, h.y - 25, `BOOM +50!`, '#5cd97a');
      window.MathArcadeAudio?.event('SOLVED');
    } else {
      state.metrics.friendlyFire++;
      state.score = Math.max(0, state.score - 30);
      state.lives--;
      showFloaterAt(h.x, h.y - 25, `RESCUE DAMAGE! −1♥ −30`, '#ff5c7c');
      window.MathArcadeAudio?.event('DEATH');
      
      if (state.lives <= 0) {
        handleGameOver('Shot down friendly rescue fleet!');
        return;
      }
    }
    
    updateHUD();
    
    // Trigger explosion particles
    triggerExplosion(h.x, h.y, h.letter === 'b' ? '#ff5c7c' : '#ffd24d');
    
    // Clear from list
    state.helicopters = state.helicopters.filter(item => item.id !== h.id);
    checkLevelClear();
  }

  function resolveHelicopterPayload(h) {
    if (h.hasDropped) return;
    h.hasDropped = true;
    state.spawners.parasRemaining = Math.max(0, state.spawners.parasRemaining - 1);
    updateHUD();
  }

  function isBadParatrooper(p) {
    if (state.activeRule.type === 'para') return p.letter === state.activeRule.shoot;
    if (state.activeRule.type === 'both') return p.letter === state.activeRule.shootPara;
    return false;
  }

  function destroyParatrooper(p) {
    p.alive = false;

    const isBad = isBadParatrooper(p);
    // Combo: chute was popped first, then the body shot mid-fall before it crashed.
    const combo = p.status === 'plunge';

    if (isBad) {
      state.metrics.badHits++;
      const pts = combo ? 25 : 10;
      state.score += pts;
      showFloaterAt(p.x, p.y - 25, combo ? `MID-AIR COMBO +${pts}!` : `HIT +10`, '#ffd24d');
      if (combo) burstStars(p.x, p.y);
      window.MathArcadeAudio?.event('SOLVED');
    } else {
      state.metrics.friendlyFire++;
      state.score = Math.max(0, state.score - 15);
      state.lives--;
      showFloaterAt(p.x, p.y - 25, `FRIENDLY FIRE! −1♥ −15`, '#ff5c7c');
      window.MathArcadeAudio?.event('DEATH');
      
      if (state.lives <= 0) {
        handleGameOver('Shot down friendly paratroopers!');
        return;
      }
    }
    
    state.spawners.parasRemaining--;
    updateHUD();
    
    // Particle burst
    triggerExplosion(p.x, p.y, p.letter === 'p' ? '#ff5c7c' : '#ffd24d');
    
    // Check level clear
    checkLevelClear();
  }

  function landParatrooper(p) {
    p.vy = 0;
    
    const isBad = isBadParatrooper(p);
    
    if (isBad) {
      const truck = truckAt(p.x);
      if (truck) {
        p.status = 'landed';
        p.alive = false;
        p.hasChute = false;
        explodeTruck(truck, p.x);
        return; // game over
      }
      addLandedBadParatrooper(p);
      window.MathArcadeAudio?.event('TICK');
      
      // Check Sabotage pile gameover (4 landed on one side)
      if (state.leftPile.length >= 4) {
        triggerPyramidClimb('left');
      } else if (state.rightPile.length >= 4) {
        triggerPyramidClimb('right');
      }
      
    } else {
      // Good paratrooper landed — runs to truck!
      p.status = 'running';
      p.hasChute = false;
    }
    
    state.spawners.parasRemaining--;
    updateHUD();
    
    checkLevelClear();
  }

  function crashParatrooper(p) {
    const groundY = H - 32;
    const isBad = isBadParatrooper(p);
    const fallDistance = groundY - (p.plungeStartY ?? p.y);
    const hitTruck = truckAtX(p.x);
    let crushedCount = 0;
    let crushedRunner = false;

    // Survive if plunge was extremely short (close to the ground)
    if (fallDistance < 80 && !hitTruck) {
      p.status = 'drift';
      p.y = groundY - 8;
      landParatrooper(p);
      return;
    }

    p.alive = false;

    // A bad paratrooper crashing onto a truck blows it up — game over.
    if (hitTruck && isBad) {
      explodeTruck(truckAt(p.x), p.x);
      return;
    }

    if (hitTruck) {
      showFloaterAt(p.x, groundY - 55, 'CLANG!', '#5cd9ff');
      triggerTruckSparks(p.x, groundY - 30);
    } else {
      crushedRunner = crushGoodRunnerBelow(p.x);
      // Any paratrooper that loses its chute and falls (fallDistance >= 80)
      // will clear the bad paratroopers stacked at that same landing position column
      crushedCount = splashLandedBadParatroopers(p.x, 8);
    }
    
    // Particle splat
    for (let i = 0; i < 10; i++) {
      state.particles.push({
        x: p.x,
        y: groundY,
        vx: rand(-60, 60),
        vy: -rand(30, 80),
        color: hitTruck ? '#5cd9ff' : '#b0b8c4',
        size: rand(2.5, 4.5),
        life: rand(0.3, 0.5),
        maxLife: 0.5,
        gravity: 120
      });
    }
    
    if (!hitTruck) {
      const message = crushedCount
        ? `SPLASH x${crushedCount}!`
        : (crushedRunner ? 'CRUSH!' : 'CRASH!');
      showFloaterAt(p.x, groundY - 55, message, '#ff5c7c');
    }
    window.MathArcadeAudio?.event('DEATH');
    
    state.spawners.parasRemaining--;
    updateHUD();
    
    checkLevelClear();
  }

  function addLandedBadParatrooper(p) {
    p.status = 'landed';
    p.alive = false;
    p.hasChute = false;

    const cols = getColumns();
    const allCols = [...cols.left, ...cols.right];
    
    // Find closest exact column coordinate
    let closestColX = allCols[0];
    let minDist = Math.abs(p.x - closestColX);
    for (let i = 1; i < allCols.length; i++) {
      const dist = Math.abs(p.x - allCols[i]);
      if (dist < minDist) {
        minDist = dist;
        closestColX = allCols[i];
      }
    }
    
    p.x = closestColX; // Snap exactly to the column X coordinate!

    const pile = p.x < W / 2 ? state.leftPile : state.rightPile;
    const stackLevel = pile.filter(item => Math.abs(item.x - p.x) < 4).length;

    p.groundStack = stackLevel;
    p.y = H - 32 - 6 - stackLevel * 10;
    pile.push(p);
  }

  function splashLandedBadParatroopers(x, radius) {
    const removeNear = pile => {
      let removed = 0;
      for (let i = pile.length - 1; i >= 0; i--) {
        if (Math.abs(pile[i].x - x) <= radius) {
          triggerExplosion(pile[i].x, pile[i].y, '#ff5c7c');
          pile.splice(i, 1);
          removed++;
        }
      }
      return removed;
    };

    const count = removeNear(state.leftPile) + removeNear(state.rightPile);
    restackLandedBadParatroopers();
    return count;
  }

  function restackLandedBadParatroopers() {
    const cols = getColumns();
    const allCols = [...cols.left, ...cols.right];
    
    const restack = pile => {
      const stacks = new Map();
      for (const p of pile) {
        // Find the closest column coordinate
        let closestColX = allCols[0];
        let minDist = Math.abs(p.x - closestColX);
        for (let i = 1; i < allCols.length; i++) {
          const dist = Math.abs(p.x - allCols[i]);
          if (dist < minDist) {
            minDist = dist;
            closestColX = allCols[i];
          }
        }
        
        p.x = closestColX; // snap to exact column coordinate
        const level = stacks.get(closestColX) || 0;
        p.groundStack = level;
        p.y = H - 32 - 6 - level * 10;
        stacks.set(closestColX, level + 1);
      }
    };
    restack(state.leftPile);
    restack(state.rightPile);
  }

  function crushGoodRunnerBelow(x) {
    const target = state.paratroopers.find(p => (
      p.status === 'running' &&
      !isBadParatrooper(p) &&
      Math.abs(p.x - x) < 18
    ));
    if (!target) return false;

    target.alive = false;
    triggerExplosion(target.x, target.y, '#5cd97a');
    showFloaterAt(target.x, target.y - 28, 'CRUSH!', '#ff5c7c');
    return true;
  }

  // Returns the truck whose body sits under x (or null). Driving-out / destroyed
  // trucks are not collidable.
  function truckAt(x) {
    return [state.trucks.left, state.trucks.right].find(t =>
      t.status !== 'driving_out' && t.status !== 'destroyed' &&
      x >= t.x - 4 && x <= t.x + 66
    ) || null;
  }
  function truckAtX(x) { return truckAt(x) !== null; }

  // A bad paratrooper reaching a rescue truck blows it up — instant game over.
  function explodeTruck(truck, x) {
    if (truck) truck.status = 'destroyed';
    const ex = truck ? truck.x + 31 : x;
    const ey = H - 56;
    for (let i = 0; i < 38; i++) {
      const a = rand(0, Math.PI * 2);
      const spd = rand(80, 300);
      state.particles.push({
        x: ex, y: ey,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 50,
        color: i % 3 === 0 ? '#ff5c7c' : (i % 3 === 1 ? '#ff8a3d' : '#ffd24d'),
        size: rand(4, 10), life: rand(0.6, 1.2), maxLife: 1.2, gravity: 150
      });
    }
    showFloaterAt(ex, ey - 50, 'TRUCK DOWN!', '#ff5c7c');
    window.MathArcadeAudio?.event('DEATH');
    handleGameOver('A bad paratrooper destroyed the rescue truck!');
  }

  function triggerTruckSparks(x, y) {
    for (let i = 0; i < 12; i++) {
      state.particles.push({
        x,
        y,
        vx: rand(-110, 110),
        vy: -rand(40, 120),
        color: i % 2 ? '#5cd9ff' : '#ffd24d',
        size: rand(2, 4),
        life: rand(0.25, 0.5),
        maxLife: 0.5,
        gravity: 160
      });
    }
  }

  function triggerPyramidClimb(side) {
    state.phase = 'game_over';
    
    // Animate bad troopers climbing to blow up turret
    const pile = side === 'left' ? state.leftPile : state.rightPile;
    
    let step = 0;
    const climbInterval = setInterval(() => {
      if (step >= pile.length) {
        clearInterval(climbInterval);
        handleGameOver('Turret sabotaged! Landed paratroopers blew up the base!');
      } else {
        // Draw climbers stepping onto turret
        pile[step].x = state.turret.x + (side === 'left' ? -15 + step * 4 : 15 - step * 4);
        pile[step].y = state.turret.y - 12 - step * 10;
        step++;
      }
    }, 200);
  }

  // Celebratory gold star sparkle (used for skill rewards like the mid-air combo).
  function burstStars(x, y) {
    for (let i = 0; i < 14; i++) {
      const a = rand(0, Math.PI * 2);
      const spd = rand(70, 200);
      state.particles.push({
        x, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 40,
        color: i % 2 ? '#ffd24d' : '#fff4dc',
        size: rand(2.5, 5), life: rand(0.4, 0.8), maxLife: 0.8, gravity: 90
      });
    }
  }

  function triggerExplosion(x, y, color) {
    for (let i = 0; i < 15; i++) {
      const a = rand(0, Math.PI * 2);
      const spd = rand(50, 160);
      state.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        color: color || '#ff8a3d',
        size: rand(3, 7),
        life: rand(0.4, 0.8),
        maxLife: 0.8,
        gravity: 80
      });
    }
  }

  function showFloaterAt(x, y, text, color) {
    state.floaters.push({ x, y, text, color, t: 0, dur: 1.0 });
  }

  // ===== Mission legend (visual rule — replaces the old truncated RULE badge) =====
  function glyphHTML(letter, kind, cls) { return `<span class="glyph ${kind} ${cls || ''}">${letter}</span>`; }
  function ruleTokens(rule, which) {
    if (!rule) return [];
    if (rule.type === 'para') return [{ letter: which === 'shoot' ? rule.shoot : rule.save, entity: 'trooper' }];
    if (rule.type === 'heli') return [{ letter: which === 'shoot' ? rule.shoot : rule.save, entity: 'chopper' }];
    if (which === 'shoot') return [{ letter: rule.shootPara, entity: 'trooper' }, { letter: rule.shootHeli, entity: 'chopper' }];
    return [{ letter: rule.savePara, entity: 'trooper' }, { letter: rule.saveHeli, entity: 'chopper' }];
  }
  function entityLabel(toks) {
    const ents = [...new Set(toks.map(t => t.entity))];
    return ents.map(e => e === 'chopper' ? 'helicopters' : 'parachute troopers').join(' & ');
  }
  function buildLegend(rule) {
    const sh = ruleTokens(rule, 'shoot'), sv = ruleTokens(rule, 'save');
    const shG = sh.map(t => glyphHTML(t.letter, 'shoot', 'lbig')).join('');
    const svG = sv.map(t => glyphHTML(t.letter, 'save', 'lbig')).join('');
    return `
      <div class="lcol shoot"><div class="lhead">🎯 SHOOT</div><div class="ltokens">${shG}</div><div class="ldesc">these ${entityLabel(sh)} — zap them</div></div>
      <div class="lcol save"><div class="lhead">🛟 SAVE</div><div class="ltokens">${svG}</div><div class="ldesc">let these land &amp; reach the truck</div></div>`;
  }
  function updateMissionBar() {
    const el = document.getElementById('mission');
    if (!el) return;
    if (state.phase !== 'playing' || !state.activeRule) { el.classList.remove('show'); return; }
    const sh = ruleTokens(state.activeRule, 'shoot').map(t => glyphHTML(t.letter, 'shoot')).join('');
    const sv = ruleTokens(state.activeRule, 'save').map(t => glyphHTML(t.letter, 'save')).join('');
    el.innerHTML = `<div class="m-grp shoot"><span class="m-verb">SHOOT</span>${sh}</div><div class="m-div"></div><div class="m-grp save"><span class="m-verb">SAVE</span>${sv}</div>`;
    el.classList.add('show');
  }

  function updateHUD() {
    document.getElementById('hp').textContent = '♥'.repeat(Math.max(0, state.lives)) || '–';
    document.getElementById('score').textContent = state.score;
    document.getElementById('level').textContent = state.level;
    const parasLeftEl = document.getElementById('paras-left');
    if (parasLeftEl) parasLeftEl.textContent = Math.max(0, state.spawners.parasRemaining);
    updateMissionBar();
  }

  // ===== Rendering / Drawing =====
  function draw() {
    drawBg();
    drawClouds();
    drawRescueTrucks();
    drawDangerMeters();
    drawBadPiles();
    drawTurret();
    drawLasers();
    drawHelicopters();
    drawParatroopers();
    drawParticles();
    drawFloaters();
    drawLevelClearBanner();
  }

  // Per-side sabotage threat: a rising red ground glow on the threatened side,
  // with a flashing warning once 3+ bad troopers have piled up (4 = base lost).
  function drawDangerMeters() {
    if (!(state.phase === 'playing' || state.phase === 'level_clear')) return;
    const side = (count, x0, x1, labelX) => {
      if (count <= 0) return;
      const frac = Math.min(1, count / 4);
      const danger = count >= 3;
      const flash = danger ? (Math.sin(state.elapsed * 10) * 0.5 + 0.5) : 1;
      const h = 10 + frac * 30;
      const gx0 = Math.min(x0, x1), gw = Math.abs(x1 - x0);
      const grad = ctx.createLinearGradient(0, H - 32 - h, 0, H - 32);
      grad.addColorStop(0, 'rgba(255,93,108,0)');
      grad.addColorStop(1, `rgba(255,93,108,${(0.16 + frac * 0.34) * flash})`);
      ctx.fillStyle = grad;
      ctx.fillRect(gx0, H - 32 - h, gw, h);
      if (danger) {
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#7a0d18'; ctx.lineWidth = 3;
        ctx.font = 'bold 13px "Lilita One", sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        const txt = `⚠ SABOTAGE ${count}/4`;
        ctx.strokeText(txt, labelX, H - 32 - h - 6);
        ctx.fillText(txt, labelX, H - 32 - h - 6);
      }
    };
    side(state.leftPile.length, 0, state.turret.x - 30, state.turret.x * 0.5);
    side(state.rightPile.length, state.turret.x + 30, W, state.turret.x + (W - state.turret.x) * 0.5);
  }

  function drawBg() {
    const dusk = TWEAKS.theme === 'dusk';
    const skyG = ctx.createLinearGradient(0, 0, 0, H);
    if (dusk) {
      skyG.addColorStop(0, '#3a2f6e');
      skyG.addColorStop(0.45, '#6d5aa0');
      skyG.addColorStop(0.7, '#e88f6a');
      skyG.addColorStop(0.85, '#e88f6a');
      skyG.addColorStop(0.85, '#3c6e3a');
      skyG.addColorStop(1, '#234e26');
    } else {
      skyG.addColorStop(0, '#7ad1ff');
      skyG.addColorStop(0.7, '#cfe0ff');
      skyG.addColorStop(0.85, '#cfe0ff');
      skyG.addColorStop(0.85, '#5cb85c');
      skyG.addColorStop(1, '#2e8a3e');
    }
    ctx.fillStyle = skyG;
    ctx.fillRect(0, 0, W, H);

    // soft sun / moon glow
    const gx = W * 0.78, gy = H * 0.16, gr = Math.min(W, H) * 0.55;
    const glow = ctx.createRadialGradient(gx, gy, 4, gx, gy, gr);
    glow.addColorStop(0, dusk ? 'rgba(255,224,170,0.5)' : 'rgba(255,255,255,0.55)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

    // horizon line
    ctx.strokeStyle = 'rgba(26,26,20,0.14)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, H - 32);
    ctx.lineTo(W, H - 32);
    ctx.stroke();
  }

  function drawClouds() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    for (const c of state.clouds) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.size * 0.4, 0, Math.PI * 2);
      ctx.arc(c.x + c.size * 0.3, c.y - c.size * 0.1, c.size * 0.45, 0, Math.PI * 2);
      ctx.arc(c.x + c.size * 0.65, c.y, c.size * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawRescueTrucks() {
    ctx.save();
    ctx.strokeStyle = '#1a1a14';
    ctx.lineWidth = 2.5;
    
    const drawSingleTruck = (t, isLeft) => {
      if (t.status === 'destroyed') return; // blown up — gone
      // 0. Drop shadow
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      ctx.beginPath();
      ctx.ellipse(t.x + 31, H - 32, 45, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Truck base y position
      const ty = H - 32 - 32;

      // 1. Cabin (orange color block)
      ctx.fillStyle = '#ff8a3d';
      const cabX = isLeft ? t.x : t.x + 42;
      ctx.fillRect(cabX, ty + 10, 20, 22);
      ctx.strokeRect(cabX, ty + 10, 20, 22);

      // Cabin window
      ctx.fillStyle = '#7ad1ff';
      const winX = isLeft ? cabX + 4 : cabX + 4;
      ctx.fillRect(winX, ty + 14, 12, 10);
      ctx.strokeRect(winX, ty + 14, 12, 10);

      // 2. Trailer Body (sandy yellow ambulance/rescue box)
      ctx.fillStyle = '#fff4dc';
      const bodyX = isLeft ? t.x + 20 : t.x;
      ctx.fillRect(bodyX, ty, 42, 32);
      ctx.strokeRect(bodyX, ty, 42, 32);
      
      // Decorative text on side of trailer
      ctx.fillStyle = '#ff5c7c';
      ctx.font = 'bold 8px "Lilita One", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('RESCUE', bodyX + 21, ty + 14);

      // Passengers indicators (drawn as tiny dots inside side grille)
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i < t.passengers ? '#5cd97a' : 'rgba(26,26,20,0.2)';
        ctx.beginPath();
        ctx.arc(bodyX + 8 + i * 8, ty + 24, 2.5, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      }

      // 3. Wheels
      ctx.fillStyle = '#1a1a14';
      ctx.beginPath();
      ctx.arc(bodyX + 10, ty + 32, 7, 0, Math.PI * 2);
      ctx.arc(cabX + 10, ty + 32, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(bodyX + 10, ty + 32, 2.5, 0, Math.PI * 2);
      ctx.arc(cabX + 10, ty + 32, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // 4. Back Rescue Doors (animated opening)
      if (t.doorsOpen > 0.05) {
        ctx.fillStyle = '#8b5a2b';
        // Door arches out
        const doorW = 10 * t.doorsOpen;
        const doorX = isLeft ? bodyX + 42 : bodyX - doorW;
        ctx.fillRect(doorX, ty + 6, doorW, 20);
        ctx.strokeRect(doorX, ty + 6, doorW, 20);
      }
      
      // 5. Flashing siren light on top
      const sirenX = isLeft ? cabX + 10 : cabX + 10;
      const sirenGlow = (Math.sin(state.elapsed * 12) + 1) * 0.5;
      ctx.fillStyle = sirenGlow > 0.5 ? '#ff5c7c' : '#ffd24d';
      ctx.beginPath();
      ctx.arc(sirenX, ty - 3, 4, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    };

    // Draw Left and Right trucks
    drawSingleTruck(state.trucks.left, true);
    drawSingleTruck(state.trucks.right, false);
    
    ctx.restore();
  }

  function drawBadPiles() {
    ctx.save();
    ctx.strokeStyle = '#1a1a14';
    ctx.lineWidth = 2;
    const drawSab = (p) => {
      const py = p.y ?? H - 32 - 6;
      // little red-suited saboteur figure (clearer than a bare dot)
      ctx.fillStyle = '#ff5d6c';
      ctx.beginPath(); ctx.roundRect(p.x - 6, py - 4, 12, 12, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffd9b0'; // head
      ctx.beginPath(); ctx.arc(p.x, py - 7, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; // stamped letter so you can still read what landed
      ctx.font = 'bold 8px "Lilita One", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p.letter, p.x, py + 2);
    };
    for (const p of state.leftPile) drawSab(p);
    for (const p of state.rightPile) drawSab(p);
    ctx.restore();
  }

  function drawTurret() {
    ctx.save();
    ctx.strokeStyle = '#1a1a14';
    ctx.lineWidth = 3;
    
    // Recoil recoil-damping translation offset
    const recoilOffset = state.turret.recoil;
    
    // 1. Pivot center turret barrel (aimed at cursor, recoiled)
    ctx.fillStyle = '#3a3a4a';
    ctx.save();
    ctx.translate(state.turret.x, state.turret.y);
    ctx.rotate(state.turret.angle);
    
    // Draw barrel rectangle (recoiled backward along rotation axis)
    ctx.fillRect(-recoilOffset, -state.turret.barrelWidth / 2, state.turret.barrelLength, state.turret.barrelWidth);
    ctx.strokeRect(-recoilOffset, -state.turret.barrelWidth / 2, state.turret.barrelLength, state.turret.barrelWidth);
    
    ctx.restore();
 
    // 2. Pivot dome head (hemisphere)
    ctx.fillStyle = '#5a6494';
    ctx.beginPath();
    ctx.arc(state.turret.x, state.turret.y, state.turret.baseRadius * 0.72, Math.PI, 0);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // 3. Ground turntable platform
    ctx.fillStyle = '#1e243a';
    ctx.fillRect(state.turret.x - state.turret.baseRadius, state.turret.y, state.turret.baseRadius * 2, 10);
    ctx.strokeRect(state.turret.x - state.turret.baseRadius, state.turret.y, state.turret.baseRadius * 2, 10);

    ctx.restore();
  }

  function drawLasers() {
    ctx.save();
    for (const l of state.lasers) {
      ctx.fillStyle = l.color;
      ctx.strokeStyle = '#1a1a14';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(l.x, l.y, l.radius, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  function drawHelicopters() {
    ctx.save();
    ctx.strokeStyle = '#1a1a14';
    ctx.lineWidth = 2.5;

    for (const h of state.helicopters) {
      if (!h.active) continue;
      
      const bounce = Math.sin(state.elapsed * 5 + h.id) * 3;
      const hy = h.y + bounce;
      const facingLeft = h.vx < 0;

      // 0. Drop shadow on land
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.beginPath();
      ctx.ellipse(h.x, H - 32, h.size * 1.1, h.size * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();

      // 1. Helicopter Body
      let isBad = false;
      if (state.activeRule.type === 'heli') {
        isBad = h.letter === state.activeRule.shoot;
      } else if (state.activeRule.type === 'both') {
        isBad = h.letter === state.activeRule.shootHeli;
      }
      
      ctx.fillStyle = colorOn() ? (isBad ? '#ff5c7c' : '#7ad1ff') : '#b4c2d4';
      ctx.beginPath();
      ctx.ellipse(h.x, hy, h.size * 0.75, h.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      // Cockpit bubble window
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      const winX = facingLeft ? h.x - h.size * 0.45 : h.x + h.size * 0.1;
      const winY = hy - h.size * 0.08;
      const winR = h.size * 0.23;
      ctx.beginPath();
      ctx.arc(winX, winY, winR, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      // Tail arm
      const tailX = facingLeft ? h.x + h.size * 0.5 : h.x - h.size * 1.1;
      const tailY = hy - h.size * 0.1;
      const tailW = h.size * 0.6;
      const tailH = h.size * 0.18;
      ctx.fillStyle = colorOn() ? (isBad ? '#d9405c' : '#4fa9d9') : '#8c9bb0';
      ctx.fillRect(tailX, tailY, tailW, tailH);
      ctx.strokeRect(tailX, tailY, tailW, tailH);

      // Tail rotor blades
      const trX = facingLeft ? tailX + tailW : tailX;
      const trY = hy - h.size * 0.05;
      const trR = h.size * 0.13;
      ctx.fillStyle = '#1a1a14';
      ctx.beginPath();
      ctx.arc(trX, trY, trR, 0, Math.PI * 2);
      ctx.fill();

      // 2. Spinning main rotor blades
      const rotL = h.size * 0.9;
      const sinR = Math.sin(h.rotorAngle);
      ctx.strokeStyle = '#1a1a14';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(h.x, hy - h.size * 0.5 - h.size * 0.12);
      ctx.lineTo(h.x, hy - h.size * 0.5);
      ctx.stroke();

      // spinning horizontal rotors
      ctx.beginPath();
      ctx.moveTo(h.x - rotL * sinR, hy - h.size * 0.5 - h.size * 0.12);
      ctx.lineTo(h.x + rotL * sinR, hy - h.size * 0.5 - h.size * 0.12);
      ctx.stroke();

      // Landing skids
      ctx.strokeStyle = '#1a1a14';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(h.x - h.size * 0.38, hy + h.size * 0.42);
      ctx.lineTo(h.x - h.size * 0.38, hy + h.size * 0.6);
      ctx.moveTo(h.x + h.size * 0.38, hy + h.size * 0.42);
      ctx.lineTo(h.x + h.size * 0.38, hy + h.size * 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(h.x - h.size * 0.6, hy + h.size * 0.6);
      ctx.lineTo(h.x + h.size * 0.6, hy + h.size * 0.6);
      ctx.stroke();

      // 3. Large High-contrast identifier letter
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#1a1a14';
      ctx.lineWidth = 3;
      ctx.font = 'bold ' + Math.floor(h.size * 0.8) + 'px "Lilita One", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const offset = facingLeft ? -h.size * 0.08 : h.size * 0.08;
      ctx.strokeText(h.letter, h.x - offset, hy + h.size * 0.08);
      ctx.fillText(h.letter, h.x - offset, hy + h.size * 0.08);
    }
    
    ctx.restore();
  }

  function drawParatroopers() {
    ctx.save();
    ctx.strokeStyle = '#1a1a14';
    ctx.lineWidth = 2.2;

    for (const p of state.paratroopers) {
      if (p.status === 'landed') continue; // drawn inside piles
      
      const flailY = Math.sin(p.flailPhase) * 2.5;
      
      // Determine if bad vs good
      let isBad = false;
      if (state.activeRule.type === 'para') {
        isBad = p.letter === state.activeRule.shoot;
      } else if (state.activeRule.type === 'both') {
        isBad = p.letter === state.activeRule.shootPara;
      }

      // 1. Draw large parachute if active
      if (p.hasChute) {
        ctx.fillStyle = colorOn() ? (isBad ? '#ff5c7c' : '#ffd24d') : '#ecd49a';
        
        ctx.beginPath();
        // Dome arch
        ctx.arc(p.x, p.y - p.size * 0.9, p.size * 0.65, Math.PI, 0);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        
        // Chute strings
        ctx.beginPath();
        ctx.moveTo(p.x - p.size * 0.65, p.y - p.size * 0.9);
        ctx.lineTo(p.x, p.y - p.size * 0.2);
        ctx.moveTo(p.x + p.size * 0.65, p.y - p.size * 0.9);
        ctx.lineTo(p.x, p.y - p.size * 0.2);
        ctx.stroke();

        // Stamped letter (p vs q) in bold high-contrast circle inside parachute
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(p.x, p.y - p.size * 1.25, p.size * 0.325, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        
        ctx.fillStyle = '#1a1a14';
        ctx.font = 'bold ' + Math.floor(p.size * 0.55) + 'px "Lilita One", sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(p.letter, p.x, p.y - p.size * 1.25 + p.size * 0.04);
      }

      // 2. Draw cute tiny flailing character
      // Head
      ctx.fillStyle = '#fff4dc';
      ctx.beginPath();
      ctx.arc(p.x, p.y - p.size * 0.15, p.size * 0.2, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      
      // Face indicator (tiny specs)
      ctx.fillStyle = '#1a1a14';
      ctx.fillRect(p.x - p.size * 0.075, p.y - p.size * 0.2, p.size * 0.05, p.size * 0.05);
      ctx.fillRect(p.x + p.size * 0.025, p.y - p.size * 0.2, p.size * 0.05, p.size * 0.05);

      // Torso / Suit
      ctx.fillStyle = colorOn() ? (isBad ? '#ff5c7c' : '#5cd97a') : '#9aa6ba';
      ctx.fillRect(p.x - p.size * 0.15, p.y + p.size * 0.05, p.size * 0.3, p.size * 0.4);
      ctx.strokeRect(p.x - p.size * 0.15, p.y + p.size * 0.05, p.size * 0.3, p.size * 0.4);

      // Flailing legs (animated curves)
      ctx.strokeStyle = '#1a1a14';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(p.x - p.size * 0.1, p.y + p.size * 0.45);
      ctx.lineTo(p.x - p.size * 0.2, p.y + p.size * 0.65 + flailY * (p.size / 20));
      ctx.moveTo(p.x + p.size * 0.1, p.y + p.size * 0.45);
      ctx.lineTo(p.x + p.size * 0.2, p.y + p.size * 0.65 - flailY * (p.size / 20));
      ctx.stroke();

      // Arms holding onto parachute strings (surprised hands!)
      ctx.beginPath();
      ctx.moveTo(p.x - p.size * 0.15, p.y + p.size * 0.1);
      ctx.lineTo(p.x - p.size * 0.4, p.y - p.size * 0.1);
      ctx.moveTo(p.x + p.size * 0.15, p.y + p.size * 0.1);
      ctx.lineTo(p.x + p.size * 0.4, p.y - p.size * 0.1);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawRuleBanner() {
    if (state.phase !== 'playing') return;
    
    ctx.save();
    ctx.font = 'bold 14px "Lilita One", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const text = state.activeRule.cue || state.activeRule.desc;
    const translatedText = window.MathArcadeI18n?.t(text) || text;
    const paddingX = 18;
    
    const textWidth = ctx.measureText(translatedText).width;
    const bannerW = Math.min(textWidth + paddingX * 2, W - 32);
    const bannerH = 30;
    const bannerX = W / 2 - bannerW / 2;
    const hudBottom = document.getElementById('hud')?.getBoundingClientRect().bottom || 0;
    const preferredY = H - 92;
    const minY = hudBottom + 12;
    let bannerY = Math.max(minY, preferredY);
    if (bannerY + bannerH > H - 44) bannerY = minY;
    if (bannerY + bannerH > H - 8) {
      ctx.restore();
      return;
    }
    
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.roundRect(bannerX + 2, bannerY + 4, bannerW, bannerH, 10);
    ctx.fill();
    
    // Banner body
    ctx.fillStyle = 'rgba(16, 20, 38, 0.94)';
    ctx.strokeStyle = '#fff4dc';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 10);
    ctx.fill(); ctx.stroke();
    
    // Banner text
    ctx.fillStyle = '#ffffd0';
    ctx.fillText(text, W / 2, bannerY + bannerH / 2 + 1, bannerW - paddingX * 2);
    
    ctx.restore();
  }

  function drawLevelClearBanner() {
    if (state.phase !== 'level_clear') return;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const bannerW = Math.min(420, W - 32);
    const bannerH = 78;
    const bannerX = W / 2 - bannerW / 2;
    const bannerY = Math.max(92, H * 0.22);

    ctx.fillStyle = 'rgba(16, 20, 38, 0.94)';
    ctx.strokeStyle = '#fff4dc';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffd24d';
    ctx.strokeStyle = '#1a1a14';
    ctx.lineWidth = 4;
    ctx.font = 'bold 32px "Lilita One", sans-serif';
    ctx.strokeText('LEVEL CLEAR', W / 2, bannerY + 30);
    ctx.fillText('LEVEL CLEAR', W / 2, bannerY + 30);

    ctx.fillStyle = '#fff4dc';
    ctx.font = '600 15px "Fredoka", sans-serif';
    ctx.fillText('Next briefing incoming', W / 2, bannerY + 56);
    ctx.restore();
  }

  function drawParticles() {
    ctx.save();
    for (const p of state.particles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawFloaters() {
    ctx.save();
    for (const f of state.floaters) {
      const t = f.t / f.dur;
      const a = clamp(1 - t, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = f.color;
      ctx.strokeStyle = '#1a1a14';
      ctx.lineWidth = 3;
      ctx.font = 'bold 16px "Lilita One", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
  }

  // Smooth lerp helper
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // ===== Main Loop =====
  let lastTime = performance.now();
  function loop(now) {
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.1) dt = 0.1;

    // Resilience: one bad frame should never kill the whole game loop.
    try { update(dt); draw(); }
    catch (err) { console.error('Paratroopers loop error:', err); }
    requestAnimationFrame(loop);
  }

  // Setup DOM Event Listeners for Overlays
  document.getElementById('start-btn').addEventListener('click', startGame);
  document.getElementById('rule-btn').addEventListener('click', commenceLevel);
  document.getElementById('restart-btn').addEventListener('click', startGame);

  // ===== Tweaks panel (gear) + hub edit-mode protocol =====
  function setupTweaks() {
    const wire = (rowId, key, isToggle) => {
      const row = document.getElementById(rowId);
      if (!row) return;
      const current = () => (isToggle ? (colorOn() ? 'on' : 'off') : String(TWEAKS[key]));
      row.querySelectorAll('.opt').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.value === current());
        opt.addEventListener('click', () => {
          TWEAKS[key] = isToggle ? (opt.dataset.value === 'on') : opt.dataset.value;
          const now = current();
          row.querySelectorAll('.opt').forEach(o => o.classList.toggle('active', o.dataset.value === now));
          persistTweaks();
        });
      });
    };
    wire('pace-row', 'pace', false);
    wire('color-row', 'colorCues', true);
    wire('theme-row', 'theme', false);
    const gear = document.getElementById('gear-btn');
    const close = document.getElementById('tweaks-close');
    gear?.addEventListener('click', () => {
      const open = document.getElementById('tweaks').classList.contains('open');
      if (open) { hideTweaks(); notifyDismiss(); } else showTweaks();
    });
    close?.addEventListener('click', () => { hideTweaks(); notifyDismiss(); });
  }
  function persistTweaks() { try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { ...TWEAKS } }, '*'); } catch (e) {} }
  function notifyDismiss() { try { window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*'); } catch (e) {} }
  function showTweaks() { document.getElementById('tweaks')?.classList.add('open'); }
  function hideTweaks() { document.getElementById('tweaks')?.classList.remove('open'); }
  window.addEventListener('message', (e) => {
    const d = e.data; if (!d || typeof d !== 'object') return;
    if (d.type === '__activate_edit_mode') showTweaks();
    if (d.type === '__deactivate_edit_mode') hideTweaks();
  });
  setupTweaks();
  try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch (e) {}

  // Initialize
  document.getElementById('title-legend').innerHTML = buildLegend(LEVEL_DATA[0]);
  updateHUD();
  requestAnimationFrame(loop);
})();
