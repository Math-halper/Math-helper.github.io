/* Small, dependency-free ZIP (stored entries) for downloading VFS folders and
 * selections. No archive is written to localStorage or uploaded anywhere.
 * Both user and system files are read through FS.readBlob(), so bytes survive
 * unchanged. ZIP64 is intentionally out of scope; cap memory and entry count. */
'use strict';
const FS_ARCHIVE = (() => {
  const LIMIT = 100 * 1024 * 1024, MAX_ENTRIES = 2000;
  const table = Array.from({ length: 256 }, (_, i) => {
    let c = i;
    for (let bit = 0; bit < 8; bit++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    return c >>> 0;
  });
  function crc32(bytes) {
    let c = 0xffffffff;
    for (const b of bytes) c = (c >>> 8) ^ table[(c ^ b) & 255];
    return (c ^ 0xffffffff) >>> 0;
  }
  function timestamp(value) {
    const d = value ? new Date(value) : new Date(1980, 0, 1);
    const year = Math.max(1980, Math.min(2107, d.getFullYear()));
    return { date: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
      time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1) };
  }
  function field(view, offset, value, width = 2) {
    if (width === 2) view.setUint16(offset, value, true);
    else view.setUint32(offset, value, true);
  }
  async function zip(paths) {
    const encoder = new TextEncoder(), owner = userData;
    const guard = () => { if (userData !== owner) throw new Error('The account changed during the download.'); };
    const entries = [], seen = new Set();
    let totalBytes = 0;
    async function add(path, relative) {
      guard();
      const st = FS.stat(path);
      if (!st) throw new Error(`File not found: ${path}`);
      /* ZIP paths must always be relative, with POSIX separators; this also
       * prevents a malformed imported filename from extracting outside it. */
      const parts = relative.split('/').filter(Boolean);
      if (!parts.length || parts.some((part) => part === '.' || part === '..' || part.includes('\\'))) {
        throw new Error(`Cannot archive unsafe path: ${relative}`);
      }
      const name = parts.join('/') + (st.type === 'dir' ? '/' : '');
      if (seen.has(name)) return;
      seen.add(name);
      if (entries.length >= MAX_ENTRIES) throw new Error('Too many items to download as one ZIP (limit 2,000).');
      let bytes = new Uint8Array(0);
      if (st.type === 'file') {
        if (st.size + totalBytes > LIMIT) throw new Error('The selection is too large for one download (100 MB limit).');
        bytes = new Uint8Array(await (await FS.readBlob(path)).arrayBuffer());
        guard();
        totalBytes += bytes.length;
        if (totalBytes > LIMIT) throw new Error('The selection is too large for one download (100 MB limit).');
      }
      entries.push({ name: encoder.encode(name), bytes, crc: crc32(bytes), ...timestamp(st.updated), dir: st.type === 'dir' });
      if (st.type === 'dir') {
        for (const child of FS.list(st.path)) await add(child.path, name + child.name);
      }
    }
    for (const path of paths) {
      guard();
      const normalized = FS.normalize(path);
      if (normalized === '/' || normalized === '/home') throw new Error('Choose a folder or file, not the entire system root.');
      await add(normalized, FS.basename(normalized));
    }
    const chunks = [], index = [];
    let offset = 0;
    for (const entry of entries) {
      const nameLen = entry.name.length, size = entry.bytes.length;
      const local = new Uint8Array(30 + nameLen), h = new DataView(local.buffer);
      field(h, 0, 0x04034b50, 4); field(h, 4, 20); field(h, 6, 0x0800);
      field(h, 10, entry.time); field(h, 12, entry.date);
      field(h, 14, entry.crc, 4); field(h, 18, size, 4); field(h, 22, size, 4);
      field(h, 26, nameLen); local.set(entry.name, 30);
      chunks.push(local, entry.bytes);
      const central = new Uint8Array(46 + nameLen), c = new DataView(central.buffer);
      field(c, 0, 0x02014b50, 4); field(c, 4, 20); field(c, 6, 20); field(c, 8, 0x0800);
      field(c, 12, entry.time); field(c, 14, entry.date); field(c, 16, entry.crc, 4);
      field(c, 20, size, 4); field(c, 24, size, 4); field(c, 28, nameLen);
      field(c, 38, entry.dir ? 0x10 << 16 : 0, 4); field(c, 42, offset, 4);
      central.set(entry.name, 46); index.push(central);
      offset += local.length + size;
    }
    const indexSize = index.reduce((n, part) => n + part.length, 0);
    const end = new Uint8Array(22), e = new DataView(end.buffer);
    field(e, 0, 0x06054b50, 4); field(e, 8, entries.length); field(e, 10, entries.length);
    field(e, 12, indexSize, 4); field(e, 16, offset, 4);
    return new Blob([...chunks, ...index, end], { type: 'application/zip' });
  }
  return { zip };
})();
