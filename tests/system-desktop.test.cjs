/* proton ships its System apps only (App Center, Customize, Settings, About
 * and the Browser): every other app, the streamed arcade games, the copied
 * game builds and the built-in websites were removed; the one site that
 * ships is Test Page, the built-in smoke test for the Browser. These tests
 * keep that trimmed build honest — the catalogs parse, every catalogued
 * module and site page is real, the generated file-system manifest still
 * matches the repository, the desktop boots and opens each app, and the test
 * site's own checks pass. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const source = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SYSTEM_APPS = ['appcenter', 'customize', 'settings', 'about', 'browser'];
/* Every script index.html loads, in order, minus boot.js (which starts the
 * auth flow and needs a served page). */
const SHELL = ['assets/store.js', 'assets/icons.js', 'data/fs-manifest.js', 'assets/fs.js',
  'assets/fs-archive.js', 'data/applications.js', 'data/websites.js', 'assets/config-loader.js',
  'assets/core.js', 'assets/desktop-icons.js', 'assets/html-loader.js'];

/* Per-check states, for a readable failure message. */
function CHECK_STATES(w) {
  return [...w.document.querySelectorAll('.tp-check')].map((el) => `${el.id.replace('tp-check-', '')}=${el.dataset.state}`);
}

function catalog() {
  const ctx = vm.createContext({ window: {}, console, MH: { esc: (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;') } });
  for (const p of ['assets/icons.js', 'data/applications.js', 'data/websites.js', 'assets/config-loader.js']) {
    vm.runInContext(source(p), ctx);
  }
  return {
    apps: ctx.window.PROTON_APPLICATIONS,
    sites: ctx.window.PROTON_WEBSITES,
    warnings: ctx.window.PROTON_CATALOG_WARNINGS,
    icons: vm.runInContext('ICON_PATHS', ctx),
    render: vm.runInContext('iconSvg', ctx),
  };
}

test('the catalog is the five System apps plus the one built-in test site', () => {
  const { apps, sites, warnings, icons, render } = catalog();
  assert.deepEqual(Array.from(warnings), [], 'catalog parses without warnings');
  /* Array.from everywhere: the catalogs come from a vm context, so their
   * arrays are not reference-equal to this realm's. */
  assert.deepEqual(Array.from(apps, (a) => a.id), SYSTEM_APPS);
  assert.deepEqual(Array.from(apps, (a) => a.cat), SYSTEM_APPS.map(() => 'System'));
  assert.deepEqual(Array.from(sites, (s) => s.id), ['test-page']);
  const page = { ...sites[0] };
  assert.equal(page.name, 'Test Page');
  assert.equal(page.path, 'websites/test-page/site.html');
  assert.equal(page.icon, 'flask');
  assert.ok(page.desc.includes('TEST SITE'), 'the test site should say what it is');
  assert.ok(icons[page.icon], `test site uses unknown icon "${page.icon}"`);
  assert.ok(fs.existsSync(path.join(ROOT, page.path)), `Missing site page: ${page.path}`);
  for (const app of apps) {
    assert.ok(app.name && app.path && app.desc, `${app.id} is missing metadata`);
    assert.ok(app.w >= 300 && app.h >= 200, `${app.id} has no usable window size`);
    assert.ok(icons[app.icon], `${app.id} uses unknown icon "${app.icon}"`);
    const svg = render(app.icon);
    assert.match(svg, /^<svg[\s\S]*currentColor[\s\S]*<\/svg>$/, `${app.id} icon is not a themed SVG`);
    assert.ok(!svg.includes('<image'), `${app.id} icon embeds a raster image`);
  }
  /* Nothing left in the repository should reference the removed layers. */
  for (const gone of ['assets/game-icons.js', 'assets/game-host.js', 'games']) {
    assert.equal(fs.existsSync(path.join(ROOT, gone)), false, `${gone} should be gone`);
  }
  /* websites/ is back, but only with the catalogued site and the template. */
  const siteFolders = fs.readdirSync(path.join(ROOT, 'websites'), { withFileTypes: true })
    .filter((e) => e.isDirectory()).map((e) => e.name).sort();
  assert.deepEqual(siteFolders, ['_template', 'test-page']);
  const index = source('index.html');
  assert.ok(!index.includes('game-icons.js') && !index.includes('game-host.js'));
});

test('every catalog entry points at a real, syntactically valid app module', () => {
  const { apps } = catalog();
  for (const app of apps) {
    assert.ok(fs.existsSync(path.join(ROOT, app.path)), `Missing module: ${app.path}`);
    const script = source(app.path).match(/<script data-proton-app>([\s\S]*?)<\/script>/);
    assert.ok(script, `${app.id} is not a proton module`);
    assert.doesNotThrow(() => new vm.Script(script[1], { filename: app.path }), `Syntax error in ${app.id}`);
    assert.match(script[1], /registerApp\(/, `${app.id} never registers itself`);
    assert.equal(app.streamed, undefined, `${app.id} should load at boot, not lazily`);
  }
  /* apps/ holds only the shipped apps plus the developer template + guide. */
  const folders = fs.readdirSync(path.join(ROOT, 'apps'), { withFileTypes: true })
    .filter((e) => e.isDirectory()).map((e) => e.name).sort();
  assert.deepEqual(folders, ['_template', 'about', 'app-center', 'browser', 'customize', 'settings']);
});

test('the system manifest still matches the repository exactly', () => {
  const ctx = vm.createContext({ window: {} });
  vm.runInContext(source('data/fs-manifest.js'), ctx);
  const entries = ctx.window.PROTON_FS_MANIFEST;
  assert.ok(entries.length > 20, 'manifest looks empty');
  const paths = new Set(entries.map((e) => e.p));
  const { apps, sites } = catalog();
  for (const p of [...Array.from(apps, (a) => a.path), ...Array.from(sites, (s) => s.path)]) {
    assert.ok(paths.has(p), `Missing from the VFS: ${p}`);
  }
  for (const p of ['index.html', 'assets/core.js', 'assets/fs.js', 'data/applications.js', 'data/websites.js']) {
    assert.ok(paths.has(p), `Missing from the VFS: ${p}`);
  }
  for (const e of entries) {
    const full = path.join(ROOT, e.p);
    assert.ok(fs.existsSync(full), `Stale VFS entry: ${e.p}`);
    assert.ok(!e.p.startsWith('games/') && !e.p.startsWith('tests/'),
      `Removed or dev-only tree still listed: ${e.p}`);
    if (e.p !== 'data/fs-manifest.js') {
      assert.equal(e.s, fs.statSync(full).size, `Wrong VFS size: ${e.p}`);
    }
  }
  /* Every deployed file of the trimmed site is listed (bar dev-only folders). */
  const walk = (dir, prefix = '') => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = prefix + e.name;
    if (e.isDirectory()) return ['node_modules', '.git', 'tests'].includes(e.name) ? [] : walk(path.join(dir, e.name), rel + '/');
    return [rel];
  });
  const onDisk = walk('.').filter((p) => p !== 'data/fs-manifest.js').sort();
  assert.deepEqual(Array.from(entries, (e) => e.p).filter((p) => p !== 'data/fs-manifest.js').sort(), onDisk,
    'Manifest and repository disagree — re-run python3 tools/gen-fs-manifest.py');
});

test('the desktop boots, lists the System apps and opens every one of them', async () => {
  const virtualConsole = new VirtualConsole(), errors = [];
  virtualConsole.on('jsdomError', (err) => errors.push(err.message));
  const dom = new JSDOM('<!doctype html><main id="auth" hidden></main><div id="desktop" hidden></div><div id="toasts"></div>', {
    url: 'https://math-halper.github.io/math-halper.github.io/', runScripts: 'dangerously',
    pretendToBeVisual: true, virtualConsole,
  });
  const { window: w } = dom;
  w.URL.createObjectURL = () => 'blob:mock';
  w.URL.revokeObjectURL = () => {};
  const run = (text) => {
    const script = w.document.createElement('script');
    script.textContent = text; w.document.body.appendChild(script); script.remove();
  };
  try {
    for (const p of SHELL) run(source(p));
    const fetched = [];
    w.fetchText = async (p) => { fetched.push(p); return source(p); };
    await w.loadHtmlModules();
    const { apps } = catalog();
    assert.deepEqual(Array.from(fetched), Array.from(apps, (a) => a.path), 'boot fetches exactly the catalogued modules');
    assert.equal(fetched.length, SYSTEM_APPS.length);

    w.eval("currentUser = {username:'Ada',usernameLower:'ada',displayName:'Ada',createdAt:Date.now()}; userData = MH.defaultData('Ada','ada'); enterDesktop();");
    const wins = w.eval('wins'), APPS = w.eval('APPS');

    // The account defaults point at apps that still exist.
    assert.deepEqual(Array.from(w.eval('userData.settings.pinned')), ['settings', 'appcenter', 'browser']);
    const shortcuts = Array.from(w.eval('userData.desktopIcons'));
    assert.deepEqual(shortcuts.map((s) => s.target), ['settings', 'browser']);
    for (const s of shortcuts) assert.ok(APPS[s.target], `default shortcut to a removed app: ${s.target}`);

    // The start menu shows one System section holding all five apps.
    const menu = w.document.querySelector('#startmenu');
    assert.deepEqual([...menu.querySelectorAll('.sm-cat')].map((e) => e.textContent), ['System']);
    assert.deepEqual([...menu.querySelectorAll('.sm-item')].map((e) => e.dataset.app), SYSTEM_APPS);

    // The panel only pins apps that exist, and each app really renders.
    assert.deepEqual([...w.document.querySelectorAll('#panelapps .pitem')].map((e) => e.dataset.app),
      ['settings', 'appcenter', 'browser']);
    for (const id of SYSTEM_APPS) {
      w.openApp(id);
      const body = wins.get(id)?.body;
      const text = body?.textContent || '';
      assert.ok(body && body.innerHTML.length > 100, `${id} rendered nothing`);
      assert.ok(!/hit a snag|Could not load/i.test(text), `${id} reported an error: ${text.slice(0, 140)}`);
      w.closeWin(id, true);
    }

    // The Browser registers the catalogued site and offers it on its home page.
    w.openApp('browser');
    const browserBody = wins.get('browser').body;
    const SITES = w.eval('SITES');
    assert.deepEqual(Object.keys(SITES), ['test-page']);
    assert.ok(new URL(SITES['test-page'].page).pathname.endsWith('/websites/test-page/site.html'));
    assert.deepEqual([...browserBody.querySelectorAll('#b-sites-menu option')].map((o) => o.value),
      ['', 'test-page']);
    assert.deepEqual([...browserBody.querySelectorAll('[data-site]')].map((b) => b.dataset.site), ['test-page']);
    // Visiting it frames the page at proton://test-page.
    browserBody.querySelector('[data-site="test-page"]').click();
    assert.equal(browserBody.querySelector('#b-url').value, 'proton://test-page');
    assert.ok(browserBody.querySelector('iframe.site-frame').src.endsWith('/websites/test-page/site.html'));
    w.closeWin('browser', true);

    // A file shortcut from an older account is reported, not fatal.
    w.eval("openFSItem('/README.md')");
    assert.equal(wins.size, 0);
    assert.match(w.document.querySelector('#toasts').textContent, /No app can open README\.md/);

    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('Customize still resets to defaults that exist', async () => {
  const { window: w } = new JSDOM('<!doctype html><main id="auth" hidden></main><div id="desktop" hidden></div><div id="toasts"></div>', {
    url: 'https://math-halper.github.io/math-halper.github.io/', runScripts: 'dangerously', pretendToBeVisual: true,
  });
  const run = (text) => { const s = w.document.createElement('script'); s.textContent = text; w.document.body.appendChild(s); s.remove(); };
  try {
    for (const p of SHELL) run(source(p));
    w.fetchText = async (p) => source(p);
    await w.loadHtmlModules();
    w.eval("currentUser = {username:'Ada',usernameLower:'ada',displayName:'Ada',createdAt:Date.now()}; userData = MH.defaultData('Ada','ada'); enterDesktop();");
    w.eval("window.confirm = () => true;");
    w.openApp('customize');
    const body = w.eval('wins').get('customize').body;
    assert.equal(body.querySelector('#cust-files-shortcut'), null, 'Customize still offers a Files shortcut');
    assert.deepEqual([...body.querySelectorAll('#cust-modlist .card b')].map((b) => b.textContent).slice(0, SYSTEM_APPS.length),
      ['App Center', 'Customize', 'Settings', 'About', 'Browser']);
    body.querySelector('#cust-reset').click();
    assert.deepEqual(Array.from(w.eval('userData.settings.pinned')), ['settings', 'appcenter', 'browser']);
    assert.deepEqual(Array.from(w.eval('userData.desktopIcons'), (s) => s.target), ['settings', 'browser']);
  } finally { w.close(); }
});

/* The built-in test site is the smoke test for the Browser, so it has to
 * pass its own checks. Loaded here as a top-level page (no Browser around
 * it), with the page's script run only once the environment is ready: jsdom
 * has no canvas, no HTTP and no storage for a file: URL, so those are stubbed
 * and the two desktop-bridge checks must skip themselves rather than fail. */
test('the Test Page site passes its own checks', async () => {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (err) => {
    if (!/getContext|not implemented/i.test(err.message)) throw err;
  });
  /* runScripts: 'dangerously' so the injected script below is executed, but
   * no `resources`: the linked stylesheet is not fetched (it is injected by
   * hand instead) and the page's own script is run once the stubs are in. */
  const dom = await JSDOM.fromFile(path.join(ROOT, 'websites/test-page/site.html'), {
    runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole,
  });
  const { window: w } = dom;
  try {
    w.HTMLCanvasElement.prototype.getContext = function () {
      const data = new Uint8ClampedArray(4);
      return {
        canvas: this, fillStyle: '', strokeStyle: '', lineWidth: 0, font: '',
        fillRect() { data.set([255, 255, 255, 255]); },
        clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fillText() {},
        getImageData: () => ({ data }),
      };
    };
    w.fetch = async () => ({ ok: true });
    /* jsdom gives a file: URL an opaque origin, where touching localStorage
     * throws — stub a per-window one so the storage check is meaningful. */
    const store = new Map();
    try {
      Object.defineProperty(w, 'localStorage', {
        configurable: true,
        value: {
          getItem: (k) => (store.has(String(k)) ? store.get(String(k)) : null),
          setItem: (k, v) => { store.set(String(k), String(v)); },
          removeItem: (k) => { store.delete(String(k)); },
          clear: () => store.clear(),
          key: (i) => [...store.keys()][i] ?? null,
          get length() { return store.size; },
        },
      });
    } catch { /* a real origin already has one */ }
    /* The page links ../../assets/styles.css, which jsdom does not fetch for
     * a file: URL — inject the real sheet so the "stylesheet applied" check
     * is checking proton's CSS, not nothing. */
    const style = w.document.createElement('style');
    style.textContent = source('assets/styles.css');
    w.document.head.appendChild(style);

    const script = w.document.createElement('script');
    script.textContent = source('websites/test-page/site.html').match(/<script>([\s\S]*?)<\/script>/)[1];
    w.document.body.appendChild(script);

    const summary = () => w.document.querySelector('#tp-summary').textContent;
    /* The page flags an in-flight run on the check list's container, so this
     * waits for a run to finish instead of guessing from the summary text. */
    const settled = async () => {
      for (let i = 0; i < 200 && w.document.querySelector('.card[data-running="true"]'); i++) {
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    };
    await settled();
    const state = (id) => w.document.querySelector(`#tp-check-${id}`).dataset.state;
    assert.equal(summary(), 'All 7 checks passed (2 skipped — open this page in the Browser to run them).',
      CHECK_STATES(w).join(' '));
    assert.equal(state('ctx'), 'skip');
    assert.equal(state('catalog'), 'skip');
    assert.equal(w.document.querySelectorAll('.tp-check[data-state="fail"]').length, 0);

    // Outside the Browser the desktop bridge stays disabled and says why.
    assert.equal(w.document.querySelector('#tp-home').disabled, true);
    assert.equal(w.document.querySelector('#tp-appbtns').children.length, 0);
    assert.match(w.document.querySelector('#tp-ctx').textContent, /Opened outside the Browser/);

    // The manual controls work.
    w.document.querySelector('#tp-inc').click();
    w.document.querySelector('#tp-inc').click();
    assert.equal(w.document.querySelector('#tp-count').textContent, '2');
    w.document.querySelector('#tp-reset').click();
    assert.equal(w.document.querySelector('#tp-count').textContent, '0');
    assert.match(w.document.querySelector('#tp-clock').textContent, /\d{1,2}:\d{2}:\d{2}/);
    w.document.querySelector('#tp-input').value = 'hello proton';
    w.document.querySelector('#tp-form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
    assert.equal(w.document.querySelector('#tp-out').textContent, 'You typed: hello proton');
    w.document.querySelector('#tp-note').value = 'remembered';
    w.document.querySelector('#tp-note-save').click();
    assert.match(w.document.querySelector('#tp-note-out').textContent, /Saved: remembered/);
    assert.equal(w.localStorage.getItem('proton:test-page:note'), 'remembered');

    // Re-running the checks still passes.
    w.document.querySelector('#tp-rerun').click();
    await settled();
    assert.match(summary(), /^All 7 checks passed/);
    w.stop(); // the page's 1 s clock interval must not outlive the test
  } finally { dom.window.close(); }
});
