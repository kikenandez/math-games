// =====================================================================
// MATHRIS — HTML5 cartoon redesign
// Faithful gameplay rules adapted from kikenandez/retroGames mathris.py
// =====================================================================

(() => {
  // ---------- Canvas ----------
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

  // ---------- Constants (from mathris.py) ----------
  const FPS_BASE = 60;
  const STARTING_SCORE = 200;
  const DETONATE_BASE_COST = 100;
  const DETONATE_GROWTH = 1.10;
  const WRONG_COST = 25;
  const LANDING_COST = 10;
  const DEFUSE_REWARD = 200;
  const MOTHERSHIP_BOUNTY = 500;
  const MAX_OPERANDS = 6;
  const ARM_OPERANDS = 6;
  const ARM_WINDOW_S = 10.0;
  const RULE_MIN_S = 25;
  const RULE_MAX_S = 35;
  const RULE_WARNING_S = 3;
  const SPEED_RAMP_EVERY = 5;
  const SPEED_RAMP_FACTOR = 1.10; // per user request: +10% per ramp
  const SPEED_MAX_MUL = 8.0;
  const MOTHERSHIP_BASE_S = 10;
  const MOTHERSHIP_DECAY = 0.95;
  const MOTHERSHIP_MIN_S = 2;
  const MOTHERSHIP_DELAY_MIN = 8;
  const MOTHERSHIP_DELAY_MAX = 16;
  const BOX_H = 56;
  const SPAWN_BASE_S = 1.7;
  const SPAWN_MIN_S = 0.7;
  const FALL_BASE = 80; // px/sec at speed_mul = 1

  // ---------- Rules ----------
  const RULES = [
    { id: 'odd', label: 'DESTROY IF ODD' },
    { id: 'even', label: 'DESTROY IF EVEN' },
    { id: 'multiple_3', label: 'DESTROY IF MULTIPLE OF 3' },
    { id: 'multiple_4', label: 'DESTROY IF MULTIPLE OF 4' },
    { id: 'multiple_5', label: 'DESTROY IF MULTIPLE OF 5' },
    { id: 'prime', label: 'DESTROY IF PRIME' },
    { id: 'zero', label: 'DESTROY IF RESULT = 0' },
    { id: 'gt_10', label: 'DESTROY IF RESULT > 10' },
    { id: 'gt_20', label: 'DESTROY IF RESULT > 20' },
    { id: 'lt_5', label: 'DESTROY IF RESULT < 5' },
    { id: 'contains_minus', label: 'DESTROY IF CONTAINS −' },
    { id: 'operands_eq_2', label: 'DESTROY IF EXACTLY 2 OPERANDS' },
    { id: 'operands_eq_3', label: 'DESTROY IF EXACTLY 3 OPERANDS' },
    { id: 'operands_gte_4', label: 'DESTROY IF ≥4 OPERANDS' },
  ];

  function isPrime(n) {
    if (n < 2) return false;
    if (n < 4) return true;
    if (n % 2 === 0) return false;
    for (let i = 3; i * i <= n; i += 2) if (n % i === 0) return false;
    return true;
  }

  function ruleMatches(box, ruleId) {
    const a = box.answer;
    switch (ruleId) {
      case 'odd': return Math.abs(a) % 2 === 1;
      case 'even': return a % 2 === 0;
      case 'multiple_3': return a !== 0 && a % 3 === 0;
      case 'multiple_4': return a !== 0 && a % 4 === 0;
      case 'multiple_5': return a !== 0 && a % 5 === 0;
      case 'prime': return isPrime(a);
      case 'zero': return a === 0;
      case 'gt_10': return a > 10;
      case 'gt_20': return a > 20;
      case 'lt_5': return a < 5;
      case 'contains_minus': return /[−-]/.test(box.expr);
      case 'operands_eq_2': return box.operands === 2;
      case 'operands_eq_3': return box.operands === 3;
      case 'operands_gte_4': return box.operands >= 4;
    }
    return false;
  }

  // ---------- Tweaks ----------
  const TWEAKS = /*EDITMODE-BEGIN*/{
    "theme": "slate",
    "fallSpeed": 1.0,
    "spawnRate": 1.0,
    "ruleSpeed": 1.0,
    "mothFreq": 1.0,
    "hardMode": false
  }/*EDITMODE-END*/;

  // ---------- State ----------
  const state = {
    phase: 'title', // title | playing | paused | game_over
    score: STARTING_SCORE,
    best: parseInt(localStorage.getItem('mathris_best') || '0', 10) || 0,
    boxes: [],
    particles: [],
    floaters: [],
    detonationCount: 0,
    correctClicks: 0,
    wrongClicks: 0,
    mothershipKills: 0,
    defuses: 0,
    landingPenalties: 0,
    speedMul: 1.0,
    answersCount: 0,
    activeRule: null,
    ruleTimer: 0,
    ruleFreeze: 0,
    nextBoxId: 1,
    spawnTimer: 1.5,
    mothership: null,
    mothershipTimer: 8.0,
    mothershipsSpawned: 0,
    pendingQ: null, // { type: 'armed'|'mothership', boxId, expr, deadlineS, bounty, miss }
    inputBuffer: '',
    elapsed: 0,
    shake: 0, shakeX: 0, shakeY: 0,
    defuser: { x: 0, y: 0, t: 0, mode: 'idle' }, // bomb-squad character
  };

  // ---------- Helpers ----------
  const rand = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function getPlayArea() {
    const top = 130;       // below HUD + rule banner
    const bottom = H - 100; // above input bar
    return { top, bottom, left: 24, right: W - 24, w: W - 48, h: bottom - 130 };
  }

  // ---------- Box generation ----------
  // Produces a single-box expression with 2-3 operands. After merges,
  // boxes may grow up to MAX_OPERANDS = 6.
  // We always evaluate PEMDAS but ensure integer-clean division.
  function genSingleBox() {
    const opCount = Math.random() < 0.4 ? 2 : 3;
    const parts = [];
    let prevWasNum = false;
    let prevNum = randInt(1, 12);
    parts.push(prevNum);
    for (let i = 0; i < opCount - 1; i++) {
      const op = choice(['+', '−', '×', '÷']);
      let next;
      if (op === '÷') {
        const divisor = randInt(2, 9);
        // make prev divisible by divisor (rewrite prev as quotient*divisor)
        const quot = randInt(2, 12);
        parts[parts.length - 1] = quot * divisor;
        next = divisor;
        prevNum = quot;
      } else {
        next = randInt(1, 12);
      }
      parts.push(op, next);
    }
    // Evaluate with PEMDAS
    // First pass: handle × and ÷
    const ev1 = [parts[0]];
    for (let i = 1; i < parts.length; i += 2) {
      const op = parts[i];
      const n = parts[i + 1];
      if (op === '×') ev1.push(op, n);
      else if (op === '÷') ev1.push(op, n);
      else ev1.push(op, n);
    }
    // Process × and ÷ first
    const stage1 = [parts[0]];
    for (let i = 1; i < parts.length; i += 2) {
      const op = parts[i];
      const n = parts[i + 1];
      if (op === '×' || op === '÷') {
        const last = stage1.pop();
        if (op === '×') stage1.push(last * n);
        else stage1.push(Math.trunc(last / n));
      } else {
        stage1.push(op, n);
      }
    }
    // Process + and −
    let val = stage1[0];
    for (let i = 1; i < stage1.length; i += 2) {
      const op = stage1[i];
      const n = stage1[i + 1];
      if (op === '+') val += n;
      else if (op === '−') val -= n;
    }
    const expr = parts.join('');
    return { expr, answer: val, operands: opCount };
  }

  function evaluateExpr(expr) {
    // PEMDAS evaluation; operators are +, −, ×, ÷
    const tokens = [];
    let cur = '';
    let i = 0;
    while (i < expr.length) {
      const c = expr[i];
      if ('+−×÷'.includes(c)) {
        if (cur) { tokens.push(parseInt(cur, 10)); cur = ''; }
        tokens.push(c);
      } else {
        cur += c;
      }
      i++;
    }
    if (cur) tokens.push(parseInt(cur, 10));
    // Stage 1: × and ÷
    const stage1 = [tokens[0]];
    for (let j = 1; j < tokens.length; j += 2) {
      const op = tokens[j];
      const n = tokens[j + 1];
      if (op === '×' || op === '÷') {
        const last = stage1.pop();
        if (op === '×') stage1.push(last * n);
        else stage1.push(Math.trunc(last / n));
      } else {
        stage1.push(op, n);
      }
    }
    // Stage 2: + and −
    let val = stage1[0];
    for (let j = 1; j < stage1.length; j += 2) {
      const op = stage1[j];
      const n = stage1[j + 1];
      if (op === '+') val += n;
      else if (op === '−') val -= n;
    }
    return val;
  }

  function countOperands(expr) {
    return (expr.match(/[+−×÷]/g) || []).length + 1;
  }

  // ---------- Spawn ----------
  function spawnBox() {
    const playB = getPlayArea();
    const g = genSingleBox();
    const w = Math.max(96, Math.min(160, 24 * (g.expr.length + 2)));
    const x = rand(playB.left + 10, playB.right - w - 10);
    state.boxes.push({
      id: state.nextBoxId++,
      x,
      y: playB.top - 30,
      w,
      h: BOX_H,
      expr: g.expr,
      answer: g.answer,
      operands: g.operands,
      vy: (FALL_BASE * (0.8 + Math.random() * 0.3)) * state.speedMul,
      resting: false,
      armed: false,
      destroyed: false,
      destroyT: 0,
      armT: 0,
      armDeadline: 0,
      pulse: Math.random() * Math.PI * 2,
    });
  }

  // ---------- Merging ----------
  // When two non-armed, non-resting boxes touch, they merge into a longer
  // chain expression (concatenated with '+'). Result evaluated with PEMDAS.
  function tryMerges() {
    let merged = true;
    while (merged) {
      merged = false;
      outer:
      for (let i = 0; i < state.boxes.length; i++) {
        const a = state.boxes[i];
        if (a.destroyed || a.armed) continue;
        for (let j = i + 1; j < state.boxes.length; j++) {
          const b = state.boxes[j];
          if (b.destroyed || b.armed) continue;
          if (a.operands + b.operands > MAX_OPERANDS) continue;
          // Check overlap (allow small tolerance)
          if (boxesOverlap(a, b)) {
            mergeBoxes(a, b);
            merged = true;
            break outer;
          }
        }
      }
    }
  }
  function boxesOverlap(a, b) {
    // Consider two boxes "in contact" if their bounding rects either overlap
    // or sit flush against each other (gap < 6px). This way a falling box
    // that lands on top of a resting box still triggers a merge.
    const ax2 = a.x + a.w, ay2 = a.y + a.h;
    const bx2 = b.x + b.w, by2 = b.y + b.h;
    const hOverlap = Math.min(ax2, bx2) - Math.max(a.x, b.x);
    const vGap = Math.max(a.y, b.y) - Math.min(ay2, by2);
    // Need decent horizontal overlap and either overlapping or flush vertically
    return hOverlap > 14 && vGap < 6;
  }
  function mergeBoxes(a, b) {
    // Keep `a`, remove `b`. Pick the one higher up to keep position.
    const keep = a.y <= b.y ? a : b;
    const drop = a.y <= b.y ? b : a;
    const newExpr = `${keep.expr}+${drop.expr}`;
    const newOperands = countOperands(newExpr);
    keep.expr = newExpr;
    keep.answer = evaluateExpr(newExpr);
    keep.operands = newOperands;
    keep.w = Math.max(96, Math.min(360, 24 * (newExpr.length + 2)));
    keep.pulse = 0;
    drop.destroyed = true;
    drop.destroyT = 0.001;
    // If now 6 operands, ARM
    if (newOperands >= ARM_OPERANDS) {
      armBox(keep);
    }
    state.particles.push({
      x: keep.x + keep.w / 2, y: keep.y + keep.h / 2,
      vx: 0, vy: -60, life: 0.4, maxLife: 0.4,
      size: 16, color: '#ffd24d', kind: 'pulse',
    });
  }
  function armBox(box) {
    box.armed = true;
    box.armDeadline = -1; // pending — countdown starts once it lands
    state.shake = Math.min(0.4, state.shake + 0.2);
    state.particles.push({
      x: box.x + box.w / 2, y: box.y + box.h / 2,
      vx: 0, vy: -60, life: 0.4, maxLife: 0.4,
      size: 16, color: '#ff3a4a', kind: 'pulse',
    });
  }

  // ---------- Update ----------
  let lastTime = performance.now();
  function loop(now) {
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.1) dt = 0.1;
    try {
      if (state.phase === 'playing') update(dt);
      else updateIdle(dt);
      draw();
    } catch (err) { console.error('Mathris loop error:', err); }
    requestAnimationFrame(loop);
  }

  function updateIdle(dt) {
    state.elapsed += dt * 0.5;
  }

  function update(dt) {
    state.elapsed += dt;
    const playB = getPlayArea();

    // Rule rotation
    if (state.ruleFreeze > 0) state.ruleFreeze = Math.max(0, state.ruleFreeze - dt);
    else state.ruleTimer -= dt * TWEAKS.ruleSpeed;
    if (state.ruleTimer <= 0) rotateRule();
    updateRuleBanner();

    const boxesFrozen = isBombCountdownActive();

    // Box physics
    for (const b of state.boxes) {
      if (b.destroyed) {
        b.destroyT += dt;
        continue;
      }
      b.pulse += dt;
      // Armed boxes count down only AFTER they have landed (armDeadline >= 0)
      if (b.armed && b.armDeadline >= 0) {
        b.armDeadline -= dt;
        if (b.armDeadline <= 0) {
          detonate(b);
          continue;
        }
      }
      if (boxesFrozen && !(b.armed && b.armDeadline >= 0)) {
        continue;
      }
      // Falling (works for both armed-but-not-landed and normal boxes)
      if (!b.resting) {
        b.y += b.vy * dt * TWEAKS.fallSpeed;
        const floorY = restingY(b);
        if (b.y + b.h >= floorY) {
          b.y = floorY - b.h;
          b.resting = true;
          if (b.armed && b.armDeadline < 0) {
            // Just landed while armed — START the defuse countdown
            b.armDeadline = ARM_WINDOW_S;
            state.pendingQ = {
              type: 'armed', boxId: b.id, expr: b.expr,
              deadlineS: ARM_WINDOW_S, bounty: DEFUSE_REWARD,
              miss: DETONATE_BASE_COST * Math.pow(DETONATE_GROWTH, state.detonationCount),
            };
            state.defuser.mode = 'running';
            state.defuser.t = 0;
          } else if (state.activeRule && ruleMatches(b, state.activeRule.id)) {
            // Landing penalty for rule-matching non-armed boxes
            state.score = Math.max(0, state.score - LANDING_COST);
            state.landingPenalties++;
            updateHUD();
            showFloater(b.x + b.w / 2, b.y, `−${LANDING_COST}`, '#ff5c6c');
            if (state.score <= 0) { gameOver(); return; }
          }
        }
      } else if (b.resting && !b.armed) {
        // Re-check floor (if box below was destroyed, fall again)
        const floorY = restingY(b);
        if (b.y + b.h < floorY) {
          b.resting = false;
        }
      }
    }
    // Cleanup destroyed boxes after delay
    state.boxes = state.boxes.filter(b => !b.destroyed || b.destroyT < 0.5);

    // Merging
    if (!boxesFrozen) tryMerges();

    // Stack overflow check
    for (const b of state.boxes) {
      if (b.resting && b.y < playB.top + 20) {
        gameOver();
        return;
      }
    }

    // Spawn
    if (!boxesFrozen) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        spawnBox();
        const interval = Math.max(SPAWN_MIN_S, SPAWN_BASE_S / state.speedMul) / TWEAKS.spawnRate;
        state.spawnTimer = interval * rand(0.85, 1.15);
      }
    }

    // Mothership
    updateMothership(dt);

    // Update pending Q from armed box
    if (state.pendingQ && state.pendingQ.type === 'armed') {
      const b = state.boxes.find(x => x.id === state.pendingQ.boxId);
      if (!b || b.destroyed || !b.armed) {
        state.pendingQ = null;
        state.defuser.mode = 'idle';
      } else if (b.armDeadline >= 0) {
        state.pendingQ.deadlineS = b.armDeadline;
      }
    }

    // Defuser animation
    state.defuser.t += dt;

    // Particles
    for (const p of state.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.gravity ?? 200) * dt;
      p.life -= dt;
    }
    state.particles = state.particles.filter(p => p.life > 0);

    // Floaters
    for (const f of state.floaters) {
      f.t += dt;
      f.y -= 50 * dt;
    }
    state.floaters = state.floaters.filter(f => f.t < f.dur);

    // Shake decay
    if (state.shake > 0) {
      state.shake = Math.max(0, state.shake - dt * 3);
      state.shakeX = (Math.random() - 0.5) * state.shake * 14;
      state.shakeY = (Math.random() - 0.5) * state.shake * 14;
    } else {
      state.shakeX = state.shakeY = 0;
    }
  }

  function restingY(box) {
    const playB = getPlayArea();
    let floorY = playB.bottom;
    for (const other of state.boxes) {
      if (other === box || other.destroyed) continue;
      if (!other.resting) continue;
      // Same horizontal column?
      const overlap = !(other.x + other.w < box.x || box.x + box.w < other.x);
      if (overlap && other.y < floorY) {
        floorY = Math.min(floorY, other.y);
      }
    }
    return floorY;
  }

  function isBombCountdownActive() {
    return state.boxes.some(b => !b.destroyed && b.armed && b.armDeadline >= 0);
  }

  function rotateRule() {
    const prev = state.activeRule?.id;
    let next;
    do { next = choice(RULES); } while (next.id === prev);
    state.activeRule = next;
    state.ruleTimer = rand(RULE_MIN_S, RULE_MAX_S);
  }

  function updateRuleBanner() {
    const el = document.getElementById('rule-banner');
    if (!el) return;
    const text = document.getElementById('rule-text');
    text.textContent = state.activeRule?.label || '—';
    if (state.ruleFreeze > 0) {
      el.classList.add('frozen');
      el.classList.remove('warning');
    } else if (state.ruleTimer <= RULE_WARNING_S) {
      el.classList.add('warning');
      el.classList.remove('frozen');
    } else {
      el.classList.remove('warning', 'frozen');
    }
  }

  function detonate(b) {
    const cost = DETONATE_BASE_COST * Math.pow(DETONATE_GROWTH, state.detonationCount);
    state.score = Math.max(0, state.score - Math.round(cost));
    state.detonationCount++;
    state.shake = Math.min(1.0, state.shake + 0.7);
    explode(b.x + b.w / 2, b.y + b.h / 2, '#ff5c6c', 30);
    b.destroyed = true;
    b.destroyT = 0.001;
    state.pendingQ = null;
    state.defuser.mode = 'idle';
    state.inputBuffer = '';
    updateAnswerDisplay();
    showFloater(b.x + b.w / 2, b.y, `BOOM −${Math.round(cost)}`, '#ff5c6c');
    updateHUD();
    if (state.score <= 0) gameOver();
  }

  // ---------- Mothership ----------
  function updateMothership(dt) {
    if (state.mothership) {
      const m = state.mothership;
      m.x += m.vx * dt;
      m.pulse += dt;
      m.deadlineS -= dt;
      if ((m.vx > 0 && m.x > W + 50) || (m.vx < 0 && m.x + m.w < -50) || m.deadlineS <= 0) {
        // Missed — no penalty, just gone
        if (state.pendingQ?.type === 'mothership') state.pendingQ = null;
        state.mothership = null;
      }
      return;
    }
    state.mothershipTimer -= dt * TWEAKS.mothFreq;
    if (state.mothershipTimer <= 0) {
      spawnMothership();
      state.mothershipTimer = rand(MOTHERSHIP_DELAY_MIN, MOTHERSHIP_DELAY_MAX);
    }
  }
  function spawnMothership() {
    // Hard expression: 3-4 operands
    const g = genSingleBox();
    // Make it harder by adding one more chunk
    const extra = genSingleBox();
    const expr = g.expr + '+' + extra.expr;
    const answer = evaluateExpr(expr);
    const operands = countOperands(expr);
    const mw = 230, mh = 48;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const windowS = Math.max(MOTHERSHIP_MIN_S, MOTHERSHIP_BASE_S * Math.pow(MOTHERSHIP_DECAY, state.mothershipsSpawned));
    // Speed: enough to cross in 'windowS' seconds
    const distance = W + 100;
    const vx = (distance / windowS) * dir;
    state.mothership = {
      x: dir > 0 ? -mw - 20 : W + 20,
      y: 110,
      w: mw, h: mh,
      vx,
      expr, answer, operands,
      deadlineS: windowS,
      windowS,
      pulse: 0,
      destroyed: false,
    };
    state.mothershipsSpawned++;
    // Set pending question (mothership priority)
    state.pendingQ = {
      type: 'mothership',
      mothership: state.mothership,
      expr, answer,
      bounty: MOTHERSHIP_BOUNTY,
      deadlineS: windowS,
      miss: 0,
    };
  }

  // ---------- Click handling ----------
  canvas.addEventListener('mousedown', (e) => {
    if (state.phase !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    onCanvasClick(mx, my);
  });

  function onCanvasClick(mx, my) {
    // Find clicked box (topmost in stack first)
    let clicked = null;
    for (let i = state.boxes.length - 1; i >= 0; i--) {
      const b = state.boxes[i];
      if (b.destroyed || b.armed) continue;
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        clicked = b;
        break;
      }
    }
    if (!clicked) return;
    // Check rule match
    if (state.activeRule && ruleMatches(clicked, state.activeRule.id)) {
      // Correct
      const points = 50 + (clicked.operands - 1) * 25;
      state.score += points;
      state.correctClicks++;
      state.answersCount++;
      checkSpeedRamp();
      clicked.destroyed = true;
      clicked.destroyT = 0.001;
      explode(clicked.x + clicked.w / 2, clicked.y + clicked.h / 2, '#5cd97a', 14);
      showFloater(clicked.x + clicked.w / 2, clicked.y, `+${points}`, '#ffd24d');
      updateHUD();
    } else {
      // Wrong
      state.score = Math.max(0, state.score - WRONG_COST);
      state.wrongClicks++;
      state.ruleFreeze = 1.0;
      showFloater(mx, my, `−${WRONG_COST}`, '#ff5c6c');
      state.particles.push({
        x: mx, y: my, vx: 0, vy: 0,
        life: 0.4, maxLife: 0.4,
        size: 20, color: 'rgba(255,92,108,0.6)', kind: 'shock',
      });
      state.shake = Math.min(0.5, state.shake + 0.25);
      updateHUD();
      if (state.score <= 0) gameOver();
    }
  }

  // ---------- Speed ramp ----------
  function checkSpeedRamp() {
    if (state.answersCount > 0 && state.answersCount % SPEED_RAMP_EVERY === 0) {
      state.speedMul = Math.min(SPEED_MAX_MUL, state.speedMul * SPEED_RAMP_FACTOR);
      showFloaterCenter(`SPEED UP! ${state.speedMul.toFixed(2)}×`, '#ff8a3d');
      updateHUD();
    }
  }

  // ---------- Type-answer submit ----------
  function submitAnswer() {
    if (state.phase !== 'playing') return;
    if (!state.pendingQ) {
      if (state.inputBuffer === '') return;
      // No active question — wrong
      state.inputBuffer = '';
      updateAnswerDisplay();
      return;
    }
    const buf = state.inputBuffer;
    if (buf === '' || buf === '-') return;
    const val = parseInt(buf, 10);
    if (isNaN(val)) { state.inputBuffer = ''; updateAnswerDisplay(); return; }
    state.inputBuffer = '';
    updateAnswerDisplay();
    if (state.pendingQ.type === 'mothership') {
      if (val === state.pendingQ.answer) {
        // Solved mothership!
        state.score += MOTHERSHIP_BOUNTY;
        state.mothershipKills++;
        state.answersCount++;
        checkSpeedRamp();
        const m = state.mothership;
        explode(m.x + m.w / 2, m.y + m.h / 2, '#e36ce0', 40);
        showFloater(m.x + m.w / 2, m.y, `+${MOTHERSHIP_BOUNTY}`, '#ffd24d');
        showFloaterCenter('MOTHERSHIP!', '#ff8a3d');
        state.mothership = null;
        state.pendingQ = null;
        updateHUD();
      } else {
        wrongAnswer();
      }
    } else if (state.pendingQ.type === 'armed') {
      if (val === state.pendingQ.answer || val === evaluateExpr(state.pendingQ.expr)) {
        // Defuse!
        const b = state.boxes.find(x => x.id === state.pendingQ.boxId);
        if (b) {
          state.score += DEFUSE_REWARD;
          state.defuses++;
          state.answersCount++;
          checkSpeedRamp();
          explode(b.x + b.w / 2, b.y + b.h / 2, '#5cd97a', 30);
          showFloater(b.x + b.w / 2, b.y, `+${DEFUSE_REWARD}`, '#ffd24d');
          showFloaterCenter('DEFUSED!', '#5cd97a');
          b.destroyed = true;
          b.destroyT = 0.001;
        }
        state.pendingQ = null;
        state.defuser.mode = 'idle';
        updateHUD();
      } else {
        wrongAnswer();
      }
    }
    if (state.score <= 0) gameOver();
  }

  function wrongAnswer() {
    state.score = Math.max(0, state.score - WRONG_COST);
    state.ruleFreeze = 1.0;
    state.shake = Math.min(0.4, state.shake + 0.2);
    showFloaterCenter(`MISS −${WRONG_COST}`, '#ff5c6c');
    // Shake the LCD
    const lcd = document.querySelector('.lcd');
    if (lcd) lcd.animate(
      [{transform: 'translateX(-5px)'}, {transform: 'translateX(5px)'}, {transform: 'translateX(0)'}],
      { duration: 180 }
    );
    updateHUD();
  }

  // ---------- Particles ----------
  function explode(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rand(100, 320);
      state.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: rand(0.4, 0.9), maxLife: 0.9,
        size: rand(4, 9),
        color, kind: 'spark',
        gravity: 300,
      });
    }
  }

  function showFloater(x, y, text, color) {
    window.MathArcadeAudio?.event(text);
    state.floaters.push({ x, y, text, color, t: 0, dur: 1.1, big: false });
  }
  function showFloaterCenter(text, color) {
    window.MathArcadeAudio?.event(text);
    state.floaters.push({ x: W / 2, y: H * 0.35, text, color, t: 0, dur: 1.3, big: true });
  }

  // ---------- HUD ----------
  function updateHUD() {
    document.getElementById('score').textContent = Math.round(state.score);
    document.getElementById('speed').textContent = state.speedMul.toFixed(2) + '×';
    document.getElementById('deton').textContent = state.detonationCount;
  }
  function updateAnswerDisplay() {
    const el = document.getElementById('ans-val');
    if (!el) return;
    if (state.inputBuffer === '') {
      el.innerHTML = '<span class="cursor">_</span>';
    } else {
      el.innerHTML = `${state.inputBuffer}<span class="cursor">|</span>`;
    }
  }

  // ---------- Input ----------
  function pressDigit(d) {
    if (state.phase !== 'playing') return;
    if (state.inputBuffer.length >= 6) return;
    state.inputBuffer += d;
    updateAnswerDisplay();
  }
  function pressMinus() {
    if (state.phase !== 'playing') return;
    if (state.inputBuffer === '') state.inputBuffer = '-';
    else if (state.inputBuffer.startsWith('-')) state.inputBuffer = state.inputBuffer.slice(1);
    else state.inputBuffer = '-' + state.inputBuffer;
    updateAnswerDisplay();
  }
  function pressBackspace() {
    if (state.phase !== 'playing') return;
    state.inputBuffer = state.inputBuffer.slice(0, -1);
    updateAnswerDisplay();
  }

  window.addEventListener('keydown', (e) => {
    if (state.phase === 'title' || state.phase === 'game_over') {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startGame(); return; }
    }
    if (e.key === 'p' || e.key === 'P') { e.preventDefault(); togglePause(); return; }
    if (e.key === 'Enter') { e.preventDefault(); submitAnswer(); return; }
    if (e.key === 'Backspace') { e.preventDefault(); pressBackspace(); return; }
    if (/^[0-9]$/.test(e.key)) { e.preventDefault(); pressDigit(e.key); return; }
    if (e.key === '-' || e.key === '_' || e.key === 'Subtract') { e.preventDefault(); pressMinus(); return; }
  });

  // ---------- Phases ----------
  function startGame() {
    state.phase = 'playing';
    state.score = STARTING_SCORE;
    state.boxes = [];
    state.particles = [];
    state.floaters = [];
    state.detonationCount = 0;
    state.correctClicks = 0;
    state.wrongClicks = 0;
    state.mothershipKills = 0;
    state.defuses = 0;
    state.landingPenalties = 0;
    state.speedMul = 1.0;
    state.answersCount = 0;
    state.activeRule = choice(RULES);
    state.ruleTimer = rand(RULE_MIN_S, RULE_MAX_S);
    state.ruleFreeze = 0;
    state.spawnTimer = 1.0;
    state.mothership = null;
    state.mothershipTimer = 8.0;
    state.mothershipsSpawned = 0;
    state.pendingQ = null;
    state.inputBuffer = '';
    state.shake = 0;
    state.defuser = { x: 0, y: 0, t: 0, mode: 'idle' };
    document.getElementById('overlay').classList.add('hidden');
    updateHUD();
    updateAnswerDisplay();
    updateRuleBanner();
  }
  function togglePause() {
    if (state.phase === 'playing') {
      state.phase = 'paused';
      document.body.classList.add('paused');
    } else if (state.phase === 'paused') {
      state.phase = 'playing';
      document.body.classList.remove('paused');
    }
  }
  function gameOver() {
    state.phase = 'game_over';
    if (state.score > state.best) {
      state.best = state.score;
      localStorage.setItem('mathris_best', String(state.best));
    }
    showGameOverCard();
  }
  function showGameOverCard() {
    const overlay = document.getElementById('overlay');
    overlay.querySelector('.card').remove();
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h1><span class="acc">GAME</span> OVER</h1>
      <div class="sub">the conveyor won this round</div>
      <div class="stats-row">
        <div class="stat-chip"><div class="stat-label">Score</div><div class="stat-val">${state.score}</div></div>
        <div class="stat-chip"><div class="stat-label">Cleared</div><div class="stat-val">${state.correctClicks}</div></div>
        <div class="stat-chip"><div class="stat-label">Defused</div><div class="stat-val">${state.defuses}</div></div>
        <div class="stat-chip hi"><div class="stat-label">Best</div><div class="stat-val">${state.best}</div></div>
      </div>
      <button class="big-btn" id="restart-btn">PLAY AGAIN</button>
    `;
    overlay.appendChild(card);
    overlay.classList.remove('hidden');
    document.getElementById('restart-btn').addEventListener('click', startGame);
  }
  document.getElementById('start-btn').addEventListener('click', startGame);

  // =====================================================================
  // RENDERING
  // =====================================================================

  function draw() {
    ctx.save();
    ctx.translate(state.shakeX, state.shakeY);
    drawFactoryBg();
    drawConveyorTop();
    drawDefuser();
    drawBoxes();
    drawMothership();
    drawParticles();
    drawFloaters();
    ctx.restore();
  }

  function drawFactoryBg() {
    // Dark factory gradient + scrolling grid lines (theme-tinted)
    const sky = TWEAKS.theme === 'rust'
      ? ['#1a1010', '#291a16', '#1a1010']
      : TWEAKS.theme === 'void'
      ? ['#0a0814', '#140e22', '#0a0814']
      : ['#0e1118', '#161b29', '#0e1118'];
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, sky[0]);
    g.addColorStop(0.5, sky[1]);
    g.addColorStop(1, sky[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // Subtle grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    const off = (state.elapsed * 30) % gridSize;
    ctx.beginPath();
    for (let x = -off; x < W; x += gridSize) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = -off; y < H; y += gridSize) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
    // Floor line
    const playB = getPlayArea();
    ctx.fillStyle = '#1c2235';
    ctx.fillRect(0, playB.bottom, W, H - playB.bottom);
    ctx.strokeStyle = '#3a4660';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, playB.bottom);
    ctx.lineTo(W, playB.bottom);
    ctx.stroke();
    // Hazard stripes on floor
    ctx.fillStyle = 'rgba(255,210,77,0.08)';
    const stripeOff = (state.elapsed * 60) % 48;
    for (let x = -stripeOff; x < W + 48; x += 48) {
      ctx.save();
      ctx.translate(x, playB.bottom + 5);
      ctx.rotate(-0.4);
      ctx.fillRect(0, 0, 28, 8);
      ctx.restore();
    }
  }

  function drawConveyorTop() {
    // Top conveyor belt (where boxes drop from)
    const playB = getPlayArea();
    const y = playB.top - 18;
    ctx.fillStyle = '#3a4660';
    ctx.fillRect(0, y, W, 14);
    ctx.strokeStyle = '#0e1118';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, y, W, 14);
    // Belt segments scrolling
    const segOff = (state.elapsed * 100) % 32;
    ctx.fillStyle = '#1c2235';
    for (let x = -segOff; x < W; x += 32) {
      ctx.fillRect(x, y + 3, 18, 8);
    }
    // Drop holes
    ctx.fillStyle = '#0a0c12';
    for (let x = 60; x < W - 60; x += 140) {
      const ox = (x + Math.sin(state.elapsed * 0.5 + x) * 30);
      ctx.fillRect(ox, y - 3, 24, 6);
    }
  }

  function drawDefuser() {
    // Small bomb-squad character at the bottom-left of the play area.
    // When mode=running, character runs out to a position; in armed state, looks up.
    const playB = getPlayArea();
    const cx = 60;
    const cy = playB.bottom - 18;
    const running = state.defuser.mode === 'running';
    const t = state.defuser.t;
    // Run cycle
    const stride = running ? Math.sin(t * 14) * 4 : 0;
    const stepBob = running ? Math.abs(Math.sin(t * 14)) * 3 : 0;
    ctx.save();
    ctx.translate(cx, cy - stepBob);
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 14, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Legs
    ctx.fillStyle = '#3a4660';
    ctx.strokeStyle = '#0e1118';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(-7 + stride, 4, 5, 12);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.rect(2 - stride, 4, 5, 12);
    ctx.fill(); ctx.stroke();
    // Body (yellow hazmat)
    ctx.fillStyle = '#ffd24d';
    ctx.beginPath();
    roundRect(-10, -10, 20, 18, 4);
    ctx.fill(); ctx.stroke();
    // Belt
    ctx.fillStyle = '#0e1118';
    ctx.fillRect(-10, 2, 20, 3);
    // Head (helmet)
    ctx.fillStyle = '#ff8a3d';
    ctx.beginPath();
    ctx.arc(0, -18, 8, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Helmet stripe
    ctx.fillStyle = '#fff4dc';
    ctx.fillRect(-8, -20, 16, 3);
    // Face shield
    ctx.fillStyle = 'rgba(160, 200, 220, 0.7)';
    ctx.beginPath();
    ctx.arc(0, -16, 5, 0, Math.PI * 2);
    ctx.fill();
    // Eyes
    ctx.fillStyle = '#0e1118';
    ctx.beginPath();
    ctx.arc(-2, -17, 1.5, 0, Math.PI * 2);
    ctx.arc(2, -17, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // Arms
    ctx.fillStyle = '#ffd24d';
    if (running) {
      // pumping arms
      const ar = Math.sin(t * 14) * 0.4;
      ctx.save(); ctx.translate(-10, -4); ctx.rotate(ar); ctx.fillRect(-3, 0, 5, 12); ctx.strokeRect(-3, 0, 5, 12); ctx.restore();
      ctx.save(); ctx.translate(10, -4); ctx.rotate(-ar); ctx.fillRect(-2, 0, 5, 12); ctx.strokeRect(-2, 0, 5, 12); ctx.restore();
    } else {
      ctx.fillRect(-13, -4, 4, 12);
      ctx.strokeRect(-13, -4, 4, 12);
      ctx.fillRect(9, -4, 4, 12);
      ctx.strokeRect(9, -4, 4, 12);
    }
    // Antenna with bouncing ball when running
    if (running) {
      ctx.strokeStyle = '#0e1118';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(4, -25);
      ctx.lineTo(8, -34 + Math.sin(t * 10) * 2);
      ctx.stroke();
      ctx.fillStyle = '#ff3a4a';
      ctx.beginPath();
      ctx.arc(8, -34 + Math.sin(t * 10) * 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ---------- Boxes ----------
  function drawBoxes() {
    // Draw resting boxes first, then falling
    const sorted = [...state.boxes].sort((a, b) => {
      if (a.armed !== b.armed) return a.armed ? 1 : -1;
      return a.y - b.y;
    });
    for (const b of sorted) {
      if (b.destroyed) drawDestroyedBox(b);
      else if (b.armed) drawArmedBox(b);
      else drawBox(b);
    }
  }

  function drawBox(b) {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    // No visual hint about which box matches the rule — the player must
    // evaluate the expression themselves.
    ctx.save();
    ctx.translate(b.x, b.y);
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.ellipse(b.w / 2, b.h + 4, b.w * 0.42, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Cardboard body — same color regardless of match
    const bodyCol = '#d6a868';
    const edgeCol = '#8a5a26';
    ctx.fillStyle = bodyCol;
    ctx.strokeStyle = '#1a1f2e';
    ctx.lineWidth = 3;
    roundRect(0, 0, b.w, b.h, 6);
    ctx.fill(); ctx.stroke();
    // Top tape strip
    ctx.fillStyle = '#b3895a';
    ctx.fillRect(0, 0, b.w, 10);
    ctx.strokeRect(0, 0, b.w, 10);
    // Tape corners
    ctx.fillStyle = edgeCol;
    ctx.fillRect(0, 0, 14, 4);
    ctx.fillRect(b.w - 14, 0, 14, 4);
    // Plank lines
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 1.5;
    for (let i = 1; i < 3; i++) {
      const xx = (b.w / 3) * i;
      ctx.beginPath();
      ctx.moveTo(xx, 12);
      ctx.lineTo(xx, b.h - 4);
      ctx.stroke();
    }
    // Cute eyes
    const eyeY = 18;
    const eyeR = 3.5;
    ctx.fillStyle = '#1a1f2e';
    ctx.beginPath();
    ctx.arc(14, eyeY, eyeR, 0, Math.PI * 2);
    ctx.arc(b.w - 14, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fill();
    // Shine
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(13, eyeY - 1, 1.2, 0, Math.PI * 2);
    ctx.arc(b.w - 15, eyeY - 1, 1.2, 0, Math.PI * 2);
    ctx.fill();
    // Expression
    const fontSize = Math.min(22, Math.max(14, Math.round(b.w / (b.expr.length * 0.65))));
    ctx.font = `bold ${fontSize}px "Lilita One", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1a1f2e';
    ctx.fillText(b.expr, b.w / 2, b.h - 16);
    // Operand count badge
    if (b.operands >= 4) {
      ctx.fillStyle = '#ff3a4a';
      ctx.strokeStyle = '#1a1f2e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(b.w - 8, 8, 8, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px "Lilita One", sans-serif';
      ctx.fillText(String(b.operands), b.w - 8, 9);
    }
    ctx.restore();
  }

  function drawArmedBox(b) {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const pulse = 0.5 + 0.5 * Math.sin(state.elapsed * 16);
    // Big red glow
    const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, b.w * 0.9);
    glow.addColorStop(0, `rgba(255, 58, 74, ${0.6 + pulse * 0.3})`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(b.x - b.w, b.y - b.h, b.w * 3, b.h * 3);
    ctx.save();
    ctx.translate(b.x, b.y);
    // Body (red armed)
    ctx.fillStyle = '#ff3a4a';
    ctx.strokeStyle = '#1a1f2e';
    ctx.lineWidth = 4;
    roundRect(0, 0, b.w, b.h, 6);
    ctx.fill(); ctx.stroke();
    // Hazard stripes
    ctx.fillStyle = '#1a1f2e';
    for (let i = -b.h; i < b.w; i += 14) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(i, 0); ctx.lineTo(i + 6, 0);
      ctx.lineTo(i + 6 - b.h, b.h); ctx.lineTo(i - b.h, b.h);
      ctx.closePath();
      ctx.clip();
      ctx.fillRect(0, 0, b.w, b.h);
      ctx.restore();
    }
    // Outline
    ctx.strokeStyle = '#1a1f2e';
    ctx.lineWidth = 4;
    roundRect(0, 0, b.w, b.h, 6);
    ctx.stroke();
    // Expression text white
    const fontSize = Math.min(22, Math.max(14, Math.round(b.w / (b.expr.length * 0.65))));
    ctx.font = `bold ${fontSize}px "Lilita One", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff4dc';
    ctx.strokeStyle = '#1a1f2e';
    ctx.lineWidth = 3;
    ctx.strokeText(b.expr, b.w / 2, b.h / 2 - 4);
    ctx.fillText(b.expr, b.w / 2, b.h / 2 - 4);
    // Countdown timer (or "WAITING" while still falling)
    if (b.armDeadline >= 0) {
      const t = Math.max(0, b.armDeadline).toFixed(1);
      ctx.font = 'bold 14px "Lilita One", sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText(`${t}s`, b.w / 2, b.h - 10);
      // Countdown ring
      ctx.strokeStyle = '#fff4dc';
      ctx.lineWidth = 3;
      const fillT = b.armDeadline / ARM_WINDOW_S;
      ctx.beginPath();
      ctx.arc(b.w - 14, 14, 8, -Math.PI / 2, -Math.PI / 2 + fillT * Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.font = 'bold 12px "Lilita One", sans-serif';
      ctx.fillStyle = '#fff4dc';
      ctx.fillText('LANDING…', b.w / 2, b.h - 10);
    }
    ctx.restore();
  }

  function drawDestroyedBox(b) {
    const t = b.destroyT / 0.5;
    if (t > 1) return;
    ctx.save();
    ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
    ctx.scale(1 + t * 0.5, 1 + t * 0.5);
    ctx.globalAlpha = 1 - t;
    ctx.translate(-b.w / 2, -b.h / 2);
    drawBox({ ...b, destroyed: false });
    ctx.restore();
  }

  // ---------- Mothership ----------
  function drawMothership() {
    const m = state.mothership;
    if (!m) return;
    const cx = m.x + m.w / 2;
    const cy = m.y + m.h / 2 + Math.sin(m.pulse * 4) * 2;
    // Glow
    const glow = ctx.createRadialGradient(cx, cy, m.w * 0.3, cx, cy, m.w * 0.8);
    glow.addColorStop(0, 'rgba(227, 108, 224, 0.5)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(m.x - m.w / 2, m.y - m.h, m.w * 2, m.h * 3);
    ctx.save();
    ctx.translate(cx, cy);
    // Drone body
    ctx.fillStyle = '#3a4660';
    ctx.strokeStyle = '#1a1f2e';
    ctx.lineWidth = 3;
    roundRect(-m.w / 2 + 30, -m.h / 2, m.w - 60, m.h, 10);
    ctx.fill(); ctx.stroke();
    // Propellers
    for (const px of [-m.w / 2 + 18, m.w / 2 - 18]) {
      ctx.fillStyle = '#1a1f2e';
      ctx.fillRect(px - 2, -m.h / 2 - 6, 4, 14);
      ctx.strokeRect(px - 2, -m.h / 2 - 6, 4, 14);
      // spinning blades
      const sp = state.elapsed * 30;
      ctx.save();
      ctx.translate(px, -m.h / 2 - 8);
      ctx.rotate(sp + (px > 0 ? 1 : 0));
      ctx.fillStyle = 'rgba(244, 236, 216, 0.55)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 22, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // LED panel display with math
    ctx.fillStyle = '#0a1218';
    roundRect(-m.w / 2 + 36, -m.h / 2 + 6, m.w - 72, m.h - 12, 4);
    ctx.fill();
    ctx.strokeStyle = '#1a1f2e';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = `bold ${Math.min(22, Math.max(14, Math.round(m.w / (m.expr.length * 0.7))))}px "Lilita One", sans-serif`;
    ctx.fillStyle = '#e36ce0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(m.expr, 0, 0);
    // Bounty badge
    ctx.fillStyle = '#ffd24d';
    ctx.strokeStyle = '#1a1f2e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-m.w / 2 + 14, 0, 14, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1a1f2e';
    ctx.font = 'bold 12px "Lilita One", sans-serif';
    ctx.fillText('500', -m.w / 2 + 14, 1);
    // Countdown
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px "Lilita One", sans-serif';
    ctx.fillText(`${m.deadlineS.toFixed(1)}s`, m.w / 2 - 18, 0);
    ctx.restore();
  }

  // ---------- Particles / floaters ----------
  function drawParticles() {
    for (const p of state.particles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = a;
      if (p.kind === 'shock') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 + (1 - a) * 2), 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.kind === 'pulse') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawFloaters() {
    for (const f of state.floaters) {
      const t = f.t / f.dur;
      const a = 1 - t;
      const scale = f.big ? (1 + (1 - Math.min(1, t * 3)) * 0.4) : (1 + t * 0.3);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(f.x, f.y);
      ctx.scale(scale, scale);
      ctx.font = f.big ? 'bold 42px "Lilita One", sans-serif' : 'bold 24px "Lilita One", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = f.big ? 5 : 3;
      ctx.strokeStyle = '#1a1f2e';
      ctx.strokeText(f.text, 0, 0);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, 0, 0);
      ctx.restore();
    }
  }

  // ---------- Util ----------
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

  // =====================================================================
  // TWEAKS
  // =====================================================================
  function setupTweaks() {
    const themeRow = document.getElementById('theme-row');
    if (themeRow) themeRow.querySelectorAll('.opt').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.value === TWEAKS.theme);
      opt.addEventListener('click', () => {
        TWEAKS.theme = opt.dataset.value;
        themeRow.querySelectorAll('.opt').forEach(o => o.classList.toggle('active', o === opt));
        persistTweaks();
      });
    });
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
    slider('fall-speed', 'fallSpeed', 'fall-val', v => `${v.toFixed(1)}×`);
    slider('spawn-rate', 'spawnRate', 'spawn-val', v => `${v.toFixed(1)}×`);
    slider('rule-speed', 'ruleSpeed', 'rule-val', v => `${v.toFixed(1)}×`);
    slider('moth-freq', 'mothFreq', 'moth-val', v => `${v.toFixed(1)}×`);
    const hardCheck = document.getElementById('hard-check');
    hardCheck.checked = !!TWEAKS.hardMode;
    hardCheck.addEventListener('change', () => { TWEAKS.hardMode = hardCheck.checked; persistTweaks(); });

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

  // ---------- Kick off ----------
  updateHUD();
  updateAnswerDisplay();
  state.activeRule = choice(RULES);
  updateRuleBanner();
  draw(); // paint one frame immediately so the scene is never blank before rAF starts
  requestAnimationFrame(loop);

  // Throttle fallback (preview pane sometimes throttles RAF)
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
      try { draw(); } catch (e) {}
      requestAnimationFrame(loop);
    }
  });
  window.addEventListener('focus', () => {
    lastTime = performance.now() - 16;
    try { draw(); } catch (e) {}
  });
})();
