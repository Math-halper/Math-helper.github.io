const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');
const source = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test('boot loads only local apps; streamed games register immediately and fetch on launch', async () => {
  const dom = new JSDOM('<!doctype html><div id="windows"></div><div id="panelapps"></div><div id="startmenu" hidden></div><div id="toasts"></div>', {
    url: 'https://math-halper.github.io/math-halper.github.io/', runScripts: 'dangerously',
  });
  const w = dom.window, errors = [];
  w.addEventListener('error', (e) => { errors.push(e.message); e.preventDefault(); });
  const run = (text) => { const el = w.document.createElement('script'); el.textContent = text; w.document.body.appendChild(el); el.remove(); };
  try {
    w.PROTON_FS_MANIFEST = [];
    for (const p of ['assets/store.js', 'assets/icons.js', 'assets/game-icons.js', 'assets/fs.js', 'assets/fs-archive.js', 'data/applications.js', 'data/websites.js', 'assets/config-loader.js', 'assets/core.js', 'assets/game-host.js', 'assets/html-loader.js']) run(source(p));
    const calls = [];
    w.fetchText = async (p) => { calls.push(p); return source(p); };
    await w.loadHtmlModules();
    const apps = w.eval('APPS'), wins = w.eval('wins');
    assert.equal(Object.keys(apps).length, 114);
    assert.equal(Object.keys(w.eval('SITES')).length, 6);
    assert.equal(calls.length, 27, 'Only 27 local desktop apps should be fetched at boot');
    assert.ok(!calls.some((p) => p.startsWith('apps/gams-')));
    assert.ok(!calls.includes('apps/flappy-bird/app.html'));
    w.eval("currentUser = {username:'Ada',usernameLower:'ada',displayName:'Ada'}; userData = MH.defaultData('Ada','ada'); userData.moduleOverrides = {'gams-2048': {name:'Tiles 2048'}}; applyModuleOverrides();");
    w.openApp('gams-2048');
    assert.match(wins.get('gams-2048').body.textContent, /Opening 2048/);
    await tick();
    assert.equal(calls.filter((p) => p === 'apps/gams-2048/app.html').length, 1);
    assert.equal(apps['gams-2048'].name, 'Tiles 2048', 'custom name survives lazy registration');
    assert.equal(wins.get('gams-2048').body.querySelector('iframe').src, 'https://gams-offline.github.io/Gams/g/2048.html');
    const gameBody = wins.get('gams-2048').body;
    const gameFrame = gameBody.querySelector('iframe');
    const loader = gameBody.querySelector('.arcade-loading');
    const failure = gameBody.querySelector('[data-w="error"]');
    // Chromium emits iframe `load` even on net::ERR_FAILED. A readable
    // chrome-error: document must show recovery controls, never a blank frame.
    Object.defineProperty(gameFrame, 'contentDocument', { configurable: true,
      get: () => ({ URL: 'chrome-error://chromewebdata/' }) });
    gameFrame.dispatchEvent(new w.Event('load'));
    assert.ok(loader.classList.contains('failed'));
    assert.ok(!loader.classList.contains('gone'));
    assert.ok(!failure.hidden);
    assert.match(failure.textContent, /Retry|Open in new tab/);
    Object.defineProperty(gameFrame, 'contentDocument', { configurable: true, get: () => null });
    gameBody.querySelector('[data-w="retry-inline"]').click();
    assert.ok(!loader.classList.contains('failed'));
    assert.ok(failure.hidden);
    gameFrame.dispatchEvent(new w.Event('load')); // healthy cross-origin game
    assert.ok(loader.classList.contains('gone'));
    w.closeWin('gams-2048');
    w.openApp('gams-2048');
    assert.equal(calls.filter((p) => p === 'apps/gams-2048/app.html').length, 1, 'module is not fetched twice');
    w.closeWin('gams-2048');

    let failOnce = true;
    w.fetchText = async (p) => {
      calls.push(p);
      if (p === 'apps/gams-wordle/app.html' && failOnce) { failOnce = false; throw new Error('Network offline'); }
      return source(p);
    };
    w.openApp('gams-wordle');
    await tick();
    const wordle = wins.get('gams-wordle').body;
    assert.match(wordle.textContent, /Network offline/);
    wordle.querySelector('#game-retry').click();
    await tick();
    assert.equal(calls.filter((p) => p === 'apps/gams-wordle/app.html').length, 2);
    assert.ok(wordle.querySelector('iframe'));
    w.closeWin('gams-wordle');
    assert.deepEqual(errors, []);
  } finally { w.close(); }
});
