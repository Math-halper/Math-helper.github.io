const { test } = require('node:test');
const assert = require('node:assert/strict');
const { desktop, tile, click, tick } = require('./helpers/desktop.cjs');

test('one click keeps the tile mounted; double-click enters folders and opens text in Text Editor', async () => {
  const d = desktop();
  try {
    const { window: w, FS, wins } = d;
    w.openApp('files');
    const files = wins.get('files').body, home = FS.home();
    const folder = tile(files, home + '/Documents');
    click(w, folder);
    assert.equal(folder.isConnected, true, 'selection must not replace the button before dblclick');
    assert.equal(tile(files, home + '/Documents'), folder);
    click(w, folder, 'dblclick');
    assert.equal(files.querySelector('#f-path').value, home + '/Documents');
    const textFile = tile(files, home + '/Documents/Welcome.txt');
    click(w, textFile);
    assert.equal(wins.has('text-editor'), false, 'single click selects without opening a preview');
    assert.equal(textFile.isConnected, true);
    click(w, textFile, 'dblclick');
    await tick();
    const editor = wins.get('text-editor').body;
    assert.match(editor.querySelector('#te-text').value, /Welcome to proton/);
    assert.equal(editor.querySelector('#te-path').textContent, home + '/Documents/Welcome.txt');
    editor.querySelector('#te-text').value = 'edited from the text app';
    editor.querySelector('#te-text').dispatchEvent(new w.Event('input', { bubbles: true }));
    click(w, editor.querySelector('#te-save'));
    assert.equal(await FS.read(home + '/Documents/Welcome.txt'), 'edited from the text app');
  } finally { d.close(); }
});

test('HTML files open in Browser, user scripts stay sandboxed, system assets keep real URLs', async () => {
  const d = desktop();
  try {
    const { window: w, FS, wins, revoked } = d;
    const home = FS.home();
    FS.write(home + '/Documents/index.html', '<h1>My page</h1><img src="photo.png"><script>document.body.dataset.local="yes"</script>');
    await FS.writeBlob(home + '/Documents/photo.png', new Blob([new Uint8Array([0, 128, 255])], { type: 'image/png' }));
    w.openApp('files', { path: home + '/Documents' });
    const files = wins.get('files').body;
    click(w, tile(files, home + '/Documents/index.html'), 'dblclick');
    await tick();
    const browser = wins.get('browser').body;
    assert.equal(browser.querySelector('#b-url').value, 'file://' + home + '/Documents/index.html');
    const frame = browser.querySelector('iframe');
    assert.ok(frame.srcdoc.includes('<h1>My page</h1>'));
    assert.ok(frame.srcdoc.includes('blob:mock/'), 'relative image is resolved from VFS');
    assert.ok(!frame.getAttribute('sandbox').includes('allow-same-origin'), 'account HTML cannot read parent storage');
    const firstBrowser = wins.get('browser').el;
    w.openApp('browser', { path: '/websites/guide/site.html' });
    assert.equal(wins.get('browser').el, firstBrowser, 'reuse the existing Browser window');
    assert.ok([...revoked].some((u) => u.startsWith('blob:mock/')), 'revoke old HTML asset URLs');
    assert.equal(browser.querySelector('iframe').src, 'https://math-halper.github.io/math-halper.github.io/websites/guide/site.html');
    assert.equal(browser.querySelector('#b-url').value, 'file:///websites/guide/site.html');
  } finally { d.close(); }
});

test('binary import stays binary; images, PDFs and audio/video reach their viewers', async () => {
  const d = desktop();
  try {
    const { window: w, FS, wins, revoked } = d;
    const home = FS.home();
    w.openApp('files', { path: home + '/Pictures' });
    const files = wins.get('files').body;
    const input = files.querySelector('#f-import');
    const bytes = new Uint8Array([0, 255, 66, 42]);
    const imported = Object.assign(new Blob([bytes], { type: 'image/png' }), { name: 'photo.png' });
    Object.defineProperty(input, 'files', { configurable: true, value: [imported] });
    input.dispatchEvent(new w.Event('change'));
    await tick();
    assert.deepEqual(new Uint8Array(await (await FS.readBlob(home + '/Pictures/photo.png')).arrayBuffer()), bytes);
    click(w, tile(files, home + '/Pictures/photo.png'), 'dblclick');
    await tick();
    const image = wins.get('image-viewer').body.querySelector('img');
    assert.equal(image.alt, 'photo.png');
    assert.match(image.src, /^blob:mock\//);
    w.closeWin('image-viewer');
    assert.ok(revoked.has(image.src), 'closing the image viewer releases its blob URL');

    await FS.writeBlob(home + '/Documents/guide.pdf', new Blob(['%PDF-test'], { type: 'application/pdf' }));
    await FS.writeBlob(home + '/Documents/music.mp3', new Blob([bytes], { type: 'audio/mpeg' }));
    FS.write(home + '/Documents/notes.md', '# Markdown');
    w.openApp('files', { path: home + '/Documents' });
    click(w, tile(files, home + '/Documents/guide.pdf'), 'dblclick');
    await tick();
    assert.ok(wins.get('pdf').body.querySelector('iframe[src^="blob:mock/"]'));
    click(w, tile(files, home + '/Documents/music.mp3'), 'dblclick');
    await tick();
    assert.match(wins.get('media').body.querySelector('#md-list').textContent, /music\.mp3/);
    assert.equal(wins.get('media').body.querySelector('#md-audio').hidden, false);
    click(w, tile(files, home + '/Documents/notes.md'), 'dblclick');
    await tick();
    assert.equal(wins.get('text-editor').body.querySelector('#te-text').value, '# Markdown');
  } finally { d.close(); }
});

test('Terminal open <path> uses the same associations as Files', async () => {
  const d = desktop();
  try {
    const { window: w, wins, FS } = d;
    w.openApp('terminal');
    const input = wins.get('terminal').body.querySelector('#t-in');
    input.value = 'open Documents/Welcome.txt';
    input.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await tick();
    assert.equal(wins.get('text-editor').body.querySelector('#te-path').textContent, FS.home() + '/Documents/Welcome.txt');
  } finally { d.close(); }
});

test('deleting an account does not save it back while signing out', () => {
  const d = desktop();
  try {
    const { window: w, FS, wins } = d;
    const MH = w.eval('MH');
    const key = MH.userKey('ada');
    w.localStorage.setItem(MH.ACCOUNTS_KEY, JSON.stringify({ ada: { username: 'Ada', usernameLower: 'ada', displayName: 'Ada' } }));
    FS.write(FS.home() + '/Documents/test.txt', 'this account will be deleted');
    assert.ok(w.localStorage.getItem(key));
    w.openApp('settings');
    click(w, wins.get('settings').body.querySelector('#s-delete'));
    assert.equal(w.localStorage.getItem(key), null);
    assert.equal(w.localStorage.getItem(MH.ACCOUNTS_KEY), '{}');
  } finally { d.close(); }
});

test('unsaved editor work can cancel a window close; system files are read-only', async () => {
  const d = desktop();
  try {
    const { window: w, FS, wins } = d;
    w.openApp('text-editor', { path: '/assets/example.js' });
    await tick();
    assert.equal(wins.get('text-editor').body.querySelector('#te-text').readOnly, true);
    assert.equal(wins.get('text-editor').body.querySelector('#te-save').disabled, true);
    w.openApp('text-editor', { path: FS.home() + '/README.txt' });
    await tick();
    const editor = wins.get('text-editor').body;
    editor.querySelector('#te-text').value = 'not saved';
    editor.querySelector('#te-text').dispatchEvent(new w.Event('input', { bubbles: true }));
    w.confirm = () => false;
    assert.equal(w.closeWin('text-editor'), false);
    assert.equal(wins.has('text-editor'), true);
    assert.match(editor.querySelector('#te-status').textContent, /Unsaved/);
  } finally { d.close(); }
});
