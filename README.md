# proton — a browser desktop (static Mixt clone), System apps plus two embeds

A desktop shell in your browser: Mint-style bottom panel and proton menu,
draggable/resizable windows, per-account customisation — cloned and rebranded
from [Mixt (`proton-arcade/mlp` @ `arena/170861f7-mlp`)](https://github.com/proton-arcade/mlp/tree/arena/170861f7-mlp)
and rebuilt to run as a **pure static website** (no server, no build step, no
dependencies). It ships a **black-and-white theme: black backgrounds, white
text, and white/grey accents** (no colour in the UI).

This build keeps the five core System apps from `main`. Two additional app
entries, Celeste Classic and Mario Collection, frame the live GitHub Pages
sites from the supplied repositories. Their folders contain only sandboxed
iframe wrappers; no game source, assets or repository contents are copied
here. The other bundled apps, local/streamed game bundles and earlier built-in
sites remain removed (except Test Page).

| App (id) | What it does |
| --- | --- |
| **App Center** (`appcenter`) | Manage the built-in apps and anything saved on the account |
| **Customize** (`customize`) | Rename/re-icon/re-categorise apps, themes, wallpapers, desktop parts |
| **Settings** (`settings`) | Account, wallpaper & accent, password, backup, other accounts |
| **About** (`about`) | What this is, credits, licence |
| **Browser** (`browser`) | Visit any address, open HTML files from the virtual file system, and the one built-in site |
| [**Celeste Classic**](https://math-halper.github.io/Celeste/1/index.html) (`celeste-classic`) | Open the Celeste Classic GitHub Pages game in a sandboxed frame |
| [**Mario Collection**](https://math-halper.github.io/Mario/index.html) (`mario-collection`) | Open the Mario collection GitHub Pages site in a sandboxed frame |

One built-in website ships with them: **Test Page** (`proton://test-page`), the
smoke test for a build — it runs automated checks (scripts, shared stylesheet,
timers, canvas, `fetch`, storage, the desktop bridge) and has buttons that talk
back to proton.

Apps and sites are catalog entries, so any of the removed ones can be added
back: one folder under `apps/` (or `websites/`) plus one `[application]`
(or `[website]`) block in `data/applications.js` (or `data/websites.js`) — see
[`apps/README.md`](apps/README.md) and [`websites/README.md`](websites/README.md).

## Run it

It's just static files — serve the folder (apps are HTML files loaded over
HTTP, so a `file://` tab won't work):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Deployed on GitHub Pages it works as-is from the repo root. The website has no
runtime dependencies or build step. Optional regression tests use jsdom:
`npm ci && npm test` (Node 22+).

## Project layout (everything is a module)

- **Apps:** one folder + HTML file each — `apps/<name>/app.html` (7 apps, plus
  two starting points: `apps/_template/` for a normal app and `apps/_embed/`
  for one that is only a framed page — change its single `EMBED_URL` constant).
  Every app's name,
  location, icon, category, description and window size is listed in **one
  catalog file** — `data/applications.js`. Add one by copying
  `apps/_template/` and adding an `[application]` block there; remove one by
  deleting that block. Full guide: [`apps/README.md`](apps/README.md).
- **Built-in websites:** the same catalog system — `data/websites.js`, one
  `[website]` block per site, each page a `websites/<name>/site.html`. One site
  ships: **Test Page** (`websites/test-page/`), plus `websites/_template/` and
  `websites/_embed/` (one framed page, one `EMBED_URL` constant to change) as
  the starting points for a new one. The Browser also visits any address typed
  into its bar and opens HTML files from the virtual file system. Guide:
  [`websites/README.md`](websites/README.md).
- **Core:** `data/applications.js` (the app catalog), `data/websites.js` (the
  website catalog), `data/fs-manifest.js` (generated: every deployed file in
  this repository — the `/` tree of the virtual file system; refresh with
  `python3 tools/gen-fs-manifest.py`), `assets/config-loader.js` (parses both
  catalogs), `assets/store.js` (accounts/storage and the per-account defaults),
  `assets/fs.js` (the virtual file system), `assets/fs-archive.js`
  (dependency-free ZIP export), `assets/icons.js` (monochrome inline SVGs),
  `assets/core.js` (desktop/window manager/registries),
  `assets/desktop-icons.js` (shortcut layout, drag/drop and menus),
  `assets/html-loader.js` (loads the app modules at boot, or a `streamed=true`
  app's module on first launch), `assets/styles.css`, `assets/boot.js`.
- **Tests:** `tests/system-desktop.test.cjs` — the catalogs are exactly the
  five core System apps, two embedded game pages and the one test site; every
  module is present, the generated manifest matches the repository, and a
  jsdom desktop boots and opens each app. The tests also verify the embedded
  URLs, sandbox settings and absence of copied game files; Test Page passes
  its own checks.

## Math Helper cover page

The site opens on a **Math Helper** cover page styled like a school maths
practice site (the `cover` markup in `index.html`, styled in
`assets/styles.css`). Its practice buttons and links are intentionally
unavailable — they only report that practice cannot be loaded. Scroll to the
very bottom and click **Continue to Math Helper** to enter the real proton
website.

## First launch = create your account

1. After continuing from the cover, first launch asks you to create an
   account (display name, username, password 6+ chars).
2. **Refreshing the page signs you out** and skips the cover, going straight to
   the sign-in screen — your username is listed, but you must enter your
   password again, exactly like signing out. `Lock` hides the desktop behind
   your password without signing out during a visit.
3. Add more accounts later from Settings, or from the sign-in screen.

There is no server, so accounts and data live **only in this browser**
(localStorage). Passwords are stored as salted SHA-256 hashes, never plain
text, and never leave the device. Clearing browser data deletes everything —
export a backup from **Settings → Backup** first.

## Desktop shortcuts

Every account starts with **Settings** and **Browser** shortcuts (the old
Files/Documents shortcuts pointed at the removed Files app). Double-click an
icon to open it; click once to select it, then drag to another spot to move it
(dropping on another icon swaps them). Use **Add icon** on the desktop to
search the apps, drag an app from the proton menu, right-click a menu app, or
use **App Center → Desktop icon**. Right-click empty space to arrange the
icons. Keyboard users can press Enter to open and Alt+arrow keys to move an
icon. Tap an icon once and use **Open selected** to launch it without a
double-tap; **Remove selected**, right-click → **Remove shortcut** or Delete
removes the link. A shortcut is only a link — removing it never deletes the
app. The layout is saved with the account, included in Settings backups and
reset by **Customize → Reset customisations**.

Shortcuts to files and folders can no longer be created (they needed the Files
app). One saved by an older account still renders and can be removed; opening
it reports that no app can open it.

## What's inside

- **Desktop** — movable, per-account shortcuts, a Mint-Y panel with pinned &
  running apps, clock, searchable start menu (one **System** section), window
  manager (drag/resize/minimise/maximise), toasts.
- **System** — App Center, Customize, Settings, About, Browser, Celeste Classic and Mario Collection.
- **Customize — everything is modular.** Rename any app, change its icon, move
  it to another (or a brand-new) menu category, reorder it, pin it, remove it
  and add it back, or reset it — per account. Invent your own **themes**
  (accent + wallpaper) and **wallpapers** (two-shade gradients) and apply them
  in one click; they also appear in Settings. Toggle desktop parts (clock,
  desktop date/hint, lock & account buttons, menu search, panel labels)
  instantly, and reset all customisations (including shortcut layout) without
  touching anything else. App Center, Customize and Settings are protected so
  you can't lock yourself out.
- **Everything is the static website — no adding websites.** Apps are built
  into this static site; there is no way to add a website or create an app
  from a web address in the UI. The Browser can still visit an address typed
  into its bar without saving it, and anything already saved on an account
  (custom apps, websites) stays openable and removable in App Center and the
  Browser. Mail, Team Chat, Meetings, G-Talk and Admin Vault were removed
  earlier; all the other bundled apps were removed with them. All saved per
  account.
- **Virtual file system** — `assets/fs.js` still builds the full read-only `/`
  tree of this repository from `data/fs-manifest.js` plus each account's
  writable `/home/<user>/`, and Settings still counts and exports those files
  in a backup. With no Files app or Terminal shipped, the Browser is the only
  consumer: it opens any HTML page in the tree at `file:///path/to/page.html`.
  The API (`FS.read`, `FS.write`, `FS.list`, `FS.appFor`, …) is unchanged, so
  an app added back later can use it.

Account data keeps its full shape (notes, files, events, contacts, sheets,
slides, boards), so a backup exported by an earlier version of proton still
imports; the apps that edited those parts are simply not in this build.

## Credits & licence

Static clone/rebrand of Mixt — full provenance, what was adapted vs rewritten,
and what a static site can't do (real mail/chat/video transport, cloud sync)
is documented in [`CREDITS.md`](CREDITS.md). Licensed **AGPL-3.0-only**
([`LICENSE.txt`](LICENSE.txt)), same as upstream (Mixt / Puter-derived,
© Puter Technologies Inc.). Not affiliated with Linux Mint, Cinnamon, Puter, or
the Mixt authors.

No game build is copied into this repository. Celeste Classic and Mario
Collection load live from their linked GitHub Pages URLs inside sandboxed
frames; each app also has an **Open in new tab** control if a page refuses to
frame.
