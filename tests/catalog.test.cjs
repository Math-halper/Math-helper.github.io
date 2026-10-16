const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');
const source = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

function catalog() {
  const ctx = vm.createContext({ window: {}, console, MH: { esc: (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;') } });
  for (const p of ['assets/icons.js', 'assets/game-icons.js', 'data/applications.js', 'data/websites.js', 'assets/config-loader.js']) vm.runInContext(source(p), ctx);
  return { apps: ctx.window.PROTON_APPLICATIONS, icons: vm.runInContext('ICON_PATHS', ctx), render: vm.runInContext('iconSvg', ctx), picker: vm.runInContext('iconOptions', ctx), warnings: ctx.window.PROTON_CATALOG_WARNINGS };
}

test('every registered game gets its own monochrome SVG icon, including Flappy Bird', () => {
  const { apps, icons, render, picker, warnings } = catalog();
  assert.deepEqual(Array.from(warnings), []);
  const games = apps.filter((a) => a.cat === 'Games');
  assert.equal(games.length, 92); // 5 local + 19 Proton Arcade + 68 new Gams games
  const gams = games.filter((a) => a.id.startsWith('gams-'));
  assert.equal(gams.length, 68); // upstream's 71 games minus 3 titles already present
  assert.ok(!gams.some((a) => ['gams-pacman', 'gams-bloxorz', 'gams-spacebar-clicker'].includes(a.id)));
  const upstream = JSON.parse(source('tests/gams-catalog.json'));
  assert.equal(upstream.games.length, 71);
  const expected = upstream.games.filter((g) => !['Pacman', 'Bloxorz', 'Spacebar Clicker'].includes(g.name))
    .map((g) => g.source).sort();
  const actual = Array.from(gams, (g) => source(g.path).match(/src: '([^']+)'/)[1]).sort();
  assert.deepEqual(actual, expected, 'No upstream game missing, extra, or mistyped');
  assert.equal(new Set(games.map((a) => a.icon)).size, games.length);
  const parser = new JSDOM('').window.DOMParser;
  const seen = new Set();
  for (const game of games) {
    assert.ok(icons[game.icon], `${game.id} has no SVG`);
    const svg = render(game.icon);
    const doc = new parser().parseFromString(svg, 'image/svg+xml');
    assert.equal(doc.querySelector('parsererror'), null, `Invalid SVG for ${game.id}`);
    assert.equal(doc.documentElement.localName, 'svg');
    assert.ok(!svg.includes('<image') && !svg.includes('<foreignObject'), `Raster/foreign icon in ${game.id}`);
    assert.ok(svg.includes('currentColor'), `Non-themed SVG: ${game.id}`);
    assert.ok(!seen.has(svg), `Duplicate artwork: ${game.id}`);
    seen.add(svg);
  }
  const flappy = games.find((a) => a.id === 'flappy-bird');
  assert.equal(flappy.icon, 'game-flappy-bird');
  assert.ok(render(flappy.icon).includes('circle'), 'Flappy Bird shows a bird, not a star');
  const options = picker('game-flappy-bird');
  assert.equal((options.match(/<option value="game-/g) || []).length, 92);
  assert.match(options, /<option value="game-flappy-bird" selected>Flappy Bird<\/option>/);
});

test('game host preserves project subpaths for both publishers', () => {
  const ctx = vm.createContext({ URL, window: {} });
  vm.runInContext(source('assets/game-host.js'), ctx);
  const host = vm.runInContext('PROTON_ARCADE', ctx);
  assert.equal(host.urlFor('website/games/Granny/index.html'), 'https://proton-arcade.github.io/website/games/Granny/index.html');
  assert.equal(host.urlFor('g/g/drivemad/drivemad.html', 'https://gams-offline.github.io/Gams'), 'https://gams-offline.github.io/Gams/g/g/drivemad/drivemad.html');
});

test('every catalog entry points to a real, syntactically valid app module', () => {
  const { apps } = catalog();
  assert.equal(apps.length, 114);
  assert.equal(new Set(apps.map((a) => a.id)).size, apps.length);
  for (const app of apps) {
    assert.ok(fs.existsSync(path.join(ROOT, app.path)), `Missing module: ${app.path}`);
    const script = source(app.path).match(/<script data-proton-app>([\s\S]*?)<\/script>/);
    assert.ok(script, `${app.id} is not a proton module`);
    assert.doesNotThrow(() => new vm.Script(script[1], { filename: app.path }), `Syntax in ${app.id}`);
    if (app.id.startsWith('gams-')) {
      assert.match(script[1], /https:\/\/gams-offline\.github\.io\/Gams/);
      assert.match(script[1], /src: 'g\/.+\.html'/);
    }
  }
});

test('the system manifest includes all tracked site modules and their sizes', () => {
  const ctx = vm.createContext({ window: {} });
  vm.runInContext(source('data/fs-manifest.js'), ctx);
  const entries = ctx.window.PROTON_FS_MANIFEST;
  const paths = new Set(entries.map((e) => e.p));
  for (const { path: p } of catalog().apps) assert.ok(paths.has(p), `Missing from VFS: ${p}`);
  for (const p of ['assets/game-icons.js', 'assets/fs-archive.js', 'apps/text-editor/app.html', 'apps/image-viewer/app.html']) assert.ok(paths.has(p));
  for (const e of entries) {
    assert.ok(fs.existsSync(path.join(ROOT, e.p)), `Stale VFS entry: ${e.p}`);
    assert.equal(e.s, fs.statSync(path.join(ROOT, e.p)).size, `Wrong VFS size: ${e.p}`);
  }
});
