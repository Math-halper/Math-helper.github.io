const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const ROOT = path.resolve(__dirname, '../..');
const source = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function desktop() {
  const dom = new JSDOM('<!doctype html><main id="auth" hidden></main><div id="desktop" hidden></div><div id="windows"></div><div id="panelapps"></div><div id="startmenu" hidden></div><div id="toasts"></div>', {
    url: 'https://math-halper.github.io/math-halper.github.io/index.html', runScripts: 'dangerously',
  });
  const { window } = dom;
  window.Blob = Blob; window.TextDecoder = TextDecoder; window.TextEncoder = TextEncoder;
  window.innerWidth = 1280; window.innerHeight = 900;
  const urls = new Map(), revoked = new Set();
  window.URL.createObjectURL = (blob) => { const url = `blob:mock/${urls.size + 1}`; urls.set(url, blob); return url; };
  window.URL.revokeObjectURL = (url) => { revoked.add(url); };
  window.fetch = async () => ({ ok: true, text: async () => '<h1>System page</h1>', blob: async () => new Blob(['system']) });
  window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  window.HTMLMediaElement.prototype.pause = () => {};
  window.confirm = () => true;
  window.prompt = () => null;
  window.open = () => null;
  window.PROTON_FS_MANIFEST = [
    { p: 'websites/guide/site.html', s: 24 }, { p: 'assets/example.js', s: 30 },
  ];
  const run = (script) => {
    const el = window.document.createElement('script');
    el.textContent = script; window.document.body.appendChild(el); el.remove();
  };
  for (const file of ['assets/store.js', 'assets/icons.js', 'assets/game-icons.js', 'assets/fs.js', 'assets/fs-archive.js', 'data/applications.js', 'data/websites.js', 'assets/config-loader.js', 'assets/core.js', 'assets/desktop-icons.js']) run(source(file));
  const registry = ['files', 'text-editor', 'browser', 'image-viewer', 'pdf', 'media', 'terminal', 'settings', 'customize', 'appcenter'];
  for (const id of registry) {
    const entry = window.PROTON_APPLICATIONS.find((a) => a.id === id);
    assert.ok(entry, `Missing ${id} from catalog`);
    window.__protonPendingApp = entry;
    const script = source(entry.path).match(/<script data-proton-app>([\s\S]*?)<\/script>/);
    assert.ok(script, `Missing script in ${entry.path}`);
    run(script[1]);
    window.__protonPendingApp = null;
  }
  window.eval("currentUser = {username:'Ada',usernameLower:'ada',displayName:'Ada',createdAt:Date.now()}; userData = MH.defaultData('Ada','ada');");
  return {
    window, dom, urls, revoked, FS: window.eval('FS'), wins: window.eval('wins'), icons: window.eval('DesktopIcons'),
    close() { dom.window.close(); },
  };
}
function tile(body, path) {
  const item = [...body.querySelectorAll('.file-item')].find((b) => b.dataset.p === path);
  assert.ok(item, `Missing file tile: ${path}`);
  return item;
}
function click(w, el, type = 'click', options = {}) {
  el.dispatchEvent(new w.MouseEvent(type, { bubbles: true, cancelable: true, ...options }));
}
function key(w, el, name, options = {}) {
  el.dispatchEvent(new w.KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...options }));
}
function drag(w, el, name, dataTransfer, options = {}) {
  const e = new w.Event(name, { bubbles: true, cancelable: true });
  Object.assign(e, { dataTransfer, ...options }); el.dispatchEvent(e);
  return e;
}
function transfer(files = [], types = ['Files'], items = []) {
  const data = new Map();
  return {
    files, types, items, effectAllowed: '', dropEffect: '',
    setData(type, value) { data.set(type, value); if (!types.includes(type)) types.push(type); },
    getData(type) { return data.get(type) || ''; },
  };
}
module.exports = { desktop, tile, click, key, drag, transfer, tick };
