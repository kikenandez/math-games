// =====================================================================
// BEE BUZZ SAYS — REDESIGN ("Warm Storybook Hive")
// Same mechanics & dyslexia-screening logic as the original; elevated
// render layer + chrome. Pure logic still lives in core.js (BBSCore).
// =====================================================================
(() => {
  const C = window.BBSCore;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  // ---- theme colours read from CSS custom properties (per hive theme) ----
  const THEME = {};
  function readTheme() {
    const cs = getComputedStyle(document.documentElement);
    const g = (n) => cs.getPropertyValue(n).trim();
    THEME.bg1 = g('--bg-1'); THEME.bg2 = g('--bg-2'); THEME.bg3 = g('--bg-3');
    THEME.glow = g('--glow'); THEME.comb = g('--comb'); THEME.combEdge = g('--comb-edge');
    THEME.paper = g('--paper'); THEME.ink = g('--ink'); THEME.honey = g('--honey');
    THEME.honeyDeep = g('--honey-deep'); THEME.good = g('--good'); THEME.hot = g('--hot');
  }

  let bgCanvas = null;
  function buildBackground() {
    bgCanvas = document.createElement('canvas');
    bgCanvas.width = canvas.width; bgCanvas.height = canvas.height;
    const b = bgCanvas.getContext('2d');
    b.setTransform(DPR, 0, 0, DPR, 0, 0);
    // vertical light gradient (sun through the hive)
    const grd = b.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, THEME.bg1); grd.addColorStop(0.52, THEME.bg2); grd.addColorStop(1, THEME.bg3);
    b.fillStyle = grd; b.fillRect(0, 0, W, H);
    // soft sun glow, upper centre
    const rad = b.createRadialGradient(W * 0.5, H * 0.12, 10, W * 0.5, H * 0.12, Math.max(W, H) * 0.7);
    rad.addColorStop(0, THEME.glow); rad.addColorStop(0.4, 'rgba(255,255,255,0)');
    b.fillStyle = rad; b.fillRect(0, 0, W, H);
    // faint honeycomb lattice
    const s = Math.max(26, Math.min(W, H) / 16);
    b.lineWidth = 1.4; b.strokeStyle = withAlpha(THEME.combEdge, 0.10);
    const dx = s * 1.5, dy = s * Math.sqrt(3);
    for (let col = -1; col * dx < W + s; col++) {
      for (let row = -1; row * dy < H + s; row++) {
        const cx = col * dx, cy = row * dy + (col % 2 ? dy / 2 : 0);
        const pts = C.hexCorners(cx, cy, s * 0.96);
        b.beginPath(); pts.forEach((p, i) => i ? b.lineTo(p.x, p.y) : b.moveTo(p.x, p.y)); b.closePath(); b.stroke();
      }
    }
    // gentle vignette
    const vig = b.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(20,10,0,0.28)');
    b.fillStyle = vig; b.fillRect(0, 0, W, H);
  }

  function withAlpha(hex, a) {
    const h = String(hex).replace('#', '');
    if (h.length < 6) return `rgba(0,0,0,${a})`;
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), bl = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${bl},${a})`;
  }

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.floor(W * DPR); canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    layoutBoard();
    buildBackground();
  }
  window.addEventListener('resize', resize);

  // ===== Localization (unchanged copy + tightened intro) =====
  const supported = ['en', 'fr', 'es'];
  const stored = localStorage.getItem('mathArcadeLang');
  const param = new URLSearchParams(location.search).get('lang');
  const LANG = supported.includes(param) ? param : (supported.includes(stored) ? stored : 'en');
  const STR = {
    en: {
      titleAcc: 'BEE BUZZ', titleRest: ' SAYS', sub: 'watch the bee — then tap the letters back in order',
      start: 'START', playAgain: 'PLAY AGAIN', note: 'Practice game — not a diagnosis.',
      watch: 'WATCH…', recall: 'YOUR TURN!',
      score: 'Score', level: 'Level', best: 'Best', strikes: 'Strikes',
      boardClear: 'HIVE COMPLETE!', correct: 'PERFECT!', wrong: 'OOPS', tooSlow: 'TOO SLOW',
      gameAcc: 'SWARM', gameRest: ' RESTS', tooMany: 'too many slip-ups!',
      maxLen: 'Best trail', tweaks: 'Tweaks', difficulty: 'Difficulty',
      easy: 'EASY', normal: 'NORMAL', hard: 'HARD', age: 'Child age', color: 'Color cues',
      colNone: 'NONE', colFun: 'FUN', colLetters: 'LETTERS',
      players: 'Players', modeSolo: 'SOLO', modeCoop: 'CO-OP', modeVersus: 'VERSUS',
      yourTurn: 'YOUR TURN', team: 'Team', pass: 'PASS TO', tap: 'CONTINUE', wins: 'WINS!', draw: "IT'S A DRAW!",
      toBeat: 'to beat', player: 'Player',
      ht1: 'WATCH', hd1: 'A bee lights up letters, one buzz each.',
      ht2: 'REPEAT', hd2: 'Tap them back in the same order.',
      ht3: 'GROW', hd3: 'Each round adds one more letter.',
      reversalT: 'Letter mix-ups', reversalCap: 'How often a wrong tap was a mirror letter (b↔d, p↔q). Lower is steadier.',
    },
    fr: {
      titleAcc: "L’ABEILLE", titleRest: ' DIT', sub: "regarde l’abeille — puis retape les lettres dans l’ordre",
      start: 'JOUER', playAgain: 'REJOUER', note: "Jeu d’entraînement — pas un diagnostic.",
      watch: 'REGARDE…', recall: 'À TOI !',
      score: 'Score', level: 'Niveau', best: 'Record', strikes: 'Erreurs',
      boardClear: 'RUCHE COMPLÈTE !', correct: 'PARFAIT !', wrong: 'RATÉ', tooSlow: 'TROP LENT',
      gameAcc: "L’ESSAIM", gameRest: ' SE REPOSE', tooMany: "trop d’erreurs !",
      maxLen: 'Meilleure série', tweaks: 'Réglages', difficulty: 'Difficulté',
      easy: 'FACILE', normal: 'NORMAL', hard: 'DIFFICILE', age: "Âge de l’enfant", color: 'Couleurs',
      colNone: 'AUCUNE', colFun: 'FUN', colLetters: 'LETTRES',
      players: 'Joueurs', modeSolo: 'SOLO', modeCoop: 'COOP', modeVersus: 'DUEL',
      yourTurn: 'À TOI', team: 'Équipe', pass: 'AU TOUR DE', tap: 'CONTINUER', wins: 'GAGNE !', draw: 'ÉGALITÉ !',
      toBeat: 'à battre', player: 'Joueur',
      ht1: 'REGARDE', hd1: "L’abeille allume des lettres, un bourdon chacune.",
      ht2: 'RÉPÈTE', hd2: 'Retape-les dans le même ordre.',
      ht3: 'GRANDIS', hd3: 'Chaque manche ajoute une lettre.',
      reversalT: 'Confusions de lettres', reversalCap: "Part des erreurs qui étaient une lettre miroir (b↔d, p↔q). Plus bas = plus régulier.",
    },
    es: {
      titleAcc: 'LA ABEJA', titleRest: ' DICE', sub: 'mira a la abeja — luego toca las letras en orden',
      start: 'JUGAR', playAgain: 'JUGAR OTRA VEZ', note: 'Juego de práctica — no es un diagnóstico.',
      watch: 'MIRA…', recall: '¡TU TURNO!',
      score: 'Puntos', level: 'Nivel', best: 'Récord', strikes: 'Fallos',
      boardClear: '¡PANAL COMPLETO!', correct: '¡PERFECTO!', wrong: 'UPS', tooSlow: 'MUY LENTO',
      gameAcc: 'EL ENJAMBRE', gameRest: ' DESCANSA', tooMany: '¡demasiados fallos!',
      maxLen: 'Mejor serie', tweaks: 'Ajustes', difficulty: 'Dificultad',
      easy: 'FÁCIL', normal: 'NORMAL', hard: 'DIFÍCIL', age: 'Edad del niño', color: 'Colores',
      colNone: 'NINGUNO', colFun: 'FUN', colLetters: 'LETRAS',
      players: 'Jugadores', modeSolo: 'SOLO', modeCoop: 'COOP', modeVersus: 'DUELO',
      yourTurn: 'TU TURNO', team: 'Equipo', pass: 'TURNO DE', tap: 'CONTINUAR', wins: '¡GANA!', draw: '¡EMPATE!',
      toBeat: 'a batir', player: 'Jugador',
      ht1: 'MIRA', hd1: 'La abeja enciende letras, un zumbido cada una.',
      ht2: 'REPITE', hd2: 'Tócalas en el mismo orden.',
      ht3: 'CRECE', hd3: 'Cada ronda añade una letra más.',
      reversalT: 'Confusiones de letras', reversalCap: 'Cuántos fallos fueron una letra espejo (b↔d, p↔q). Más bajo = más estable.',
    },
  };
  const T = STR[LANG];
  function applyStaticText() {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    document.getElementById('title-h1').innerHTML = `<span class="acc">${T.titleAcc}</span>${T.titleRest}`;
    set('title-sub', T.sub); set('start-btn', T.start); set('title-note', T.note);
    set('lbl-score', T.score); set('lbl-level', T.level); set('lbl-best', T.best);
    set('tw-title', T.tweaks); set('tw-diff', T.difficulty);
    set('tw-easy', T.easy); set('tw-normal', T.normal); set('tw-hard', T.hard);
    set('tw-age', T.age); set('tw-color', T.color);
    set('tw-color-none', T.colNone); set('tw-color-fun', T.colFun); set('tw-color-letters', T.colLetters);
    set('lbl-mode', T.players);
    set('mode-solo', T.modeSolo); set('mode-coop', T.modeCoop); set('mode-versus', T.modeVersus);
    set('ht1', T.ht1); set('hd1', T.hd1); set('ht2', T.ht2); set('hd2', T.hd2); set('ht3', T.ht3); set('hd3', T.hd3);
  }

  const TWEAKS = /*EDITMODE-BEGIN*/{
    "difficulty": "normal",
    "age": "",
    "colorMode": "none",
    "theme": "honey",
    "motion": "full"
  }/*EDITMODE-END*/;
  function reducedMotion() { return TWEAKS.motion === 'reduced'; }

  const rand = (min, max) => Math.random() * (max - min) + min;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const state = {
    phase: 'title',
    best: parseInt(localStorage.getItem('beebuzzsays_best') || '0', 10) || 0,
    maxStrikes: 3,
    seq: [], typed: [], cells: [], keypad: [], activeLetters: [],
    radius: 2, hexSize: 40,
    watchIndex: -1, watchTimer: 0, flashCell: -1, inputTimer: 0,
    tapStep: null, tapTimer: 0, floaters: [], particles: [],
    shake: 0, shakeX: 0, shakeY: 0, elapsed: 0,
  };

  const session = {
    mode: 'solo', seed: 0, boardRadius: 1, players: [], active: 0, versusRun: 0,
  };
  function activePlayer() { return session.players[session.active]; }
  function makePlayer(id) { return { id, score: 0, strikes: 0, metrics: newMetrics() }; }
  function newRng() { return session.mode === 'versus' ? C.makeRng(session.seed) : Math.random; }
  function newMetrics() { return { rounds: 0, correct: 0, mirrorConfusions: 0, wrongTaps: 0, maxSpan: 0, spanAttempts: {} }; }
  function metrics() { return activePlayer().metrics; }
  function recordSpan(len, ok) {
    const m = metrics(); const s = m.spanAttempts[len] || { ok: 0, fail: 0 };
    if (ok) { s.ok++; if (len > m.maxSpan) m.maxSpan = len; } else s.fail++;
    m.spanAttempts[len] = s;
  }

  function colorMode() {
    const m = TWEAKS.colorMode;
    if (m === 'letters' || m === 'fun' || m === 'none') return m;
    return 'none';
  }
  function colorOn() { return colorMode() === 'letters'; }
  function letterColor(ch) { return colorOn() ? (C.LETTER_COLOR[ch] || '#ffe0a0') : '#f6dca8'; }
  const CARTOON = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff8fab', '#9b5de5', '#00bbf9', '#ff9f1c', '#2ec4b6', '#f15bb5'];
  function pickCartoon() { return CARTOON[Math.floor((state.rng || Math.random)() * CARTOON.length)]; }
  function stepColor(step) {
    const m = colorMode();
    if (m === 'letters') return letterColor(step && step.letter);
    if (m === 'fun') return (step && step.hue) || '#ffe9a8';
    return '#ffe9a8';
  }
  function tapColor(step) { return colorMode() === 'none' ? '#ffffff' : stepColor(step); }
  function inkOn(hex) {
    const h = String(hex).replace('#', '');
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? THEME.ink : '#fff6df';
  }

  // ===================== LAYOUT =====================
  function layoutBoard() {
    state.radius = session.boardRadius;
    state.activeLetters = C.keypadLetters(TWEAKS.difficulty);
    const span = state.radius * 2 + 1;
    const avail = Math.min(W * 0.9, H * 0.60);
    state.hexSize = clamp(avail / (span * 1.6), 24, 62);
    const cx = W / 2, cy = H * 0.38;
    state.cells = C.axialCells(state.radius).map((c) => {
      const p = C.axialToPixel(c, state.hexSize);
      return { q: c.q, r: c.r, x: cx + p.x, y: cy + p.y };
    });
    // Hex keypad: centred row(s) near the bottom. Each tile is a flat-top hex.
    const letters = state.activeLetters;
    const perRow = letters.length <= 6 ? letters.length : Math.ceil(letters.length / 2);
    const size = clamp(W / (perRow * 1.9 + 1.2), 26, 46); // hex centre-to-corner
    const tileW = size * 1.5, tileH = size * Math.sqrt(3);
    const gapX = size * 0.5, gapY = size * 0.42;
    const rows = Math.ceil(letters.length / perRow);
    const baseY = H * 0.78 - (rows - 1) * (tileH + gapY) / 2;
    state.keypad = letters.map((ch, i) => {
      const row = Math.floor(i / perRow), col = i % perRow;
      const countThisRow = Math.min(perRow, letters.length - row * perRow);
      const rowW = countThisRow * tileW + (countThisRow - 1) * gapX;
      const x0 = W / 2 - rowW / 2 + tileW / 2;
      return { letter: ch, cx: x0 + col * (tileW + gapX), cy: baseY + row * (tileH + gapY), r: size };
    });
  }

  function hexPath(c, cx, cy, size) {
    const pts = C.hexCorners(cx, cy, size);
    c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.closePath();
  }

  // ===================== DRAW: BEE (shared sprite) =====================
  function drawBeeOn(c, x, y, s, t) {
    const flutter = reducedMotion() ? 0.5 : (Math.sin(t * 22) * 0.5 + 0.5);
    c.save(); c.translate(x, y);
    // wings (behind body)
    c.fillStyle = 'rgba(255,255,255,0.78)';
    c.strokeStyle = 'rgba(120,83,26,0.5)'; c.lineWidth = s * 0.04;
    for (const sgn of [-1, 1]) {
      c.save(); c.translate(sgn * s * 0.18, -s * 0.42);
      c.rotate(sgn * (0.35 + flutter * 0.4));
      c.beginPath(); c.ellipse(sgn * s * 0.22, 0, s * 0.34, s * 0.2, 0, 0, Math.PI * 2);
      c.fill(); c.stroke(); c.restore();
    }
    // body
    c.fillStyle = THEME.honey || '#ffbf33';
    c.strokeStyle = '#3a2410'; c.lineWidth = s * 0.07;
    c.beginPath(); c.ellipse(0, 0, s * 0.62, s * 0.46, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    // stripes (clipped to body)
    c.save();
    c.beginPath(); c.ellipse(0, 0, s * 0.62, s * 0.46, 0, 0, Math.PI * 2); c.clip();
    c.fillStyle = '#3a2410';
    c.fillRect(-s * 0.06, -s * 0.5, s * 0.16, s); c.fillRect(s * 0.26, -s * 0.5, s * 0.14, s);
    c.restore();
    // face (left end)
    c.fillStyle = '#3a2410';
    c.beginPath(); c.arc(-s * 0.34, -s * 0.06, s * 0.06, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(-s * 0.34, -s * 0.06, s * 0.022, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill();
    c.strokeStyle = '#3a2410'; c.lineWidth = s * 0.045; c.lineCap = 'round';
    c.beginPath(); c.arc(-s * 0.4, s * 0.06, s * 0.1, 0.1, Math.PI - 0.1); c.stroke(); // smile
    // antennae
    c.beginPath(); c.moveTo(-s * 0.48, -s * 0.28); c.quadraticCurveTo(-s * 0.66, -s * 0.5, -s * 0.6, -s * 0.62); c.stroke();
    c.beginPath(); c.arc(-s * 0.6, -s * 0.66, s * 0.05, 0, Math.PI * 2); c.fillStyle = '#3a2410'; c.fill();
    // stinger
    c.beginPath(); c.moveTo(s * 0.6, 0); c.lineTo(s * 0.78, -s * 0.06); c.lineTo(s * 0.78, s * 0.06); c.closePath(); c.fill();
    c.restore();
  }

  // ===================== DRAW: HONEYCOMB BOARD =====================
  function drawHoneycomb() {
    for (let i = 0; i < state.cells.length; i++) {
      const cell = state.cells[i];
      const isFlash = state.phase === 'watch' && state.flashCell === i;
      let revealed = null, revealOrd = -1, litStep = null;
      if (state.phase === 'input' || state.phase === 'level_clear') {
        for (let k = 0; k < state.typed.length; k++) {
          if (state.seq[k] && state.seq[k].cell === i) { revealed = state.seq[k].letter; revealOrd = k + 1; litStep = state.seq[k]; }
        }
      }
      if (isFlash) litStep = state.seq[state.watchIndex];
      const letter = isFlash ? state.seq[state.watchIndex].letter : revealed;
      const lit = isFlash || revealed !== null;
      const size = state.hexSize * 0.94;

      // drop shadow under cell
      ctx.save();
      ctx.shadowColor = 'rgba(60,34,8,0.32)'; ctx.shadowBlur = lit ? 18 : 6; ctx.shadowOffsetY = 4;
      hexPath(ctx, cell.x, cell.y, size);
      if (lit) {
        const fill = stepColor(litStep);
        const grad = ctx.createLinearGradient(cell.x, cell.y - size, cell.x, cell.y + size);
        grad.addColorStop(0, lighten(fill, 0.18)); grad.addColorStop(1, fill);
        ctx.fillStyle = grad;
      } else {
        const grad = ctx.createLinearGradient(cell.x, cell.y - size, cell.x, cell.y + size);
        grad.addColorStop(0, lighten(THEME.comb, 0.12)); grad.addColorStop(1, THEME.comb);
        ctx.fillStyle = grad;
      }
      ctx.fill();
      ctx.restore();

      // rim
      hexPath(ctx, cell.x, cell.y, size);
      ctx.lineWidth = 4; ctx.strokeStyle = THEME.combEdge; ctx.stroke();
      // waxy inner ring + top gloss
      hexPath(ctx, cell.x, cell.y, size * 0.74);
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.stroke();

      if (lit) {
        const fill = stepColor(litStep);
        ctx.fillStyle = inkOn(fill);
        ctx.font = `${Math.round(state.hexSize * 1.0)}px "Lilita One", sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(letter, cell.x, cell.y + state.hexSize * 0.04);
        if (revealOrd > 0) {
          // order badge
          const bx = cell.x - state.hexSize * 0.52, by = cell.y - state.hexSize * 0.52;
          ctx.beginPath(); ctx.arc(bx, by, state.hexSize * 0.26, 0, Math.PI * 2);
          ctx.fillStyle = THEME.combEdge; ctx.fill();
          ctx.fillStyle = THEME.paper; ctx.font = `${Math.round(state.hexSize * 0.34)}px "Lilita One", sans-serif`;
          ctx.fillText(String(revealOrd), bx, by + state.hexSize * 0.02);
        }
        if (isFlash) {
          const bob = reducedMotion() ? 0 : Math.sin(state.elapsed * 6) * state.hexSize * 0.08;
          drawBeeOn(ctx, cell.x, cell.y - state.hexSize * 1.2 + bob, state.hexSize * 0.62, state.elapsed);
        }
      }
    }
  }

  function lighten(hex, amt) {
    const h = String(hex).replace('#', '');
    if (h.length < 6) return hex;
    let r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    r = Math.round(r + (255 - r) * amt); g = Math.round(g + (255 - g) * amt); b = Math.round(b + (255 - b) * amt);
    return `rgb(${r},${g},${b})`;
  }

  // ===================== DRAW: HEX KEYPAD =====================
  function keypadHighlight() {
    if (state.tapTimer > 0 && state.tapStep) return { letter: state.tapStep.letter, color: tapColor(state.tapStep) };
    return null;
  }
  function drawKeypad() {
    const active = state.phase === 'input';
    const hi = keypadHighlight();
    for (const t of state.keypad) {
      const isHi = !!hi && t.letter === hi.letter;
      const baseFill = colorOn() ? letterColor(t.letter) : '#fff2c4';
      const fill = isHi ? hi.color : baseFill;
      let fillAlpha;
      if (isHi) fillAlpha = 1; else if (colorOn()) fillAlpha = active ? 0.6 : 0.5; else fillAlpha = active ? 1 : 0.55;
      const labelAlpha = isHi ? 1 : (active ? 1 : 0.55);

      ctx.save();
      // shadow
      ctx.shadowColor = isHi ? withAlpha(hi.color, 0.8) : 'rgba(60,34,8,0.3)';
      ctx.shadowBlur = isHi ? 22 : 6; ctx.shadowOffsetY = isHi ? 0 : 4;
      hexPath(ctx, t.cx, t.cy, t.r);
      const grad = ctx.createLinearGradient(t.cx, t.cy - t.r, t.cx, t.cy + t.r);
      grad.addColorStop(0, lighten(fill, 0.16)); grad.addColorStop(1, fill);
      ctx.globalAlpha = fillAlpha; ctx.fillStyle = grad; ctx.fill();
      ctx.restore();

      hexPath(ctx, t.cx, t.cy, t.r);
      ctx.globalAlpha = labelAlpha; ctx.lineWidth = isHi ? 4 : 3;
      ctx.strokeStyle = isHi ? THEME.paper : THEME.combEdge; ctx.stroke();
      // gloss
      hexPath(ctx, t.cx, t.cy, t.r * 0.74);
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.stroke();

      ctx.fillStyle = isHi ? inkOn(fill) : (colorOn() ? '#241500' : THEME.ink);
      ctx.font = `${Math.round(t.r * 1.0)}px "Lilita One", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(t.letter, t.cx, t.cy + t.r * 0.04);
      ctx.globalAlpha = 1;
    }
  }

  function draw() {
    if (bgCanvas) ctx.drawImage(bgCanvas, 0, 0, W, H);
    ctx.save(); ctx.translate(state.shakeX, state.shakeY);
    drawHoneycomb(); drawKeypad(); drawParticles(); drawFloaters();
    ctx.restore();
  }
  function drawParticles() {
    for (const p of state.particles) {
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  function drawFloaters() {
    for (const f of state.floaters) {
      const t = f.t / f.dur, a = 1 - t, sc = 1 + (1 - Math.min(1, t * 3)) * 0.4;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(f.x, f.y); ctx.scale(sc, sc);
      ctx.font = '900 46px "Lilita One", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.strokeStyle = '#3a2410'; ctx.strokeText(f.text, 0, 0);
      ctx.fillStyle = f.color; ctx.fillText(f.text, 0, 0); ctx.restore();
    }
  }

  // ===================== UPDATE / PHASES =====================
  function update(dt) {
    state.elapsed += dt;
    for (const f of state.floaters) { f.t += dt; f.y -= 30 * dt; }
    state.floaters = state.floaters.filter(f => f.t < f.dur);
    for (const p of state.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.gravity ?? 200) * dt; p.life -= dt; }
    state.particles = state.particles.filter(p => p.life > 0);
    if (state.shake > 0 && !reducedMotion()) { state.shake = Math.max(0, state.shake - dt * 3); state.shakeX = (Math.random() - 0.5) * state.shake * 12; state.shakeY = (Math.random() - 0.5) * state.shake * 12; }
    else { state.shakeX = state.shakeY = 0; state.shake = 0; }
    if (state.tapTimer > 0) state.tapTimer = Math.max(0, state.tapTimer - dt);
    updatePhase(dt);
  }
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

  function startVersusRun() {
    session.active = session.versusRun;
    session.boardRadius = 1;
    state.rng = C.makeRng(session.seed);
    state.seq = []; state.typed = [];
    layoutBoard();
    document.getElementById('overlay').classList.add('hidden');
    growAndWatch();
  }
  function showVersusPass() {
    const overlay = document.getElementById('overlay');
    overlay.querySelector('.card')?.remove();
    const next = session.players[session.versusRun];
    const beat = session.players[0].score;
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML = `
      <h1>${T.pass} <span class="acc">${T.player} ${next.id}</span></h1>
      <div class="sub">${T.player} 1: ${beat} ${T.toBeat}</div>
      <button class="big-btn" id="pass-btn">${T.tap}</button>`;
    overlay.appendChild(card); overlay.classList.remove('hidden');
    document.getElementById('pass-btn').addEventListener('click', () => { startVersusRun(); });
    state.phase = 'versus_pass';
  }

  function startGame() {
    session.players = session.mode === 'solo' ? [makePlayer(1)] : [makePlayer(1), makePlayer(2)];
    session.active = 0; session.versusRun = 0; session.boardRadius = 1;
    session.seed = (Math.floor(Math.random() * 0x7fffffff)) || 1;
    if (session.mode === 'versus') { startVersusRun(); return; }
    state.rng = newRng();
    state.seq = []; state.typed = [];
    layoutBoard();
    document.getElementById('overlay').classList.add('hidden');
    growAndWatch();
  }
  function growAndWatch() {
    const step = C.growTrail(state.seq, state.activeLetters, state.cells.length, state.rng);
    if (step === null) { boardClear(); return; }
    step.hue = pickCartoon();
    state.seq = state.seq.concat([step]);
    if (session.mode === 'coop') session.active = (state.seq.length - 1) % 2;
    updateHUD();
    beginWatch();
  }
  function beginWatch() {
    state.phase = 'watch'; state.typed = [];
    state.watchIndex = -1; state.flashCell = -1; state.watchTimer = 0.4;
    state.tapStep = null; state.tapTimer = 0;
    showFloater(T.watch, '#3a2410', -H * 0.28);
  }
  function beginInput() {
    state.phase = 'input'; state.flashCell = -1;
    state.inputTimer = inputBudget();
    showFloater(T.recall, THEME.honey, -H * 0.28);
    if (session.mode === 'coop') showFloater(`${T.player} ${activePlayer().id} — ${T.yourTurn}`, '#ffd24d', -H * 0.38);
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
        state.flashCell = -1;
      }
    } else if (state.phase === 'input') {
      state.inputTimer -= dt;
      if (state.inputTimer <= 0) registerMiss('slow');
    }
  }
  function pressLetter(ch) {
    if (state.phase !== 'input') return;
    window.MathArcadeAudio?.note(C.LETTER_FREQ[ch]);
    const idx = state.typed.length;
    const res = C.checkTap(state.seq, idx, ch);
    if (!res.ok) {
      metrics().wrongTaps++;
      if (res.mirror) metrics().mirrorConfusions++;
      registerMiss('wrong');
      return;
    }
    state.tapStep = state.seq[idx]; state.tapTimer = 0.4;
    state.typed.push(ch);
    state.inputTimer = inputBudget();
    flashTile(ch, THEME.good);
    if (C.isComplete(state.seq, state.typed)) resolveCorrect();
  }
  function registerMiss(reason) {
    metrics().rounds++; recordSpan(state.seq.length, false);
    if (session.mode === 'coop') session.players.forEach((pl) => { pl.strikes++; });
    else activePlayer().strikes++;
    state.shake = Math.min(0.5, state.shake + 0.3);
    window.MathArcadeAudio?.wrong();
    showFloater(reason === 'slow' ? T.tooSlow : T.wrong, THEME.hot, -H * 0.28);
    burst(W / 2, H * 0.38, THEME.hot);
    updateHUD();
    const strikeCount = session.mode === 'coop' ? session.players[0].strikes : activePlayer().strikes;
    if (strikeCount >= state.maxStrikes) { gameOver(T.tooMany); return; }
    state.phase = 'level_clear';
    setTimeout(() => { if (state.phase === 'level_clear') beginWatch(); }, 1100);
  }
  function resolveCorrect() {
    metrics().rounds++; metrics().correct++; recordSpan(state.seq.length, true);
    const pts = 50 + state.seq.length * 20 + session.boardRadius * 10;
    activePlayer().score += pts;
    burst(W / 2, H * 0.38, THEME.honey);
    showFloater(`${T.correct}  +${pts}`, THEME.good, -H * 0.28);
    window.MathArcadeAudio?.levelClear();
    updateHUD();
    state.phase = 'level_clear';
    if (C.boardFull(state.seq, state.cells.length)) setTimeout(() => { if (state.phase === 'level_clear') boardClear(); }, 1100);
    else setTimeout(() => { if (state.phase === 'level_clear') growAndWatch(); }, 1100);
  }
  function boardClear() {
    burst(W / 2, H * 0.38, THEME.honey); burst(W * 0.35, H * 0.42, THEME.good); burst(W * 0.65, H * 0.34, '#ffd24d');
    showFloater(T.boardClear, THEME.good, -H * 0.28);
    window.MathArcadeAudio?.levelClear();
    state.phase = 'level_clear';
    setTimeout(() => {
      if (state.phase !== 'level_clear') return;
      session.boardRadius++;
      state.seq = []; state.typed = [];
      layoutBoard(); updateHUD(); growAndWatch();
    }, 1300);
  }
  function flashTile(ch, color) {
    const t = state.keypad.find(k => k.letter === ch); if (!t) return;
    burst(t.cx, t.cy, color);
  }

  // ===================== RESULT CARDS =====================
  function showResultCard(bodyHtml) {
    state.phase = 'game_over';
    window.MathArcadeAudio?.gameOver();
    const overlay = document.getElementById('overlay');
    overlay.querySelector('.card')?.remove();
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML = `${bodyHtml}
      <button class="big-btn" id="restart-btn">${T.playAgain}</button>
      <div class="note">${T.note}</div>`;
    overlay.appendChild(card); overlay.classList.remove('hidden');
    document.getElementById('restart-btn').addEventListener('click', startGame);
  }
  function versusWinner(a, b) {
    if (a.score !== b.score) return a.score > b.score ? 1 : 2;
    if (a.metrics.maxSpan !== b.metrics.maxSpan) return a.metrics.maxSpan > b.metrics.maxSpan ? 1 : 2;
    return 0;
  }
  function gameOver(reason) {
    if (session.mode === 'coop') {
      const team = session.players.reduce((a, x) => a + x.score, 0);
      const span = Math.max(...session.players.map((x) => x.metrics.maxSpan), state.seq.length);
      if (team > state.best) { state.best = team; localStorage.setItem('beebuzzsays_best', String(state.best)); }
      showResultCard(`
        <h1><span class="acc">${T.gameAcc}</span>${T.gameRest}</h1>
        <div class="sub">${reason}</div>
        <div class="stats-row">
          <div class="stat-chip hi"><div class="stat-label">${T.team} ${T.score}</div><div class="stat-val">${team}</div></div>
          <div class="stat-chip"><div class="stat-label">${T.maxLen}</div><div class="stat-val">${span}</div></div>
          <div class="stat-chip"><div class="stat-label">${T.level}</div><div class="stat-val">${session.boardRadius}</div></div>
        </div>`);
      return;
    }
    if (session.mode === 'versus') {
      if (session.versusRun === 0) {
        window.MathArcadeAudio?.levelClear?.();
        session.versusRun = 1; showVersusPass(); return;
      }
      const [a, b] = session.players;
      const winner = versusWinner(a, b);
      const best = Math.max(a.score, b.score);
      if (best > state.best) { state.best = best; localStorage.setItem('beebuzzsays_best', String(state.best)); }
      const headline = winner === 0 ? T.draw : `${T.player} ${winner} ${T.wins}`;
      showResultCard(`
        <h1><span class="acc">${headline}</span></h1>
        <div class="stats-row">
          <div class="stat-chip ${winner === 1 ? 'hi' : ''}"><div class="stat-label">${T.player} 1</div><div class="stat-val">${a.score}</div></div>
          <div class="stat-chip ${winner === 2 ? 'hi' : ''}"><div class="stat-label">${T.player} 2</div><div class="stat-val">${b.score}</div></div>
        </div>`);
      return;
    }
    const p = activePlayer();
    if (p.score > state.best) { state.best = p.score; localStorage.setItem('beebuzzsays_best', String(state.best)); }
    const summary = saveMetrics();
    const revPct = summary.wrongTaps ? Math.round((summary.mirrorConfusions / summary.wrongTaps) * 100) : 0;
    const insight = summary.wrongTaps
      ? `<div class="insight">
           <div class="ih"><span class="t">${T.reversalT}</span><span class="pct">${revPct}%</span></div>
           <div class="bar"><i style="width:${revPct}%"></i></div>
           <div class="cap">${T.reversalCap}</div>
         </div>` : '';
    showResultCard(`
      <h1><span class="acc">${T.gameAcc}</span>${T.gameRest}</h1>
      <div class="sub">${reason}</div>
      <div class="stats-row">
        <div class="stat-chip"><div class="stat-label">${T.score}</div><div class="stat-val">${p.score}</div></div>
        <div class="stat-chip hi"><div class="stat-label">${T.maxLen}</div><div class="stat-val">${summary.maxSpan}</div></div>
        <div class="stat-chip"><div class="stat-label">${T.best}</div><div class="stat-val">${state.best}</div></div>
      </div>
      ${insight}`);
  }
  function saveMetrics() {
    const m = activePlayer().metrics;
    const summary = {
      date: new Date().toISOString(), lang: LANG, age: TWEAKS.age || null,
      difficulty: TWEAKS.difficulty, colorMode: colorMode(), colorCues: colorOn(), mode: session.mode,
      level: session.boardRadius, score: activePlayer().score,
      rounds: m.rounds, correct: m.correct, strikes: activePlayer().strikes,
      maxSpan: m.maxSpan, spanAttempts: m.spanAttempts,
      mirrorConfusions: m.mirrorConfusions, wrongTaps: m.wrongTaps,
      reversalRate: m.wrongTaps ? +(m.mirrorConfusions / m.wrongTaps).toFixed(3) : 0,
    };
    if (session.mode === 'solo') {
      try {
        const key = 'dyslexiaScreening.beebuzzsays';
        const store = JSON.parse(localStorage.getItem(key) || '{"history":[]}');
        store.lastSession = summary;
        store.history = (store.history || []).concat([summary]).slice(-50);
        localStorage.setItem(key, JSON.stringify(store));
      } catch (e) {}
    }
    return summary;
  }
  window.DyslexiaScreening = window.DyslexiaScreening || {};
  window.DyslexiaScreening.beebuzzsays = () => {
    try { return JSON.parse(localStorage.getItem('dyslexiaScreening.beebuzzsays') || 'null'); } catch (e) { return null; }
  };

  function showFloater(text, color, dy) { state.floaters.push({ x: W / 2, y: H * 0.5 + (dy || 0), text, color, t: 0, dur: 1.2 }); }
  function burst(x, y, color) {
    const n = reducedMotion() ? 7 : 16;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = rand(120, 280);
      state.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 70, life: rand(0.5, 0.95), maxLife: 0.95, size: rand(2.5, 5.5), color: i % 2 ? color : '#fff2c4', gravity: 360 });
    }
  }

  // ===================== INPUT =====================
  function canvasPoint(e) {
    const r = canvas.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    return { x: cx, y: cy };
  }
  function hitKeypad(pt) {
    // forgiving circular hit-test on each hex tile (inradius * 1.05)
    let best = null, bestD = Infinity;
    for (const t of state.keypad) {
      const d = Math.hypot(pt.x - t.cx, pt.y - t.cy);
      if (d < t.r * 1.05 && d < bestD) { best = t; bestD = d; }
    }
    return best;
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

  // ===================== HUD =====================
  function updateHUD() {
    const sumScore = session.players.reduce((a, p) => a + p.score, 0);
    const p = activePlayer() || { score: 0, strikes: 0 };
    const score = session.mode === 'coop' ? sumScore : p.score;
    const strikes = session.mode === 'coop' ? session.players.reduce((a, x) => Math.max(a, x.strikes), 0) : p.strikes;
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = session.boardRadius;
    document.getElementById('best').textContent = state.best;
    const pips = document.querySelectorAll('#lives .pip');
    pips.forEach((pip, i) => pip.classList.toggle('spent', i < strikes));
  }

  window.__bbs = () => ({
    phase: state.phase, seq: state.seq.map(s => s.letter), typed: state.typed.slice(),
    span: state.seq.length, level: session.boardRadius, cells: state.cells.length,
    mode: session.mode, active: session.active, versusRun: session.versusRun,
    players: session.players.map(p => ({ id: p.id, score: p.score, strikes: p.strikes })),
  });

  function setupModeSelector() {
    const row = document.getElementById('mode-row');
    if (!row) return;
    row.querySelectorAll('.opt').forEach((o) => o.classList.toggle('active', o.dataset.value === session.mode));
    row.querySelectorAll('.opt').forEach((opt) => {
      opt.addEventListener('click', () => {
        session.mode = opt.dataset.value;
        row.querySelectorAll('.opt').forEach((o) => o.classList.toggle('active', o === opt));
      });
    });
  }

  function applyTheme() {
    document.documentElement.dataset.theme = TWEAKS.theme === 'honey' ? '' : TWEAKS.theme;
    readTheme(); buildBackground(); drawHero();
  }

  function setupTweaks() {
    const wire = (rowId, key, after) => {
      const row = document.getElementById(rowId);
      if (!row) return;
      row.querySelectorAll('.opt').forEach(opt => {
        const v = opt.dataset.value;
        opt.classList.toggle('active', v === String(TWEAKS[key]));
        opt.addEventListener('click', () => {
          TWEAKS[key] = (TWEAKS[key] === v && key === 'age') ? '' : v;
          const now = String(TWEAKS[key]);
          row.querySelectorAll('.opt').forEach(o => o.classList.toggle('active', o.dataset.value === now));
          persistTweaks();
          if (after) after();
          layoutBoard();
        });
      });
    };
    wire('diff-row', 'difficulty');
    wire('age-row', 'age');
    wire('color-row', 'colorMode');
    wire('theme-row', 'theme', applyTheme);
    wire('motion-row', 'motion');
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

  // ===================== HERO + HOW-TO ICONS =====================
  function drawHero() {
    const cv = document.getElementById('hero-bee'); if (!cv) return;
    const c = cv.getContext('2d');
    c.clearRect(0, 0, cv.width, cv.height);
    // little comb cluster behind the bee
    c.save();
    c.strokeStyle = withAlpha(THEME.honey, 0.5); c.lineWidth = 4;
    c.fillStyle = withAlpha(THEME.honey, 0.14);
    const hs = 26; const cx = cv.width / 2, cy = cv.height * 0.62;
    [[0, 0], [1.5, 0.87], [-1.5, 0.87], [0, 1.74]].forEach(([qx, qy]) => {
      const x = cx + qx * hs, y = cy + qy * hs;
      const pts = C.hexCorners(x, y, hs); c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.closePath(); c.fill(); c.stroke();
    });
    c.restore();
    drawBeeOn(c, cv.width / 2, cv.height * 0.4, 56, performance.now() / 1000);
  }
  function drawIcons() {
    document.querySelectorAll('.ico').forEach((cv) => {
      const c = cv.getContext('2d'); const w = cv.width, h = cv.height;
      c.clearRect(0, 0, w, h);
      const kind = cv.dataset.ico;
      c.strokeStyle = THEME.combEdge; c.lineWidth = 3.5; c.lineJoin = 'round';
      if (kind === 'watch') {
        // a lit comb cell with an eye
        const pts = C.hexCorners(w / 2, h / 2, 22); c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.closePath();
        c.fillStyle = THEME.honey; c.fill(); c.stroke();
        c.fillStyle = THEME.ink; c.beginPath(); c.arc(w / 2, h / 2, 6, 0, Math.PI * 2); c.fill();
      } else if (kind === 'tap') {
        // hex tile + finger dot
        const pts = C.hexCorners(w / 2, h / 2 + 4, 20); c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.closePath();
        c.fillStyle = '#fff2c4'; c.fill(); c.stroke();
        c.fillStyle = THEME.good; c.beginPath(); c.arc(w / 2 + 9, h / 2 - 6, 8, 0, Math.PI * 2); c.fill();
        c.strokeStyle = THEME.ink; c.stroke();
      } else {
        // three growing combs
        [[-13, 4, 11], [4, -2, 14], [21, 6, 17]].forEach(([dx, dy, s], i) => {
          const pts = C.hexCorners(w / 2 + dx - 6, h / 2 + dy, s * 0.6);
          c.beginPath(); pts.forEach((p, j) => j ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.closePath();
          c.fillStyle = i === 2 ? THEME.honey : withAlpha(THEME.honey, 0.4); c.fill(); c.stroke();
        });
      }
    });
  }

  // ===================== BOOT =====================
  applyStaticText();
  setupModeSelector();
  setupTweaks();
  document.documentElement.dataset.theme = TWEAKS.theme === 'honey' ? '' : TWEAKS.theme;
  readTheme();
  resize();
  drawHero();
  drawIcons();
  updateHUD();
  try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch (e) {}

  let lastTime = performance.now();
  function loop(now) {
    let dt = (now - lastTime) / 1000; lastTime = now; if (dt > 0.1) dt = 0.1;
    try {
      update(dt); draw();
      if (state.phase === 'title') drawHero(); // keep hero bee fluttering
    } catch (err) {
      console.error('LOOP ERROR in phase ' + state.phase + ':', err && err.stack || err);
    }
    requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) lastTime = performance.now() - 16; });
  requestAnimationFrame(loop);
})();
