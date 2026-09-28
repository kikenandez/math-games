(function () {
  function createCanvasStage(canvas, ctx, options) {
    const cfg = options || {};
    const maxDpr = cfg.maxDpr || 2;
    let width = 0;
    let height = 0;
    let dpr = 1;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, maxDpr);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (typeof cfg.onResize === 'function') {
        cfg.onResize({ width, height, dpr });
      }
    }

    window.addEventListener('resize', resize);
    resize();

    return {
      resize,
      get width() { return width; },
      get height() { return height; },
      get dpr() { return dpr; }
    };
  }

  // ---------------------------------------------------------------------------
  // Shared page chrome for game pages.
  //
  // A game page is any page with a <canvas id="game">. On such pages the shared
  // floating controls (hub link, sound toggle, language switcher) are shown only
  // while an .overlay (title / briefing / game-over card) is visible, so they can
  // never sit on top of on-screen controls or be tapped by accident mid-run.
  // Pages without any .overlay keep the controls always visible.
  // ---------------------------------------------------------------------------
  function isGamePage() {
    return !!document.querySelector('canvas#game');
  }

  function overlayVisible() {
    const overlays = document.querySelectorAll('.overlay');
    if (!overlays.length) return true;
    return Array.from(overlays).some((o) => !o.classList.contains('hidden'));
  }

  function chromeVisible() {
    return !isGamePage() || overlayVisible();
  }

  const watchers = [];
  let observing = false;

  function notify() {
    const visible = chromeVisible();
    watchers.forEach((cb) => {
      try { cb(visible); } catch (e) { /* ignore */ }
    });
  }

  function watchChrome(cb) {
    watchers.push(cb);
    cb(chromeVisible());
    if (!observing && document.body) {
      observing = true;
      // Overlays are shown/hidden by toggling a class, so one attribute observer
      // is enough to track every title / game-over transition.
      const observer = new MutationObserver(notify);
      observer.observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true });
    }
  }

  function hubUrl() {
    const url = new URL('../index.html', window.location.href);
    const lang = localStorage.getItem('mathArcadeLang');
    if (lang && lang !== 'en') url.searchParams.set('lang', lang);
    return url.href;
  }

  function addHubLink() {
    if (!isGamePage() || document.querySelector('.hub-link')) return;
    const style = document.createElement('style');
    style.textContent =
      '.hub-link{position:fixed;left:14px;bottom:14px;z-index:9999;display:inline-flex;align-items:center;gap:6px;' +
      'padding:7px 14px 8px 11px;background:rgba(5,6,20,.78);border:2px solid rgba(255,244,220,.75);border-radius:999px;' +
      'box-shadow:0 4px 0 rgba(0,0,0,.45);color:#fff4dc;text-decoration:none;font-family:"Lilita One",Fredoka,Arial,sans-serif;' +
      'font-size:13px;letter-spacing:.08em;line-height:1;transition:transform .1s,box-shadow .1s}' +
      '.hub-link .arrow{font-size:11px;color:#ffd24d}' +
      '.hub-link:hover{transform:translateY(-1px);box-shadow:0 5px 0 rgba(0,0,0,.45)}' +
      '.hub-link:active{transform:translateY(2px);box-shadow:0 2px 0 rgba(0,0,0,.45)}' +
      '.hub-link:focus-visible{outline:2px solid #7ad1ff;outline-offset:2px}';
    document.head.appendChild(style);

    const link = document.createElement('a');
    link.className = 'hub-link';
    link.href = hubUrl();
    link.setAttribute('aria-label', 'Back to Arcade');
    link.title = 'Back to Arcade';
    const arrow = document.createElement('span');
    arrow.className = 'arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '◀';
    const label = document.createElement('span');
    label.textContent = 'ARCADE';
    link.appendChild(arrow);
    link.appendChild(label);
    document.body.appendChild(link);

    watchChrome((visible) => {
      const display = visible ? '' : 'none';
      if (link.style.display !== display) link.style.display = display;
    });
  }

  window.MathArcadeShell = {
    createCanvasStage,
    isGamePage,
    overlayVisible,
    chromeVisible,
    watchChrome
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addHubLink);
  } else {
    addHubLink();
  }
})();
