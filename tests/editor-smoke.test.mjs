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

/* ---- boot the module -------------------------------------------------- */
const src = readFileSync(new URL('../websites/logic-sim/logic-sim.js', import.meta.url), 'utf8');
window.eval(src);
ok(!!window.LogicSim, 'LogicSim global registered');

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

const runBtn = root.querySelector('[data-a="run"]');
runBtn.click();
ok(runBtn.classList.contains('on'), 'run button toggles running state');
runBtn.click();
ok(!runBtn.classList.contains('on'), 'run button pauses again');

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

if (handle && handle.unmount) handle.unmount();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
