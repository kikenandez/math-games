// =====================================================================
// BEE BUZZ SAYS — honeycomb Simon for memory + dyslexia letter drill.
// A bee hops a growing trail of letters across a honeycomb; retrace it
// by tapping letters on the keypad. Each letter has a FIXED tone (and an
// optional fixed color) so the audiovisual association reinforces.
// Pure logic lives in core.js (window.BBSCore). UI localized EN/FR/ES.
// =====================================================================
(() => {
  const C = window.BBSCore;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.floor(W * DPR); canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    layoutBoard();
  }
  window.addEventListener('resize', resize);

  // ===== Localization =====
  const supported = ['en', 'fr', 'es'];
  const stored = localStorage.getItem('mathArcadeLang');
  const param = new URLSearchParams(location.search).get('lang');
  const LANG = supported.includes(param) ? param : (supported.includes(stored) ? stored : 'en');
  const STR = {
    en: {
      titleAcc: 'BEE BUZZ', titleRest: ' SAYS',
      sub: 'watch the bee — then tap the letters back in order',
      intro: "A bee buzzes from cell to cell, lighting up a letter each time. <b>Tap the same letters in the same order</b> on the keypad. Each round adds one more. Listen — every letter has its own buzz. Three slip-ups and the swarm rests.",
      start: 'START', playAgain: 'PLAY AGAIN', note: 'Practice game — not a diagnosis.',
      tapWhat: 'Tap the letters you saw', hint: 'tap them in order on the comb keypad',
      watch: 'WATCH…', recall: 'YOUR TURN!',
      score: 'Score', level: 'Level', best: 'Best', strikes: 'Strikes',
      correct: 'PERFECT!', wrong: 'OOPS', tooSlow: 'TOO SLOW',
      gameAcc: 'SWARM', gameRest: ' RESTS', tooMany: 'too many slip-ups!',
      maxLen: 'Best trail', tweaks: 'Tweaks', difficulty: 'Difficulty',
      easy: 'EASY', normal: 'NORMAL', hard: 'HARD', age: 'Child age',
      color: 'Color cues', on: 'ON', off: 'OFF', reversals: 'b/d/p/q',
    },
    fr: {
      titleAcc: "L’ABEILLE", titleRest: ' DIT',
      sub: "regarde l’abeille — puis retape les lettres dans l’ordre",
      intro: "Une abeille passe de cellule en cellule et allume une lettre à chaque fois. <b>Tape les mêmes lettres dans le même ordre</b> sur le clavier. Chaque manche en ajoute une. Écoute — chaque lettre a son propre bourdonnement. Trois erreurs et l’essaim se repose.",
      start: 'JOUER', playAgain: 'REJOUER', note: "Jeu d’entraînement — pas un diagnostic.",
      tapWhat: 'Tape les lettres vues', hint: "tape-les dans l’ordre sur le clavier",
      watch: 'REGARDE…', recall: 'À TOI !',
      score: 'Score', level: 'Niveau', best: 'Record', strikes: 'Erreurs',
      correct: 'PARFAIT !', wrong: 'RATÉ', tooSlow: 'TROP LENT',
      gameAcc: "L’ESSAIM", gameRest: ' SE REPOSE', tooMany: "trop d’erreurs !",
      maxLen: 'Meilleure série', tweaks: 'Réglages', difficulty: 'Difficulté',
      easy: 'FACILE', normal: 'NORMAL', hard: 'DIFFICILE', age: "Âge de l’enfant",
      color: 'Couleurs', on: 'OUI', off: 'NON', reversals: 'b/d/p/q',
    },
    es: {
      titleAcc: 'LA ABEJA', titleRest: ' DICE',
      sub: 'mira a la abeja — luego toca las letras en orden',
      intro: "Una abeja salta de celda en celda y enciende una letra cada vez. <b>Toca las mismas letras en el mismo orden</b> en el teclado. Cada ronda añade una más. Escucha — cada letra tiene su propio zumbido. Tres fallos y el enjambre descansa.",
      start: 'JUGAR', playAgain: 'JUGAR OTRA VEZ', note: 'Juego de práctica — no es un diagnóstico.',
      tapWhat: 'Toca las letras que viste', hint: 'tócalas en orden en el teclado',
      watch: 'MIRA…', recall: '¡TU TURNO!',
      score: 'Puntos', level: 'Nivel', best: 'Récord', strikes: 'Fallos',
      correct: '¡PERFECTO!', wrong: 'UPS', tooSlow: 'MUY LENTO',
      gameAcc: 'EL ENJAMBRE', gameRest: ' DESCANSA', tooMany: '¡demasiados fallos!',
      maxLen: 'Mejor serie', tweaks: 'Ajustes', difficulty: 'Dificultad',
      easy: 'FÁCIL', normal: 'NORMAL', hard: 'DIFÍCIL', age: 'Edad del niño',
      color: 'Colores', on: 'SÍ', off: 'NO', reversals: 'b/d/p/q',
    },
  };
  const T = STR[LANG];
  function applyStaticText() {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    document.getElementById('title-h1').innerHTML = `<span class="acc">${T.titleAcc}</span>${T.titleRest}`;
    set('title-sub', T.sub);
    document.getElementById('title-p').innerHTML = T.intro;
    set('start-btn', T.start); set('title-note', T.note);
    set('lcd-label', T.tapWhat); set('lcd-hint', T.hint);
    set('lbl-score', T.score); set('lbl-level', T.level); set('lbl-best', T.best); set('lbl-strikes', T.strikes);
    set('tw-title', T.tweaks); set('tw-diff', T.difficulty);
    set('tw-easy', T.easy); set('tw-normal', T.normal); set('tw-hard', T.hard);
    set('tw-age', T.age); set('tw-color', T.color); set('tw-color-on', T.on); set('tw-color-off', T.off);
  }

  const TWEAKS = /*EDITMODE-BEGIN*/{
    "difficulty": "normal",
    "age": "",
    "colorCues": false
  }/*EDITMODE-END*/;

  const rand = (min, max) => Math.random() * (max - min) + min;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const state = {
    phase: 'title',            // title | watch | input | resolve | level_clear | game_over
    score: 0,
    best: parseInt(localStorage.getItem('beebuzzsays_best') || '0', 10) || 0,
    level: 1,
    strikes: 0,
    maxStrikes: 3,
    seq: [],                   // [{letter, cell}]
    typed: [],                 // [letter]
    cells: [],                 // honeycomb cells: {q,r,x,y}
    keypad: [],                // tiles: {letter,x,y,w,h}
    activeLetters: [],
    radius: 2,
    hexSize: 40,
    watchIndex: -1, watchTimer: 0, flashCell: -1,
    inputTimer: 0,
    floaters: [], particles: [],
    shake: 0, shakeX: 0, shakeY: 0, elapsed: 0,
  };

  const metrics = newMetrics();
  function newMetrics() {
    return { rounds: 0, correct: 0, mirrorConfusions: 0, wrongTaps: 0, maxSpan: 0, spanAttempts: {} };
  }
  function recordSpan(len, ok) {
    const s = metrics.spanAttempts[len] || { ok: 0, fail: 0 };
    if (ok) { s.ok++; if (len > metrics.maxSpan) metrics.maxSpan = len; } else s.fail++;
    metrics.spanAttempts[len] = s;
  }

  function colorOn() { return TWEAKS.colorCues === true || TWEAKS.colorCues === 'on'; }
  function letterColor(ch) { return colorOn() ? (C.LETTER_COLOR[ch] || '#ffe0a0') : '#f3d9a6'; }

  function layoutBoard() {
    state.radius = C.gridRadius(TWEAKS.difficulty, TWEAKS.age);
    state.activeLetters = C.keypadLetters(TWEAKS.difficulty);
    // Honeycomb sizing: fit the grid in the upper ~62% of the screen.
    const span = state.radius * 2 + 1;
    const avail = Math.min(W * 0.9, H * 0.62);
    state.hexSize = clamp(avail / (span * 1.6), 26, 64);
    const cx = W / 2, cy = H * 0.40;
    state.cells = C.axialCells(state.radius).map((c) => {
      const p = C.axialToPixel(c, state.hexSize);
      return { q: c.q, r: c.r, x: cx + p.x, y: cy + p.y };
    });
    // Keypad: a centered row (wraps to 2 rows if many letters) near the bottom.
    const letters = state.activeLetters;
    const perRow = letters.length <= 6 ? letters.length : Math.ceil(letters.length / 2);
    const tileW = clamp(W / (perRow + 1.5), 44, 78), tileH = tileW;
    const gap = tileW * 0.22;
    const rows = Math.ceil(letters.length / perRow);
    const baseY = H * 0.74;
    state.keypad = letters.map((ch, i) => {
      const row = Math.floor(i / perRow), col = i % perRow;
      const countThisRow = Math.min(perRow, letters.length - row * perRow);
      const rowW = countThisRow * tileW + (countThisRow - 1) * gap;
      const x0 = W / 2 - rowW / 2;
      return { letter: ch, x: x0 + col * (tileW + gap), y: baseY + row * (tileH + gap), w: tileW, h: tileH };
    });
    void rows;
  }

  function hexPath(cx, cy, size) {
    const pts = C.hexCorners(cx, cy, size);
    ctx.beginPath();
    pts.forEach((p, i) => { i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
    ctx.closePath();
  }

  function drawBg() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#f6b73c'); g.addColorStop(0.55, '#e89a2a'); g.addColorStop(1, '#caa05a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  function drawHoneycomb() {
    for (let i = 0; i < state.cells.length; i++) {
      const cell = state.cells[i];
      const isFlash = state.phase === 'watch' && state.flashCell === i;
      // While retracing (and through the short resolve pause), reveal the letters
      // already typed correctly in their honeycomb cells with their order number
      // (most recent wins if a cell repeats). Keeping them through 'level_clear'
      // lets the final letter land in the honey before the round resolves.
      let revealed = null, revealOrd = -1;
      if (state.phase === 'input' || state.phase === 'level_clear') {
        for (let k = 0; k < state.typed.length; k++) {
          if (state.seq[k] && state.seq[k].cell === i) { revealed = state.seq[k].letter; revealOrd = k + 1; }
        }
      }
      const letter = isFlash ? state.seq[state.watchIndex].letter : revealed;
      const lit = isFlash || revealed !== null;
      hexPath(cell.x, cell.y, state.hexSize * 0.94);
      ctx.fillStyle = lit ? (colorOn() ? letterColor(letter) : '#fff2c4') : '#caa44e';
      ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = '#7a531a'; ctx.stroke();
      // waxy inner ring
      hexPath(cell.x, cell.y, state.hexSize * 0.72);
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(122,83,26,0.35)'; ctx.stroke();
      if (lit) {
        ctx.fillStyle = colorOn() ? '#241500' : '#3a2410';
        ctx.font = `bold ${Math.round(state.hexSize * 1.0)}px "Lilita One", sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(letter, cell.x, cell.y + 2);
        // order badge in the honey while retracing
        if (revealOrd > 0) {
          ctx.font = `bold ${Math.round(state.hexSize * 0.4)}px "Lilita One", sans-serif`;
          ctx.fillStyle = '#7a531a';
          ctx.fillText(String(revealOrd), cell.x - state.hexSize * 0.5, cell.y - state.hexSize * 0.5);
        }
        // bee hovers ABOVE the cell so it never hides the letter
        if (isFlash) drawBee(cell.x, cell.y - state.hexSize * 1.15, state.hexSize * 0.5);
      }
    }
  }

  function drawBee(x, y, s) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#2a1a05'; ctx.strokeStyle = '#2a1a05'; ctx.lineWidth = 2;
    // body
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.55, s * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffcf3a'; ctx.fill(); ctx.stroke();
    // stripes
    ctx.fillStyle = '#2a1a05';
    ctx.fillRect(-s * 0.12, -s * 0.4, s * 0.12, s * 0.8);
    ctx.fillRect(s * 0.12, -s * 0.35, s * 0.1, s * 0.7);
    // wings
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.ellipse(-s * 0.1, -s * 0.45, s * 0.3, s * 0.18, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawKeypad() {
    const active = state.phase === 'input';
    for (const t of state.keypad) {
      const r = 10;
      roundRect(t.x, t.y, t.w, t.h, r);
      ctx.fillStyle = colorOn() ? letterColor(t.letter) : '#fff2c4';
      ctx.globalAlpha = active ? 1 : 0.5; ctx.fill(); ctx.globalAlpha = 1;
      ctx.lineWidth = 3; ctx.strokeStyle = '#7a531a'; ctx.stroke();
      ctx.fillStyle = colorOn() ? '#241500' : '#3a2410';
      ctx.font = `bold ${Math.round(t.h * 0.6)}px "Lilita One", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.globalAlpha = active ? 1 : 0.5;
      ctx.fillText(t.letter, t.x + t.w / 2, t.y + t.h / 2 + 2);
      ctx.globalAlpha = 1;
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }

  function draw() {
    ctx.save(); ctx.translate(state.shakeX, state.shakeY);
    drawBg(); drawHoneycomb(); drawKeypad(); drawParticles(); drawFloaters();
    ctx.restore();
  }
  function drawParticles() {
    for (const p of state.particles) {
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1); ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); ctx.globalAlpha = 1;
    }
  }
  function drawFloaters() {
    for (const f of state.floaters) {
      const t = f.t / f.dur, a = 1 - t, sc = 1 + (1 - Math.min(1, t * 3)) * 0.4;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(f.x, f.y); ctx.scale(sc, sc);
      ctx.font = 'bold 44px "Lilita One", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 5; ctx.strokeStyle = '#3a2410'; ctx.strokeText(f.text, 0, 0);
      ctx.fillStyle = f.color; ctx.fillText(f.text, 0, 0); ctx.restore();
    }
  }

  function update(dt) {
    state.elapsed += dt;
    for (const f of state.floaters) { f.t += dt; f.y -= 30 * dt; }
    state.floaters = state.floaters.filter(f => f.t < f.dur);
    for (const p of state.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.gravity ?? 200) * dt; p.life -= dt; }
    state.particles = state.particles.filter(p => p.life > 0);
    if (state.shake > 0) { state.shake = Math.max(0, state.shake - dt * 3); state.shakeX = (Math.random() - 0.5) * state.shake * 12; state.shakeY = (Math.random() - 0.5) * state.shake * 12; }
    else { state.shakeX = state.shakeY = 0; }
    updatePhase(dt);
  }
  // ----- timing helpers (scale with difficulty + age) -----
  function flashGap() {
    let g = 0.62;
    if (TWEAKS.difficulty === 'easy') g *= 1.4;
    if (TWEAKS.difficulty === 'hard') g *= 0.72;
    const a = parseInt(TWEAKS.age, 10); if (!Number.isNaN(a) && a <= 7) g *= 1.25;
    return g;
  }
  function inputBudget() {
    let s = 3.0;
    if (TWEAKS.difficulty === 'easy') s *= 1.5;
    if (TWEAKS.difficulty === 'hard') s *= 0.7;
    const a = parseInt(TWEAKS.age, 10); if (!Number.isNaN(a) && a <= 7) s *= 1.3;
    return s;
  }

  function startGame() {
    state.score = 0; state.level = 1; state.strikes = 0;
    Object.assign(metrics, newMetrics());
    state.seq = []; state.typed = [];
    layoutBoard();
    document.getElementById('overlay').classList.add('hidden');
    growAndWatch();
  }

  function growAndWatch() {
    const step = C.growTrail(state.seq, state.activeLetters, state.cells.length, Math.random);
    state.seq = state.seq.concat([step]);
    state.level = state.seq.length;
    updateHUD();
    beginWatch();
  }

  function beginWatch() {
    state.phase = 'watch'; state.typed = [];
    state.watchIndex = -1; state.flashCell = -1; state.watchTimer = 0.4;
    updateAnswerDisplay();
    showFloater(T.watch, '#3a2410', -H * 0.30);
  }

  function beginInput() {
    state.phase = 'input'; state.flashCell = -1;
    state.inputTimer = inputBudget();
    showFloater(T.recall, '#ffaa00', -H * 0.30);
  }

  function updatePhase(dt) {
    if (state.phase === 'watch') {
      state.watchTimer -= dt;
      if (state.watchTimer <= 0) {
        state.watchIndex++;
        if (state.watchIndex >= state.seq.length) { beginInput(); return; }
        const step = state.seq[state.watchIndex];
        state.flashCell = step.cell;
        window.MathArcadeAudio?.note(C.LETTER_FREQ[step.letter]);
        state.watchTimer = flashGap();
      } else if (state.watchTimer < flashGap() * 0.45) {
        state.flashCell = -1; // dark gap between flashes
      }
    } else if (state.phase === 'input') {
      state.inputTimer -= dt;
      if (state.inputTimer <= 0) registerMiss('slow');
    }
  }

  function pressLetter(ch) {
    if (state.phase !== 'input') return;
    window.MathArcadeAudio?.note(C.LETTER_FREQ[ch]); // always hear what you pressed
    const idx = state.typed.length;
    const res = C.checkTap(state.seq, idx, ch);
    if (!res.ok) {
      metrics.wrongTaps++;
      if (res.mirror) metrics.mirrorConfusions++;
      registerMiss('wrong');
      return;
    }
    state.typed.push(ch);
    state.inputTimer = inputBudget();
    updateAnswerDisplay();
    flashTile(ch, '#5cd97a');
    if (C.isComplete(state.seq, state.typed)) resolveCorrect();
  }

  function registerMiss(reason) {
    metrics.rounds++;
    recordSpan(state.seq.length, false);
    state.strikes++;
    state.shake = Math.min(0.5, state.shake + 0.3);
    window.MathArcadeAudio?.wrong();
    showFloater(reason === 'slow' ? T.tooSlow : T.wrong, '#ff5c7c', -H * 0.30);
    updateHUD();
    if (state.strikes >= state.maxStrikes) { gameOver(T.tooMany); return; }
    state.phase = 'level_clear';
    setTimeout(() => { if (state.phase === 'level_clear') beginWatch(); }, 1100); // retry SAME trail
  }

  function resolveCorrect() {
    metrics.rounds++; metrics.correct++;
    recordSpan(state.seq.length, true);
    const pts = 50 + state.seq.length * 20 + state.level * 10;
    state.score += pts;
    burst(W / 2, H * 0.40, '#ffd24d');
    showFloater(`${T.correct}  +${pts}`, '#5cd97a', -H * 0.30);
    window.MathArcadeAudio?.levelClear();
    updateHUD();
    state.phase = 'level_clear';
    setTimeout(() => { if (state.phase === 'level_clear') growAndWatch(); }, 1100);
  }

  function flashTile(ch, color) {
    const t = state.keypad.find(k => k.letter === ch); if (!t) return;
    burst(t.x + t.w / 2, t.y + t.h / 2, color);
  }

  function gameOver(reason) {
    state.phase = 'game_over';
    if (state.score > state.best) { state.best = state.score; localStorage.setItem('beebuzzsays_best', String(state.best)); }
    const summary = saveMetrics();
    window.MathArcadeAudio?.gameOver();
    const overlay = document.getElementById('overlay');
    overlay.querySelector('.card')?.remove();
    const card = document.createElement('div'); card.className = 'card';
    const revPct = summary.wrongTaps ? Math.round((summary.mirrorConfusions / summary.wrongTaps) * 100) : 0;
    card.innerHTML = `
      <h1><span class="acc">${T.gameAcc}</span>${T.gameRest}</h1>
      <div class="sub">${reason}</div>
      <div class="stats-row">
        <div class="stat-chip"><div class="stat-label">${T.score}</div><div class="stat-val">${state.score}</div></div>
        <div class="stat-chip hi"><div class="stat-label">${T.maxLen}</div><div class="stat-val">${summary.maxSpan}</div></div>
        <div class="stat-chip"><div class="stat-label">${T.best}</div><div class="stat-val">${state.best}</div></div>
      </div>
      <div class="stats-row">
        <div class="stat-chip"><div class="stat-label">${T.reversals}</div><div class="stat-val">${revPct}%</div></div>
      </div>
      <button class="big-btn" id="restart-btn">${T.playAgain}</button>
      <div class="note">${T.note}</div>`;
    overlay.appendChild(card); overlay.classList.remove('hidden');
    document.getElementById('restart-btn').addEventListener('click', startGame);
  }

  function saveMetrics() {
    const summary = {
      date: new Date().toISOString(), lang: LANG, age: TWEAKS.age || null,
      difficulty: TWEAKS.difficulty, colorCues: colorOn(),
      level: state.level, score: state.score,
      rounds: metrics.rounds, correct: metrics.correct, strikes: state.strikes,
      maxSpan: metrics.maxSpan, spanAttempts: metrics.spanAttempts,
      mirrorConfusions: metrics.mirrorConfusions, wrongTaps: metrics.wrongTaps,
      reversalRate: metrics.wrongTaps ? +(metrics.mirrorConfusions / metrics.wrongTaps).toFixed(3) : 0,
    };
    try {
      const key = 'dyslexiaScreening.beebuzzsays';
      const store = JSON.parse(localStorage.getItem(key) || '{"history":[]}');
      store.lastSession = summary;
      store.history = (store.history || []).concat([summary]).slice(-50);
      localStorage.setItem(key, JSON.stringify(store));
    } catch (e) { /* storage unavailable — game still playable */ }
    return summary;
  }
  window.DyslexiaScreening = window.DyslexiaScreening || {};
  window.DyslexiaScreening.beebuzzsays = () => {
    try { return JSON.parse(localStorage.getItem('dyslexiaScreening.beebuzzsays') || 'null'); }
    catch (e) { return null; }
  };

  function updateAnswerDisplay() {
    const el = document.getElementById('ans-val');
    if (!state.typed.length) { el.classList.add('empty'); el.innerHTML = '<span class="cursor">_</span>'; }
    else { el.classList.remove('empty'); el.innerHTML = `${state.typed.join(' ')}<span class="cursor">|</span>`; }
  }
  function showFloater(text, color, dy) { state.floaters.push({ x: W / 2, y: H * 0.5 + (dy || 0), text, color, t: 0, dur: 1.2 }); }
  function burst(x, y, color) {
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, sp = rand(120, 260);
      state.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: rand(0.5, 0.9), maxLife: 0.9, size: rand(3, 7), color: i % 2 ? color : '#fff2c4', gravity: 320 });
    }
  }

  // ----- input wiring -----
  function canvasPoint(e) {
    const r = canvas.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    return { x: cx, y: cy };
  }
  function hitKeypad(pt) {
    return state.keypad.find(t => pt.x >= t.x && pt.x <= t.x + t.w && pt.y >= t.y && pt.y <= t.y + t.h);
  }
  canvas.addEventListener('pointerdown', (e) => {
    if (state.phase === 'title' || state.phase === 'game_over') return;
    const tile = hitKeypad(canvasPoint(e));
    if (tile) { e.preventDefault(); pressLetter(tile.letter); }
  });
  window.addEventListener('keydown', (e) => {
    if (state.phase === 'title' || state.phase === 'game_over') {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startGame(); }
      return;
    }
    if (/^[a-zA-Z]$/.test(e.key)) {
      const ch = e.key.toLowerCase();
      if (state.activeLetters.includes(ch)) { e.preventDefault(); pressLetter(ch); }
    }
  });
  document.getElementById('start-btn').addEventListener('click', startGame);

  applyStaticText();
  updateHUD();

  function updateHUD() {
    document.getElementById('score').textContent = state.score;
    document.getElementById('level').textContent = state.level;
    document.getElementById('best').textContent = state.best;
    document.getElementById('strikes').textContent =
      '✕'.repeat(state.strikes) + '○'.repeat(Math.max(0, state.maxStrikes - state.strikes));
  }

  // Expose a read-only probe for scripted checks.
  window.__bbs = () => ({
    phase: state.phase, seq: state.seq.map(s => s.letter), typed: state.typed.slice(),
    span: state.seq.length, level: state.level, strikes: state.strikes,
  });

  function setupTweaks() {
    const wire = (rowId, key, isToggle) => {
      const row = document.getElementById(rowId);
      if (!row) return;
      row.querySelectorAll('.opt').forEach(opt => {
        const v = opt.dataset.value;
        const cur = isToggle ? (colorOn() ? 'on' : 'off') : String(TWEAKS[key]);
        opt.classList.toggle('active', v === cur);
        opt.addEventListener('click', () => {
          if (isToggle) TWEAKS[key] = (v === 'on');
          else TWEAKS[key] = (TWEAKS[key] === v && key === 'age') ? '' : v;
          const now = isToggle ? (colorOn() ? 'on' : 'off') : String(TWEAKS[key]);
          row.querySelectorAll('.opt').forEach(o => o.classList.toggle('active', o.dataset.value === now));
          persistTweaks();
          layoutBoard();
        });
      });
    };
    wire('diff-row', 'difficulty', false);
    wire('age-row', 'age', false);
    wire('color-row', 'colorCues', true);
    document.getElementById('tweaks-close').addEventListener('click', () => { hideTweaks(); try { window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*'); } catch (e) {} });
    document.getElementById('gear-btn').addEventListener('click', () => {
      const open = document.getElementById('tweaks').classList.contains('open');
      if (open) { hideTweaks(); try { window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*'); } catch (e) {} } else showTweaks();
    });
  }
  function persistTweaks() { try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { ...TWEAKS } }, '*'); } catch (e) {} }
  function showTweaks() { document.getElementById('tweaks').classList.add('open'); }
  function hideTweaks() { document.getElementById('tweaks').classList.remove('open'); }
  window.addEventListener('message', (e) => {
    const d = e.data; if (!d || typeof d !== 'object') return;
    if (d.type === '__activate_edit_mode') showTweaks();
    if (d.type === '__deactivate_edit_mode') hideTweaks();
  });
  setupTweaks();
  try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch (e) {}

  resize();
  let lastTime = performance.now();
  function loop(now) {
    let dt = (now - lastTime) / 1000; lastTime = now; if (dt > 0.1) dt = 0.1;
    update(dt); draw(); requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) lastTime = performance.now() - 16; });
  requestAnimationFrame(loop);
})();
