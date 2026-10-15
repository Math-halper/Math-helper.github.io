/* Headless smoke test for the editor UI (jsdom) — does the full mount()
 * boot without errors, render its chrome, and respond to basic actions?
 * Run:  node tests/editor-smoke.test.mjs   (requires `npm i --no-save jsdom`)
 * The real canvas painting is stubbed out; this validates DOM/logic only. */
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';

const html = '<!DOCTYPE html><html><body><div id="root" style="width:1200px;height:800px"></div></body></html>';
/* runScripts: "outside-only" is required so window.eval() below executes
 * *inside* the jsdom window (otherwise it silently runs in Node's scope). */
const dom = new JSDOM(html, { url: 'http://localhost/', pretendToBeVisual: true, runScripts: 'outside-only' });
const { window } = dom;

let passed = 0, failed = 0;
const ok = (c, m) => { if (c) passed++; else { failed++; console.error('  FAIL:', m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readStore = () => JSON.parse(window.localStorage.getItem('logic-sim.web.v1') || 'null');

/* ---- environment shims ------------------------------------------------ */
window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
const ctxStub = new Proxy({}, {
  get: (t, prop) => {
    if (prop === 'measureText') return () => ({ width: 40 });
    return () => {};
  },
  set: () => true,
});
window.HTMLCanvasElement.prototype.getContext = () => ctxStub;
window.PointerEvent = window.MouseEvent;

/* ---- boot the module (multi-file: theme → core → ui → interaction → renderer → editor → entry) ---- */
const PARTS = [
  'js/theme.js', 'js/core.js', 'js/ui.js', 'js/interaction.js',
  'js/renderer.js', 'js/editor.js', 'logic-sim.js',
];
for (const part of PARTS) {
  const src = readFileSync(new URL('../websites/logic-sim/' + part, import.meta.url), 'utf8');
  try {
    window.eval(src);
    ok(true, 'loaded ' + part);
  } catch (e) {
    ok(false, 'loading ' + part + ' threw: ' + e.message);
  }
}
ok(!!window.LogicSim, 'LogicSim global registered');
ok(!!window.LogicSim && !!window.LogicSim.mount && !!window.LogicSim.Core, 'public API { Core, mount } assembled');

const root = window.document.getElementById('root');
let handle = null;
try {
  handle = window.LogicSim.mount(root, { source: 'smoke-test' });
  ok(true, 'mount() did not throw');
} catch (e) {
  ok(false, 'mount() threw: ' + e.message);
}

const $ = (q) => root.querySelector(q);
const $$ = (q) => [...root.querySelectorAll(q)];

ok(!!$('.ls'), 'editor shell rendered');
ok(!!$('.ls-cv'), 'canvas present');
ok(!!$('.ls-bottom .ls-pal-scroll'), 'palette lives in the bottom chip bar');
ok(!$('.ls-body .ls-pal'), 'no sidebar takes space from the workspace');
ok(!!$('.ls-menu-btn') && $('.ls-menu-btn').textContent === 'MENU', 'original-style MENU button');
ok(!$('.ls').classList.contains('ls-show-tools'), 'extra browser toolbar is hidden by default');
ok(!$('.ls-paused').hidden, 'paused banner shown initially');
ok($$('.ls-chip').length >= 12, 'palette lists built-ins (' + $$('.ls-chip').length + ' items)');
ok($$('.ls-crumb').length === 1 && $('.ls-crumb').textContent === 'Main', 'breadcrumb starts at Main');

/* welcome modal appears on first boot */
ok(!!root.querySelector('.ls-ov'), 'welcome modal shown on first run');
root.querySelector('.ls-ov .ls-btn.primary').click();
ok(!root.querySelector('.ls-ov'), 'welcome modal dismisses');

/* stored library was bootstrapped with the examples (autosave debounces 350ms) */
await sleep(450);
const store = readStore() || {};
ok(Array.isArray(store.circuits) && store.circuits.length >= 4, 'examples saved to localStorage (' + (store.circuits || []).length + ')');

/* ---- toolbar: step / run ---------------------------------------------- */
const stepBtn = root.querySelector('[data-a="step"]');
for (let i = 0; i < 4; i++) stepBtn.click();
ok(root.querySelector('.ls-status').textContent.includes('tick 4'), 'step button advances ticks');

const runBtn = root.querySelector('.ls-run');
runBtn.click();
ok(runBtn.classList.contains('on'), 'run button toggles running state');
ok($('.ls-paused').hidden, 'running hides the paused banner');
runBtn.click();
ok(!runBtn.classList.contains('on'), 'run button pauses again');
ok(!$('.ls-paused').hidden, 'pausing restores the banner');

/* ---- placing a chip via palette click --------------------------------- */
const before = $$('.ls-chip').length;
const item = $$('.ls-chip').find((el) => el.dataset.put === 'xor');
item.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, clientX: 5, clientY: 5 }));
window.document.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true, clientX: 5, clientY: 5 }));
await sleep(450);
const state2 = readStore();
const main = state2.circuits.find((c) => c.locked);
ok(main && main.comps.length === 4, 'clicking a palette item placed an XOR on Main (' + (main ? main.comps.length : 0) + ' comps)');

/* ---- undo / redo ------------------------------------------------------- */
root.querySelector('[data-a="undo"]').click();
await sleep(450);
const afterUndo = readStore();
ok(afterUndo.circuits.find((c) => c.locked).comps.length === 3, 'undo removed the placed XOR');
root.querySelector('[data-a="redo"]').click();
await sleep(450);
ok(readStore().circuits.find((c) => c.locked).comps.length === 4, 'redo restored the XOR');

/* ---- open a library chip via double-click path (programmatic) --------- */
const fa = readStore().circuits.find((c) => c.name === 'Full Adder');
ok(!!fa, 'Full Adder example exists in library');

/* ---- menu + export ------------------------------------------------------ */
root.querySelector('[data-a="menu"]').click();
ok(!!root.querySelector('.ls-pop'), '⋯ menu opens');
root.querySelector('[data-m="export"]').click();
ok(!!root.querySelector('.ls-ov textarea'), 'export modal shows JSON');
const exported = root.querySelector('.ls-ov textarea').value;
ok(exported.includes('"circuits"') && exported.includes('Full Adder'), 'export payload contains the library');
root.querySelector('.ls-ov').remove();

/* ---- import round-trip through the modal ------------------------------- */
root.querySelector('[data-a="menu"]').click();
root.querySelector('[data-m="import"]').click();
const imModal = root.querySelector('.ls-ov');
ok(!!imModal, 'import modal opens');
imModal.querySelector('textarea').value = exported;
imModal.querySelectorAll('button')[imModal.querySelectorAll('button').length - 1].click();
await sleep(450);
const store4 = readStore();
ok(store4.circuits.length >= 8, 'import merged duplicates with (2) names (' + store4.circuits.length + ' circuits)');
ok(store4.circuits.some((c) => c.name === 'Full Adder (2)'), 'name clash resolved as "Full Adder (2)"');

/* ---- help & about modals ------------------------------------------------ */
root.querySelector('[data-a="menu"]'); // menu was closed by import
root.querySelector('[data-a="menu"]').click();
root.querySelector('[data-m="help"]').click();
ok(root.querySelector('.ls-ov') && root.querySelector('.ls-ov').textContent.includes('Wire pins'), 'help modal has content');
root.querySelector('.ls-ov .ls-btn.primary').click();
root.querySelector('[data-a="menu"]').click();
root.querySelector('[data-m="about"]').click();
ok(root.querySelector('.ls-ov').textContent.includes('Sebastian Lague'), 'about modal credits the original author');
root.querySelector('.ls-ov .ls-btn.primary').click();

/* ---- original-style menu, library and preferences ----------------------- */
$('.ls-menu-btn').click();
ok($('.ls-menu-btn').getAttribute('aria-expanded') === 'true', 'menu reports expanded state');
ok(!!$('.ls-bottom .ls-pop'), 'menu is anchored to the bottom bar');
$('.ls-menu-btn').click();
ok(!$('.ls-pop') && $('.ls-menu-btn').getAttribute('aria-expanded') === 'false', 'menu toggle closes cleanly');

$('.ls-menu-btn').click();
$('[data-m="prefs"]').click();
ok(!$('.ls-pop') && !!$('.ls-ov'), 'preferences replaces the menu');
const gridInput = $('[data-pref="grid"]');
const toolsInput = $('[data-pref="tools"]');
ok(!gridInput.checked && !toolsInput.checked, 'grid and extra toolbar are opt-in');
gridInput.click(); toolsInput.click();
ok($('.ls').classList.contains('ls-show-tools'), 'toolbar preference applies immediately');
$('.ls-ov .ls-btn.primary').click();
await sleep(450);
ok(readStore().prefs.showGrid && readStore().prefs.showTools, 'appearance preferences persisted alongside circuits');

$('[data-a="library"]').click();
ok(!!$('.ls-library-grid'), 'library opens');
const search = $('.ls-search');
search.value = 'Full Adder';
search.dispatchEvent(new window.Event('input', { bubbles: true }));
ok($$('.ls-library-card').length === 2, 'library search finds original and imported Full Adder');
$('.ls-library-card [data-open]').click();
ok(!$('.ls-ov') && $('.ls-crumb.here').textContent === 'Full Adder', 'OPEN navigates into a saved circuit');
ok($('.ls').classList.contains('ls-nested') && !!$('.ls-back'), 'nested chip shows breadcrumb and Back button');
$('.ls-back').click();
ok($('.ls-crumb.here').textContent === 'Main' && !$('.ls').classList.contains('ls-nested'), 'Back returns to Main');

$('[data-a="library"]').click();
$('.ls-search').value = 'not a chip';
$('.ls-search').dispatchEvent(new window.Event('input', { bubbles: true }));
ok($('.ls-library-grid').textContent.includes('No matching chips'), 'empty library search is handled');
$('.ls-ov .ls-btn.primary').click();

/* Keyboard placement is available without dragging. */
const countBeforeKey = readStore().circuits.find((c) => c.locked).comps.length;
$('.ls-chip[data-put="and"]').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
await sleep(450);
ok(readStore().circuits.find((c) => c.locked).comps.length === countBeforeKey + 1, 'keyboard activation places a chip');

if (handle && handle.unmount) handle.unmount();
handle = window.LogicSim.mount(root, { source: 'smoke-test' });
ok($('.ls').classList.contains('ls-show-tools'), 'toolbar preference restored on remount');
ok(!$('.ls-ov'), 'welcome remains dismissed after remount');
$('.ls-menu-btn').click(); $('[data-m="prefs"]').click();
ok($('[data-pref="grid"]').checked, 'grid preference restored on remount');
handle.unmount();
ok(!$('.ls-ov'), 'unmount dismisses open dialogs');
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
