// =====================================================================
// LETTER WHACK — Retro Arcade Dyslexia Screener (Phase 1)
// Circus whack-a-mole shell: harlequin CLOWNS pop from striped barrels;
// tap ONLY the target letter. (Internally the popping actors are still
// called "moles" — a harmless leftover token; visually they are clowns.)
// Trains + measures: rapid letter recognition (RAN) and b/d/p/q reversal
// confusions. All metrics stay local on the player's machine (no network).
// Companion to PARATROOPERS. UI fully localized EN / FR / ES in-game.
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
  const speechLang = { en: 'en-US', fr: 'fr-FR', es: 'es-ES' }[LANG];

  const STR = {
    en: {
      titleAcc: 'LETTER', titleRest: ' WHACK',
      sub: 'whack only the target letter — leave the rest alone',
      intro: "Letters pop up from the holes. <b>Tap only the letter shown at the top</b> — the target. Watch out for look-alike letters like <b>b d p q</b> that face the wrong way. Tapping a wrong letter costs a <b style='color:#ff5c7c'>miss</b>, and letting a target duck back is a miss too. Three misses and it's over.",
      start: 'START', playAgain: 'PLAY AGAIN', note: 'Practice game — not a diagnosis.',
      findLetter: 'Find this letter',
      score: 'Score', level: 'Level', time: 'Time', misses: 'Misses', best: 'Best',
      levelStart: 'LEVEL', find: 'FIND', wrong: 'WRONG!', escaped: 'ESCAPED!',
      clear: 'CLEAR', gameAcc: 'GAME', gameRest: ' OVER',
      tooManyMisses: 'too many misses!', tooManyEscapes: 'too many escapes!',
      tweaks: 'Tweaks', difficulty: 'Difficulty', easy: 'EASY', normal: 'NORMAL', hard: 'HARD',
      speed: 'Spawn speed', age: 'Child age',
      bigTop: 'Big top', day: 'DAY', night: 'NIGHT',
      ht1: 'THE TARGET', hd1: 'Shown up top — and spoken.',
      ht2: 'WHACK IT', hd2: 'Tap clowns holding that letter.',
      ht3: 'DODGE', hd3: 'Leave the look-alikes alone.',
      warn: "A wrong tap or a target that ducks away is a <b style='color:var(--hot)'>miss</b>. Three misses ends the show.",
    },
    fr: {
      titleAcc: 'TAPE', titleRest: '-LETTRE',
      sub: 'tapez seulement la lettre cible — laissez les autres tranquilles',
      intro: "Des lettres sortent des trous. <b>Tapez seulement la lettre affichée en haut</b> — la cible. Attention aux lettres qui se ressemblent comme <b>b d p q</b> et qui sont à l'envers. Taper une mauvaise lettre coûte une <b style='color:#ff5c7c'>erreur</b>, et laisser filer une cible aussi. Trois erreurs et c'est fini.",
      start: 'JOUER', playAgain: 'REJOUER', note: "Jeu d'entraînement — pas un diagnostic.",
      findLetter: 'Trouve cette lettre',
      score: 'Score', level: 'Niveau', time: 'Temps', misses: 'Erreurs', best: 'Record',
      levelStart: 'NIVEAU', find: 'CIBLE', wrong: 'FAUX !', escaped: 'RATÉ !',
      clear: 'RÉUSSI', gameAcc: 'FIN', gameRest: ' DE PARTIE',
      tooManyMisses: "trop d'erreurs !", tooManyEscapes: 'trop de ratés !',
      tweaks: 'Réglages', difficulty: 'Difficulté', easy: 'FACILE', normal: 'NORMAL', hard: 'DIFFICILE',
      speed: 'Vitesse', age: "Âge de l'enfant",
      bigTop: 'Chapiteau', day: 'JOUR', night: 'NUIT',
      ht1: 'LA CIBLE', hd1: 'Affichée en haut — et dite.',
      ht2: 'TAPE-LA', hd2: 'Tape les clowns avec cette lettre.',
      ht3: 'ÉVITE', hd3: 'Laisse les sosies tranquilles.',
      warn: "Une mauvaise tape ou une cible qui s’échappe, c’est une <b style='color:var(--hot)'>erreur</b>. Trois erreurs et le spectacle est fini.",
    },
    es: {
      titleAcc: 'GOLPEA', titleRest: '-LETRAS',
      sub: 'golpea solo la letra objetivo — deja las demás en paz',
      intro: "Salen letras de los agujeros. <b>Golpea solo la letra que se muestra arriba</b> — el objetivo. Cuidado con letras parecidas como <b>b d p q</b> que están al revés. Golpear una letra incorrecta cuesta un <b style='color:#ff5c7c'>fallo</b>, y dejar escapar un objetivo también. Tres fallos y se acabó.",
      start: 'JUGAR', playAgain: 'JUGAR OTRA VEZ', note: 'Juego de práctica — no es un diagnóstico.',
      findLetter: 'Encuentra esta letra',
      score: 'Puntos', level: 'Nivel', time: 'Tiempo', misses: 'Fallos', best: 'Récord',
      levelStart: 'NIVEL', find: 'BUSCA', wrong: '¡MAL!', escaped: '¡ESCAPÓ!',
      clear: 'COMPLETADO', gameAcc: 'FIN', gameRest: ' DEL JUEGO',
      tooManyMisses: '¡demasiados fallos!', tooManyEscapes: '¡demasiados escapes!',
      tweaks: 'Ajustes', difficulty: 'Dificultad', easy: 'FÁCIL', normal: 'NORMAL', hard: 'DIFÍCIL',
      speed: 'Velocidad', age: 'Edad del niño',
      bigTop: 'Carpa', day: 'DÍA', night: 'NOCHE',
      ht1: 'EL OBJETIVO', hd1: 'Arriba — y se dice en voz alta.',
      ht2: 'GOLPÉALA', hd2: 'Toca payasos con esa letra.',
      ht3: 'ESQUIVA', hd3: 'Deja en paz a las parecidas.',
      warn: "Una mala tocada o un objetivo que escapa es un <b style='color:var(--hot)'>fallo</b>. Tres fallos y se acabó el espectáculo.",
    },
  };
  const T = STR[LANG];
  function applyStaticText() {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    document.getElementById('title-h1').innerHTML = `<span class="acc">${T.titleAcc}</span>${T.titleRest}`;
    set('title-sub', T.sub);
    set('start-btn', T.start);
    set('title-note', T.note);
    set('target-label', T.findLetter);
    set('lbl-score', T.score); set('lbl-level', T.level);
    set('lbl-time', T.time); set('lbl-misses', T.misses);
    set('tw-title', T.tweaks); set('tw-diff', T.difficulty);
    set('tw-easy', T.easy); set('tw-normal', T.normal); set('tw-hard', T.hard);
    set('tw-speed', T.speed); set('tw-age', T.age);
    set('tw-bigtop', T.bigTop); set('tw-day', T.day); set('tw-night', T.night);
    set('how1-t', T.ht1); set('how1-d', T.hd1);
    set('how2-t', T.ht2); set('how2-d', T.hd2);
    set('how3-t', T.ht3); set('how3-d', T.hd3);
    const tp = document.getElementById('title-p'); if (tp) tp.innerHTML = T.warn;
  }

  // ===== Layout =====
  const COLS = 4, ROWS = 3;
  function getMetrics() {
    const availW = W - 80;
    const availH = H - 280;
    const cellW = Math.min(180, availW / COLS);
    const cellH = Math.min(160, availH / ROWS);
    const cell = Math.min(cellW, cellH);
    const gridW = cell * COLS;
    const gridH = cell * ROWS;
    const x0 = (W - gridW) / 2;
    const y0 = Math.max(150, (H - gridH) / 2 + 30);
    return { cell, gridW, gridH, x0, y0 };
  }

  const TWEAKS = /*EDITMODE-BEGIN*/{
    "difficulty": "normal",
    "speed": 1.0,
    "age": "",
    "theme": "day"
  }/*EDITMODE-END*/;

  // ===== Letter sets =====
  // The reversal-prone core: every cross-pair of these is a mirror/rotation
  // confusion (b<->d, p<->q, b<->p, d<->q, b<->q, d<->p). This is the key
  // dyslexia signal we measure.
  const REVERSAL_CORE = ['b', 'd', 'p', 'q'];
  const REVERSAL_EXTRA = ['n', 'u', 'm', 'w'];
  const NEUTRALS = ['a', 'e', 'o', 'c', 's', 't', 'r', 'h', 'k', 'f'];
  const isReversalPair = (a, b) =>
    a !== b && REVERSAL_CORE.includes(a) && REVERSAL_CORE.includes(b);

  // Circus colour schemes — each clown gets one at spawn for big-top variety.
  const CLOWN_PALETTES = [
    { suit1: '#e2434b', suit2: '#fff4e0', hat1: '#ffd24d', hat2: '#e2434b', pom: '#5cd9ff' },
    { suit1: '#3a8ad9', suit2: '#fff4e0', hat1: '#ffd24d', hat2: '#3a8ad9', pom: '#ff5c7c' },
    { suit1: '#8a4fa3', suit2: '#ffd24d', hat1: '#5cd97a', hat2: '#8a4fa3', pom: '#fff4e0' },
    { suit1: '#1fa97e', suit2: '#fff4e0', hat1: '#ff8a3d', hat2: '#1fa97e', pom: '#ffd24d' },
    { suit1: '#e2434b', suit2: '#3a8ad9', hat1: '#ffd24d', hat2: '#e2434b', pom: '#5cd97a' },
  ];

  // Per-level config: which letters appear, and the pool the target is drawn from.
  function getLevelConfig(level) {
    if (level === 1) return { target: REVERSAL_CORE.slice(0, 2), pool: ['b', 'd'] };
    if (level === 2) return { target: REVERSAL_CORE, pool: REVERSAL_CORE.slice() };
    if (level === 3) return { target: REVERSAL_CORE, pool: REVERSAL_CORE.concat(NEUTRALS.slice(0, 2)) };
    if (level === 4) return { target: REVERSAL_CORE, pool: REVERSAL_CORE.concat(['n', 'u']) };
    return { target: REVERSAL_CORE.concat(REVERSAL_EXTRA), pool: REVERSAL_CORE.concat(REVERSAL_EXTRA, NEUTRALS.slice(0, 3)) };
  }

  const rand = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const state = {
    phase: 'title',
    score: 0,
    best: parseInt(localStorage.getItem('letterwhack_best') || '0', 10) || 0,
    level: 1,
    misses: 0,
    maxMisses: 3,
    moles: [],
    target: 'b',
    pool: ['b', 'd'],
    elapsed: 0,
    timeLeft: 30,
    levelDuration: 30,
    spawnTimer: 0,
    spawnInterval: 1.0,
    paused: false,
    floaters: [],
    particles: [],
    shake: 0, shakeX: 0, shakeY: 0,
    hammer: { x: 0, y: 0, t: 0 },
  };

  // ===== Detection metrics (local only) =====
  const metrics = newMetrics();
  function newMetrics() {
    return { rtSamples: [], hits: 0, reversalErrors: 0, otherErrors: 0, escapes: 0, trials: 0 };
  }
  function median(arr) {
    if (!arr.length) return null;
    const s = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
  }
  function saveMetrics() {
    const summary = {
      date: new Date().toISOString(),
      lang: LANG,
      age: TWEAKS.age || null,
      level: state.level,
      score: state.score,
      trials: metrics.trials,
      hits: metrics.hits,
      reversalErrors: metrics.reversalErrors,
      otherErrors: metrics.otherErrors,
      escapes: metrics.escapes,
      medianRtMs: median(metrics.rtSamples),
      reversalErrorRate: metrics.trials ? +(metrics.reversalErrors / metrics.trials).toFixed(3) : 0,
    };
    try {
      const key = 'dyslexiaScreening.letterwhack';
      const store = JSON.parse(localStorage.getItem(key) || '{"history":[]}');
      store.lastSession = summary;
      store.history = (store.history || []).concat([summary]).slice(-50);
      localStorage.setItem(key, JSON.stringify(store));
    } catch (e) { /* storage unavailable — game still playable */ }
    return summary;
  }
  // Future "Reading Check-Up" screener reads aggregated metrics from here.
  window.DyslexiaScreening = window.DyslexiaScreening || {};
  window.DyslexiaScreening.letterwhack = () => {
    try { return JSON.parse(localStorage.getItem('dyslexiaScreening.letterwhack') || 'null'); }
    catch (e) { return null; }
  };

  // ===== Speech (sound-symbol reinforcement; optional, guarded, offline) =====
  function speakTarget() {
    try {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(state.target);
      u.lang = speechLang;
      u.rate = 0.85;
      window.speechSynthesis.speak(u);
    } catch (e) { /* speech unavailable — visual target is primary */ }
  }

  // ===== Game flow =====
  function startGame() {
    state.phase = 'playing';
    state.score = 0;
    state.level = 1;
    state.misses = 0;
    Object.assign(metrics, newMetrics());
    startLevel();
    document.getElementById('overlay').classList.add('hidden');
  }
  function startLevel() {
    const cfg = getLevelConfig(state.level);
    state.pool = cfg.pool;
    state.target = choice(cfg.target);
    state.timeLeft = state.levelDuration = Math.max(20, 35 - state.level * 2);
    state.spawnTimer = 0.5;
    state.spawnInterval = Math.max(0.35, 1.0 - state.level * 0.07) / TWEAKS.speed;
    if (TWEAKS.difficulty === 'easy') state.spawnInterval *= 1.3;
    if (TWEAKS.difficulty === 'hard') state.spawnInterval *= 0.75;
    state.moles = [];
    state.floaters = []; state.particles = [];
    updateHUD();
    updateTargetHUD();
    showFloaterCenter(`${T.levelStart} ${state.level} · ${T.find} ${state.target}`, '#ffd24d');
    speakTarget();
  }

  function spawnMole() {
    const occupied = new Set(state.moles.filter(m => m.alive).map(m => `${m.col},${m.row}`));
    const candidates = [];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (!occupied.has(`${c},${r}`)) candidates.push({ c, r });
    if (!candidates.length) return;
    const { c, r } = choice(candidates);

    // ~55% target, ~45% decoy. Bias decoys toward mirror confusables of the
    // target so the reversal signal is exercised on every level.
    let letter;
    if (Math.random() < 0.55) {
      letter = state.target;
    } else {
      const confusers = state.pool.filter(l => isReversalPair(l, state.target));
      const others = state.pool.filter(l => l !== state.target);
      const fromConf = confusers.length && Math.random() < 0.7;
      const src = fromConf ? confusers : (others.length ? others : ['a']);
      letter = choice(src);
    }
    const popDur = Math.max(1.3, 2.6 - state.level * 0.15) / TWEAKS.speed;
    state.moles.push({
      col: c, row: r, letter,
      t: 0, dur: popDur, popDur,
      state: 'rising',
      hitT: 0, alive: true,
      appeared: performance.now(),
      colors: choice(CLOWN_PALETTES),
    });
  }

  // ===== Input =====
  function pickHoleAt(x, y) {
    const m = getMetrics();
    const gx = Math.floor((x - m.x0) / m.cell);
    const gy = Math.floor((y - m.y0) / m.cell);
    if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) return null;
    return { col: gx, row: gy };
  }
  canvas.addEventListener('mousedown', handleClick);
  canvas.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    handleClick({ clientX: t.clientX, clientY: t.clientY, preventDefault: () => e.preventDefault() });
  }, { passive: false });

  function handleClick(e) {
    if (state.phase !== 'playing') return;
    e.preventDefault();
    const x = e.clientX, y = e.clientY;
    state.hammer.x = x; state.hammer.y = y; state.hammer.t = 0.25;
    const hole = pickHoleAt(x, y);
    if (!hole) return;
    const mole = state.moles.find(m => m.alive && m.col === hole.col && m.row === hole.row && m.state !== 'hit' && m.state !== 'dropping');
    if (!mole) {
      state.score = Math.max(0, state.score - 5);
      showFloater(hole.col, hole.row, '−5', '#ff5c7c');
      updateHUD();
      return;
    }
    const correct = mole.letter === state.target;
    metrics.trials++;
    if (correct) {
      const rt = performance.now() - mole.appeared;
      metrics.rtSamples.push(Math.round(rt));
      metrics.hits++;
      const pts = 50 + state.level * 10;
      state.score += pts;
      mole.state = 'hit'; mole.hitT = 0;
      showFloater(mole.col, mole.row, `+${pts}`, '#5cd97a');
      burst(mole.col, mole.row, '#5cd97a');
    } else {
      if (isReversalPair(mole.letter, state.target)) metrics.reversalErrors++;
      else metrics.otherErrors++;
      state.misses++;
      mole.state = 'dropping'; mole.t = 0; mole.dur = 0.3;
      showFloater(mole.col, mole.row, T.wrong, '#ff5c7c');
      burst(mole.col, mole.row, '#ff5c7c');
      state.shake = Math.min(0.5, state.shake + 0.3);
      if (state.misses >= state.maxMisses) gameOver(T.tooManyMisses);
    }
    updateHUD();
  }
  function togglePause() {
    if (state.phase !== 'playing') return;
    state.paused = !state.paused;
  }
  window.addEventListener('keydown', (e) => {
    if (state.phase === 'title' || state.phase === 'game_over') {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startGame(); return; }
    }
    if (e.key === 'p' || e.key === 'P') { e.preventDefault(); togglePause(); }
  });
  document.getElementById('speak-btn').addEventListener('click', speakTarget);

  // ===== Loop =====
  let lastTime = performance.now();
  function loop(now) {
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.1) dt = 0.1;
    try {
      if (state.phase === 'playing' && !state.paused) update(dt);
      else updateIdle(dt);
      draw();
    } catch (err) { console.error('Letter Whack loop error:', err); }
    requestAnimationFrame(loop);
  }
  function updateIdle(dt) { state.elapsed += dt * 0.5; }

  function update(dt) {
    state.elapsed += dt;
    state.timeLeft -= dt;
    state.hammer.t -= dt;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      const bonus = 100 + state.level * 50;
      state.score += bonus;
      showFloaterCenter(`${T.levelStart} ${state.level} ${T.clear}  +${bonus}`, '#ffd24d');
      state.level++;
      state.phase = 'level_clear';
      for (const mole of state.moles) {
        if (mole.alive && mole.state !== 'hit') { mole.state = 'dropping'; mole.t = 0; mole.dur = 0.3; }
      }
      setTimeout(() => {
        if (state.phase !== 'level_clear') return;
        state.phase = 'playing';
        startLevel();
      }, 1400);
      return;
    }
    updateHUD();

    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnMole();
      state.spawnTimer = state.spawnInterval * rand(0.7, 1.3);
    }

    for (const m of state.moles) {
      if (!m.alive) continue;
      m.t += dt;
      if (m.state === 'rising') {
        if (m.t > 0.25) m.state = 'up';
      } else if (m.state === 'up') {
        if (m.t > m.dur) {
          if (m.letter === state.target) {
            metrics.escapes++;
            state.misses++;
            showFloater(m.col, m.row, T.escaped, '#ff5c7c');
            state.shake = Math.min(0.3, state.shake + 0.15);
            updateHUD();
            if (state.misses >= state.maxMisses) gameOver(T.tooManyEscapes);
          }
          m.state = 'dropping'; m.t = 0; m.dur = 0.3;
        }
      } else if (m.state === 'dropping') {
        if (m.t > m.dur) m.alive = false;
      } else if (m.state === 'hit') {
        m.hitT += dt;
        if (m.hitT > 0.5) m.alive = false;
      }
    }
    state.moles = state.moles.filter(m => m.alive);

    for (const f of state.floaters) { f.t += dt; f.y -= 40 * dt; }
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
      localStorage.setItem('letterwhack_best', String(state.best));
    }
    const summary = saveMetrics();
    state.shake = Math.min(0.6, state.shake + 0.4);
    showFloaterCenter(reason, '#ff5c7c');
    const overlay = document.getElementById('overlay');
    overlay.querySelector('.card').remove();
    const card = document.createElement('div');
    card.className = 'card';
    const revPct = summary.trials ? Math.round(summary.reversalErrorRate * 100) : 0;
    const rt = summary.medianRtMs != null ? `${summary.medianRtMs}ms` : '—';
    card.innerHTML = `
      <h1><span class="acc">${T.gameAcc}</span>${T.gameRest}</h1>
      <div class="sub">${reason}</div>
      <div class="stats-row">
        <div class="stat-chip"><div class="stat-label">${T.score}</div><div class="stat-val">${state.score}</div></div>
        <div class="stat-chip hi"><div class="stat-label">${T.best}</div><div class="stat-val">${state.best}</div></div>
        <div class="stat-chip"><div class="stat-label">RT</div><div class="stat-val">${rt}</div></div>
      </div>
      <div class="insight">
        <div class="ih"><span class="t">Look-alike mix-ups</span><span class="pct">${revPct}%</span></div>
        <div class="bar"><i style="width:${revPct}%"></i></div>
        <div class="cap">Wrong taps that were a mirror letter — b&#8596;d, p&#8596;q. RT is the median time to spot the target (reading speed). Fewer mix-ups is sharper.</div>
      </div>
      <button class="big-btn" id="restart-btn">${T.playAgain}</button>
      <div class="note">${T.note}</div>
    `;
    overlay.appendChild(card);
    overlay.classList.remove('hidden');
    document.getElementById('restart-btn').addEventListener('click', startGame);
  }
  document.getElementById('start-btn').addEventListener('click', startGame);

  function burst(col, row, color) {
    const m = getMetrics();
    const x = m.x0 + (col + 0.5) * m.cell;
    const y = m.y0 + (row + 0.6) * m.cell;
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rand(120, 260);
      state.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
        life: rand(0.5, 0.9), maxLife: 0.9, size: rand(3, 7),
        color: choice([color, '#fff']), gravity: 300,
      });
    }
  }
  function showFloater(col, row, text, color) {
    window.MathArcadeAudio?.event(text);
    const m = getMetrics();
    const x = m.x0 + (col + 0.5) * m.cell;
    const y = m.y0 + (row + 0.3) * m.cell;
    state.floaters.push({ x, y, text, color, t: 0, dur: 1.0, big: false });
  }
  function showFloaterCenter(text, color) {
    window.MathArcadeAudio?.event(text);
    state.floaters.push({ x: W / 2, y: H * 0.42, text, color, t: 0, dur: 1.4, big: true });
  }

  function updateHUD() {
    document.getElementById('score').textContent = state.score;
    document.getElementById('level').textContent = state.level;
    document.getElementById('time').textContent = Math.ceil(state.timeLeft);
    const tChip = document.getElementById('timer-chip');
    if (tChip) tChip.classList.toggle('low', state.phase === 'playing' && state.timeLeft <= 5);
    const pips = document.querySelectorAll('#lives .miss-pip');
    pips.forEach((pip, i) => pip.classList.toggle('spent', i < state.misses));
  }
  function updateTargetHUD() {
    document.getElementById('rule-text').textContent = state.target;
  }

  // ===== Drawing =====
  function draw() {
    ctx.save();
    ctx.translate(state.shakeX, state.shakeY);
    drawBg();
    drawHoles();
    drawClowns();
    drawHammer();
    drawParticles();
    drawFloaters();
    if (state.paused) drawPaused();
    ctx.restore();
  }
  function drawBg() {
    const night = TWEAKS.theme === 'night';
    // Sky-to-sawdust gradient.
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

    // Big-top tent panels radiating from the apex (alternating cream stripes).
    const apexX = W / 2, apexY = -H * 0.15;
    const tentBottom = H * 0.52;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, tentBottom); ctx.clip();
    const panels = 14;
    for (let i = 0; i < panels; i++) {
      if (i % 2 === 0) continue;
      const a0 = (i / panels) * Math.PI - Math.PI / 2;
      const a1 = ((i + 1) / panels) * Math.PI - Math.PI / 2;
      const R = H * 1.6;
      ctx.fillStyle = night ? 'rgba(180, 200, 255, 0.18)' : 'rgba(255, 244, 224, 0.32)';
      ctx.beginPath();
      ctx.moveTo(apexX, apexY);
      ctx.lineTo(apexX + Math.cos(a0) * R, apexY + Math.sin(a0) * R);
      ctx.lineTo(apexX + Math.cos(a1) * R, apexY + Math.sin(a1) * R);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Scalloped gold valance along the tent hem.
    ctx.fillStyle = '#ffd24d';
    ctx.strokeStyle = '#c98a14';
    ctx.lineWidth = 2;
    const scallop = Math.max(34, W / 22);
    ctx.beginPath();
    ctx.moveTo(0, tentBottom);
    for (let x = 0; x <= W; x += scallop) {
      ctx.arc(x + scallop / 2, tentBottom, scallop / 2, Math.PI, 0, false);
    }
    ctx.lineTo(W, tentBottom - 14); ctx.lineTo(0, tentBottom - 14);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Sawdust ring (subtle ellipse on the floor).
    ctx.fillStyle = 'rgba(180, 130, 70, 0.35)';
    ctx.beginPath();
    ctx.ellipse(W / 2, H * 0.82, W * 0.46, H * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  function drawHoles() {
    const m = getMetrics();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cx = m.x0 + (c + 0.5) * m.cell;
        const cy = m.y0 + (r + 0.55) * m.cell;
        const rad = m.cell * 0.35;
        const bw = rad * 2.1;          // barrel width
        const bh = rad * 1.15;         // barrel body height (below the rim)

        // Barrel body — vertical red/cream stripes.
        ctx.save();
        ctx.beginPath();
        roundRectPath(cx - bw / 2, cy, bw, bh, rad * 0.18);
        ctx.clip();
        const stripes = 6;
        for (let s = 0; s < stripes; s++) {
          ctx.fillStyle = (s % 2 === 0) ? '#e2434b' : '#fff4e0';
          ctx.fillRect(cx - bw / 2 + (bw / stripes) * s, cy, bw / stripes + 1, bh);
        }
        ctx.restore();
        // Barrel outline + gold hoops.
        ctx.strokeStyle = '#7a1226'; ctx.lineWidth = 2.5;
        roundRectPath(cx - bw / 2, cy, bw, bh, rad * 0.18); ctx.stroke();
        ctx.strokeStyle = '#ffd24d'; ctx.lineWidth = Math.max(3, rad * 0.12);
        ctx.beginPath(); ctx.moveTo(cx - bw / 2, cy + bh * 0.3); ctx.lineTo(cx + bw / 2, cy + bh * 0.3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - bw / 2, cy + bh * 0.75); ctx.lineTo(cx + bw / 2, cy + bh * 0.75); ctx.stroke();

        // Rim + dark opening at the top of the barrel.
        ctx.fillStyle = '#ffd24d';
        ctx.beginPath(); ctx.ellipse(cx, cy, rad * 1.08, rad * 0.4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#c98a14'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(cx, cy, rad * 1.08, rad * 0.4, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#23060f';
        ctx.beginPath(); ctx.ellipse(cx, cy, rad * 0.92, rad * 0.32, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
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
  function drawClowns() {
    const m = getMetrics();
    for (const mole of state.moles) {
      const cx = m.x0 + (mole.col + 0.5) * m.cell;
      const cyHole = m.y0 + (mole.row + 0.55) * m.cell;
      const rad = m.cell * 0.32;
      const col = mole.colors || CLOWN_PALETTES[0];
      let popY = 0;
      if (mole.state === 'rising') popY = -rad * 1.3 * Math.min(1, mole.t / 0.25);
      else if (mole.state === 'up') popY = -rad * 1.3 + Math.sin(mole.t * 6) * 1.5;
      else if (mole.state === 'dropping') popY = -rad * 1.3 * (1 - Math.min(1, mole.t / mole.dur));
      else if (mole.state === 'hit') popY = -rad * 1.3 + mole.hitT * 34;

      // Clip so the clown appears to rise out of the barrel opening.
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx - rad * 1.6, cyHole - rad * 3.2, rad * 3.2, rad * 3.2);
      ctx.clip();
      const cy = cyHole + popY;          // torso centre
      const headCy = cy - rad * 0.78;
      const headR = rad * 0.62;
      const hit = mole.state === 'hit';

      // ---- Torso with harlequin diamonds ----
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy + rad * 0.1, rad * 0.92, rad * 1.0, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = col.suit2;
      ctx.fillRect(cx - rad * 1.5, cy - rad * 1.5, rad * 3, rad * 3);
      ctx.save();
      ctx.translate(cx, cy + rad * 0.1);
      ctx.rotate(Math.PI / 4);
      const sq = rad * 0.5;
      ctx.fillStyle = col.suit1;
      for (let gy = -4; gy <= 4; gy++)
        for (let gx = -4; gx <= 4; gx++)
          if (((gx + gy) & 1) === 0) ctx.fillRect(gx * sq, gy * sq, sq, sq);
      ctx.restore();
      ctx.restore();
      ctx.strokeStyle = '#7a1226'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(cx, cy + rad * 0.1, rad * 0.92, rad * 1.0, 0, 0, Math.PI * 2); ctx.stroke();

      // ---- Ruffle collar ----
      ctx.fillStyle = '#fff4e0'; ctx.strokeStyle = '#d9b84a'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 7; i++) {
        const a = (i / 6) * Math.PI - Math.PI;
        const rx = cx + Math.cos(a) * rad * 0.78;
        const ry = (cy - rad * 0.42) + Math.sin(a) * rad * 0.12;
        ctx.beginPath(); ctx.arc(rx, ry, rad * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }

      // ---- Head ----
      ctx.fillStyle = '#fff7ef'; ctx.strokeStyle = '#e0b48a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, headCy, headR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // cheeks
      ctx.fillStyle = 'rgba(255, 120, 140, 0.7)';
      ctx.beginPath();
      ctx.arc(cx - headR * 0.55, headCy + headR * 0.2, headR * 0.26, 0, Math.PI * 2);
      ctx.arc(cx + headR * 0.55, headCy + headR * 0.2, headR * 0.26, 0, Math.PI * 2);
      ctx.fill();
      // eyes
      if (!hit) {
        ctx.fillStyle = '#241018';
        ctx.beginPath();
        ctx.arc(cx - headR * 0.36, headCy - headR * 0.15, headR * 0.13, 0, Math.PI * 2);
        ctx.arc(cx + headR * 0.36, headCy - headR * 0.15, headR * 0.13, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = '#241018'; ctx.lineWidth = 2.5;
        const drawX = (xx, yy) => {
          const s = headR * 0.16;
          ctx.beginPath();
          ctx.moveTo(xx - s, yy - s); ctx.lineTo(xx + s, yy + s);
          ctx.moveTo(xx + s, yy - s); ctx.lineTo(xx - s, yy + s);
          ctx.stroke();
        };
        drawX(cx - headR * 0.36, headCy - headR * 0.15);
        drawX(cx + headR * 0.36, headCy - headR * 0.15);
      }
      // big red nose
      ctx.fillStyle = '#ff3b30'; ctx.strokeStyle = '#b51f18'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, headCy + headR * 0.28, headR * 0.22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // smile
      ctx.strokeStyle = '#b51f18'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(cx, headCy + headR * 0.32, headR * 0.42, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();

      // ---- Jester hat (two points + pom-poms), tilts when hit ----
      ctx.save();
      ctx.translate(cx, headCy - headR * 0.7);
      ctx.rotate(hit ? 0.5 : Math.sin(mole.t * 4) * 0.06);
      const hp = (dir) => {
        ctx.fillStyle = dir < 0 ? col.hat1 : col.hat2;
        ctx.strokeStyle = '#7a1226'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, headR * 0.1);
        ctx.quadraticCurveTo(dir * headR * 0.9, -headR * 0.2, dir * headR * 1.15, -headR * 1.15);
        ctx.lineTo(dir * headR * 0.2, -headR * 0.25);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = col.pom;
        ctx.beginPath(); ctx.arc(dir * headR * 1.15, -headR * 1.15, headR * 0.2, 0, Math.PI * 2); ctx.fill();
      };
      hp(-1); hp(1);
      // hat band
      ctx.fillStyle = col.hat1; ctx.strokeStyle = '#7a1226'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, headR * 0.1, headR * 0.95, headR * 0.3, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.restore();

      // ---- High-contrast letter badge on the chest (the glyph to read) ----
      if (mole.state === 'up' || mole.state === 'rising') {
        const sw = rad * 1.1, sh = rad * 0.82;
        const sx = cx - sw / 2, sy = cy + rad * 0.22;
        const rr = Math.max(6, rad * 0.16);
        ctx.fillStyle = '#fff7e0';
        ctx.strokeStyle = '#2a1024';
        ctx.lineWidth = Math.max(2.5, rad * 0.09);
        roundRectPath(sx, sy, sw, sh, rr);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#2a1024';
        ctx.font = `bold ${Math.round(sh * 0.92)}px "Lilita One", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(mole.letter, cx, sy + sh / 2 + rad * 0.02);
      }
      ctx.restore();
    }
  }
  function drawHammer() {
    if (state.hammer.t <= 0) return;
    const x = state.hammer.x, y = state.hammer.y;
    const t = state.hammer.t / 0.25;
    const scale = 0.6 + (1 - t) * 0.5;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.5 + (1 - t) * 0.8);
    ctx.scale(scale, scale);
    // Circus mallet — gold handle, red-and-cream striped head.
    ctx.fillStyle = '#ffd24d'; ctx.strokeStyle = '#2a1024'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.rect(-4, -50, 8, 50); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff4e0';
    ctx.beginPath(); ctx.rect(-22, -60, 44, 22); ctx.fill();
    ctx.fillStyle = '#e2434b';
    for (let i = 0; i < 4; i++) ctx.fillRect(-22 + i * 11, -60, 5.5, 22);
    ctx.strokeStyle = '#2a1024'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.rect(-22, -60, 44, 22); ctx.stroke();
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
      ctx.font = f.big ? 'bold 44px "Lilita One", sans-serif' : 'bold 22px "Lilita One", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = f.big ? 5 : 3;
      ctx.strokeStyle = '#2a1a10';
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
    ctx.lineWidth = 6; ctx.strokeStyle = '#2a1a10';
    ctx.strokeText('II', W / 2, H / 2);
    ctx.fillStyle = '#fff7e0'; ctx.fillText('II', W / 2, H / 2);
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
    const sp = document.getElementById('speed');
    const spVal = document.getElementById('speed-val');
    sp.value = TWEAKS.speed;
    spVal.textContent = `${TWEAKS.speed.toFixed(1)}×`;
    sp.addEventListener('input', () => {
      TWEAKS.speed = parseFloat(sp.value);
      spVal.textContent = `${TWEAKS.speed.toFixed(1)}×`;
      persistTweaks();
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

  // Decorative title-screen clowns
  for (let i = 0; i < 3; i++) {
    state.moles.push({
      col: randInt(0, COLS - 1), row: randInt(0, ROWS - 1),
      letter: choice(REVERSAL_CORE),
      t: 0, dur: 999, popDur: 999, state: 'up', hitT: 0, alive: true,
      appeared: performance.now(),
      colors: choice(CLOWN_PALETTES),
    });
  }
  updateHUD();
  updateTargetHUD();
  draw(); // paint one frame immediately so the scene is never blank before rAF starts

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { lastTime = performance.now() - 16; draw(); }
  });
  window.addEventListener('focus', () => { lastTime = performance.now() - 16; draw(); });
  requestAnimationFrame(loop);
})();
