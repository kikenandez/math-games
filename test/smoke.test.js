const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function loadRegistry() {
  const context = { window: {} };
  vm.runInNewContext(read('games-registry.js'), context);
  return context.window.MathArcadeGames;
}

test('game registry maps to hub cards and game pages', () => {
  const html = read('index.html');
  const games = loadRegistry();
  assert.equal(games.length, 17);

  for (const game of games) {
    assert.match(game.id, /^[a-z0-9]+$/);
    assert.ok(game.title);
    assert.ok(html.includes(`href="${game.url}"`), `${game.id} has a hub card`);
    assert.ok(fs.existsSync(path.join(root, game.url)), `${game.id} page exists`);
  }
});

test('local script tags point to existing static files', () => {
  const htmlFiles = ['index.html', 'report.html']
    .concat(loadRegistry().map((game) => game.url));

  for (const rel of htmlFiles) {
    const html = read(rel);
    const dir = path.dirname(path.join(root, rel));
    const scripts = Array.from(html.matchAll(/<script\s+src="([^"]+)"/g)).map((m) => m[1]);
    for (const src of scripts) {
      if (/^(https?:)?\/\//.test(src)) continue;
      assert.ok(fs.existsSync(path.resolve(dir, src)), `${rel} script exists: ${src}`);
    }
  }
});

test('every game page loads the shared chrome scripts in order', () => {
  for (const game of loadRegistry()) {
    const html = read(game.url);
    const scripts = Array.from(html.matchAll(/<script\s+src="([^"]+)"/g)).map((m) => m[1]);
    for (const shared of ['../i18n.js', '../game-shell.js', '../audio.js']) {
      assert.ok(scripts.includes(shared), `${game.id} loads ${shared}`);
    }
    assert.ok(
      scripts.indexOf('../game-shell.js') < scripts.indexOf('../audio.js'),
      `${game.id} loads game-shell.js before audio.js`
    );
    assert.ok(html.includes('<canvas id="game"'), `${game.id} has the game canvas the shell keys on`);
  }
});

test('project JavaScript files pass syntax check', () => {
  const jsFiles = fs.readdirSync(root, { recursive: true })
    .filter((file) => file.endsWith('.js'))
    .filter((file) => !file.includes(`${path.sep}.git${path.sep}`));

  for (const file of jsFiles) {
    execFileSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'pipe' });
  }
});


function loadI18n(lang) {
  const sandbox = {
    window: {},
    localStorage: { getItem: () => null, setItem() {} },
    document: {
      documentElement: {},
      readyState: 'loading',
      addEventListener() {},
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: () => ({
        style: {},
        classList: { add() {}, toggle() {}, contains: () => false },
        setAttribute() {},
        appendChild() {},
        addEventListener() {},
        textContent: ''
      }),
      head: { appendChild() {} },
      body: { appendChild() {} }
    },
    location: { search: '?lang=' + lang, href: 'http://localhost/index.html' },
    URLSearchParams,
    MutationObserver: class { observe() {} disconnect() {} },
    performance: { now: () => 0 }
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  vm.runInNewContext(read('i18n.js'), sandbox);
  return sandbox.MathArcadeI18n.t;
}

function topLevelKeys(lang) {
  // The top-level locale maps live inside `const map = { ... }`, which ends at the
  // first line that is exactly "  };". The dynamic packs come after and reuse the
  // same "    fr: {" / "    es: {" shape, so bound the section by "  };" instead of
  // the first "    }," (which is the close of an inner rules/exact block).
  const src = read('i18n.js');
  const mapStart = src.indexOf('const map = {');
  const mapEnd = src.indexOf('\n  };', mapStart);
  const section = src.slice(mapStart, mapEnd);
  const re = new RegExp('^    ' + lang + ': \\{', 'm');
  const start = section.search(re);
  const rest = section.slice(start);
  const end = rest.match(/\n    \}/);
  const body = rest.slice(0, end.index);
  return [...body.matchAll(/^\s*(['"])(.+?)\1\s*:/gm)].map((m) => m[2]);
}

function dynamicKeys(lang) {
  // The dynamic packs live inside `const dynamic = { ... }`, which closes with a
  // line that is exactly "  };" (the es pack is the last entry, so it ends "    }\n  };").
  // Extract the rules/exact keys (8-space indent) for one locale.
  const src = read('i18n.js');
  const dynStart = src.indexOf('const dynamic = {');
  const dynEnd = src.indexOf('\n  };', dynStart);
  const section = src.slice(dynStart, dynEnd);
  const re = new RegExp('^    ' + lang + ': \\{', 'm');
  const start = section.search(re);
  const rest = section.slice(start);
  const end = rest.match(/\n    \}/);
  const body = rest.slice(0, end.index);
  return [...body.matchAll(/^        '((?:[^'\\\\]|\\\\.)+)':/gm)].map((m) => m[1]);
}

test('i18n dictionaries have no duplicate keys and stay in sync across locales', () => {
  for (const lang of ['fr', 'es']) {
    for (const keys of [topLevelKeys(lang), dynamicKeys(lang)]) {
      const seen = new Set();
      const dups = keys.filter((k) => seen.has(k) || (seen.add(k), false));
      assert.deepEqual(dups, [], `${lang} has duplicate dictionary keys`);
    }
  }

  // The two locales must resolve the same key set: top-level map + dynamic pack.
  // Compare the keys each locale actually resolves (via t()), so a key that is
  // intentionally identical to its translation (e.g. "arcade" -> "arcade") or
  // absent from one locale is caught as a real gap.
  const frKeys = new Set([...topLevelKeys('fr'), ...dynamicKeys('fr')]);
  const esKeys = new Set([...topLevelKeys('es'), ...dynamicKeys('es')]);
  assert.deepEqual([...esKeys].filter((k) => !frKeys.has(k)), [], 'fr dictionaries are missing keys present in es');
  assert.deepEqual([...frKeys].filter((k) => !esKeys.has(k)), [], 'es dictionaries are missing keys present in fr');

  // Dynamic rule/exact packs must carry the same keys in every locale.
  const frDyn = new Set(dynamicKeys('fr'));
  const esDyn = new Set(dynamicKeys('es'));
  assert.deepEqual([...esDyn].filter((k) => !frDyn.has(k)), [], 'fr dynamic pack is missing keys present in es');
  assert.deepEqual([...frDyn].filter((k) => !esDyn.has(k)), [], 'es dynamic pack is missing keys present in fr');
});

test('i18n translates shared chrome and game-over strings in fr and es', () => {
  const keys = [
    'PLAY AGAIN', 'Best', 'Kills', 'NO AMMO', 'ESCAPED!', 'DEFUSED!',
    'self bite!', 'shrunk away!', 'too many escapes!', 'base destroyed!',
    'Fill in all answer boxes first.', 'No more hints! Try checking your math.',
    'Mastered', 'Played', 'Runs', 'Not played', 'Today', 'Yesterday',
    'Back to Arcade', 'Sound off', 'Sound on', 'Language'
  ];
  for (const lang of ['fr', 'es']) {
    const t = loadI18n(lang);
    for (const key of keys) {
      assert.notEqual(t(key), key, `${lang} is missing a translation for ${JSON.stringify(key)}`);
    }
  }
});

test('i18n dynamic patterns translate level, wave, and combo strings', () => {
  const t = loadI18n('fr');
  assert.equal(t('LEVEL 3: EVEN NUMBERS'), 'NIVEAU 3 : NOMBRES PAIRS');
  assert.equal(t('WAVE 2'), 'VAGUE 2');
  assert.equal(t('START WAVE 4'), 'LANCER LA VAGUE 4');
  assert.equal(t('EAT 5 MORE!'), 'ENCORE 5 !');
  assert.equal(t('COMBO \u00d73!'), 'COMBO \u00d73 !');
});
