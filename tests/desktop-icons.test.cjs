const { test } = require('node:test');
const assert = require('node:assert/strict');
const { desktop, tile, click, key, drag, transfer, tick } = require('./helpers/desktop.cjs');

const iconsOn = (w) => [...w.document.querySelectorAll('.desktop-icon')];
const iconFor = (w, name) => iconsOn(w).find((button) => button.textContent.trim() === name);
const entryFor = (w, target) => w.eval('userData.desktopIcons').find((entry) => entry.target === target);
const action = (root, name) => [...root.querySelectorAll('[data-action]')].find((button) => button.textContent.includes(name));

// Enter through the real desktop renderer, not a DOM fixture of shortcut tiles.
test('new and older accounts get useful shortcuts; one click selects and double-click opens the correct app', () => {
  const d = desktop();
  try {
    const { window: w, FS, wins } = d;
    w.enterDesktop();
    assert.deepEqual(iconsOn(w).map((button) => button.textContent.trim()), ['Files', 'Browser', 'Documents']);
    click(w, iconFor(w, 'Files'));
    assert.equal(wins.size, 0, 'selecting must not launch');
    assert.equal(w.document.querySelector('#desktop-open').hidden, false, 'touch-visible open control');
    assert.equal(w.document.querySelector('#desktop-remove').hidden, false, 'touch-visible remove control');
    click(w, w.document.querySelector('#desktop-open'));
    assert.equal(wins.has('files'), true, 'a single tap followed by Open works without double-tap');
    w.closeWin('files');
    click(w, iconFor(w, 'Documents'), 'dblclick');
    assert.equal(wins.get('files').body.querySelector('#f-path').value, FS.home() + '/Documents');
    w.closeWin('files');

    w.eval('delete userData.desktopIcons; userData.desktopApps = ["math", "files"];');
    w.enterDesktop();
    assert.deepEqual(Array.from(w.eval('userData.desktopIcons'), (x) => x.target), ['calculator', 'files'], 'migrate saved legacy choices');
    w.eval('userData.desktopIcons = [];');
    w.enterDesktop();
    assert.equal(iconsOn(w).length, 0, 'an intentionally empty desktop stays empty');
    assert.ok(w.document.querySelector('#desktop-add'), 'empty desktop still exposes Add icon');
  } finally { d.close(); }
});

test('searchable picker, shortcut context menu and Remove selected add/remove only links and persist them', () => {
  const d = desktop();
  try {
    const { window: w, icons, FS } = d, home = FS.home();
    w.enterDesktop();
    click(w, w.document.querySelector('#desktop-add'));
    const picker = w.document.querySelector('#desktop-picker');
    assert.equal(picker.hidden, false);
    const search = picker.querySelector('input[type=search]');
    search.value = 'Terminal'; search.dispatchEvent(new w.Event('input', { bubbles: true }));
    click(w, picker.querySelector('[data-app=terminal]'));
    assert.ok(iconFor(w, 'Terminal'));
    assert.equal(picker.hidden, true);
    assert.ok(JSON.parse(w.localStorage.getItem(w.eval("MH.userKey('ada')"))).desktopIcons.some((x) => x.target === 'terminal'));

    click(w, iconFor(w, 'Terminal'), 'contextmenu', { clientX: 80, clientY: 90 });
    click(w, action(w.document.querySelector('#desktop-context'), 'Remove shortcut'));
    assert.equal(iconFor(w, 'Terminal'), undefined);
    assert.ok(w.eval('APPS.terminal'), 'removing its shortcut must not uninstall the app');
    click(w, iconFor(w, 'Documents'));
    click(w, w.document.querySelector('#desktop-remove'));
    assert.equal(iconFor(w, 'Documents'), undefined);
    assert.ok(FS.stat(home + '/Documents'), 'removing a folder shortcut must not delete the folder');
    w.enterDesktop();
    assert.deepEqual(iconsOn(w).map((x) => x.textContent.trim()), ['Files', 'Browser'], 'saved removals survive re-entering');
    for (const entry of [...w.eval('userData.desktopIcons')]) icons.remove(entry.id);
    w.enterDesktop();
    assert.equal(iconsOn(w).length, 0, 'saved empty list must not be reseeded');
  } finally { d.close(); }
});

test('desktop background menu adds file links by path and can arrange the icon layout', () => {
  const d = desktop();
  try {
    const { window: w, icons, FS, wins } = d, home = FS.home();
    w.enterDesktop();
    const area = w.document.querySelector('#desktop-icons');
    w.prompt = () => home + '/Documents/Ideas.txt';
    click(w, area, 'contextmenu', { clientX: 210, clientY: 140 });
    click(w, action(w.document.querySelector('#desktop-context'), 'Add file or folder'));
    assert.ok(entryFor(w, home + '/Documents/Ideas.txt'));
    assert.ok(FS.stat(home + '/Documents/Ideas.txt'));
    icons.move(entryFor(w, 'files').id, { col: 2, row: 1 });
    click(w, area, 'contextmenu', { clientX: 180, clientY: 100 });
    click(w, action(w.document.querySelector('#desktop-context'), 'Arrange icons'));
    assert.deepEqual({ col: entryFor(w, 'files').col, row: entryFor(w, 'files').row }, { col: 0, row: 0 });
    key(w, iconFor(w, 'Files'), 'Enter');
    assert.ok(wins.has('files'), 'keyboard activation opens a shortcut');
  } finally { d.close(); }
});

test('pointer drag swaps occupied cells without launching, keyboard moves too, resize keeps saved positions', () => {
  const d = desktop();
  try {
    const { window: w, wins, icons } = d;
    w.enterDesktop();
    const files = iconFor(w, 'Files');
    click(w, files, 'pointerdown', { clientX: 50, clientY: 50, button: 0 });
    click(w, w, 'pointermove', { clientX: 50 + 3 * 94, clientY: 50 + 2 * 98 });
    click(w, w, 'pointerup', { clientX: 50 + 3 * 94, clientY: 50 + 2 * 98 });
    assert.deepEqual({ col: entryFor(w, 'files').col, row: entryFor(w, 'files').row }, { col: 3, row: 2 });
    assert.equal(wins.size, 0, 'dropping an icon never opens its app');
    assert.equal(iconFor(w, 'Files').dataset.col, '3');
    // Dropping on an occupied spot swaps icons instead of stacking them.
    icons.move(entryFor(w, 'browser').id, { col: 3, row: 2 });
    assert.deepEqual({ col: entryFor(w, 'browser').col, row: entryFor(w, 'browser').row }, { col: 3, row: 2 });
    assert.deepEqual({ col: entryFor(w, 'files').col, row: entryFor(w, 'files').row }, { col: 0, row: 1 });
    assert.equal(new Set(iconsOn(w).map((x) => x.dataset.col + ':' + x.dataset.row)).size, iconsOn(w).length);
    const docs = iconFor(w, 'Documents');
    key(w, docs, 'ArrowRight', { altKey: true });
    assert.equal(entryFor(w, w.eval('FS.home()') + '/Documents').col, 1);

    const stored = Array.from(w.eval('userData.desktopIcons'), (x) => ({ ...x }));
    w.innerWidth = 140; w.innerHeight = 280;
    w.dispatchEvent(new w.Event('resize'));
    assert.equal(new Set(iconsOn(w).map((x) => x.dataset.col + ':' + x.dataset.row)).size, iconsOn(w).length);
    assert.ok(iconsOn(w).every((x) => x.dataset.col === '0'), 'icons reflow into one column');
    assert.deepEqual(JSON.parse(JSON.stringify(w.eval('userData.desktopIcons'))), stored, 'resize must not overwrite saved layout');
    w.innerWidth = 1280; w.innerHeight = 900;
    w.dispatchEvent(new w.Event('resize'));
    assert.equal(iconFor(w, 'Browser').dataset.col, '3', 'original layout comes back');
  } finally { d.close(); }
});

test('crowded desktops scroll and icons in overflow rows can still be dragged and swapped', () => {
  const d = desktop();
  try {
    const { window: w, icons, wins } = d;
    w.enterDesktop();
    w.innerWidth = 134; w.innerHeight = 300;
    w.dispatchEvent(new w.Event('resize')); // one column, two visible rows
    assert.equal(icons.addApp('terminal'), true);
    const area = w.document.querySelector('#desktop-icons');
    assert.equal(iconFor(w, 'Terminal').dataset.row, '3');
    assert.ok(parseFloat(w.document.querySelector('#desktop-icon-list').style.height) > 256, 'icon list extends beyond the viewport');
    area.scrollTop = 100;
    const terminal = iconFor(w, 'Terminal');
    click(w, terminal, 'pointerdown', { clientX: 50, clientY: 206, button: 0 });
    click(w, w, 'pointermove', { clientX: 50, clientY: 108 });
    click(w, w, 'pointerup', { clientX: 50, clientY: 108 });
    assert.equal(entryFor(w, 'terminal').row, 2, 'overflow icon moved within the scrollable grid');
    assert.equal(entryFor(w, w.eval('FS.home()') + '/Documents').row, 3, 'occupied destination swapped');
    assert.equal(new Set(iconsOn(w).map((x) => x.dataset.col + ':' + x.dataset.row)).size, 4);
    assert.equal(wins.size, 0, 'dragging an overflow icon never opens its app');
    w.innerWidth = 1280; w.innerHeight = 900;
    w.dispatchEvent(new w.Event('resize'));
    assert.equal(iconFor(w, 'Terminal').dataset.row, '2');
  } finally { d.close(); }
});

test('Files right-click adds file links, activating opens its associated app and rename follows folders', async () => {
  const d = desktop();
  try {
    const { window: w, wins, FS } = d, home = FS.home();
    w.enterDesktop(); w.openApp('files', { path: home + '/Documents' });
    const body = wins.get('files').body;
    const homeRow = [...body.querySelectorAll('.f-trow')].find((x) => x.dataset.t === home);
    click(w, homeRow, 'contextmenu');
    const homeLink = action(body.querySelector('#f-context'), 'Add shortcut to desktop');
    assert.equal(homeLink.disabled, false, 'even Home can be linked without copying it');
    click(w, homeLink);
    assert.ok(entryFor(w, home));
    click(w, tile(body, home + '/Documents/Welcome.txt'), 'contextmenu');
    click(w, action(body.querySelector('#f-context'), 'Add shortcut to desktop'));
    const linked = entryFor(w, home + '/Documents/Welcome.txt');
    assert.ok(linked);
    click(w, iconFor(w, 'Welcome.txt'), 'dblclick');
    await tick();
    assert.equal(wins.get('text-editor').body.querySelector('#te-path').textContent, home + '/Documents/Welcome.txt');
    w.closeWin('text-editor');
    FS.rename(home + '/Documents/Welcome.txt', home + '/Documents/Greeting.txt');
    assert.equal(entryFor(w, home + '/Documents/Greeting.txt').id, linked.id);
    assert.ok(iconFor(w, 'Greeting.txt'));
    FS.rename(home + '/Documents', home + '/Docs');
    assert.ok(entryFor(w, home + '/Docs/Greeting.txt'));
    assert.ok(iconFor(w, 'Docs'), 'folder shortcut follows a folder rename');
    FS.rm(home + '/Docs/Greeting.txt');
    assert.ok(w.document.querySelector('.desktop-icon.missing'), 'broken shortcut is visible and removable');
    assert.ok(!FS.stat(home + '/Docs/Greeting.txt'));
    click(w, iconFor(w, 'Greeting.txt'));
    click(w, w.document.querySelector('#desktop-remove'));
    assert.equal(entryFor(w, home + '/Docs/Greeting.txt'), undefined);
  } finally { d.close(); }
});

test('Files and start menu support drag-to-desktop; links do not move originals or duplicate existing targets', () => {
  const d = desktop();
  try {
    const { window: w, wins, FS } = d, home = FS.home();
    w.enterDesktop(); w.openApp('files', { path: home + '/Documents' });
    const body = wins.get('files').body, area = w.document.querySelector('#desktop-icons');
    click(w, tile(body, home + '/Documents/Ideas.txt'));
    click(w, tile(body, home + '/Documents/Welcome.txt'), 'click', { ctrlKey: true });
    const dt = transfer([], []);
    drag(w, tile(body, home + '/Documents/Ideas.txt'), 'dragstart', dt);
    assert.equal(dt.getData('application/x-proton-files'), 'files');
    assert.equal(dt.getData('text/plain').includes(home), false, 'payload must not reveal paths');
    drag(w, area, 'dragover', dt, { clientX: 350, clientY: 160 });
    drag(w, area, 'drop', dt, { clientX: 350, clientY: 160 });
    assert.ok(entryFor(w, home + '/Documents/Ideas.txt'));
    assert.ok(entryFor(w, home + '/Documents/Welcome.txt'));
    assert.ok(FS.stat(home + '/Documents/Ideas.txt'), 'the actual file has not moved');
    const count = w.eval('userData.desktopIcons.length');
    drag(w, tile(body, home + '/Documents/Ideas.txt'), 'dragstart', dt);
    drag(w, area, 'drop', dt, { clientX: 350, clientY: 160 });
    assert.equal(w.eval('userData.desktopIcons.length'), count, 'same path cannot be added twice');

    const menuItem = w.document.querySelector('.sm-item[data-app="terminal"]');
    const appDrag = transfer([], []);
    drag(w, menuItem, 'dragstart', appDrag);
    drag(w, area, 'drop', appDrag, { clientX: 450, clientY: 80 });
    assert.ok(entryFor(w, 'terminal'));
    click(w, w.document.querySelector('.sm-item[data-app="terminal"]'), 'contextmenu');
    click(w, action(w.document.querySelector('#desktop-context'), 'Remove from desktop'));
    assert.equal(entryFor(w, 'terminal'), undefined);
  } finally { d.close(); }
});

test('App Center and Customize expose icon controls; deleting a custom app removes its orphan shortcut', () => {
  const d = desktop();
  try {
    const { window: w, wins, icons } = d;
    w.enterDesktop(); w.openApp('appcenter');
    const appCenter = wins.get('appcenter').body;
    click(w, appCenter.querySelector('[data-desktop=terminal]'));
    assert.ok(entryFor(w, 'terminal'));
    assert.match(appCenter.querySelector('[data-desktop=terminal]').textContent, /Remove desktop icon/);
    click(w, appCenter.querySelector('[data-desktop=terminal]'));
    assert.equal(entryFor(w, 'terminal'), undefined);

    w.openApp('customize');
    const customize = wins.get('customize').body;
    click(w, customize.querySelector('#cust-add-shortcut'));
    const picker = w.document.querySelector('#desktop-picker');
    const search = picker.querySelector('input[type=search]');
    search.value = 'Terminal'; search.dispatchEvent(new w.Event('input', { bubbles: true }));
    click(w, picker.querySelector('[data-app=terminal]'));
    assert.ok(customize.querySelector('[data-shortcut-remove]')); // refreshed while Customize stays open
    click(w, customize.querySelector(`[data-shortcut-remove="${entryFor(w, 'terminal').id}"]`));
    assert.equal(entryFor(w, 'terminal'), undefined);
    assert.equal(icons.addApp('terminal'), true);
    key(w, iconFor(w, 'Terminal'), 'Delete');
    assert.equal(entryFor(w, 'terminal'), undefined, 'Delete removes the link, not the app');

    w.eval("userData.customApps.push({id:'my-custom',name:'Personal App',url:'https://example.org',icon:'star'}); syncCustomApps(); refreshChrome();");
    assert.equal(icons.addApp('my-custom'), true);
    w.closeWin('appcenter'); w.openApp('appcenter');
    click(w, wins.get('appcenter').body.querySelector('[data-cdel="my-custom"]'));
    assert.equal(entryFor(w, 'my-custom'), undefined);
    assert.equal(iconFor(w, 'Personal App'), undefined);
    assert.equal(w.eval('APPS["my-custom"]'), undefined);
  } finally { d.close(); }
});

test('app hide, rename, backups, customization reset and account switching refresh only that account’s icons', async () => {
  const d = desktop();
  try {
    const { window: w, icons, FS, wins } = d;
    w.enterDesktop(); icons.addApp('terminal');
    w.eval("userData.moduleOverrides.browser = { name: 'Explorer', icon: 'globe' }; applyModuleOverrides(); refreshChrome();");
    assert.ok(iconFor(w, 'Explorer'));
    w.eval("userData.hiddenApps.push('browser'); refreshChrome();");
    assert.equal(iconFor(w, 'Explorer'), undefined);
    assert.ok(entryFor(w, 'browser'), 'hidden apps keep their shortcut for restoration');
    w.eval('userData.hiddenApps = []; refreshChrome(); saveDataNow();');
    assert.ok(iconFor(w, 'Explorer'));
    assert.equal(FS._listeners.size, 1);

    w.eval("currentUser = {username:'Bob',usernameLower:'bob',displayName:'Bob',createdAt:Date.now()}; userData = MH.defaultData('Bob','bob');");
    w.enterDesktop();
    assert.equal(FS._listeners.size, 1, 'switching accounts unsubscribes the old renderer');
    assert.equal(entryFor(w, 'terminal'), undefined);
    assert.ok(entryFor(w, '/home/bob/Documents'));
    assert.equal(iconFor(w, 'Browser').dataset.col, '0');
    w.eval("currentUser = {username:'Ada',usernameLower:'ada',displayName:'Ada',createdAt:Date.now()}; userData = MH.loadJSON(MH.userKey('ada'), {});");
    w.enterDesktop();
    assert.ok(entryFor(w, 'terminal'), 'Ada’s saved icons return');
    assert.ok(iconFor(w, 'Explorer'));

    w.openApp('settings');
    const settings = wins.get('settings').body;
    const backup = { data: { ...w.eval('userData'), desktopIcons: [] } };
    const input = settings.querySelector('#s-import');
    Object.defineProperty(input, 'files', { configurable: true, value: [{ text: async () => JSON.stringify(backup) }] });
    input.dispatchEvent(new w.Event('change'));
    await tick();
    assert.equal(iconsOn(w).length, 0, 'backup import updates the mounted desktop immediately');
    w.openApp('customize');
    click(w, wins.get('customize').body.querySelector('#cust-reset'));
    assert.deepEqual(iconsOn(w).map((x) => x.textContent.trim()), ['Files', 'Browser', 'Documents']);
    assert.equal(w.signOut(), true);
    assert.equal(FS._listeners.size, 0, 'sign out removes desktop and Files listeners');
  } finally { d.close(); }
});

test('invalid and cross-account paths are refused and quota failure rolls back shortcut edits', () => {
  const d = desktop();
  try {
    const { window: w, icons, FS } = d, home = FS.home();
    w.enterDesktop();
    assert.equal(icons.addPaths(['/home/other/Documents']), 0);
    assert.equal(icons.addPaths([home + '/missing.txt']), 0);
    const saved = w.eval('userData.desktopIcons.length');
    const storage = Object.getPrototypeOf(w.localStorage), setItem = storage.setItem, warn = w.console.warn;
    storage.setItem = () => { throw new Error('quota'); }; w.console.warn = () => {};
    try {
      assert.equal(icons.addApp('terminal'), false);
      assert.equal(icons.addPaths([home + '/Documents/Welcome.txt']), 0);
      assert.equal(w.eval('userData.desktopIcons.length'), saved);
      assert.equal(iconFor(w, 'Terminal'), undefined);
      assert.equal(iconFor(w, 'Welcome.txt'), undefined);
    } finally { storage.setItem = setItem; w.console.warn = warn; }
  } finally { d.close(); }
});
