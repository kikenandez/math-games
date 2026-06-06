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

  window.MathArcadeStorage = {
    getSettings,
    hydrateSettings,
    setSettings,
    markPlayed,
    keyFor
  };
})();
