const { test } = require('node:test');
const assert = require('node:assert/strict');
const { desktop, tile, click, key, drag, transfer, tick } = require('./helpers/desktop.cjs');
const selected = (body) => [...body.querySelectorAll('.file-item.sel')].map((el) => el.dataset.p);
const action = (body, label) => {
  const el = [...body.querySelectorAll('#f-context [role=menuitem]')].find((b) => b.textContent.trim().startsWith(label));
  assert.ok(el, `Missing context action: ${label}`);
  return el;
};

// No real OS drag API in jsdom: these events carry the same DataTransfer
// surface that the Files app handles in a browser.
test('multi-select, keyboard copy/cut/paste, safe collision names, rename and delete', async () => {
  const d = desktop();
  try {
    const { window: w, wins, FS } = d, home = FS.home();
    FS.write(home + '/Documents/Alpha.txt', 'alpha');
    FS.write(home + '/Documents/Beta.txt', 'beta');
    w.openApp('files', { path: home + '/Documents' });
    const body = wins.get('files').body;
    click(w, tile(body, home + '/Documents/Alpha.txt'));
    click(w, tile(body, home + '/Documents/Beta.txt'), 'click', { ctrlKey: true });
    assert.deepEqual(selected(body).sort(), [home + '/Documents/Alpha.txt', home + '/Documents/Beta.txt']);
    key(w, body, 'c', { ctrlKey: true });
    body.openPath({ path: home + '/Pictures' });
    key(w, body, 'v', { ctrlKey: true }); await tick();
    assert.equal(await FS.read(home + '/Pictures/Alpha.txt'), 'alpha');
    assert.equal(await FS.read(home + '/Pictures/Beta.txt'), 'beta');
    assert.equal(await FS.read(home + '/Documents/Alpha.txt'), 'alpha', 'copy does not remove source');
    click(w, tile(body, home + '/Pictures/Alpha.txt'));
    click(w, tile(body, home + '/Pictures/Beta.txt'), 'click', { ctrlKey: true });
    key(w, body, 'x', { ctrlKey: true });
    assert.ok(tile(body, home + '/Pictures/Alpha.txt').classList.contains('cut'));
    body.openPath({ path: home + '/Documents' });
    key(w, body, 'v', { ctrlKey: true }); await tick();
    assert.equal(FS.stat(home + '/Pictures/Alpha.txt'), null);
    assert.equal(await FS.read(home + '/Documents/Alpha (copy).txt'), 'alpha', 'no silent overwrite');
    assert.equal(await FS.read(home + '/Documents/Beta (copy).txt'), 'beta');
    w.prompt = () => 'Renamed.txt';
    key(w, body, 'F2');
    assert.equal(FS.exists(home + '/Documents/Alpha (copy).txt'), true, 'F2 needs one selected item');
    click(w, tile(body, home + '/Documents/Alpha (copy).txt'));
    key(w, body, 'F2');
    assert.ok(FS.exists(home + '/Documents/Renamed.txt'));
    let confirms = 0;
    w.confirm = () => { confirms++; return false; };
    key(w, body, 'Delete');
    assert.ok(FS.exists(home + '/Documents/Renamed.txt'));
    w.confirm = () => true;
    key(w, body, 'Delete');
    assert.equal(FS.stat(home + '/Documents/Renamed.txt'), null);
    assert.equal(confirms, 1);
  } finally { d.close(); }
});

test('context menu works on items, empty space and tree; history, sort/filter and properties work', async () => {
  const d = desktop();
  try {
    const { window: w, wins, FS } = d, home = FS.home();
    w.openApp('files'); const body = wins.get('files').body;
    click(w, tile(body, home + '/Documents'), 'contextmenu');
    assert.equal(action(body, 'Open').disabled, false);
    assert.equal(action(body, 'Paste').disabled, true);
    click(w, action(body, 'Properties'));
    assert.match(body.querySelector('#f-dialog').textContent, /Documents/);
    assert.match(body.querySelector('#f-dialog').textContent, /Read & write/);
    key(w, body, 'Escape');
    assert.equal(body.querySelector('#f-dialog'), null);
    assert.equal(w.document.activeElement, body, 'focus returns to Files after the dialog closes');
    click(w, tile(body, home + '/Documents'), 'dblclick');
    assert.equal(body.querySelector('#f-path').value, home + '/Documents');
    assert.equal(body.querySelector('#f-back').disabled, false);
    click(w, body.querySelector('#f-back'));
    assert.equal(body.querySelector('#f-path').value, home);
    click(w, body.querySelector('#f-forward'));
    assert.equal(body.querySelector('#f-path').value, home + '/Documents');
    w.prompt = () => 'Desk';
    click(w, body.querySelector('#f-main'), 'contextmenu');
    click(w, action(body, 'New folder'));
    assert.ok(FS.isDir(home + '/Documents/Desk'));
    body.querySelector('#f-search').value = 'welcome';
    body.querySelector('#f-search').dispatchEvent(new w.Event('input', { bubbles: true }));
    assert.deepEqual([...body.querySelectorAll('.file-item')].map((el) => el.dataset.p), [home + '/Documents/Welcome.txt']);
    body.querySelector('#f-search').value = '';
    body.querySelector('#f-search').dispatchEvent(new w.Event('input', { bubbles: true }));
    body.querySelector('#f-sort').value = 'size';
    body.querySelector('#f-sort').dispatchEvent(new w.Event('change', { bubbles: true }));
    assert.equal(body.querySelector('#f-sort').value, 'size');
    click(w, body.querySelector('#f-reverse'));
    assert.equal(body.querySelector('#f-reverse').textContent, '↓');
    const hint = body.querySelector('#f-status').textContent;
    assert.match(hint, /item\(s\)/);
  } finally { d.close(); }
});

test('internal drag moves by default, copies with Ctrl, prevents self-moves and copies read-only system files', async () => {
  const d = desktop();
  try {
    const { window: w, wins, FS } = d, home = FS.home();
    FS.mkdir(home + '/Documents/Projects');
    FS.mkdir(home + '/Documents/Projects/Nested');
    FS.write(home + '/Documents/move.txt', 'move bytes');
    FS.write(home + '/Documents/copy.txt', 'copy bytes');
    w.openApp('files', { path: home + '/Documents' }); const body = wins.get('files').body;
    const dir = home + '/Documents/Projects';
    let dt = transfer([], []);
    drag(w, tile(body, home + '/Documents/move.txt'), 'dragstart', dt);
    drag(w, tile(body, dir), 'dragover', dt);
    assert.equal(dt.dropEffect, 'move');
    assert.ok(tile(body, dir).classList.contains('f-drop-target'));
    drag(w, tile(body, dir), 'drop', dt); await tick();
    assert.equal(FS.stat(home + '/Documents/move.txt'), null);
    assert.equal(await FS.read(dir + '/move.txt'), 'move bytes');
    dt = transfer([], []);
    drag(w, tile(body, home + '/Documents/copy.txt'), 'dragstart', dt);
    drag(w, tile(body, dir), 'dragover', dt, { ctrlKey: true });
    assert.equal(dt.dropEffect, 'copy');
    drag(w, tile(body, dir), 'drop', dt, { ctrlKey: true }); await tick();
    assert.equal(await FS.read(home + '/Documents/copy.txt'), 'copy bytes');
    assert.equal(await FS.read(dir + '/copy.txt'), 'copy bytes');
    body.openPath({ path: dir });
    const parent = [...body.querySelectorAll('.f-trow')].find((r) => r.dataset.t === dir);
    const child = [...body.querySelectorAll('.f-trow')].find((r) => r.dataset.t === dir + '/Nested');
    assert.ok(parent && child);
    dt = transfer([], []);
    drag(w, parent, 'dragstart', dt);
    drag(w, child, 'drop', dt); await tick();
    assert.ok(FS.isDir(dir + '/Nested'));
    assert.equal(FS.exists(dir + '/Nested/Projects'), false, 'self-move is rejected');
    body.openPath({ path: '/assets' });
    dt = transfer([], []);
    drag(w, tile(body, '/assets/example.js'), 'dragstart', dt);
    const homeRow = [...body.querySelectorAll('.f-trow')].find((r) => r.dataset.t === home);
    drag(w, homeRow, 'dragover', dt);
    assert.equal(dt.dropEffect, 'copy', 'system paths cannot be moved');
    drag(w, homeRow, 'drop', dt); await tick();
    assert.ok(FS.exists('/assets/example.js'));
    assert.equal(await FS.read(home + '/example.js'), '<h1>System page</h1>');
  } finally { d.close(); }
});

test('file picker and external drops import multiple files and nested folders without changing binary bytes', async () => {
  const d = desktop();
  try {
    const { window: w, wins, FS } = d, home = FS.home();
    w.openApp('files', { path: home + '/Pictures' }); const body = wins.get('files').body;
    const raw = new Uint8Array([0, 255, 128, 29]);
    const pic = Object.assign(new Blob([raw], { type: 'image/png' }), { name: 'pic.png' });
    const text = Object.assign(new Blob(['hello'], { type: 'text/plain' }), { name: 'hi.txt' });
    const picker = body.querySelector('#f-import');
    Object.defineProperty(picker, 'files', { configurable: true, value: [pic, text] });
    picker.dispatchEvent(new w.Event('change')); await tick();
    assert.deepEqual(new Uint8Array(await (await FS.readBlob(home + '/Pictures/pic.png')).arrayBuffer()), raw);
    assert.equal(await FS.read(home + '/Pictures/hi.txt'), 'hello');
    const existing = home + '/Pictures/hi.txt';
    w.confirm = () => false;
    const dt = transfer([text]);
    drag(w, body.querySelector('#f-main'), 'drop', dt); await tick();
    assert.equal(await FS.read(existing), 'hello', 'conflicting native drop is not silently replaced');
    const folderEntry = (name, children) => ({
      name, isDirectory: true,
      createReader() { let first = true; return { readEntries(resolve) { resolve(first ? children : []); first = false; } }; },
    });
    const leaf = { name: 'nested.png', isFile: true, file(resolve) { resolve(pic); } };
    const tree = folderEntry('DropFolder', [folderEntry('empty', []), folderEntry('sub', [leaf])]);
    const folders = transfer([], ['Files'], [{ kind: 'file', webkitGetAsEntry: () => tree }]);
    drag(w, body.querySelector('#f-main'), 'drop', folders); await tick();
    assert.ok(FS.isDir(home + '/Pictures/DropFolder/empty'));
    assert.deepEqual(new Uint8Array(await (await FS.readBlob(home + '/Pictures/DropFolder/sub/nested.png')).arrayBuffer()), raw);
    const picked = Object.assign(new Blob(['from folder'], { type: 'text/plain' }), { name: 'inside.txt', webkitRelativePath: 'Picked/deep/inside.txt' });
    const dirInput = body.querySelector('#f-import-folder');
    Object.defineProperty(dirInput, 'files', { configurable: true, value: [picked] });
    dirInput.dispatchEvent(new w.Event('change')); await tick();
    assert.equal(await FS.read(home + '/Pictures/Picked/deep/inside.txt'), 'from folder');
    body.openPath({ path: '/assets' });
    drag(w, body.querySelector('#f-main'), 'drop', transfer([text])); await tick();
    assert.equal(FS.stat('/assets/hi.txt'), null, 'system tree remains read-only');
  } finally { d.close(); }
});

test('right-click protects system/home, native import rejects traversal and ZIP downloads preserve contents', async () => {
  const d = desktop();
  try {
    const { window: w, wins, FS } = d, home = FS.home();
    FS.mkdir(home + '/Documents/Archive');
    FS.write(home + '/Documents/Archive/read me.txt', 'saved');
    const bytes = new Uint8Array([0, 250, 128, 77]);
    await FS.writeBlob(home + '/Documents/Archive/blob.bin', new Blob([bytes]));
    w.openApp('files', { path: '/assets' }); const body = wins.get('files').body;
    click(w, tile(body, '/assets/example.js'), 'contextmenu');
    assert.equal(action(body, 'Copy').disabled, false);
    assert.equal(action(body, 'Cut').disabled, true);
    assert.equal(action(body, 'Delete').disabled, true);
    click(w, action(body, 'Copy'));
    body.openPath({ path: home });
    click(w, tile(body, home + '/Documents'), 'contextmenu');
    click(w, action(body, 'Paste')); await tick();
    assert.ok(FS.exists(home + '/Documents/example.js'), 'right-click paste targets the clicked folder');
    click(w, tile(body, home + '/Documents'), 'dblclick');
    const bad = Object.assign(new Blob(['bad'], { type: 'text/plain' }), { name: 'escape.txt', webkitRelativePath: '../escape.txt' });
    const dirInput = body.querySelector('#f-import-folder');
    Object.defineProperty(dirInput, 'files', { configurable: true, value: [bad] });
    dirInput.dispatchEvent(new w.Event('change')); await tick();
    assert.equal(FS.stat(home + '/escape.txt'), null, 'path traversal from an OS drop is rejected');
    const downloads = [];
    w.eval('MH').download = (name, blob, mime) => downloads.push({ name, blob, mime });
    click(w, tile(body, home + '/Documents/Archive'));
    click(w, body.querySelector('#f-dl')); await tick();
    assert.equal(downloads[0].name, 'Archive.zip');
    const archive = new DataView(await downloads[0].blob.arrayBuffer());
    const names = [], data = new Map(); let offset = 0;
    while (archive.getUint32(offset, true) === 0x04034b50) {
      const nameLength = archive.getUint16(offset + 26, true);
      const extraLength = archive.getUint16(offset + 28, true);
      const size = archive.getUint32(offset + 18, true);
      const name = new TextDecoder().decode(new Uint8Array(archive.buffer, offset + 30, nameLength));
      names.push(name);
      data.set(name, new Uint8Array(archive.buffer, offset + 30 + nameLength + extraLength, size));
      offset += 30 + nameLength + extraLength + size;
    }
    assert.deepEqual(names.sort(), ['Archive/', 'Archive/blob.bin', 'Archive/read me.txt']);
    assert.equal(new TextDecoder().decode(data.get('Archive/read me.txt')), 'saved');
    assert.deepEqual(data.get('Archive/blob.bin'), bytes);
    assert.equal(archive.getUint32(offset, true), 0x02014b50, 'ZIP central index follows the stored files');
    assert.ok(archive.getUint32(archive.byteLength - 22, true) === 0x06054b50, 'ZIP ends with a directory record');
  } finally { d.close(); }
});

test('folder rename/delete from tree keeps location valid; selection range and navigation keys work', async () => {
  const d = desktop();
  try {
    const { window: w, wins, FS } = d, home = FS.home();
    const old = home + '/Documents/Project', renamed = home + '/Documents/Project renamed';
    FS.mkdir(old); FS.write(old + '/note.txt', 'nested');
    w.openApp('files', { path: old }); const body = wins.get('files').body;
    const row = [...body.querySelectorAll('.f-trow')].find((r) => r.dataset.t === old);
    assert.ok(row);
    w.prompt = () => 'Project renamed';
    click(w, row, 'contextmenu');
    click(w, action(body, 'Rename'));
    assert.equal(body.querySelector('#f-path').value, renamed);
    assert.equal(await FS.read(renamed + '/note.txt'), 'nested');
    const newRow = [...body.querySelectorAll('.f-trow')].find((r) => r.dataset.t === renamed);
    click(w, newRow, 'contextmenu');
    click(w, action(body, 'Delete'));
    assert.equal(body.querySelector('#f-path').value, home + '/Documents');
    assert.equal(FS.stat(renamed), null);
    click(w, tile(body, home + '/Documents/Ideas.txt'));
    click(w, tile(body, home + '/Documents/Welcome.txt'), 'click', { shiftKey: true });
    assert.deepEqual(selected(body).sort(), [home + '/Documents/Ideas.txt', home + '/Documents/Welcome.txt']);
    const search = body.querySelector('#f-search');
    search.focus();
    key(w, search, 'a', { ctrlKey: true });
    assert.equal(selected(body).length, 2, 'shortcuts do not take over text inputs');
    click(w, body.querySelector('#f-main'));
    key(w, body, 'a', { ctrlKey: true });
    assert.equal(selected(body).length, 2);
  } finally { d.close(); }
});

test('Files refreshes for Terminal/Text Editor VFS changes and cleans up its listener on close', async () => {
  const d = desktop();
  try {
    const { window: w, wins, FS } = d, home = FS.home();
    w.openApp('files', { path: home + '/Documents' });
    const body = wins.get('files').body, before = FS._listeners.size;
    assert.ok(before > 0);
    FS.write(home + '/Documents/from-terminal.txt', 'shared');
    await new Promise((r) => setTimeout(r, 65));
    assert.ok(tile(body, home + '/Documents/from-terminal.txt'));
    FS.rename(home + '/Documents/from-terminal.txt', home + '/Documents/after-rename.txt');
    await new Promise((r) => setTimeout(r, 65));
    assert.equal(body.querySelector('[data-p$="from-terminal.txt"]'), null);
    assert.ok(tile(body, home + '/Documents/after-rename.txt'));
    assert.equal(w.closeWin('files'), true);
    assert.equal(FS._listeners.size, before - 1);
  } finally { d.close(); }
});

test('pasting native computer files imports them when no Files clipboard is active', async () => {
  const d = desktop();
  try {
    const { window: w, wins, FS } = d, home = FS.home();
    w.openApp('files', { path: home + '/Documents' });
    const body = wins.get('files').body;
    const file = Object.assign(new Blob(['computer clipboard'], { type: 'text/plain' }), { name: 'clipboard.txt' });
    const ev = new w.Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'clipboardData', { value: { files: [file] } });
    body.dispatchEvent(ev); await tick();
    assert.equal(ev.defaultPrevented, true);
    assert.equal(await FS.read(home + '/Documents/clipboard.txt'), 'computer clipboard');
  } finally { d.close(); }
});

test('closing Files during a slow import cancels it without saving a late file', async () => {
  const d = desktop();
  try {
    const { window: w, wins, FS } = d, home = FS.home();
    w.openApp('files', { path: home + '/Documents' });
    const body = wins.get('files').body;
    let finish;
    const slow = Object.assign(new Blob(['late'], { type: 'text/plain' }), { name: 'late.txt' });
    slow.arrayBuffer = () => new Promise((resolve) => { finish = resolve; });
    const input = body.querySelector('#f-import');
    Object.defineProperty(input, 'files', { configurable: true, value: [slow] });
    input.dispatchEvent(new w.Event('change'));
    assert.equal(typeof finish, 'function');
    w.closeWin('files');
    finish(new TextEncoder().encode('late').buffer);
    await tick();
    assert.equal(FS.stat(home + '/Documents/late.txt'), null);
  } finally { d.close(); }
});

test('keyboard context and clipboard actions target a focused folder in the tree', async () => {
  const d = desktop();
  try {
    const { window: w, wins, FS } = d, home = FS.home();
    w.openApp('files'); const body = wins.get('files').body;
    const folder = [...body.querySelectorAll('.f-trow')].find((r) => r.dataset.t === home + '/Documents');
    const pictures = [...body.querySelectorAll('.f-trow')].find((r) => r.dataset.t === home + '/Pictures');
    key(w, folder, 'F10', { shiftKey: true });
    assert.equal(action(body, 'Open').disabled, false);
    assert.equal(action(body, 'Copy').disabled, false);
    key(w, body, 'Escape');
    key(w, folder, 'c', { ctrlKey: true });
    key(w, pictures, 'v', { ctrlKey: true }); await tick();
    assert.ok(FS.isDir(home + '/Pictures/Documents'));
    assert.equal(await FS.read(home + '/Pictures/Documents/Welcome.txt'), await FS.read(home + '/Documents/Welcome.txt'));
  } finally { d.close(); }
});
