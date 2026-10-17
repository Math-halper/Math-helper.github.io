/* The current build keeps its five core System apps, plus Celeste Classic
 * as a sandboxed embed of its existing GitHub Pages site. No game content is
 * copied here. The one built-in website is Test Page, the Browser smoke
 * test. These tests keep the catalog, wrapper, generated file-system
 * manifest and running desktop in sync. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const source = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SYSTEM_APPS = ['appcenter', 'customize', 'settings', 'about', 'browser', 'celeste-classic'];
const EMBED_URLS = {
  'celeste-classic': 'https://math-halper.github.io/Celeste/1/index.html',
};
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
    renderIcon: vm.runInContext('iconFor', ctx),
    renderCatalogIcon: vm.runInContext('catalogIconFor', ctx),
    validIconPath: vm.runInContext('isIconAssetPath', ctx),
    loadImageIcon: vm.runInContext('iconImageFromFile', ctx),
  };
}

test('the catalog is five core apps, one embedded game and the built-in test site', () => {
  const { apps, sites, warnings, icons, render, renderCatalogIcon, validIconPath } = catalog();
  assert.deepEqual(Array.from(warnings), [], 'catalog parses without warnings');
  /* Array.from everywhere: the catalogs come from a vm context, so their
   * arrays are not reference-equal to this realm's. */
  assert.deepEqual(Array.from(apps, (a) => a.id), SYSTEM_APPS);
  assert.deepEqual(Array.from(apps, (a) => a.cat), SYSTEM_APPS.map(() => 'System'));
  assert.deepEqual(Array.from(apps, (a) => a.svgIcon), SYSTEM_APPS.map(() => true));
  assert.deepEqual(Array.from(sites, (s) => s.id), ['test-page']);
  const page = { ...sites[0] };
  assert.equal(page.name, 'Test Page');
  assert.equal(page.path, 'websites/test-page/site.html');
  assert.equal(page.icon, 'flask');
  assert.ok(page.desc.includes('TEST SITE'), 'the test site should say what it is');
  if (page.svgIcon) assert.ok(icons[page.icon], `test site uses unknown SVG icon "${page.icon}"`);
  else assert.ok(validIconPath(page.icon), 'test site has an unsafe default image path');
  assert.ok(fs.existsSync(path.join(ROOT, page.path)), `Missing site page: ${page.path}`);
  for (const app of apps) {
    assert.ok(app.name && app.path && app.desc, `${app.id} is missing metadata`);
    assert.ok(app.w >= 300 && app.h >= 200, `${app.id} has no usable window size`);
    if (app.svgIcon) {
      assert.ok(icons[app.icon], `${app.id} uses unknown SVG icon "${app.icon}"`);
      const svg = render(app.icon);
      assert.match(svg, /^<svg[\s\S]*currentColor[\s\S]*<\/svg>$/, `${app.id} icon is not a themed SVG`);
      assert.ok(!svg.includes('<image'), `${app.id} icon embeds a raster image`);
    } else {
      assert.ok(validIconPath(app.icon), `${app.id} has an unsafe default image path`);
      assert.match(renderCatalogIcon(app.icon, false), /^<img class="icn app-icon-image" src="data\/icons\//);
    }
  }
  /* Nothing left in the repository should reference the removed layers. */
  for (const gone of ['assets/game-icons.js', 'assets/game-host.js', 'games']) {
    assert.equal(fs.existsSync(path.join(ROOT, gone)), false, `${gone} should be gone`);
  }
  /* websites/ is back, but only with the catalogued site and the template. */
  const siteFolders = fs.readdirSync(path.join(ROOT, 'websites'), { withFileTypes: true })
    .filter((e) => e.isDirectory()).map((e) => e.name).sort();
  assert.deepEqual(siteFolders, ['_embed', '_template', 'test-page']);
  const index = source('index.html');
  assert.ok(!index.includes('game-icons.js') && !index.includes('game-host.js'));
});

test('uploaded icon data renders only as a small, safe raster image', () => {
  const { renderIcon } = catalog();
  const image = 'data:image/png;base64,AQID';
  assert.equal(renderIcon(image), `<img class="icn app-icon-image" src="${image}" alt="" aria-hidden="true" draggable="false">`);
  assert.match(renderIcon('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='), /^<svg/);
  assert.match(renderIcon('https://example.com/icon.png'), /^<svg/);
  assert.match(renderIcon(`data:image/png;base64,${'A'.repeat(180_001)}`), /^<svg/);
});

test('catalog icons accept local image paths or named inline SVG defaults', () => {
  const ctx = vm.createContext({ window: {}, console });
  vm.runInContext(source('assets/icons.js'), ctx);
  ctx.window.PROTON_APPLICATIONS_TEXT = [
    '[application]', 'id=image-app', 'name=Image App', 'path=apps/inbuilt/image/app.html',
    'icon=data/icons/app-logo.png', 'svg-icon=false',
    '[application]', 'id=vector-app', 'name=Vector App', 'path=apps/inbuilt/vector/app.html',
    'icon=globe', 'svg-icon=true',
    '[application]', 'id=legacy-app', 'name=Legacy App', 'path=apps/inbuilt/legacy/app.html', 'icon=grid',
  ].join('\n');
  ctx.window.PROTON_WEBSITES_TEXT = '';
  vm.runInContext(source('assets/config-loader.js'), ctx);
  const apps = Array.from(ctx.window.PROTON_APPLICATIONS);
  assert.deepEqual(apps.map((app) => [app.icon, app.svgIcon]), [
    ['data/icons/app-logo.png', false], ['globe', true], ['grid', true],
  ]);
  assert.deepEqual(Array.from(ctx.window.PROTON_CATALOG_WARNINGS), []);
  assert.equal(vm.runInContext('appIcon(window.PROTON_APPLICATIONS[0])', ctx),
    '<img class="icn app-icon-image" src="data/icons/app-logo.png" alt="" aria-hidden="true" draggable="false">');
  assert.match(vm.runInContext('appIcon(window.PROTON_APPLICATIONS[1])', ctx), /^<svg/);
  assert.equal(vm.runInContext('isIconAssetPath("data/icons/app-logo.webp")', ctx), true);
  assert.equal(vm.runInContext('isIconAssetPath("data/icons/../app-logo.png")', ctx), false);
});

test('uploaded icon files reject unsafe formats and files over the size limit', async () => {
  const { loadImageIcon } = catalog();
  await assert.rejects(loadImageIcon({ type: 'image/svg+xml', size: 128 }), /PNG, JPG, WebP, GIF, BMP, or AVIF/);
  await assert.rejects(loadImageIcon({ type: 'image/png', size: 8 * 1024 * 1024 + 1 }), /8 MB or smaller/);
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
  /* The game addition is a wrapper only: no game code, assets or repo files
   * are copied into its app folder. */
  for (const [id, url] of Object.entries(EMBED_URLS)) {
    const app = apps.find((entry) => entry.id === id);
    assert.ok(app, `Missing catalog entry for ${id}`);
    const html = source(app.path);
    assert.ok(html.includes(`const EMBED_URL = '${url}';`), `${id} points at the wrong hosted page`);
    assert.match(html, /sandbox="[^"]*allow-scripts[^"]*"/);
    assert.ok(!/sandbox="[^"]*allow-same-origin/.test(html));
    assert.deepEqual(fs.readdirSync(path.dirname(path.join(ROOT, app.path))).sort(), ['app.html']);
  }

  /* apps/ holds the developer templates, the Celeste wrapper and inbuilt/ —
   * the folder with every app built into this site. */
  const folders = fs.readdirSync(path.join(ROOT, 'apps'), { withFileTypes: true })
    .filter((e) => e.isDirectory()).map((e) => e.name).sort();
  assert.deepEqual(folders, ['_embed', '_template', 'celeste-classic', 'inbuilt']);
  const inbuilt = fs.readdirSync(path.join(ROOT, 'apps', 'inbuilt'), { withFileTypes: true })
    .filter((e) => e.isDirectory()).map((e) => e.name).sort();
  assert.deepEqual(inbuilt, ['about', 'app-center', 'browser', 'customize', 'settings']);
  /* The catalog agrees with the tree: only the embedded game sits outside
   * apps/inbuilt/, and it stays a wrapper folder of its own under apps/. */
  for (const app of apps) {
    const home = app.id === 'celeste-classic' ? 'apps/celeste-classic/' : 'apps/inbuilt/';
    assert.ok(app.path.startsWith(home), `${app.id} should live in ${home}, not ${app.path}`);
  }
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
  /* Every deployed file of the trimmed site is listed, using the same
   * exclusions as tools/gen-fs-manifest.py (dependencies, tests, and the
   * underscore-prefixed copy-me template folders). */
  const walk = (dir, prefix = '') => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = prefix + e.name;
    if (e.isDirectory()) {
      return ['node_modules', '.git', 'tests'].includes(e.name) || e.name.startsWith('_')
        ? [] : walk(path.join(dir, e.name), rel + '/');
    }
    return [rel];
  });
  const onDisk = walk('.').filter((p) => p !== 'data/fs-manifest.js').sort();
  assert.deepEqual(Array.from(entries, (e) => e.p).filter((p) => p !== 'data/fs-manifest.js').sort(), onDisk,
    'Manifest and repository disagree — re-run python3 tools/gen-fs-manifest.py');
});

test('the desktop boots, lists and opens all six catalogued apps', async () => {
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

    // The start menu shows one System section holding all six apps.
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
      if (EMBED_URLS[id]) {
        const frame = body.querySelector('iframe.site-frame');
        assert.ok(frame, `${id} did not render its hosted page`);
        assert.equal(frame.getAttribute('src'), EMBED_URLS[id]);
        assert.ok(!frame.getAttribute('sandbox').includes('allow-same-origin'), `${id} frame can access proton storage`);
        assert.ok(body.querySelector('[data-e="ext"]'), `${id} has no direct-link escape hatch`);
      }
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

test('Customize saves, displays and resets uploaded app icon images', async () => {
  const { window: w } = new JSDOM('<!doctype html><main id="auth" hidden></main><div id="desktop" hidden></div><div id="toasts"></div>', {
    url: 'https://math-halper.github.io/math-halper.github.io/', runScripts: 'dangerously', pretendToBeVisual: true,
  });
  const storedImage = 'data:image/webp;base64,AQID';
  w.URL.createObjectURL = () => 'blob:icon-upload';
  w.URL.revokeObjectURL = () => {};
  w.Image = class {
    constructor() { this.naturalWidth = 256; this.naturalHeight = 128; }
    set src(_value) { queueMicrotask(() => this.onload?.()); }
  };
  w.HTMLCanvasElement.prototype.getContext = () => ({ clearRect() {}, drawImage() {} });
  w.HTMLCanvasElement.prototype.toDataURL = () => storedImage;
  const run = (text) => { const s = w.document.createElement('script'); s.textContent = text; w.document.body.appendChild(s); s.remove(); };
  try {
    for (const p of SHELL) run(source(p));
    w.fetchText = async (p) => source(p);
    await w.loadHtmlModules();
    w.eval("APPS.browser.icon = 'data/icons/catalog-browser.png'; APPS.browser.svgIcon = false; currentUser = {username:'Ada',usernameLower:'ada',displayName:'Ada',createdAt:Date.now()}; userData = MH.defaultData('Ada','ada'); userData.customApps.push({id:'legacy-image-app',name:'Saved App',url:'https://example.org/',icon:'globe',desc:'Saved app'}); enterDesktop();");
    w.eval("window.confirm = () => true;");
    assert.equal(w.document.querySelector('#startmenu .sm-item[data-app="browser"] img.app-icon-image')?.getAttribute('src'),
      'data/icons/catalog-browser.png', 'catalog image paths are the default for all users');
    assert.equal(w.document.querySelector('#panelapps .pitem[data-app="browser"] img.app-icon-image')?.getAttribute('src'),
      'data/icons/catalog-browser.png');
    assert.equal(w.document.querySelector('.desktop-icon[data-shortcut="desktop-browser"] img.app-icon-image')?.getAttribute('src'),
      'data/icons/catalog-browser.png');
    w.openApp('customize');
    const body = w.eval('wins').get('customize').body;
    assert.equal(body.querySelector('[data-micon="browser"]').value, '__catalog__');
    let iconSelect = body.querySelector('[data-micon="browser"]');
    iconSelect.value = 'globe';
    body.querySelector('[data-msave="browser"]').click();
    assert.equal(w.eval('APPS.browser.icon'), 'globe');
    assert.equal(w.eval('APPS.browser.svgIcon'), true, 'a selected vector icon overrides the catalog image');
    iconSelect = body.querySelector('[data-micon="browser"]');
    assert.ok(iconSelect.querySelector('option[value="__catalog__"]'), 'image defaults remain available after selecting a vector');
    iconSelect.value = '__catalog__';
    body.querySelector('[data-msave="browser"]').click();
    assert.equal(w.eval('APPS.browser.icon'), 'data/icons/catalog-browser.png');
    assert.equal(w.eval('APPS.browser.svgIcon'), false, 'the catalog image can be restored');
    w.openApp('browser');
    const browserWindow = w.eval('wins').get('browser');
    assert.equal(body.querySelector('#cust-files-shortcut'), null, 'Customize still offers a Files shortcut');
    assert.deepEqual([...body.querySelectorAll('#cust-modlist .card b')].map((b) => b.textContent).slice(0, SYSTEM_APPS.length),
      ['App Center', 'Customize', 'Settings', 'About', 'Browser', 'Celeste Classic']);

    const uploadBrowserIcon = async () => {
      const input = body.querySelector('[data-micon-file="browser"]');
      assert.ok(input, 'Customize should offer an image picker for app icons');
      Object.defineProperty(input, 'files', { configurable: true, value: [{ type: 'image/png', size: 1024 }] });
      await input.onchange();
    };
    await uploadBrowserIcon();
    assert.equal(w.eval('APPS.browser.iconImage'), storedImage);
    assert.equal(JSON.parse(w.localStorage.getItem('mhOS.user.ada.v1')).moduleOverrides.browser.iconImage, storedImage,
      'the resized image is saved in this account data');
    assert.ok(w.document.querySelector('#startmenu .sm-item[data-app="browser"] img.app-icon-image'));
    assert.ok(w.document.querySelector('#panelapps .pitem[data-app="browser"] img.app-icon-image'));
    assert.ok(w.document.querySelector('.desktop-icon[data-shortcut="desktop-browser"] img.app-icon-image'));
    assert.ok(browserWindow.el.querySelector('.wic img.app-icon-image'), 'an already-open window title updates live');
    w.openApp('appcenter');
    const center = w.eval('wins').get('appcenter').body;
    const browserCard = [...center.querySelectorAll('#ac-grid .card')].find((card) => card.querySelector('h3')?.textContent === 'Browser');
    assert.ok(browserCard?.querySelector('.card-ic img.app-icon-image'), 'App Center listings use the uploaded image');
    w.closeWin('appcenter', true);
    w.openApp('about');
    assert.ok(w.eval('wins').get('about').body.querySelector('.app-main p img.app-icon-image'), 'About lists use the uploaded image');
    w.closeWin('about', true);

    body.querySelector('[data-micon-clear="browser"]').click();
    assert.equal(w.eval('APPS.browser.iconImage'), '', 'the clear button removes the account image override');
    assert.equal(w.document.querySelector('#startmenu .sm-item[data-app="browser"] img.app-icon-image')?.getAttribute('src'),
      'data/icons/catalog-browser.png', 'clearing restores the catalog path icon');
    assert.equal(browserWindow.el.querySelector('.wic img.app-icon-image')?.getAttribute('src'),
      'data/icons/catalog-browser.png', 'open window titles restore the catalog path icon');
    w.closeWin('browser', true);

    const customInput = body.querySelector('[data-cicon-file="legacy-image-app"]');
    assert.ok(customInput, 'saved custom apps should also have image icon controls');
    Object.defineProperty(customInput, 'files', { configurable: true, value: [{ type: 'image/png', size: 1024 }] });
    await customInput.onchange();
    assert.equal(w.eval("APPS['legacy-image-app'].iconImage"), storedImage);
    assert.equal(JSON.parse(w.localStorage.getItem('mhOS.user.ada.v1')).customApps[0].iconImage, storedImage);
    w.openApp('appcenter');
    const customCard = [...w.eval('wins').get('appcenter').body.querySelectorAll('#ac-custom .card')]
      .find((card) => card.querySelector('h3')?.textContent === 'Saved App');
    assert.ok(customCard?.querySelector('.card-ic img.app-icon-image'), 'saved custom app listings use the uploaded image');
    w.closeWin('appcenter', true);
    body.querySelector('[data-cicon-clear="legacy-image-app"]').click();
    assert.equal(w.eval("APPS['legacy-image-app'].iconImage"), '');

    await uploadBrowserIcon();
    body.querySelector('#cust-reset').click();
    assert.equal(w.eval('APPS.browser.iconImage'), '', 'Reset customisations also clears uploaded icons');
    assert.equal(w.document.querySelector('#startmenu .sm-item[data-app="browser"] img.app-icon-image')?.getAttribute('src'),
      'data/icons/catalog-browser.png', 'reset returns to the configured default icon');
    assert.deepEqual(Array.from(w.eval('userData.settings.pinned')), ['settings', 'appcenter', 'browser']);
    assert.deepEqual(Array.from(w.eval('userData.desktopIcons'), (s) => s.target), ['settings', 'browser']);
  } finally { w.close(); }
});

/* apps/_embed and websites/_embed are the "just frame a page" starting
 * points: one EMBED_URL constant to change and nothing else to edit. */
test('the embed templates are one constant away from a working embed', () => {
  const { apps, sites } = catalog();
  const ctx = vm.createContext({ window: {} });
  vm.runInContext(source('data/fs-manifest.js'), ctx);
  const listed = new Set(Array.from(ctx.window.PROTON_FS_MANIFEST, (e) => e.p));

  for (const p of ['apps/_embed/app.html', 'websites/_embed/index.html']) {
    const html = source(p);
    /* Exactly one place to change, and it is a plain https string constant. */
    const urls = [...html.matchAll(/^const EMBED_URL = '([^']*)';$/gm)].map((m) => m[1]);
    assert.equal(urls.length, 1, `${p} should have one EMBED_URL constant to change`);
    assert.match(urls[0], /^https:\/\/[^'"\s]+$/, `${p}'s EMBED_URL is not a plain https address`);
    assert.match(html, /CHANGE ME/, `${p} no longer marks the line to change`);

    // A template is a starting point: never registered, never deployed.
    assert.ok(!apps.some((a) => a.path === p), `${p} must not be in the app catalog`);
    assert.ok(!sites.some((s) => s.path === p), `${p} must not be in the website catalog`);
    assert.equal(listed.has(p), false, `${p} must stay out of the generated manifest`);

    // Both parse as JavaScript, and both frame the page safely.
    const script = html.match(/<script(?: data-proton-app)?>([\s\S]*?)<\/script>/);
    assert.ok(script, `${p} has no script block`);
    assert.doesNotThrow(() => new vm.Script(script[1], { filename: p }), `Syntax error in ${p}`);
    assert.match(html, /<iframe/, `${p} embeds nothing`);
    assert.match(html, /sandbox="[^"]*allow-scripts[^"]*"/, `${p}'s frame is not sandboxed`);
    assert.ok(!/sandbox="[^"]*allow-same-origin/.test(html),
      `${p} must not give an embedded page same-origin access to proton's storage`);
    assert.match(html, /Open in new tab/, `${p} needs an escape hatch for sites that refuse framing`);
  }

  /* The commented-out example blocks in both catalogs must stay comments. */
  assert.ok(!apps.some((a) => a.id === 'my-embed'));
  assert.ok(!sites.some((s) => s.id === 'my-embed'));
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
