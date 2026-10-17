/* proton — virtual file system (VFS).
 *
 * One real, hierarchical file system rooted at "/". This build ships no
 * Files app or Terminal, so the tree is what the Browser opens HTML files
 * from (file:///path) and what every account's own data lives in; it stays
 * a complete, documented API for apps added back later.
 *
 * Two layers:
 *   - System layer (READ-ONLY): every single file of this website, listed in
 *     data/fs-manifest.js (regenerate with tools/gen-fs-manifest.py). The / tree
 *     shows the whole system — apps/, assets/, data/, tools/ and the root
 *     files — and file contents are fetched over HTTP on demand
 *     when opened. These files are the site's own code and can never be
 *     modified from inside proton.
 *   - User layer (READ-WRITE): the account's own files and folders under
 *     /home/<username>/, saved per account in this browser (userData in
 *     localStorage). Create, edit, rename and delete freely here.
 *
 * API (paths may be absolute, or relative to the cwd you pass in):
 *   FS.home()                     '/home/<user>'
 *   FS.normalize(path, cwd)       resolve ~, . and .. → clean absolute path
 *   FS.join(...parts) / FS.dirname(p) / FS.basename(p) / FS.extname(p)
 *   FS.stat(path, cwd)            { type, name, path, size, updated, readonly,
 *                                   user } or null
 *   FS.list(path, cwd)            entries sorted dirs-first, then by name
 *   FS.read(path, cwd)            Promise<string> text contents
 *   FS.readBlob(path, cwd)        Promise<Blob> raw bytes (downloads)
 *   FS.write(path, content, cwd)  create/overwrite a user text file
 *   FS.writeBlob(path, blob, cwd) import a small binary file
 *   FS.appFor(path)              associated desktop app for a file
 *   FS.mkdir(path, cwd, recursive)/ FS.rm(path, cwd, recursive) /
 *   FS.rename(from, to, cwd) / FS.copy(from, to, cwd)
 *   FS.exists / FS.isDir / FS.isWritable / FS.count
 *   FS.watch(listener)             subscribe to persisted file changes
 *   FS_ARCHIVE.zip(paths)           download selection as a ZIP (fs-archive.js)
 */
'use strict';

const FS = {
  /* file extensions served as raw bytes, never decoded as text */
  BINARY_EXT: new Set([
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'ico', 'pdf',
    'ttf', 'otf', 'woff', 'woff2', 'mp3', 'm4a', 'aac', 'flac', 'mp4', 'wav',
    'ogg', 'oga', 'ogv', 'mov', 'webm', 'avi', 'zip', 'gz', 'wasm', 'exe', 'dll', 'so',
  ]),
  /* localStorage holds the account, not just its files. Larger media should
   * be opened with Media/PDF Viewer directly from the computer instead. */
  MAX_BLOB_SIZE: 2 * 1024 * 1024,
  /* the first home directory seeded for every account */
  HOME_DIRS: ['Desktop', 'Documents', 'Pictures', 'Downloads'],
  /* Other apps (Terminal, Text Editor) can change the same tree while Files
   * stays open. Notify listeners only after a successful persisted mutation. */
  _listeners: new Set(),
  watch(listener) { this._listeners.add(listener); return () => this._listeners.delete(listener); },
  _changed(...paths) {
    for (const listener of this._listeners) {
      try { listener(paths); } catch (err) { console.error('FS change listener failed', err); }
    }
  },

  /* ============================ path helpers ============================ */
  home() {
    const u = currentUser?.usernameLower || currentUser?.username || 'user';
    return '/home/' + String(u).toLowerCase();
  },
  normalize(path, cwd = '/') {
    let p = String(path ?? '');
    if (p === '~') p = this.home();
    else if (p.startsWith('~/')) p = this.home() + p.slice(1);
    if (!p.startsWith('/')) p = String(cwd ?? '/') + '/' + p;
    const out = [];
    for (const part of p.split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') out.pop();
      else out.push(part);
    }
    return '/' + out.join('/');
  },
  join(...parts) {
    return this.normalize(parts.filter((x) => x !== '' && x != null).join('/'));
  },
  dirname(path) {
    const p = this.normalize(path);
    const i = p.lastIndexOf('/');
    return i <= 0 ? '/' : p.slice(0, i);
  },
  basename(path) {
    const p = this.normalize(path);
    return p === '/' ? '/' : p.slice(p.lastIndexOf('/') + 1);
  },
  extname(path) {
    const n = this.basename(path);
    const i = n.lastIndexOf('.');
    return i > 0 ? n.slice(i + 1).toLowerCase() : '';
  },
  isBinary(path) {
    const p = this.normalize(path);
    if (this.BINARY_EXT.has(this.extname(p))) return true;
    if (!p.startsWith(this.home() + '/')) return false;
    this._migrate();
    return userData?.files.find((f) => f.path === p)?.data !== undefined;
  },
  mime(path) {
    const types = {
      html: 'text/html', htm: 'text/html', css: 'text/css', js: 'text/javascript',
      json: 'application/json', svg: 'image/svg+xml', pdf: 'application/pdf',
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
      webp: 'image/webp', avif: 'image/avif', bmp: 'image/bmp', ico: 'image/x-icon',
      mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', flac: 'audio/flac',
      wav: 'audio/wav', ogg: 'audio/ogg', oga: 'audio/ogg', ogv: 'video/ogg',
      mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', avi: 'video/x-msvideo',
    };
    return types[this.extname(path)] || (this.isBinary(path) ? 'application/octet-stream' : 'text/plain;charset=utf-8');
  },
  mediaKind(path) {
    const ext = this.extname(path);
    if (['mp3', 'm4a', 'aac', 'flac', 'wav', 'ogg', 'oga'].includes(ext)) return 'audio';
    if (['mp4', 'mov', 'webm', 'avi', 'ogv'].includes(ext)) return 'video';
    return null;
  },
  /* Which app opens a file, by extension. The ids are catalog ids: an app
   * that is not in data/applications.js simply cannot be opened, and
   * openFSItem() in assets/core.js says so. */
  appFor(path) {
    const ext = this.extname(path);
    if (['html', 'htm'].includes(ext)) return this.isBinary(path) ? null : 'browser';
    if (ext === 'pdf') return 'pdf';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'ico', 'svg'].includes(ext)) return 'image-viewer';
    if (this.mediaKind(path)) return 'media';
    return this.isBinary(path) ? null : 'text-editor';
  },

  /* ======================== tree: system layer ========================== */
  /* Built once from the manifest: { dirs: Set<path>, files: Map<path, size> }. */
  _sys: null,
  _system() {
    if (this._sys) return this._sys;
    const dirs = new Set(['/']);
    const files = new Map();
    for (const e of (window.PROTON_FS_MANIFEST || [])) {
      const path = this.normalize(e.p);
      files.set(path, e.s | 0);
      let d = this.dirname(path);
      while (d !== '/') { dirs.add(d); d = this.dirname(d); }
    }
    this._sys = { dirs, files };
    return this._sys;
  },

  /* ========================= tree: user layer =========================== */
  /* Old accounts stored {name, folder} tags; migrate them to real paths once. */
  _migratedFor: null,
  _migrate() {
    if (!userData || this._migratedFor === userData) return;
    userData.dirs ||= [];
    userData.files ||= [];
    const home = this.home();
    const hasLegacy = userData.files.some((f) => f && f.path === undefined);
    if (hasLegacy) {
      const files = [];
      for (const f of userData.files) {
        if (!f) continue;
        if (f.path !== undefined) { files.push(f); continue; }
        const folder = (f.folder && f.folder !== 'Home') ? f.folder : '';
        const path = this.join(home, folder, f.name || 'Untitled.txt');
        files.push({ path, content: f.content ?? '', updated: f.updated || Date.now() });
        if (folder) {
          const d = this.join(home, folder);
          if (!userData.dirs.includes(d)) userData.dirs.push(d);
        }
      }
      userData.files = files;
      for (const name of (userData.fileFolders || [])) {
        if (!name || name === 'Home') continue;
        const d = this.join(home, name);
        if (!userData.dirs.includes(d)) userData.dirs.push(d);
      }
      delete userData.fileFolders;
      saveData();
    }
    /* Every parent directory of a stored path must exist in the dir list. */
    for (const f of userData.files) {
      let d = this.dirname(f.path || '/');
      while (d.startsWith(home)) {
        if (d === home) break;
        if (!userData.dirs.includes(d)) userData.dirs.push(d);
        d = this.dirname(d);
      }
    }
    userData.dirs = userData.dirs.filter((d) => d && d !== home && d.startsWith(home + '/'));
    this._migratedFor = userData;
  },

  /* ============================ lookups ================================= */
  stat(path, cwd = '/') {
    const p = this.normalize(path, cwd);
    if (p === '/') return { type: 'dir', name: '/', path: '/', size: 0, readonly: true, user: false };
    if (p === '/home') return { type: 'dir', name: 'home', path: '/home', size: 0, readonly: true, user: true };
    const home = this.home();
    if (p === home || p.startsWith(home + '/')) {
      this._migrate();
      if (!userData) return null;
      if (p === home) return { type: 'dir', name: this.basename(home), path: p, size: 0, readonly: false, user: true };
      const dir = userData.dirs.find((d) => d === p);
      if (dir) return { type: 'dir', name: this.basename(p), path: p, size: 0, readonly: false, user: true };
      const f = userData.files.find((x) => x.path === p);
      if (f) return {
        type: 'file', name: this.basename(p), path: p,
        size: f.data !== undefined ? (f.size ?? Math.floor(f.data.length * 3 / 4)) : new Blob([f.content ?? '']).size,
        updated: f.updated || 0, readonly: false, user: true,
      };
      return null;
    }
    const sys = this._system();
    if (sys.dirs.has(p)) return { type: 'dir', name: this.basename(p), path: p, size: 0, readonly: true, user: false };
    if (sys.files.has(p)) return {
      type: 'file', name: this.basename(p), path: p,
      size: sys.files.get(p), updated: 0, readonly: true, user: false,
    };
    return null;
  },
  exists(path, cwd = '/') { return this.stat(path, cwd) !== null; },
  isDir(path, cwd = '/') { return this.stat(path, cwd)?.type === 'dir'; },
  /* May this path be created/changed? User files live under /home/<user>. */
  isWritable(path, cwd = '/') {
    const p = this.normalize(path, cwd);
    const home = this.home();
    return p === home || p.startsWith(home + '/');
  },

  list(path, cwd = '/') {
    const p = this.normalize(path, cwd);
    const st = this.stat(p);
    if (!st) throw new Error(`No such directory: ${p}`);
    if (st.type !== 'dir') throw new Error(`Not a directory: ${p}`);
    const out = [];
    const home = this.home();
    if (p === '/') {
      const sys = this._system();
      for (const d of sys.dirs) if (d !== '/' && this.dirname(d) === '/') out.push(this.stat(d));
      for (const [f] of sys.files) if (this.dirname(f) === '/') out.push(this.stat(f));
      out.push({ type: 'dir', name: 'home', path: '/home', size: 0, readonly: true, user: true });
    } else if (p === '/home') {
      out.push({ type: 'dir', name: this.basename(home), path: home, size: 0, readonly: false, user: true });
    } else if (p === home || p.startsWith(home + '/')) {
      this._migrate();
      if (userData) {
        for (const d of userData.dirs) if (this.dirname(d) === p) out.push(this.stat(d));
        for (const f of userData.files) if (f.path && this.dirname(f.path) === p) out.push(this.stat(f.path));
      }
    } else {
      const sys = this._system();
      for (const d of sys.dirs) if (d !== p && this.dirname(d) === p) out.push(this.stat(d));
      for (const [f] of sys.files) if (this.dirname(f) === p) out.push(this.stat(f));
    }
    out.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
    return out;
  },

  /* ============================== reading =============================== */
  async read(path, cwd = '/') {
    const p = this.normalize(path, cwd);
    const st = this.stat(p);
    if (!st) throw new Error(`No such file: ${p}`);
    if (st.type === 'dir') throw new Error(`Is a directory: ${p}`);
    if (this.isBinary(p)) throw new Error(`Binary file: ${p} — open it with its app or download it`);
    if (st.user) return userData.files.find((f) => f.path === p)?.content ?? '';
    const res = await fetch(new URL(p.slice(1), document.baseURI).href);
    if (!res.ok) throw new Error(`${p}: HTTP ${res.status}`);
    return res.text();
  },
  async readBlob(path, cwd = '/') {
    const p = this.normalize(path, cwd);
    const st = this.stat(p);
    if (!st) throw new Error(`No such file: ${p}`);
    if (st.type === 'dir') throw new Error(`Is a directory: ${p}`);
    if (st.user) {
      const f = userData.files.find((x) => x.path === p);
      if (f.data !== undefined) {
        const raw = atob(f.data);
        const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
        return new Blob([bytes], { type: f.mime || this.mime(p) });
      }
      return new Blob([f.content ?? ''], { type: this.mime(p) });
    }
    const res = await fetch(new URL(p.slice(1), document.baseURI).href);
    if (!res.ok) throw new Error(`${p}: HTTP ${res.status}`);
    return res.blob();
  },

  /* ============================= writing ================================ */
  _assertWritable(p, forCreate = '') {
    if (!this.isWritable(p)) throw new Error(`Read-only file system: ${p}`);
    if (forCreate) {
      const parent = this.dirname(p);
      const pst = this.stat(parent);
      if (!pst) throw new Error(`No such directory: ${parent}`);
      if (pst.type !== 'dir') throw new Error(`Not a directory: ${parent}`);
    }
  },
  /* File operations save immediately so a quota error can roll back in-memory
   * changes instead of reporting success and silently losing the file later. */
  _putFile(p, fields) {
    this._migrate();
    this._assertWritable(p, 'create');
    if (this.stat(p)?.type === 'dir') throw new Error(`Is a directory: ${p}`);
    const index = userData.files.findIndex((f) => f.path === p);
    const previous = userData.files[index];
    const file = { path: p, ...fields, updated: Date.now() };
    if (index < 0) userData.files.push(file);
    else userData.files[index] = file;
    if (!saveDataNow()) {
      if (index < 0) userData.files.pop();
      else userData.files[index] = previous;
      throw new Error('Could not save the file — browser storage is full. Try a smaller file or export a backup.');
    }
    this._changed(p);
    return this.stat(p);
  },
  write(path, content, cwd = '/') {
    const p = this.normalize(path, cwd);
    if (this.BINARY_EXT.has(this.extname(p))) throw new Error(`Cannot write binary file as text: ${p} — use Import instead`);
    return this._putFile(p, { content: String(content ?? '') });
  },
  async writeBlob(path, blob, cwd = '/') {
    const p = this.normalize(path, cwd), owner = userData;
    this._migrate();
    this._assertWritable(p, 'create');
    if (!(blob instanceof Blob)) throw new Error('Expected a file or Blob');
    if (blob.size > this.MAX_BLOB_SIZE) {
      throw new Error(`This file is too large for browser storage (limit ${Math.round(this.MAX_BLOB_SIZE / 1048576)} MB). Open large media directly in Media or PDF Viewer.`);
    }
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (userData !== owner) throw new Error('The account changed before the import finished; no file was saved.');
    let raw = '';
    for (let i = 0; i < bytes.length; i += 8192) raw += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return this._putFile(p, {
      data: btoa(raw), size: bytes.length,
      mime: blob.type || (this.BINARY_EXT.has(this.extname(p)) ? this.mime(p) : 'application/octet-stream'),
    });
  },
  mkdir(path, cwd = '/', recursive = false) {
    const p = this.normalize(path, cwd);
    this._migrate();
    this._assertWritable(p);
    if (p === this.home()) throw new Error(`File exists: ${p}`);
    if (this.stat(p)) throw new Error(`File exists: ${p}`);
    const parent = this.dirname(p);
    const pst = this.stat(parent);
    if (!pst) {
      if (!recursive) throw new Error(`No such directory: ${parent}`);
      this.mkdir(parent, '/', true);
    } else if (pst.type !== 'dir') throw new Error(`Not a directory: ${parent}`);
    userData.dirs.push(p);
    if (!saveDataNow()) {
      userData.dirs.pop();
      throw new Error('Could not create the folder — browser storage is full.');
    }
    this._changed(p);
    return this.stat(p);
  },
  rm(path, cwd = '/', recursive = false) {
    const p = this.normalize(path, cwd);
    this._migrate();
    this._assertWritable(p);
    const home = this.home();
    if (p === home) throw new Error('Refusing to delete your home directory');
    const st = this.stat(p);
    if (!st) throw new Error(`No such file: ${p}`);
    const under = (x) => x === p || x.startsWith(p + '/');
    const oldDirs = userData.dirs, oldFiles = userData.files;
    if (st.type === 'dir') {
      const hasKids = userData.dirs.some((d) => d.startsWith(p + '/'))
        || userData.files.some((f) => f.path.startsWith(p + '/'));
      if (hasKids && !recursive) throw new Error(`Directory not empty: ${p}`);
      userData.dirs = userData.dirs.filter((d) => !under(d));
      userData.files = userData.files.filter((f) => !under(f.path));
    } else {
      userData.files = userData.files.filter((f) => f.path !== p);
    }
    if (!saveDataNow()) {
      userData.dirs = oldDirs; userData.files = oldFiles;
      throw new Error('Could not delete the item — browser storage is full.');
    }
    this._changed(p);
  },
  rename(from, to, cwd = '/') {
    const src = this.normalize(from, cwd), dst = this.normalize(to, cwd);
    this._migrate();
    this._assertWritable(src); this._assertWritable(dst, 'create');
    const st = this.stat(src);
    if (!st) throw new Error(`No such file: ${src}`);
    if (src === this.home()) throw new Error('Refusing to move your home directory');
    if (src === dst) return st;
    if (this.stat(dst)) throw new Error(`File exists: ${dst}`);
    if (dst.startsWith(src + '/')) throw new Error('Cannot move a folder into itself');
    const oldDirs = userData.dirs, oldFiles = userData.files;
    const rebase = (x) => dst + x.slice(src.length);
    if (st.type === 'dir') {
      userData.dirs = userData.dirs.map((d) => (d === src || d.startsWith(src + '/') ? rebase(d) : d));
      userData.files = userData.files.map((f) => (f.path.startsWith(src + '/') ? { ...f, path: rebase(f.path) } : f));
    } else {
      userData.files = userData.files.map((f) => (f.path === src ? { ...f, path: dst } : f));
    }
    if (!saveDataNow()) {
      userData.dirs = oldDirs; userData.files = oldFiles;
      throw new Error('Could not move the item — browser storage is full.');
    }
    this._changed(src, dst);
    return this.stat(dst);
  },
  async copy(from, to, cwd = '/') {
    const src = this.normalize(from, cwd), dst = this.normalize(to, cwd), owner = userData;
    this._migrate();
    this._assertWritable(dst, 'create');
    const st = this.stat(src);
    if (!st) throw new Error(`No such file: ${src}`);
    if (this.stat(dst)) throw new Error(`File exists: ${dst}`);
    const guard = () => { if (userData !== owner) throw new Error('The account changed during the copy.'); };
    if (st.type === 'dir') {
      if (src === '/' || dst.startsWith(src + '/')) throw new Error('Cannot copy a folder into itself');
      this.mkdir(dst);
      try {
        for (const e of this.list(src)) { guard(); await this.copy(e.path, dst + '/' + e.name); }
        guard();
      } catch (err) {
        if (userData === owner) this.rm(dst, '/', true); // don't leave a half-copied folder after a failure
        throw err; // never touch a different account's folder during cleanup
      }
    } else if (this.isBinary(src)) {
      const blob = await this.readBlob(src); guard();
      await this.writeBlob(dst, blob);
    } else {
      const text = await this.read(src); guard();
      this.write(dst, text);
    }
    guard();
    return this.stat(dst);
  },

  /* Counts + storage used by the writable layer (for status bars). */
  count() {
    this._migrate();
    return {
      dirs: userData.dirs.length,
      files: userData.files.length,
      bytes: userData.files.reduce((n, f) => n + (f.data !== undefined ? (f.size ?? Math.floor(f.data.length * 3 / 4)) : new Blob([f.content ?? '']).size), 0),
    };
  },
  /* Every path in the tree that matches a substring (for find/grep). */
  find(sub, path = '/') {
    const needle = String(sub ?? '').toLowerCase();
    const out = [];
    const walk = (dir, depth) => {
      if (depth > 12) return;
      for (const e of this.list(dir)) {
        if (!needle || e.name.toLowerCase().includes(needle) || e.path.toLowerCase().includes(needle)) out.push(e);
        if (e.type === 'dir') walk(e.path, depth + 1);
      }
    };
    const st = this.stat(path);
    if (!st) throw new Error(`No such directory: ${path}`);
    if (st.type === 'file') return [st];
    walk(this.normalize(path), 0);
    return out;
  },
};
