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

  // Layout + render + flow are added in later tasks. Stub so boot runs:
  function layoutBoard() {}
  function draw() {}
  function update() {}

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

  resize();
  let lastTime = performance.now();
  function loop(now) {
    let dt = (now - lastTime) / 1000; lastTime = now; if (dt > 0.1) dt = 0.1;
    update(dt); draw(); requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) lastTime = performance.now() - 16; });
  requestAnimationFrame(loop);
})();
