/* ============================================================================
 * Digital Logic Sim — web edition · editor kernel (js/editor.js)
 *
 * mount() — persistent store, runtime sim state, undo/redo, geometry,
 * DOM scaffold, shared context S, run loop, canvas sizing, boot. Wires up
 * the split modules (js/ui.js, js/interaction.js, js/renderer.js).
 * Translated from upstream:
 *   Assets/Scripts/Game/Main/*        → app lifecycle / boot
 *   Assets/Scripts/Game/Project/*     → library persistence (localStorage)
 *   Assets/Scripts/Game/Elements/*   → geometry (compGeom, pinPos)
 *   UndoController / interaction glue → mutate()/undo()/redo()
 * ========================================================================== */
(function (global) {
'use strict';

const L = global.LogicSim = global.LogicSim || {};

function mount(root, opts) {
  opts = opts || {};
  const C = L.Core;
  const S = { root, opts, C };
  const { GAP, LS_KEY } = L.theme;
  /* ---------- persistent store ---------- */
  let lib, openPath, inStates, seenWelcome;
  function loadAll() {
    lib = C.makeLib(); openPath = []; inStates = {}; seenWelcome = false;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && Array.isArray(d.circuits)) {
          lib.circuits = d.circuits;
          openPath = Array.isArray(d.open) ? d.open : [];
          inStates = d.inStates || {};
          seenWelcome = !!d.seenWelcome;
          showGrid = !!d.prefs?.showGrid;
          showTools = !!d.prefs?.showTools;
        }
      }
    } catch (e) { /* corrupted store → start fresh */ }
    if (!lib.circuits.length) {
      C.installExamples(lib);
      seenWelcome = false;
    }
    if (!lib.circuits.some((c) => c.locked)) {
      // guarantee a root "Main" circuit
      const m = lib.circuits.find((c) => c.name === 'Main');
      if (m) m.locked = true;
      else lib.circuits.unshift(C.addCircuit(lib, 'Main', { locked: true }));
    }
    mainId = lib.circuits.find((c) => c.locked).id;
    if (!openPath.length || !lib.circuits.some((c) => c.id === openPath[0])) openPath = [mainId];
    openPath = openPath.filter((id) => lib.circuits.some((c) => c.id === id));
    if (!openPath.length) openPath = [mainId];
    loadSwitches();
  }
  let mainId = null;

  /* restore persisted input-switch states */
  function loadSwitches() {
    for (const [cid, map] of Object.entries(inStates)) {
      const circ = lib.circuits.find((c) => c.id === cid);
      if (!circ) continue;
      const st = statesFor(cid);
      for (const comp of circ.comps) {
        if (comp.type === 'in' && map[comp.id] != null) C.stOf(st, comp).val = map[comp.id] ? 1 : 0;
      }
    }
  }

  let saveTimer = 0;
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 350);
  }
  function saveNow() {
    try {
      const out = { circuits: lib.circuits, open: openPath, inStates: {}, seenWelcome, prefs: { showGrid, showTools } };
      for (const circ of lib.circuits) {
        const st = statesByCircuit.get(circ.id);
        if (!st) continue;
        for (const comp of circ.comps) {
          if (comp.type === 'in') {
            const v = C.stOf(st, comp).val ? 1 : 0;
            (out.inStates[circ.id] || (out.inStates[circ.id] = {}))[comp.id] = v;
          }
        }
      }
      localStorage.setItem(LS_KEY, JSON.stringify(out));
    } catch (e) { /* storage full/blocked — session still works */ }
  }

  /* ---------- runtime sim state ---------- */
  const statesByCircuit = new Map();
  const evByCircuit = new Map();
  let stableFlag = true;

  function statesFor(cid) {
    let st = statesByCircuit.get(cid);
    if (!st) { st = C.newStates(); statesByCircuit.set(cid, st); }
    return st;
  }
  function settleNow() {
    const circ = S.current();
    const r = C.settle(circ, lib, statesFor(circ.id), evByCircuit.get(circ.id));
    evByCircuit.set(circ.id, r.ev);
    stableFlag = r.stable;
    S.refreshStatus();
  }
  const current = () => lib.circuits.find((c) => c.id === openPath[openPath.length - 1]);

  /* ---------- undo / redo ---------- */
  const undoByCircuit = new Map();
  function stackFor(cid) {
    let s = undoByCircuit.get(cid);
    if (!s) { s = { undo: [], redo: [] }; undoByCircuit.set(cid, s); }
    return s;
  }
  function snapshot() {
    const c = S.current();
    return JSON.stringify({ name: c.name, comps: c.comps, wires: c.wires });
  }
  function restore(snap) {
    const c = S.current();
    const d = JSON.parse(snap);
    if (!c.locked) c.name = d.name;
    c.comps = d.comps; c.wires = d.wires;
    evByCircuit.delete(c.id);
    settleNow(); S.refreshChrome(); S.refreshPalette(); scheduleSave();
  }
  function mutate(fn) {
    const st = stackFor(S.current().id);
    st.undo.push(snapshot());
    if (st.undo.length > 120) st.undo.shift();
    st.redo.length = 0;
    fn();
    settleNow(); scheduleSave();
  }
  function undo() {
    const st = stackFor(S.current().id);
    if (!st.undo.length) return S.toast('Nothing to undo');
    st.redo.push(snapshot());
    restore(st.undo.pop());
  }
  function redo() {
    const st = stackFor(S.current().id);
    if (!st.redo.length) return S.toast('Nothing to redo');
    st.undo.push(snapshot());
    restore(st.redo.pop());
  }

  /* ---------- geometry ---------- */
  function compGeom(t) {
    const rows = Math.max(t.ins.length, t.outs.length, 2);
    const w = t.w || Math.max(76, Math.min(190, (t.name || '').length * 8.4 + 30));
    return { w, h: t.h || Math.max(54, rows * GAP + 14) };
  }
  function pinPos(comp, t, io, idx) {
    const g = compGeom(t);
    const n = io === 'in' ? t.ins.length : t.outs.length;
    const span = (n - 1) * GAP;
    const y0 = comp.y + g.h / 2 - span / 2;
    return { x: io === 'in' ? comp.x : comp.x + g.w, y: y0 + idx * GAP };
  }

  /* ---------- DOM scaffold ---------- */
  root.classList.add('ls-host');
  root.innerHTML = `
  <div class="ls">
    <div class="ls-paused"><span>Simulation Paused <small>(Enter to advance one step)</small></span><button class="ls-btn" data-a="run" title="Run simulation (Space)">RESUME</button></div>
    <div class="ls-top">
      <nav class="ls-crumbs" aria-label="Open chips"></nav>
      <div class="ls-actions">
        <button class="ls-btn" data-a="undo" title="Undo (Ctrl+Z)"><svg viewBox="0 0 24 24"><path d="M8.5 5 4 9.5 8.5 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 9.5H14a5.5 5.5 0 0 1 0 11h-3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
        <button class="ls-btn" data-a="redo" title="Redo (Ctrl+Y)"><svg viewBox="0 0 24 24"><path d="M15.5 5 20 9.5 15.5 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M19.5 9.5H10a5.5 5.5 0 0 0 0 11h3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
        <span class="ls-sep"></span>
        <button class="ls-btn" data-a="step" title="Advance one tick (Enter)"><svg viewBox="0 0 24 24"><path d="M6 5l7 7-7 7z" fill="currentColor"/><path d="M16 5h2.4v14H16z" fill="currentColor"/></svg></button>
        <button class="ls-btn ls-run" data-a="run" title="Run / pause the clock (Space)"><svg class="i-play" viewBox="0 0 24 24"><path d="M7 4.8v14.4L18.6 12z" fill="currentColor"/></svg><svg class="i-pause" viewBox="0 0 24 24" style="display:none"><path d="M6.5 5h4v14h-4zM13.5 5h4v14h-4z" fill="currentColor"/></svg></button>
        <label class="ls-speed" title="Simulation speed"><input type="range" min="1" max="120" value="8" step="1"><span>8 tps</span></label>
        <span class="ls-sep"></span>
        <button class="ls-btn" data-a="zout" title="Zoom out"><svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M15.2 15.2 20 20M7.6 10.5h5.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
        <button class="ls-btn ls-zoomv" data-a="z100" title="Reset zoom">100%</button>
        <button class="ls-btn" data-a="zin" title="Zoom in"><svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M15.2 15.2 20 20M7.6 10.5h5.8M10.5 7.6v5.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
        <button class="ls-btn" data-a="fit" title="Fit circuit to view"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15"/></svg></button>
        <span class="ls-sep"></span>
        <button class="ls-btn" data-a="prefs" title="Preferences">PREFS</button>
      </div>
    </div>
    <div class="ls-body">
      <div class="ls-stage">
        <canvas class="ls-cv"></canvas>
        <div class="ls-status"></div>
        <div class="ls-hint"></div>
      </div>
    </div>
    <footer class="ls-bottom">
      <button class="ls-menu-btn" data-a="menu" aria-label="Open menu" aria-expanded="false">MENU</button>
      <aside class="ls-pal" aria-label="Chip palette"><div class="ls-pal-scroll"></div></aside>
      <button class="ls-library-btn" data-a="library" title="Find or open a chip (Ctrl+L)">LIBRARY</button>
    </footer>
  </div>`;

  const el = (q) => root.querySelector(q);
  const cv = el('.ls-cv');
  const ctx2d = cv.getContext('2d');
  const stage = el('.ls-stage');
  const crumbsEl = el('.ls-crumbs');
  const palScroll = el('.ls-pal-scroll');
  const statusEl = el('.ls-status');
  const hintEl = el('.ls-hint');
  const speedInput = el('.ls-speed input');
  const speedLabel = el('.ls-speed span');
  palScroll.addEventListener('wheel', (e) => {
    if (palScroll.scrollWidth <= palScroll.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    e.preventDefault(); palScroll.scrollLeft += e.deltaY;
  }, { passive: false });
  Object.assign(S, {
    el, cv, stage, crumbsEl, palScroll, statusEl, hintEl, speedInput, speedLabel,
  });

  /* ---------- editor state ---------- */
  let cam = null;              // alias of S.current().cam
  let selComps = new Set();
  let selWires = new Set();
  let hover = null;            // {kind:'pin'|'comp'|'wire', ...}
  let drag = null;
  let mouse = { x: 0, y: 0, wx: 0, wy: 0, inside: false };
  let running = false;
  let showGrid = false;
  let showTools = false;
  let tickCount = 0;
  let spaceHeld = false;

  function loadCam() { cam = S.current().cam || (S.current().cam = { x: 48, y: 40, z: 1 }); }


  /* ---------- shared context for the split js/ modules -------------------
   * mount() keeps the original closure code (store, runtime state, undo,
   * geometry, scaffold, run loop). js/ui.js, js/interaction.js and
   * js/renderer.js are separate files that read and write these same
   * locals through S: getters/setters for mutable state, plain function
   * references for everything else. */
  Object.defineProperties(S, {
    lib:         { get: () => lib,          set: (v) => { lib = v; },          enumerable: true },
    openPath:    { get: () => openPath,     set: (v) => { openPath = v; },     enumerable: true },
    mainId:      { get: () => mainId,       set: (v) => { mainId = v; },       enumerable: true },
    seenWelcome: { get: () => seenWelcome,  set: (v) => { seenWelcome = v; },  enumerable: true },
    showGrid:    { get: () => showGrid,     set: (v) => { showGrid = v; },     enumerable: true },
    showTools:   { get: () => showTools,    set: (v) => { showTools = v; },    enumerable: true },
    running:     { get: () => running,      set: (v) => { running = v; },      enumerable: true },
    tickCount:   { get: () => tickCount,    set: (v) => { tickCount = v; },    enumerable: true },
    stableFlag:  { get: () => stableFlag,   set: (v) => { stableFlag = v; },   enumerable: true },
    cam:         { get: () => cam,          set: (v) => { cam = v; },          enumerable: true },
    selComps:    { get: () => selComps,     set: (v) => { selComps = v; },     enumerable: true },
    selWires:    { get: () => selWires,     set: (v) => { selWires = v; },     enumerable: true },
    hover:       { get: () => hover,        set: (v) => { hover = v; },        enumerable: true },
    drag:        { get: () => drag,         set: (v) => { drag = v; },         enumerable: true },
    mouse:       { get: () => mouse,        set: (v) => { mouse = v; },        enumerable: true },
    spaceHeld:   { get: () => spaceHeld,    set: (v) => { spaceHeld = v; },    enumerable: true },
    dpr:         { get: () => dpr,          set: (v) => { dpr = v; },          enumerable: true },
  });

  /* navigation (moved out of the old canvas-interaction section) */
  function enterCircuit() {
    loadCam();
    selComps.clear(); selWires.clear(); hover = null; drag = null;
    S.updateZoomLabel();
    settleNow();
    S.refreshChrome();
    scheduleSave();
  }

  /* drop a chip's runtime + undo bookkeeping (chip deletion) */
  function forgetChip(cid) {
    undoByCircuit.delete(cid);
    statesByCircuit.delete(cid);
    evByCircuit.delete(cid);
  }
  function evOf(cid) { return evByCircuit.get(cid); }

  Object.assign(S, {
    current, statesFor, settleNow, stackFor, snapshot, restore, mutate, undo, redo,
    compGeom, pinPos, loadCam, enterCircuit, forgetChip, evOf,
    scheduleSave, saveNow, restartTimer, setRunning, doTick, layout,
  });
  /* ---------- run loop ---------- */
  let runTimer = 0;
  function tps() { return +speedInput.value; }
  function restartTimer() {
    clearInterval(runTimer);
    if (running) {
      runTimer = setInterval(() => {
        if (!root.isConnected) { clearInterval(runTimer); return; }
        const n = Math.max(1, Math.round(tps() / 12));
        for (let i = 0; i < n; i++) doTick(true);
        S.refreshStatus();
      }, 82);
    }
  }
  function setRunning(v) {
    running = v;
    root.querySelectorAll('[data-a="run"]').forEach((btn) => {
      btn.classList.toggle('on', v);
      btn.setAttribute('aria-pressed', String(v));
      const play = btn.querySelector('.i-play'), pause = btn.querySelector('.i-pause');
      if (play) play.style.display = v ? 'none' : '';
      if (pause) pause.style.display = v ? '' : 'none';
    });
    restartTimer();
    S.refreshStatus();
  }
  function doTick(quiet) {
    const circ = S.current();
    const r = C.tick(circ, lib, statesFor(circ.id), evByCircuit.get(circ.id));
    evByCircuit.set(circ.id, r.ev);
    stableFlag = r.stable;
    tickCount++;
    if (!quiet) S.refreshStatus();
  }

  /* ---------- canvas sizing ---------- */
  let dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  function layout() {
    dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const w = stage.clientWidth, h = stage.clientHeight;
    const pop = el('.ls-pop');
    if (pop) pop.style.maxHeight = Math.max(80, root.clientHeight - 66) + 'px';
    cv.width = Math.max(1, Math.round(w * dpr));
    cv.height = Math.max(1, Math.round(h * dpr));
  }
  /* ResizeObserver is in every modern browser; the window resize listener
   * below is the fallback anywhere it is missing. */
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { layout(); }) : null;
  if (ro) ro.observe(stage);
  window.addEventListener('resize', layout);


  /* ---------- split editor modules --------------------------------------- */
  S.interaction = L.createInteraction(S);
  S.ui = L.createUi(S);
  S.renderer = L.createRenderer(S);
  /* ---------- boot ---------- */
  loadAll();
  el('.ls').classList.toggle('ls-show-tools', showTools);
  loadCam();
  layout();
  S.updateZoomLabel();
  settleNow();
  S.refreshChrome();
  S.draw();
  if (!seenWelcome) S.welcomeModal();

  /* public handle */
  return {
    resize: layout,
    unmount() {
      S.renderer.destroy();
      S.ui.destroy();
      S.interaction.destroy();
      ro.disconnect();
      clearInterval(runTimer);
      clearTimeout(saveTimer);
      window.removeEventListener('resize', layout);
      saveNow();
    },
  };
}

L.mount = mount;
if (typeof module !== 'undefined' && module.exports) module.exports = mount;
})(typeof window !== 'undefined' ? window : globalThis);
