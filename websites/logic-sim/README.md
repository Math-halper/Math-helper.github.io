# Digital Logic Sim — web edition

A circuit design & simulation environment inspired by
[Sebastian Lague's Digital Logic Sim](https://github.com/SebLague/Digital-Logic-Sim)
(MIT), **re-implemented from scratch for the web** so it runs as both:

- a **built-in website** — `websites/logic-sim/site.html`, at
  `proton://logic-sim` in the Browser (and directly at
  `/websites/logic-sim/site.html` when served over HTTP), and
- the **Logic Sim desktop app** — `apps/logic-sim/app.html` loads these same
  two files and mounts the editor into a proton window, so app and website
  are always identical and share one saved library (localStorage key
  `logic-sim.web.v1`).

There's no build step and no dependency; the Unity original was not ported
file-by-file — the engine and editor were rewritten in vanilla JS/Canvas.

## Files

| File | What it is |
| --- | --- |
| `site.html` | Standalone page + `data-proton-site` metadata. Just mounts the editor. |
| `logic-sim.js` | `Core` (pure simulation: gates, wires, ticks, nested chips) + `mount(el)` editor UI. Also `module.exports` for Node tests. |
| `logic-sim.css` | Editor styles (proton black/white chrome; only wires/LEDs carry colour). |

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

## Tests

```bash
node tests/logic-core.test.mjs     # from the repository root
```

Covers gate truth tables, half/full adders (nested chips), SR-latch feedback,
D-flip-flop edge behaviour, a free-running toggle divider, structural rules
and export/import round-trips.
