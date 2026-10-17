# Credits & provenance

**proton** (this repository) is a static, browser-only clone and
rebrand of **Mixt**, from:

- Upstream: https://github.com/proton-arcade/mlp/tree/arena/170861f7-mlp
- Commit cloned: `c37c6cae251cf482749b19280dbafc70ccd1a6e0` (“Remove email confirmation”)

## Why it isn't a file-for-file copy

The upstream is a ~1.2 GB full-stack project: a Node.js server (`node
server.cjs`), SQLite, an HTTPS front on port 8835, a webpack-built GUI and
the Mixt.js SDK. None of that can run on GitHub Pages, which only serves
static files. So the desktop, window manager and apps were **rebuilt with
vanilla HTML/CSS/JS and zero dependencies**, keeping the upstream behaviour
and look wherever a browser-only equivalent exists:

| Upstream (Mixt) | Here (proton) |
| --- | --- |
| Mint-Y theme `src/gui/src/css/mixt.css` (accent `#68b723`, light gradient title bars, dark bottom panel) | Panel layout/chrome reimplemented in `assets/styles.css`, with the palette changed to black-and-white for proton |
| Server accounts, `admin` first sign-in, whitelist | First-launch account creation stored **only in this browser** (localStorage), salted password hash, sign-in on every refresh, lock screen |
| IndexedDB app storage (`src/apps/shared/localdb.js`) | Per-account localStorage state, export/import backup in Settings |
| `src/apps/notes`, `calendar`, `spreadsheet`, `whiteboard`, `presentation`, `terminal`, `pdf-editor`, `media`, `mail`, `contacts` | Were browser-only rewrites with the same core behaviour — **removed**; see below |
| `src/apps/sudoku/logic.js`, `checkers`, `chess`, `klondike`, `backgammon` | Sudoku generator/checker was adapted from the original pure-logic file, the other games reimplemented to the same rules — **removed** |
| `src/apps/team-chat`, `g-talk`, `meetings` | On-device channels/direct chat with a local helper bot; meeting planner — removed earlier (real calls need a server) |
| `src/apps/admin-vault`, dashboard Admin tab | Vault app that re-checked your account password (removed earlier); account/device stats survive in **Settings** |
| `src/app-center`, Files/dashboard | **App Center** (hide/restore built-ins; previously saved user apps and sites remain openable/removable per account, the add-from-URL flow is disabled). The virtual Files drive is gone — the file system (`assets/fs.js`) stays, but no app ships to browse it |
| — (modular layer) | **Customize** app: every built-in module's name/icon/category/order is editable and resettable, custom themes & wallpapers can be added/edited/removed/applied, and desktop parts (clock, hint, tray buttons, menu search, panel labels) toggle live — all per-account state with migration |
| `internet/*` sites | Built-in websites as separate modules loaded into the Browser's SITES registry — **removed** except Test Page, the one entry left in `data/websites.js` |
| `internet/world-history`, `internet/mixt-guide` | Built-in Browser pages — **removed** with the other websites |
| — (new in this rebrand) | Calculator (solver, graph plotter, formula cards) was new in this rebrand — **removed** |

Things that fundamentally need a server were replaced with honest on-device
equivalents and are labelled as such in-app: real e-mail/chat/video transport,
multi-user whitelisting, cloud storage, and the Mixt.js SDK.

## Licence

proton, like Mixt and the Puter-derived code it is based on, is
licensed under the **GNU Affero General Public License v3.0 only** — see
`LICENSE.txt`. Mixt contains code derived from Puter, copyright Puter
Technologies Inc., also AGPL-3.0. Original copyright notices in upstream
source files remain theirs.

Not affiliated with Linux Mint, Cinnamon, Puter Technologies, or the Mixt
authors.

## What this build ships

Everything above describes how proton was built. This build has since been
**cut back to its System apps**: App Center, Customize, Settings, About and
the Browser. Removed with the rest:

- **19 bundled apps** — Files, Text Editor, Image Viewer, Notes, Calendar,
  Contacts, Calculator, Spreadsheet, Presentation, Whiteboard, Logic Sim,
  Terminal, Media, PDF Viewer and the five local games (Chess, Checkers,
  Sudoku, Klondike, Backgammon).
- **92 streamed arcade games** — the 19 Proton Arcade titles, the 68 Gams
  Offline titles and the five local games above, all catalogued in
  `data/applications.js`. Removed with them: `assets/game-host.js` (the shared
  frame host), `assets/game-icons.js` (their hand-drawn monochrome SVG glyphs),
  the `.arcade-*` styles, and the two Gams builds that had been copied into
  this repository under `games/gams/g/g/` (*A Dance of Fire and Ice*,
  *Grey Box Testing*) — no third-party game byte is stored, streamed or
  referenced here any more.
- **5 of the 6 built-in websites** — Guide, World History, Maths Resources,
  proton Daily and the Digital Logic Sim web edition (an independent
  re-implementation inspired by Sebastian Lague's MIT-licensed Digital Logic
  Sim, which also carried upstream's JetBrains Mono NL fonts under SIL OFL
  1.1). **Test Page** was kept and rewritten as this build's smoke test, so
  `websites/` still exists with that one site (plus `_template/`) and
  `data/websites.js` still holds one `[website]` block; the Browser also copes
  with an empty catalog if it is removed.
- **The styles, icons and tests that only those apps used** —
  `assets/styles.css` now carries the shell's chrome plus the classes the five
  remaining apps use, and `tests/` is a single suite for the trimmed build.

Nothing in the desktop shell was removed: accounts, the window manager, the
panel and start menu, per-account desktop shortcuts, the customisation layer,
the virtual file system (`assets/fs.js`, `data/fs-manifest.js`,
`assets/fs-archive.js`) and the Browser's ability to open an HTML page from it
all still work, and the account data model in `assets/store.js` still carries
the removed apps' data (notes, files, events, contacts, sheets, slides,
boards), so an older backup still imports and any of these apps can be added
back with a folder under `apps/` and one catalog block.

The provenance table above and the sections that used to follow it (Digital
Logic Sim, the streamed Proton Arcade and Gams Offline catalogs) described
code that is no longer in this repository; the upstream projects' own licences
and copyrights are unaffected by its removal, and this repository now grants
no rights in — and makes no reference to — any third-party game build.
