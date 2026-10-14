# proton — a browser desktop (static Mixt clone)

A complete desktop in your browser: Mint-style bottom panel and proton menu,
draggable/resizable windows, and 20+ apps — cloned and rebranded from
[Mixt (`proton-arcade/mlp` @ `arena/170861f7-mlp`)](https://github.com/proton-arcade/mlp/tree/arena/170861f7-mlp)
and rebuilt to run as a **pure static website** (no server, no build step,
no dependencies).

## ▶ Run it

It's just static files — open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Deployed on GitHub Pages it works as-is from the repo root.

## 🔑 First launch = create your account

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

## 🖥 What's inside

- **Desktop** — wallpaper choices, desktop icons, Mint-Y panel with pinned
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
- **System** — App Center (pin/unpin, desktop icons), Admin Vault
  (password-gated private notes), Settings (wallpaper/accent, change
  password, export/import/delete account), About, built-in Browser with
  Guide & World History pages

Everything autosaves per account: notes, files, events, contacts, mail,
slides, whiteboards, chats, meetings, secrets and game progress.

## 🙏 Credits & licence

Static clone/rebrand of Mixt — full provenance, what was adapted vs
rewritten, and what a static site can't do (real mail/chat/video transport,
cloud sync) is documented in [`CREDITS.md`](CREDITS.md). Licensed
**AGPL-3.0-only** ([`LICENSE.txt`](LICENSE.txt)), same as upstream
(Mixt / Puter-derived, © Puter Technologies Inc.). Not affiliated with
Linux Mint, Cinnamon, Puter, or the Mixt authors.
