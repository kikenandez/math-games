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
  assert.equal(games.length, 16);

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
