/* Test for the streamed arcade game host (assets/game-host.js).
 *
 * The twenty arcade games in the Games category do not live in this repository:
 * each apps/<id>/app.html asks PROTON_ARCADE.open() to frame that title's build
 * live from proton-arcade.github.io. app-catalog.test.mjs pins down the catalog
 * side (every game is listed, and no build bytes are committed). This file
 * covers the window the host actually builds: the frame's address and its
 * sandbox/feature-policy, the toolbar, the loading state, and that every string
 * interpolated into it is escaped.
 *
 * Run:  node tests/arcade-host.test.mjs   (requires `npm i --no-save jsdom`)
 */
import { readFileSync } from 'fs';
import { createServer } from 'http';
import { join, extname, normalize } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

let passed = 0, failed = 0;
const ok = (c, m) => { if (c) passed++; else { failed++; console.error('  FAIL:', m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

  console.log('• boot');
  const dom = await JSDOM.fromURL(`http://127.0.0.1:${port}/index.html`, {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
  });
  const { window } = dom;

  let ready = false;
  for (let i = 0; i < 80; i++) {
    await sleep(250);
    try {
      ready = window.eval("typeof PROTON_ARCADE !== 'undefined' && typeof APPS !== 'undefined'"
        + " && Object.keys(APPS).length >= 45");
      if (ready) break;
    } catch { /* not booted yet */ }
  }
  ok(ready, 'index.html booted with the game host and all 45 apps registered');
  ok(window.eval("PROTON_ARCADE.ORIGIN") === 'https://proton-arcade.github.io',
    'host streams from Proton Arcade');

  console.log('• address building');
  ok(window.eval("PROTON_ARCADE.urlFor('website/games/Granny/index.html')")
    === 'https://proton-arcade.github.io/website/games/Granny/index.html',
    'urlFor() resolves a catalog path to the live build');
  ok(window.eval("PROTON_ARCADE.urlFor('/website/games/Pac-man/index.html')")
    === 'https://proton-arcade.github.io/website/games/Pac-man/index.html',
    'urlFor() tolerates a leading slash');

  /* Build a game window the way openApp() does: a container for the body and a
   * window element carrying data-app, which is how the host reads the title
   * back out of the catalog. */
  const build = window.eval(`(() => {
    const body = document.createElement('div');
    const winEl = document.createElement('section');
    winEl.dataset.app = 'granny';
    document.body.append(winEl, body);
    PROTON_ARCADE.open(body, { winEl, openApp, close() {} }, {
      src: 'website/games/Granny/index.html', size: '56 MB',
    });
    return body;
  })()`);
  const q = (sel) => build.querySelector(sel);

  console.log('• window contents');
  const frame = q('iframe.arcade-frame');
  ok(!!frame, 'the window contains the game frame');
  ok(frame && frame.getAttribute('src')
    === 'https://proton-arcade.github.io/website/games/Granny/index.html',
    'the frame points at the remote build, not a local copy');
  ok(frame && frame.getAttribute('sandbox') === window.eval('PROTON_ARCADE.SANDBOX'),
    'the frame is sandboxed');
  ok(frame && /allow-scripts/.test(frame.getAttribute('sandbox'))
    && /allow-same-origin/.test(frame.getAttribute('sandbox')),
    'the sandbox lets a build run and keep its own-origin saves');
  ok(frame && frame.getAttribute('allow') === window.eval('PROTON_ARCADE.ALLOW')
    && frame.hasAttribute('allowfullscreen'),
    'the frame may go fullscreen, play audio and use pointer lock');
  ok(frame && frame.getAttribute('title') === 'Granny',
    'the frame is titled from the catalog name, not the module');
  ok(/proton-arcade\.github\.io/.test(q('.appbar h2')?.textContent + q('.arcade-src')?.textContent),
    'the toolbar shows where the build comes from');

  console.log('• toolbar');
  for (const [attr, label] of [['reload', 'Reload'], ['full', 'Fullscreen'], ['ext', 'Open in new tab']]) {
    const b = q(`[data-w="${attr}"]`);
    ok(!!b && b.textContent.includes(label), `toolbar has a working ${label} button`);
  }
  /* jsdom implements neither requestFullscreen nor exitFullscreen, so this
   * exercises the feature-detected fallback: it must tell the player rather
   * than throw and leave a button that silently does nothing. */
  const toastsBefore = window.eval("document.querySelectorAll('#toasts .toast').length");
  q('[data-w="full"]').dispatchEvent(new window.Event('click'));
  const toastsAfter = window.eval("document.querySelectorAll('#toasts .toast').length");
  ok(toastsAfter === toastsBefore + 1,
    'Fullscreen explains itself when the browser lacks the API (a toast appeared)');
  ok(window.eval("[...document.querySelectorAll('#toasts .toast')].some(t => /fullscreen/i.test(t.textContent))"),
    'the toast is about fullscreen');
  ok(/does not store, proxy or upload/.test(q('.arcade-foot')?.textContent || ''),
    'the footnote states plainly that nothing is stored here');
  ok(/about 56 MB on first load/.test(q('.arcade-foot')?.textContent || ''),
    'the footnote warns how big a first load is');

  console.log('• loading state');
  const loading = q('[data-w="loading"]');
  ok(!!loading && !loading.classList.contains('gone'), 'a big build starts behind a loading panel');
  ok(!!q('.arcade-spinner'), 'the loading panel has a spinner');
  frame.dispatchEvent(new window.Event('load'));
  ok(loading.classList.contains('gone'), 'the loading panel clears once the frame reports loaded');

  console.log('• reload');
  frame.setAttribute('src', 'about:blank');
  q('[data-w="reload"]').dispatchEvent(new window.Event('click'));
  ok(frame.getAttribute('src') === 'https://proton-arcade.github.io/website/games/Granny/index.html',
    'Reload puts the build back');
  ok(!loading.classList.contains('gone'), 'Reload brings the loading panel back');

  console.log('• missing source');
  const empty = window.eval(`(() => {
    const body = document.createElement('div');
    PROTON_ARCADE.open(body, { winEl: null }, {});
    return body.textContent;
  })()`);
  ok(/No game source/i.test(empty), 'a module with no src says so instead of framing nothing');

  console.log('• escaping');
  /* Every string the host interpolates comes from a catalog or a module; a name
   * with markup in it must reach the DOM as text, not as elements. */
  const escaped = window.eval(`(() => {
    APPS['xss-probe'] = { id: 'xss-probe', name: '<img src=x onerror=window.__pwned=1>' };
    const body = document.createElement('div');
    const winEl = document.createElement('section');
    winEl.dataset.app = 'xss-probe';
    PROTON_ARCADE.open(body, { winEl }, { src: 'website/games/a<b/index.html', size: '1 MB',
      note: '<script>window.__pwned=1<\\/script>' });
    const out = { pwned: !!window.__pwned, imgs: body.querySelectorAll('img').length,
      scripts: body.querySelectorAll('script').length,
      title: body.querySelector('iframe').getAttribute('title') };
    delete APPS['xss-probe'];
    return out;
  })()`);
  ok(escaped.pwned === false, 'a hostile app name or note cannot execute');
  ok(escaped.imgs === 0 && escaped.scripts === 0, 'hostile markup is rendered as text, not elements');
  ok(escaped.title === '<img src=x onerror=window.__pwned=1>', 'the frame title is escaped, then read back intact');

  ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  window.close();
} catch (e) {
  if (e.code === 'ERR_MODULE_NOT_FOUND') {
    console.log('  (jsdom not installed — run: npm install --no-save --package-lock=false jsdom)');
  }
  ok(false, 'arcade host test threw: ' + e.message);
} finally {
  await new Promise((r) => server.close(r));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
