(function () {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  let ctx = null;
  let master = null;
  let muted = localStorage.getItem('mathArcadeMuted') === '1';
  let lastUi = 0;
  let unlocked = false;

  function ensure() {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.28;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function now() {
    ensure();
    return ctx.currentTime;
  }

  function setMuted(value) {
    muted = value;
    localStorage.setItem('mathArcadeMuted', muted ? '1' : '0');
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.28, ctx.currentTime, 0.015);
    updateButton();
  }

  function tone(freq, start, dur, opts = {}) {
    ensure();
    if (muted) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const type = opts.type || 'sine';
    const end = start + dur;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), end);
    if (opts.wobble) {
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.linearRampToValueAtTime(freq * opts.wobble, start + dur * 0.5);
      osc.frequency.linearRampToValueAtTime(opts.to || freq, end);
    }
    filter.type = opts.filter || 'lowpass';
    filter.frequency.setValueAtTime(opts.cutoff || 2400, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(opts.gain || 0.16, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(end + 0.02);
  }

  function noise(start, dur, opts = {}) {
    ensure();
    if (muted) return;
    const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, opts.decay || 1.8);
    }
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    filter.type = opts.filter || 'bandpass';
    filter.frequency.value = opts.freq || 900;
    filter.Q.value = opts.q || 2;
    gain.gain.setValueAtTime(opts.gain || 0.12, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.buffer = buffer;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(start);
    src.stop(start + dur);
  }

  function click() {
    const t = now();
    tone(520, t, 0.045, { type: 'square', to: 780, gain: 0.055, cutoff: 1800 });
  }

  function unlockAudio() {
    const audio = ensure();
    const confirm = () => {
      if (unlocked) return;
      unlocked = true;
      click();
    };
    if (audio.state === 'running') {
      confirm();
    } else {
      audio.resume().then(confirm).catch(() => {});
    }
  }

  function start() {
    const t = now();
    tone(330, t, 0.08, { type: 'triangle', to: 520, gain: 0.12 });
    tone(660, t + 0.07, 0.09, { type: 'triangle', to: 990, gain: 0.11 });
  }

  function correct() {
    const t = now();
    tone(640, t, 0.08, { type: 'triangle', to: 920, gain: 0.14, wobble: 1.28 });
    tone(960, t + 0.055, 0.09, { type: 'sine', to: 1320, gain: 0.1 });
  }

  function wrong() {
    const t = now();
    tone(220, t, 0.16, { type: 'sawtooth', to: 105, gain: 0.13, cutoff: 1200 });
    noise(t, 0.12, { gain: 0.05, freq: 420, q: 5 });
  }

  function levelClear() {
    const t = now();
    [523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * 0.075, 0.12, {
      type: i % 2 ? 'triangle' : 'sine',
      to: f * 1.08,
      gain: 0.12
    }));
  }

  function gameOver() {
    const t = now();
    tone(392, t, 0.16, { type: 'triangle', to: 294, gain: 0.13 });
    tone(294, t + 0.14, 0.18, { type: 'triangle', to: 196, gain: 0.12 });
    tone(196, t + 0.3, 0.28, { type: 'sawtooth', to: 98, gain: 0.1, cutoff: 900 });
  }

  function boing() {
    const t = now();
    tone(260, t, 0.13, { type: 'sine', to: 720, gain: 0.11, wobble: 1.8 });
  }

  function zap() {
    const t = now();
    tone(1180, t, 0.075, { type: 'square', to: 220, gain: 0.11, cutoff: 2600 });
    noise(t, 0.06, { gain: 0.035, freq: 1600, q: 7 });
  }

  function missileLaunch() {
    const t = now();
    tone(420, t, 0.12, { type: 'square', to: 1280, gain: 0.08, cutoff: 2200, wobble: 1.35 });
    tone(900, t + 0.035, 0.08, { type: 'triangle', to: 1480, gain: 0.045, cutoff: 2600 });
    noise(t, 0.07, { gain: 0.025, freq: 1200, q: 5 });
  }

  function playerBlast() {
    const t = now();
    tone(300, t, 0.12, { type: 'sine', to: 820, gain: 0.09, wobble: 1.55 });
    noise(t, 0.12, { gain: 0.055, freq: 720, q: 2.5 });
  }

  function chainBlast() {
    const t = now();
    tone(740, t, 0.08, { type: 'square', to: 1180, gain: 0.065, cutoff: 2400 });
    tone(1080, t + 0.04, 0.08, { type: 'triangle', to: 520, gain: 0.05, cutoff: 2000 });
    noise(t, 0.055, { gain: 0.025, freq: 1500, q: 6 });
  }

  function pop() {
    const t = now();
    tone(380, t, 0.06, { type: 'sine', to: 980, gain: 0.1, wobble: 1.6 });
    noise(t, 0.035, { gain: 0.035, freq: 1200, q: 3 });
  }

  function explosion() {
    const t = now();
    tone(160, t, 0.22, { type: 'sawtooth', to: 65, gain: 0.11, cutoff: 700 });
    noise(t, 0.24, { gain: 0.12, freq: 240, q: 1.5, filter: 'lowpass' });
  }

  function hint() {
    const t = now();
    tone(880, t, 0.08, { type: 'sine', to: 1320, gain: 0.08 });
    tone(1320, t + 0.09, 0.08, { type: 'sine', to: 1760, gain: 0.07 });
  }

  function event(text) {
    if (!text) return;
    const s = String(text).toUpperCase();
    if (s.includes('GAME OVER') || s.includes('OUT OF MOVES') || s.includes('DESTROYED') || s.includes('SQUASHED') || s.includes('WALL') || s.includes('BITE')) return gameOver();
    if (s.includes('LEVEL') && s.includes('CLEAR')) return levelClear();
    if (s.includes('WAVE') && s.includes('CLEAR')) return levelClear();
    if (s.includes('PERFECT') || s.includes('BONUS') || s.includes('DEFUSED') || s.includes('BALANCED')) return correct();
    if (s.includes('WRONG') || s.includes('MISS') || s.includes('BOOM') || s.includes('NO AMMO') || s.includes('ESCAPED') || s.includes('UNBALANCED')) return wrong();
    if (s.includes('HINT') || s.includes('SHUFFLE') || s.includes('NEW RULE') || s.includes('NEW NUMBERS')) return hint();
    if (s.includes('COMBO') || s.includes('MOTHERSHIP') || s.includes('OVERLOAD')) return zap();
    if (/^\+\d/.test(s) || s.includes('✓')) return pop();
    if (/^-\d|^−\d/.test(s)) return wrong();
    if (s.includes('LEVEL') || s.includes('WAVE')) return start();
  }

  function updateButton() {
    const btn = document.getElementById('sound-toggle');
    if (!btn) return;
    btn.textContent = muted ? '🔇' : '🔊';
    btn.title = muted ? 'Sound off' : 'Sound on';
    btn.setAttribute('aria-label', muted ? 'Sound off' : 'Sound on');
    btn.classList.toggle('muted', muted);
  }

  function addButton() {
    if (document.getElementById('sound-toggle')) return;
    const style = document.createElement('style');
    style.textContent = '#sound-toggle{position:fixed;right:14px;bottom:58px;z-index:9999;width:42px;height:34px;border-radius:999px;border:2px solid rgba(255,244,220,.75);background:rgba(5,6,20,.78);color:#fff4dc;box-shadow:0 4px 0 rgba(0,0,0,.45);font-size:17px;cursor:pointer}#sound-toggle.muted{opacity:.72}#sound-toggle:focus-visible{outline:2px solid #7ad1ff;outline-offset:2px}';
    document.head.appendChild(style);
    const btn = document.createElement('button');
    btn.id = 'sound-toggle';
    btn.type = 'button';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      ensure();
      setMuted(!muted);
      click();
    });
    document.body.appendChild(btn);
    updateButton();
  }

  function maybeUiSound(target) {
    const t = performance.now();
    if (t - lastUi < 90) return;
    lastUi = t;
    if (target.closest && target.closest('#sound-toggle')) return;
    if (target.closest && target.closest('button, a, .opt, .swatch, .card')) click();
    else if (target.tagName === 'CANVAS') boing();
  }

  window.MathArcadeAudio = {
    click, start, correct, wrong, levelClear, gameOver, boing, zap, pop, explosion, hint,
    missileLaunch, playerBlast, chainBlast, event,
    mute: () => setMuted(true),
    unmute: () => setMuted(false),
    get muted() { return muted; }
  };

  document.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });
  document.addEventListener('keydown', unlockAudio, { once: true });
  document.addEventListener('click', (e) => maybeUiSound(e.target), true);
  document.addEventListener('DOMContentLoaded', addButton);
})();
