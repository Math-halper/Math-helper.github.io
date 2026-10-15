# Credits & provenance

**proton** (this repository) is a static, browser-only clone and
rebrand of **Mixt**, from:

- Upstream: https://github.com/proton-arcade/mlp/tree/arena/170861f7-mlp
- Commit cloned: `c37c6cae251cf482749b19280dbafc70ccd1a6e0` (“Remove email confirmation”)

## Why it isn't a file-for-file copy

The upstream is a ~1.2 GB full-stack project: a Node.js server (`node
server.cjs`), SQLite, an HTTPS front on port 8835, a webpack-built GUI and
the Mixt.js SDK. None of that can run on GitHub Pages, which only serves
static files. So the desktop, window manager and apps were **rebuilt with
vanilla HTML/CSS/JS and zero dependencies**, keeping the upstream behaviour
and look wherever a browser-only equivalent exists:

| Upstream (Mixt) | Here (proton) |
| --- | --- |
| Mint-Y theme `src/gui/src/css/mixt.css` (accent `#68b723`, light gradient title bars, dark bottom panel) | Panel layout/chrome reimplemented in `assets/styles.css`, with the palette changed to black-and-white for proton |
| Server accounts, `admin` first sign-in, whitelist | First-launch account creation stored **only in this browser** (localStorage), salted SHA-256 password hash, stays signed in, lock screen |
| IndexedDB app storage (`src/apps/shared/localdb.js`) | Per-account localStorage state, export/import backup in Settings |
| `src/apps/notes`, `calendar`, `spreadsheet`, `whiteboard`, `presentation`, `terminal`, `pdf-editor`, `media`, `mail`, `contacts` | Browser-only rewrites with the same core behaviour |
| `src/apps/sudoku/logic.js`, `checkers`, `chess`, `klondike`, `backgammon` | Sudoku generator/checker adapted from the original pure-logic file; other games reimplemented to the same rules |
| `src/apps/team-chat`, `g-talk`, `meetings` | On-device channels/direct chat with a local helper bot; meeting planner (real calls need a server) |
| `src/apps/admin-vault`, dashboard Admin tab | Vault app that re-checks your account password; account/device stats in Settings |
| `src/app-center`, Files/dashboard | App Center + virtual Files drive; App Center/Websites add & remove user apps and websites (web apps in windows, saved sites, built-ins hide/restore), saved per account |
| — (modular layer) | **Customize** app: every built-in module's name/icon/category/order is editable and resettable, custom themes & wallpapers can be added/edited/removed/applied, and desktop parts (clock, hint, tray buttons, menu search, panel labels) toggle live — all per-account state with migration |
| `internet/*` sites | Built-in websites as separate modules: `websites/<name>/site.html`, loaded into the Browser's SITES registry |
| `internet/world-history`, `internet/mixt-guide` | Built-in Browser pages |
| — (new in this rebrand) | **New:** Calculator — calculator, linear/quadratic solver, percentage & Pythagoras, formula cards, function graph plotter |

Things that fundamentally need a server were replaced with honest on-device
equivalents and are labelled as such in-app: real e-mail/chat/video transport,
multi-user whitelisting, cloud storage, and the Mixt.js SDK.

## Licence

proton, like Mixt and the Puter-derived code it is based on, is
licensed under the **GNU Affero General Public License v3.0 only** — see
`LICENSE.txt`. Mixt contains code derived from Puter, copyright Puter
Technologies Inc., also AGPL-3.0. Original copyright notices in upstream
source files remain theirs.

Not affiliated with Linux Mint, Cinnamon, Puter Technologies, or the Mixt
authors.

## Digital Logic Sim — web edition (`websites/logic-sim/`, `apps/logic-sim/`)

Added later: a circuit design & simulation module inspired by **Sebastian
Lague's Digital Logic Sim** (<https://github.com/SebLague/Digital-Logic-Sim>,
MIT licence) and his video series *Exploring How Computers Work*. This is an
**independent re-implementation for the web** — no Unity project files, code
or assets from the original were copied; the simulator engine and editor UI
were written from scratch so the same module runs both as a built-in website
(`proton://logic-sim`) and as the **Logic Sim** desktop app. S. Lague's
project covers much more (GPU-accelerated big-circuit editing, busses,
displays); this port focuses on the core experience: gates, input/output
pins, clocks, D flip-flops, seven-segment displays, saving circuits as chips
and nesting chips inside chips. Simulation core is covered by
`tests/logic-core.test.mjs`.
