# proton — a browser desktop (static Mixt clone)

A complete desktop in your browser: Mint-style bottom panel and proton menu,
draggable/resizable windows, file-aware desktop apps and 92 game entries — cloned and rebranded from
[Mixt (`proton-arcade/mlp` @ `arena/170861f7-mlp`)](https://github.com/proton-arcade/mlp/tree/arena/170861f7-mlp)
and rebuilt to run as a **pure static website** (no server, no build step,
no dependencies). It ships a **black-and-white theme: black backgrounds, white text, and
white/grey accents** (no colour in the UI; only physical game pieces
such as cards and checkers keep their colours). Logic Sim is an exception: it
uses the original simulator’s gray workspace, colored chips and red signals.

## Run it

It's just static files — serve the folder (apps and websites are HTML
files loaded over HTTP, so a `file://` tab won't work):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Deployed on GitHub Pages it works as-is from the repo root. The website has
no runtime dependencies or build step. Optional regression tests use jsdom:
`npm ci && npm test` (Node 22+).

## Project layout (everything is a module)

- **Apps:** one folder + HTML file each — `apps/<name>/app.html` (114 apps:
  27 local desktop/test apps and 87 streamed games). Every app's
  name, location, icon, category, description and window size is listed in
  **one catalog file** — `data/applications.js`.
  Add one by copying `apps/_template/` and adding an `[application]` block
  there; remove one by deleting that block. Full guide:
  [`apps/README.md`](apps/README.md).
- **Built-in websites:** one folder + HTML page each —
  `websites/<name>/site.html` (6 sites, incl. test sites), loaded by the
  Browser at `proton://<name>`. Websites use the **same catalog system as
  the apps**: every site's name, location, icon and description is listed
  in `data/websites.js`, one `[website]` block per site. Guide:
  [`websites/README.md`](websites/README.md).
- **Core only:** `data/applications.js` (the app catalog — add/remove apps
  here), `data/websites.js` (the website catalog — add/remove built-in
  sites here), `data/fs-manifest.js` (generated: every file in this
  repository — the `/` tree of the virtual file system; refresh with
  `python3 tools/gen-fs-manifest.py`), `assets/config-loader.js` (parses
  both catalogs), `assets/store.js` (accounts/storage), `assets/fs.js`
  (the virtual file system shared by the Files app and the Terminal),
  `assets/fs-archive.js` (dependency-free ZIP export for folders/selections),
  `assets/icons.js`
  and `assets/game-icons.js` (monochrome inline SVGs — each game has its own
  glyph; no emoji or raster thumbnails), `assets/core.js` (desktop/window manager/registries),
  `assets/desktop-icons.js` (shortcut layout, drag/drop and menus), `assets/html-loader.js` (loads local app modules at boot and streamed games
  on demand; sites load when visited),
  `assets/game-host.js` (the window shared by the streamed arcade games),
  `assets/styles.css`, `assets/boot.js`. Streamed games register from their
  catalog entries at boot; their tiny modules load only when launched.

## Math Helper cover page

The site opens on a **Math Helper** cover page styled like a school maths
practice site (the `cover` markup in `index.html`, styled in
`assets/styles.css`). Its practice buttons and links are intentionally
unavailable — they only report that practice cannot be loaded. Scroll to
the very bottom and click **Continue to Math Helper** to enter the real
proton website.

## First launch = create your account

1. After continuing from the cover, first launch asks you to create an
   account (display name, username, password 6+ chars).
2. **Refreshing the page signs you out** and skips the cover, going
   straight to the sign-in screen — your username is listed, but you must
   enter your password again, exactly like signing out. `Lock` hides the
   desktop behind your password without signing out during a visit.
3. Add more accounts later from Settings, or from the sign-in screen.

There is no server, so accounts and data live **only in this browser**
(localStorage). Passwords are stored as salted SHA-256 hashes, never plain
text, and never leave the device. Clearing browser data deletes everything —
export a backup from **Settings → Backup** first.

## Desktop shortcuts

Every account starts with **Files**, **Browser** and **Documents** shortcuts.
Double-click one to open its app or file/folder; click once to select it,
then drag to another spot to move it (dropping on another icon swaps them).
Use **Add icon** on the desktop to search all apps and games, drag an app from
the proton menu, right-click a menu app or use **App Center → Desktop icon**.
For a file or folder, choose **Add shortcut to desktop** from its Files
right-click / More menu, drag it from Files onto the wallpaper, or right-click
empty desktop space and enter its path. All these controls work per account.

Tap an icon once and use **Open selected** to launch it without a double-tap.
To delete its link, use **Remove selected**, right-click and choose **Remove
shortcut**, or press Delete. A shortcut is just a link: removing it
never deletes the app or original file; dragging a file from Files onto the
desktop does not move that file. Renaming/moving a linked file or folder in
Files updates its shortcut; a deleted file leaves a removable "missing" icon.
Right-click empty space to arrange the icons. Keyboard users can press Enter
to open and Alt+arrow keys to move an icon. The layout is saved with the
account, included in Settings backups and reset by **Customize → Reset
customisations**. The actual `~/Desktop` folder remains an ordinary folder
in Files; icons are shortcuts, not a mirror of that folder.

## What's inside

- **Desktop** — movable, per-account shortcuts to apps, files and folders,
  a Mint-Y panel with pinned & running apps, clock, searchable start menu,
  window manager (drag/resize/minimise/maximise), toasts
- **Calculator** *(new for this rebrand)* — calculator, linear &
  quadratic solver with steps, percentage/Pythagoras, formula cards,
  function graph plotter
- **Productivity** — Files (browse the read-only `/` system tree and manage
  your own `/home/<user>/`), Text Editor (opens/saves actual text files; system
  files are read-only), Notes (separate rich-text notebook), Calendar,
  Spreadsheet (formulas incl. `SUM`/`AVERAGE` ranges), Presentation with
  present mode, Contacts, PDF Viewer, Terminal (a real shell over the same
  file system — `ls`, `cd`, `cat`, `tree`, `grep`, `>` redirects, tab completion).
  **Double-click** a folder to enter it, or a file to open it in Text Editor,
  Browser (HTML), Image Viewer, PDF Viewer or Media. Files also supports
  right-click menus (including empty space and folders in the tree), Ctrl/Shift
  multi-selection, Copy/Cut/Paste, Duplicate, Move/Copy to, Rename, Properties,
  **Add shortcut to desktop**, back/forward, filter/sort and keyboard shortcuts. Drag items onto folders
  to move them; hold Ctrl/Option to copy. Drop files or folders from your
  computer to import them, or paste computer files. Binary bytes are preserved,
  and folders/multiple selections download as a ZIP. Nothing is uploaded.
  This is a browser-local virtual filesystem, **not** access to arbitrary OS
  folders: only `/home/<user>/` is writable, deletion is permanent (with a
  confirmation), and localStorage limits imports to 2 MB per file. For larger
  media/PDFs, use their apps' **Open from computer** buttons.
- **Create** — Whiteboard (pen/shapes/text, PNG export), Logic Sim (digital
  logic circuit designer/simulator — a web edition of Sebastian Lague's
  Digital Logic Sim; also a built-in website at `proton://logic-sim`, both
  sharing `websites/logic-sim/`)
- **Games** — proton's own: Chess (vs computer or 2-player), Checkers, Sudoku
  (easy/medium/hard, hints), Klondike solitaire, Backgammon practice board.
  Plus **19 streamed Proton Arcade titles**: Ampler Launcher (browser
  Minecraft), five FNAF games, Granny, Baldi's Basics (upstream placeholder,
  not a playable build yet), Backrooms, Geometry
  Dash Lite, Bloxorz, Kart Bros, Football Bros, Retro Bowl, Drift Boss,
  Pac-Man, **Flappy Bird (now with a bird SVG icon)**, Minesweeper and
  Spacebar Clicker. **68 more games** come from
  [Gams Offline's game catalog](https://github.com/Gams-Offline/Gams/tree/main/g)
  (its 71 games minus Bloxorz, Pac-Man and Spacebar Clicker, already here),
  including 2048, Drive Mad, Wordle, Slope, Duck Life and Flash titles.
  Their builds are **not in this repository**: each frames its publisher's
  GitHub Pages site live, with Reload, Fullscreen and Open in new tab. A
  network connection is required. See [`CREDITS.md`](CREDITS.md#streamed-arcade-games)
  for provenance and licensing limitations.
- **Media** — Media player (audio/video from your computer or small VFS files)
  and Image Viewer
- **Everything is the static website — no adding websites.** Apps are built
  into this static site; the 87 streamed games above load their builds from
  their publishers' origins and store no game bytes here. There is no way to
  add a website or create an app from a web address in the UI. The Browser can still visit an address
  typed into its bar without saving it, and anything already saved on an
  account (custom apps, websites) stays openable and removable in App Center
  and the Browser. Built-in apps can be **removed** from the
  menu and **added back** any time (Settings & App Center are protected so
  you can't lock yourself out). Mail, Team Chat, Meetings, G-Talk and Admin
  Vault were removed. All saved per account.
- **Customize — everything is modular.** Rename any app, change its icon,
  move it to another (or a brand-new) menu category, reorder it, pin it, remove
  it and add it back, or reset it — per account. Invent your own **themes**
  (accent + wallpaper) and **wallpapers** (two-shade gradients) and apply them
  in one click; they also appear in Settings. Toggle desktop parts (clock,
  desktop date/hint, lock & account buttons, menu search, panel labels)
  instantly, and reset all customisations (including shortcut layout) without
  touching your files or other content.
- **System** — App Center, Customize, Settings
  (wallpaper/accent, change password, export/import/delete account), About,
  built-in Browser with Guide & World History pages

Everything autosaves per account: notes, files, events, contacts, slides,
whiteboards and local-game progress (Text Editor uses an explicit **Save**
button/Ctrl+S). Streamed games are the exception: their progress belongs to
**their own origin** (`proton-arcade.github.io` or `gams-offline.github.io`),
not to a proton account, and never reaches proton.

## Credits & licence

Static clone/rebrand of Mixt — full provenance, what was adapted vs
rewritten, and what a static site can't do (real mail/chat/video transport,
cloud sync) is documented in [`CREDITS.md`](CREDITS.md). Licensed
**AGPL-3.0-only** ([`LICENSE.txt`](LICENSE.txt)), same as upstream
(Mixt / Puter-derived, © Puter Technologies Inc.). Not affiliated with
Linux Mint, Cinnamon, Puter, or the Mixt authors.

That licence covers **proton's own code** — the desktop, apps, hand-drawn
SVG icons and game host/catalog. It does **not** cover the streamed games:
no game build is stored or redistributed here, and this repository grants no
rights in them. Many are commercial works; the referenced repositories do
not grant a blanket licence for the builds. Read
[CREDITS.md](CREDITS.md#streamed-arcade-games) before redistributing or
mirroring this site. Not affiliated with Proton Arcade, Gams Offline or any
game's author.
