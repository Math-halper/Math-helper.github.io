/* proton — virtual file system (VFS).
 *
 * One real, hierarchical file system rooted at "/" — shared by the Files app
 * (apps/files/app.html) and the Terminal (apps/terminal/app.html), so the
 * paths you browse and the paths you cat are exactly the same tree.
 *
 * Two layers:
 *   - System layer (READ-ONLY): every single file of this website, listed in
 *     data/fs-manifest.js (regenerate with tools/gen-fs-manifest.py). The / tree
 *     shows the whole system — apps/, assets/, data/, tools/, websites/ and
 *     the root files — and file contents are fetched over HTTP on demand
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
 *   FS.write(path, content, cwd)  create/overwrite a user file
 *   FS.mkdir(path, cwd, recursive)/ FS.rm(path, cwd, recursive) /
 *   FS.rename(from, to, cwd) / FS.copy(from, to, cwd)
 *   FS.exists / FS.isDir / FS.isWritable / FS.count
 */
'use strict';

const FS = {
  /* file extensions served as raw bytes, never decoded as text */
  BINARY_EXT: new Set([
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'pdf', 'ttf', 'otf',
    'woff', 'woff2', 'mp3', 'mp4', 'wav', 'ogg', 'mov', 'webm', 'zip', 'gz',
    'wasm', 'exe', 'dll', 'so',
  ]),
  /* the first home directory seeded for every account */
  HOME_DIRS: ['Desktop', 'Documents', 'Pictures', 'Downloads'],

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
  isBinary(path) { return this.BINARY_EXT.has(this.extname(path)); },

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
        size: (f.content ?? '').length, updated: f.updated || 0,
        readonly: false, user: true,
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
    if (st.user) {
      this._migrate();
      return userData.files.find((f) => f.path === p)?.content ?? '';
    }
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
      this._migrate();
      const f = userData.files.find((x) => x.path === p);
      return new Blob([f?.content ?? ''], { type: 'text/plain' });
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
  write(path, content, cwd = '/') {
    const p = this.normalize(path, cwd);
    this._migrate();
    this._assertWritable(p, 'create');
    const st = this.stat(p);
    if (st?.type === 'dir') throw new Error(`Is a directory: ${p}`);
    const text = String(content ?? '');
    if (st) {
      const f = userData.files.find((x) => x.path === p);
      f.content = text; f.updated = Date.now();
    } else {
      userData.files.push({ path: p, content: text, updated: Date.now() });
    }
    saveData();
    return this.stat(p);
  },
  mkdir(path, cwd = '/', recursive = false) {
    const p = this.normalize(path, cwd);
    this._migrate();
    this._assertWritable(p);
    if (p === this.home()) throw new Error(`File exists: ${p}`);
    if (this.stat(p)) throw new Error(`File exists: ${p}`);
    const parent = this.dirname(p);
    if (!this.stat(parent)) {
      if (!recursive) throw new Error(`No such directory: ${parent}`);
      this.mkdir(parent, '/', true);
    }
    userData.dirs.push(p);
    saveData();
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
    if (st.type === 'dir') {
      const hasKids = userData.dirs.some((d) => d.startsWith(p + '/'))
        || userData.files.some((f) => f.path.startsWith(p + '/'));
      if (hasKids && !recursive) throw new Error(`Directory not empty: ${p}`);
      userData.dirs = userData.dirs.filter((d) => !under(d));
      userData.files = userData.files.filter((f) => !under(f.path));
    } else {
      userData.files = userData.files.filter((f) => f.path !== p);
    }
    saveData();
  },
  rename(from, to, cwd = '/') {
    const src = this.normalize(from, cwd), dst = this.normalize(to, cwd);
    this._migrate();
    this._assertWritable(src); this._assertWritable(dst, 'create');
    const st = this.stat(src);
    if (!st) throw new Error(`No such file: ${src}`);
    if (this.stat(dst)) throw new Error(`File exists: ${dst}`);
    if (dst.startsWith(src + '/')) throw new Error('Cannot move a folder into itself');
    const rebase = (x) => dst + x.slice(src.length);
    if (st.type === 'dir') {
      userData.dirs = userData.dirs.map((d) => (d === src || d.startsWith(src + '/') ? rebase(d) : d));
      if (!userData.dirs.includes(dst)) userData.dirs.push(dst);
      userData.files = userData.files.map((f) => (f.path.startsWith(src + '/') ? { ...f, path: rebase(f.path) } : f));
    } else {
      const f = userData.files.find((x) => x.path === src);
      f.path = dst;
    }
    saveData();
    return this.stat(dst);
  },
  async copy(from, to, cwd = '/') {
    const src = this.normalize(from, cwd), dst = this.normalize(to, cwd);
    this._migrate();
    this._assertWritable(dst, 'create');
    const st = this.stat(src);
    if (!st) throw new Error(`No such file: ${src}`);
    if (this.stat(dst)) throw new Error(`File exists: ${dst}`);
    if (st.type === 'dir') {
      this.mkdir(dst, '/', true);
      for (const e of this.list(src)) await this.copy(e.path, dst + '/' + e.name);
    } else {
      const text = st.user ? userData.files.find((f) => f.path === src)?.content ?? '' : await this.read(src);
      this.write(dst, text);
    }
    return this.stat(dst);
  },

  /* Counts + storage used by the writable layer (for status bars). */
  count() {
    this._migrate();
    return {
      dirs: userData.dirs.length,
      files: userData.files.length,
      bytes: userData.files.reduce((n, f) => n + (f.content ?? '').length, 0),
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
