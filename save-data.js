(function () {
  const EXPORT_VERSION = 1;
  const EXTRA_KEYS = ['mathArcadeLang', 'mathArcadeMuted'];

  function games() {
    return window.MathArcadeGames || [];
  }

  function knownKeys() {
    const keys = new Set(EXTRA_KEYS);
    games().forEach((game) => {
      ['bestKey', 'solvedKey', 'historyKey', 'lastPlayedKey'].forEach((name) => {
        if (game[name]) keys.add(game[name]);
      });
    });

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (isAllowedKey(key)) keys.add(key);
    }

    return Array.from(keys).sort();
  }

  function isAllowedKey(key) {
    return Boolean(key) && (
      key.indexOf('mathArcade.') === 0 ||
      key.indexOf('dyslexiaScreening.') === 0 ||
      EXTRA_KEYS.includes(key) ||
      games().some((game) => game.bestKey === key || game.solvedKey === key || game.historyKey === key || game.lastPlayedKey === key)
    );
  }

  function exportData() {
    const data = {};
    knownKeys().forEach((key) => {
      const value = localStorage.getItem(key);
      if (value !== null) data[key] = value;
    });

    return {
      app: 'Math Arcade',
      schemaVersion: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      data
    };
  }

  function downloadExport() {
    const payload = JSON.stringify(exportData(), null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const day = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = 'math-arcade-saves-' + day + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus('Save data exported.');
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        if (!parsed || typeof parsed !== 'object' || !parsed.data || typeof parsed.data !== 'object') {
          throw new Error('Invalid save file.');
        }

        let count = 0;
        Object.keys(parsed.data).forEach((key) => {
          if (!isAllowedKey(key)) return;
          localStorage.setItem(key, String(parsed.data[key]));
          count++;
        });

        setStatus(count ? 'Save data imported. Refreshing...' : 'No save data found.');
        setTimeout(() => window.location.reload(), 650);
      } catch (e) {
        setStatus('Import failed: invalid save file.');
      }
    };
    reader.readAsText(file);
  }

  function setStatus(text) {
    const el = document.getElementById('save-status');
    if (el) el.textContent = text;
  }

  function init() {
    const exportBtn = document.getElementById('export-saves');
    const importBtn = document.getElementById('import-saves');
    const fileInput = document.getElementById('save-file');
    if (!exportBtn || !importBtn || !fileInput) return;

    exportBtn.addEventListener('click', downloadExport);
    importBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      if (file) importData(file);
      fileInput.value = '';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
