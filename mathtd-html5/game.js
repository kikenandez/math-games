// =====================================================================
// MATH TOWER DEFENSE
// Bubbles travel a long serpentine path with three sequential redirect
// gates. At each gate the player picks TOP / MID / BOT; the bubble locks
// in that branch the moment it crosses the gate cell. Operator towers
// reduce the bubble's value once per path cell they cover — straight
// stretches yield 1 hit, inside corners 2, inside U-turns 3. Anything
// arriving non-zero costs base HP.
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

  const COLS = 16, ROWS = 17;
  function getMetrics() {
    const availW = W - 80;
    const availH = H - 200;
    const cell = Math.max(28, Math.min(72, Math.min(availW / COLS, availH / ROWS)));
    const gridW = cell * COLS;
    const gridH = cell * ROWS;
    const x0 = (W - gridW) / 2;
    const y0 = Math.max(92, (H - gridH) / 2 - 10);
    return { cell, gridW, gridH, x0, y0 };
  }
  function cellCenter(c, r) {
    const m = getMetrics();
    return { x: m.x0 + (c + 0.5) * m.cell, y: m.y0 + (r + 0.5) * m.cell };
  }

  // ===== Path data =====
  // Three sequential redirect gates. Buffer rows (5 and 11) separate the
  // fork zones; connectors hug the outer columns (15 and 1) so no two
  // unrelated path cells share an edge — the only adjacencies between
  // different path segments are the deliberate gate / merge transitions.
  const ENTRY_PATH = [[0,2],[1,2],[2,2],[3,2]];
  const FORK1_BRANCHES = [
    // TOP1 — up to row 0, across, back down (13 cells)
    [[3,1],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],[9,0],[10,0],[11,0],[12,0],[13,0],[13,1]],
    // MID1 — straight at row 2 (9 cells)
    [[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[10,2],[11,2],[12,2]],
    // BOT1 — down to row 4, across, back up (13 cells)
    [[3,3],[3,4],[4,4],[5,4],[6,4],[7,4],[8,4],[9,4],[10,4],[11,4],[12,4],[13,4],[13,3]],
  ];
  // CONNECTOR1: M1=[13,2] runs right and down the col-15 edge to G2=[13,8].
  // Routing through col 15 keeps it one cell clear of every fork-1 and
  // fork-2 branch cell along the way.
  const CONNECTOR1 = [[13,2],[14,2],[15,2],[15,3],[15,4],[15,5],[15,6],[15,7],[15,8],[14,8],[13,8]];
  const FORK2_BRANCHES = [
    // TOP2 — mirror of fork 1 going right-to-left at row 6 (13 cells)
    [[13,7],[13,6],[12,6],[11,6],[10,6],[9,6],[8,6],[7,6],[6,6],[5,6],[4,6],[3,6],[3,7]],
    // MID2 — straight at row 8 going right-to-left (9 cells)
    [[12,8],[11,8],[10,8],[9,8],[8,8],[7,8],[6,8],[5,8],[4,8]],
    // BOT2 — down to row 10 (13 cells)
    [[13,9],[13,10],[12,10],[11,10],[10,10],[9,10],[8,10],[7,10],[6,10],[5,10],[4,10],[3,10],[3,9]],
  ];
  // CONNECTOR2: M2=[3,8] runs left and down the col-1 edge to G3=[3,14].
  const CONNECTOR2 = [[3,8],[2,8],[1,8],[1,9],[1,10],[1,11],[1,12],[1,13],[1,14],[2,14],[3,14]];
  const FORK3_BRANCHES = [
    // TOP3 — up at row 12 (13 cells)
    [[3,13],[3,12],[4,12],[5,12],[6,12],[7,12],[8,12],[9,12],[10,12],[11,12],[12,12],[13,12],[13,13]],
    // MID3 — straight at row 14 (9 cells)
    [[4,14],[5,14],[6,14],[7,14],[8,14],[9,14],[10,14],[11,14],[12,14]],
    // BOT3 — down to row 16 (13 cells)
    [[3,15],[3,16],[4,16],[5,16],[6,16],[7,16],[8,16],[9,16],[10,16],[11,16],[12,16],[13,16],[13,15]],
  ];
  // Final stretch from M3 to the base
  const EXIT_PATH = [[13,14],[14,14],[15,14]];

  const FORK_BRANCHES = [FORK1_BRANCHES, FORK2_BRANCHES, FORK3_BRANCHES];
  const CONNECTORS = [CONNECTOR1, CONNECTOR2];
  const GATES = [[3,2], [13,8], [3,14]];
  const BRANCH_LABELS = ['TOP','MID','BOT'];
  const SELECTOR_CELLS = FORK_BRANCHES.map(fork => fork.map(branch => branch[0]));

  // Cells any branch could traverse — no towers can be placed here.
  const PATH_SET = new Set();
  function addCells(arr) { for (const [c,r] of arr) PATH_SET.add(`${c},${r}`); }
  addCells(ENTRY_PATH);
  for (const fork of FORK_BRANCHES) for (const branch of fork) addCells(branch);
  for (const conn of CONNECTORS) addCells(conn);
  addCells(EXIT_PATH);

  // Per-level bonus rule. A bubble that arrives at the base validating the
  // current level's rule pays out a small gold bonus AND restores 1 HP
  // (capped at 20). Cycles through the table as the player levels up.
  const LEVEL_RULES = [
    { label: '= −1',       test: v => v === -1 },
    { label: '5 < v < 7',  test: v => v > 5 && v < 7 },
    { label: '= −3',       test: v => v === -3 },
    { label: '9 < v < 11', test: v => v > 9 && v < 11 },
    { label: 'v < −3',     test: v => v < -3 },
    { label: '= 1',        test: v => v === 1 },
    { label: '3 < v < 5',  test: v => v > 3 && v < 5 },
    { label: '= −7',       test: v => v === -7 },
    { label: 'v > 15',     test: v => v > 15 },
  ];
  function currentRule() {
    return LEVEL_RULES[(state.level - 1) % LEVEL_RULES.length];
  }

  // Tower types — deterministic per-cell rule: each tower fires once per
  // (enemy, path cell in range). Range 1.0 with orthogonal coverage means
  // 1 hit on a straight stretch, 2 at an inside corner, 3 inside a U-turn.
  const TOWER_TYPES = [
    { id: 'sub1', op: '−1', delta: -1, divide: false, range: 1.0, cost: 25,  color: '#5cd9ff' },
    { id: 'sub3', op: '−3', delta: -3, divide: false, range: 1.0, cost: 60,  color: '#5cd97a' },
    { id: 'half', op: '÷2', delta: null, divide: 2,    range: 1.0, cost: 90,  color: '#ffd24d' },
    { id: 'sub5', op: '−5', delta: -5, divide: false, range: 1.0, cost: 130, color: '#e36ce0' },
  ];

  // ===== State =====
  const state = {
    phase: 'title',
    score: 0,
    best: parseInt(localStorage.getItem('mathtd_best') || '0', 10) || 0,
    level: 1,
    wave: 1,
    wavesPerLevel: 5,
    inWave: false,
    waveSpawnQueue: [],
    waveSpawnTimer: 0,
    hp: 20,
    gold: 100,
    selectedTower: 'sub1',
    // One selection per gate. Default to MID everywhere (the fastest path).
    selectedBranches: [1, 1, 1],
    nextTowerId: 1,
    enemies: [],
    nextEnemyId: 1,
    towers: [],
    floaters: [],
    particles: [],
    beams: [],
    paused: false,
    elapsed: 0,
    mouse: { x: 0, y: 0, valid: false, col: -1, row: -1 },
    shake: 0, shakeX: 0, shakeY: 0,
    speedMultiplier: 1.0,
  };

  const rand = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function hexToRgba(hex, a) {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  // ===== Wave generation =====
  function generateWave(level, wave) {
    const total = 6 + wave + level * 2;
    const baseMax = Math.min(28, 6 + level * 3 + wave);
    const arr = [];
    for (let i = 0; i < total; i++) {
      const easy = i < 2 && wave === 1;
      const v = easy ? randInt(2, Math.max(3, Math.floor(baseMax / 3))) : randInt(3, baseMax);
      arr.push(v);
    }
    if (wave >= 5) arr.push(baseMax * 2 + level * 2);
    return arr;
  }

  function spawnEnemy(value) {
    state.enemies.push({
      id: state.nextEnemyId++,
      progress: 0,
      value,
      maxValue: value,
      alive: true,
      hitT: 0,
      branchIndices: [null, null, null],
      hitByCells: new Map(),
    });
  }

  // ===== Game flow =====
  function startGame() {
    state.phase = 'playing';
    state.level = 1;
    state.wave = 1;
    state.hp = 20;
    state.gold = 100;
    state.score = 0;
    state.enemies = [];
    state.towers = [];
    state.inWave = false;
    state.waveSpawnQueue = [];
    state.selectedBranches = [1, 1, 1];
    updateHUD();
    updateWaveBtn();
    document.getElementById('overlay').classList.add('hidden');
  }

  function startWave() {
    if (state.inWave) return;
    state.waveSpawnQueue = generateWave(state.level, state.wave);
    state.waveSpawnTimer = 1.0;
    state.inWave = true;
    updateWaveBtn();
  }

  function endWave() {
    state.inWave = false;
    const bonus = 30 + state.wave * 10 + state.level * 5;
    state.gold += bonus;
    state.score += bonus * 5;
    if (state.wave >= state.wavesPerLevel) {
      const lvlBonus = 100 + state.level * 50;
      state.gold += lvlBonus;
      state.score += lvlBonus * 10;
      const oldLevel = state.level;
      state.level++;
      state.wave = 1;
      showStackedBanner(
        `LEVEL ${oldLevel} CLEAR`,
        [`WAVE 5  +${bonus}g`, `LEVEL UP  +${lvlBonus}g`, `NEW RULE  ${currentRule().label}`],
        '#5cd97a'
      );
      flashHUD('level');
      flashHUD('wave');
      flashHUD('rule');
    } else {
      state.wave++;
      showFloaterCenter(`WAVE CLEAR  +${bonus}g`, '#ffd24d');
      flashHUD('wave');
    }
    updateHUD();
    updateWaveBtn();
  }

  function makeStatChip(label, value, hi) {
    const chip = document.createElement('div');
    chip.className = 'stat-chip' + (hi ? ' hi' : '');
    const l = document.createElement('div');
    l.className = 'stat-label';
    l.textContent = label;
    const v = document.createElement('div');
    v.className = 'stat-val';
    v.textContent = String(value);
    chip.appendChild(l); chip.appendChild(v);
    return chip;
  }

  function gameOver(reason) {
    state.phase = 'game_over';
    if (state.score > state.best) {
      state.best = state.score;
      localStorage.setItem('mathtd_best', String(state.best));
    }
    showFloaterCenter(reason, '#ff5c7c');
    state.shake = Math.min(0.6, state.shake + 0.4);
    const overlay = document.getElementById('overlay');
    const oldCard = overlay.querySelector('.card');
    if (oldCard) oldCard.remove();
    const card = document.createElement('div');
    card.className = 'card';
    const title = document.createElement('h1');
    const acc = document.createElement('span');
    acc.className = 'acc';
    acc.textContent = 'BASE';
    title.appendChild(acc);
    title.appendChild(document.createTextNode(' FALLEN'));
    const sub = document.createElement('div');
    sub.className = 'sub';
    sub.textContent = reason;
    const statsRow = document.createElement('div');
    statsRow.className = 'stats-row';
    statsRow.appendChild(makeStatChip('Score', state.score, false));
    statsRow.appendChild(makeStatChip('Level', state.level, false));
    statsRow.appendChild(makeStatChip('Wave', state.wave, false));
    statsRow.appendChild(makeStatChip('Best', state.best, true));
    const restartBtn = document.createElement('button');
    restartBtn.className = 'big-btn';
    restartBtn.id = 'restart-btn';
    restartBtn.textContent = 'DEFEND AGAIN';
    restartBtn.addEventListener('click', startGame);
    card.appendChild(title);
    card.appendChild(sub);
    card.appendChild(statsRow);
    card.appendChild(restartBtn);
    overlay.appendChild(card);
    overlay.classList.remove('hidden');
  }
  document.getElementById('start-btn').addEventListener('click', startGame);
  document.getElementById('wave-btn').addEventListener('click', startWave);
  const speedBtn = document.getElementById('speed-btn');
  if (speedBtn) {
    const startFast = (e) => {
      if (e) e.preventDefault();
      if (!state.inWave) return;
      state.speedMultiplier = 3.0;
      speedBtn.classList.add('active');
    };
    const stopFast = (e) => {
      if (e) e.preventDefault();
      state.speedMultiplier = 1.0;
      speedBtn.classList.remove('active');
    };
    speedBtn.addEventListener('mousedown', startFast);
    speedBtn.addEventListener('mouseup', stopFast);
    speedBtn.addEventListener('mouseleave', stopFast);
    speedBtn.addEventListener('touchstart', startFast, { passive: false });
    speedBtn.addEventListener('touchend', stopFast, { passive: false });
    speedBtn.addEventListener('touchcancel', stopFast, { passive: false });
  }

  // ===== Input =====
  canvas.addEventListener('mousemove', (e) => updateMouse(e.clientX, e.clientY));
  canvas.addEventListener('mouseleave', () => { state.mouse.valid = false; });
  canvas.addEventListener('mousedown', (e) => { updateMouse(e.clientX, e.clientY); tryPlace(); });
  canvas.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    updateMouse(t.clientX, t.clientY); tryPlace();
    e.preventDefault();
  }, { passive: false });

  function updateMouse(x, y) {
    state.mouse.x = x;
    state.mouse.y = y;
    const m = getMetrics();
    const c = Math.floor((x - m.x0) / m.cell);
    const r = Math.floor((y - m.y0) / m.cell);
    if (c >= 0 && c < COLS && r >= 0 && r < ROWS && !PATH_SET.has(`${c},${r}`) && !state.towers.some(t => t.c === c && t.r === r)) {
      state.mouse.valid = true; state.mouse.col = c; state.mouse.row = r;
    } else {
      state.mouse.valid = false; state.mouse.col = c; state.mouse.row = r;
    }
  }
  function tryPlace() {
    if (state.phase !== 'playing') return;
    // 9 selector hotspots — first cell of each branch (3 per gate). Clicking
    // one redirects that gate; subsequent bubbles take that branch.
    for (let f = 0; f < 3; f++) {
      for (let b = 0; b < 3; b++) {
        const [sc, sr] = SELECTOR_CELLS[f][b];
        if (state.mouse.col === sc && state.mouse.row === sr) {
          if (state.selectedBranches[f] !== b) {
            state.selectedBranches[f] = b;
            const gp = cellCenter(GATES[f][0], GATES[f][1]);
            showFloaterAt(gp.x, gp.y - 30, `G${f+1} ${BRANCH_LABELS[b]}`, '#ffd24d');
          }
          return;
        }
      }
    }
    if (state.inWave) {
      state.shake = Math.min(0.3, state.shake + 0.15);
      showFloater(state.mouse.col, state.mouse.row, 'ONLY BETWEEN WAVES!', '#ff5c7c');
      return;
    }
    if (!state.mouse.valid) return;
    const tt = TOWER_TYPES.find(t => t.id === state.selectedTower);
    if (!tt || state.gold < tt.cost) {
      state.shake = Math.min(0.3, state.shake + 0.15);
      showFloater(state.mouse.col, state.mouse.row, 'NEED GOLD!', '#ff5c7c');
      return;
    }
    state.gold -= tt.cost;
    state.towers.push({
      id: state.nextTowerId++,
      c: state.mouse.col, r: state.mouse.row,
      type: tt,
      pulse: 0,
    });
    updateHUD();
  }
  window.addEventListener('keydown', (e) => {
    if (state.phase === 'title' || state.phase === 'game_over') {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startGame(); return; }
    }
    if (e.key === 'p' || e.key === 'P') { e.preventDefault(); state.paused = !state.paused; return; }
    if (e.key === ' ') { e.preventDefault(); startWave(); }
    if (e.key === '1') state.selectedTower = 'sub1';
    if (e.key === '2') state.selectedTower = 'sub3';
    if (e.key === '3') state.selectedTower = 'half';
    if (e.key === '4') state.selectedTower = 'sub5';
    if (e.key === 'f' || e.key === 'F') {
      if (state.inWave) {
        state.speedMultiplier = 3.0;
        const btn = document.getElementById('speed-btn');
        if (btn) btn.classList.add('active');
      }
    }
    // Keyboard branch select: Q/W/E for gate 1, A/S/D for gate 2, Z/X/C for gate 3.
    const k = e.key.toLowerCase();
    if (k === 'q') state.selectedBranches[0] = 0;
    else if (k === 'w') state.selectedBranches[0] = 1;
    else if (k === 'e') state.selectedBranches[0] = 2;
    else if (k === 'a') state.selectedBranches[1] = 0;
    else if (k === 's') state.selectedBranches[1] = 1;
    else if (k === 'd') state.selectedBranches[1] = 2;
    else if (k === 'z') state.selectedBranches[2] = 0;
    else if (k === 'x') state.selectedBranches[2] = 1;
    else if (k === 'c') state.selectedBranches[2] = 2;
    renderPicker();
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'f' || e.key === 'F') {
      state.speedMultiplier = 1.0;
      const btn = document.getElementById('speed-btn');
      if (btn) btn.classList.remove('active');
    }
  });

  // ===== Loop =====
  let lastTime = performance.now();
  function loop(now) {
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.1) dt = 0.1;
    if (state.phase === 'playing' && !state.paused) update(dt * state.speedMultiplier);
    else updateIdle(dt);
    draw();
    requestAnimationFrame(loop);
  }
  function updateIdle(dt) { state.elapsed += dt * 0.5; }

  // Build the cell sequence an enemy is currently travelling. Grows
  // segment-by-segment as the enemy commits each gate.
  function enemyCells(e) {
    const out = [...ENTRY_PATH];
    if (e.branchIndices[0] != null) {
      out.push(...FORK1_BRANCHES[e.branchIndices[0]]);
      out.push(...CONNECTOR1);
    }
    if (e.branchIndices[1] != null) {
      out.push(...FORK2_BRANCHES[e.branchIndices[1]]);
      out.push(...CONNECTOR2);
    }
    if (e.branchIndices[2] != null) {
      out.push(...FORK3_BRANCHES[e.branchIndices[2]]);
      out.push(...EXIT_PATH);
    }
    return out;
  }
  function enemyPos(e) {
    const cells = enemyCells(e);
    const p = clamp(e.progress, 0, cells.length - 1);
    const i = Math.floor(p);
    const f = p - i;
    const [c1, r1] = cells[i];
    const [c2, r2] = cells[Math.min(i + 1, cells.length - 1)];
    const a = cellCenter(c1, r1);
    const b = cellCenter(c2, r2);
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  }

  function update(dt) {
    state.elapsed += dt;
    if (state.inWave && state.waveSpawnQueue.length) {
      state.waveSpawnTimer -= dt;
      if (state.waveSpawnTimer <= 0) {
        spawnEnemy(state.waveSpawnQueue.shift());
        state.waveSpawnTimer = rand(2.4, 3.8);
      }
    }
    const speed = 0.8 + state.level * 0.13 + state.wave * 0.04;
    for (const e of state.enemies) {
      if (!e.alive) continue;
      e.progress += speed * dt;
      if (e.hitT > 0) e.hitT -= dt;
      if (e.branchIndices[0] == null && e.progress >= 3) {
        e.branchIndices[0] = state.selectedBranches[0];
      }
      if (e.branchIndices[0] != null && e.branchIndices[1] == null) {
        const g2 = 3 + FORK1_BRANCHES[e.branchIndices[0]].length + CONNECTOR1.length;
        if (e.progress >= g2) e.branchIndices[1] = state.selectedBranches[1];
      }
      if (e.branchIndices[1] != null && e.branchIndices[2] == null) {
        const g3 = 3 + FORK1_BRANCHES[e.branchIndices[0]].length + CONNECTOR1.length
                     + FORK2_BRANCHES[e.branchIndices[1]].length + CONNECTOR2.length;
        if (e.progress >= g3) e.branchIndices[2] = state.selectedBranches[2];
      }
      const cells = enemyCells(e);
      if (e.progress >= cells.length - 1) {
        e.alive = false;
        const rule = currentRule();
        const isPerfect = e.value === 0;
        const isBonus = rule.test(e.value);
        if (isPerfect && isBonus) {
          // Both rewards stack — a single floater communicates the combined payout.
          state.gold += 15;
          state.hp = Math.min(20, state.hp + 1);
          state.score += 200;
          showFloaterCenter(`PERFECT + BONUS  +1♥ +15g`, '#5cd97a');
          flashHUD('rule');
        } else if (isPerfect) {
          state.gold += 10;
          state.score += 50;
          showFloaterCenter(`PERFECT  +10g`, '#5cd97a');
        } else if (isBonus) {
          state.gold += 5;
          state.hp = Math.min(20, state.hp + 1);
          state.score += 100;
          showFloaterCenter(`BONUS  ${rule.label}  +1♥ +5g`, '#ffd24d');
          flashHUD('rule');
        } else {
          // Flat penalty: any bubble that arrives non-zero (and missing the
          // level rule) costs exactly 1 HP, regardless of how far off it is.
          state.hp = Math.max(0, state.hp - 1);
          state.score = Math.max(0, state.score - 5);
          state.shake = Math.min(0.5, state.shake + 0.25);
          showFloaterCenter(`−1 HP  (left ${e.value})`, '#ff5c7c');
          if (state.hp <= 0) { gameOver('base destroyed!'); return; }
        }
        updateHUD();
      }
    }
    // Deterministic per-cell tower hits. Each tower fires once for every
    // path cell within its range that an enemy passes through: a straight
    // stretch = 1 hit, an inside corner = 2, an inside U-turn = 3.
    for (const t of state.towers) {
      t.pulse += dt;
      const trSq = t.type.range * t.type.range + 0.01;
      for (const e of state.enemies) {
        if (!e.alive) continue;
        const cells = enemyCells(e);
        const cellIdx = Math.floor(clamp(e.progress, 0, cells.length - 1));
        const [ec, er] = cells[cellIdx];
        const dc = ec - t.c, dr = er - t.r;
        if (dc * dc + dr * dr > trSq) continue;
        let cellSet = e.hitByCells.get(t.id);
        if (!cellSet) {
          cellSet = new Set();
          e.hitByCells.set(t.id, cellSet);
        }
        if (cellSet.has(cellIdx)) continue;
        cellSet.add(cellIdx);
        let newVal;
        if (t.type.divide) {
          newVal = e.value >= 0
            ? Math.floor(e.value / t.type.divide)
            : -Math.floor(-e.value / t.type.divide);
        } else {
          newVal = e.value + t.type.delta;
        }
        e.value = newVal;
        e.hitT = 0.3;
        const ep = enemyPos(e);
        const tc = cellCenter(t.c, t.r);
        state.beams.push({ fromX: tc.x, fromY: tc.y, toX: ep.x, toY: ep.y, t: 0, dur: 0.25, color: t.type.color });
        showFloaterAt(ep.x, ep.y - 18, t.type.op, t.type.color);
      }
    }
    state.enemies = state.enemies.filter(e => e.alive);
    for (const b of state.beams) b.t += dt;
    state.beams = state.beams.filter(b => b.t < b.dur);
    if (state.inWave && state.waveSpawnQueue.length === 0 && state.enemies.length === 0) {
      endWave();
    }
    for (const f of state.floaters) { f.t += dt; f.y -= 30 * dt; }
    state.floaters = state.floaters.filter(f => f.t < f.dur);
    for (const p of state.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.gravity ?? 200) * dt; p.life -= dt; }
    state.particles = state.particles.filter(p => p.life > 0);
    if (state.shake > 0) {
      state.shake = Math.max(0, state.shake - dt * 3);
      state.shakeX = (Math.random() - 0.5) * state.shake * 12;
      state.shakeY = (Math.random() - 0.5) * state.shake * 12;
    } else { state.shakeX = state.shakeY = 0; }
  }

  function showFloater(c, r, text, color) {
    window.MathArcadeAudio?.event(text);
    const p = cellCenter(c, r);
    showFloaterAt(p.x, p.y, text, color);
  }
  function showFloaterAt(x, y, text, color) {
    state.floaters.push({ x, y, text, color, t: 0, dur: 0.9, big: false });
  }
  function showFloaterCenter(text, color) {
    window.MathArcadeAudio?.event(text);
    state.floaters.push({ x: W / 2, y: H * 0.42, text, color, t: 0, dur: 1.4, big: true });
  }
  function showStackedBanner(title, chips, color) {
    const yTop = H * 0.30;
    state.floaters.push({ x: W / 2, y: yTop, text: title, color, t: 0, dur: 2.0, big: true });
    chips.forEach((label, i) => {
      state.floaters.push({
        x: W / 2, y: yTop + 60 + i * 36,
        text: label, color: i === 0 ? '#ffd24d' : '#5cd97a',
        t: -0.2 - i * 0.15,
        dur: 1.9, big: false,
      });
    });
  }
  function flashHUD(which) {
    const el = document.querySelector(`.badge.${which}`);
    if (!el) return;
    el.style.transition = 'transform 0.18s, box-shadow 0.18s, background-color 0.18s';
    el.style.transform = 'scale(1.15)';
    el.style.backgroundColor = 'rgba(255, 210, 77, 0.45)';
    el.style.boxShadow = '0 4px 0 rgba(0,0,0,0.55), 0 0 0 4px rgba(255, 210, 77, 0.55)';
    setTimeout(() => {
      el.style.transform = '';
      el.style.backgroundColor = '';
      el.style.boxShadow = '';
    }, 900);
  }

  function updateHUD() {
    document.getElementById('hp').textContent = '♥'.repeat(Math.min(20, state.hp));
    document.getElementById('gold').textContent = state.gold;
    document.getElementById('level').textContent = state.level;
    document.getElementById('wave').textContent = `${state.wave}/${state.wavesPerLevel}`;
    const ruleEl = document.getElementById('rule');
    if (ruleEl) ruleEl.textContent = currentRule().label;
  }
  function updateSpeedBtn() {
    const btn = document.getElementById('speed-btn');
    if (!btn) return;
    if (state.inWave) {
      btn.disabled = false;
    } else {
      btn.disabled = true;
      state.speedMultiplier = 1.0;
      btn.classList.remove('active');
    }
  }
  function updateWaveBtn() {
    const btn = document.getElementById('wave-btn');
    if (state.inWave) {
      btn.textContent = `WAVE ${state.wave}…`;
      btn.disabled = true;
    } else {
      btn.textContent = `START WAVE ${state.wave}`;
      btn.disabled = false;
    }
    updateSpeedBtn();
  }
  function renderPicker() {
    const wrap = document.getElementById('picker');
    while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
    for (const t of TOWER_TYPES) {
      const btn = document.createElement('button');
      btn.className = 'tower-btn' + (state.selectedTower === t.id ? ' active' : '');
      const op = document.createElement('span');
      op.className = 'op';
      op.textContent = t.op;
      if (state.selectedTower !== t.id) op.style.color = t.color;
      const cost = document.createElement('span');
      cost.className = 'cost';
      cost.textContent = `${t.cost}g`;
      btn.appendChild(op);
      btn.appendChild(cost);
      btn.addEventListener('click', () => {
        state.selectedTower = t.id;
        renderPicker();
      });
      wrap.appendChild(btn);
    }
  }
  renderPicker();
  updateHUD();
  updateWaveBtn();

  function activePathCells() {
    return [
      ...ENTRY_PATH,
      ...FORK1_BRANCHES[state.selectedBranches[0]],
      ...CONNECTOR1,
      ...FORK2_BRANCHES[state.selectedBranches[1]],
      ...CONNECTOR2,
      ...FORK3_BRANCHES[state.selectedBranches[2]],
      ...EXIT_PATH,
    ];
  }

  // ===== Drawing =====
  function draw() {
    ctx.save();
    ctx.translate(state.shakeX, state.shakeY);
    drawBg();
    drawGrid();
    drawPath();
    drawTowers();
    drawEnemies();
    drawBeams();
    drawHoverPreview();
    drawParticles();
    drawFloaters();
    if (state.paused) drawPaused();
    ctx.restore();
  }
  function drawBg() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#3a7a3a');
    g.addColorStop(0.7, '#5cb85c');
    g.addColorStop(1, '#2e8a3e');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function drawGrid() {
    const m = getMetrics();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(m.x0 - 6, m.y0 - 6, m.gridW + 12, m.gridH + 12);
    ctx.strokeStyle = '#1a1a14'; ctx.lineWidth = 4;
    ctx.strokeRect(m.x0 - 6, m.y0 - 6, m.gridW + 12, m.gridH + 12);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (PATH_SET.has(`${c},${r}`)) continue;
        ctx.fillStyle = ((r + c) % 2 === 0) ? '#4ba14b' : '#3a8a3a';
        ctx.fillRect(m.x0 + c * m.cell, m.y0 + r * m.cell, m.cell, m.cell);
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(m.x0 + c * m.cell + 4, m.y0 + r * m.cell + 4, 2, 2);
      }
    }
  }
  function drawPath() {
    const m = getMetrics();
    // Every path cell shares the same dirt color — no active/inactive shading,
    // so the layout reads as one map. Routing intent is communicated by the
    // gate / selector visuals, not by tinting cells.
    ctx.fillStyle = '#b8884a';
    for (const key of PATH_SET) {
      const [c, r] = key.split(',').map(Number);
      ctx.fillRect(m.x0 + c * m.cell - 1, m.y0 + r * m.cell - 1, m.cell + 2, m.cell + 2);
    }
    // A single dashed centerline still traces the currently-selected route
    // so the player can see the flow direction, without changing cell color.
    const activePath = activePathCells();
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 244, 220, 0.45)';
    ctx.beginPath();
    for (let i = 0; i < activePath.length; i++) {
      const pt = cellCenter(activePath[i][0], activePath[i][1]);
      if (i === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    const sp = cellCenter(ENTRY_PATH[0][0], ENTRY_PATH[0][1]);
    ctx.fillStyle = '#5cd9ff';
    ctx.strokeStyle = '#1a1a14';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sp.x - m.cell * 0.3, sp.y - m.cell * 0.3);
    ctx.lineTo(sp.x - m.cell * 0.45, sp.y);
    ctx.lineTo(sp.x - m.cell * 0.3, sp.y + m.cell * 0.3);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    for (let i = 0; i < 3; i++) drawGate(m, GATES[i], i + 1);
    drawBranchSelectors(m);
    const ep = cellCenter(EXIT_PATH[EXIT_PATH.length - 1][0], EXIT_PATH[EXIT_PATH.length - 1][1]);
    drawBase(ep.x, ep.y, m.cell);
  }
  function drawGate(m, gateCell, num) {
    const p = cellCenter(gateCell[0], gateCell[1]);
    const r = m.cell * 0.34;
    const pulse = (Math.sin(state.elapsed * 3 + num) + 1) * 0.5;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = `rgba(255, 210, 77, ${0.18 + pulse * 0.2})`;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a14';
    ctx.strokeStyle = '#ffd24d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r, 0);
    ctx.lineTo(0, r);
    ctx.lineTo(-r, 0);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd24d';
    ctx.font = `bold ${Math.round(m.cell * 0.36)}px "Lilita One", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(num), 0, 2);
    ctx.restore();
  }
  function drawBranchSelectors(m) {
    for (let f = 0; f < 3; f++) {
      for (let b = 0; b < 3; b++) {
        const [c, r] = SELECTOR_CELLS[f][b];
        const p = cellCenter(c, r);
        const active = b === state.selectedBranches[f];
        const rad = m.cell * 0.34;
        if (active) {
          const pulse = (Math.sin(state.elapsed * 4 + f) + 1) * 0.5;
          ctx.fillStyle = `rgba(92, 217, 122, ${0.25 + pulse * 0.25})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, rad * 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
        const hovered = !active && state.mouse.col === c && state.mouse.row === r;
        ctx.fillStyle = active ? '#5cd97a' : (hovered ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.45)');
        ctx.strokeStyle = active ? '#1a1a14' : '#fff4dc';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = active ? '#1a1a14' : '#fff4dc';
        ctx.font = `bold ${Math.round(m.cell * 0.26)}px "Lilita One", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(BRANCH_LABELS[b], p.x, p.y + 1);
      }
    }
  }
  function drawBase(cx, cy, cell) {
    const w = cell * 0.95, h = cell * 0.9;
    const towerW = w * 0.24;
    const centerW = w * 0.58;
    const castleY = cy + h * 0.1; // lower a tiny bit to make room for flag

    ctx.save();
    ctx.strokeStyle = '#1a1a14';
    ctx.lineWidth = 2.5;

    // 0. Soft drop shadow under the castle
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(cx, castleY + h * 0.45, w * 0.55, h * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // 1. Draw Left and Right Side Towers (grey brick color)
    ctx.fillStyle = '#b0b8c4'; // slate blue-grey
    // Left tower rect
    const ltX = cx - w / 2;
    const ltY = castleY - h * 0.4;
    ctx.fillRect(ltX, ltY, towerW, h * 0.8);
    ctx.strokeRect(ltX, ltY, towerW, h * 0.8);
    // Right tower rect
    const rtX = cx + w / 2 - towerW;
    const rtY = castleY - h * 0.4;
    ctx.fillRect(rtX, rtY, towerW, h * 0.8);
    ctx.strokeRect(rtX, rtY, towerW, h * 0.8);

    // Conical roofs for side towers (vibrant magenta-red)
    ctx.fillStyle = '#ff5c7c';
    // Left roof
    ctx.beginPath();
    ctx.moveTo(ltX - 3, ltY);
    ctx.lineTo(ltX + towerW / 2, ltY - h * 0.35);
    ctx.lineTo(ltX + towerW + 3, ltY);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Right roof
    ctx.beginPath();
    ctx.moveTo(rtX - 3, rtY);
    ctx.lineTo(rtX + towerW / 2, rtY - h * 0.35);
    ctx.lineTo(rtX + towerW + 3, rtY);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // 2. Draw Center Gatehouse connecting the towers
    ctx.fillStyle = '#9aa4b3'; // slightly darker slate
    const gwX = cx - centerW / 2;
    const gwY = castleY - h * 0.2;
    const gwH = h * 0.6;
    ctx.fillRect(gwX, gwY, centerW, gwH);
    ctx.strokeRect(gwX, gwY, centerW, gwH);

    // Center crenellations (battlements)
    ctx.fillStyle = '#9aa4b3';
    const numCrenels = 3;
    const crenelW = centerW / (numCrenels * 2 - 1);
    const crenelH = h * 0.12;
    for (let i = 0; i < numCrenels; i++) {
      const bx = gwX + i * crenelW * 2;
      ctx.fillRect(bx, gwY - crenelH, crenelW, crenelH);
      ctx.strokeRect(bx, gwY - crenelH, crenelW, crenelH);
    }

    // 3. Draw Gate (wooden arched door)
    ctx.fillStyle = '#5a3a18';
    const gateW = centerW * 0.44;
    const gateH = gwH * 0.65;
    const gateX = cx - gateW / 2;
    const gateY = castleY + h * 0.4 - gateH;
    ctx.beginPath();
    ctx.moveTo(gateX, gateY + gateH);
    ctx.lineTo(gateX, gateY + gateH * 0.3);
    ctx.quadraticCurveTo(cx, gateY - 4, gateX + gateW, gateY + gateH * 0.3);
    ctx.lineTo(gateX + gateW, gateY + gateH);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Wooden plank vertical lines inside gate
    ctx.strokeStyle = 'rgba(26, 26, 20, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - gateW * 0.16, gateY + 5);
    ctx.lineTo(cx - gateW * 0.16, gateY + gateH);
    ctx.moveTo(cx + gateW * 0.16, gateY + 5);
    ctx.lineTo(cx + gateW * 0.16, gateY + gateH);
    ctx.stroke();

    // 4. Draw Stone Brick Details (adds premium hand-drawn feel)
    ctx.strokeStyle = 'rgba(26, 26, 20, 0.22)';
    ctx.lineWidth = 2;
    // Helper to draw random small bricks
    const drawBrick = (bx, by, bw, bh) => {
      ctx.strokeRect(bx, by, bw, bh);
    };
    drawBrick(ltX + 3, ltY + h * 0.2, towerW - 6, h * 0.12);
    drawBrick(rtX + 3, rtY + h * 0.4, towerW - 6, h * 0.12);
    drawBrick(gwX + 6, gwY + h * 0.1, centerW * 0.3, h * 0.1);
    drawBrick(cx + 6, gwY + h * 0.3, centerW * 0.3, h * 0.1);

    // 5. Draw Flagpole and Flag
    ctx.strokeStyle = '#1a1a14';
    ctx.lineWidth = 2.5;
    const poleYTop = gwY - crenelH - h * 0.38;
    ctx.beginPath();
    ctx.moveTo(cx, gwY);
    ctx.lineTo(cx, poleYTop);
    ctx.stroke();

    // Cute waving triangular flag (hot pink)
    ctx.fillStyle = '#ff5c7c';
    ctx.beginPath();
    ctx.moveTo(cx, poleYTop);
    ctx.lineTo(cx + w * 0.32, poleYTop + h * 0.1);
    ctx.lineTo(cx, poleYTop + h * 0.2);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    ctx.restore();
  }
  function drawTowers() {
    const m = getMetrics();
    for (const t of state.towers) {
      const p = cellCenter(t.c, t.r);
      ctx.fillStyle = '#3a3a4a';
      ctx.strokeStyle = '#1a1a14';
      ctx.lineWidth = 2;
      const w = m.cell * 0.66;
      ctx.fillRect(p.x - w / 2, p.y - w / 2, w, w);
      ctx.strokeRect(p.x - w / 2, p.y - w / 2, w, w);
      ctx.fillStyle = t.type.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, w * 0.36, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      const pulse = (Math.sin(t.pulse * 4) + 1) * 0.5;
      ctx.strokeStyle = t.type.color;
      ctx.globalAlpha = 0.2 + pulse * 0.15;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, t.type.range * m.cell, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#1a1a14';
      ctx.lineWidth = 3;
      ctx.font = `bold ${Math.round(w * 0.38)}px "Lilita One", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeText(t.type.op, p.x, p.y + 1);
      ctx.fillText(t.type.op, p.x, p.y + 1);
    }
  }
  function drawEnemies() {
    const m = getMetrics();
    for (const e of state.enemies) {
      if (!e.alive) continue;
      const p = enemyPos(e);
      const size = m.cell * 0.42;

      // 1. Soft drop shadow under the bubble
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + size * 0.6, size * 0.5, size * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Glossy 3D radial gradient bubble sphere
      const lerp01 = Math.max(0, Math.min(1, 1 - Math.abs(e.value) / Math.max(1, e.maxValue)));
      const r = Math.round(226 + (92 - 226) * lerp01);
      const g = Math.round(67 + (217 - 67) * lerp01);
      const b = Math.round(75 + (122 - 75) * lerp01);

      const rg = ctx.createRadialGradient(p.x - size * 0.3, p.y - size * 0.3, size * 0.05, p.x, p.y, size);
      rg.addColorStop(0, `rgb(${Math.min(255, r + 45)},${Math.min(255, g + 45)},${Math.min(255, b + 45)})`);
      rg.addColorStop(0.75, `rgb(${r},${g},${b})`);
      rg.addColorStop(1, `rgb(${Math.max(0, r - 55)},${Math.max(0, g - 55)},${Math.max(0, b - 55)})`);

      ctx.fillStyle = rg;
      ctx.strokeStyle = '#1a1a14';
      ctx.lineWidth = 2.5;
      const hitScale = e.hitT > 0 ? 1 + e.hitT * 0.5 : 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * hitScale, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      // 3. Pixar-style glossy highlight at top-left
      ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
      ctx.beginPath();
      ctx.ellipse(p.x - size * 0.35 * hitScale, p.y - size * 0.35 * hitScale, size * 0.25 * hitScale, size * 0.12 * hitScale, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();

      // 4. Cute blushing cheeks
      ctx.fillStyle = 'rgba(255, 120, 130, 0.48)';
      ctx.beginPath();
      ctx.arc(p.x - size * 0.42 * hitScale, p.y + size * 0.1 * hitScale, size * 0.1 * hitScale, 0, Math.PI * 2);
      ctx.arc(p.x + size * 0.42 * hitScale, p.y + size * 0.1 * hitScale, size * 0.1 * hitScale, 0, Math.PI * 2);
      ctx.fill();

      // 5. Expressive cute white eyeballs
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(p.x - size * 0.25 * hitScale, p.y - size * 0.05 * hitScale, size * 0.18 * hitScale, 0, Math.PI * 2);
      ctx.arc(p.x + size * 0.25 * hitScale, p.y - size * 0.05 * hitScale, size * 0.18 * hitScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1a1a14';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(p.x - size * 0.25 * hitScale, p.y - size * 0.05 * hitScale, size * 0.18 * hitScale, 0, Math.PI * 2);
      ctx.arc(p.x + size * 0.25 * hitScale, p.y - size * 0.05 * hitScale, size * 0.18 * hitScale, 0, Math.PI * 2);
      ctx.stroke();

      // 6. Pupils with cute shines
      ctx.fillStyle = '#1a1a14';
      ctx.beginPath();
      ctx.arc(p.x - size * 0.23 * hitScale, p.y - size * 0.03 * hitScale, size * 0.08 * hitScale, 0, Math.PI * 2);
      ctx.arc(p.x + size * 0.27 * hitScale, p.y - size * 0.03 * hitScale, size * 0.08 * hitScale, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(p.x - size * 0.26 * hitScale, p.y - size * 0.06 * hitScale, size * 0.035 * hitScale, 0, Math.PI * 2);
      ctx.arc(p.x + size * 0.24 * hitScale, p.y - size * 0.06 * hitScale, size * 0.035 * hitScale, 0, Math.PI * 2);
      ctx.fill();

      // 7. Sweet open smiling mouth
      ctx.strokeStyle = '#1a1a14';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(p.x, p.y + size * 0.14 * hitScale, size * 0.18 * hitScale, 0.08 * Math.PI, 0.92 * Math.PI);
      ctx.stroke();

      // 8. Cute hanging wooden value banner
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#1a1a14';
      ctx.lineWidth = 2;
      const txt = String(e.value);
      ctx.font = `bold ${Math.round(size * 0.55)}px "Lilita One", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(txt).width;
      const chipW = tw + 10, chipH = size * 0.55;
      roundRect(p.x - chipW / 2, p.y + size * 0.52 * hitScale, chipW, chipH, 4);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1a1a14';
      ctx.fillText(txt, p.x, p.y + size * 0.52 * hitScale + chipH / 2 + 1);
    }
  }
  function drawBeams() {
    for (const b of state.beams) {
      const t = b.t / b.dur;
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 4 - t * 2;
      ctx.beginPath();
      ctx.moveTo(b.fromX, b.fromY);
      ctx.lineTo(b.toX, b.toY);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  function drawHoverPreview() {
    if (state.phase !== 'playing') return;
    const m = getMetrics();
    const c = state.mouse.col, r = state.mouse.row;
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
    const tt = TOWER_TYPES.find(t => t.id === state.selectedTower);
    if (!tt) return;
    const p = cellCenter(c, r);
    const valid = state.mouse.valid && state.gold >= tt.cost && !state.inWave;
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = valid ? tt.color : '#ff5c7c';
    ctx.fillRect(m.x0 + c * m.cell, m.y0 + r * m.cell, m.cell, m.cell);
    ctx.globalAlpha = 1;
    if (valid) {
      ctx.strokeStyle = tt.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, tt.range * m.cell, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // Classify every path cell this tower would cover into two buckets:
      // ACTIVE  — cells on the route bubbles take with the CURRENT selectors;
      // ALT     — cells on a branch the player has not selected at some gate
      //           (the tower would still hit those bubbles if that gate is
      //           switched). Each bucket is painted in a distinct color so
      //           the secondary impact is visible at a glance.
      const activeSet = new Set();
      for (const [pc, pr] of activePathCells()) activeSet.add(`${pc},${pr}`);
      const activeCovered = [];
      const altCovered = [];
      const trSq = tt.range * tt.range + 0.01;
      for (const key of PATH_SET) {
        const [pc, pr] = key.split(',').map(Number);
        const dc = pc - c, dr = pr - r;
        if (dc * dc + dr * dr > trSq) continue;
        if (activeSet.has(key)) activeCovered.push([pc, pr]);
        else altCovered.push([pc, pr]);
      }
      const tintActive = hexToRgba(tt.color, 0.42);
      const tintAlt = 'rgba(120, 120, 132, 0.30)';
      ctx.font = `bold ${Math.round(m.cell * 0.46)}px "Lilita One", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Active cells — tower-color fill, white operator
      for (const [pc, pr] of activeCovered) {
        ctx.fillStyle = tintActive;
        ctx.fillRect(m.x0 + pc * m.cell + 2, m.y0 + pr * m.cell + 2, m.cell - 4, m.cell - 4);
        const center = cellCenter(pc, pr);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#1a1a14';
        ctx.strokeText(tt.op, center.x, center.y + 1);
        ctx.fillStyle = '#fff4dc';
        ctx.fillText(tt.op, center.x, center.y + 1);
      }
      // Alt cells — neutral fill, operator drawn in the tower's color so the
      // secondary impact is clearly distinguishable from the primary one.
      for (const [pc, pr] of altCovered) {
        ctx.fillStyle = tintAlt;
        ctx.fillRect(m.x0 + pc * m.cell + 2, m.y0 + pr * m.cell + 2, m.cell - 4, m.cell - 4);
        const center = cellCenter(pc, pr);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#1a1a14';
        ctx.strokeText(tt.op, center.x, center.y + 1);
        ctx.fillStyle = tt.color;
        ctx.fillText(tt.op, center.x, center.y + 1);
      }
      if (activeCovered.length > 0 || altCovered.length > 0) {
        ctx.font = `bold ${Math.round(m.cell * 0.36)}px "Lilita One", sans-serif`;
        const label = altCovered.length > 0
          ? `×${activeCovered.length}  (+${altCovered.length} alt)`
          : `×${activeCovered.length}`;
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#1a1a14';
        ctx.strokeText(label, p.x, p.y - m.cell * 0.7);
        ctx.fillStyle = '#fff';
        ctx.fillText(label, p.x, p.y - m.cell * 0.7);
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
      ctx.font = f.big ? 'bold 44px "Lilita One", sans-serif' : 'bold 22px "Lilita One", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = f.big ? 5 : 3;
      ctx.strokeStyle = '#1a1a14';
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
    ctx.lineWidth = 6; ctx.strokeStyle = '#1a1a14';
    ctx.strokeText('PAUSED', W / 2, H / 2);
    ctx.fillStyle = '#fff4dc'; ctx.fillText('PAUSED', W / 2, H / 2);
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

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) lastTime = performance.now() - 16;
  });
  requestAnimationFrame(loop);
})();
