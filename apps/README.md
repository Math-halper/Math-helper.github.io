# proton apps — one app per folder

Every app is a **single HTML file in its own folder**: `apps/<app-name>/app.html`.
There is no build step. The list of apps — name, location (path), icon,
category, description and window size — lives in **one catalog file**:
[`data/applications.js`](../data/applications.js), one `[application]` block
per app. At boot proton's config loader (`assets/config-loader.js`) parses
that catalog and the HTML loader (`assets/html-loader.js`) fetches each
app's file and runs the `<script data-proton-app>` block inside it. That
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
`openApp(id)`, `MH.toast(...)`, `MH.download(...)`, and all the CSS classes
in `assets/styles.css` (`.btn`, `.card`, `.appbar`, …). Look at
`apps/hello-test/app.html` — the smallest complete example.

## Remove an app

- **Temporarily:** proton menu → Customize (or App Center) → *Remove*.
  This hides it per account and it can be added back any time.
- **Permanently:** delete its `[application]` block from
  `data/applications.js` (and optionally delete the folder).

## The apps

| Folder | App (id) |
| --- | --- |
| `files/` | Files (`files`) |
| `notes/` | Notes (`notes`) |
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
| `hello-test/` | Hello Test (`hello-test`) |
| `speed-test/` | Speed Test (`speed-test`) |
| `storage-test/` | Storage Test (`storage-test`) |

### The streamed arcade games

Nineteen more apps sit in the **Games** category and work differently from
everything above: they are not proton code, and their content is not in this
repository.

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
window every game shares: a toolbar with the source address, Reload, Fullscreen
and Open in new tab; a loading panel with an elapsed counter (these builds are
big); and a footnote saying where the bytes come from. The game's name is read
back from the catalog via the window proton opened, so the module still carries
no metadata.

They stream because the builds total roughly half a gigabyte and must never be
committed here — keep every game folder to just its `app.html` module, and
never add large files under `apps/`. Provenance, the licensing position and
what was deliberately left out are in [`CREDITS.md`](../CREDITS.md).

**To add one:** create `apps/<id>/app.html` calling `PROTON_ARCADE.open()` with
the build's path, then add an `[application]` block with `cat=Games` to
`data/applications.js`. There is nothing to download and no build step.

Shared code lives outside this folder: `data/applications.js` (the app
catalog — name, location, icon and everything else for every app),
`data/websites.js` (the same kind of catalog for the built-in websites),
`assets/config-loader.js` (parses both catalogs), `assets/store.js`
(accounts/storage), `assets/core.js` (desktop, windows, registries),
`assets/icons.js` (the SVG icon set), `assets/styles.css`,
`assets/html-loader.js` (fetches these HTML files at boot) and
`assets/boot.js` (loaded last). Note: because the loader loads files
over HTTP, proton must be served over HTTP(S) — GitHub Pages or
`python3 -m http.server` — not opened as a `file://` page.
