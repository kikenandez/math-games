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
    { type: 'para', shoot: 'p', save: 'q', desc: 'Shoot ONLY "p" paratroopers! Save "q".' },
    { type: 'para', shoot: 'q', save: 'p', desc: 'Shoot ONLY "q" paratroopers! Save "p".' },
    { type: 'heli', shoot: 'b', save: 'd', desc: 'Shoot ONLY "b" helicopters! Save "d".' },
    { type: 'heli', shoot: 'd', save: 'b', desc: 'Shoot ONLY "d" helicopters! Save "b".' },
    { type: 'both', shootPara: 'p', shootHeli: 'b', savePara: 'q', saveHeli: 'd', desc: 'Shoot "p" paratroopers & "b" helicopters!' },
    { type: 'both', shootPara: 'q', shootHeli: 'd', savePara: 'p', saveHeli: 'b', desc: 'Shoot "q" paratroopers & "d" helicopters!' }
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
      maxSpawns: 12
    },
    
    elapsed: 0,
    keys: {},
    mouse: { x: 0, y: 0 }
  };

  const rand = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

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
    state.phase = 'briefing';
    state.lasers = [];
    state.helicopters = [];
    state.paratroopers = [];
    state.particles = [];
    state.floaters = [];
    
    // Level rule select
    const ruleIdx = (state.level - 1) % LEVEL_DATA.length;
    state.activeRule = LEVEL_DATA[ruleIdx];
    
    // Adjust spawners for difficulty
    state.spawners.clearedSpawns = 0;
    state.spawners.maxSpawns = 8 + state.level * 4;
    state.spawners.heliInterval = Math.max(1.8, 3.8 - state.level * 0.25);
    state.spawners.heliTimer = 0.5; // Quick spawn first heli
    
    // Truck positioning resets
    state.trucks.left = { x: -80, targetX: 60, status: 'driving_in', doorsOpen: 0, passengers: 0, speed: 120 };
    state.trucks.right = { x: W + 80, targetX: W - 140, status: 'driving_in', doorsOpen: 0, passengers: 0, speed: 120 };
    
    // Update overlays
    document.getElementById('rule-level-num').textContent = state.level;
    document.getElementById('rule-text').innerHTML = `⚡ ${state.activeRule.desc} ⚡`;
    document.getElementById('overlay-rule').classList.remove('hidden');
    
    updateHUD();
  }

  function commenceLevel() {
    document.getElementById('overlay-rule').classList.add('hidden');
    state.phase = 'playing';
    updateHUD();
  }

  function fireTurret() {
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

  function spawnHelicopter() {
    if (state.spawners.clearedSpawns >= state.spawners.maxSpawns) return;
    state.spawners.clearedSpawns++;

    const side = Math.random() < 0.5 ? 'left' : 'right';
    const x = side === 'left' ? -60 : W + 60;
    const vx = side === 'left' ? rand(80, 140) : -rand(80, 140);
    const y = rand(40, H * 0.22);
    
    // letter select b vs d
    const letter = Math.random() < 0.5 ? 'b' : 'd';
    
    state.helicopters.push({
      id: state.spawners.clearedSpawns,
      x,
      y,
      vx,
      vy: 0,
      letter,
      active: true,
      rotorAngle: 0,
      dropTimer: rand(1.5, 3.5),
      size: 38
    });
  }

  function checkLevelClear() {
    if (state.phase !== 'playing') return;
    
    // Check if all spawns are triggered AND no shootable threats remain in the sky
    const activeThreats = state.helicopters.some(h => h.active) || 
                          state.paratroopers.some(p => p.status === 'drift' || p.status === 'plunge');
                          
    if (state.spawners.clearedSpawns >= state.spawners.maxSpawns && !activeThreats) {
      
      // Auto-rescue any currently running paratroopers so the player gets their points immediately
      for (const p of state.paratroopers) {
        if (p.status === 'running') {
          state.score += 20;
          showFloaterAt(p.x, p.y - 25, `RESCUE +20!`, '#5cd97a');
          const targetTruck = p.x < W / 2 ? state.trucks.left : state.trucks.right;
          if (targetTruck.passengers < 4) targetTruck.passengers++;
        }
      }
      state.paratroopers = []; // Clear them so they don't linger
      
      state.phase = 'level_clear';
      
      // Cheering sound
      window.MathArcadeAudio?.event('LEVEL CLEAR');
      
      // Rescue trucks drive away
      state.trucks.left.status = 'driving_out';
      state.trucks.right.status = 'driving_out';
      
      setTimeout(() => {
        state.level++;
        setupLevelBriefing();
      }, 2500);
    }
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

    if (state.phase === 'playing') {
      // 1. Spawners updates
      state.spawners.heliTimer -= dt;
      if (state.spawners.heliTimer <= 0) {
        spawnHelicopter();
        state.spawners.heliTimer = state.spawners.heliInterval;
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
      if (state.phase === 'playing') {
        h.dropTimer -= dt;
        if (h.dropTimer <= 0 && h.x > 80 && h.x < W - 80) {
          h.dropTimer = rand(3.0, 5.0);
          
          // Drop paratrooper carrying p vs q
          const letter = Math.random() < 0.5 ? 'p' : 'q';
          state.paratroopers.push({
            x: h.x,
            y: h.y + h.size * 0.4,
            vy: 42, // slow drift speed
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
    state.helicopters = state.helicopters.filter(h => h.vx > 0 ? h.x < W + 80 : h.x > -80);
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
          p.vy = 280; // fast plunge
          
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
    
    // Determine if bad vs good
    let isBad = false;
    if (state.activeRule.type === 'heli') {
      isBad = h.letter === state.activeRule.shoot;
    } else if (state.activeRule.type === 'both') {
      isBad = h.letter === state.activeRule.shootHeli;
    }
    
    if (isBad) {
      state.score += 50;
      showFloaterAt(h.x, h.y - 25, `BOOM +50!`, '#5cd97a');
      window.MathArcadeAudio?.event('SOLVED');
    } else {
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

  function destroyParatrooper(p) {
    p.alive = false;
    
    let isBad = false;
    if (state.activeRule.type === 'para') {
      isBad = p.letter === state.activeRule.shoot;
    } else if (state.activeRule.type === 'both') {
      isBad = p.letter === state.activeRule.shootPara;
    }
    
    if (isBad) {
      state.score += 10;
      showFloaterAt(p.x, p.y - 25, `HIT +10`, '#5cd97a');
      window.MathArcadeAudio?.event('SOLVED');
    } else {
      state.score = Math.max(0, state.score - 15);
      state.lives--;
      showFloaterAt(p.x, p.y - 25, `FRIENDLY FIRE! −1♥ −15`, '#ff5c7c');
      window.MathArcadeAudio?.event('DEATH');
      
      if (state.lives <= 0) {
        handleGameOver('Shot down friendly paratroopers!');
        return;
      }
    }
    
    updateHUD();
    
    // Particle burst
    triggerExplosion(p.x, p.y, p.letter === 'p' ? '#ff5c7c' : '#ffd24d');
    
    // Check level clear
    checkLevelClear();
  }

  function landParatrooper(p) {
    p.vy = 0;
    
    // Determine if bad vs good
    let isBad = false;
    if (state.activeRule.type === 'para') {
      isBad = p.letter === state.activeRule.shoot;
    } else if (state.activeRule.type === 'both') {
      isBad = p.letter === state.activeRule.shootPara;
    }
    
    if (isBad) {
      // Bad paratrooper landed — joins stack!
      p.status = 'landed';
      p.alive = false;
      
      // Determine side
      if (p.x < W / 2) {
        state.leftPile.push(p);
        p.x = state.turret.x - state.turret.baseRadius - 10 - state.leftPile.length * 12;
      } else {
        state.rightPile.push(p);
        p.x = state.turret.x + state.turret.baseRadius + 10 + state.rightPile.length * 12;
      }
      
      p.y = H - 32 - 12;
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
    
    checkLevelClear();
  }

  function crashParatrooper(p) {
    p.alive = false;
    
    // Particle splat
    for (let i = 0; i < 10; i++) {
      state.particles.push({
        x: p.x,
        y: H - 32,
        vx: rand(-60, 60),
        vy: -rand(30, 80),
        color: '#b0b8c4',
        size: rand(2.5, 4.5),
        life: rand(0.3, 0.5),
        maxLife: 0.5,
        gravity: 120
      });
    }
    
    showFloaterAt(p.x, H - 55, 'CRASH!', '#ff5c7c');
    window.MathArcadeAudio?.event('DEATH');
    checkLevelClear();
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

  function updateHUD() {
    document.getElementById('hp').textContent = '♥'.repeat(Math.max(0, state.lives));
    document.getElementById('score').textContent = state.score;
    document.getElementById('level').textContent = state.level;
    
    const ruleEl = document.getElementById('rule');
    if (state.activeRule) {
      if (state.activeRule.type === 'para') {
        ruleEl.textContent = `SHOOT ${state.activeRule.shoot}`;
      } else if (state.activeRule.type === 'heli') {
        ruleEl.textContent = `SHOOT HELI ${state.activeRule.shoot}`;
      } else {
        ruleEl.textContent = `SHOOT ${state.activeRule.shootPara} & ${state.activeRule.shootHeli}`;
      }
    }
  }

  // ===== Rendering / Drawing =====
  function draw() {
    drawBg();
    drawClouds();
    drawRescueTrucks();
    drawBadPiles();
    drawTurret();
    drawLasers();
    drawHelicopters();
    drawParatroopers();
    drawParticles();
    drawFloaters();
    drawRuleBanner();
  }

  function drawBg() {
    // Premium sky-to-grass cartoon gradient
    const skyG = ctx.createLinearGradient(0, 0, 0, H);
    skyG.addColorStop(0, '#7ad1ff');
    skyG.addColorStop(0.7, '#cfe0ff');
    skyG.addColorStop(0.85, '#cfe0ff');
    skyG.addColorStop(0.85, '#5cb85c');
    skyG.addColorStop(1, '#2e8a3e');
    ctx.fillStyle = skyG;
    ctx.fillRect(0, 0, W, H);
    
    // Draw ground lines
    ctx.strokeStyle = 'rgba(26,26,20,0.12)';
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
    ctx.fillStyle = '#ff5c7c'; // bad paratrooper distinct red suits
    ctx.strokeStyle = '#1a1a14';
    ctx.lineWidth = 2.5;

    // Left stack
    for (let i = 0; i < state.leftPile.length; i++) {
      const p = state.leftPile[i];
      // Draw as small crouched circles stacked vertically
      const py = H - 32 - 6 - i * 10;
      ctx.beginPath();
      ctx.arc(p.x, py, 6, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      
      // draw their tiny letter to show they are bad
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px "Lilita One", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p.letter, p.x, py);
      ctx.fillStyle = '#ff5c7c';
    }

    // Right stack
    for (let i = 0; i < state.rightPile.length; i++) {
      const p = state.rightPile[i];
      const py = H - 32 - 6 - i * 10;
      ctx.beginPath();
      ctx.arc(p.x, py, 6, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px "Lilita One", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p.letter, p.x, py);
      ctx.fillStyle = '#ff5c7c';
    }

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
      
      ctx.fillStyle = isBad ? '#ff5c7c' : '#7ad1ff';
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
      ctx.fillStyle = isBad ? '#d9405c' : '#4fa9d9';
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
        ctx.fillStyle = isBad ? '#ff5c7c' : '#ffd24d';
        
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
      ctx.fillStyle = isBad ? '#ff5c7c' : '#5cd97a';
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
    ctx.font = 'bold 15px "Lilita One", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const text = state.activeRule.desc;
    const paddingX = 24;
    const paddingY = 8;
    
    const textWidth = ctx.measureText(window.MathArcadeI18n?.t(text) || text).width;
    const bannerW = textWidth + paddingX * 2;
    const bannerH = 34;
    const bannerX = W / 2 - bannerW / 2;
    const bannerY = 16;
    
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
    ctx.fillText(text, W / 2, bannerY + bannerH / 2 + 1);
    
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
    
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // Setup DOM Event Listeners for Overlays
  document.getElementById('start-btn').addEventListener('click', startGame);
  document.getElementById('rule-btn').addEventListener('click', commenceLevel);
  document.getElementById('restart-btn').addEventListener('click', startGame);

  // Initialize
  updateHUD();
  requestAnimationFrame(loop);
})();
