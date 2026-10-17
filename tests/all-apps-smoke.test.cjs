const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');
const source = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// Real Chromium is used for visual QA; this jsdom regression test checks
// the render path of EVERY catalogued app without needing a live server,
// an installed Chromium binary or the publishers' external game builds.
test('all 24 local apps render content and all 89 streamed game modules open a nonblank host', async () => {
  const virtualConsole = new VirtualConsole(), errors = [];
  virtualConsole.on('jsdomError', (err) => errors.push(err.message));
  const dom = new JSDOM('<!doctype html><main id="auth" hidden></main><div id="desktop" hidden></div><div id="toasts"></div>', {
    url: 'https://math-halper.github.io/math-halper.github.io/', runScripts: 'dangerously',
    pretendToBeVisual: true, virtualConsole,
  });
  const { window: w } = dom;
  w.PROTON_FS_MANIFEST = [];
  w.URL.createObjectURL = () => 'blob:mock';
  w.URL.revokeObjectURL = () => {};
  w.HTMLMediaElement.prototype.pause = () => {};
  w.HTMLMediaElement.prototype.play = () => Promise.resolve();
  // jsdom has no canvas implementation; the real Canvas API is exercised by
  // the browser audit, while this shim lets Whiteboard reach its render path.
  w.HTMLCanvasElement.prototype.getContext = function () {
    return new Proxy({ canvas: this, measureText: () => ({ width: 10 }),
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      createLinearGradient: () => ({ addColorStop() {} }) }, {
      get: (obj, key) => key in obj ? obj[key] : () => {},
      set: (obj, key, value) => { obj[key] = value; return true; },
    });
  };
  const run = (text) => {
    const script = w.document.createElement('script');
    script.textContent = text; w.document.body.appendChild(script); script.remove();
  };
  try {
    for (const p of ['assets/store.js', 'assets/icons.js', 'assets/game-icons.js',
      'assets/fs.js', 'assets/fs-archive.js', 'data/applications.js',
      'data/websites.js', 'assets/config-loader.js', 'assets/core.js',
      'assets/desktop-icons.js', 'assets/game-host.js', 'assets/html-loader.js']) run(source(p));
    w.fetchText = async (p) => source(p); // same HTML modules as the real loader
    await w.loadHtmlModules();
    w.eval("currentUser = {username:'Ada',usernameLower:'ada',displayName:'Ada',createdAt:Date.now()}; userData = MH.defaultData('Ada','ada'); enterDesktop();");

    const failures = [], counts = { local: 0, streamed: 0 };
    for (const app of w.PROTON_APPLICATIONS) {
      w.openApp(app.id);
      // Lazy games register their modules asynchronously, so wait for the
      // promise chain to replace the initial "Opening…" UI.
      await new Promise((resolve) => setTimeout(resolve, 0));
      const body = w.eval('wins').get(app.id)?.body;
      const text = body?.textContent || '';
      if (!body || body.innerHTML.length < 100 || /hit a snag|No game source/i.test(text)
        || (app.streamed !== 'true' && /Could not load/i.test(text))) {
        failures.push(`${app.id}: empty or error screen: ${text.slice(0, 150)}`);
      }
      if (app.streamed === 'true') {
        counts.streamed++;
        const frame = body?.querySelector('iframe.arcade-frame');
        const module = source(app.path);
        const match = module.match(/src: '([^']+)'/);
        const expectedPages = {
          'celeste-classic': 'https://math-halper.github.io/Celeste/1/index.html',
          'mario-collection': 'https://math-halper.github.io/Mario/index.html',
        };
        const opaqueRequired = Object.hasOwn(expectedPages, app.id);
        if (!frame || !match || !frame.src.endsWith('/' + match[1])
          || !(/^https:\/\/(proton-arcade|gams-offline|math-halper)\.github\.io\//.test(frame.src) || /local: true/.test(module))
          || (expectedPages[app.id] && frame.src !== expectedPages[app.id])
          || (opaqueRequired && frame.getAttribute('sandbox').split(/\s+/).includes('allow-same-origin'))
          || !body.querySelector('.arcade-loading')
          || !body.querySelector('[data-w="error"]')?.hidden
          || !body.querySelector('.arcade-foot a[target="_blank"]')
          || !body.querySelector('[data-w="ext"]')) {
          failures.push(`${app.id}: streamed game lacks a valid frame, loading UI or direct-link fallback`);
        }
      } else counts.local++;
      w.closeWin(app.id, true);
    }
    assert.deepEqual(counts, { local: 24, streamed: 89 });
    assert.deepEqual(failures, []);
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});
