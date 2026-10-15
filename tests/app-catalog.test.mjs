/* Test for the app catalog system (data/applications.js).
 *
 * Part 1 — catalog: parses the catalog, checks every entry (id, name,
 *          path, icon, order) and that each app.html only carries render
 *          code (all metadata belongs in the catalog).
 * Part 2 — boot: serves the repo over a local HTTP server and boots the
 *          real index.html in jsdom, then asserts registerApp() merged the
 *          catalog metadata for all apps in menu order.
 *
 * Run:  node tests/app-catalog.test.mjs   (part 2 requires `npm i --no-save jsdom`)
 */
import { createRequire } from 'module';
import { readFileSync, existsSync, statSync } from 'fs';
import { readdir } from 'fs/promises';
import { createServer } from 'http';
import { join, extname, normalize } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);

let passed = 0, failed = 0;
const ok = (c, m) => { if (c) passed++; else { failed++; console.error('  FAIL:', m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---- part 1: catalog ---------------------------------------------------- */
global.window = {};
require(join(ROOT, 'data/applications.js'));
require(join(ROOT, 'assets/config-loader.js'));
const apps = window.PROTON_APPLICATIONS || [];

console.log('• catalog');
ok((window.PROTON_CATALOG_WARNINGS || []).length === 0, 'no catalog warnings: ' + JSON.stringify(window.PROTON_CATALOG_WARNINGS));
ok(apps.length === 45, '45 enabled apps (got ' + apps.length + ')');

/* The 25 apps proton shipped with, then the 20 streamed arcade games (kept
 * together, after the built-in board/card games and before the test apps). */
const CORE_ORDER = ['files', 'notes', 'calendar', 'contacts', 'appcenter', 'customize',
  'settings', 'about', 'math', 'spreadsheet', 'presentation', 'whiteboard', 'logic-sim',
  'terminal', 'browser', 'media', 'pdf', 'sudoku', 'chess', 'checkers', 'klondike',
  'backgammon'];
const ARCADE_ORDER = ['ampler-launcher', 'fnaf-1', 'fnaf-2', 'fnaf-3', 'fnaf-4',
  'fnaf-sister-location', 'spacebar-clicker', 'baldis-basics', 'kart-bros', 'retro-bowl',
  'pac-man', 'football-bros', 'geometry-dash-lite', 'backrooms', 'flappy-bird',
  'drift-boss', 'bloxorz', 'minesweeper', 'google-dino', 'granny'];
const TEST_ORDER = ['hello-test', 'speed-test', 'storage-test'];
const EXPECTED_ORDER = [...CORE_ORDER, ...ARCADE_ORDER, ...TEST_ORDER];
ok(apps.map((a) => a.id).join(',') === EXPECTED_ORDER.join(','),
  'menu order matches the original index.html link order');

const ids = new Set();
const iconsSrc = readFileSync(join(ROOT, 'assets/icons.js'), 'utf8');
for (const a of apps) {
  ok(!ids.has(a.id), 'unique id: ' + a.id); ids.add(a.id);
  ok(existsSync(join(ROOT, a.path)), 'path exists: ' + a.id + ' → ' + a.path);
  ok(new RegExp(`['"]${a.icon}['"]`).test(iconsSrc), 'icon exists: ' + a.icon + ' (' + a.id + ')');
  ok(a.name && a.cat && a.w > 0 && a.h > 0, 'name/cat/size present: ' + a.id);
}

/* ---- streamed arcade games ----------------------------------------------
 * The twenty arcade titles run builds that live on proton-arcade.github.io and
 * are framed live (see assets/game-host.js and CREDITS.md). Two invariants are
 * worth pinning down: their catalog metadata is complete, and their bytes are
 * genuinely NOT vendored here — the whole reason they stream is that the set is
 * roughly half a gigabyte of self-contained .html builds. */
console.log('• streamed arcade games');
const arcade = apps.filter((a) => ARCADE_ORDER.includes(a.id));
ok(arcade.length === ARCADE_ORDER.length,
  `all ${ARCADE_ORDER.length} arcade games are catalogued (got ${arcade.length})`);
ok(arcade.every((a) => a.cat === 'Games'), 'every arcade game sits in the Games category');
ok(arcade.every((a) => a.icon !== 'grid'), 'every arcade game has an icon of its own');

const hostSrc = readFileSync(join(ROOT, 'assets/game-host.js'), 'utf8');
ok(hostSrc.includes("const ORIGIN = 'https://proton-arcade.github.io'"),
  'the game host streams from Proton Arcade');
ok(readFileSync(join(ROOT, 'index.html'), 'utf8').includes('assets/game-host.js'),
  'index.html loads the shared game host before boot');

for (const a of arcade) {
  const dir = join(ROOT, 'apps', a.id);
  const files = (await readdir(dir)).sort();
  ok(files.join(',') === 'app.html',
    `apps/${a.id}/ holds only its module, no vendored build (${files.join(', ')})`);
  const mod = readFileSync(join(dir, 'app.html'), 'utf8');
  ok(mod.includes('PROTON_ARCADE.open('), `apps/${a.id} uses the shared host`);
  const src = /src:\s*'([^']+)'/.exec(mod);
  ok(!!src && /^website\/games\/.+\/index\.html$/.test(src[1]),
    `apps/${a.id} names a remote build (${src ? src[1] : 'no src'})`);
  ok(!/data:[a-z+]+\/[a-z0-9.+-]+;base64/i.test(mod), `apps/${a.id} inlines no payload`);
}

/* Nothing anywhere under apps/ may be a build: every app, streamed or not, is
 * one small module plus at most its own hand-written assets. */
const fat = [];
const walk = async (d) => {
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) await walk(p);
    else if (statSync(p).size > 1024 * 1024) fat.push(p.slice(ROOT.length) + ` (${statSync(p).size} B)`);
  }
};
await walk(join(ROOT, 'apps'));
ok(fat.length === 0, 'no file over 1 MB is committed under apps/: ' + fat.join(', '));

/* enabled=false hides without deleting */
window.PROTON_APPLICATIONS_TEXT = '[application]\nid=ghost\nname=Ghost\npath=apps/ghost/app.html\nenabled=false';
delete window.PROTON_APPLICATIONS;
delete require.cache[require.resolve(join(ROOT, 'assets/config-loader.js'))];
require(join(ROOT, 'assets/config-loader.js'));
ok(Array.isArray(window.PROTON_APPLICATIONS) && window.PROTON_APPLICATIONS.length === 0,
  'enabled=false entries are hidden');

/* every app.html: valid script, and no metadata left in it */
for (const dir of await readdir(join(ROOT, 'apps'))) {
  const p = join(ROOT, 'apps', dir, 'app.html');
  if (!existsSync(p)) continue;
  const html = readFileSync(p, 'utf8');
  const m = html.match(/<script data-proton-app>([\s\S]*?)<\/script>/);
  ok(!!m, dir + '/app.html has a data-proton-app block');
  if (!m) continue;
  try { new Function(m[1]); ok(true, dir + ' script parses'); }
  catch (e) { ok(false, dir + ' script parses: ' + e.message); }
  const call = m[1].match(/registerApp\(\{([\s\S]*?)\brender\s*\(/);
  ok(!!call && !/\bid\s*:/.test(call[1]), dir + ' carries no metadata (catalog is the single source)');
}

/* ---- part 2: full boot in jsdom ---------------------------------------- */
console.log('• boot (jsdom + local server)');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.json': 'application/json', '.txt': 'text/plain; charset=utf-8',
};
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost/').pathname);
    const file = normalize(join(ROOT, pathname));
    if (!file.startsWith(ROOT)) throw new Error('outside root');
    const data = readFileSync(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('not found');
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

try {
  const { JSDOM, VirtualConsole } = await import('jsdom');
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('jsdomError: ' + e.message));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  vc.on('warn', (...a) => { if (String(a[0]).includes('catalog')) errors.push('catalog warn: ' + a.join(' ')); });

  const dom = await JSDOM.fromURL(`http://127.0.0.1:${port}/index.html`, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole: vc,
  });
  const { window } = dom;

  let keys = null;
  for (let i = 0; i < 80; i++) {
    await sleep(250);
    try {
      keys = window.eval("typeof APPS !== 'undefined' ? Object.keys(APPS) : null");
      if (keys && keys.length >= EXPECTED_ORDER.length) break;
    } catch { /* APPS not ready yet */ }
  }
  ok(keys && keys.length === EXPECTED_ORDER.length, 'APPS registered at boot (got ' + (keys ? keys.length : 'null') + ')');
  ok((keys || []).join(',') === EXPECTED_ORDER.join(','), 'registered in catalog order');

  const snap = JSON.parse(window.eval(`JSON.stringify({
    id: APPS['logic-sim'].id, name: APPS['logic-sim'].name, icon: APPS['logic-sim'].icon,
    cat: APPS['logic-sim'].cat, w: APPS['logic-sim'].w, h: APPS['logic-sim'].h,
    render: typeof APPS['logic-sim'].render, path: typeof APPS['logic-sim'].path,
    allRender: Object.values(APPS).every((a) => typeof a.render === 'function'),
    noCatalogKeys: Object.values(APPS).every((a) => !a.block && !('enabled' in a)),
    sites: typeof SITES !== 'undefined' ? Object.keys(SITES).length : -1,
  })`));
  ok(snap.name === 'Logic Sim' && snap.icon === 'zap' && snap.cat === 'Create' && snap.w === 1080 && snap.h === 680,
    'catalog metadata merged over app.html: ' + JSON.stringify(snap));
  ok(snap.render === 'function', 'render() kept from app.html');
  ok(snap.path === 'undefined', 'path not leaked into the registered app');
  ok(snap.allRender === true, 'every registered app has render()');
  ok(snap.noCatalogKeys === true, 'catalog-internal keys stripped');
  ok(snap.sites === 6, 'built-in websites still load via <link rel="proton-site"> (6, got ' + snap.sites + ')');
  ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));

  window.close();
} catch (e) {
  if (e.code === 'ERR_MODULE_NOT_FOUND') {
    console.log('  (jsdom not installed — run: npm install --no-save --package-lock=false jsdom)');
  }
  ok(false, 'boot test threw: ' + e.message);
} finally {
  await new Promise((r) => server.close(r));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
