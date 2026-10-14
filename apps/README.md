# proton apps — one app per folder

Every app is a **single HTML file in its own folder**: `apps/<app-name>/app.html`.
There is no build step. `index.html` lists each file with a
`<link rel="proton-app">` tag, and at boot proton's HTML loader
(`assets/html-loader.js`) fetches each one and runs the
`<script data-proton-app>` block inside it. That block calls
`registerApp({...})` (defined in `assets/core.js`) and the app instantly
appears in the proton menu, App Center and Customize.

## Add your own app

1. Copy the `apps/_template/` folder and rename it, e.g. `apps/my-app/`.
2. Edit `apps/my-app/app.html` (name, `icon:` as a name from `assets/icons.js`
   such as `folder`, `globe` or `star`, category, and the `render` function).
3. Add one line to `index.html` with the other app links:
   `<link rel="proton-app" href="apps/my-app/app.html">`

Your app can use: `userData` (the account's saved data), `saveData()`,
`openApp(id)`, `MH.toast(...)`, `MH.download(...)`, and all the CSS classes
in `assets/styles.css` (`.btn`, `.card`, `.appbar`, …). Look at
`apps/hello-test/app.html` — the smallest complete example.

## Remove an app

- **Temporarily:** proton menu → Customize (or App Center) → *Remove*.
  This hides it per account and it can be added back any time.
- **Permanently:** delete its `<link rel="proton-app">` line from `index.html`
  (and optionally delete the folder).

## The apps

| Folder | App (id) |
| --- | --- |
| `files/` | Files (`files`) |
| `notes/` | Notes (`notes`) |
| `calendar/` | Calendar (`calendar`) |
| `contacts/` | Contacts (`contacts`) |
| `mail/` | Mail (`mail`) |
| `admin-vault/` | Admin Vault (`vault`) |
| `websites/` | Websites manager (`websites`) |
| `app-center/` | App Center (`appcenter`) |
| `customize/` | Customize (`customize`) |
| `settings/` | Settings (`settings`) |
| `about/` | About (`about`) |
| `calculator/` | Calculator (`math`) |
| `spreadsheet/` | Spreadsheet (`spreadsheet`) |
| `presentation/` | Presentation (`presentation`) |
| `whiteboard/` | Whiteboard (`whiteboard`) |
| `terminal/` | Terminal (`terminal`) |
| `browser/` | Browser (`browser`) |
| `media/` | Media (`media`) |
| `pdf-viewer/` | PDF Viewer (`pdf`) |
| `team-chat/` | Team Chat (`chat`) |
| `meetings/` | Meetings (`meetings`) |
| `sudoku/` | Sudoku (`sudoku`) |
| `chess/` | Chess (`chess`) |
| `checkers/` | Checkers (`checkers`) |
| `klondike/` | Klondike (`klondike`) |
| `backgammon/` | Backgammon (`backgammon`) |
| `g-talk/` | G-Talk (`gtalk`) |
| `hello-test/` | Hello Test (`hello-test`) |
| `speed-test/` | Speed Test (`speed-test`) |
| `storage-test/` | Storage Test (`storage-test`) |

Shared code lives outside this folder: `assets/store.js` (accounts/storage),
`assets/core.js` (desktop, windows, registries), `assets/icons.js` (the SVG
icon set), `assets/styles.css`, `assets/html-loader.js` (fetches these HTML
files at boot) and `assets/boot.js` (loaded last). Note: because the loader loads files
over HTTP, proton must be served over HTTP(S) — GitHub Pages or
`python3 -m http.server` — not opened as a `file://` page.
