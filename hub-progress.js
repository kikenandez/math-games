(function () {
  const games = window.MathArcadeGames || [];
  if (!games.length) return;

  // Shared translator from i18n.js (window.MathArcadeI18n.t). Falls back to the
  // raw English string when i18n is unavailable or the key is unknown.
  const tr = (window.MathArcadeI18n && window.MathArcadeI18n.t) || ((s) => s);
  const storage = window.MathArcadeStorage || null;

  function readNumber(key) {
    if (!key) return 0;
    if (storage && typeof storage.readInt === 'function') return storage.readInt(key);
    const raw = localStorage.getItem(key);
    const value = parseInt(raw || '0', 10);
    return Number.isFinite(value) ? value : 0;
  }

  function readHistoryCount(key) {
    if (!key) return 0;
    if (storage && key.indexOf('dyslexiaScreening.') === 0) {
      return storage.readHistoryCount(key.slice('dyslexiaScreening.'.length));
    }
    try {
      const data = JSON.parse(localStorage.getItem(key) || 'null');
      return Array.isArray(data && data.history) ? data.history.length : 0;
    } catch (e) {
      return 0;
    }
  }

  function formatDate(value) {
    if (!value) return tr('Not played');
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return tr('Not played');

    const today = new Date();
    const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const days = Math.round((startToday - startDate) / 86400000);

    if (days === 0) return tr('Today');
    if (days === 1) return tr('Yesterday');
    if (days > 1 && days < 7) return days + tr(' days ago');
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function gameProgress(game) {
    const best = readNumber(game.bestKey);
    const solved = readNumber(game.solvedKey);
    const historyCount = readHistoryCount(game.historyKey);
    const lastPlayed = localStorage.getItem(game.lastPlayedKey || '');
    const hasProgress = best > 0 || solved > 0 || historyCount > 0 || Boolean(lastPlayed);
    const mastered = game.solvedTotal ? solved >= game.solvedTotal : false;

    return {
      best,
      solved,
      historyCount,
      lastPlayed,
      hasProgress,
      mastered,
      badge: mastered ? tr('Mastered') : (hasProgress ? tr('Played') : tr('New'))
    };
  }

  function makeMetric(label, value) {
    const item = document.createElement('span');
    item.className = 'progress-metric';
    item.innerHTML = '<span>' + label + '</span><b>' + value + '</b>';
    return item;
  }

  function renderCard(game) {
    const card = document.querySelector('.card[href="' + game.url + '"]');
    if (!card) return;

    const progress = gameProgress(game);
    const existing = card.querySelector('.progress-strip');
    if (existing) existing.remove();

    const strip = document.createElement('div');
    strip.className = 'progress-strip ' + (progress.mastered ? 'mastered' : (progress.hasProgress ? 'played' : 'new'));

    const badge = document.createElement('span');
    badge.className = 'progress-badge';
    badge.textContent = progress.badge;
    strip.appendChild(badge);

    const metrics = document.createElement('span');
    metrics.className = 'progress-metrics';

    if (game.solvedKey) {
      const total = game.solvedTotal ? '/' + game.solvedTotal : '';
      metrics.appendChild(makeMetric(tr('Solved'), progress.solved + total));
    } else {
      metrics.appendChild(makeMetric(tr('Best'), progress.best));
    }

    if (game.historyKey && progress.historyCount > 0) {
      metrics.appendChild(makeMetric(tr('Runs'), progress.historyCount));
    }

    metrics.appendChild(makeMetric(tr('Last'), formatDate(progress.lastPlayed)));
    strip.appendChild(metrics);

    const body = card.querySelector('.body');
    if (body) body.appendChild(strip);

    card.addEventListener('click', () => {
      if (game.lastPlayedKey) {
        localStorage.setItem(game.lastPlayedKey, new Date().toISOString());
      }
    });
  }

  function render() {
    games.forEach(renderCard);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
