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

  // ---------- Symbols ----------
  const SYMBOLS = {
    circle:   { color: '#dc5a5a', dark: '#8a2c2c' },
    square:   { color: '#468cdc', dark: '#23568a' },
    triangle: { color: '#5ab464', dark: '#2d6233' },
    diamond:  { color: '#c8a040', dark: '#7a5d1d' },
    star:     { color: '#b070d0', dark: '#5a3275' },
  };
  const SYMBOL_ORDER = ['circle', 'square', 'triangle', 'diamond', 'star'];

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
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function currentLevel() { return LEVELS[state.levelIdx]; }

  function setupLevel(idx) {
    state.levelIdx = clamp(idx, 0, LEVELS.length - 1);
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

  // ---------- Symbol SVG (for HTML dock icons) ----------
  function symbolSVG(sym, size) {
    const s = SYMBOLS[sym];
    const c = size / 2;
    if (sym === 'circle') {
      return `<svg viewBox="0 0 ${size} ${size}"><circle cx="${c}" cy="${c}" r="${c - 2}" fill="${s.color}" stroke="#2b2418" stroke-width="2"/></svg>`;
    }
    if (sym === 'square') {
      return `<svg viewBox="0 0 ${size} ${size}"><rect x="2" y="2" width="${size - 4}" height="${size - 4}" fill="${s.color}" stroke="#2b2418" stroke-width="2" rx="3"/></svg>`;
    }
    if (sym === 'triangle') {
      return `<svg viewBox="0 0 ${size} ${size}"><polygon points="${c},2 ${size - 2},${size - 2} 2,${size - 2}" fill="${s.color}" stroke="#2b2418" stroke-width="2" stroke-linejoin="round"/></svg>`;
    }
    if (sym === 'diamond') {
      return `<svg viewBox="0 0 ${size} ${size}"><polygon points="${c},2 ${size - 2},${c} ${c},${size - 2} 2,${c}" fill="${s.color}" stroke="#2b2418" stroke-width="2" stroke-linejoin="round"/></svg>`;
    }
    if (sym === 'star') {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? (c - 2) : (c - 2) * 0.45;
        const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
        pts.push(`${c + Math.cos(a) * r},${c + Math.sin(a) * r}`);
      }
      return `<svg viewBox="0 0 ${size} ${size}"><polygon points="${pts.join(' ')}" fill="${s.color}" stroke="#2b2418" stroke-width="2" stroke-linejoin="round"/></svg>`;
    }
    return '';
  }

  // ---------- Input ----------
  window.addEventListener('keydown', (e) => {
    if (state.phase === 'title' || state.phase === 'won') {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startGame(); return; }
    }
    if (state.phase !== 'playing') return;
    if (e.key === 'h' || e.key === 'H') { e.preventDefault(); showHint(); return; }
    if (e.key === 'r' || e.key === 'R') { e.preventDefault(); setupLevel(state.levelIdx); return; }
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
          color: ['#dc5a5a', '#468cdc', '#5ab464', '#c8a040', '#b070d0', '#ddb05a'][Math.floor(Math.random() * 6)],
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
      showMsg(`Not quite — check ${wrongs.map(w => w[0].toUpperCase() + w.slice(1)).join(', ')}.`, 'error');
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
      <div class="sub">all 8 levels balanced ⚖️</div>
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
  document.getElementById('reset-btn').addEventListener('click', () => setupLevel(state.levelIdx));
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
    // Parchment gradient
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#f8eed0');
    g.addColorStop(0.5, '#f4e8c8');
    g.addColorStop(1, '#ead5a8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // Soft vignette
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.65);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(43, 36, 24, 0.18)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    // Subtle paper texture (dots)
    ctx.fillStyle = 'rgba(43, 36, 24, 0.05)';
    for (let i = 0; i < 80; i++) {
      const x = (i * 73 % W);
      const y = (i * 137 % H);
      ctx.fillRect(x, y, 1, 1);
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
      drawClueScale(L.clues[i], cy, slotH, tilt, i);
    }
  }

  function drawClueScale(clue, cy, height, tilt, idx) {
    const [items, rightVal] = clue;
    const beamLen = Math.min(W * 0.7, 720);
    const beamCx = W / 2;
    const beamY = cy;
    const beamThick = clamp(height * 0.06, 8, 14);
    // Stand
    ctx.fillStyle = '#6b4e2a';
    ctx.strokeStyle = '#2b2418';
    ctx.lineWidth = 3;
    // Base
    const standBaseW = 60, standBaseH = 12;
    ctx.beginPath();
    ctx.rect(beamCx - standBaseW / 2, beamY + height * 0.35, standBaseW, standBaseH);
    ctx.fill(); ctx.stroke();
    // Stem
    const stemW = 12;
    ctx.beginPath();
    ctx.rect(beamCx - stemW / 2, beamY - height * 0.15, stemW, height * 0.5);
    ctx.fill(); ctx.stroke();
    // Pivot
    ctx.fillStyle = '#ddb05a';
    ctx.beginPath();
    ctx.arc(beamCx, beamY, 8, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Beam (tilted)
    ctx.save();
    ctx.translate(beamCx, beamY);
    ctx.rotate(tilt);
    // Beam body
    ctx.fillStyle = '#8b6334';
    ctx.strokeStyle = '#2b2418';
    ctx.lineWidth = 3;
    roundRect(-beamLen / 2, -beamThick / 2, beamLen, beamThick, 4);
    ctx.fill(); ctx.stroke();
    // End caps
    ctx.fillStyle = '#6b4e2a';
    ctx.fillRect(-beamLen / 2 - 6, -beamThick / 2 - 2, 10, beamThick + 4);
    ctx.fillRect(beamLen / 2 - 4, -beamThick / 2 - 2, 10, beamThick + 4);
    ctx.strokeRect(-beamLen / 2 - 6, -beamThick / 2 - 2, 10, beamThick + 4);
    ctx.strokeRect(beamLen / 2 - 4, -beamThick / 2 - 2, 10, beamThick + 4);
    // Chains from each end down to pans
    const chainLen = height * 0.32;
    drawChain(-beamLen / 2, beamThick / 2, -beamLen / 2, chainLen);
    drawChain(beamLen / 2, beamThick / 2, beamLen / 2, chainLen);
    // Left pan: shapes
    drawPan(-beamLen / 2, chainLen, items, true);
    // Right pan: number
    drawPan(beamLen / 2, chainLen, rightVal, false);
    ctx.restore();

    // Clue label
    ctx.fillStyle = 'rgba(43, 36, 24, 0.5)';
    ctx.font = 'bold 12px "Fredoka", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Clue ${idx + 1}`, 20, beamY - height * 0.4);

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

  function drawChain(x1, y1, x2, y2) {
    ctx.strokeStyle = '#2b2418';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    // Chain links (small ovals along the line)
    const n = 4;
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const x = lerp(x1, x2, t);
      const y = lerp(y1, y2, t);
      ctx.fillStyle = '#cfa867';
      ctx.beginPath();
      ctx.ellipse(x, y, 2.5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPan(cx, cy, content, isShapes) {
    const panW = 110;
    const panH = 12;
    // Pan body (semi-bowl)
    ctx.fillStyle = '#cfa867';
    ctx.strokeStyle = '#2b2418';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - panW / 2, cy);
    ctx.lineTo(cx - panW / 2 + 6, cy + panH);
    ctx.lineTo(cx + panW / 2 - 6, cy + panH);
    ctx.lineTo(cx + panW / 2, cy);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Pan top edge
    ctx.strokeStyle = '#8a6a30';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - panW / 2 + 2, cy);
    ctx.lineTo(cx + panW / 2 - 2, cy);
    ctx.stroke();

    // Contents
    if (isShapes) {
      // Lay out shapes on top
      const flatItems = [];
      for (const [sym, n] of content) {
        for (let i = 0; i < n; i++) flatItems.push(sym);
      }
      const itemSize = 22;
      const totalW = flatItems.length * (itemSize + 4) - 4;
      let startX = cx - totalW / 2;
      for (let i = 0; i < flatItems.length; i++) {
        const x = startX + i * (itemSize + 4) + itemSize / 2;
        drawCanvasSymbol(flatItems[i], x, cy - itemSize / 2 - 4, itemSize);
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
    const s = SYMBOLS[sym];
    const r = size / 2;
    // Body
    ctx.fillStyle = s.color;
    ctx.strokeStyle = '#2b2418';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    if (sym === 'circle') {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    } else if (sym === 'square') {
      roundRect(cx - r, cy - r, size, size, 3);
      ctx.fill(); ctx.stroke();
    } else if (sym === 'triangle') {
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy + r * 0.85);
      ctx.lineTo(cx - r, cy + r * 0.85);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    } else if (sym === 'diamond') {
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r, cy);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    } else if (sym === 'star') {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 === 0 ? r : r * 0.45;
        const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
        pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
      }
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        if (i === 0) ctx.moveTo(pts[i][0], pts[i][1]);
        else ctx.lineTo(pts[i][0], pts[i][1]);
      }
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    // Eyes (cute personality)
    const ey = sym === 'triangle' ? cy + r * 0.1 : cy - r * 0.1;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx - r * 0.25, ey, r * 0.18, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.25, ey, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2b2418';
    ctx.beginPath();
    ctx.arc(cx - r * 0.22, ey + 1, r * 0.09, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.28, ey + 1, r * 0.09, 0, Math.PI * 2);
    ctx.fill();
  }

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
