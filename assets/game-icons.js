/* Hand-drawn game glyphs. Each game has its own inline SVG artwork on the
 * same 24px, 1.9px stroke/currentColor grid as the rest of proton. No raster
 * thumbnails, remote icons, emoji, or third-party logo assets are used. */
'use strict';

const GAME_ICONS = {
  /* Built-in board games and Proton Arcade */
  'game-sudoku': '<rect x="3" y="3" width="18" height="18" rx="1.5"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/><path d="m5.3 6 1.1-1v2M11 11h2l-2 2h2M17.3 17.4c1.8-1.3 2.9 1.3 0 2" stroke-width="1.2"/>',
  'game-chess': '<path d="M5 21h14M7 18.5h10l-1.4-3c2.2-1.7 3-3.6 2.3-6.3-.6-2.7-3.2-4.9-6.1-5L8 7 5 6l1.3 3.5-1.5 3.2 3.1.6L7 18.5z"/><circle cx="12" cy="8.3" r="1" fill="currentColor" stroke="none"/>',
  'game-checkers': '<ellipse cx="12" cy="16.5" rx="8" ry="3.3"/><path d="M4 16.5v-4c0 1.8 3.6 3.3 8 3.3s8-1.5 8-3.3v4"/><ellipse cx="12" cy="12.3" rx="8" ry="3.2"/><path d="m10 12 1.4-2.5 2.6 2.1-2 2"/>',
  'game-klondike': '<rect x="5" y="4" width="12" height="16" rx="1.5"/><path d="M8 2.5h11a2 2 0 0 1 2 2V17M10.5 10c1.6 2 4.2 3.7 4.2 5.1a2.7 2.7 0 0 1-4.2 2.1 2.7 2.7 0 0 1-4.2-2.1c0-1.4 2.6-3.1 4.2-5.1zM9 18h3"/>',
  'game-backgammon': '<rect x="2.5" y="4" width="19" height="16" rx="2"/><path d="M12 4v16M4 6l2 7 2-7m1 12-2-7-2 7m10-12 2 7 2-7m0 12-2-7-2 7"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
  'game-ampler-launcher': '<path d="M3 9 12 4l9 5v10l-9 4-9-4zM3 9l9 5 9-5M12 14v9"/><path d="M6 11V7.5m3 5V6m6 6V6m3 5V7.5"/>',
  'game-fnaf-sister-location': '<path d="M5 7C3 5 1.5 7 2 10s1.7 3 3 2M19 7c2-2 3.5 0 3 3s-1.7 3-3 2M5 9c0-4 3-6 7-6s7 2 7 6v7c0 3-3 5-7 5s-7-2-7-5z"/><path d="M12 4v16M8 11h2m4 0h2M10 16c1 1 3 1 4 0"/><circle cx="9" cy="12" r=".8" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r=".8" fill="currentColor" stroke="none"/>',
  'game-spacebar-clicker': '<rect x="2.5" y="9" width="19" height="9" rx="2"/><path d="M6 12v3m12-3v3M8 15h8m-5-11 2 2-2 2"/>',
  'game-baldis-basics': '<circle cx="9" cy="8" r="4"/><path d="M7 4 9 2l2 2M5 21v-5c0-2 2-3 4-3s4 1 4 3v5M17 4v16m-2-16h4m-4 4h3m-3 4h4m-4 4h3"/><circle cx="8" cy="8" r=".7" fill="currentColor" stroke="none"/><circle cx="11" cy="8" r=".7" fill="currentColor" stroke="none"/>',
  'game-kart-bros': '<path d="M3 15h18l-1.5 3H4.5zM6 15l2-5h7l3 5M8 10c0-3 2-5 4-5s4 2 4 5M9 9h7"/><circle cx="7" cy="19" r="2"/><circle cx="17" cy="19" r="2"/>',
  'game-retro-bowl': '<path d="M4 17c1-6 9-12 16-10 0 7-6 13-13 13zM9 16l6-6m-3 3-2-2m4 0-2-2M6 20l-2 2m16-15 2-2"/>',
  'game-pac-man': '<path d="M20 9a9 9 0 1 0 0 6l-8-3z"/><circle cx="14" cy="7" r="1" fill="currentColor" stroke="none"/><circle cx="21" cy="12" r="1.1" fill="currentColor" stroke="none"/>',
  'game-football-bros': '<path d="M4 14V9c0-4 4-6 8-6s8 3 8 8h-7l-2 5H6zM11 16l2 3h5M3 19h5m11-6 2 2"/><path d="M10 9h10"/>',
  'game-geometry-dash-lite': '<rect x="5" y="6" width="14" height="14" rx="1"/><path d="M5 6 3 3m16 3 2-3M3 20l2-2m14 0 2 2M9 12v2m6-2v2m-6 3h6"/><path d="M7 5 9 2l3 3 3-3 2 3"/>',
  'game-backrooms': '<path d="M3 21V4h18v17M8 21V8h8v13M3 10h5m8 0h5M8 16h8M11 21v-5"/><path d="m18 15 2 2-2 2"/>',
  'game-flappy-bird': '<path d="M2 2h4v5H2m0 11h4v4H2M19 2h3v5h-3m0 11h3v4h-3"/><path d="M7 13c0-3.5 2.3-6 5.4-6 3 0 5 2 5 5.5 0 3.1-2 5.5-5 5.5-3.2 0-5.4-2.1-5.4-5z"/><path d="m17.2 12 4 1.1-4 1.6M8.5 15c1.1-2 3-2.5 4.5-1.5"/><circle cx="14" cy="10.5" r="1" fill="currentColor" stroke="none"/>',
  'game-drift-boss': '<path d="M3 15l2-4h12l3 4v3H3zM7 11l2-4h5l3 4M2 9c1.5-3 3-4 5-4m12 14 3 2"/><circle cx="7" cy="18" r="1.5"/><circle cx="17" cy="18" r="1.5"/>',
  'game-bloxorz': '<path d="m5 7 6-3 8 3-6 3zM5 7v9l8 4v-10m6-3v9l-6 4M2 21h7m9 0h4"/>',
  'game-minesweeper': '<circle cx="12" cy="12" r="5"/><path d="M12 2v5m0 10v5M2 12h5m10 0h5M5 5l3.5 3.5M15.5 15.5 19 19m0-14-3.5 3.5M8.5 15.5 5 19"/><circle cx="10.5" cy="10.5" r="1" fill="currentColor" stroke="none"/>',
  'game-granny': '<path d="M5 21V5l14-2v18H5zM9 8c0-2 1.5-3 3-3s3 1 3 3v5c0 2-1.5 3-3 3s-3-1-3-3zM11 20h2"/><circle cx="11" cy="10" r=".8" fill="currentColor" stroke="none"/><circle cx="14" cy="10" r=".8" fill="currentColor" stroke="none"/>',

  /* Gams Offline — Basic */
  'game-gams-stickman-hook': '<path d="M4 4h16M16 4v4M16 8c0 2-2 3-4 4"/><circle cx="11" cy="13" r="1.5"/><path d="m11 14.5-2 4m1-2 4 1m-5 1-2 3m2-3 3 3"/>',
  'game-gams-drive-mad': '<path d="M2 15h20l-2 3H4zM5 15l2-6h9l3 6M8 9l1-3h5l2 3M3 11 2 8"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>',
  'game-gams-2048': '<rect x="2" y="3" width="9" height="9" rx="1"/><rect x="13" y="3" width="9" height="9" rx="1"/><rect x="2" y="14" width="9" height="8" rx="1"/><rect x="13" y="14" width="9" height="8" rx="1"/><text x="6.5" y="10" text-anchor="middle" font-size="7" fill="currentColor" stroke="none">2</text><text x="17.5" y="10" text-anchor="middle" font-size="7" fill="currentColor" stroke="none">0</text><text x="6.5" y="20" text-anchor="middle" font-size="7" fill="currentColor" stroke="none">4</text><text x="17.5" y="20" text-anchor="middle" font-size="7" fill="currentColor" stroke="none">8</text>',
  'game-gams-cookie-clicker': '<path d="M19 6c-2 0-3-1-3-3-2 1-3 0-4-1a10 10 0 1 0 10 10c-2-1-3-3-3-6z"/><circle cx="8" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="14" cy="13" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="17" r="1" fill="currentColor" stroke="none"/>',
  'game-gams-cube-field': '<path d="m3 10 5-3 5 3-5 3zM3 10v7l5 3 5-3v-7M8 13v7m5-15 4-2 4 2-4 2zm0 0v6l4 2 4-2V5m-4 2v6"/>',
  'game-gams-offline-paradise': '<path d="M2 19c6-4 14-4 20 0M12 17c-2-7 0-11 3-13m0 0c-4 0-6 2-7 4m7-4c4 0 6 2 6 4m-6-4c-2 3-1 5 0 6"/><circle cx="5" cy="6" r="2"/>',
  'game-gams-sand-game': '<path d="M5 3h14M5 21h14M7 3c0 5 5 6 5 9s-5 4-5 9m10-18c0 5-5 6-5 9s5 4 5 9"/><path d="M9 8h6m-5 10 2-2 2 2"/>',
  'game-gams-agario-lite': '<circle cx="12" cy="12" r="7"/><circle cx="5" cy="5" r="2"/><circle cx="20" cy="5" r="1.5"/><circle cx="20" cy="19" r="2"/><circle cx="10" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="13" r="1.5" fill="currentColor" stroke="none"/>',
  'game-gams-evil-glitch': '<path d="M4 10V5h5M9 5V3h5v3h5v5h2v5h-3v4H6v-4H3v-6zM4 19h3M18 4h3m-1 12h2"/><path d="M8 11h2m4 0h2m-7 5h6"/>',
  'game-gams-its-raining-boxes': '<path d="M4 8c0-2 2-4 4-4 1-2 5-2 6 0 3-1 5 1 5 4 2 0 3 1 3 3H3C2 9 3 8 4 8z"/><rect x="5" y="14" width="3" height="3"/><rect x="12" y="17" width="3" height="3"/><rect x="18" y="13" width="3" height="3"/>',
  'game-gams-t-rex': '<path d="M4 21v-3h4v-3H5v-5l4-2V3h10v7h-5v3h3v3h-3l-2-3-2 4h2v4M16 7h3"/><circle cx="15" cy="5" r="1" fill="currentColor" stroke="none"/>',
  'game-gams-stack': '<rect x="4" y="15" width="16" height="5" rx="1"/><rect x="6" y="10" width="14" height="5" rx="1"/><rect x="3" y="5" width="14" height="5" rx="1"/><path d="m20 8 2-2"/>',
  'game-gams-rolling-forests': '<path d="M2 19c6-7 14-7 20 0M5 16l3-9 3 8m-5-3h4m5 1 3-9 3 12m-5-6h4"/><circle cx="12" cy="19" r="2"/>',
  'game-gams-radius-raid': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v9l7-5M2 12h3m14 0h3M12 19v3"/><circle cx="17" cy="16" r="1" fill="currentColor" stroke="none"/>',
  'game-gams-mountain-maze': '<path d="m2 19 6-12 4 6 3-9 7 15zM6 19c2-3 3-3 5-1s4-1 5-3"/><circle cx="10" cy="15" r=".8" fill="currentColor" stroke="none"/>',
  'game-gams-fluid-simulator': '<path d="M3 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 20c2-2 4-2 6 0s4 2 6 0 4-2 6 0M12 3c-2 3-3 4-3 6a3 3 0 0 0 6 0c0-2-1-3-3-6z"/>',
  'game-gams-edge-not-found': '<path d="M2 19h10M17 19h5M12 19l2-3 3 3m-7-9 5-5 5 5-5 5z"/><path d="m18 3 3-2m-18 8 2 2"/>',
  'game-gams-ninja-vs-evilcorp': '<path d="M5 8 8 3l4 2 4-2 3 5v10H5zM5 11h14M9 15l3 2 3-2M3 21h18"/><circle cx="9" cy="10" r=".9" fill="currentColor" stroke="none"/><circle cx="15" cy="10" r=".9" fill="currentColor" stroke="none"/>',
  'game-gams-geometry-dash': '<path d="M4 6 2 3m18 3 2-3M4 20l-2 2m18-2 2 2"/><rect x="4" y="6" width="16" height="14" rx="1"/><path d="M7 5 9 2l3 3 3-3 2 3M8 11v3m8-3v3m-7 3h6"/>',
  'game-gams-wordle': '<rect x="2" y="3" width="5" height="5"/><rect x="9.5" y="3" width="5" height="5"/><rect x="17" y="3" width="5" height="5"/><rect x="2" y="10" width="5" height="5"/><rect x="9.5" y="10" width="5" height="5" fill="currentColor"/><rect x="17" y="10" width="5" height="5"/><rect x="2" y="17" width="5" height="5"/><rect x="9.5" y="17" width="5" height="5"/><rect x="17" y="17" width="5" height="5"/>',
  'game-gams-paper-io-2': '<path d="M3 5h8v7h7v7H3zM11 5h7v7h3v9h-9M3 12h8"/><path d="m19 16 3-2-1 4-3 1z"/>',

  /* Gams Offline — 3D / Unity */
  'game-gams-slope': '<path d="M2 20 11 7l11 13M6 20l7-10m2 3 5 7"/><circle cx="10" cy="6" r="3"/>',
  'game-gams-burrito-bison': '<path d="M5 7 3 3l5 2m8 0 5-2-2 4M5 8c0-3 3-5 7-5s7 2 7 5v8c0 4-3 6-7 6s-7-2-7-6z"/><path d="M9 16c1-2 5-2 6 0v3H9zM8 11h2m4 0h2"/>',
  'game-gams-tube-jumpers': '<path d="M2 18c3-3 5-3 8 0s5 3 8 0 4-3 4-3"/><circle cx="7" cy="8" r="2"/><circle cx="17" cy="6" r="2"/><path d="m7 10-2 5 4 1m8-8 2 5-4 2M4 21h16"/>',
  'game-gams-hole-io': '<ellipse cx="12" cy="18" rx="10" ry="3.5"/><path d="M7 11V4h7v7zm11-6v5m-2-3h4M12 12v4m-2-2 2 2 2-2"/>',
  'game-gams-madalin-stunt-cars': '<path d="M2 15l2-4h13l4 4-1 3H3zM7 11l3-5h5l2 5M3 6c1-3 3-4 6-4"/><circle cx="6" cy="19" r="1.8"/><circle cx="18" cy="19" r="1.8"/>',
  'game-gams-glass-city': '<path d="M3 21V9l5-2v14M8 21V4h6v17m0 0V7l6 2v12M5 12h1m-1 4h1m5-9h1m-1 4h1m-1 4h1m5-4h1m-1 4h1M2 21h20"/>',
  'game-gams-tunnel-rush': '<path d="m2 4 5 3v10l-5 3M22 4l-5 3v10l5 3M7 7l5-4 5 4M7 17l5 4 5-4M7 7h10v10H7z"/><circle cx="12" cy="12" r="2"/>',
  'game-gams-tanuki-sunset': '<path d="M3 8 6 3l3 3 3-2 3 2 3-3 3 5v7c0 3-4 5-9 5s-9-2-9-5zM7 12h2m6 0h2m-7 4c1 1 3 1 4 0M3 22h18"/>',
  'game-gams-a-dance-of-fire-and-ice': '<circle cx="7" cy="12" r="4"/><circle cx="17" cy="12" r="4"/><path d="M4 7C8 2 17 2 20 7M4 17c3 5 12 5 16 0M7 9v6m10-6v6"/>',
  'game-gams-game-inside-a-game': '<rect x="2" y="3" width="20" height="18" rx="2"/><rect x="5" y="6" width="14" height="12" rx="1"/><rect x="8" y="9" width="8" height="6" rx="1"/><path d="m11 11 3 1-3 1z"/>',
  'game-gams-cell-machine': '<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18m7-4 2 2 2-2"/><circle cx="6" cy="6" r="1" fill="currentColor" stroke="none"/>',
  'game-gams-slope-2': '<path d="M2 20 11 7l11 13M6 20l7-10m2 3 5 7"/><circle cx="10" cy="6" r="3"/><text x="20" y="10" font-size="8" font-weight="700" fill="currentColor" stroke="none">2</text>',
  'game-gams-ai-creatures': '<path d="M7 12V7c0-3 2-5 5-5s5 2 5 5v5M7 12c-3 0-4 2-4 4s2 3 4 3m10-7c3 0 4 2 4 4s-2 3-4 3M7 19c1 2 3 3 5 3s4-1 5-3M9 10h1m4 0h1m-6 5c2 2 4 2 6 0"/>',
  'game-gams-grey-box-testing': '<path d="m3 7 9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4m-9 4v10"/><path d="M11 6c0-1.2 2-1.3 2 0s-1 1-1 2m0 1v.5" stroke-width="1.3"/>',

  /* Gams Offline — retro adventures */
  'game-gams-super-mario-64': '<path d="M3 12c1-5 5-8 10-8 4 0 7 2 8 5l-8 2-10 3zM5 13c0 4 3 7 7 7s6-2 7-6M6 10h13m-11 6h2m4 0h2"/><path d="m17 3 1-2 1 2"/>',
  'game-gams-celeste': '<path d="m2 21 8-14 4 7 3-5 5 12zM7 21c1-3 3-3 4-1s3-1 4-2M14 9V3l5 2-5 2"/>',
  'game-gams-just-one-boss': '<path d="M3 9 6 4l5 2 2-3 3 3 4-2 1 5v10H3zM7 12h2m6 0h2m-6 5h3"/><rect x="2" y="20" width="2" height="2" fill="currentColor" stroke="none"/>',
  'game-gams-super-mario-rpg': '<path d="M5 10c-1-4 2-7 7-7s8 3 7 7zM7 10h10v6c0 3-2 5-5 5s-5-2-5-5zM10 14h.5m3 0h.5M3 18l2-2m14-1 3 3"/>',

  /* Gams Offline — Henry Stickmin */
  'game-gams-breaking-the-bank': '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="12" cy="12" r="5"/><path d="M12 7v10M7 12h10m-6-1 2 2-2 2"/>',
  'game-gams-escaping-the-prison': '<path d="M3 3h18v18H3zM8 3v18M16 3v18"/><circle cx="12" cy="10" r="2"/><path d="M10 18v-3c0-1 1-2 2-2s2 1 2 2v3"/>',
  'game-gams-stealing-the-diamond': '<path d="m12 3 8 7-8 10-8-10zM4 10h16M9 3l-2 7 5 10 5-10-2-7"/><path d="M20 17v3l-2 1"/>',
  'game-gams-infiltrating-the-airship': '<path d="M2 11c1-5 5-7 10-7s9 2 10 7c-1 5-5 7-10 7s-9-2-10-7zM5 11h14m-7 7v3m-4 0h8M9 8h6"/>',
  'game-gams-fleeing-the-complex': '<path d="M3 3v18M21 3v18M3 6h6m6 0h6M3 18h5m7 0h6"/><circle cx="12" cy="10" r="1.8"/><path d="m12 12-2 3 4 1m-4-1-3 3m7-2 3 3"/>',

  /* Gams Offline — Flash / Ruffle */
  'game-gams-tetris': '<path d="M3 4h5v5H3zM8 4h5v5H8zm5 0h5v5h-5zm-5 5h5v5H8zM3 16h5v5H3zm5 0h5v5H8zm5 0h5v5h-5z"/>',
  'game-gams-flood-runner-4': '<path d="M2 18c3-3 5-3 8 0s5 3 8 0 4-3 4-3M3 22c3-2 5-2 8 0M11 5c2-2 4 0 3 2m-1 1-2 4 5 1m-5-1-4 2m7-1 3 3"/><text x="19" y="8" font-size="8" font-weight="700" fill="currentColor" stroke="none">4</text>',
  'game-gams-raft-wars': '<path d="M2 17h20l-3 4H5zM4 16l4-3h8l4 3M9 13l3-6 6 2-2 4M12 7l3-4"/><circle cx="16" cy="4" r="1" fill="currentColor" stroke="none"/>',
  'game-gams-raft-wars-2': '<path d="M2 17h20l-3 4H5zM4 16l4-3h8l4 3M9 13l3-6 6 2-2 4M12 7l3-4"/><text x="20" y="9" font-size="8" font-weight="700" fill="currentColor" stroke="none">2</text>',
  'game-gams-worlds-hardest-game': '<path d="M3 3h18v18H3zM7 3v14h10V7h-6v6M7 17h4"/><rect x="3.5" y="17" width="3.5" height="3.5" fill="currentColor" stroke="none"/>',
  'game-gams-the-impossible-quiz': '<path d="M9 8c0-4 7-4 7 0 0 3-4 3-4 6m0 3v1M4 4h4M4 4v4m16 8v4h-4"/><circle cx="12" cy="12" r="10"/>',
  'game-gams-cat-ninja': '<path d="M4 9 6 3l5 3h2l5-3 2 6v8c0 3-4 5-8 5s-8-2-8-5zM4 12h16M7 13h3m4 0h3m-7 5 2 1 2-1"/>',
  'game-gams-1-on-1-soccer': '<circle cx="12" cy="17" r="3"/><path d="m10 16 2-1 2 1-1 2h-2zM3 21h18M6 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm12 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM6 7v6l-3 3m3-6 3 2m9-5v6l3 3m-3-6-3 2"/>',
  'game-gams-qwop': '<circle cx="8" cy="4" r="2"/><path d="m8 6 3 6-4 3-3 6m7-9 4 3 4 6m-12-6 3 2M2 22h20"/><path d="m17 5 2 2-2 2"/>',
  'game-gams-use-boxmen': '<rect x="9" y="13" width="6" height="6"/><circle cx="5" cy="7" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="19" cy="7" r="1.5"/><path d="M5 9v5l-3 4m3-4 2 4m5-11v4m7-2v5l-2 4m2-4 3 4M3 21h18"/>',
  'game-gams-40x-escape': '<path d="M4 21V3h16v18H4zM8 21V7h8v14M16 14h2"/><text x="12" y="5.8" text-anchor="middle" font-size="4.5" font-weight="700" fill="currentColor" stroke="none">40</text>',
  'game-gams-stickman-life': '<circle cx="8" cy="6" r="2"/><circle cx="17" cy="8" r="1.7"/><path d="M8 8v6l-4 4m4-4 4 4M5 11l6 1m6-2v5l-3 4m3-4 4 4M13 12l6 1M2 21h20"/>',
};

/* A compact, numbered variation of the same hand-drawn motif for sequels.
 * Each registration still resolves to its own distinct inline SVG. */
const gameNumber = (n, x = 20, y = 21) => `<text x="${x}" y="${y}" font-size="8" font-weight="700" font-family="system-ui,sans-serif" fill="currentColor" stroke="none">${n}</text>`;
const bear = '<path d="M5 7C3 4 5 2 8 5c2-1 6-1 8 0 3-3 5-1 3 2 2 3 2 9-1 12-3 3-9 3-12 0C3 16 3 10 5 7z"/><path d="M8 11h2m4 0h2M10 16c1-1 3-1 4 0l-2 2z"/>';
for (let n = 1; n <= 4; n++) GAME_ICONS[`game-fnaf-${n}`] = bear + gameNumber(n);
const penguin = '<path d="M11 3c-4 0-6 3-6 8v5c0 3 2 5 6 5s6-2 6-5v-5c0-5-2-8-6-8zM8 11c-2 1-4 2-5 4m11-4c2 1 4 2 5 4M8 21l-2 2m8-2 2 2"/><path d="m10 12 2 1-2 1"/><circle cx="13" cy="9" r=".8" fill="currentColor" stroke="none"/>';
for (let n = 1; n <= 3; n++) GAME_ICONS[`game-gams-learn-to-fly-${n}`] = penguin + gameNumber(n);
GAME_ICONS['game-gams-learn-to-fly-idle'] = penguin + '<circle cx="20" cy="5" r="3"/><path d="M20 3v2l1 1"/>';
const bloon = '<path d="M10 3c-3 0-5 3-5 6s2 6 5 6 5-3 5-6-2-6-5-6zM10 15l-1 2h2zM10 17v4m8-12 3-4m-4 6 4-2"/>';
for (const n of [1, 2, 5]) GAME_ICONS[`game-gams-bloons-tower-defense-${n}`] = bloon + gameNumber(n);
const duck = '<path d="M4 12C4 7 7 4 12 4s8 3 8 8c0 5-3 8-8 8s-8-3-8-8zM3 11l4 2-4 2M8 19l-1 3m8-3 1 3"/><circle cx="14" cy="9" r="1" fill="currentColor" stroke="none"/>';
for (let n = 1; n <= 5; n++) GAME_ICONS[`game-gams-duck-life-${n}`] = duck + gameNumber(n);

Object.assign(ICON_PATHS, GAME_ICONS);
