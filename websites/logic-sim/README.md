# Digital Logic Sim — web edition

A circuit design & simulation environment inspired by
[Sebastian Lague's Digital Logic Sim](https://github.com/SebLague/Digital-Logic-Sim)
(MIT), **re-implemented from scratch for the web** so it runs as both:

- a **built-in website** — `websites/logic-sim/site.html`, at
  `proton://logic-sim` in the Browser (and directly at
  `/websites/logic-sim/site.html` when served over HTTP), and
- the **Logic Sim desktop app** — `apps/logic-sim/app.html` loads these same
  files (stylesheet + the ordered JS parts) and mounts the editor into a
  proton window, so app and website are always identical and share one saved
  library (localStorage key `logic-sim.web.v1`).

There's no build step and no dependency; the Unity original was not ported
file-by-file — the engine and editor were rewritten in vanilla JS/Canvas,
organised into one file per concern the way the upstream C# is split across
folders.

## Files

| File | What it is |
| --- | --- |
| `site.html` | Standalone page (listed in the website catalog, `data/websites.js`). Loads the JS parts in order, then mounts the editor. |
| `js/theme.js` | Palette, typography, chip colours, `esc()` (upstream `Graphics/DrawSettings.cs`). |
| `js/core.js` | Simulation core: gates, wires, ticks, nested chips, examples, (de)serialisation (upstream `Simulation/`, `Description/`, `Game/Project/`). |
| `js/ui.js` | Toolbar, bottom chip bar, breadcrumbs, status line, modals, MENU (upstream `Graphics/UI/Menus/*`). |
| `js/interaction.js` | Camera (pan/zoom/fit), hit testing, wire routing, drags, keyboard & clipboard (upstream `Game/Interaction/*`). |
| `js/renderer.js` | Canvas drawing: workspace, grid, wires, chips, pins, seven-segment display (upstream `Graphics/`). |
| `js/editor.js` | `mount()` kernel: store, undo/redo, run loop, DOM scaffold + the shared context `S` that links the parts. |
| `logic-sim.js` | Entry point: assembles the public `{ Core, mount }` API; under Node it `require`s the parts so tests keep one import. |
| `logic-sim.css` | Original-style UI: gray workspace, bottom chip bar, flat colored chips, red signals. |

## Features

- Built-in chips: IN switch, PUSH button, OUT light, CLOCK, 7-segment
  display, NOT/AND/NAND/OR/NOR/XOR, D flip-flop (rising edge, `Q`/`Q̅`).
- **Chips inside chips:** any circuit with IN/OUT pins becomes a reusable
  chip; double-click a placed chip to step inside it, breadcrumb to return.
  Cycles are rejected.
- Iterative settling with memory (cross-coupled latches hold state),
  clock ticks with run/pause/step and 1–120 tps speed, oscillation detector.
- Undo/redo, copy/paste/duplicate, marquee select, right-click delete,
  zoom/pan/fit, pin renaming (names show on the chip face).
- Autosave on-device, JSON export/import of the whole library.
- First-run library: Half Adder, Full Adder (built from two Half Adder
  chips), SR Latch, and a blinking toggle-flip-flop demo on Main.

## Original-style interface

The editor follows Sebastian Lague's current Digital Logic Sim interface:
full-width `#424245` workspace, optional square grid, bottom chip strip,
blue MENU button, upward-opening white menu, flat rectangular colored chips,
circular input/output indicators, red high signals and black pins. The original
JetBrains Mono NL regular/bold fonts are served locally, with no CDN requests.
The desktop app and built-in website use the same styles and renderer.

- **MENU**: new/save chip, find/library, preferences, import/export, controls and credits.
- **LIBRARY**: search all chips, open an existing circuit, or place a chip.
- **PREFS**: show the grid or optional simulation/zoom toolbar; preferences persist.
- **Space** runs/pauses; **Enter** advances a tick; the mouse wheel zooms.
- Scroll over the bottom bar to reveal more chips. Drag a chip onto the canvas,
  click it to place at the centre, or focus it and press Enter/Space.
- **Ctrl+N/S/L/F/P**: new, save, library/search, preferences. Browser shortcuts
  are intercepted only while the editor has focus.

This is a visual re-creation, **not an exact port of Unity or full feature parity**.
Existing circuit libraries remain compatible. The simulation core is unchanged;
unbent wires render as straight segments and feedback wires route around chips.

### Reference and licences

Layout, theme values and drawing conventions were referenced from
`SebLague/Digital-Logic-Sim` at commit
`7aeb66ddff44f916ff7fafb043ab4476ef4409fe` (notably `DrawSettings.cs`,
`BottomBarUI.cs`, `SimPausedUI.cs`, and `DevSceneDrawer.cs`). The upstream MIT
notice is retained in `UPSTREAM-LICENSE.txt`. JetBrains Mono NL font files
come from that project's font resources; their SIL Open Font License is
in `fonts/OFL.txt`. Other gate/chip colors extend the original NAND palette
for the web edition's built-ins.

