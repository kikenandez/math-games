// =====================================================================
// BALANCE SCALE — HTML5 cartoon redesign
// Levels adapted from kikenandez/retroGames balancescale.py
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

  // ---------- Symbols (cute-fruit theme — keys kept for level-data compatibility) ----------
  const SYMBOLS = {
    circle:   { display: 'Apple',      fruit: 'apple',      color: '#e84545', dark: '#8a2c2c' },
    square:   { display: 'Orange',     fruit: 'orange',     color: '#ff9933', dark: '#a8540f' },
    triangle: { display: 'Watermelon', fruit: 'watermelon', color: '#ee6f88', dark: '#7d2638' },
    diamond:  { display: 'Banana',     fruit: 'banana',     color: '#f4c93b', dark: '#a8841c' },
    star:     { display: 'Grapes',     fruit: 'grapes',     color: '#9156c4', dark: '#5a3275' },
  };
  const SYMBOL_ORDER = ['circle', 'square', 'triangle', 'diamond', 'star'];
  const displayName = (sym) => (SYMBOLS[sym] && SYMBOLS[sym].display) || sym;
  const BALANCE_SCENES = [
    'waitress',
    'funambule',
    'shark',
    'bus',
    'detonator',
    'rocket',
    'ufo',
    'cannon',
    'dragon',
  ];

  // ---------- Levels (from balancescale.py) ----------
  const LEVELS = [
    {
      symbols: ['circle'],
      values: { circle: 4 },
      clues: [[[['circle', 2]], 8]],
      hints: [
        'Only one symbol appears here.',
        'Two circles add to 8, so each circle is half of 8.',
        'Answer: circle = 4.',
      ],
    },
    {
      symbols: ['circle', 'square'],
      values: { circle: 4, square: 7 },
      clues: [[[['circle', 2]], 8], [[['circle', 1], ['square', 1]], 11]],
      hints: [
        'Solve the single-symbol clue first.',
        'Once you know circle, plug it into the second clue.',
        'circle = 4, so square = 11 − 4.',
      ],
    },
    {
      symbols: ['triangle', 'square'],
      values: { triangle: 5, square: 8 },
      clues: [[[['triangle', 2]], 10], [[['triangle', 1], ['square', 1]], 13]],
      hints: [
        'Two triangles equal 10.',
        'Use triangle\'s value in the second clue.',
        'triangle = 5, square = 8.',
      ],
    },
    {
      symbols: ['circle', 'square', 'triangle'],
      values: { circle: 3, square: 5, triangle: 7 },
      clues: [
        [[['circle', 2], ['square', 1]], 11],
        [[['square', 1], ['triangle', 1]], 12],
        [[['circle', 1], ['triangle', 1]], 10],
      ],
      hints: [
        'Add all three clues together to learn 2·(c+s+t).',
        'Then subtract individual clues to isolate symbols.',
        'circle = 3, square = 5, triangle = 7.',
      ],
    },
    {
      symbols: ['circle', 'square', 'triangle'],
      values: { circle: 2, square: 6, triangle: 9 },
      clues: [
        [[['circle', 3]], 6],
        [[['circle', 1], ['square', 1]], 8],
        [[['square', 1], ['triangle', 1]], 15],
      ],
      hints: [
        'Start with the clue that uses one symbol only.',
        'Substitute upward through the chain of clues.',
        'circle = 2, then square = 6, then triangle = 9.',
      ],
    },
    {
      symbols: ['circle', 'square', 'diamond'],
      values: { circle: 4, square: 7, diamond: 10 },
      clues: [
        [[['circle', 1], ['square', 1]], 11],
        [[['square', 1], ['diamond', 1]], 17],
        [[['circle', 2], ['diamond', 1]], 18],
      ],
      hints: [
        'Try subtracting one clue from another.',
        'Clue 3 minus 2·clue 1 isolates a single symbol.',
        'circle = 4, square = 7, diamond = 10.',
      ],
    },
    {
      symbols: ['triangle', 'square', 'diamond'],
      values: { triangle: 3, square: 5, diamond: 11 },
      clues: [
        [[['triangle', 2], ['square', 1]], 11],
        [[['square', 2]], 10],
        [[['triangle', 1], ['diamond', 1]], 14],
      ],
      hints: [
        'Solve the all-square clue first.',
        'Then plug square into the first clue.',
        'triangle = 3, square = 5, diamond = 11.',
      ],
    },
    {
      symbols: ['circle', 'square', 'triangle', 'diamond'],
      values: { circle: 2, square: 4, triangle: 6, diamond: 9 },
      clues: [
        [[['circle', 1], ['square', 1], ['triangle', 1]], 12],
        [[['circle', 2], ['square', 1]], 8],
        [[['triangle', 1], ['diamond', 1]], 15],
        [[['square', 1], ['diamond', 1]], 13],
      ],
      hints: [
        'Clue 2 has only two symbols and constrains circle and square.',
        'Use clue 4 to relate square and diamond.',
        'circle = 2, square = 4, triangle = 6, diamond = 9.',
      ],
    },
    // ----- New levels (9–15) — added in v1.1 -----
    {
      symbols: ['circle', 'square', 'triangle', 'star'],
      values: { circle: 3, square: 7, triangle: 5, star: 12 },
      clues: [
        [[['circle', 2], ['square', 1]], 13],
        [[['triangle', 1], ['star', 1]], 17],
        [[['circle', 1], ['triangle', 1], ['star', 1]], 20],
        [[['square', 1], ['triangle', 1]], 12],
      ],
      hints: [
        'Clue 4 only uses square and triangle.',
        'Use clue 1 to solve circle once square is known.',
        'circle = 3, square = 7, triangle = 5, star = 12.',
      ],
    },
    {
      symbols: ['triangle', 'diamond', 'star'],
      values: { triangle: 4, diamond: 6, star: 9 },
      clues: [
        [[['triangle', 2]], 8],
        [[['diamond', 1], ['star', 1]], 15],
        [[['triangle', 1], ['diamond', 2]], 16],
        [[['star', 1], ['triangle', 1]], 13],
      ],
      hints: [
        'Solve triangle from the single-symbol clue.',
        'Plug triangle into clue 3 to find diamond.',
        'triangle = 4, diamond = 6, star = 9.',
      ],
    },
    {
      symbols: ['circle', 'square', 'triangle', 'star'],
      values: { circle: 2, square: 5, triangle: 8, star: 11 },
      clues: [
        [[['circle', 3]], 6],
        [[['square', 1], ['circle', 1]], 7],
        [[['triangle', 1], ['square', 1]], 13],
        [[['star', 1], ['circle', 1]], 13],
      ],
      hints: [
        'Three circles equal 6 — that pins circle immediately.',
        'Then chain through square, triangle, and star.',
        'circle = 2, square = 5, triangle = 8, star = 11.',
      ],
    },
    {
      symbols: ['circle', 'square', 'triangle', 'diamond', 'star'],
      values: { circle: 2, square: 4, triangle: 6, diamond: 8, star: 10 },
      clues: [
        [[['square', 2]], 8],
        [[['circle', 1], ['square', 1]], 6],
        [[['triangle', 1], ['square', 1]], 10],
        [[['diamond', 1], ['circle', 1]], 10],
        [[['star', 1], ['triangle', 1]], 16],
      ],
      hints: [
        'Each new symbol unlocks once you know the previous one.',
        'Start with square, then circle, triangle, diamond, star.',
        'circle = 2, square = 4, triangle = 6, diamond = 8, star = 10.',
      ],
    },
    {
      symbols: ['circle', 'square', 'triangle', 'star'],
      values: { circle: 3, square: 7, triangle: 4, star: 9 },
      clues: [
        [[['circle', 1], ['square', 1]], 10],
        [[['triangle', 1], ['square', 1]], 11],
        [[['circle', 1], ['star', 1]], 12],
        [[['triangle', 2], ['square', 1]], 15],
      ],
      hints: [
        'No single-symbol clue — subtract clue 1 from clue 4 to isolate a piece.',
        'Clue 4 minus clue 2 gives one triangle directly.',
        'circle = 3, square = 7, triangle = 4, star = 9.',
      ],
    },
    {
      symbols: ['circle', 'square', 'triangle', 'diamond', 'star'],
      values: { circle: 1, square: 3, triangle: 5, diamond: 7, star: 9 },
      clues: [
        [[['circle', 2], ['square', 1]], 5],
        [[['square', 1], ['triangle', 1]], 8],
        [[['triangle', 1], ['diamond', 1]], 12],
        [[['diamond', 1], ['star', 1]], 16],
        [[['circle', 1], ['triangle', 1], ['star', 1]], 15],
      ],
      hints: [
        'An odd-number sequence — circle = 1, then +2 each.',
        'Use clue 1 with clue 2 to lock circle and square.',
        'circle = 1, square = 3, triangle = 5, diamond = 7, star = 9.',
      ],
    },
    {
      symbols: ['circle', 'square', 'triangle', 'diamond', 'star'],
      values: { circle: 6, square: 4, triangle: 2, diamond: 11, star: 8 },
      clues: [
        [[['circle', 1], ['square', 1]], 10],
        [[['triangle', 2], ['circle', 1]], 10],
        [[['triangle', 1], ['star', 1]], 10],
        [[['square', 1], ['diamond', 1]], 15],
        [[['circle', 1], ['triangle', 1], ['diamond', 1]], 19],
        [[['square', 1], ['star', 1]], 12],
      ],
      hints: [
        'Six clues, five unknowns — pick the pair that isolates one symbol.',
        'Clue 5 minus clue 4 isolates circle + triangle − square.',
        'circle = 6, square = 4, triangle = 2, diamond = 11, star = 8.',
      ],
    },
  ];

  // ---------- Tweaks ----------
  const TWEAKS = /*EDITMODE-BEGIN*/{
    "showClueTotals": true,
    "autoAdvance": true
  }/*EDITMODE-END*/;

  // ---------- State ----------
  const state = {
    phase: 'title',
    levelIdx: 0,
    runtimeLevel: null,
    solvedCount: parseInt(localStorage.getItem('balancescale_solved') || '0', 10) || 0,
    guesses: {},
    activeSymbol: null,
    inputBuffer: '',
    hintsShown: 0,
    elapsed: 0,
    floaters: [],
    particles: [],
    starRotations: {}, // each shape has slow self-rotation
    perClueAnim: [], // smoothed tilt per clue
  };

  // ---------- Helpers ----------
  const rand = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function currentLevel() { return state.runtimeLevel || LEVELS[state.levelIdx]; }

  function makeLevelVariant(base, idx) {
    const maxValue = clamp(7 + Math.floor(idx / 2), 5, 14);
    const values = {};
    const used = new Set();
    for (const sym of base.symbols) {
      let v;
      do {
        v = randInt(1, maxValue);
      } while (used.has(v));
      values[sym] = v;
      used.add(v);
    }
    const clues = base.clues.map(([items]) => {
      const copiedItems = items.map(([sym, n]) => [sym, n]);
      const total = copiedItems.reduce((sum, [sym, n]) => sum + values[sym] * n, 0);
      return [copiedItems, total];
    });
    const targetClues = clamp(base.clues.length + Math.floor((idx + 1) / 2), base.clues.length, 9);
    addGeneratedClues(clues, base.symbols, values, targetClues);
    return {
      symbols: base.symbols.slice(),
      values,
      clues,
      scenes: shuffledScenes(clues.length),
      hints: buildHints(base, values),
    };
  }

  function shuffledScenes(count) {
    const pool = BALANCE_SCENES.slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const out = [];
    for (let i = 0; i < count; i++) out.push(pool[i % pool.length]);
    return out;
  }

  function addGeneratedClues(clues, symbols, values, targetCount) {
    const seen = new Set(clues.map(clueSignature));
    let safety = 0;
    while (clues.length < targetCount && safety++ < 160) {
      const itemCount = randInt(1, Math.min(3, symbols.length));
      const shuffled = symbols.slice().sort(() => Math.random() - 0.5);
      const items = shuffled.slice(0, itemCount)
        .map(sym => [sym, randInt(1, itemCount === 1 ? 3 : 2)])
        .sort((a, b) => symbols.indexOf(a[0]) - symbols.indexOf(b[0]));
      if (items.reduce((sum, [, n]) => sum + n, 0) > 5) continue;
      const sig = clueSignature([items, 0]);
      if (seen.has(sig)) continue;
      const total = items.reduce((sum, [sym, n]) => sum + values[sym] * n, 0);
      clues.push([items, total]);
      seen.add(sig);
    }
  }

  function clueSignature([items]) {
    return items.map(([sym, n]) => `${sym}:${n}`).join('|');
  }

  function buildHints(base, values) {
    const single = base.clues.find(([items]) => items.length === 1);
    const first = single ? displayName(single[0][0][0]) : displayName(base.symbols[0]);
    return [
      single
        ? `Start with the clue that uses only ${first}. Divide the total by the number of ${first} pieces.`
        : 'Compare clues that share a fruit. Subtract one clue from another to remove repeated pieces.',
      'Once one fruit is known, substitute its value into every clue that contains it.',
      `This puzzle's values are: ${base.symbols.map(s => `${displayName(s)} = ${values[s]}`).join(', ')}.`,
    ];
  }

  function setupLevel(idx, options = {}) {
    state.levelIdx = clamp(idx, 0, LEVELS.length - 1);
    state.runtimeLevel = options.keepPuzzle && state.runtimeLevel
      ? state.runtimeLevel
      : makeLevelVariant(LEVELS[state.levelIdx], state.levelIdx);
    resetLevelInputs();
  }

  function resetLevelInputs() {
    const L = currentLevel();
    state.guesses = {};
    for (const s of L.symbols) state.guesses[s] = null;
    state.activeSymbol = L.symbols[0];
    state.inputBuffer = '';
    state.hintsShown = 0;
    state.perClueAnim = L.clues.map(() => 0);
    renderAnswerDock();
    updateHUD();
  }

  function clueLeftSum(clue) {
    let s = 0;
    for (const [sym, n] of clue[0]) {
      const g = state.guesses[sym];
      if (g != null) s += g * n;
      else return null; // not all filled
    }
    return s;
  }

  function clueBalanced(clue) {
    const s = clueLeftSum(clue);
    return s != null && s === clue[1];
  }

  function isLevelSolved() {
    const L = currentLevel();
    for (const s of L.symbols) {
      if (state.guesses[s] !== L.values[s]) return false;
    }
    return true;
  }

  // ---------- HUD / answer dock ----------
  function updateHUD() {
    document.getElementById('level').textContent = state.levelIdx + 1;
    document.getElementById('level-max').textContent = LEVELS.length;
    document.getElementById('solved').textContent = state.solvedCount;
  }

  function renderAnswerDock() {
    const dock = document.getElementById('answer-dock');
    dock.innerHTML = '';
    const L = currentLevel();
    for (const sym of L.symbols) {
      const slot = document.createElement('div');
      slot.className = 'answer-slot';
      slot.dataset.symbol = sym;
      if (sym === state.activeSymbol) slot.classList.add('active');
      const icon = document.createElement('div');
      icon.className = 'slot-icon';
      icon.innerHTML = symbolSVG(sym, 28);
      slot.appendChild(icon);
      const val = document.createElement('div');
      val.className = 'slot-val';
      const g = state.guesses[sym];
      if (g != null) {
        val.textContent = g;
      } else if (sym === state.activeSymbol && state.inputBuffer !== '') {
        val.textContent = state.inputBuffer;
      } else if (sym === state.activeSymbol) {
        val.classList.add('empty');
        val.innerHTML = '<span class="cursor">|</span>';
      } else {
        val.classList.add('empty');
      }
      slot.appendChild(val);
      slot.addEventListener('click', () => {
        state.activeSymbol = sym;
        state.inputBuffer = '';
        renderAnswerDock();
      });
      dock.appendChild(slot);
    }
  }

  function flashSlot(symbol, cls) {
    const slot = document.querySelector(`.answer-slot[data-symbol="${symbol}"]`);
    if (slot) {
      slot.classList.add(cls);
      setTimeout(() => slot.classList.remove(cls), 600);
    }
  }

  function showMsg(text, type = '') {
    const el = document.getElementById('msg');
    el.textContent = text;
    el.className = '';
    if (type) el.classList.add(type);
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 2800);
  }

  // ---------- Dock icons (rasterized via offscreen canvas so they match the in-game fruit art exactly) ----------
  const _iconCache = {};
  function symbolSVG(sym, size) {
    const key = `${sym}@${size}`;
    if (_iconCache[key]) return _iconCache[key];
    const scale = 2;
    const off = document.createElement('canvas');
    off.width = Math.round(size * scale);
    off.height = Math.round(size * scale);
    const oc = off.getContext('2d');
    oc.scale(scale, scale);
    // Inset a touch so stems/leaves don't get clipped.
    drawFruit(oc, sym, size / 2, size / 2 + 1, size - 4);
    const html = `<img src="${off.toDataURL()}" width="${size}" height="${size}" style="display:block" alt="${displayName(sym)}">`;
    _iconCache[key] = html;
    return html;
  }

  // ---------- Input ----------
  window.addEventListener('keydown', (e) => {
    if (state.phase === 'title' || state.phase === 'won') {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startGame(); return; }
    }
    if (state.phase !== 'playing') return;
    if (e.key === 'h' || e.key === 'H') { e.preventDefault(); showHint(); return; }
    if (e.key === 'r' || e.key === 'R') { e.preventDefault(); resetLevelInputs(); return; }
    if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setupLevel(state.levelIdx); return; }
    if (e.key === 'Tab') { e.preventDefault(); cycleSlot(e.shiftKey ? -1 : 1); return; }
    if (e.key === 'Enter') { e.preventDefault(); commitAndCheck(); return; }
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (state.inputBuffer !== '') {
        state.inputBuffer = state.inputBuffer.slice(0, -1);
      } else if (state.activeSymbol && state.guesses[state.activeSymbol] != null) {
        state.guesses[state.activeSymbol] = null;
      }
      renderAnswerDock();
      return;
    }
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      if (!state.activeSymbol) return;
      state.inputBuffer += e.key;
      if (state.inputBuffer.length > 2) state.inputBuffer = state.inputBuffer.slice(-2);
      renderAnswerDock();
      return;
    }
  });

  function cycleSlot(dir) {
    const L = currentLevel();
    if (!state.activeSymbol) state.activeSymbol = L.symbols[0];
    const idx = L.symbols.indexOf(state.activeSymbol);
    const next = (idx + dir + L.symbols.length) % L.symbols.length;
    // commit current buffer
    if (state.inputBuffer !== '') {
      state.guesses[state.activeSymbol] = parseInt(state.inputBuffer, 10);
      state.inputBuffer = '';
    }
    state.activeSymbol = L.symbols[next];
    renderAnswerDock();
  }

  function commitAndCheck() {
    // First commit buffer
    if (state.inputBuffer !== '' && state.activeSymbol) {
      state.guesses[state.activeSymbol] = parseInt(state.inputBuffer, 10);
      state.inputBuffer = '';
      renderAnswerDock();
    }
    // Check
    const L = currentLevel();
    const filled = L.symbols.every(s => state.guesses[s] != null);
    if (!filled) {
      showMsg('Fill in all answer boxes first.', 'error');
      return;
    }
    if (isLevelSolved()) {
      state.solvedCount = Math.max(state.solvedCount, state.levelIdx + 1);
      localStorage.setItem('balancescale_solved', String(state.solvedCount));
      updateHUD();
      showMsg(`Level ${state.levelIdx + 1} solved! 🎉`, 'success');
      // Confetti
      for (let i = 0; i < 40; i++) {
        state.particles.push({
          x: W / 2 + rand(-30, 30),
          y: H * 0.4,
          vx: rand(-260, 260),
          vy: rand(-360, -120),
          rot: rand(0, Math.PI * 2),
          rotV: rand(-6, 6),
          size: rand(6, 12),
          color: ['#e84545', '#ff9933', '#ee6f88', '#f4c93b', '#9156c4', '#62b14a'][Math.floor(Math.random() * 6)],
          life: rand(1.0, 1.6),
          maxLife: 1.6,
          gravity: 600,
        });
      }
      // Flash all slots
      for (const s of L.symbols) flashSlot(s, 'correct');
      // Auto-advance
      if (TWEAKS.autoAdvance) {
        setTimeout(() => {
          if (state.levelIdx >= LEVELS.length - 1) {
            wonAll();
          } else {
            setupLevel(state.levelIdx + 1);
            showMsg(`Level ${state.levelIdx + 1}`, '');
          }
        }, 1400);
      }
    } else {
      // Find which symbols are wrong
      const wrongs = L.symbols.filter(s => state.guesses[s] !== L.values[s]);
      showMsg(`Not quite — check ${wrongs.map(displayName).join(', ')}.`, 'error');
      for (const w of wrongs) flashSlot(w, 'incorrect');
    }
  }

  function showHint() {
    const L = currentLevel();
    if (state.hintsShown >= L.hints.length) {
      showMsg('No more hints! Try checking your math.', 'hint');
      return;
    }
    showMsg('💡 ' + L.hints[state.hintsShown], 'hint');
    state.hintsShown++;
  }

  // ---------- Phases ----------
  function startGame() {
    state.phase = 'playing';
    setupLevel(state.levelIdx);
    document.getElementById('overlay').classList.add('hidden');
    updateHUD();
  }
  function wonAll() {
    state.phase = 'won';
    const overlay = document.getElementById('overlay');
    overlay.querySelector('.card').remove();
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h1><span class="acc">ALL</span> SOLVED!</h1>
      <div class="sub">all ${LEVELS.length} levels balanced</div>
      <p>You deduced every shape's value across all puzzles. Replay to chase a faster solve, or jump to any level from the Tweaks panel.</p>
      <button class="big-btn" id="restart-btn">PLAY AGAIN</button>
    `;
    overlay.appendChild(card);
    overlay.classList.remove('hidden');
    document.getElementById('restart-btn').addEventListener('click', () => {
      state.levelIdx = 0;
      startGame();
    });
  }
  document.getElementById('start-btn').addEventListener('click', startGame);
  document.getElementById('check-btn').addEventListener('click', commitAndCheck);
  document.getElementById('reset-btn').addEventListener('click', resetLevelInputs);
  document.getElementById('randomize-btn').addEventListener('click', () => setupLevel(state.levelIdx));
  document.getElementById('hint-btn').addEventListener('click', showHint);

  // =====================================================================
  // RENDERING
  // =====================================================================

  let lastTime = performance.now();
  function loop(now) {
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.1) dt = 0.1;
    state.elapsed += dt;
    // Smooth per-clue tilt animation
    const L = currentLevel();
    if (L && state.perClueAnim.length === L.clues.length) {
      for (let i = 0; i < L.clues.length; i++) {
        const c = L.clues[i];
        const s = clueLeftSum(c);
        let target = 0;
        if (s != null) {
          const diff = s - c[1];
          target = clamp(diff / 30, -0.32, 0.32);
        }
        state.perClueAnim[i] = lerp(state.perClueAnim[i], target, 0.08);
      }
    }
    // Particles
    for (const p of state.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.rot += p.rotV * dt;
      p.life -= dt;
    }
    state.particles = state.particles.filter(p => p.life > 0);
    draw();
    requestAnimationFrame(loop);
  }

  function draw() {
    drawBg();
    drawClues();
    drawParticles();
  }

  function drawBg() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#88d8ff');
    g.addColorStop(0.5, '#fff0b8');
    g.addColorStop(1, '#f1bf4d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const rg = ctx.createRadialGradient(W * 0.22, H * 0.08, 0, W * 0.22, H * 0.08, Math.max(W, H) * 0.6);
    rg.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
    rg.addColorStop(0.35, 'rgba(255, 255, 255, 0.16)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(123, 84, 41, 0.08)';
    ctx.lineWidth = 1;
    const step = 46;
    for (let x = -step; x < W + step; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = -step; y < H + step; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Big soft cartoon dots.
    for (let i = 0; i < 24; i++) {
      const x = (i * 173) % W;
      const y = (i * 109) % H;
      const r = 5 + (i % 4) * 2;
      ctx.fillStyle = i % 2 ? 'rgba(255, 138, 61, 0.09)' : 'rgba(77, 184, 216, 0.10)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawClues() {
    const L = currentLevel();
    if (!L) return;
    const top = 90;
    const bottom = H - 130;
    const n = L.clues.length;
    const slotH = (bottom - top) / n;
    for (let i = 0; i < n; i++) {
      const cy = top + slotH * (i + 0.5);
      const tilt = state.perClueAnim[i] || 0;
      drawClueScale(L.clues[i], cy, slotH, tilt, i, L.scenes?.[i] || BALANCE_SCENES[i % BALANCE_SCENES.length]);
    }
  }

  function drawClueScale(clue, cy, height, tilt, idx, scene) {
    const [items, rightVal] = clue;
    const beamLen = Math.min(W * 0.68, 720);
    const beamCx = W / 2;
    const beamY = cy;
    const beamThick = clamp(height * 0.08, 8, 16);
    const cardW = Math.min(W - 40, 860);
    const cardH = Math.max(72, height * 0.82);
    ctx.fillStyle = 'rgba(255, 248, 223, 0.96)';
    ctx.strokeStyle = '#2b2418';
    ctx.lineWidth = 3;
    roundRect(beamCx - cardW / 2, beamY - cardH / 2, cardW, cardH, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 210, 77, 0.22)';
    roundRect(beamCx - cardW / 2 + 7, beamY - cardH / 2 + 7, cardW - 14, cardH - 14, 10);
    ctx.fill();

    drawScenarioBalance(scene, beamCx, beamY, height, beamLen, beamThick, tilt, items, rightVal);

    // Clue label
    ctx.fillStyle = 'rgba(43, 36, 24, 0.5)';
    ctx.font = 'bold 12px "Fredoka", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Clue ${idx + 1} · ${sceneLabel(scene)}`, 20, beamY - height * 0.4);

    // Balance indicator on right side
    const sum = clueLeftSum(clue);
    if (sum != null) {
      const balanced = sum === rightVal;
      ctx.fillStyle = balanced ? '#5d9a5d' : '#c87543';
      ctx.font = 'bold 14px "Lilita One", sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(balanced ? '✓ BALANCED' : (sum < rightVal ? '↑ TOO LIGHT' : '↓ TOO HEAVY'), W - 20, beamY);
    }
  }

  function sceneLabel(scene) {
    return {
      waitress: 'café tray',
      funambule: 'tightrope',
      shark: 'surf escape',
      bus: 'cliff bus',
      detonator: 'detonator',
      rocket: 'rocket seesaw',
      ufo: 'UFO beam',
      cannon: 'circus cannon',
      dragon: 'dragon bridge',
    }[scene] || 'surprise';
  }

  function drawScenarioBalance(scene, cx, cy, h, len, thick, tilt, items, rightVal) {
    const leftX = -len / 2;
    const rightX = len / 2;
    drawScenarioBackdrop(scene, cx, cy, h, len);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(tilt);
    drawScenarioBeam(scene, leftX, rightX, thick);
    drawScenarioLoad(scene, leftX, -h * 0.18, items, true, h);
    drawScenarioLoad(scene, rightX, -h * 0.18, rightVal, false, h);
    ctx.restore();
  }

  function drawScenarioBackdrop(scene, cx, cy, h, len) {
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#2b2418';
    if (scene === 'waitress') {
      drawCartoonPerson(cx, cy + h * 0.28, h, '#4db8d8');
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${clamp(h * 0.16, 11, 15)}px "Fredoka", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('CAFE PANIC', cx, cy - h * 0.32);
    } else if (scene === 'funambule') {
      drawBuilding(cx - len * 0.42, cy + h * 0.38, h * 0.42, h * 0.5);
      drawBuilding(cx + len * 0.42, cy + h * 0.38, h * 0.42, h * 0.5);
      drawCartoonPerson(cx, cy + h * 0.08, h * 0.7, '#ffd24d');
      drawPigeon(cx + len * 0.26, cy - h * 0.25, h * 0.14);
      drawPigeon(cx + len * 0.32, cy - h * 0.18, h * 0.12);
    } else if (scene === 'shark') {
      ctx.fillStyle = '#73d2ff';
      roundRect(cx - len * 0.45, cy + h * 0.24, len * 0.9, h * 0.23, 12);
      ctx.fill(); ctx.stroke();
      drawShark(cx + len * 0.18, cy + h * 0.28, h * 0.28);
    } else if (scene === 'bus') {
      ctx.fillStyle = '#8ad86b';
      roundRect(cx - len * 0.47, cy + h * 0.28, len * 0.43, h * 0.18, 8);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2b2418';
      ctx.beginPath();
      ctx.moveTo(cx + len * 0.02, cy + h * 0.47);
      ctx.lineTo(cx + len * 0.24, cy + h * 0.47);
      ctx.lineTo(cx + len * 0.02, cy + h * 0.27);
      ctx.closePath();
      ctx.fill();
    } else if (scene === 'detonator') {
      ctx.fillStyle = '#c84c5f';
      roundRect(cx - h * 0.36, cy + h * 0.16, h * 0.72, h * 0.25, 8);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffd24d';
      ctx.beginPath();
      ctx.arc(cx, cy + h * 0.16, h * 0.08, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    } else if (scene === 'rocket') {
      drawRocket(cx - len * 0.35, cy + h * 0.22, h * 0.26);
      drawRocket(cx + len * 0.34, cy + h * 0.18, h * 0.22);
    } else if (scene === 'ufo') {
      drawUfo(cx, cy - h * 0.25, h * 0.34);
      ctx.fillStyle = 'rgba(120, 220, 255, 0.18)';
      ctx.beginPath();
      ctx.moveTo(cx - h * 0.22, cy - h * 0.15);
      ctx.lineTo(cx + h * 0.22, cy - h * 0.15);
      ctx.lineTo(cx + h * 0.44, cy + h * 0.42);
      ctx.lineTo(cx - h * 0.44, cy + h * 0.42);
      ctx.closePath();
      ctx.fill();
    } else if (scene === 'cannon') {
      drawCannon(cx - len * 0.2, cy + h * 0.25, h * 0.28);
      drawStarburst(cx + len * 0.28, cy - h * 0.18, h * 0.18);
    } else {
      drawDragon(cx + len * 0.28, cy + h * 0.08, h * 0.42);
      ctx.fillStyle = '#8ad86b';
      roundRect(cx - len * 0.44, cy + h * 0.24, len * 0.88, h * 0.12, 10);
      ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  function drawScenarioBeam(scene, leftX, rightX, thick) {
    const colors = {
      waitress: '#f05f77',
      funambule: '#2b2418',
      shark: '#ffcf4d',
      bus: '#ff8a3d',
      detonator: '#c84c5f',
      rocket: '#4db8d8',
      ufo: '#8b63c7',
      cannon: '#ff8a3d',
      dragon: '#5dba72',
    };
    ctx.fillStyle = colors[scene] || '#ff8a3d';
    ctx.strokeStyle = '#2b2418';
    ctx.lineWidth = 3;
    roundRect(leftX, -thick / 2, rightX - leftX, thick, thick / 2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    roundRect(leftX + 8, -thick / 2 + 3, rightX - leftX - 16, thick * 0.32, thick / 4);
    ctx.fill();
  }

  function drawScenarioLoad(scene, x, y, content, isShapes, h) {
    const trayW = clamp(h * 1.15, 74, 112);
    const trayH = clamp(h * 0.18, 12, 20);
    ctx.fillStyle = scene === 'shark' && isShapes ? '#fff' : '#fff7e0';
    ctx.strokeStyle = '#2b2418';
    ctx.lineWidth = 3;
    if (scene === 'bus' && isShapes) {
      drawBus(x, y, trayW, trayH * 2.2);
    } else if (scene === 'shark' && isShapes) {
      drawSurfboard(x, y + trayH * 0.35, trayW, trayH);
    } else {
      roundRect(x - trayW / 2, y - trayH / 2, trayW, trayH, trayH / 2);
      ctx.fill(); ctx.stroke();
    }
    if (scene === 'waitress' && isShapes) drawDrinkCups(x, y - trayH * 1.18, h);
    if (isShapes) drawLoadShapes(content, x, y - trayH * 0.95, h);
    else drawLoadNumber(content, x, y - trayH * 0.95, h);
  }

  function drawDrinkCups(cx, cy, h) {
    const cupW = clamp(h * 0.13, 8, 13);
    const cupH = clamp(h * 0.22, 14, 21);
    for (let i = -1; i <= 1; i++) {
      const x = cx + i * cupW * 1.35;
      ctx.fillStyle = i === 0 ? '#88d8ff' : '#ff8a3d';
      ctx.strokeStyle = '#2b2418';
      ctx.lineWidth = 2;
      roundRect(x - cupW / 2, cy - cupH / 2, cupW, cupH, 3);
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#2b2418';
      ctx.beginPath();
      ctx.moveTo(x + cupW * 0.12, cy - cupH * 0.48);
      ctx.lineTo(x + cupW * 0.36, cy - cupH * 0.85);
      ctx.stroke();
    }
  }

  function drawLoadShapes(content, cx, cy, h) {
    const flat = [];
    for (const [sym, n] of content) for (let i = 0; i < n; i++) flat.push(sym);
    const size = clamp(24 - Math.max(0, flat.length - 3) * 3, 13, 22);
    const totalW = flat.length * (size + 4) - 4;
    const startX = cx - totalW / 2;
    for (let i = 0; i < flat.length; i++) {
      drawCanvasSymbol(flat[i], startX + i * (size + 4) + size / 2, cy, size);
    }
  }

  function drawLoadNumber(value, cx, cy, h) {
    const numW = clamp(h * 0.78, 46, 62);
    const numH = clamp(h * 0.34, 22, 30);
    ctx.fillStyle = '#fff7e0';
    ctx.strokeStyle = '#2b2418';
    ctx.lineWidth = 3;
    roundRect(cx - numW / 2, cy - numH / 2, numW, numH, 8);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2b2418';
    ctx.font = `bold ${Math.round(numH * 0.8)}px "Lilita One", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(value), cx, cy + 1);
  }

  function drawCartoonPerson(cx, cy, h, color) {
    const s = clamp(h * 0.18, 12, 20);
    ctx.save();
    ctx.strokeStyle = '#2b2418';
    ctx.lineWidth = 3;
    ctx.fillStyle = color;
    roundRect(cx - s * 0.55, cy - s * 0.25, s * 1.1, s * 1.35, s * 0.35);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd7a8';
    ctx.beginPath();
    ctx.arc(cx, cy - s * 0.75, s * 0.48, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2b2418';
    ctx.beginPath();
    ctx.arc(cx - s * 0.15, cy - s * 0.82, 1.4, 0, Math.PI * 2);
    ctx.arc(cx + s * 0.15, cy - s * 0.82, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy - s * 0.68, s * 0.18, 0, Math.PI);
    ctx.stroke();
    ctx.restore();
  }

  function drawBuilding(x, y, w, h) {
    ctx.fillStyle = '#6cc1df';
    ctx.strokeStyle = '#2b2418';
    ctx.lineWidth = 3;
    roundRect(x - w / 2, y - h, w, h, 7);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff4d6';
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 2; j++) {
        ctx.fillRect(x - w * 0.28 + j * w * 0.32, y - h * 0.78 + i * h * 0.22, w * 0.14, h * 0.1);
      }
    }
  }

  function drawPigeon(x, y, s) {
    ctx.fillStyle = '#c9d2da';
    ctx.strokeStyle = '#2b2418';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, s, s * 0.62, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + s * 0.75, y - s * 0.25, s * 0.42, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffcf4d';
    ctx.beginPath();
    ctx.moveTo(x + s * 1.12, y - s * 0.25);
    ctx.lineTo(x + s * 1.48, y - s * 0.12);
    ctx.lineTo(x + s * 1.12, y);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  }

  function drawShark(x, y, s) {
    ctx.fillStyle = '#5c7f99';
    ctx.strokeStyle = '#2b2418';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y, s * 1.3, s * 0.55, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(x + s * 0.1, y - s * 0.55);
    ctx.lineTo(x + s * 0.42, y - s * 1.12);
    ctx.lineTo(x + s * 0.58, y - s * 0.36);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2b2418';
    ctx.beginPath();
    ctx.arc(x + s * 0.65, y - s * 0.15, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSurfboard(x, y, w, h) {
    ctx.fillStyle = '#ffcf4d';
    ctx.strokeStyle = '#2b2418';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y, w / 2, h * 0.55, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#ff8a3d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.35, y);
    ctx.lineTo(x + w * 0.35, y);
    ctx.stroke();
  }

  function drawBus(x, y, w, h) {
    ctx.fillStyle = '#ffd24d';
    ctx.strokeStyle = '#2b2418';
    ctx.lineWidth = 3;
    roundRect(x - w / 2, y - h / 2, w, h, 8);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#88d8ff';
    for (let i = 0; i < 3; i++) {
      roundRect(x - w * 0.34 + i * w * 0.24, y - h * 0.27, w * 0.16, h * 0.24, 3);
      ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = '#2b2418';
    ctx.beginPath();
    ctx.arc(x - w * 0.3, y + h * 0.45, h * 0.14, 0, Math.PI * 2);
    ctx.arc(x + w * 0.3, y + h * 0.45, h * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRocket(x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.45);
    ctx.fillStyle = '#fff7e0';
    ctx.strokeStyle = '#2b2418';
    ctx.lineWidth = 3;
    roundRect(-s * 0.35, -s, s * 0.7, s * 1.6, s * 0.35);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c84c5f';
    ctx.beginPath();
    ctx.moveTo(0, -s * 1.38);
    ctx.lineTo(s * 0.38, -s * 0.82);
    ctx.lineTo(-s * 0.38, -s * 0.82);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#4db8d8';
    ctx.beginPath();
    ctx.arc(0, -s * 0.35, s * 0.18, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function drawUfo(x, y, s) {
    ctx.fillStyle = '#8b63c7';
    ctx.strokeStyle = '#2b2418';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y, s, s * 0.32, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#88d8ff';
    ctx.beginPath();
    ctx.arc(x, y - s * 0.18, s * 0.42, Math.PI, 0);
    ctx.fill(); ctx.stroke();
  }

  function drawCannon(x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.2);
    ctx.fillStyle = '#4db8d8';
    ctx.strokeStyle = '#2b2418';
    ctx.lineWidth = 3;
    roundRect(-s * 0.75, -s * 0.25, s * 1.5, s * 0.5, s * 0.2);
    ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#2b2418';
    ctx.beginPath();
    ctx.arc(x - s * 0.35, y + s * 0.32, s * 0.18, 0, Math.PI * 2);
    ctx.arc(x + s * 0.25, y + s * 0.32, s * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawStarburst(x, y, s) {
    ctx.fillStyle = '#ffd24d';
    ctx.strokeStyle = '#2b2418';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const r = i % 2 ? s * 0.45 : s;
      const a = -Math.PI / 2 + i / 12 * Math.PI * 2;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  }

  function drawDragon(x, y, s) {
    ctx.fillStyle = '#5dba72';
    ctx.strokeStyle = '#2b2418';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y, s * 1.1, s * 0.5, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.arc(x - s * 0.9, y - s * 0.25, s * 0.42, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd24d';
    ctx.beginPath();
    ctx.moveTo(x - s * 1.1, y - s * 0.62);
    ctx.lineTo(x - s * 0.92, y - s * 1.0);
    ctx.lineTo(x - s * 0.76, y - s * 0.58);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  }

  function drawChain(x1, y1, x2, y2) {
    ctx.strokeStyle = '#2b2418';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const n = 4;
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const x = lerp(x1, x2, t);
      const y = lerp(y1, y2, t);
      ctx.fillStyle = '#ffd24d';
      ctx.strokeStyle = '#2b2418';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(x, y, 4, 3, Math.PI / 2, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
  }

  function drawPan(cx, cy, content, isShapes) {
    const panW = 116;
    const panH = 18;
    // Cartoon bowl pan
    ctx.fillStyle = '#ffd24d';
    ctx.strokeStyle = '#2b2418';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - panW / 2, cy);
    ctx.quadraticCurveTo(cx, cy + panH * 1.65, cx + panW / 2, cy);
    ctx.quadraticCurveTo(cx, cy + panH * 0.42, cx - panW / 2, cy);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.ellipse(cx - panW * 0.18, cy + panH * 0.28, panW * 0.22, panH * 0.26, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b9862a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, panW / 2, panH * 0.36, 0, 0, Math.PI);
    ctx.stroke();

    // Contents
    if (isShapes) {
      // Lay out shapes on top
      const flatItems = [];
      for (const [sym, n] of content) {
        for (let i = 0; i < n; i++) flatItems.push(sym);
      }
      const itemSize = clamp(24 - Math.max(0, flatItems.length - 3) * 3, 13, 22);
      const totalW = flatItems.length * (itemSize + 4) - 4;
      let startX = cx - totalW / 2;
      for (let i = 0; i < flatItems.length; i++) {
        const x = startX + i * (itemSize + 4) + itemSize / 2;
        drawCanvasSymbol(flatItems[i], x, cy - itemSize / 2 - 5, itemSize);
      }
    } else {
      // Number
      ctx.fillStyle = '#fff7e0';
      ctx.strokeStyle = '#2b2418';
      ctx.lineWidth = 3;
      const numW = 60, numH = 30;
      roundRect(cx - numW / 2, cy - numH - 6, numW, numH, 8);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2b2418';
      ctx.font = 'bold 24px "Lilita One", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(content), cx, cy - numH / 2 - 6);
    }
  }

  function drawCanvasSymbol(sym, cx, cy, size) {
    // Soft drop shadow on the canvas (the dock-icon path skips this to keep PNGs tight).
    const r = size / 2;
    ctx.fillStyle = 'rgba(43, 36, 24, 0.22)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.95, r * 0.78, r * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    drawFruit(ctx, sym, cx, cy, size);
  }

  // ---------- Cartoon fruit renderer (shared by canvas and dock icons) ----------
  const INK = '#2b2418';
  function drawFruit(c, sym, cx, cy, size) {
    c.save();
    c.lineJoin = 'round';
    c.lineCap = 'round';
    const fruit = SYMBOLS[sym] && SYMBOLS[sym].fruit;
    const fn = FRUIT_DRAW[fruit];
    if (fn) fn(c, cx, cy, size);
    c.restore();
  }

  function fruitFace(c, cx, cy, scale) {
    // Eye whites
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(cx - scale * 0.32, cy - scale * 0.04, scale * 0.18, 0, Math.PI * 2);
    c.arc(cx + scale * 0.32, cy - scale * 0.04, scale * 0.18, 0, Math.PI * 2);
    c.fill();
    // Pupils
    c.fillStyle = INK;
    c.beginPath();
    c.arc(cx - scale * 0.3, cy - scale * 0.02, scale * 0.09, 0, Math.PI * 2);
    c.arc(cx + scale * 0.34, cy - scale * 0.02, scale * 0.09, 0, Math.PI * 2);
    c.fill();
    // Cheeks
    c.fillStyle = 'rgba(255, 120, 130, 0.55)';
    c.beginPath();
    c.arc(cx - scale * 0.42, cy + scale * 0.2, scale * 0.12, 0, Math.PI * 2);
    c.arc(cx + scale * 0.42, cy + scale * 0.2, scale * 0.12, 0, Math.PI * 2);
    c.fill();
    // Smile
    c.strokeStyle = INK;
    c.lineWidth = Math.max(1.1, scale * 0.06);
    c.beginPath();
    c.arc(cx, cy + scale * 0.12, scale * 0.22, 0.15 * Math.PI, 0.85 * Math.PI);
    c.stroke();
  }

  const FRUIT_DRAW = {
    apple(c, cx, cy, size) {
      const r = size / 2;
      // Stem
      c.fillStyle = '#6b3a1a';
      c.strokeStyle = INK;
      c.lineWidth = Math.max(1.1, r * 0.1);
      c.beginPath();
      c.moveTo(cx - r * 0.08, cy - r * 0.85);
      c.lineTo(cx - r * 0.04, cy - r * 1.08);
      c.lineTo(cx + r * 0.06, cy - r * 1.08);
      c.lineTo(cx + r * 0.04, cy - r * 0.85);
      c.closePath();
      c.fill(); c.stroke();
      // Leaf
      c.save();
      c.translate(cx + r * 0.05, cy - r * 1.02);
      c.rotate(-0.55);
      c.fillStyle = '#62b14a';
      c.beginPath();
      c.moveTo(0, 0);
      c.bezierCurveTo(r * 0.55, -r * 0.18, r * 0.55, r * 0.18, 0, 0);
      c.closePath();
      c.fill(); c.stroke();
      c.strokeStyle = '#3d6e23';
      c.lineWidth = Math.max(0.9, r * 0.05);
      c.beginPath();
      c.moveTo(0, 0); c.lineTo(r * 0.42, 0);
      c.stroke();
      c.restore();
      // Body — apple silhouette with the classic top dimple
      c.fillStyle = '#e84545';
      c.strokeStyle = INK;
      c.lineWidth = Math.max(1.2, r * 0.12);
      c.beginPath();
      c.moveTo(cx, cy - r * 0.78);
      c.bezierCurveTo(cx - r * 0.45, cy - r * 0.95, cx - r * 1.05, cy - r * 0.4, cx - r * 1.0, cy + r * 0.15);
      c.bezierCurveTo(cx - r * 0.95, cy + r * 0.85, cx - r * 0.4, cy + r * 1.05, cx, cy + r * 0.92);
      c.bezierCurveTo(cx + r * 0.4, cy + r * 1.05, cx + r * 0.95, cy + r * 0.85, cx + r * 1.0, cy + r * 0.15);
      c.bezierCurveTo(cx + r * 1.05, cy - r * 0.4, cx + r * 0.45, cy - r * 0.95, cx, cy - r * 0.78);
      c.closePath();
      c.fill(); c.stroke();
      // Highlight
      c.fillStyle = 'rgba(255,255,255,0.42)';
      c.beginPath();
      c.ellipse(cx - r * 0.45, cy - r * 0.25, r * 0.28, r * 0.14, -0.55, 0, Math.PI * 2);
      c.fill();
      fruitFace(c, cx, cy + r * 0.18, r * 0.78);
    },

    orange(c, cx, cy, size) {
      const r = size / 2;
      // Leaf at top
      c.save();
      c.translate(cx + r * 0.2, cy - r * 0.92);
      c.rotate(-0.4);
      c.fillStyle = '#62b14a';
      c.strokeStyle = INK;
      c.lineWidth = Math.max(1.1, r * 0.1);
      c.beginPath();
      c.moveTo(0, 0);
      c.bezierCurveTo(r * 0.55, -r * 0.16, r * 0.55, r * 0.16, 0, 0);
      c.closePath();
      c.fill(); c.stroke();
      c.restore();
      // Short brown stem nub
      c.fillStyle = '#6b3a1a';
      c.fillRect(cx - r * 0.06, cy - r * 0.98, r * 0.12, r * 0.16);
      c.strokeRect(cx - r * 0.06, cy - r * 0.98, r * 0.12, r * 0.16);
      // Body — round
      c.fillStyle = '#ff9933';
      c.strokeStyle = INK;
      c.lineWidth = Math.max(1.2, r * 0.12);
      c.beginPath();
      c.arc(cx, cy + r * 0.05, r * 0.94, 0, Math.PI * 2);
      c.fill(); c.stroke();
      // Peel texture — scattered darker stipples
      c.fillStyle = '#d8741a';
      const dots = [[-0.32, -0.18], [0.25, -0.3], [0.42, 0.15], [-0.12, 0.42], [0.05, -0.42], [-0.5, 0.18]];
      for (const [dx, dy] of dots) {
        c.beginPath();
        c.arc(cx + dx * r, cy + dy * r + r * 0.05, r * 0.06, 0, Math.PI * 2);
        c.fill();
      }
      // Highlight
      c.fillStyle = 'rgba(255,255,255,0.4)';
      c.beginPath();
      c.ellipse(cx - r * 0.4, cy - r * 0.3, r * 0.26, r * 0.12, -0.5, 0, Math.PI * 2);
      c.fill();
      fruitFace(c, cx, cy + r * 0.18, r * 0.78);
    },

    watermelon(c, cx, cy, size) {
      const r = size / 2;
      // Wedge: flat top, rounded bottom (classic cartoon slice)
      // Green rind — outermost arc
      c.fillStyle = '#62b14a';
      c.strokeStyle = INK;
      c.lineWidth = Math.max(1.2, r * 0.12);
      c.beginPath();
      c.moveTo(cx - r * 0.98, cy - r * 0.45);
      c.lineTo(cx + r * 0.98, cy - r * 0.45);
      c.arc(cx, cy - r * 0.45, r * 0.98, 0, Math.PI);
      c.closePath();
      c.fill(); c.stroke();
      // Inner white-rind ring
      c.fillStyle = '#f4f7d4';
      c.beginPath();
      c.moveTo(cx - r * 0.82, cy - r * 0.45);
      c.lineTo(cx + r * 0.82, cy - r * 0.45);
      c.arc(cx, cy - r * 0.45, r * 0.82, 0, Math.PI);
      c.closePath();
      c.fill();
      // Pink flesh
      c.fillStyle = '#ee6f88';
      c.beginPath();
      c.moveTo(cx - r * 0.7, cy - r * 0.45);
      c.lineTo(cx + r * 0.7, cy - r * 0.45);
      c.arc(cx, cy - r * 0.45, r * 0.7, 0, Math.PI);
      c.closePath();
      c.fill();
      // Highlight on flesh
      c.fillStyle = 'rgba(255,255,255,0.32)';
      c.beginPath();
      c.ellipse(cx - r * 0.35, cy - r * 0.2, r * 0.24, r * 0.08, -0.1, 0, Math.PI * 2);
      c.fill();
      // Seeds
      c.fillStyle = '#2b1a0a';
      const seeds = [[-0.4, 0.05], [-0.15, 0.0], [0.15, 0.05], [0.4, 0.0], [-0.28, 0.32], [0.0, 0.35], [0.28, 0.32]];
      for (const [dx, dy] of seeds) {
        c.beginPath();
        c.ellipse(cx + dx * r, cy + dy * r, r * 0.06, r * 0.1, 0, 0, Math.PI * 2);
        c.fill();
      }
      fruitFace(c, cx, cy + r * 0.5, r * 0.55);
    },

    banana(c, cx, cy, size) {
      const r = size / 2;
      // Crescent body — outer arc then inner arc back
      c.fillStyle = '#f4c93b';
      c.strokeStyle = INK;
      c.lineWidth = Math.max(1.2, r * 0.12);
      c.beginPath();
      c.moveTo(cx - r * 0.78, cy + r * 0.5);
      c.bezierCurveTo(cx - r * 0.95, cy - r * 0.2, cx - r * 0.1, cy - r * 0.95, cx + r * 0.85, cy - r * 0.55);
      c.bezierCurveTo(cx + r * 0.95, cy - r * 0.5, cx + r * 0.95, cy - r * 0.35, cx + r * 0.85, cy - r * 0.3);
      c.bezierCurveTo(cx + r * 0.15, cy - r * 0.55, cx - r * 0.4, cy + r * 0.05, cx - r * 0.55, cy + r * 0.55);
      c.bezierCurveTo(cx - r * 0.6, cy + r * 0.62, cx - r * 0.75, cy + r * 0.6, cx - r * 0.78, cy + r * 0.5);
      c.closePath();
      c.fill(); c.stroke();
      // Brown tips
      c.fillStyle = '#6b3a1a';
      c.beginPath();
      c.arc(cx - r * 0.74, cy + r * 0.52, r * 0.1, 0, Math.PI * 2);
      c.arc(cx + r * 0.88, cy - r * 0.45, r * 0.09, 0, Math.PI * 2);
      c.fill(); c.stroke();
      // Inner ridge highlight
      c.strokeStyle = 'rgba(255,255,255,0.55)';
      c.lineWidth = Math.max(1.0, r * 0.07);
      c.beginPath();
      c.moveTo(cx - r * 0.55, cy + r * 0.32);
      c.bezierCurveTo(cx - r * 0.3, cy - r * 0.25, cx + r * 0.3, cy - r * 0.55, cx + r * 0.7, cy - r * 0.45);
      c.stroke();
      fruitFace(c, cx + r * 0.05, cy - r * 0.05, r * 0.5);
    },

    grapes(c, cx, cy, size) {
      const r = size / 2;
      const grapeR = r * 0.3;
      // Stem
      c.strokeStyle = '#5a3818';
      c.lineWidth = Math.max(1.2, r * 0.1);
      c.beginPath();
      c.moveTo(cx, cy - r * 0.55);
      c.lineTo(cx, cy - r * 0.95);
      c.stroke();
      // Leaf
      c.save();
      c.translate(cx + r * 0.1, cy - r * 0.92);
      c.rotate(-0.45);
      c.fillStyle = '#62b14a';
      c.strokeStyle = INK;
      c.lineWidth = Math.max(1.0, r * 0.08);
      c.beginPath();
      c.moveTo(0, 0);
      c.bezierCurveTo(r * 0.45, -r * 0.18, r * 0.55, r * 0.12, 0, 0);
      c.closePath();
      c.fill(); c.stroke();
      c.restore();
      // Cluster layout — five-row inverted triangle, light at smallest size
      const layout = [
        [0, -0.35],
        [-0.42, -0.05], [0.42, -0.05],
        [-0.22, 0.32], [0.22, 0.32],
        [0, 0.62],
      ];
      // Back shadow blob for cohesion
      c.fillStyle = 'rgba(90, 50, 117, 0.6)';
      c.beginPath();
      c.ellipse(cx, cy + r * 0.18, r * 0.85, r * 0.7, 0, 0, Math.PI * 2);
      c.fill();
      // Individual grapes
      c.strokeStyle = INK;
      c.lineWidth = Math.max(1.1, r * 0.09);
      for (const [dx, dy] of layout) {
        c.fillStyle = '#9156c4';
        c.beginPath();
        c.arc(cx + dx * r, cy + dy * r, grapeR, 0, Math.PI * 2);
        c.fill(); c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.4)';
        c.beginPath();
        c.ellipse(cx + dx * r - grapeR * 0.32, cy + dy * r - grapeR * 0.36, grapeR * 0.3, grapeR * 0.14, -0.5, 0, Math.PI * 2);
        c.fill();
      }
      // Face on the middle grape so identity reads at small sizes
      fruitFace(c, cx, cy + r * 0.32, grapeR * 0.95);
    },
  };

  function drawParticles() {
    for (const p of state.particles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }
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

  // ---------- Tweaks panel ----------
  function setupTweaks() {
    // Level select
    const sel = document.getElementById('level-select');
    sel.innerHTML = '';
    for (let i = 0; i < LEVELS.length; i++) {
      const o = document.createElement('option');
      o.value = i;
      o.textContent = `Level ${i + 1}${i < state.solvedCount ? ' ✓' : ''}`;
      sel.appendChild(o);
    }
    sel.value = state.levelIdx;
    sel.addEventListener('change', () => {
      state.levelIdx = parseInt(sel.value, 10);
      if (state.phase === 'playing') setupLevel(state.levelIdx);
    });
    document.getElementById('show-clue-totals').checked = !!TWEAKS.showClueTotals;
    document.getElementById('show-clue-totals').addEventListener('change', (e) => {
      TWEAKS.showClueTotals = e.target.checked; persistTweaks();
    });
    document.getElementById('auto-advance').checked = !!TWEAKS.autoAdvance;
    document.getElementById('auto-advance').addEventListener('change', (e) => {
      TWEAKS.autoAdvance = e.target.checked; persistTweaks();
    });
    document.getElementById('tweaks-close').addEventListener('click', () => {
      hideTweaks();
      try { window.parent.postMessage({type: '__edit_mode_dismissed'}, '*'); } catch(e) {}
    });
    document.getElementById('gear-btn').addEventListener('click', () => {
      // Refresh level options before showing
      setupTweaks();
      const t = document.getElementById('tweaks');
      const open = t.classList.contains('open');
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

  // Kick off
  setupLevel(state.levelIdx);
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
