#!/usr/bin/env python3
"""Generate data/fs-manifest.js — the file list proton's virtual file system
shows under / (see assets/fs.js).

The site is static, so the VFS cannot ask the server for a directory listing.
Instead this script snapshots the site's files (path + size) into one small
JS file. Dependencies, the regression tests and local build caches are
excluded: they aren't part of the deployed site. The Files app and Terminal read it to build the / tree,
and file contents are fetched over HTTP on demand when opened.

Run from anywhere (paths are resolved from this script's location):

    python3 tools/gen-fs-manifest.py

Re-run it whenever files are added, removed or renamed, then commit the
updated data/fs-manifest.js. There is no other build step.
"""

import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'data', 'fs-manifest.js')
SELF = 'data/fs-manifest.js'  # included too — the manifest lists itself
EXCLUDE_DIRS = {'.git', '.arena', 'node_modules', '__pycache__', '.cache', '.pytest_cache',
                '.venv', 'dist', 'build', 'coverage', '.next', 'tests'}

HEADER = """\
/* proton — file system manifest — GENERATED FILE, do not edit by hand.
 *
 * Every deployed site file (path + size in bytes) so the virtual file
 * system (assets/fs.js) can show a complete / directory tree: the system
 * folders apps/, assets/, data/ and tools/, every single file in them, plus
 * the root files. Contents are fetched over HTTP on demand when a file is
 * opened (the Browser does this for HTML pages).
 *
 * Regenerate after adding/removing/renaming files:
 *     python3 tools/gen-fs-manifest.py
 */

window.PROTON_FS_MANIFEST = [
"""


def collect():
    entries = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = sorted(d for d in dirnames if d not in EXCLUDE_DIRS)
        for fn in sorted(filenames):
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, ROOT).replace(os.sep, '/')
            entries.append([rel, os.path.getsize(full)])
    entries.sort()
    return entries


def main():
    entries = collect()
    lines = []
    for rel, size in entries:
        if rel == SELF:
            lines.append("  { p: '%s', s: 000000 },\n" % rel)
        else:
            lines.append("  { p: '%s', s: %d },\n" % (rel, size))
    body = ''.join(lines)
    out = HEADER + body + '];\n'
    # Second pass: fill in this manifest's own size (fixed-width placeholder,
    # so patching the number does not change the file length). len() is in
    # UTF-8 bytes because the header contains non-ASCII punctuation.
    nbytes = len(out.encode('utf-8'))
    out = out.replace("s: 000000", "s: " + str(nbytes).rjust(6), 1)
    with open(OUT, 'w', encoding='utf-8') as fh:
        fh.write(out)
    print('wrote %s (%d files)' % (os.path.relpath(OUT, ROOT), len(entries)))


if __name__ == '__main__':
    main()
