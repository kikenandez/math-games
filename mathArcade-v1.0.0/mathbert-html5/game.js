// =====================================================================
// MATH*BERT
// Hop a pyramid. Up = +1, Down = −1. Bring every orange puzzle tile to 0.
// "?" enemies wander and bump tile values around.
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

  // ===== Pyramid layout =====
  const ROWS = 7;
  function getMetrics() {
    const availW = W - 80;
    const availH = H - 280;
    // Each tile is a diamond width w, height w/2. Sides extend the tile down by sideH.
    // Total pyramid width = w * (ROWS + 1). Total pyramid height = h * ROWS + sideH * ROWS + h.
    const sideRatio = 0.85;
    const wByWidth = availW / (ROWS + 1.5);
    const wByHeight = availH / (ROWS * (0.5 + sideRatio) + 0.5);
    const tileW = Math.max(50, Math.min(90, Math.min(wByWidth, wByHeight)));
    const tileH = tileW * 0.5;
    const sideH = tileH * sideRatio * 2; // visible vertical face height
    const centerX = W / 2;
    const totalH = tileH + ROWS * (tileH * 0.5 + sideH * 0.5);
    const topY = Math.max(120, (H - totalH) / 2 - 20);
    return { tileW, tileH, sideH, centerX, topY };
  }
  function tilePos(r, c) {
    const m = getMetrics();
    const x = m.centerX + (c - r / 2) * m.tileW;
    const y = m.topY + r * (m.tileH * 0.5 + m.sideH * 0.5);
    return { x, y };
  }
  function isValid(r, c) {
    return r >= 0 && r < ROWS && c >= 0 && c <= r;
  }
  // Hop directions. delta = sign applied to the LANDING tile.
  // Descending hops (SE/SW) enter the new tile from its upper-left/upper-right
  // edge — "from up or right" → +1. Ascending hops (NE/NW) enter from below
  // — the opposite side → −1.
  const DIRS = {
    NE: { dr: -1, dc:  0, delta: -1, key: 'NE' },
    NW: { dr: -1, dc: -1, delta: -1, key: 'NW' },
    SE: { dr: +1, dc: +1, delta: +1, key: 'SE' },
    SW: { dr: +1, dc:  0, delta: +1, key: 'SW' },
  };

  // ===== Tweaks =====
  const TWEAKS = /*EDITMODE-BEGIN*/{
    "difficulty": "normal",
    "enemySpeed": 1.0,
    "hints": "on"
  }/*EDITMODE-END*/;

  // ===== State =====
  const state = {
    phase: 'title',
    score: 0,
    best: parseInt(localStorage.getItem('mathbert_best') || '0', 10) || 0,
    lives: 3,
    level: 1,
    tiles: [],       // map { "r,c": { r, c, isPuzzle, value, flashT } }
    player: { r: 0, c: 0, x: 0, y: 0, tx: 0, ty: 0, hopT: 0, facing: 'SE' },
    enemies: [],
    floaters: [],
    particles: [],
    elapsed: 0,
    paused: false,
    deathT: 0, deathReason: null,
    levelClearT: 0,
    enemySpawnT: 0,
    shake: 0, shakeX: 0, shakeY: 0,
    showHints: true,
  };

  const rand = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const key = (r, c) => `${r},${c}`;

  // ===== Level construction =====
  // Math tiles only sit on interior positions (4-direction accessible). The
  // remaining tiles follow classic Q*bert rules — visit them once to clear.
  function buildLevel(n) {
    const tiles = {};
    const range = Math.min(3, 1 + Math.floor((n - 1) / 2));
    // Find interior tiles: r in [1, ROWS-2], c in [1, r-1]. These have all
    // four hop directions reachable, so the +1/−1 rule makes sense.
    const interiorCoords = [];
    for (let r = 1; r <= ROWS - 2; r++) {
      for (let c = 1; c < r; c++) interiorCoords.push([r, c]);
    }
    const mathCount = clamp(2 + n, 2, interiorCoords.length);
    const shuffled = interiorCoords.slice().sort(() => Math.random() - 0.5);
    const mathSet = new Set(shuffled.slice(0, mathCount).map(([r, c]) => key(r, c)));
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c <= r; c++) {
        const isMath = mathSet.has(key(r, c));
        let v = 0;
        if (isMath) {
          while (v === 0) v = randInt(-range, range);
        }
        tiles[key(r, c)] = {
          r, c,
          isMath,
          value: v, originalValue: v,
          visits: 0,
          flashT: 0,
        };
      }
    }
    return tiles;
  }

  function tilesArray() {
    return Object.values(state.tiles);
  }
  function mathTiles() {
    return tilesArray().filter(t => t.isMath);
  }
  function isLevelCleared() {
    return tilesArray().every(t => t.visits > 0 && (!t.isMath || t.value === 0));
  }

  // ===== Player & enemy spawn =====
  function startLevel() {
    state.tiles = buildLevel(state.level);
    // Place player at the apex — counts as visit #1 for that tile.
    state.player.r = 0; state.player.c = 0;
    const p = tilePos(0, 0);
    state.player.x = p.x; state.player.y = p.y;
    state.player.tx = p.x; state.player.ty = p.y;
    state.player.hopT = 0;
    state.tiles[key(0, 0)].visits = 1;
    state.enemies = [];
    state.floaters = []; state.particles = [];
    state.deathT = 0; state.levelClearT = 0;
    state.enemySpawnT = 2.5;
    updateHUD();
    updateBottom();
  }
  function spawnBall() {
    // Red balls appear at the apex and tumble down via SE/SW.
    const p = tilePos(0, 0);
    state.enemies.push({
      type: 'ball',
      r: 0, c: 0,
      x: p.x, y: p.y,
      tx: p.x, ty: p.y,
      hopT: 0, hopDur: 0.4,
      cooldown: rand(0.3, 0.5),
      falling: false,
      fallT: 0,
      birthT: 0,
    });
  }
  function spawnSnake() {
    // One snake (Coily) at a time. Hatches at apex with a brief egg pause.
    const p = tilePos(0, 0);
    state.enemies.push({
      type: 'snake',
      r: 0, c: 0,
      x: p.x, y: p.y,
      tx: p.x, ty: p.y,
      hopT: 0, hopDur: 0.45,
      cooldown: 1.6,           // hatch delay
      hatched: false,
      birthT: 0,
    });
  }

  // ===== Hop input =====
  function tryHop(dirKey) {
    if (state.phase !== 'playing') return;
    if (state.player.hopT > 0) return;
    if (state.deathT > 0 || state.levelClearT > 0) return;
    const dir = DIRS[dirKey];
    if (!dir) return;
    const nr = state.player.r + dir.dr;
    const nc = state.player.c + dir.dc;
    if (!isValid(nr, nc)) {
      state.shake = Math.min(0.2, state.shake + 0.1);
      return;
    }
    state.player.startX = state.player.x;
    state.player.startY = state.player.y;
    state.player.r = nr;
    state.player.c = nc;
    const p = tilePos(nr, nc);
    state.player.tx = p.x;
    state.player.ty = p.y;
    state.player.hopT = 0.001;
    state.player.hopDur = 0.22;
    state.player.lastDelta = dir.delta;
    state.player.facing = dir.key;
  }

  window.addEventListener('keydown', (e) => {
    if (state.phase === 'title' || state.phase === 'game_over') {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startGame(); return; }
    }
    if (e.key === 'p' || e.key === 'P') { e.preventDefault(); togglePause(); return; }
    if (state.phase !== 'playing') return;
    if (e.key === 'ArrowUp'    || e.key === 'w' || e.key === 'W') { e.preventDefault(); tryHop('NE'); return; }
    if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') { e.preventDefault(); tryHop('NW'); return; }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { e.preventDefault(); tryHop('SE'); return; }
    if (e.key === 'ArrowDown'  || e.key === 's' || e.key === 'S') { e.preventDefault(); tryHop('SW'); return; }
  });
  const mc = (id, dirKey) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', () => tryHop(dirKey));
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); tryHop(dirKey); }, { passive: false });
  };
  mc('mc-ne', 'NE'); mc('mc-nw', 'NW'); mc('mc-se', 'SE'); mc('mc-sw', 'SW');
  if ('ontouchstart' in window) document.getElementById('mobile-controls').classList.add('show');

  // ===== Main loop =====
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

    // Player hop
    if (state.player.hopT > 0) {
      state.player.hopT += dt;
      const t = Math.min(1, state.player.hopT / state.player.hopDur);
      const e = easeOut(t);
      const p = tilePos(state.player.r, state.player.c);
      // Lerp from previous (frozen) to target
      state.player.x = lerp(state.player.startX ?? state.player.x, p.x, e);
      state.player.y = lerp(state.player.startY ?? state.player.y, p.y, e);
      if (t >= 1) {
        state.player.x = p.x;
        state.player.y = p.y;
        state.player.hopT = 0;
        state.player.startX = state.player.startY = undefined;
        onPlayerLanded();
      }
    } else {
      // Snap to current tile (in case it shifted due to resize)
      const p = tilePos(state.player.r, state.player.c);
      state.player.x = p.x; state.player.y = p.y;
    }

    // Enemies
    state.enemySpawnT -= dt;
    if (state.enemySpawnT <= 0) {
      const ballCount = state.enemies.filter(e => e.type === 'ball').length;
      const snakeCount = state.enemies.filter(e => e.type === 'snake').length;
      const maxBalls = clamp(1 + Math.floor(state.level / 2), 1, 4);
      // After level 2, occasionally spawn a snake. Only one alive at a time.
      if (state.level >= 2 && snakeCount === 0 && Math.random() < 0.25) {
        spawnSnake();
      } else if (ballCount < maxBalls) {
        spawnBall();
      }
      state.enemySpawnT = rand(2.0, 4.0) / TWEAKS.enemySpeed;
    }
    for (const en of state.enemies) updateEnemy(en, dt);
    // Remove enemies marked for cleanup
    state.enemies = state.enemies.filter(e => !e.dead);

    // Check player-enemy collision
    if (state.deathT === 0) {
      for (const en of state.enemies) {
        if (en.falling || en.dead) continue;
        // Enemies are harmless until they've actually started moving — prevents
        // an apex-spawned ball from killing the player who also starts there.
        if (!en.lastDir) continue;
        if (en.r === state.player.r && en.c === state.player.c
            && state.player.hopT === 0 && en.hopT === 0) {
          killPlayer(en.type === 'snake' ? 'snake got you!' : 'squashed by ball!');
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
        else resetPlayer();
      }
    }
    // Level clear timer
    if (state.levelClearT > 0) {
      state.levelClearT -= dt;
      if (state.levelClearT <= 0) {
        state.levelClearT = 0;
        state.level++;
        startLevel();
      }
    }

    // Tile flash decay
    for (const t of tilesArray()) {
      if (t.flashT > 0) t.flashT = Math.max(0, t.flashT - dt);
    }
    // Floaters & particles
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

  function updateEnemy(en, dt) {
    if (en.falling) {
      en.fallT += dt;
      en.y += 240 * dt + en.fallT * 200;
      en.x += (en.fallVX || 0) * dt;
      if (en.y > H + 80) en.dead = true;
      return;
    }
    if (en.hopT > 0) {
      en.hopT += dt;
      const t = Math.min(1, en.hopT / en.hopDur);
      const e = easeOut(t);
      const p = tilePos(en.r, en.c);
      en.x = lerp(en.startX, p.x, e);
      en.y = lerp(en.startY, p.y, e);
      if (t >= 1) {
        en.x = p.x; en.y = p.y;
        en.hopT = 0;
        en.startX = en.startY = undefined;
      }
      return;
    }
    en.cooldown -= dt * TWEAKS.enemySpeed;
    if (en.cooldown > 0) return;

    // Pick next hop based on enemy type.
    let chosen = null;
    if (en.type === 'ball') {
      // Only descending hops. If neither is valid, fall off the pyramid.
      const opts = ['SE', 'SW'].filter(k => {
        const d = DIRS[k];
        return isValid(en.r + d.dr, en.c + d.dc);
      });
      if (opts.length === 0) {
        // Reached the bottom — fall off in the direction of more open space.
        en.falling = true;
        en.fallT = 0;
        en.fallVX = (en.c < en.r / 2 ? -1 : 1) * rand(60, 140);
        return;
      }
      chosen = DIRS[choice(opts)];
    } else if (en.type === 'snake') {
      // Egg pause before chasing
      if (!en.hatched) {
        en.hatched = true;
        en.cooldown = 0.4;
        showFloater(state.tiles[key(en.r, en.c)] || { r:0, c:0 }, 'SSSS!', '#a45cd9');
        return;
      }
      chosen = chooseSnakeDir(en);
    }
    if (!chosen) {
      en.cooldown = 0.5;
      return;
    }
    en.startX = en.x; en.startY = en.y;
    en.r += chosen.dr; en.c += chosen.dc;
    en.lastDir = chosen;
    en.hopT = 0.001;
    en.hopDur = en.type === 'ball'
      ? clamp(0.38 / TWEAKS.enemySpeed, 0.15, 0.7)
      : clamp(0.55 / TWEAKS.enemySpeed, 0.2, 0.9);
    en.cooldown = en.type === 'ball'
      ? rand(0.05, 0.25) / TWEAKS.enemySpeed
      : rand(0.4, 0.7) / TWEAKS.enemySpeed;
  }
  function chooseSnakeDir(snake) {
    const pr = state.player.r, pc = state.player.c;
    const dr = pr - snake.r;
    const dc = pc - snake.c;
    let candidates;
    if (dr > 0) candidates = ['SE', 'SW'];
    else if (dr < 0) candidates = ['NE', 'NW'];
    else candidates = ['SE', 'SW', 'NE', 'NW'];
    let best = null, bestScore = -Infinity;
    for (const k of candidates) {
      const d = DIRS[k];
      const nr = snake.r + d.dr;
      const nc = snake.c + d.dc;
      if (!isValid(nr, nc)) continue;
      const newDr = Math.abs(pr - nr);
      const newDc = Math.abs(pc - nc);
      const score = (Math.abs(dr) - newDr) + (Math.abs(dc) - newDc);
      if (score > bestScore) { bestScore = score; best = d; }
    }
    // Fallback: any valid direction
    if (!best) {
      for (const k of Object.keys(DIRS)) {
        const d = DIRS[k];
        if (isValid(snake.r + d.dr, snake.c + d.dc)) { best = d; break; }
      }
    }
    return best;
  }

  function onPlayerLanded() {
    const t = state.tiles[key(state.player.r, state.player.c)];
    if (!t) return;
    const delta = state.player.lastDelta;
    const wasFreshTile = t.visits === 0;
    t.visits += 1;
    t.flashT = 0.5;
    if (t.isMath) {
      const prev = t.value;
      t.value = clamp(t.value + delta, -9, 9);
      const becameZero = prev !== 0 && t.value === 0;
      const wasZero    = prev === 0 && t.value !== 0;
      if (becameZero) {
        state.score += 50;
        showFloater(t, `+50  BALANCED`, '#5cd97a');
        burst(state.player.x, state.player.y, '#5cd97a');
      } else if (wasZero) {
        showFloater(t, 'UNBALANCED', '#ff5c7c');
        state.shake = Math.min(0.3, state.shake + 0.15);
      } else if (wasFreshTile) {
        state.score += 10;
        showFloater(t, delta > 0 ? '+1  NEW' : '−1  NEW', delta > 0 ? '#5cd97a' : '#ff5c7c');
      } else {
        showFloater(t, delta > 0 ? '+1' : '−1', delta > 0 ? '#5cd97a' : '#ff5c7c');
      }
    } else if (wasFreshTile) {
      // Standard Q*bert: first visit flips the tile and scores.
      state.score += 25;
      showFloater(t, '+25', '#a8e0ff');
      burst(state.player.x, state.player.y, '#a8e0ff');
    }
    if (isLevelCleared()) {
      state.score += 200 + state.level * 50;
      showFloaterCenter(`LEVEL ${state.level} CLEAR  +${200 + state.level * 50}`, '#ffd24d');
      state.levelClearT = 1.6;
      for (let i = 0; i < 60; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = rand(200, 420);
        state.particles.push({
          x: W / 2, y: H / 2,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 100,
          life: rand(0.8, 1.5), maxLife: 1.5,
          size: rand(4, 9),
          color: choice(['#5cd97a', '#ffd24d', '#ff8a3d', '#a8e0ff', '#fff']),
        });
      }
    }
    updateHUD();
    updateBottom();
  }
  function killPlayer(reason) {
    state.lives--;
    state.deathT = 1.0;
    state.deathReason = reason;
    state.shake = Math.min(0.8, state.shake + 0.5);
    showFloaterCenter(reason, '#ff5c7c');
    explode(state.player.x, state.player.y, '#ffd24d');
    updateHUD();
  }
  function resetPlayer() {
    state.player.r = 0; state.player.c = 0;
    const p = tilePos(0, 0);
    state.player.x = p.x; state.player.y = p.y;
    state.player.hopT = 0;
    // Clear all enemies on death — fresh start each life.
    state.enemies = [];
    state.enemySpawnT = 2.0;
    // Keep the apex marked as visited.
    if (state.tiles[key(0,0)] && state.tiles[key(0,0)].visits === 0) {
      state.tiles[key(0,0)].visits = 1;
    }
  }
  function burst(x, y, color) {
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rand(140, 260);
      state.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80,
        life: rand(0.5, 0.9), maxLife: 0.9, size: rand(4, 8),
        color: choice([color, '#fff', '#ffd24d']),
      });
    }
  }
  function explode(x, y, color) {
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rand(120, 320);
      state.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80,
        life: rand(0.5, 0.9), maxLife: 0.9, size: rand(4, 8),
        color: choice([color, '#fff', '#ff8a3d']),
      });
    }
  }
  function showFloater(tile, text, color) {
    const p = tilePos(tile.r, tile.c);
    state.floaters.push({ x: p.x, y: p.y - 24, text, color, t: 0, dur: 1.0, big: false });
  }
  function showFloaterCenter(text, color) {
    state.floaters.push({ x: W / 2, y: H * 0.4, text, color, t: 0, dur: 1.4, big: true });
  }

  // ===== HUD =====
  function updateHUD() {
    document.getElementById('score').textContent = state.score;
    document.getElementById('lives').textContent = '♥'.repeat(state.lives);
    document.getElementById('level').textContent = state.level;
  }
  function updateBottom() {
    const wrap = document.getElementById('bottom-eq');
    const txt = document.getElementById('bottom-eq-text');
    const sub = wrap ? wrap.querySelector('.small') : null;
    if (!wrap || !txt) return;
    const all = tilesArray();
    const math = all.filter(t => t.isMath);
    const balanced = math.filter(t => t.value === 0 && t.visits > 0).length;
    const visited  = all.filter(t => t.visits > 0).length;
    const total = all.length;
    if (balanced === math.length && visited === total) {
      wrap.classList.add('cleared');
      txt.innerHTML = 'ALL CLEAR — LEVEL COMPLETE';
      if (sub) sub.textContent = `level ${state.level} clear`;
      return;
    }
    wrap.classList.remove('cleared');
    txt.innerHTML = `Math <span class="accent">${balanced}/${math.length}</span> &nbsp;·&nbsp; Tiles <span class="ok">${visited}/${total}</span>`;
    if (sub) sub.textContent = `↘ ↙ down +1  ·  ↖ ↗ up −1  ·  visit every tile`;
  }

  // ===== Drawing =====
  function draw() {
    ctx.save();
    ctx.translate(state.shakeX, state.shakeY);
    drawBackdrop();
    drawPyramid();
    drawActors();
    drawParticles();
    drawFloaters();
    if (state.paused) drawPaused();
    ctx.restore();
  }
  function drawBackdrop() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1a1530');
    g.addColorStop(0.6, '#241b40');
    g.addColorStop(1, '#1a1530');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // Stars
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    const seed = 12345;
    for (let i = 0; i < 60; i++) {
      const sx = (i * 9973 + seed) % W;
      const sy = (i * 7919 + seed * 3) % (H * 0.7);
      const tw = (Math.sin(state.elapsed * 1.5 + i * 0.6) + 1) * 0.5;
      ctx.globalAlpha = 0.25 + tw * 0.45;
      ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.globalAlpha = 1;
  }
  function drawPyramid() {
    const m = getMetrics();
    // Draw rows back-to-front so closer tiles overlap correctly
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c <= r; c++) {
        drawTile(state.tiles[key(r, c)], m);
      }
    }
  }
  function drawTile(t, m) {
    if (!t) return;
    const { x, y } = tilePos(t.r, t.c);
    const hw = m.tileW / 2;
    const hh = m.tileH / 2;
    const sideH = m.sideH;
    // Tile colors:
    //   Math tile balanced (visited + value=0) → green
    //   Math tile (visited or not), non-zero → orange
    //   Standard tile visited → teal
    //   Standard tile unvisited → muted purple
    let topColor, leftColor, rightColor;
    if (t.isMath) {
      if (t.visits > 0 && t.value === 0) {
        topColor = '#5cd97a'; leftColor = '#2e8a3e'; rightColor = '#1c5a2a';
      } else {
        topColor = '#ff8a3d'; leftColor = '#c25618'; rightColor = '#8a3812';
      }
    } else if (t.visits > 0) {
      topColor = '#5cc7d4'; leftColor = '#2e7780'; rightColor = '#1c4a55';
    } else {
      topColor = '#8a83b0'; leftColor = '#5a5478'; rightColor = '#3e3858';
    }
    // Flash overlay
    let flashAlpha = 0;
    if (t.flashT > 0) flashAlpha = t.flashT / 0.6;
    // Sides
    // Left face
    ctx.beginPath();
    ctx.moveTo(x - hw, y);
    ctx.lineTo(x, y + hh);
    ctx.lineTo(x, y + hh + sideH);
    ctx.lineTo(x - hw, y + sideH);
    ctx.closePath();
    ctx.fillStyle = leftColor; ctx.fill();
    ctx.strokeStyle = '#1c1530'; ctx.lineWidth = 2; ctx.stroke();
    // Right face
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x + hw, y);
    ctx.lineTo(x + hw, y + sideH);
    ctx.lineTo(x, y + hh + sideH);
    ctx.closePath();
    ctx.fillStyle = rightColor; ctx.fill();
    ctx.stroke();
    // Top face
    ctx.beginPath();
    ctx.moveTo(x, y - hh);
    ctx.lineTo(x + hw, y);
    ctx.lineTo(x, y + hh);
    ctx.lineTo(x - hw, y);
    ctx.closePath();
    ctx.fillStyle = topColor; ctx.fill();
    ctx.stroke();
    // Flash
    if (flashAlpha > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha * 0.6})`;
      ctx.fill();
    }
    // Value label — only on math tiles.
    if (t.isMath) {
      const txt = t.value === 0 ? '0' : (t.value > 0 ? `+${t.value}` : `${t.value}`);
      ctx.font = `bold ${Math.round(m.tileW * 0.4)}px "Lilita One", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#1c1530';
      ctx.strokeText(txt, x, y + 2);
      ctx.fillStyle = '#fff';
      ctx.fillText(txt, x, y + 2);
      // Pulse ring hint
      if (state.showHints && t.value !== 0) {
        const pulse = (Math.sin(state.elapsed * 3 + t.r * 0.7 + t.c * 0.9) + 1) * 0.5;
        ctx.save();
        ctx.globalAlpha = 0.25 + pulse * 0.25;
        ctx.strokeStyle = t.value > 0 ? '#ff5c7c' : '#5cd97a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x, y - hh + 3);
        ctx.lineTo(x + hw - 3, y);
        ctx.lineTo(x, y + hh - 3);
        ctx.lineTo(x - hw + 3, y);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }
      // Visit-count dots above the tile
      if (t.visits > 0) {
        const dotR = Math.max(2, m.tileW * 0.045);
        const shown = Math.min(t.visits, 3);
        const spacing = dotR * 2.6;
        const startX = x - ((shown - 1) * spacing) / 2;
        for (let i = 0; i < shown; i++) {
          ctx.fillStyle = '#fff';
          ctx.strokeStyle = '#1c1530';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(startX + i * spacing, y - hh - dotR * 1.6, dotR, 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();
        }
      }
    }
  }
  function drawActors() {
    const actors = [];
    actors.push({ kind: 'player', r: state.player.r, c: state.player.c, x: state.player.x, y: state.player.y });
    for (const en of state.enemies) {
      actors.push({
        kind: 'enemy',
        type: en.type,
        r: en.r, c: en.c, x: en.x, y: en.y,
        hopT: en.hopT, hopDur: en.hopDur,
        falling: en.falling,
        hatched: en.hatched,
      });
    }
    actors.sort((a, b) => a.r - b.r || a.c - b.c);
    for (const a of actors) {
      if (a.kind === 'player') drawPlayer(a.x, a.y);
      else if (a.type === 'ball') drawBall(a.x, a.y, a.hopT, a.hopDur, a.falling);
      else if (a.type === 'snake') drawSnake(a.x, a.y, a.hopT, a.hopDur, a.hatched);
    }
  }
  function drawPlayer(x, y) {
    const m = getMetrics();
    const size = m.tileW * 0.4;
    let arc = 0;
    if (state.player.hopT > 0) {
      const t = state.player.hopT / state.player.hopDur;
      arc = -Math.sin(t * Math.PI) * size * 0.8;
    }
    let deathScale = 1, deathAlpha = 1;
    if (state.deathT > 0) {
      const d = 1 - (state.deathT / 1.0);
      deathScale = 1 + d * 0.5; deathAlpha = 1 - d * 0.8;
    }
    ctx.save();
    ctx.translate(x, y + arc - size * 0.4);
    ctx.scale(deathScale, deathScale);
    ctx.globalAlpha = deathAlpha;
    // Shadow on tile
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, size * 0.55 - arc * 0.2, size * 0.55, size * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body
    ctx.fillStyle = '#ffd24d';
    ctx.strokeStyle = '#1c1530'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.55, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Eyes
    const eyeR = size * 0.16;
    const eyeY = -size * 0.1;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-size * 0.22, eyeY, eyeR, 0, Math.PI * 2);
    ctx.arc(size * 0.22, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fill();
    // Pupils — face direction
    let pdx = 0, pdy = 0;
    const f = state.player.facing;
    if (f === 'NE') { pdx = eyeR * 0.4; pdy = -eyeR * 0.3; }
    else if (f === 'NW') { pdx = -eyeR * 0.4; pdy = -eyeR * 0.3; }
    else if (f === 'SE') { pdx = eyeR * 0.4; pdy = eyeR * 0.3; }
    else if (f === 'SW') { pdx = -eyeR * 0.4; pdy = eyeR * 0.3; }
    ctx.fillStyle = '#1c1530';
    ctx.beginPath();
    ctx.arc(-size * 0.22 + pdx, eyeY + pdy, eyeR * 0.5, 0, Math.PI * 2);
    ctx.arc(size * 0.22 + pdx, eyeY + pdy, eyeR * 0.5, 0, Math.PI * 2);
    ctx.fill();
    // Small snoot/nose
    ctx.fillStyle = '#ff8a3d';
    ctx.beginPath();
    ctx.ellipse(0, size * 0.18, size * 0.22, size * 0.15, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function drawBall(x, y, hopT, hopDur, falling) {
    const m = getMetrics();
    const size = m.tileW * 0.32;
    let arc = 0;
    if (hopT > 0 && hopDur > 0) {
      const t = hopT / hopDur;
      arc = -Math.sin(t * Math.PI) * size * 0.7;
    }
    ctx.save();
    ctx.translate(x, y + arc - size * 0.35);
    if (!falling) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(0, size * 0.55 - arc * 0.2, size * 0.55, size * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Red ball
    ctx.fillStyle = '#e2434b';
    ctx.strokeStyle = '#1c1530'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Spots
    ctx.fillStyle = '#8a1f24';
    ctx.beginPath();
    ctx.arc(-size * 0.35, -size * 0.1, size * 0.18, 0, Math.PI * 2);
    ctx.arc(size * 0.3, size * 0.15, size * 0.15, 0, Math.PI * 2);
    ctx.arc(0, -size * 0.45, size * 0.12, 0, Math.PI * 2);
    ctx.fill();
    // Highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.arc(-size * 0.28, -size * 0.28, size * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function drawSnake(x, y, hopT, hopDur, hatched) {
    const m = getMetrics();
    const size = m.tileW * 0.38;
    let arc = 0;
    if (hopT > 0 && hopDur > 0) {
      const t = hopT / hopDur;
      arc = -Math.sin(t * Math.PI) * size * 0.8;
    }
    ctx.save();
    ctx.translate(x, y + arc - size * 0.4);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, size * 0.55 - arc * 0.2, size * 0.55, size * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!hatched) {
      // Egg form
      ctx.fillStyle = '#e5d6b8';
      ctx.strokeStyle = '#1c1530'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.55, size * 0.7, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      // Crack lines
      ctx.strokeStyle = '#7a3a1a'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-size * 0.2, -size * 0.1);
      ctx.lineTo(-size * 0.05, size * 0.05);
      ctx.lineTo(-size * 0.15, size * 0.18);
      ctx.lineTo(size * 0.05, size * 0.25);
      ctx.stroke();
      ctx.restore();
      return;
    }
    // Snake body coil
    ctx.fillStyle = '#a45cd9';
    ctx.strokeStyle = '#1c1530'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, size * 0.2, size * 0.55, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Belly
    ctx.fillStyle = '#d4a8ef';
    ctx.beginPath();
    ctx.ellipse(0, size * 0.32, size * 0.35, size * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head
    ctx.fillStyle = '#a45cd9';
    ctx.strokeStyle = '#1c1530'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.25, size * 0.45, size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-size * 0.18, -size * 0.3, size * 0.12, 0, Math.PI * 2);
    ctx.arc(size * 0.18, -size * 0.3, size * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1c1530';
    ctx.beginPath();
    ctx.arc(-size * 0.18, -size * 0.28, size * 0.06, 0, Math.PI * 2);
    ctx.arc(size * 0.18, -size * 0.28, size * 0.06, 0, Math.PI * 2);
    ctx.fill();
    // Tongue
    ctx.strokeStyle = '#ff5c7c'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.05);
    ctx.lineTo(0, size * 0.05);
    ctx.lineTo(-size * 0.08, size * 0.13);
    ctx.moveTo(0, size * 0.05);
    ctx.lineTo(size * 0.08, size * 0.13);
    ctx.stroke();
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
      ctx.font = f.big ? 'bold 44px "Lilita One", sans-serif' : 'bold 20px "Lilita One", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = f.big ? 5 : 3;
      ctx.strokeStyle = '#1c1530';
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
    ctx.lineWidth = 6; ctx.strokeStyle = '#1c1530';
    ctx.strokeText('PAUSED', W / 2, H / 2);
    ctx.fillStyle = '#f4f0d8'; ctx.fillText('PAUSED', W / 2, H / 2);
  }

  // ===== Game flow =====
  function startGame() {
    state.phase = 'playing';
    state.score = 0; state.lives = 3; state.level = 1;
    startLevel();
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
      localStorage.setItem('mathbert_best', String(state.best));
    }
    const overlay = document.getElementById('overlay');
    overlay.querySelector('.card').remove();
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h1><span class="acc">GAME</span> OVER</h1>
      <div class="sub">the pyramid wins this round</div>
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

  // ===== Tweaks panel =====
  function setupTweaks() {
    const diffRow = document.getElementById('diff-row');
    diffRow.querySelectorAll('.opt').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.value === TWEAKS.difficulty);
      opt.addEventListener('click', () => {
        TWEAKS.difficulty = opt.dataset.value;
        diffRow.querySelectorAll('.opt').forEach(o => o.classList.toggle('active', o.dataset.value === TWEAKS.difficulty));
        if (TWEAKS.difficulty === 'easy') TWEAKS.enemySpeed = 0.6;
        else if (TWEAKS.difficulty === 'normal') TWEAKS.enemySpeed = 1.0;
        else TWEAKS.enemySpeed = 1.5;
        document.getElementById('enemy-speed').value = TWEAKS.enemySpeed;
        document.getElementById('enemy-val').textContent = `${TWEAKS.enemySpeed.toFixed(1)}×`;
        persistTweaks();
      });
    });
    const hintRow = document.getElementById('hint-row');
    hintRow.querySelectorAll('.opt').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.value === TWEAKS.hints);
      opt.addEventListener('click', () => {
        TWEAKS.hints = opt.dataset.value;
        state.showHints = TWEAKS.hints === 'on';
        hintRow.querySelectorAll('.opt').forEach(o => o.classList.toggle('active', o.dataset.value === TWEAKS.hints));
        persistTweaks();
      });
    });
    state.showHints = TWEAKS.hints === 'on';
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

  // ===== Boot =====
  state.tiles = buildLevel(1);
  state.tiles[key(0, 0)].visits = 1;
  const ap = tilePos(0, 0);
  state.player.x = ap.x; state.player.y = ap.y;
  updateHUD();
  updateBottom();
  requestAnimationFrame(loop);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      lastTime = performance.now() - 16;
      requestAnimationFrame(loop);
    }
  });
})();
