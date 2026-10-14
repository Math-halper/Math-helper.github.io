# proton — a browser desktop (static Mixt clone)

A complete desktop in your browser: Mint-style bottom panel and proton menu,
draggable/resizable windows, and 20+ apps — cloned and rebranded from
[Mixt (`proton-arcade/mlp` @ `arena/170861f7-mlp`)](https://github.com/proton-arcade/mlp/tree/arena/170861f7-mlp)
and rebuilt to run as a **pure static website** (no server, no build step,
no dependencies). It ships a **black-and-white theme: black backgrounds, white text, and
white/grey accents** (no colour in the UI; only physical game pieces
such as cards and checkers keep their colours).

## Run it

It's just static files — open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Deployed on GitHub Pages it works as-is from the repo root.

## Project layout (everything is a module)

- **Apps:** one folder + file each — `apps/<name>/app.js` (30 apps, incl.
  test apps). Add one by copying `apps/_template/` and adding a
  `<script>` line to `index.html`; remove one by deleting that line.
  Full guide: [`apps/README.md`](apps/README.md).
- **Built-in websites:** one folder + file each — `websites/<name>/site.js`
  (5 sites, incl. test sites), rendered by the Browser at
  `proton://<name>`. Guide: [`websites/README.md`](websites/README.md).
- **Core only:** `assets/store.js` (accounts/storage), `assets/icons.js`
  (the SVG icon set - every app/site/button icon is a named vector icon,
  no emoji icons), `assets/core.js` (desktop/window manager/registries),
  `assets/styles.css`, `assets/boot.js`.

## First launch = create your account

1. On first launch you're asked to create an account (display name,
   username, password 6+ chars, avatar).
2. You **stay signed in** on that device until you sign out — next visit
   goes straight to the desktop. `Lock` hides the desktop behind your
   password without signing out.
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
- **Productivity** — Files (virtual drive), Notes (rich text), Calendar,
  Spreadsheet (formulas incl. `SUM`/`AVERAGE` ranges), Presentation with
  present mode, Contacts, Mail (on-device), PDF Viewer, Terminal
- **Create** — Whiteboard (pen/shapes/text, PNG export)
- **Games** — Chess (vs computer or 2-player), Checkers, Sudoku
  (easy/medium/hard, hints), Klondike solitaire, Backgammon practice board
- **Chat & media** — Team Chat + G-Talk with Nova the on-device helper bot,
  Meetings planner, Media player (MP4/MP3 from your computer)
- **Add & remove apps/websites (like Mixt)** — App Center has one-click forms:
  **Add an app** (name, icon chosen from the SVG icon set, web address -
  appears in proton menu under *My Apps*,
  pinnable, opens in its own window), **Add a website** (saved sites also live in
  the new **Websites** app and on the Browser home page, and can be turned into
  apps). Custom apps/websites can be edited or removed; built-in apps can be
  **removed** from the menu and **added back** any time (Settings & App Center
  are protected so you can't lock yourself out). All saved per account.
- **Customize — everything is modular.** Rename any app, change its icon,
  move it to another (or a brand-new) menu category, reorder it, pin it, remove
  it and add it back, or reset it — per account. Invent your own **themes**
  (accent + wallpaper) and **wallpapers** (two-shade gradients) and apply them
  in one click; they also appear in Settings. Toggle desktop parts (clock,
  desktop date/hint, lock & account buttons, menu search, panel labels)
  instantly, and reset all customisations without touching your content.
- **System** — App Center, Websites manager, Admin Vault, Customize
  (password-gated private notes), Settings (wallpaper/accent, change
  password, export/import/delete account), About, built-in Browser with
  Guide & World History pages

Everything autosaves per account: notes, files, events, contacts, mail,
slides, whiteboards, chats, meetings, secrets and game progress.

## Credits & licence

Static clone/rebrand of Mixt — full provenance, what was adapted vs
rewritten, and what a static site can't do (real mail/chat/video transport,
cloud sync) is documented in [`CREDITS.md`](CREDITS.md). Licensed
**AGPL-3.0-only** ([`LICENSE.txt`](LICENSE.txt)), same as upstream
(Mixt / Puter-derived, © Puter Technologies Inc.). Not affiliated with
Linux Mint, Cinnamon, Puter, or the Mixt authors.
