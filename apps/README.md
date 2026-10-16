# proton apps — one app per folder

Every app is a **single HTML file in its own folder**: `apps/<app-name>/app.html`.
There is no build step. The list of apps — name, location (path), icon,
category, description and window size — lives in **one catalog file**:
[`data/applications.js`](../data/applications.js), one `[application]` block
per app. At boot proton's config loader (`assets/config-loader.js`) parses
that catalog and the HTML loader (`assets/html-loader.js`) fetches local
app files at boot, or a `streamed=true` game's small module on first launch,
then runs the `<script data-proton-app>` block inside it. That
block calls `registerApp({...})` (defined in `assets/core.js`) with the app's
`render` code; the catalog metadata is merged in automatically and the app
instantly appears in the proton menu, App Center and Customize.

> Note for users: inside proton itself you **cannot** add websites or
> web-address apps — everything is part of this static website. "Add your own
> app" below is the *developer* workflow for changing the site's code.

## Add your own app (developer workflow)

1. Copy the `apps/_template/` folder and rename it, e.g. `apps/my-app/`.
2. Add ONE `[application]` block to `data/applications.js` (copy the template
   in that file's header): `id`, `name`, `path=apps/my-app/app.html`, `icon`
   (a name from `assets/icons.js` such as `folder`, `globe` or `star`),
   `cat`, `desc`, `w`, `h`. Block order = menu order.
3. Edit `apps/my-app/app.html` and write the `render` function (the app's
   code). Reload proton.

Your app can use: `userData` (the account's saved data), `saveData()`,
`openApp(id)`, `MH.toast(...)`, `MH.download(...)`, `FS` (the virtual file
system — `FS.read`, `FS.write`, `FS.list`, …) and all the CSS classes in
`assets/styles.css` (`.btn`, `.card`, `.appbar`, …). Look at
`apps/_template/app.html` — the starting point.

## Remove an app

- **Temporarily:** proton menu → Customize (or App Center) → *Remove*.
  This hides it per account and it can be added back any time.
- **Permanently:** delete its `[application]` block from
  `data/applications.js` (and optionally delete the folder).

## The apps

| Folder | App (id) |
| --- | --- |
| `files/` | Files (`files`) — browse, drag/drop, right-click, multi-select, copy/cut/paste, import/export and open in associated apps |
| `text-editor/` | Text Editor (`text-editor`) — VFS text files, Save/Ctrl+S |
| `image-viewer/` | Image Viewer (`image-viewer`) — VFS images |
| `notes/` | Notes (`notes`) — separate rich-text notebook |
| `calendar/` | Calendar (`calendar`) |
| `contacts/` | Contacts (`contacts`) |
| `app-center/` | App Center (`appcenter`) |
| `customize/` | Customize (`customize`) |
| `settings/` | Settings (`settings`) |
| `about/` | About (`about`) |
| `calculator/` | Calculator (`calculator`) |
| `spreadsheet/` | Spreadsheet (`spreadsheet`) |
| `presentation/` | Presentation (`presentation`) |
| `whiteboard/` | Whiteboard (`whiteboard`) |
| `logic-sim/` | Logic Sim (`logic-sim`) — windowed host of `websites/logic-sim/` |
| `terminal/` | Terminal (`terminal`) |
| `browser/` | Browser (`browser`) |
| `media/` | Media (`media`) |
| `pdf-viewer/` | PDF Viewer (`pdf`) |
| `sudoku/` | Sudoku (`sudoku`) |
| `chess/` | Chess (`chess`) |
| `checkers/` | Checkers (`checkers`) |
| `klondike/` | Klondike (`klondike`) |
| `backgammon/` | Backgammon (`backgammon`) |

### Desktop shortcut workflow

`assets/desktop-icons.js` renders per-account `userData.desktopIcons` entries
(`{id, kind:'app'|'path', target, col, row}`). A new account starts with Files,
Browser and Documents; an empty array means the user intentionally cleared
all shortcuts. Icons are *links*, not VFS files: removing an icon leaves its
app/file intact. Double-click/Enter opens the target (`openApp` or
`openFSItem`); pointer dragging or Alt+arrow keys moves it on a snap grid,
with occupied spots swapped. The layout reflows on narrow screens without
changing the saved positions. Renames/moves in `FS.watch()` update linked
paths; deleted targets appear as removable missing shortcuts.

Use the desktop **Add icon** search, right-click the wallpaper or app in the
proton menu, drag a menu app onto the wallpaper, or use App Center's **Desktop
icon** button. Select a shortcut for the touch-friendly **Open selected** or
**Remove selected** buttons, right-click it for **Remove shortcut**, or press
Delete. Files' item context/More menu
adds file/folder links, and dragging items from Files onto the wallpaper
creates links rather than moving originals. The transferable drag data never
contains account paths. Shortcut edits save immediately with the account and
are included in Settings backups; Customize's Reset restores default icons.

### Files workflow

Files uses the same `FS` tree as the Terminal and Text Editor. Click to
select, Ctrl/⌘-click to toggle items, Shift-click for a range, or Ctrl/⌘+A
for all visible items. Double-click/Enter opens the associated app. Right-click
an item, blank area, tree folder or breadcrumb for actions; the **···** toolbar
button provides the same menu on touch devices. Common shortcuts: Ctrl/⌘+C,
X and V (Files' internal clipboard), F2 to rename, Delete to permanently
remove (after confirmation), Ctrl/⌘+D to duplicate, Ctrl/⌘+Shift+N for a
folder, Ctrl/⌘+F to filter, and Alt+Left/Right/Up to navigate.

Drag selected files/folders onto a folder tile, tree row, breadcrumb or blank
area to **move**; hold Ctrl/⌘/Option to **copy**. Dragging from the read-only
system layer always copies, and targets outside `/home/<user>/` are refused.
Colliding copy/move names get a `(copy)` suffix, never a silent overwrite.
Import several computer files at once, use **Import folder**, or drop files or
folders from the computer (directory drops require browser support); imported
file conflicts require explicit confirmation. Pasting a computer file also
imports it when the Files clipboard is empty. Bytes are preserved, with a
2 MB per-file storage limit. Download folders or a selection as an uncompressed
ZIP (100 MB / 2,000-item safety cap); single files download unchanged. Files
refreshes when another app modifies the VFS. The internal clipboard and
selection last only while Files is open. This does not grant access to the
computer's filesystem: user files live in per-account browser localStorage.

### The streamed arcade games

Nineteen Proton Arcade apps sit in the **Games** category and work
differently from local games: they are not proton code, and their content is
not in this repository.

| Folder | App (id) |
| --- | --- |
| `ampler-launcher/` | Ampler Launcher (`ampler-launcher`) |
| `fnaf-1/` … `fnaf-4/` | Five Nights at Freddy's 1-4 (`fnaf-1` … `fnaf-4`) |
| `fnaf-sister-location/` | Five Nights at Freddy's: Sister Location (`fnaf-sister-location`) |
| `granny/` | Granny (`granny`) |
| `baldis-basics/` | Baldi's Basics (`baldis-basics`) — placeholder upstream |
| `backrooms/` | Backrooms (`backrooms`) |
| `bloxorz/` | Bloxorz (`bloxorz`) |
| `drift-boss/` | Drift Boss (`drift-boss`) |
| `flappy-bird/` | Flappy Bird (`flappy-bird`) |
| `football-bros/` | Football Bros (`football-bros`) |
| `geometry-dash-lite/` | Geometry Dash Lite (`geometry-dash-lite`) |
| `kart-bros/` | Kart Bros (`kart-bros`) |
| `minesweeper/` | Minesweeper (`minesweeper`) |
| `pac-man/` | Pac-Man (`pac-man`) |
| `retro-bowl/` | Retro Bowl (`retro-bowl`) |
| `spacebar-clicker/` | Spacebar Clicker (`spacebar-clicker`) |

Each of those folders holds **only** its `app.html`, which does one thing:

```js
registerApp({
  render(body, ctx) {
    PROTON_ARCADE.open(body, ctx, {
      src: 'website/games/Granny/index.html',   // path on proton-arcade.github.io
      size: '56 MB',                            // shown while it downloads
    });
  },
});
```

`PROTON_ARCADE` is the shared host in
[`assets/game-host.js`](../assets/game-host.js), loaded by `index.html`. It
frames that build **live from <https://proton-arcade.github.io>** and builds the
window every streamed game shares: a toolbar with the source address,
Reload, Fullscreen and Open in new tab; a loading panel with an elapsed
counter; and a footnote saying where the bytes come from. The game's name is
read back from the catalog via the window proton opened, so the module still
carries no metadata.

Those builds total roughly half a gigabyte and must never be committed here.

### Gams Offline games

**68 more game modules** live in `apps/gams-*/app.html`, each cataloged in
`data/applications.js`. They link to the games in
[Gams-Offline/Gams](https://github.com/Gams-Offline/Gams/tree/main/g) at
`https://gams-offline.github.io/Gams/`. The source catalog has 71 games;
Bloxorz, Pac-Man and Spacebar Clicker already had apps here, so they were
not duplicated. The upstream Tools and About pages are not games. Example:

```js
PROTON_ARCADE.open(body, ctx, {
  origin: 'https://gams-offline.github.io/Gams',
  src: 'g/g/drivemad/drivemad.html',
});
```

Both publishers' games are **network-only**. Keep their modules small and do
not copy any builds into `apps/`; several games require entire asset trees,
and the source repositories do not grant a blanket redistribution licence.
Each game's `icon=game-<id>` selects a unique hand-drawn monochrome SVG in
`assets/game-icons.js`, matching the desktop's 24px vector style. Provenance
and limitations: [`CREDITS.md`](../CREDITS.md#streamed-arcade-games).

**To add a streamed game:** create `apps/<id>/app.html` calling
`PROTON_ARCADE.open()` with its source path (and `origin` if not Proton Arcade),
add an `[application]` block with `cat=Games` and `streamed=true`, and add its SVG icon to
`assets/game-icons.js`. There is no game download or build step.

Shared code lives outside this folder: `data/applications.js` (the app
catalog — name, location, icon and everything else for every app),
`data/websites.js` (the same kind of catalog for the built-in websites),
`data/fs-manifest.js` (generated list of every file in this repository —
the `/` tree of the virtual file system; refresh it with
`python3 tools/gen-fs-manifest.py`), `assets/fs.js` (the file system API
the Files app and Terminal share), `assets/fs-archive.js` (ZIP downloads),
`assets/config-loader.js` (parses both
catalogs), `assets/store.js` (accounts/storage), `assets/core.js`
(desktop, windows, registries), `assets/desktop-icons.js` (shortcuts), `assets/icons.js` + `assets/game-icons.js`
(the SVG icon set), `assets/styles.css`, `assets/html-loader.js` (loads local HTML modules at
boot and streamed-game modules when launched) and `assets/boot.js` (loaded
last). Note: because the loader fetches files over HTTP, proton must be
served over HTTP(S) — GitHub Pages or `python3 -m http.server` — not opened
as a `file://` page.
