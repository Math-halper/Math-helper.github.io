# proton apps — one app per folder

Every app is a **single file in its own folder**: `apps/<app-name>/app.js`.
There is no build step. `index.html` loads each file with a `<script>` tag;
each file calls `registerApp({...})` (defined in `assets/core.js`) and the
app instantly appears in the proton menu, App Center and Customize.

## Add your own app

1. Copy the `apps/_template/` folder and rename it, e.g. `apps/my-app/`.
2. Edit `apps/my-app/app.js` (name, `icon:` as a name from `assets/icons.js`
   such as `folder`, `globe` or `star`, category, and the `render` function).
3. Add one line to `index.html` with the other app scripts:
   `<script src="apps/my-app/app.js"></script>`

Your app can use: `userData` (the account's saved data), `saveData()`,
`openApp(id)`, `MH.toast(...)`, `MH.download(...)`, and all the CSS classes
in `assets/styles.css` (`.btn`, `.card`, `.appbar`, …). Look at
`apps/hello-test/app.js` — the smallest complete example.

## Remove an app

- **Temporarily:** proton menu → Customize (or App Center) → *Remove*.
  This hides it per account and it can be added back any time.
- **Permanently:** delete its `<script>` line from `index.html`
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
`assets/core.js` (desktop, windows, registries), `assets/styles.css`,
and `assets/boot.js` (loaded last).
