// =====================================================================
// RECALL CRATES — Retro Arcade Dyslexia Screener (Phase 2)
// Circus cargo shell: a crate of letters opens briefly, snaps shut, and
// falls. Type the letters back IN ORDER before it lands.
// Trains + measures: phonological / visual working memory (max span) and
// SEQUENCING — right letters in the wrong order (the was/saw signature).
// All metrics stay local on the player's machine (no network).
// Companion to PARATROOPERS + LETTER WHACK. UI localized EN / FR / ES.
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

  // ===== Localization (self-contained; canvas text is never DOM-translated) =====
  const supported = ['en', 'fr', 'es'];
  const stored = localStorage.getItem('mathArcadeLang');
  const param = new URLSearchParams(location.search).get('lang');
  const LANG = supported.includes(param) ? param : (supported.includes(stored) ? stored : 'en');

  const STR = {
    en: {
      titleAcc: 'RECALL', titleRest: ' CRATES',
      sub: 'remember the letters — type them back in order',
      intro: "A crate of letters opens for a moment, then snaps shut and falls. <b>Type the letters in the same order</b> you saw them, before the crate lands. Each round it remembers one more letter. Watch for tricky look-alikes like <b>b d p q</b>. Three crates dropped and the show's over.",
      start: 'START', playAgain: 'PLAY AGAIN', note: 'Practice game — not a diagnosis.',
      typeWhat: 'Type what you saw', hint: 'type the letters in order · Backspace to fix',
      watch: 'WATCH…', recall: 'NOW TYPE!',
      score: 'Score', level: 'Level', span: 'Length', misses: 'Misses', best: 'Best',
      correct: 'PERFECT!', orderErr: 'WRONG ORDER', wrong: 'NOPE', dropped: 'DROPPED!',
      gameAcc: 'SHOW', gameRest: ' OVER', tooMany: 'too many crates dropped!',
      maxLen: 'Best length', tweaks: 'Tweaks', difficulty: 'Difficulty',
      easy: 'EASY', normal: 'NORMAL', hard: 'HARD', age: 'Child age',
      bigTop: 'Big top', day: 'DAY', night: 'NIGHT',
      ht1: 'PEEK', hd1: 'A crate opens for a moment.',
      ht2: 'SHUT', hd2: 'It snaps closed and falls.',
      ht3: 'TYPE', hd3: 'Type them back, in order.',
      warn: "Watch for tricky look-alikes like <b>b d p q</b>. Three crates dropped and the show's over.",
    },
    fr: {
      titleAcc: 'RAPPELLE', titleRest: '-CAISSES',
      sub: 'mémorise les lettres — retape-les dans l’ordre',
      intro: "Une caisse de lettres s'ouvre un instant, puis se referme et tombe. <b>Tape les lettres dans le même ordre</b> que tu les as vues, avant que la caisse atterrisse. À chaque manche, une lettre de plus. Attention aux sosies comme <b>b d p q</b>. Trois caisses tombées et le spectacle est fini.",
      start: 'JOUER', playAgain: 'REJOUER', note: "Jeu d'entraînement — pas un diagnostic.",
      typeWhat: 'Tape ce que tu as vu', hint: 'tape les lettres dans l’ordre · Retour pour corriger',
      watch: 'REGARDE…', recall: 'TAPE !',
      score: 'Score', level: 'Niveau', span: 'Longueur', misses: 'Erreurs', best: 'Record',
      correct: 'PARFAIT !', orderErr: 'MAUVAIS ORDRE', wrong: 'NON', dropped: 'TOMBÉE !',
      gameAcc: 'FIN', gameRest: ' DU SPECTACLE', tooMany: 'trop de caisses tombées !',
      maxLen: 'Longueur max', tweaks: 'Réglages', difficulty: 'Difficulté',
      easy: 'FACILE', normal: 'NORMAL', hard: 'DIFFICILE', age: "Âge de l'enfant",
      bigTop: 'Chapiteau', day: 'JOUR', night: 'NUIT',
      ht1: 'REGARDE', hd1: 'Une caisse s’ouvre un instant.',
      ht2: 'FERME', hd2: 'Elle se referme et tombe.',
      ht3: 'TAPE', hd3: 'Retape-les dans l’ordre.',
      warn: "Attention aux sosies comme <b>b d p q</b>. Trois caisses tombées et le spectacle est fini.",
    },
    es: {
      titleAcc: 'RECUERDA', titleRest: ' CAJAS',
      sub: 'recuerda las letras — escríbelas en orden',
      intro: "Una caja de letras se abre un momento, luego se cierra y cae. <b>Escribe las letras en el mismo orden</b> que las viste, antes de que la caja aterrice. Cada ronda recuerda una letra más. Cuidado con las parecidas como <b>b d p q</b>. Tres cajas caídas y se acabó el espectáculo.",
      start: 'JUGAR', playAgain: 'JUGAR OTRA VEZ', note: 'Juego de práctica — no es un diagnóstico.',
      typeWhat: 'Escribe lo que viste', hint: 'escribe las letras en orden · Retroceso para corregir',
      watch: 'MIRA…', recall: '¡ESCRIBE!',
      score: 'Puntos', level: 'Nivel', span: 'Longitud', misses: 'Fallos', best: 'Récord',
      correct: '¡PERFECTO!', orderErr: 'ORDEN INCORRECTO', wrong: 'NO', dropped: '¡CAYÓ!',
      gameAcc: 'FIN', gameRest: ' DEL JUEGO', tooMany: '¡demasiadas cajas caídas!',
      maxLen: 'Longitud máx', tweaks: 'Ajustes', difficulty: 'Dificultad',
      easy: 'FÁCIL', normal: 'NORMAL', hard: 'DIFÍCIL', age: 'Edad del niño',
      bigTop: 'Carpa', day: 'DÍA', night: 'NOCHE',
      ht1: 'MIRA', hd1: 'Una caja se abre un instante.',
      ht2: 'CIERRA', hd2: 'Se cierra de golpe y cae.',
      ht3: 'ESCRIBE', hd3: 'Reescríbelas en orden.',
      warn: "Cuidado con las parecidas como <b>b d p q</b>. Tres cajas caídas y se acabó el espectáculo.",
    },
  };
  const T = STR[LANG];
  function applyStaticText() {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    document.getElementById('title-h1').innerHTML = `<span class="acc">${T.titleAcc}</span>${T.titleRest}`;
    set('title-sub', T.sub);
    set('start-btn', T.start);
    set('title-note', T.note);
    set('lcd-label', T.typeWhat); set('lcd-hint', T.hint);
    set('lbl-score', T.score); set('lbl-level', T.level);
    set('lbl-span', T.span); set('lbl-misses', T.misses);
    set('tw-title', T.tweaks); set('tw-diff', T.difficulty);
    set('tw-easy', T.easy); set('tw-normal', T.normal); set('tw-hard', T.hard);
    set('tw-age', T.age);
    set('tw-bigtop', T.bigTop); set('tw-day', T.day); set('tw-night', T.night);
    set('how1-t', T.ht1); set('how1-d', T.hd1);
    set('how2-t', T.ht2); set('how2-d', T.hd2);
    set('how3-t', T.ht3); set('how3-d', T.hd3);
    const tp = document.getElementById('title-p'); if (tp) tp.innerHTML = T.warn;
  }

  const TWEAKS = /*EDITMODE-BEGIN*/{
    "difficulty": "normal",
    "age": "",
    "theme": "day"
  }/*EDITMODE-END*/;

  // ===== Letter pool (reversal-prone letters seeded in for the dyslexia signal) =====
  const REVERSAL_CORE = ['b', 'd', 'p', 'q'];
  const POOL = ['b', 'd', 'p', 'q', 'a', 'e', 'o', 's', 'm', 'n', 'u', 'w', 't', 'r', 'k', 'f'];

  const rand = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Build a string of `len` letters, biased so ~half include a reversal letter
  // and avoiding immediate repeats (cleaner sequencing signal).
  function makeSequence(len) {
    const out = [];
    while (out.length < len) {
      let c;
      if (Math.random() < 0.5) c = choice(REVERSAL_CORE);
      else c = choice(POOL);
      if (out.length && out[out.length - 1] === c) continue;
      out.push(c);
    }
    return out;
  }

  // Circus crate colour schemes.
  const CRATE_PALETTES = [
    { body: '#e2434b', band: '#ffd24d', edge: '#7a1226' },
    { body: '#3a8ad9', band: '#ffd24d', edge: '#143a63' },
    { body: '#1fa97e', band: '#ff8a3d', edge: '#0d4d39' },
    { body: '#8a4fa3', band: '#5cd97a', edge: '#3d1f4d' },
  ];

  const state = {
    phase: 'title',                       // title | watch | recall | resolve | level_clear | game_over
    score: 0,
    best: parseInt(localStorage.getItem('recallcrates_best') || '0', 10) || 0,
    level: 1,
    span: 2,
    misses: 0,
    maxMisses: 3,
    seq: [],
    typed: [],
    crate: null,                          // { x, y, vy, lidOpen, palette, shake }
    watchTimer: 0,
    elapsed: 0,
    floaters: [],
    particles: [],
    shake: 0, shakeX: 0, shakeY: 0,
  };

  // ===== Detection metrics (local only) =====
  const metrics = newMetrics();
  function newMetrics() {
    return {
      rounds: 0, correct: 0,
      orderErrors: 0,        // all letters present but wrong order (transposition)
      wrongLetters: 0,       // wrong/missing letters
      drops: 0,              // crate landed before submit
      maxSpan: 0,            // longest sequence reproduced exactly
      spanAttempts: {},      // span -> {ok, fail}
    };
  }
  function recordSpan(len, ok) {
    const s = metrics.spanAttempts[len] || { ok: 0, fail: 0 };
    if (ok) { s.ok++; if (len > metrics.maxSpan) metrics.maxSpan = len; } else s.fail++;
    metrics.spanAttempts[len] = s;
  }
  function saveMetrics() {
    const summary = {
      date: new Date().toISOString(),
      lang: LANG,
      age: TWEAKS.age || null,
      level: state.level,
      score: state.score,
      rounds: metrics.rounds,
      correct: metrics.correct,
      orderErrors: metrics.orderErrors,
      wrongLetters: metrics.wrongLetters,
      drops: metrics.drops,
      maxSpan: metrics.maxSpan,
      transpositionRate: metrics.rounds ? +(metrics.orderErrors / metrics.rounds).toFixed(3) : 0,
    };
    try {
      const key = 'dyslexiaScreening.recallcrates';
      const store = JSON.parse(localStorage.getItem(key) || '{"history":[]}');
      store.lastSession = summary;
      store.history = (store.history || []).concat([summary]).slice(-50);
      localStorage.setItem(key, JSON.stringify(store));
    } catch (e) { /* storage unavailable — game still playable */ }
    return summary;
  }
  window.DyslexiaScreening = window.DyslexiaScreening || {};
  window.DyslexiaScreening.recallcrates = () => {
    try { return JSON.parse(localStorage.getItem('dyslexiaScreening.recallcrates') || 'null'); }
    catch (e) { return null; }
  };
  // Lightweight read-only state probe (used by automated checks; harmless in play).
  window.__rc = () => ({ phase: state.phase, seq: state.seq.slice(), typed: state.typed.slice(), span: state.span, misses: state.misses });

  // ===== Flow =====
  function startGame() {
    state.phase = 'watch';
    state.score = 0;
    state.level = 1;
    state.span = 2;
    state.misses = 0;
    Object.assign(metrics, newMetrics());
    document.getElementById('overlay').classList.add('hidden');
    startRound();
  }

  // Watch duration scales with span and difficulty (more letters -> longer peek).
  function watchDuration(len) {
    let base = 0.7 + len * 0.55;
    if (TWEAKS.difficulty === 'easy') base *= 1.4;
    if (TWEAKS.difficulty === 'hard') base *= 0.7;
    return base;
  }
  // Recall window (seconds) the child has to type before the crate lands.
  // Scales with span so longer strings get proportionally more time.
  function recallBudget(len) {
    let secs = 2.6 + len * 1.5;
    if (TWEAKS.difficulty === 'easy') secs *= 1.45;
    if (TWEAKS.difficulty === 'hard') secs *= 0.7;
    return secs;
  }

  function startRound() {
    state.seq = makeSequence(state.span);
    state.typed = [];
    state.phase = 'watch';
    state.watchTimer = watchDuration(state.span);
    state.crate = {
      x: W / 2,
      y: Math.max(150, H * 0.28),
      vy: 0,
      lidOpen: 1,                 // 1 = open (letters visible), 0 = shut
      palette: choice(CRATE_PALETTES),
      shake: 0,
      startY: 0,                  // set when the crate starts falling
    };
    updateHUD();
    updateAnswerDisplay();
    showFloaterCenter(T.watch, '#5cd9ff', -H * 0.12);
  }

  function beginRecall() {
    state.phase = 'recall';
    state.crate.lidOpen = 0;
    state.crate.startY = state.crate.y;
    // Constant velocity so the crate lands in exactly recallBudget seconds.
    const dist = groundY() - state.crate.y;
    state.crate.vy = dist / recallBudget(state.seq.length);
    showFloaterCenter(T.recall, '#ffd24d', -H * 0.12);
  }

  function groundY() { return H * 0.82; }

  function resolveRound(reason) {
    // reason: 'correct' | 'order' | 'wrong' | 'drop'
    metrics.rounds++;
    const len = state.seq.length;
    if (reason === 'correct') {
      metrics.correct++;
      recordSpan(len, true);
      const pts = 60 + len * 20 + state.level * 10;
      state.score += pts;
      burstAt(state.crate.x, state.crate.y, '#5cd97a');
      showFloaterCenter(`${T.correct}  +${pts}`, '#5cd97a', -H * 0.12);
      state.level++;
      // Grow span every 2 levels, capped at 6.
      if (state.level % 2 === 1) state.span = Math.min(6, state.span + 1);
      state.phase = 'level_clear';
      setTimeout(() => { if (state.phase === 'level_clear') startRound(); }, 1100);
      return;
    }
    // Failures
    recordSpan(len, false);
    if (reason === 'order') { metrics.orderErrors++; showFloaterCenter(T.orderErr, '#ff8a3d', -H * 0.12); }
    else if (reason === 'wrong') { metrics.wrongLetters++; showFloaterCenter(T.wrong, '#ff5c7c', -H * 0.12); }
    else { metrics.drops++; showFloaterCenter(T.dropped, '#ff5c7c', -H * 0.12); }
    burstAt(state.crate.x, state.crate.y, '#ff5c7c');
    state.shake = Math.min(0.5, state.shake + 0.3);
    state.misses++;
    updateHUD();
    if (state.misses >= state.maxMisses) { gameOver(T.tooMany); return; }
    state.phase = 'level_clear';
    setTimeout(() => { if (state.phase === 'level_clear') startRound(); }, 1100);
  }

  // Compare typed vs seq; classify the error type for the dyslexia signal.
  function classifyAttempt() {
    const a = state.typed, b = state.seq;
    const exact = a.length === b.length && a.every((c, i) => c === b[i]);
    if (exact) return 'correct';
    // Same multiset (all right letters) but wrong order => transposition.
    const sortedEq = a.length === b.length &&
      a.slice().sort().join('') === b.slice().sort().join('');
    if (sortedEq) return 'order';
    return 'wrong';
  }

  function submitAttempt() {
    if (state.phase !== 'recall') return;
    if (state.typed.length === 0) return;
    resolveRound(classifyAttempt());
  }

  // ===== Input =====
  function pressLetter(ch) {
    if (state.phase !== 'recall') return;
    if (state.typed.length >= state.seq.length) return;
    state.typed.push(ch);
    updateAnswerDisplay();
    // Auto-submit once the child has entered the full length.
    if (state.typed.length === state.seq.length) {
      setTimeout(submitAttempt, 180);
    }
  }
  function pressBackspace() {
    if (state.phase !== 'recall') return;
    state.typed.pop();
    updateAnswerDisplay();
  }
  window.addEventListener('keydown', (e) => {
    if (state.phase === 'title' || state.phase === 'game_over') {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startGame(); return; }
      return;
    }
    if (e.key === 'Enter') { e.preventDefault(); submitAttempt(); return; }
    if (e.key === 'Backspace') { e.preventDefault(); pressBackspace(); return; }
    if (/^[a-zA-Z]$/.test(e.key)) { e.preventDefault(); pressLetter(e.key.toLowerCase()); }
  });
  // Tap an on-canvas letter? Recall is keyboard-first (matches numberfall), but
  // tapping the crate during WATCH does nothing; during RECALL we ignore canvas
  // taps to keep the sequencing signal clean.

  function updateAnswerDisplay() {
    const wrap = document.getElementById('ans-slots');
    if (!wrap) return;
    const n = (state.seq && state.seq.length) || state.span || 0;
    let html = '';
    for (let i = 0; i < n; i++) {
      const ch = state.typed[i];
      const active = state.phase === 'recall' && i === state.typed.length;
      html += `<span class="slot${ch ? ' filled' : ''}${active ? ' active' : ''}">${ch || ''}</span>`;
    }
    wrap.innerHTML = html;
  }

  // ===== Loop =====
  let lastTime = performance.now();
  function loop(now) {
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.1) dt = 0.1;
    // Resilience: one bad frame should never kill the whole game loop.
    try { update(dt); draw(); }
    catch (err) { console.error('Recall Crates loop error:', err); }
    requestAnimationFrame(loop);
  }

  function update(dt) {
    state.elapsed += dt;

    if (state.phase === 'watch') {
      state.watchTimer -= dt;
      if (state.watchTimer <= 0) beginRecall();
    } else if (state.phase === 'recall' && state.crate) {
      state.crate.y += state.crate.vy * dt;  // constant velocity (predictable budget)
      if (state.crate.y >= groundY()) {
        state.crate.y = groundY();
        resolveRound('drop');
      }
    }

    for (const f of state.floaters) { f.t += dt; f.y -= 30 * dt; }
    state.floaters = state.floaters.filter(f => f.t < f.dur);
    for (const p of state.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.gravity ?? 200) * dt; p.life -= dt;
    }
    state.particles = state.particles.filter(p => p.life > 0);
    if (state.shake > 0) {
      state.shake = Math.max(0, state.shake - dt * 3);
      state.shakeX = (Math.random() - 0.5) * state.shake * 12;
      state.shakeY = (Math.random() - 0.5) * state.shake * 12;
    } else { state.shakeX = state.shakeY = 0; }
  }

  function gameOver(reason) {
    state.phase = 'game_over';
    if (state.score > state.best) {
      state.best = state.score;
      localStorage.setItem('recallcrates_best', String(state.best));
    }
    const summary = saveMetrics();
    state.shake = Math.min(0.6, state.shake + 0.4);
    const overlay = document.getElementById('overlay');
    overlay.querySelector('.card')?.remove();
    const card = document.createElement('div');
    card.className = 'card';
    const orderPct = summary.rounds ? Math.round((summary.orderErrors / summary.rounds) * 100) : 0;
    card.innerHTML = `
      <h1><span class="acc">${T.gameAcc}</span>${T.gameRest}</h1>
      <div class="sub">${reason}</div>
      <div class="stats-row">
        <div class="stat-chip"><div class="stat-label">${T.score}</div><div class="stat-val">${state.score}</div></div>
        <div class="stat-chip hi"><div class="stat-label">${T.maxLen}</div><div class="stat-val">${summary.maxSpan}</div></div>
        <div class="stat-chip"><div class="stat-label">${T.best}</div><div class="stat-val">${state.best}</div></div>
      </div>
      <div class="insight">
        <div class="ih"><span class="t">Order mix-ups</span><span class="pct">${orderPct}%</span></div>
        <div class="bar"><i style="width:${orderPct}%"></i></div>
        <div class="cap">Rounds with the right letters in the wrong order — the was&#8596;saw sequencing signature. ${summary.maxSpan} letters held at best. Lower is steadier.</div>
      </div>
      <button class="big-btn" id="restart-btn">${T.playAgain}</button>
      <div class="note">${T.note}</div>
    `;
    overlay.appendChild(card);
    overlay.classList.remove('hidden');
    document.getElementById('restart-btn').addEventListener('click', startGame);
  }
  document.getElementById('start-btn').addEventListener('click', startGame);

  function burstAt(x, y, color) {
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rand(120, 280);
      state.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
        life: rand(0.5, 0.9), maxLife: 0.9, size: rand(3, 7),
        color: choice([color, '#fff', '#ffd24d']), gravity: 320,
      });
    }
  }
  function showFloaterCenter(text, color, dy) {
    window.MathArcadeAudio?.event(text);
    state.floaters.push({ x: W / 2, y: H * 0.5 + (dy || 0), text, color, t: 0, dur: 1.2, big: true });
  }

  function updateHUD() {
    document.getElementById('score').textContent = state.score;
    document.getElementById('level').textContent = state.level;
    document.getElementById('span').textContent = state.span;
    const pips = document.querySelectorAll('#lives .miss-pip');
    pips.forEach((pip, i) => pip.classList.toggle('spent', i < state.misses));
  }

  // ===== Drawing =====
  function draw() {
    ctx.save();
    ctx.translate(state.shakeX, state.shakeY);
    drawBg();
    drawGround();
    if (state.crate) drawCrate();
    drawParticles();
    drawFloaters();
    ctx.restore();
  }

  function drawBg() {
    const night = TWEAKS.theme === 'night';
    const g = ctx.createLinearGradient(0, 0, 0, H);
    if (night) {
      g.addColorStop(0, '#2a1a5e');
      g.addColorStop(0.45, '#3d2a7a');
      g.addColorStop(0.55, '#6b5a3a');
      g.addColorStop(1, '#4a3a26');
    } else {
      g.addColorStop(0, '#7a1230');
      g.addColorStop(0.45, '#b5223a');
      g.addColorStop(0.55, '#d8b27a');
      g.addColorStop(1, '#c79a5e');
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const apexX = W / 2, apexY = -H * 0.15;
    const tentBottom = H * 0.5;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, tentBottom); ctx.clip();
    const panels = 14;
    for (let i = 0; i < panels; i++) {
      if (i % 2 === 0) continue;
      const a0 = (i / panels) * Math.PI - Math.PI / 2;
      const a1 = ((i + 1) / panels) * Math.PI - Math.PI / 2;
      const R = H * 1.6;
      ctx.fillStyle = night ? 'rgba(180, 200, 255, 0.16)' : 'rgba(255, 244, 224, 0.30)';
      ctx.beginPath();
      ctx.moveTo(apexX, apexY);
      ctx.lineTo(apexX + Math.cos(a0) * R, apexY + Math.sin(a0) * R);
      ctx.lineTo(apexX + Math.cos(a1) * R, apexY + Math.sin(a1) * R);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Scalloped gold valance.
    ctx.fillStyle = '#ffd24d'; ctx.strokeStyle = '#c98a14'; ctx.lineWidth = 2;
    const scallop = Math.max(34, W / 22);
    ctx.beginPath();
    ctx.moveTo(0, tentBottom);
    for (let x = 0; x <= W; x += scallop) ctx.arc(x + scallop / 2, tentBottom, scallop / 2, Math.PI, 0, false);
    ctx.lineTo(W, tentBottom - 14); ctx.lineTo(0, tentBottom - 14);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }

  function drawGround() {
    const gy = groundY();
    // Sawdust ring.
    ctx.fillStyle = 'rgba(180, 130, 70, 0.4)';
    ctx.beginPath();
    ctx.ellipse(W / 2, gy + 30, W * 0.46, H * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    // Landing pad line.
    ctx.strokeStyle = 'rgba(122, 18, 38, 0.5)';
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.moveTo(W * 0.5 - 120, gy + 26);
    ctx.lineTo(W * 0.5 + 120, gy + 26);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function roundRectPath(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawCrate() {
    const c = state.crate;
    const pal = c.palette;
    const n = state.seq.length;
    const cellW = clamp(W * 0.5 / 6, 44, 78);
    const boxW = cellW * n + 28;
    const boxH = clamp(cellW * 1.2, 70, 110);
    const x = c.x - boxW / 2;
    const y = c.y - boxH / 2;

    ctx.save();
    // Body
    ctx.fillStyle = pal.body;
    ctx.strokeStyle = pal.edge;
    ctx.lineWidth = 4;
    roundRectPath(x, y, boxW, boxH, 12);
    ctx.fill(); ctx.stroke();
    // Plank lines
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 2;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x + 6, y + (boxH / 3) * i);
      ctx.lineTo(x + boxW - 6, y + (boxH / 3) * i);
      ctx.stroke();
    }
    // Band
    ctx.fillStyle = pal.band;
    ctx.fillRect(x + 6, y + boxH * 0.42, boxW - 12, boxH * 0.16);

    // Letters — visible only while the lid is open (WATCH phase).
    if (c.lidOpen > 0.5) {
      ctx.fillStyle = '#fff7e0';
      ctx.strokeStyle = '#2a1024';
      for (let i = 0; i < n; i++) {
        const lx = c.x - (n - 1) * cellW / 2 + i * cellW;
        const ly = c.y;
        const tileW = cellW * 0.78, tileH = boxH * 0.62;
        ctx.lineWidth = 3;
        ctx.fillStyle = '#fff7e0';
        roundRectPath(lx - tileW / 2, ly - tileH / 2, tileW, tileH, 8);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#2a1024';
        ctx.font = `bold ${Math.round(tileH * 0.78)}px "Lilita One", sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(state.seq[i], lx, ly + 2);
      }
    } else {
      // Lid shut: a row of "?" stamps so the child knows letters are hidden.
      ctx.fillStyle = 'rgba(255,247,224,0.85)';
      ctx.font = `bold ${Math.round(boxH * 0.4)}px "Lilita One", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const dots = '? '.repeat(n).trim();
      ctx.fillText(dots, c.x, c.y);
      // Lid plank across the top.
      ctx.fillStyle = pal.band;
      ctx.strokeStyle = pal.edge; ctx.lineWidth = 3;
      roundRectPath(x - 4, y - 10, boxW + 8, 18, 6);
      ctx.fill(); ctx.stroke();
    }
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
      const sc = 1 + (1 - Math.min(1, t * 3)) * 0.4;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(f.x, f.y); ctx.scale(sc, sc);
      ctx.font = 'bold 44px "Lilita One", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 5; ctx.strokeStyle = '#2a1024';
      ctx.strokeText(f.text, 0, 0);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, 0, 0);
      ctx.restore();
    }
  }

  // ===== Tweaks =====
  function setupTweaks() {
    const diffRow = document.getElementById('diff-row');
    diffRow.querySelectorAll('.opt').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.value === TWEAKS.difficulty);
      opt.addEventListener('click', () => {
        TWEAKS.difficulty = opt.dataset.value;
        diffRow.querySelectorAll('.opt').forEach(o => o.classList.toggle('active', o.dataset.value === TWEAKS.difficulty));
        persistTweaks();
      });
    });
    const ageRow = document.getElementById('age-row');
    ageRow.querySelectorAll('.opt').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.value === TWEAKS.age);
      opt.addEventListener('click', () => {
        TWEAKS.age = TWEAKS.age === opt.dataset.value ? '' : opt.dataset.value;
        ageRow.querySelectorAll('.opt').forEach(o => o.classList.toggle('active', o.dataset.value === TWEAKS.age));
        persistTweaks();
      });
    });
    const themeRow = document.getElementById('theme-row');
    if (themeRow) {
      themeRow.querySelectorAll('.opt').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.value === TWEAKS.theme);
        opt.addEventListener('click', () => {
          TWEAKS.theme = opt.dataset.value;
          themeRow.querySelectorAll('.opt').forEach(o => o.classList.toggle('active', o.dataset.value === TWEAKS.theme));
          persistTweaks();
        });
      });
    }
    document.getElementById('tweaks-close').addEventListener('click', () => {
      hideTweaks();
      try { window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*'); } catch (e) {}
    });
    document.getElementById('gear-btn').addEventListener('click', () => {
      const open = document.getElementById('tweaks').classList.contains('open');
      if (open) { hideTweaks(); try { window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*'); } catch (e) {} }
      else showTweaks();
    });
  }
  function persistTweaks() {
    try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { ...TWEAKS } }, '*'); } catch (e) {}
  }
  function showTweaks() { document.getElementById('tweaks').classList.add('open'); }
  function hideTweaks() { document.getElementById('tweaks').classList.remove('open'); }
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === '__activate_edit_mode') showTweaks();
    if (d.type === '__deactivate_edit_mode') hideTweaks();
  });

  // ===== Boot =====
  applyStaticText();
  setupTweaks();
  try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch (e) {}

  // Decorative idle crate on the title screen.
  state.crate = { x: W / 2, y: H * 0.42, vy: 0, lidOpen: 1, palette: CRATE_PALETTES[0], shake: 0 };
  state.seq = ['b', 'd', 'p'];
  updateHUD();
  updateAnswerDisplay();
  draw(); // paint one frame immediately so the scene is never blank before rAF starts

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { lastTime = performance.now() - 16; draw(); }
  });
  window.addEventListener('focus', () => { lastTime = performance.now() - 16; draw(); });
  requestAnimationFrame(loop);
})();
