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

  window.MathArcadeShell = {
    createCanvasStage
  };
})();
