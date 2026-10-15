/* ============================================================================
 * Digital Logic Sim — web edition · theme/constants (js/theme.js)
 *
 * Palette, typography and small pure helpers, translated from the upstream
 * Unity project's graphics constants (SebLague/Digital-Logic-Sim, MIT):
 *   Assets/Scripts/Graphics/DrawSettings.cs  → FONT / COL / CHIP_COLORS
 * (web edition: original-style grey workspace, red signals, flat chip colours).
 * ========================================================================== */
(function (global) {
'use strict';

const L = global.LogicSim = global.LogicSim || {};

const GAP = 22;          // pin spacing (world units)
const PIN_R = 5.5;
const LS_KEY = 'logic-sim.web.v1';

// Palette and typography follow upstream Graphics/DrawSettings.cs (MIT).
const FONT = '"Logic Mono", monospace';
const COL = {
  bg: '#424245', grid: '#313133', body: '#ba4242', bodyMissing: '#7d3030',
  text: '#ffffff', dim: '#cccccc', faint: '#99999c',
  pinLow: '#000000', pinEdge: '#000000', edge: '#893131',
  wireLow: '#331a1a', wireHigh: '#f24d4f', sel: '#ffffff',
};
const CHIP_COLORS = { nand: '#ba4242', and: '#ba7442', or: '#558f65',
  nor: '#427c87', xor: '#7260a4', not: '#467db3', dff: '#a16691',
  clock: '#1a1a1a', button: '#1a1a1a', seg7: '#191717' };
function chipColor(type, name) {
  if (CHIP_COLORS[type]) return CHIP_COLORS[type];
  // Stable colours for user chips, including existing libraries without colours.
  const colors = ['#4c8a98', '#7860a2', '#b5784c', '#55936a', '#a15b75'];
  let hash = 0;
  for (const c of String(name)) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return colors[hash % colors.length];
}

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }


L.theme = { GAP, PIN_R, LS_KEY, FONT, COL, CHIP_COLORS, chipColor, esc };
if (typeof module !== 'undefined' && module.exports) module.exports = L.theme;
})(typeof window !== 'undefined' ? window : globalThis);
