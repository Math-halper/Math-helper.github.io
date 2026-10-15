/* ============================================================================
 * Digital Logic Sim — web edition · entry point (logic-sim.js)
 * https://github.com/SebLague/Digital-Logic-Sim (MIT)
 *
 * A circuit design + simulation environment inspired by Sebastian Lague's
 * "Digital Logic Sim", re-implemented from scratch for the web.
 *
 * The editor is split across several files (load them in this order):
 *   js/theme.js        theme + pure helpers
 *   js/core.js         simulation core (gates, wires, ticks, nested chips)
 *   js/ui.js           toolbar, chip bar, modals, menu
 *   js/interaction.js  camera, hit testing, drags, keyboard/clipboard
 *   js/renderer.js     canvas drawing
 *   js/editor.js       mount(): store, undo, run loop, boot
 *   logic-sim.js       this file — public API assembly
 *
 * Exposes:
 *   window.LogicSim = { Core, mount(rootEl, opts) }   in the browser
 *   module.exports  = { Core, mount }                 under Node (tests)
 * ========================================================================== */
(function (global) {
'use strict';

const isNode = typeof module !== 'undefined' && !!module.exports;
if (isNode) {
  require('./js/theme.js');
  require('./js/core.js');
  require('./js/ui.js');
  require('./js/interaction.js');
  require('./js/renderer.js');
  require('./js/editor.js');
}

const L = global.LogicSim = global.LogicSim || {};
const api = { Core: L.Core, mount: L.mount };
L.__loaded = true;
if (isNode) module.exports = api;
if (typeof window !== 'undefined') window.LogicSim = Object.assign(window.LogicSim || {}, api);

})(typeof window !== 'undefined' ? window : globalThis);
