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
**independent re-implementation for the web** — the simulator engine was
written from scratch. The editor now visually follows the original's layout,
colours and drawing conventions, referenced from upstream commit
`7aeb66ddff44f916ff7fafb043ab4476ef4409fe`. Its MIT notice is retained in
`websites/logic-sim/UPSTREAM-LICENSE.txt`. The bundled JetBrains Mono NL fonts
are from upstream's resources and are licensed under SIL OFL 1.1 (see
`websites/logic-sim/fonts/OFL.txt`). The same modules run as a built-in website
(`proton://logic-sim`) and as the **Logic Sim** desktop app. S. Lague's
project covers much more (GPU-accelerated big-circuit editing, busses,
displays); this port focuses on the core experience: gates, input/output
pins, clocks, D flip-flops, seven-segment displays, saving circuits as chips
and nesting chips inside chips.

## Streamed arcade games

Added later: nineteen arcade titles in the **Games** menu category. These are the
one thing proton runs that is **not in this repository**. Each
`apps/<id>/app.html` is a thin module that asks the shared host
(`assets/game-host.js`) to frame that title's build **live from Proton Arcade**:

- Source: <https://github.com/proton-arcade/proton-arcade.github.io/tree/main/website/games>
- Served from: <https://proton-arcade.github.io/website/games/…>

**Why they stream instead of being committed.** Those builds are single
self-contained `.html` files with their whole payload inlined as base64 — five
of them are 20-56 MB, and the set totals roughly **half a gigabyte**. Vendoring
them would put that weight in every clone, every GitHub Pages deploy and every
version in git history permanently (GitHub warns above 50 MB per file and
rejects files over 100 MB), and they would need `.gitattributes` `-text -diff`
rules because a line-ending normalisation silently corrupts an inlined payload.
A streamed game costs this repository one small module instead, and no game
bytes are ever committed: every game app folder contains its module and
nothing else, and nothing over 1 MB belongs anywhere under `apps/`.

**What this means at runtime.** The player's browser downloads the build
straight from `proton-arcade.github.io`. proton never sees that traffic, never
proxies, caches or stores it, and the game never sees proton's accounts or
localStorage (the frame is sandboxed to its own origin). Every game window says
so in its toolbar and footnote, shows how large a first load is, and carries an
**Open in new tab** escape hatch for builds that refuse to be framed. If Proton
Arcade is unreachable or removes a title, that game stops working here — nothing
else in proton is affected.

**Licence — read this before redistributing.** proton itself is AGPL-3.0-only,
but that licence covers *proton's* code: the host, the modules and the catalog
entries. **It does not cover the games, and this repository grants no rights in
them.** No game build is stored or redistributed here; only their public
addresses are referenced. Most of these titles are commercial works whose
copyright belongs to their own authors, and the Proton Arcade repository
publishes them **without any licence at all**. Whether any given title may be
hosted publicly is a question for whoever hosts it — this project takes no
position on that and does not make these builds available itself. If you fork
proton, the safest reading is that the nineteen game apps are links to a
third-party site, and that removing their catalog blocks from
`data/applications.js` removes them cleanly.

| App id | Title | Provenance as published by Proton Arcade |
| --- | --- | --- |
| `ampler-launcher` | Ampler Launcher | Vendored there from <https://github.com/proton-arcade/AmplerLauncher>; a browser Minecraft (Eaglercraft-style) launcher — the launcher is small, each version it offers then streams separately |
| `fnaf-1` … `fnaf-4`, `fnaf-sister-location` | Five Nights at Freddy's 1-4, Sister Location | Commercial horror titles by Scott Cawthon |
| `granny` | Granny | Commercial horror title by DVloper. Present as a build upstream but missing from Proton Arcade's own catalog; metadata here was written for it |
| `baldis-basics` | Baldi's Basics | Commercial title by mystman12. **Placeholder** — upstream ships a page saying the build is not included yet |
| `geometry-dash-lite` | Geometry Dash Lite | Commercial title by RobTop Games |
| `backrooms`, `bloxorz`, `drift-boss`, `kart-bros`, `football-bros`, `retro-bowl`, `pac-man`, `flappy-bird`, `minesweeper` | — | Upstream groups these as its "Offline games pack" ports of well-known browser/arcade titles; Pac-Man (Namco), Geometry Dash, Retro Bowl and the others remain their authors' works |
| `spacebar-clicker` | Spacebar Clicker | A working idle clicker, credited on its own page to **CrociDB** |

**Not included**, deliberately: upstream's `Pong/` (its `index.html` references a
`style.css` and `script.js` that do not exist in that repository, so it cannot
run) and `gam temp/` (an archived handoff text file, not a game). Upstream's
catalog also lists a `Cookie-clicker` whose folder does not exist, so there is
nothing to point at. `Google-dino` was wired up here first and then removed on
request, so it is no longer linked either.
