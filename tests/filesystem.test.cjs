const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');

function vfs() {
  const home = '/home/ada';
  const data = { dirs: [home + '/Documents', home + '/Pictures'], files: [] };
  const saved = [];
  const context = vm.createContext({
    window: { PROTON_FS_MANIFEST: [
      { p: 'websites/guide/site.html', s: 14 },
      { p: 'assets/logo.png', s: 4 },
    ] },
    document: { baseURI: 'https://example.github.io/repo/index.html' },
    currentUser: { usernameLower: 'ada' }, userData: data,
    Blob, Uint8Array, TextDecoder, URL, btoa, atob,
    saveData() {}, saveDataNow() { saved.push(JSON.stringify(data)); return true; },
    fetch: async (url) => {
      assert.ok(url.startsWith('https://example.github.io/repo/'), url);
      return { ok: true, text: async () => '<h1>Guide</h1>', blob: async () => new Blob([new Uint8Array([0, 255, 42, 1])], { type: 'image/png' }) };
    },
  });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/fs.js'), 'utf8'), context);
  return { FS: vm.runInContext('FS', context), context, data, saved, home };
}

test('system paths and account folders share the same tree, with correct associations', async () => {
  const { FS, home } = vfs();
  assert.equal(FS.stat('/websites/guide/site.html').readonly, true);
  assert.equal(await FS.read('/websites/guide/site.html'), '<h1>Guide</h1>');
  assert.equal(FS.stat('/home').type, 'dir');
  assert.equal(FS.stat(home + '/Documents').type, 'dir');
  assert.equal(FS.appFor(home + '/Documents/page.html'), 'browser');
  assert.equal(FS.appFor(home + '/Documents/story.txt'), 'text-editor');
  assert.equal(FS.appFor(home + '/Pictures/photo.png'), 'image-viewer');
  assert.equal(FS.appFor(home + '/Documents/guide.pdf'), 'pdf');
  assert.equal(FS.appFor(home + '/Documents/song.mp3'), 'media');
  assert.equal(FS.appFor(home + '/Documents/movie.webm'), 'media');
  assert.equal(FS.appFor(home + '/Documents/font.woff2'), null);
  assert.throws(() => FS.write('/assets/file.txt', 'oops'), /Read-only/);
  assert.throws(() => FS.rm(home), /home directory/);
});

test('create, move, and delete; refuse invalid parents, home rename and self-copy', async () => {
  const { FS, home } = vfs();
  FS.write(home + '/Documents/file.txt', 'hello');
  assert.throws(() => FS.mkdir(home + '/Documents/file.txt/subfolder'), /Not a directory/);
  assert.throws(() => FS.rename(home, home + '/moved'), /home directory/);
  FS.mkdir(home + '/Documents/Work');
  FS.write(home + '/Documents/Work/note.md', 'work');
  await assert.rejects(FS.copy(home + '/Documents', home + '/Documents/copy'), /into itself/);
  assert.equal(FS.exists(home + '/Documents/copy'), false);
  FS.rename(home + '/Documents/Work', home + '/Pictures/Work');
  assert.equal(await FS.read(home + '/Pictures/Work/note.md'), 'work');
  assert.equal(FS.stat(home + '/Documents/Work'), null);
  await FS.copy(home + '/Pictures/Work', home + '/Documents/WorkCopy');
  assert.equal(await FS.read(home + '/Documents/WorkCopy/note.md'), 'work');
  assert.throws(() => FS.rm(home + '/Pictures/Work'), /not empty/);
  FS.rm(home + '/Pictures/Work', '/', true);
  assert.equal(FS.stat(home + '/Pictures/Work/note.md'), null);
});

test('binary import/download/copy preserve bytes instead of decoding as text', async () => {
  const { FS, home } = vfs();
  const bytes = new Uint8Array([0, 255, 143, 27, 60, 42]);
  const source = home + '/Pictures/test.png';
  await FS.writeBlob(source, new Blob([bytes], { type: 'image/png' }));
  assert.equal(FS.stat(source).size, bytes.length);
  assert.equal(FS.mime(source), 'image/png');
  assert.deepEqual(new Uint8Array(await (await FS.readBlob(source)).arrayBuffer()), bytes);
  await assert.rejects(FS.read(source), /Binary file/);
  await FS.copy(source, home + '/Documents/copy.png');
  assert.deepEqual(new Uint8Array(await (await FS.readBlob(home + '/Documents/copy.png')).arrayBuffer()), bytes);
  await FS.copy('/assets/logo.png', home + '/Pictures/system.png');
  assert.equal(FS.stat(home + '/Pictures/system.png').size, 4);
  FS.write(home + '/Documents/test.html', '<h1>Hi</h1>');
  assert.equal((await FS.readBlob(home + '/Documents/test.html')).type, 'text/html');
  await FS.writeBlob(home + '/Pictures/empty.data', new Blob([]));
  assert.equal(FS.isBinary(home + '/Pictures/empty.data'), true);
  assert.equal(FS.appFor(home + '/Pictures/empty.data'), null);
  assert.equal((await FS.readBlob(home + '/Pictures/empty.data')).type, 'application/octet-stream');
  assert.throws(() => FS.write(home + '/Pictures/test.png', 'not an image'), /Cannot write binary/);
});

test('quota failures leave no phantom files or half-saved edits', async () => {
  const { FS, context, home } = vfs();
  const p = home + '/Documents/saved.txt';
  FS.write(p, 'original');
  context.saveDataNow = () => false;
  assert.throws(() => FS.write(p, 'lost'), /storage is full/);
  assert.equal(await FS.read(p), 'original');
  assert.throws(() => FS.write(home + '/Documents/unsaved.txt', 'lost'), /storage is full/);
  assert.equal(FS.exists(home + '/Documents/unsaved.txt'), false);
  assert.throws(() => FS.mkdir(home + '/Pictures/unsaved'), /storage is full/);
  assert.equal(FS.exists(home + '/Pictures/unsaved'), false);
  assert.throws(() => FS.rename(p, home + '/Pictures/moved.txt'), /storage is full/);
  assert.equal(FS.exists(p), true);
});

test('binary storage size limit gives a useful error without changing the tree', async () => {
  const { FS, home } = vfs();
  await assert.rejects(FS.writeBlob(home + '/Pictures/large.jpg', new Blob([new Uint8Array(FS.MAX_BLOB_SIZE + 1)])), /too large/);
  assert.equal(FS.exists(home + '/Pictures/large.jpg'), false);
});

test('change listeners observe successful writes, moves and deletes, never failed mutations', () => {
  const { FS, context, home } = vfs();
  const changes = [];
  const unwatch = FS.watch((paths) => changes.push([...paths]));
  const first = home + '/Documents/watch.txt', second = home + '/Pictures/watch.txt';
  FS.write(first, 'saved');
  FS.rename(first, second);
  assert.deepEqual(changes, [[first], [first, second]]);
  context.saveDataNow = () => false;
  assert.throws(() => FS.rm(second), /storage is full/);
  assert.throws(() => FS.write(second, 'not saved'), /storage is full/);
  assert.equal(changes.length, 2, 'failed operations do not announce nonexistent changes');
  unwatch();
  context.saveDataNow = () => true;
  FS.rm(second);
  assert.equal(changes.length, 2);
});

test('slow imports and system copies cannot write into a different signed-in account', async () => {
  const { FS, context, home, data } = vfs();
  const next = { dirs: ['/home/bob/Documents'], files: [] };
  const blob = new Blob([Uint8Array.from([0, 255])]);
  blob.arrayBuffer = async () => {
    context.userData = next; context.currentUser = { usernameLower: 'bob' };
    return Uint8Array.from([0, 255]).buffer;
  };
  await assert.rejects(FS.writeBlob(home + '/Documents/late.bin', blob), /account changed/i);
  assert.equal(data.files.length, 0);
  assert.equal(next.files.length, 0);
  context.userData = data; context.currentUser = { usernameLower: 'ada' };
  context.fetch = async () => {
    context.userData = next; context.currentUser = { usernameLower: 'bob' };
    return { ok: true, text: async () => 'system file' };
  };
  await assert.rejects(FS.copy('/websites/guide/site.html', home + '/Documents/system.html'), /account changed/i);
  assert.equal(next.files.length, 0);
});
