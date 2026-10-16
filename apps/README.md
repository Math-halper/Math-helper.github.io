# proton apps — one app per folder

Every app is a **single HTML file in its own folder**: `apps/<app-name>/app.html`.
There is no build step. The list of apps — name, location (path), icon,
category, description and window size — lives in **one catalog file**:
[`data/applications.js`](../data/applications.js), one `[application]` block
per app. At boot proton's config loader (`assets/config-loader.js`) parses
that catalog and the HTML loader (`assets/html-loader.js`) fetches each local
app file (or a `streamed=true` app's small module on first launch), then runs
the `<script data-proton-app>` block inside it. That block calls
`registerApp({...})` (defined in `assets/core.js`) with the app's `render`
code; the catalog metadata is merged in automatically and the app instantly
appears in the proton menu, App Center and Customize.

> Note for users: inside proton itself you **cannot** add websites or
> web-address apps — everything is part of this static website. "Add your own
> app" below is the *developer* workflow for changing the site's code.

This build ships **its System apps only**. The 19 other bundled apps (Files,
Text Editor, Notes, Calendar, Contacts, Calculator, Spreadsheet, Presentation,
Whiteboard, Logic Sim, Terminal, Media, PDF Viewer, Image Viewer and the five
board games) and all 92 streamed arcade games were removed, along with
`assets/game-host.js`, `assets/game-icons.js`, the copied game builds under
`games/` and every built-in website under `websites/`. `data/websites.js` is
still parsed, but it is empty.

## Add your own app (developer workflow)

1. Copy the `apps/_template/` folder and rename it, e.g. `apps/my-app/`.
2. Add ONE `[application]` block to `data/applications.js` (copy the template
   in that file's header): `id`, `name`, `path=apps/my-app/app.html`, `icon`
   (a name from `assets/icons.js` such as `folder`, `globe` or `star`),
   `cat`, `desc`, `w`, `h`. Block order = menu order. A new `cat=` name adds a
   new section to the proton menu (the built-in order is `CATS` in
   `assets/core.js`: `System`, `My Apps`, then anything else you invent).
3. Edit `apps/my-app/app.html` and write the `render` function (the app's
   code). Reload proton.
4. Re-run `python3 tools/gen-fs-manifest.py` so the new file appears in the
   virtual file system, then `npm test`.

Your app can use: `userData` (the account's saved data), `saveData()`,
`openApp(id)`, `MH.toast(...)`, `MH.download(...)`, `FS` (the virtual file
system — `FS.read`, `FS.write`, `FS.list`, `FS.appFor`, …) and the CSS classes
in `assets/styles.css` (`.btn`, `.card`, `.appbar`, `.stat-grid`, …). Look at
`apps/_template/app.html` — the starting point. The account data model in
`assets/store.js` still carries `notes`, `files`, `dirs`, `events`, `contacts`,
`sheets`, `slides`, `boards` and `games`, so an app added back can pick up
exactly where the old one left off.

## Remove an app

- **Temporarily:** proton menu → Customize (or App Center) → *Remove*.
  This hides it per account and it can be added back any time. App Center,
  Customize and Settings are protected so the desktop stays manageable.
- **Permanently:** delete its `[application]` block from
  `data/applications.js` (and optionally delete the folder), refresh
  `data/fs-manifest.js`, and drop anything in `assets/` that only it used.

## The apps

| Folder | App (id) |
| --- | --- |
| `app-center/` | App Center (`appcenter`) — hide/restore built-ins, manage the account's saved apps & websites |
| `customize/` | Customize (`customize`) — app modules, themes, wallpapers, desktop parts, reset |
| `settings/` | Settings (`settings`) — account, wallpaper & accent, password, backup, accounts on this device |
| `about/` | About (`about`) — provenance, licence, what's inside |
| `browser/` | Browser (`browser`) — built-in websites (none right now), saved websites, external addresses and VFS HTML files |
| `_template/` | not an app — the starting point for a new one |

### Desktop shortcut workflow

`assets/desktop-icons.js` renders per-account `userData.desktopIcons` entries
(`{id, kind:'app'|'path', target, col, row}`). A new account starts with
Settings and Browser; an empty array means the user intentionally cleared all
shortcuts. Icons are *links*, not VFS files: removing an icon leaves the app
intact. Double-click/Enter opens the target; pointer dragging or Alt+arrow keys
moves it on a snap grid, with occupied spots swapped. The layout reflows on
narrow screens without changing the saved positions.

Use the desktop **Add icon** search, right-click the wallpaper or an app in the
proton menu, drag a menu app onto the wallpaper, or use App Center's **Desktop
icon** button. Select a shortcut for the touch-friendly **Open selected** or
**Remove selected** buttons, right-click it for **Remove shortcut**, or press
Delete. Shortcut edits save immediately with the account and are included in
Settings backups; Customize's Reset restores the defaults.

`kind:'path'` entries (files and folders) can no longer be created: they were
added from the Files app, by dragging out of Files, or by typing a path in the
desktop menu, and opening one needed a viewer app. One saved by an older
account still renders (missing targets are marked), can be moved and removed,
and reports that nothing can open it — `openFSItem()` in `assets/core.js`
honours any viewer an app added back registers through `FS.appFor()`.

### Shared code

Shared code lives outside this folder: `data/applications.js` (the app
catalog — name, location, icon and everything else for every app),
`data/websites.js` (the same kind of catalog for built-in websites; empty),
`data/fs-manifest.js` (generated list of every deployed file in this
repository — the `/` tree of the virtual file system; refresh it with
`python3 tools/gen-fs-manifest.py`), `assets/fs.js` (the file system API),
`assets/fs-archive.js` (ZIP downloads), `assets/config-loader.js` (parses both
catalogs), `assets/store.js` (accounts/storage and the per-account defaults),
`assets/core.js` (desktop, windows, registries), `assets/desktop-icons.js`
(shortcuts), `assets/icons.js` (the SVG icon set), `assets/styles.css`,
`assets/html-loader.js` (loads the HTML modules) and `assets/boot.js` (loaded
last). Note: because the loader fetches files over HTTP, proton must be served
over HTTP(S) — GitHub Pages or `python3 -m http.server` — not opened as a
`file://` page.
