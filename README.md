# proton — a browser desktop (static Mixt clone)

A complete desktop in your browser: Mint-style bottom panel and proton menu,
draggable/resizable windows, and 20+ apps — cloned and rebranded from
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

Deployed on GitHub Pages it works as-is from the repo root.

## Project layout (everything is a module)

- **Apps:** one folder + HTML file each — `apps/<name>/app.html` (44 apps:
  proton's own, 19 streamed arcade games, and the test apps). Every app's
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
  `assets/icons.js`
  (the SVG icon set - every app/site/button icon is a named vector icon,
  no emoji icons), `assets/core.js` (desktop/window manager/registries),
  `assets/html-loader.js` (fetches the app/site HTML files at boot),
  `assets/game-host.js` (the window shared by the streamed arcade games),
  `assets/styles.css`, `assets/boot.js`.

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

## What's inside

- **Desktop** — clean wallpaper (no shortcut icons), Mint-Y panel with pinned
  & running apps, clock, start menu with search, window manager
  (drag/resize/minimise/maximise), toasts
- **Calculator** *(new for this rebrand)* — calculator, linear &
  quadratic solver with steps, percentage/Pythagoras, formula cards,
  function graph plotter
- **Productivity** — Files (a real file system: browse `/` and every file of
  the system read-only, edit yours under `/home/<user>/`), Notes (rich text),
  Calendar, Spreadsheet (formulas incl. `SUM`/`AVERAGE` ranges), Presentation
  with present mode, Contacts, PDF Viewer, Terminal (a real shell over the
  same file system — `ls`, `cd`, `cat`, `tree`, `grep`, `>` redirects, tab
  completion)
- **Create** — Whiteboard (pen/shapes/text, PNG export), Logic Sim (digital
  logic circuit designer/simulator — a web edition of Sebastian Lague's
  Digital Logic Sim; also a built-in website at `proton://logic-sim`, both
  sharing `websites/logic-sim/`)
- **Games** — proton's own: Chess (vs computer or 2-player), Checkers, Sudoku
  (easy/medium/hard, hints), Klondike solitaire, Backgammon practice board.
  Plus **19 streamed arcade titles**: Ampler Launcher (browser Minecraft), the
  five Five Nights at Freddy's games, Granny, Baldi's Basics, Backrooms,
  Geometry Dash Lite, Bloxorz, Kart Bros, Football Bros, Retro Bowl, Drift
  Boss, Pac-Man, Flappy Bird, Minesweeper and Spacebar Clicker.
  Those are the one thing proton runs that is **not in this repository** — each
  is framed live from <https://proton-arcade.github.io>, because the builds are
  single self-contained files totalling roughly half a gigabyte. Every game
  window shows the address it streams from and how big a first load is, and
  offers **Open in new tab**. Provenance and the licensing position:
  [`CREDITS.md`](CREDITS.md#streamed-arcade-games).
- **Media** — Media player (MP4/MP3 from your computer)
- **Everything is the static website — no adding websites.** Apps are built
  into this static site, the only exception being the 19 arcade titles above,
  which stream from another origin and store nothing here; there is no way to
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
  instantly, and reset all customisations without touching your content.
- **System** — App Center, Customize, Settings
  (wallpaper/accent, change password, export/import/delete account), About,
  built-in Browser with Guide & World History pages

Everything autosaves per account: notes, files, events, contacts,
slides, whiteboards and game progress. The streamed arcade games are the
exception — a framed build saves under **its own origin** on
`proton-arcade.github.io`, so its progress belongs to that site's browser
storage, not to a proton account, and never reaches proton.

## Credits & licence

Static clone/rebrand of Mixt — full provenance, what was adapted vs
rewritten, and what a static site can't do (real mail/chat/video transport,
cloud sync) is documented in [`CREDITS.md`](CREDITS.md). Licensed
**AGPL-3.0-only** ([`LICENSE.txt`](LICENSE.txt)), same as upstream
(Mixt / Puter-derived, © Puter Technologies Inc.). Not affiliated with
Linux Mint, Cinnamon, Puter, or the Mixt authors.

That licence covers **proton's own code** — the desktop, the apps, and the
game host plus catalog entries for the arcade titles. It does **not** cover
those games: no build is stored or redistributed here, this repository grants
no rights in them, and most are commercial works belonging to their own
authors that Proton Arcade publishes without any licence. Read
[CREDITS.md](CREDITS.md#streamed-arcade-games)
before redistributing or mirroring this site. Not affiliated with Proton
Arcade, or with any game's author.
