(function () {
  const PREFIX = 'mathArcade.';

  function keyFor(scope, id) {
    return PREFIX + scope + '.' + id;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return clone(fallback);
      return JSON.parse(raw);
    } catch (e) {
      return clone(fallback);
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function normalizeSettings(defaults, stored) {
    const out = clone(defaults);
    if (!stored || typeof stored !== 'object') return out;

    Object.keys(defaults).forEach((name) => {
      if (!Object.prototype.hasOwnProperty.call(stored, name)) return;
      const expectedType = typeof defaults[name];
      if (typeof stored[name] === expectedType) out[name] = stored[name];
    });

    return out;
  }

  function getSettings(gameId, defaults) {
    return normalizeSettings(defaults, readJSON(keyFor('settings', gameId), {}));
  }

  function hydrateSettings(gameId, target) {
    Object.assign(target, getSettings(gameId, target));
    return target;
  }

  function setSettings(gameId, settings) {
    return writeJSON(keyFor('settings', gameId), settings);
  }

  function markPlayed(gameId, at) {
    try {
      localStorage.setItem(keyFor('lastPlayed', gameId), at || new Date().toISOString());
      return true;
    } catch (e) {
      return false;
    }
  }

  function readInt(key) {
    if (!key) return 0;
    try {
      const value = parseInt(localStorage.getItem(key) || '0', 10);
      return Number.isFinite(value) ? value : 0;
    } catch (e) {
      return 0;
    }
  }

  function writeInt(key, value) {
    try {
      localStorage.setItem(key, String(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function getBest(gameId) {
    return readInt(gameId + '_best');
  }

  function setBest(gameId, score) {
    return writeInt(gameId + '_best', score);
  }

  function getSolved(gameId) {
    return readInt(gameId + '_solved');
  }

  function setSolved(gameId, count) {
    return writeInt(gameId + '_solved', count);
  }

  function getHistory(gameId) {
    return readJSON('dyslexiaScreening.' + gameId, null);
  }

  function recordSession(gameId, summary) {
    try {
      const key = 'dyslexiaScreening.' + gameId;
      const store = readJSON(key, { history: [] }) || { history: [] };
      store.lastSession = summary;
      store.history = (store.history || []).concat([summary]).slice(-50);
      return writeJSON(key, store);
    } catch (e) {
      return false;
    }
  }

  function readHistoryCount(gameId) {
    const data = getHistory(gameId);
    return Array.isArray(data && data.history) ? data.history.length : 0;
  }

  function readHistoryRows(gameId, limit) {
    const data = getHistory(gameId);
    const rows = Array.isArray(data && data.history) ? data.history : [];
    return limit ? rows.slice(-limit).reverse() : rows;
  }

  window.MathArcadeStorage = {
    getSettings,
    hydrateSettings,
    setSettings,
    markPlayed,
    keyFor,
    readInt,
    writeInt,
    getBest,
    setBest,
    getSolved,
    setSolved,
    getHistory,
    recordSession,
    readHistoryCount,
    readHistoryRows
  };
})();
