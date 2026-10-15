/* ============================================================================
 * Digital Logic Sim — web edition
 * A circuit design + simulation environment inspired by Sebastian Lague's
 * "Digital Logic Sim" (https://github.com/SebLague/Digital-Logic-Sim, MIT),
 * re-implemented from scratch for the web (no Unity, no build step).
 *
 * Exposes:
 *   window.LogicSim = { Core, mount(rootEl, opts) }   in the browser
 *   module.exports  = { Core, mount }                 under Node (tests)
 *
 * Core is pure logic (no DOM): circuits, chips, wires, evaluation, ticks.
 * mount() creates the full editor UI (toolbar, palette, canvas) inside rootEl.
 * ========================================================================== */
(function () {
'use strict';

/* ================================ CORE ================================== */

const Core = (() => {
  let __uid = 0;
  const uid = (p) => p + (++__uid).toString(36) + Math.random().toString(36).slice(2, 6);

  /* Built-in chip definitions. ins/outs are pin names, left → right. */
  const BUILTINS = {
    'in':     { key: 'in',     name: 'IN',      cat: 'io',    ins: [], outs: ['OUT'], w: 92, h: 48, desc: 'Input switch — click to toggle' },
    'button': { key: 'button', name: 'PUSH',    cat: 'io',    ins: [], outs: ['OUT'], w: 92, h: 48, desc: 'Push button — held while pressed' },
    'out':    { key: 'out',    name: 'OUT',     cat: 'io',    ins: ['IN'], outs: [],  w: 80, h: 48, desc: 'Output light' },
    'clock':  { key: 'clock',  name: 'CLOCK',   cat: 'io',    ins: [], outs: ['CLK'], w: 92, h: 48, desc: 'Toggles once per simulation tick' },
    'not':    { key: 'not',    name: 'NOT',     cat: 'gate',  ins: ['IN'], outs: ['OUT'], desc: 'Out = 1 when In = 0' },
    'and':    { key: 'and',    name: 'AND',     cat: 'gate',  ins: ['IN 1', 'IN 2'], outs: ['OUT'], desc: 'Out = In1 ∧ In2' },
    'nand':   { key: 'nand',   name: 'NAND',    cat: 'gate',  ins: ['IN 1', 'IN 2'], outs: ['OUT'], desc: 'Out = ¬(In1 ∧ In2)' },
    'or':     { key: 'or',     name: 'OR',      cat: 'gate',  ins: ['IN 1', 'IN 2'], outs: ['OUT'], desc: 'Out = In1 ∨ In2' },
    'nor':    { key: 'nor',    name: 'NOR',     cat: 'gate',  ins: ['IN 1', 'IN 2'], outs: ['OUT'], desc: 'Out = ¬(In1 ∨ In2)' },
    'xor':    { key: 'xor',    name: 'XOR',     cat: 'gate',  ins: ['IN 1', 'IN 2'], outs: ['OUT'], desc: 'Out = In1 ⊕ In2' },
    'dff':    { key: 'dff',    name: 'D FLIP-FLOP', cat: 'mem', ins: ['D', 'CLK'], outs: ['Q', 'Q̅'], w: 104, desc: 'On rising CLK edge, Q becomes D' },
    'seg7':   { key: 'seg7',   name: '7-SEG',   cat: 'io',    ins: ['a', 'b', 'c', 'd', 'e', 'f', 'g'], outs: [], w: 116, desc: 'Seven-segment display' },
  };

  const newStates = () => new Map();

  function stOf(st, comp) {
    let s = st.get(comp.id);
    if (!s) { s = {}; st.set(comp.id, s); }
    return s;
  }
  const subOf = (s) => (s.sub || (s.sub = new Map()));

  function makeLib() { return { circuits: [] }; }

  function addCircuit(lib, name, opts) {
    const c = Object.assign({
      id: uid('c'), name: name || 'Untitled', comps: [], wires: [],
      cam: { x: 48, y: 40, z: 1 },
    }, opts || {});
    lib.circuits.push(c);
    return c;
  }

  function addComp(circuit, type, x, y, extra) {
    const comp = Object.assign({ id: uid('x'), type, x: Math.round(x), y: Math.round(y) }, extra || {});
    circuit.comps.push(comp);
    return comp;
  }

  function addWire(circuit, lib, f, t) {
    // f: {c,p} must be an output pin; t: {c,p} an input pin.
    // Same-chip feedback (e.g. Q̅ → D) is allowed — iterative settling handles it.
    if (!f || !t) return null;
    const fc = circuit.comps.find((c) => c.id === f.c);
    const tc = circuit.comps.find((c) => c.id === t.c);
    if (!fc || !tc) return null;
    const ft = typeOf(fc, lib), tt = typeOf(tc, lib);
    if (f.p < 0 || f.p >= ft.outs.length || t.p < 0 || t.p >= tt.ins.length) return null;
    // one wire per input pin: replace any existing wire into the same target
    circuit.wires = circuit.wires.filter((w) => !(w.t.c === t.c && w.t.p === t.p));
    const w = { id: uid('w'), f: { c: f.c, p: f.p }, t: { c: t.c, p: t.p } };
    circuit.wires.push(w);
    return w;
  }

  function removeComps(circuit, ids) {
    circuit.comps = circuit.comps.filter((c) => !ids.has(c.id));
    circuit.wires = circuit.wires.filter((w) => !ids.has(w.f.c) && !ids.has(w.t.c));
  }

  function removeWires(circuit, ids) {
    circuit.wires = circuit.wires.filter((w) => !ids.has(w.id));
  }

  /* The input/output pin components of a circuit, in chip-pin order (top→bottom, left→right). */
  function chipPins(circuit) {
    const ins = circuit.comps.filter((c) => c.type === 'in')
      .sort((a, b) => (a.y - b.y) || (a.x - b.x));
    const outs = circuit.comps.filter((c) => c.type === 'out')
      .sort((a, b) => (a.y - b.y) || (a.x - b.x));
    return { inputs: ins, outputs: outs };
  }

  /* Resolve a component's type: a builtin, or a reference to another circuit (a saved chip). */
  function typeOf(comp, lib) {
    if (comp.type !== 'chip') return BUILTINS[comp.type] || { key: comp.type, name: '?', ins: [], outs: [], missing: true };
    const circ = lib.circuits.find((x) => x.id === comp.ref);
    if (!circ) return { key: 'chip', name: '(missing)', ins: [], outs: [], missing: true };
    const pins = chipPins(circ);
    return {
      key: 'chip',
      name: circ.name,
      circuit: circ,
      ins: pins.inputs.map((c, i) => c.label || ('IN ' + (i + 1))),
      outs: pins.outputs.map((c, i) => c.label || ('OUT' + (i + 1))),
    };
  }

  /* True if placing a chip referencing `refId` inside circuit `intoId` would create a cycle. */
  function dependsOn(lib, fromId, refId) {
    if (fromId === refId) return true;
    const seen = new Set();
    const walk = (id) => {
      if (id === refId) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      const c = lib.circuits.find((x) => x.id === id);
      if (!c) return false;
      for (const comp of c.comps) {
        if (comp.type === 'chip' && walk(comp.ref)) return true;
      }
      return false;
    };
    return walk(fromId);
  }

  const MAX_DEPTH = 12;
  const MAX_PASSES = 120;

  /* Evaluate a circuit to a steady state.
   * states: Map compId → persistent runtime state (switches, flip-flops…).
   * prevEv: previous evaluation map — seeds iterative solving so cross-coupled
   *         latches keep their value.  Returns { ev, stable }. */
  function settle(circuit, lib, states, prevEv, depth) {
    depth = depth || 0;
    const ev = new Map();
    for (const c of circuit.comps) {
      const t = typeOf(c, lib);
      const prev = prevEv && prevEv.get(c.id);
      const ins = new Array(t.ins.length).fill(0);
      const outs = new Array(t.outs.length).fill(0);
      if (prev) {
        for (let i = 0; i < Math.min(outs.length, prev.outs.length); i++) outs[i] = prev.outs[i];
      }
      ev.set(c.id, { ins, outs });
    }
    if (depth > MAX_DEPTH) return { ev, stable: false };

    const src = new Map();
    for (const w of circuit.wires) src.set(w.t.c + ':' + w.t.p, w.f);

    let stable = false;
    for (let pass = 0; pass < MAX_PASSES; pass++) {
      let changed = false;
      for (const c of circuit.comps) {
        const t = typeOf(c, lib);
        const e = ev.get(c.id);
        for (let p = 0; p < t.ins.length; p++) {
          const s = src.get(c.id + ':' + p);
          let v = 0;
          if (s) {
            const se = ev.get(s.c);
            if (se && s.p < se.outs.length) v = se.outs[s.p] | 0;
          }
          e.ins[p] = v;
        }
        let nv = null;
        switch (t.key) {
          case 'in': case 'button': case 'clock':
            nv = [stOf(states, c).val ? 1 : 0]; break;
          case 'out': case 'seg7':
            nv = null; break;
          case 'not': nv = [e.ins[0] ? 0 : 1]; break;
          case 'and': nv = [(e.ins[0] & e.ins[1])]; break;
          case 'nand': nv = [(e.ins[0] & e.ins[1]) ? 0 : 1]; break;
          case 'or': nv = [(e.ins[0] | e.ins[1])]; break;
          case 'nor': nv = [(e.ins[0] | e.ins[1]) ? 0 : 1]; break;
          case 'xor': nv = [(e.ins[0] ^ e.ins[1])]; break;
          case 'dff': { const s = stOf(states, c); nv = [s.q ? 1 : 0, s.q ? 0 : 1]; break; }
          case 'chip': {
            if (!t.circuit) { nv = new Array(t.outs.length).fill(0); break; }
            nv = evalChipPins(t, e.ins, lib, stOf(states, c), depth);
            break;
          }
          default: nv = new Array(t.outs.length).fill(0);
        }
        if (nv) {
          for (let k = 0; k < t.outs.length; k++) {
            if (e.outs[k] !== nv[k]) { e.outs[k] = nv[k]; changed = true; }
          }
        }
      }
      if (!changed) { stable = true; break; }
    }
    return { ev, stable };
  }

  function evalChipPins(t, ins, lib, s, depth) {
    const sub = subOf(s);
    const pins = chipPins(t.circuit);
    for (let i = 0; i < pins.inputs.length; i++) {
      stOf(sub, pins.inputs[i]).val = ins[i] ? 1 : 0;
    }
    const r = settle(t.circuit, lib, sub, s.ev, depth + 1);
    s.ev = r.ev;
    return pins.outputs.map((pinComp) => {
      const pe = r.ev.get(pinComp.id);
      return pe ? (pe.ins[0] | 0) : 0;
    });
  }

  /* One simulation tick: advance clocks, settle, latch flip-flops, settle again. */
  function tick(circuit, lib, states, prevEv) {
    advanceClocks(circuit, lib, states, 0);
    let r = settle(circuit, lib, states, prevEv, 0);
    commitSeq(circuit, lib, states, r.ev, 0);
    r = settle(circuit, lib, states, r.ev, 0);
    return r;
  }

  function advanceClocks(circuit, lib, st, depth) {
    if (depth > MAX_DEPTH) return;
    for (const comp of circuit.comps) {
      if (comp.type === 'clock') {
        const s = stOf(st, comp);
        s.val = s.val ? 0 : 1;
      } else if (comp.type === 'chip') {
        const t = typeOf(comp, lib);
        if (t.circuit) advanceClocks(t.circuit, lib, subOf(stOf(st, comp)), depth + 1);
      }
    }
  }

  function commitSeq(circuit, lib, st, ev, depth) {
    if (depth > MAX_DEPTH) return;
    for (const comp of circuit.comps) {
      if (comp.type === 'dff') {
        const e = ev.get(comp.id);
        const s = stOf(st, comp);
        if (e) {
          const clk = e.ins[1] | 0;
          if (!s.pc && clk) s.q = e.ins[0] | 0;
          s.pc = clk;
        }
      } else if (comp.type === 'chip') {
        const t = typeOf(comp, lib);
        if (!t.circuit) continue;
        const s = stOf(st, comp);
        const sub = subOf(s);
        const inner = settle(t.circuit, lib, sub, s.ev, depth + 1);
        s.ev = inner.ev;
        commitSeq(t.circuit, lib, sub, inner.ev, depth + 1);
      }
    }
  }

  /* ---- examples (installed on first run; deletable like any chip) ---- */

  function placeExampleWires(circuit, lib, list) {
    for (const [fComp, fPin, tComp, tPin] of list) addWire(circuit, lib, { c: fComp.id, p: fPin }, { c: tComp.id, p: tPin });
  }

  function installExamples(lib) {
    // Half Adder: A,B → XOR (SUM), AND (CARRY)
    const ha = addCircuit(lib, 'Half Adder');
    const haA = addComp(ha, 'in', 60, 60, { label: 'A' });
    const haB = addComp(ha, 'in', 60, 180, { label: 'B' });
    const haXor = addComp(ha, 'xor', 320, 60);
    const haAnd = addComp(ha, 'and', 320, 200);
    const haSum = addComp(ha, 'out', 560, 60, { label: 'SUM' });
    const haCar = addComp(ha, 'out', 560, 200, { label: 'CARRY' });
    placeExampleWires(ha, lib, [
      [haA, 0, haXor, 0], [haB, 0, haXor, 1],
      [haA, 0, haAnd, 0], [haB, 0, haAnd, 1],
      [haXor, 0, haSum, 0], [haAnd, 0, haCar, 0],
    ]);

    // Full Adder built from two Half Adder chips + OR — nested chips in action.
    const fa = addCircuit(lib, 'Full Adder');
    const faA = addComp(fa, 'in', 40, 40, { label: 'A' });
    const faB = addComp(fa, 'in', 40, 140, { label: 'B' });
    const faC = addComp(fa, 'in', 40, 250, { label: 'C IN' });
    const ha1 = addComp(fa, 'chip', 280, 60, { ref: ha.id });
    const ha2 = addComp(fa, 'chip', 520, 130, { ref: ha.id });
    const or = addComp(fa, 'or', 520, 270);
    const faS = addComp(fa, 'out', 780, 130, { label: 'SUM' });
    const faCo = addComp(fa, 'out', 780, 270, { label: 'C OUT' });
    placeExampleWires(fa, lib, [
      [faA, 0, ha1, 0], [faB, 0, ha1, 1],
      [ha1, 0, ha2, 0], [faC, 0, ha2, 1],
      [ha1, 1, or, 0], [ha2, 1, or, 1],
      [ha2, 0, faS, 0], [or, 0, faCo, 0],
    ]);

    // SR Latch: cross-coupled NOR gates (combinational feedback with memory).
    const sr = addCircuit(lib, 'SR Latch');
    const srS = addComp(sr, 'in', 60, 70, { label: 'SET' });
    const srR = addComp(sr, 'in', 60, 240, { label: 'RESET' });
    const nor1 = addComp(sr, 'nor', 340, 60);
    const nor2 = addComp(sr, 'nor', 340, 220);
    const srQ = addComp(sr, 'out', 580, 60, { label: 'Q' });
    const srQb = addComp(sr, 'out', 580, 220, { label: 'Q̅' });
    placeExampleWires(sr, lib, [
      [srR, 0, nor1, 0],          // RESET drives the Q gate
      [nor2, 0, nor1, 1],         // feedback: Q̅ → Q gate
      [srS, 0, nor2, 0],          // SET drives the Q̅ gate
      [nor1, 0, nor2, 1],         // feedback: Q → Q̅ gate
      [nor1, 0, srQ, 0], [nor2, 0, srQb, 0],
    ]);

    // Toggle flip-flop demo on Main: clock → DFF with Q̅ wired back to D → OUT.
    const main = addCircuit(lib, 'Main', { locked: true });
    main.cam = { x: 48, y: 40, z: 1 };
    const mClk = addComp(main, 'clock', 60, 100, { label: 'CLK' });
    const mDff = addComp(main, 'dff', 320, 80);
    const mOut = addComp(main, 'out', 560, 80, { label: 'BLINK' });
    placeExampleWires(main, lib, [
      [mClk, 0, mDff, 1],
      [mDff, 1, mDff, 0],   // Q̅ → D (toggle)
      [mDff, 0, mOut, 0],
    ]);
    return { main };
  }

  /* ---- (de)serialisation ---- */

  function circuitToJSON(c) {
    return JSON.parse(JSON.stringify({
      version: 1, id: c.id, name: c.name, locked: !!c.locked,
      comps: c.comps, wires: c.wires, cam: c.cam,
    }));
  }

  function exportLib(lib, keepIds) {
    return JSON.stringify({
      app: 'digital-logic-sim-web',
      version: 1,
      circuits: lib.circuits.map((c) => circuitToJSON(c)),
    }, null, keepIds ? 2 : 2);
  }

  /* Merge imported circuits into lib; returns count added. Rewrites ids/refs. */
  function importLib(json, lib) {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    const list = Array.isArray(data) ? data : (data.circuits || []);
    if (!list.length) throw new Error('No circuits found in that file.');
    const idMap = new Map();
    const newOnes = list.map((raw) => {
      const c = JSON.parse(JSON.stringify(raw));
      const nid = uid('c');
      idMap.set(c.id, nid);
      c.id = nid;
      delete c.locked;
      return c;
    });
    for (const c of newOnes) {
      if (!Array.isArray(c.comps) || !Array.isArray(c.wires)) throw new Error('Bad circuit data.');
      for (const comp of c.comps) if (comp.type === 'chip' && idMap.has(comp.ref)) comp.ref = idMap.get(comp.ref);
      let name = String(c.name || 'Imported').slice(0, 40) || 'Imported';
      while (lib.circuits.some((x) => x.name === name)) name += ' (2)';
      c.name = name;
      if (!c.cam) c.cam = { x: 48, y: 40, z: 1 };
      lib.circuits.push(c);
    }
    return newOnes.length;
  }

  return {
    uid, BUILTINS, makeLib, addCircuit, addComp, addWire, removeComps, removeWires,
    chipPins, typeOf, dependsOn, newStates, stOf, settle, tick,
    installExamples, exportLib, importLib, circuitToJSON,
    MAX_DEPTH,
  };
})();

/* ============================== EDITOR =================================== */

const GAP = 22;          // pin spacing (world units)
const PIN_R = 5.5;
const LS_KEY = 'logic-sim.web.v1';

const COL = {
  bg: '#15161a', grid: '#23252d', gridBold: '#2c2f38',
  body: '#262932', bodyMissing: '#3d2226', edge: '#0d0e12',
  text: '#e8eaf0', dim: '#969cab', faint: '#6a707e',
  pinLow: '#3a3f4b', pinEdge: '#101218',
  wireLow: '#565c69', wireHigh: '#39e06c', sel: '#ffffff',
  accent: '#ffffff', unstable: '#ffb454',
};

function mount(root, opts) {
  opts = opts || {};
  const C = Core;

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
      const out = { circuits: lib.circuits, open: openPath, inStates: {}, seenWelcome };
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
    const circ = current();
    const r = C.settle(circ, lib, statesFor(circ.id), evByCircuit.get(circ.id));
    evByCircuit.set(circ.id, r.ev);
    stableFlag = r.stable;
    refreshStatus();
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
    const c = current();
    return JSON.stringify({ name: c.name, comps: c.comps, wires: c.wires });
  }
  function restore(snap) {
    const c = current();
    const d = JSON.parse(snap);
    if (!c.locked) c.name = d.name;
    c.comps = d.comps; c.wires = d.wires;
    evByCircuit.delete(c.id);
    settleNow(); refreshChrome(); refreshPalette(); scheduleSave();
  }
  function mutate(fn) {
    const st = stackFor(current().id);
    st.undo.push(snapshot());
    if (st.undo.length > 120) st.undo.shift();
    st.redo.length = 0;
    fn();
    settleNow(); scheduleSave();
  }
  function undo() {
    const st = stackFor(current().id);
    if (!st.undo.length) return toast('Nothing to undo');
    st.redo.push(snapshot());
    restore(st.undo.pop());
  }
  function redo() {
    const st = stackFor(current().id);
    if (!st.redo.length) return toast('Nothing to redo');
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
    <div class="ls-top">
      <div class="ls-brand" title="Digital Logic Sim — web edition">
        <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M13 2 4.6 13.2c-.3.4 0 1 .5 1h4.9l-1.2 7.2c-.1.6.7 1 1 .4l7.6-11.2c.3-.4 0-1-.5-1h-4.7l1.3-7c.1-.6-.7-1-1.1-.6z" fill="currentColor"/></svg>
        <span>Digital Logic Sim</span><em>web</em>
      </div>
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
        <button class="ls-btn" data-a="menu" title="Menu"><svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.9" fill="currentColor"/><circle cx="12" cy="12" r="1.9" fill="currentColor"/><circle cx="19" cy="12" r="1.9" fill="currentColor"/></svg></button>
      </div>
    </div>
    <div class="ls-body">
      <aside class="ls-pal">
        <div class="ls-pal-scroll"></div>
      </aside>
      <div class="ls-stage">
        <canvas class="ls-cv"></canvas>
        <div class="ls-status"></div>
        <div class="ls-hint"></div>
      </div>
    </div>
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

  /* ---------- editor state ---------- */
  let cam = null;              // alias of current().cam
  let selComps = new Set();
  let selWires = new Set();
  let hover = null;            // {kind:'pin'|'comp'|'wire', ...}
  let drag = null;
  let mouse = { x: 0, y: 0, wx: 0, wy: 0, inside: false };
  let running = false;
  let tickCount = 0;
  let spaceHeld = false;
  const undoStackKeys = () => stackFor(current().id);

  function loadCam() { cam = current().cam || (current().cam = { x: 48, y: 40, z: 1 }); }

  /* ---------- icons for palette ---------- */
  const PAL_SECTIONS = [
    { title: 'Inputs & outputs', types: ['in', 'button', 'out', 'clock', 'seg7'] },
    { title: 'Gates', types: ['and', 'or', 'xor', 'not', 'nand', 'nor'] },
    { title: 'Memory', types: ['dff'] },
  ];

  function refreshPalette() {
    let html = '';
    for (const sec of PAL_SECTIONS) {
      html += `<div class="ls-pal-sec">${sec.title}</div>`;
      for (const ty of sec.types) {
        const t = C.BUILTINS[ty];
        html += `<div class="ls-chip" data-put="${ty}" title="${t.desc || t.name}">
          <span class="ls-chip-ic"><i></i></span><span class="ls-chip-nm">${t.name}</span></div>`;
      }
    }
    const customs = lib.circuits.filter((c) => (C.chipPins(c).inputs.length || C.chipPins(c).outputs.length));
    html += `<div class="ls-pal-sec">Your chips <button class="ls-mini" data-palact="new" title="New chip">＋</button></div>`;
    if (!customs.length) html += `<div class="ls-pal-empty">Add IN and OUT pins to a circuit and it appears here as a reusable chip.</div>`;
    for (const c of customs) {
      const p = C.chipPins(c);
      html += `<div class="ls-chip ${c.id === current().id ? 'current' : ''}" data-put="chip:${c.id}" title="${c.name} — ${p.inputs.length} in / ${p.outputs.length} out">
        <span class="ls-chip-ic usr"><i></i></span><span class="ls-chip-nm">${esc(c.name)}</span>
        <span class="ls-chip-io">${p.inputs.length}·${p.outputs.length}</span>
        ${c.locked ? '' : `<button class="ls-mini ls-ren" data-ren="${c.id}" title="Rename">✎</button><button class="ls-mini ls-del" data-del="${c.id}" title="Delete">✕</button>`}
      </div>`;
    }
    palScroll.innerHTML = html;
    palScroll.querySelectorAll('.ls-chip').forEach((item) => {
      item.addEventListener('pointerdown', onPaletteDown);
    });
    palScroll.querySelector('[data-palact="new"]').onclick = () => newChipModal();
    palScroll.querySelectorAll('[data-ren]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); renameChipModal(b.dataset.ren); });
    palScroll.querySelectorAll('[data-del]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); deleteChipModal(b.dataset.del); });
  }

  function refreshCrumbs() {
    crumbsEl.innerHTML = openPath.map((id, i) => {
      const c = lib.circuits.find((x) => x.id === id);
      const last = i === openPath.length - 1;
      return `<button class="ls-crumb ${last ? 'here' : ''}" data-nav="${i}" title="${last ? 'Editing' : 'Open'} ${esc(c ? c.name : '?')}">${esc(c ? c.name : '?')}</button>${last ? '' : '<span class="ls-crumb-sep">›</span>'}`;
    }).join('') + `<button class="ls-btn ls-newchip" title="New chip"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>`;
    crumbsEl.querySelectorAll('[data-nav]').forEach((b) => b.onclick = () => { openPath.length = +b.dataset.nav + 1; enterCircuit(); });
    crumbsEl.querySelector('.ls-newchip').onclick = () => newChipModal();
  }

  function refreshStatus() {
    const c = current();
    const bits = [];
    bits.push(`<b>${stableFlag ? (running ? 'Running' : 'Paused') : '<span class="ls-warn">Unstable (oscillating)</span>'}</b>`);
    bits.push(`tick ${tickCount}`);
    bits.push(`${c.comps.length} chips · ${c.wires.length} wires`);
    if (selComps.size || selWires.size) bits.push(`${selComps.size + selWires.size} selected`);
    statusEl.innerHTML = bits.join('<span class="ls-dot">·</span>');
  }

  function refreshChrome() {
    refreshCrumbs(); refreshPalette(); refreshStatus();
  }

  let hintTimer = 0;
  function hint(msg, sticky) {
    clearTimeout(hintTimer);
    hintEl.textContent = msg || '';
    hintEl.classList.toggle('show', !!msg);
    if (msg && !sticky) hintTimer = setTimeout(() => hint('', false), 3200);
  }

  let toastTimer = 0;
  function toast(msg) {
    let t = root.querySelector('.ls-toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'ls-toast';
      root.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  /* ---------- modals ---------- */
  function openModal(build) {
    closeModal();
    const ov = document.createElement('div');
    ov.className = 'ls-ov';
    ov.innerHTML = `<div class="ls-modal" role="dialog" aria-modal="true"><div class="ls-m-title"></div><div class="ls-m-body"></div><div class="ls-m-btns"></div></div>`;
    root.appendChild(ov);
    const m = ov.querySelector('.ls-modal');
    const close = () => { ov.remove(); document.removeEventListener('keydown', onEsc, true); };
    const onEsc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    document.addEventListener('keydown', onEsc, true);
    ov.addEventListener('pointerdown', (e) => { if (e.target === ov) close(); });
    build({
      title: (t) => { m.querySelector('.ls-m-title').textContent = t; },
      body: m.querySelector('.ls-m-body'),
      buttons: m.querySelector('.ls-m-btns'),
      close,
      btn: (label, opts2) => {
        const b = document.createElement('button');
        b.className = 'ls-btn wide' + (opts2 && opts2.primary ? ' primary' : '');
        b.textContent = label;
        b.onclick = () => { if (!opts2 || !opts2.onClick || opts2.onClick(close) !== false) if (!opts2 || opts2.keepOpen !== true) close(); };
        m.querySelector('.ls-m-btns').appendChild(b);
        return b;
      },
    });
    const inp = m.querySelector('input,textarea');
    if (inp) { inp.focus(); inp.select(); }
    return close;
  }
  function closeModal() { root.querySelectorAll('.ls-ov').forEach((o) => o.remove()); }

  /* ask for a name (modal), calls cb(value) on save */
  function askName(title, value, cb) {
    openModal((m) => {
      m.title(title);
      m.body.innerHTML = `<label class="ls-lab">Name<input class="ls-in" value="${esc(value || '')}" maxlength="40"></label><div class="ls-err"></div>`;
      const inp = m.body.querySelector('input');
      const go = () => {
        const v = inp.value.trim();
        if (!v) { m.body.querySelector('.ls-err').textContent = 'Please enter a name.'; return; }
        m.close(); cb(v);
      };
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      m.btn('Cancel', {});
      m.btn('Save', { primary: true, onClick: () => { go(); return false; }, keepOpen: true });
    });
  }

  function newChipModal() {
    askName('New chip', '', (name) => {
      if (lib.circuits.some((c) => c.name === name)) return toast('A chip with that name already exists');
      const c = C.addCircuit(lib, name);
      c.cam = { x: 48, y: 40, z: 1 };
      openPath.push(c.id);
      enterCircuit();
      hint('Add IN and OUT pins — when you go back, this circuit becomes a chip.');
    });
  }

  function renameChipModal(cid) {
    const c = lib.circuits.find((x) => x.id === cid);
    if (!c || c.locked) return;
    askName('Rename chip', c.name, (name) => {
      if (lib.circuits.some((x) => x !== c && x.name === name)) return toast('Name already in use');
      const wasCurrent = current().id === cid;
      if (wasCurrent) mutate(() => { c.name = name; });
      else { c.name = name; scheduleSave(); }
      refreshChrome();
    });
  }

  function deleteChipModal(cid) {
    const c = lib.circuits.find((x) => x.id === cid);
    if (!c || c.locked) return;
    const usedIn = lib.circuits.filter((x) => x.id !== cid && x.comps.some((cp) => cp.type === 'chip' && cp.ref === cid));
    if (usedIn.length) {
      openModal((m) => {
        m.title('Chip is in use');
        m.body.innerHTML = `<p class="ls-p">“${esc(c.name)}” is placed inside <b>${esc(usedIn.map((u) => u.name).join(', '))}</b>.</p><p class="ls-p dim">Remove those placements first.</p>`;
        m.btn('OK', { primary: true });
      });
      return;
    }
    openModal((m) => {
      m.title('Delete chip');
      m.body.innerHTML = `<p class="ls-p">Delete “<b>${esc(c.name)}</b>” and its whole circuit? This cannot be undone.</p>`;
      m.btn('Cancel', {});
      m.btn('Delete', {
        primary: true, onClick: () => {
          stackBye(cid);
          lib.circuits = lib.circuits.filter((x) => x.id !== cid);
          statesByCircuit.delete(cid);
          evByCircuit.delete(cid);
          openPath = openPath.filter((id) => id !== cid);
          if (!openPath.length) openPath = [mainId];
          enterCircuit(); scheduleSave();
        },
      });
    });
  }
  function stackBye(cid) { undoByCircuit.delete(cid); }

  function exportModal() {
    openModal((m) => {
      m.title('Export circuits');
      const json = C.exportLib(lib, true);
      m.body.innerHTML = `<p class="ls-p dim">All ${lib.circuits.length} chips as JSON — save this file to keep a backup or share it.</p>
        <textarea class="ls-ta" readonly rows="9"></textarea>`;
      const ta = m.body.querySelector('textarea');
      ta.value = json;
      ta.onclick = () => ta.select();
      m.btn('Download .json', {
        primary: true, onClick: () => {
          const blob = new Blob([json], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'logic-sim-circuits.json';
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        },
      });
      m.btn('Close', {});
    });
  }

  function importModal() {
    openModal((m) => {
      m.title('Import circuits');
      m.body.innerHTML = `<p class="ls-p dim">Paste an exported .json, or choose a file. Circuits are merged; name clashes get “(2)”.</p>
        <textarea class="ls-ta" rows="7" placeholder='{"app":"digital-logic-sim-web", …}'></textarea>
        <div class="ls-err"></div>
        <label class="ls-btn wide file">Choose file…<input type="file" accept=".json,application/json" hidden></label>`;
      const ta = m.body.querySelector('textarea');
      const err = m.body.querySelector('.ls-err');
      const fileIn = m.body.querySelector('input[type=file]');
      fileIn.onchange = () => {
        const f = fileIn.files[0];
        if (!f) return;
        const rd = new FileReader();
        rd.onload = () => { ta.value = String(rd.result || ''); };
        rd.readAsText(f);
      };
      const doImport = () => {
        try {
          const n = C.importLib(ta.value, lib);
          enterCircuit(); scheduleSave();
          toast(`Imported ${n} chip${n === 1 ? '' : 's'}`);
          m.close();
        } catch (e2) { err.textContent = e2.message || 'Could not import that file.'; }
      };
      m.btn('Cancel', {});
      m.btn('Import', { primary: true, onClick: () => { doImport(); return false; }, keepOpen: true });
    });
  }

  function helpModal() {
    openModal((m) => {
      m.title('Controls');
      m.body.innerHTML = `
      <div class="ls-help">
        <div><b>Place a chip</b><span>Drag it in from the left panel (or click the panel item)</span></div>
        <div><b>Wire pins</b><span>Drag from an output pin (right) to an input pin (left) — or the other way round</span></div>
        <div><b>Toggle inputs</b><span>Click an IN switch; hold PUSH; clock ticks while running</span></div>
        <div><b>Move</b><span>Drag chips · drag empty space for a selection box · Space/middle/right-drag pans</span></div>
        <div><b>Zoom</b><span>Mouse wheel, or toolbar; “fit” frames the whole circuit</span></div>
        <div><b>Delete</b><span>Right-click a chip or wire, or select and press Delete</span></div>
        <div><b>Edit a chip</b><span>Double-click a placed chip to step inside it; use the breadcrumb to come back</span></div>
        <div><b>Name pins</b><span>Double-click IN / OUT / CLOCK to rename — that name shows on the chip</span></div>
        <div><b>Shortcuts</b><span>Ctrl+Z / Ctrl+Y undo·redo · Ctrl+C/V copy·paste · Ctrl+D duplicate · Ctrl+A select all · Space run·pause · Enter single tick</span></div>
        <div><b>Sequential logic</b><span>D flip-flops latch D on a rising clock edge each tick. Feedback without a flip-flop can oscillate (marked “Unstable”).</span></div>
      </div>`;
      m.btn('Close', { primary: true });
    });
  }

  function aboutModal() {
    openModal((m) => {
      m.title('About');
      m.body.innerHTML = `
      <div class="ls-about">
        <p><b>Digital Logic Sim — web edition.</b> Design circuits from logic gates, save them as chips, nest chips inside chips, and watch signals flow — all in the browser, saved on this device.</p>
        <p class="dim">Inspired by <b>Sebastian Lague’s</b> <i>Digital Logic Sim</i> (MIT licence) — <a href="https://github.com/SebLague/Digital-Logic-Sim" target="_blank" rel="noopener">github.com/SebLague/Digital-Logic-Sim</a> — and his video series <i>Exploring How Computers Work</i>. This is an independent re-implementation for the web: no Unity project files or assets were used, so it runs anywhere, including inside <b>proton</b> as an app and a built-in website.</p>
        <p class="dim">The starter library (Half Adder, Full Adder, SR Latch, and the blinking Main demo) mirrors the classic teaching examples. Everything you make is stored in localStorage and can be exported as JSON from the ⋯ menu.</p>
      </div>`;
      m.btn('Close', { primary: true });
    });
  }

  function welcomeModal() {
    openModal((m) => {
      m.title('Welcome to Digital Logic Sim');
      m.body.innerHTML = `
      <div class="ls-about">
        <p>A web edition of Sebastian Lague’s logic simulator, converted to run as a website <i>and</i> a proton app.</p>
        <p>Try it: press <b>▶ Run</b> — the demo on <b>Main</b> blinks. Then open <b>Full Adder</b> from the left panel, step inside its chips with a double-click, and toggle the input switches.</p>
        <p class="dim">Build chips from IN/OUT pins + gates and they appear in “Your chips”, ready to nest inside other circuits. Everything autosaves on this device.</p>
      </div>`;
      m.btn('Start building', { primary: true, onClick: () => { seenWelcome = true; scheduleSave(); } });
    });
  }

  /* ---------- toolbar wiring ---------- */
  const actions = {
    undo, redo,
    step: () => { doTick(); hint('Tick ' + tickCount); },
    run: () => setRunning(!running),
    zin: () => zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, 1.2),
    zout: () => zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, 1 / 1.2),
    z100: () => { cam.z = 1; scheduleSave(); updateZoomLabel(); },
    fit: fitView,
    menu: openMenu,
  };
  root.querySelectorAll('[data-a]').forEach((b) => {
    b.addEventListener('click', () => { const fn = actions[b.dataset.a]; if (fn) fn(); });
  });
  speedInput.addEventListener('input', () => {
    speedLabel.textContent = speedInput.value + ' tps';
    restartTimer();
  });

  function openMenu() {
    const existing = root.querySelector('.ls-pop');
    if (existing) { existing.remove(); return; }
    const pop = document.createElement('div');
    pop.className = 'ls-pop';
    const cur = current();
    pop.innerHTML = `
      <button data-m="new"><b>New chip…</b><span>start a fresh circuit</span></button>
      <button data-m="ren" ${cur.locked ? 'disabled' : ''}><b>Rename “${esc(cur.name)}”…</b><span>${cur.locked ? 'Main cannot be renamed' : 'rename the open chip'}</span></button>
      <button data-m="del" ${cur.locked ? 'disabled' : ''}><b>Delete “${esc(cur.name)}”…</b><span>${cur.locked ? 'Main cannot be deleted' : 'remove this chip'}</span></button>
      <hr>
      <button data-m="export"><b>Export circuits…</b><span>download everything as JSON</span></button>
      <button data-m="import"><b>Import circuits…</b><span>merge a JSON file</span></button>
      <hr>
      <button data-m="help"><b>Controls &amp; help</b><span>shortcuts and how-tos</span></button>
      <button data-m="about"><b>About / credits</b><span>Sebastian Lague, MIT, this port</span></button>`;
    root.querySelector('.ls-top').appendChild(pop);
    const close = (e) => { if (!pop.contains(e.target)) { pop.remove(); document.removeEventListener('pointerdown', close, true); } };
    document.addEventListener('pointerdown', close, true);
    const fns = {
      new: () => newChipModal(), ren: () => renameChipModal(current().id), del: () => deleteChipModal(current().id),
      export: exportModal, import: importModal, help: helpModal, about: aboutModal,
    };
    pop.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => { pop.remove(); const f = fns[b.dataset.m]; if (f && !b.disabled) f(); }));
  }

  /* ---------- run loop ---------- */
  let runTimer = 0;
  function tps() { return +speedInput.value; }
  function restartTimer() {
    clearInterval(runTimer);
    if (running) {
      runTimer = setInterval(() => {
        const n = Math.max(1, Math.round(tps() / 12));
        for (let i = 0; i < n; i++) doTick(true);
        refreshStatus();
      }, 82);
    }
  }
  function setRunning(v) {
    running = v;
    const btn = root.querySelector('[data-a="run"]');
    btn.classList.toggle('on', v);
    btn.querySelector('.i-play').style.display = v ? 'none' : '';
    btn.querySelector('.i-pause').style.display = v ? '' : 'none';
    restartTimer();
    refreshStatus();
  }
  function doTick(quiet) {
    const circ = current();
    const r = C.tick(circ, lib, statesFor(circ.id), evByCircuit.get(circ.id));
    evByCircuit.set(circ.id, r.ev);
    stableFlag = r.stable;
    tickCount++;
    if (!quiet) refreshStatus();
  }

  /* ---------- canvas sizing ---------- */
  let dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  function layout() {
    dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const w = stage.clientWidth, h = stage.clientHeight;
    cv.width = Math.max(1, Math.round(w * dpr));
    cv.height = Math.max(1, Math.round(h * dpr));
  }
  const ro = new ResizeObserver(() => { layout(); });
  ro.observe(stage);
  window.addEventListener('resize', layout);

  /* ---------- coordinate helpers ---------- */
  const s2w = (px, py) => ({ x: (px - cam.x) / cam.z, y: (py - cam.y) / cam.z });
  const w2s = (wx, wy) => ({ x: wx * cam.z + cam.x, y: wy * cam.z + cam.y });
  function eventPos(e) {
    const r = cv.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function updateZoomLabel() {
    root.querySelector('.ls-zoomv').textContent = Math.round(cam.z * 100) + '%';
  }
  function zoomAt(px, py, factor) {
    const z0 = cam.z;
    const z1 = Math.min(2.6, Math.max(0.24, z0 * factor));
    if (z1 === z0) return;
    const w = s2w(px, py);
    cam.z = z1;
    cam.x = px - w.x * z1;
    cam.y = py - w.y * z1;
    updateZoomLabel();
    scheduleSave();
  }
  function fitView() {
    const c = current();
    if (!c.comps.length) { cam.x = stage.clientWidth / 2 - 100; cam.y = stage.clientHeight / 2 - 80; cam.z = 1; updateZoomLabel(); return; }
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const comp of c.comps) {
      const t = C.typeOf(comp, lib), g = compGeom(t);
      x0 = Math.min(x0, comp.x); y0 = Math.min(y0, comp.y);
      x1 = Math.max(x1, comp.x + g.w); y1 = Math.max(y1, comp.y + g.h);
    }
    const pad = 70;
    const w = Math.max(80, x1 - x0 + pad * 2), h = Math.max(60, y1 - y0 + pad * 2);
    cam.z = Math.min(2, Math.max(0.24, Math.min(stage.clientWidth / w, stage.clientHeight / h)));
    cam.x = stage.clientWidth / 2 - ((x0 + x1) / 2) * cam.z;
    cam.y = stage.clientHeight / 2 - ((y0 + y1) / 2) * cam.z;
    updateZoomLabel();
    scheduleSave();
  }

  /* ---------- hit testing ---------- */
  function hitTest(wx, wy) {
    const c = current();
    const tol = 7 / Math.min(1, cam.z) + 2;
    // pins first
    for (let i = c.comps.length - 1; i >= 0; i--) {
      const comp = c.comps[i];
      const t = C.typeOf(comp, lib);
      for (let p = 0; p < t.ins.length; p++) {
        const pp = pinPos(comp, t, 'in', p);
        if (Math.hypot(wx - pp.x, wy - pp.y) <= tol) return { kind: 'pin', comp, t, io: 'in', p, x: pp.x, y: pp.y };
      }
      for (let p = 0; p < t.outs.length; p++) {
        const pp = pinPos(comp, t, 'out', p);
        if (Math.hypot(wx - pp.x, wy - pp.y) <= tol) return { kind: 'pin', comp, t, io: 'out', p, x: pp.x, y: pp.y };
      }
    }
    for (let i = c.comps.length - 1; i >= 0; i--) {
      const comp = c.comps[i];
      const t = C.typeOf(comp, lib), g = compGeom(t);
      if (wx >= comp.x && wx <= comp.x + g.w && wy >= comp.y && wy <= comp.y + g.h) return { kind: 'comp', comp, t };
    }
    for (const w of c.wires) {
      if (wireDist(w, wx, wy) <= 7 / cam.z + 3) return { kind: 'wire', wire: w };
    }
    return null;
  }
  function wireEndpoints(w) {
    const c = current();
    const fc = c.comps.find((x) => x.id === w.f.c);
    const tc = c.comps.find((x) => x.id === w.t.c);
    if (!fc || !tc) return null;
    const ft = C.typeOf(fc, lib), tt = C.typeOf(tc, lib);
    return { a: pinPos(fc, ft, 'out', w.f.p), b: pinPos(tc, tt, 'in', w.t.p) };
  }
  function wireDist(w, wx, wy) {
    const ep = wireEndpoints(w);
    if (!ep) return 1e9;
    let best = 1e9;
    let prev = ep.a;
    for (let i = 1; i <= 24; i++) {
      const t = i / 24;
      const p = bez(ep.a, ep.b, t);
      best = Math.min(best, distSeg(prev, p, { x: wx, y: wy }));
      prev = p;
    }
    return best;
  }
  function bez(a, b, t) {
    const d = Math.max(30, Math.min(170, Math.abs(b.x - a.x) * 0.55));
    const mt = 1 - t;
    const x = mt * mt * mt * a.x + 3 * mt * mt * t * (a.x + d) + 3 * mt * t * t * (b.x - d) + t * t * t * b.x;
    const y = mt * mt * mt * a.y + 3 * mt * mt * t * a.y + 3 * mt * t * t * b.y + t * t * t * b.y;
    return { x, y };
  }
  function distSeg(a, b, p) {
    const vx = b.x - a.x, vy = b.y - a.y;
    const len2 = vx * vx + vy * vy || 1e-9;
    let t = ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy));
  }

  /* ---------- palette drag ---------- */
  let palGhost = null;
  function onPaletteDown(e) {
    if (e.target.closest('.ls-mini')) return;
    e.preventDefault();
    const put = e.currentTarget.dataset.put;
    const label = e.currentTarget.querySelector('.ls-chip-nm').textContent;
    palGhost = document.createElement('div');
    palGhost.className = 'ls-ghost';
    palGhost.textContent = label;
    document.body.appendChild(palGhost);
    moveGhost(e);
    let moved = false;
    const move = (ev) => { moved = moved || Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) > 5; moveGhost(ev); };
    const up = (ev) => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      palGhost.remove(); palGhost = null;
      const r = cv.getBoundingClientRect();
      let px, py;
      if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
        px = ev.clientX - r.left; py = ev.clientY - r.top;
      } else if (!moved) {
        px = stage.clientWidth / 2; py = stage.clientHeight / 2;
      } else { return; }
      const w = s2w(px, py);
      placeFromPalette(put, w.x - 40, w.y - 25);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  }
  function moveGhost(e) { if (palGhost) { palGhost.style.left = e.clientX + 12 + 'px'; palGhost.style.top = e.clientY + 14 + 'px'; } }

  function placeFromPalette(put, wx, wy) {
    mutate(() => {
      let comp = null;
      if (put.startsWith('chip:')) {
        const ref = put.slice(5);
        if (C.dependsOn(lib, ref, current().id)) {
          toast('That chip already contains this one — nesting would loop forever');
          return;
        }
        comp = C.addComp(current(), 'chip', wx, wy, { ref });
      } else {
        comp = C.addComp(current(), put, wx, wy);
      }
      selComps = new Set([comp.id]); selWires.clear();
      refreshPalette();
    });
  }

  /* ---------- canvas interaction ---------- */
  cv.style.touchAction = 'none';
  cv.tabIndex = 0;
  cv.addEventListener('contextmenu', (e) => e.preventDefault());

  cv.addEventListener('pointerdown', (e) => {
    cv.focus();
    closeModal();
    const p = eventPos(e);
    const w = s2w(p.x, p.y);
    mouse = { x: p.x, y: p.y, wx: w.x, wy: w.y, inside: true };
    const hit = hitTest(w.x, w.y);

    if (e.button === 1 || (e.button === 0 && spaceHeld)) {
      drag = { kind: 'pan', sx: p.x, sy: p.y, ox: cam.x, oy: cam.y };
      cv.setPointerCapture(e.pointerId);
      return;
    }
    if (e.button === 2) {
      drag = { kind: 'rmb', sx: p.x, sy: p.y, ox: cam.x, oy: cam.y, moved: false, hit };
      cv.setPointerCapture(e.pointerId);
      return;
    }
    if (e.button !== 0) return;

    if (hit && hit.kind === 'pin') {
      drag = { kind: 'wire', from: hit, cx: w.x, cy: w.y, valid: null };
      hint(hit.io === 'out' ? 'Release on an input pin to connect' : 'Release on an output pin to connect', true);
      cv.setPointerCapture(e.pointerId);
      return;
    }
    if (hit && hit.kind === 'comp') {
      const cmp = hit.comp;
      if (cmp.type === 'in') {
        drag = { kind: 'maybe-toggle', comp: cmp, sx: p.x, sy: p.y };
        return;
      }
      if (cmp.type === 'button') {
        mutate(() => { C.stOf(statesFor(current().id), cmp).val = 1; });
        drag = { kind: 'hold-button', comp: cmp };
        return;
      }
      const already = selComps.has(cmp.id);
      if (e.shiftKey) {
        if (already) selComps.delete(cmp.id); else selComps.add(cmp.id);
        refreshStatus();
        drag = { kind: 'nothing' };
        return;
      }
      if (!already) { selComps = new Set([cmp.id]); selWires.clear(); refreshStatus(); }
      drag = { kind: 'move', sx: w.x, sy: w.y, started: false, orig: new Map([...selComps].map((id) => {
        const c = current().comps.find((x) => x.id === id);
        return [id, { x: c.x, y: c.y }];
      })), snap: snapshot() };
      cv.setPointerCapture(e.pointerId);
      return;
    }
    if (hit && hit.kind === 'wire') {
      selWires = new Set([hit.wire.id]); selComps.clear();
      refreshStatus();
      drag = { kind: 'nothing' };
      return;
    }
    // empty: marquee select
    drag = { kind: 'marquee', x0: w.x, y0: w.y, x1: w.x, y1: w.y, additive: e.shiftKey };
    if (!e.shiftKey) { selComps.clear(); selWires.clear(); refreshStatus(); }
    cv.setPointerCapture(e.pointerId);
  });

  cv.addEventListener('pointermove', (e) => {
    const p = eventPos(e);
    const w = s2w(p.x, p.y);
    mouse = { x: p.x, y: p.y, wx: w.x, wy: w.y, inside: true };
    if (!drag) { hover = hitTest(w.x, w.y); return; }
    switch (drag.kind) {
      case 'pan': case 'rmb': {
        if (Math.hypot(p.x - drag.sx, p.y - drag.sy) > 4) drag.moved = true;
        if (drag.kind === 'pan' || drag.moved) {
          cam.x = drag.ox + (p.x - drag.sx);
          cam.y = drag.oy + (p.y - drag.sy);
        }
        break;
      }
      case 'wire': {
        drag.cx = w.x; drag.cy = w.y;
        const h = hitTest(w.x, w.y);
        drag.valid = (h && h.kind === 'pin' && h.io !== drag.from.io
          && !(h.comp.id === drag.from.comp.id && h.p === drag.from.p)) ? h : null;
        break;
      }
      case 'maybe-toggle': {
        if (Math.hypot(p.x - drag.sx, p.y - drag.sy) > 4) {
          // became a move
          selComps = new Set([drag.comp.id]); selWires.clear();
          const ww = s2w(drag.sx, drag.sy);
          drag = { kind: 'move', sx: ww.x, sy: ww.y, started: false, orig: new Map([[drag.comp.id, { x: drag.comp.x, y: drag.comp.y }]]), snap: snapshot() };
        }
        break;
      }
      case 'move': {
        const dx = Math.round((w.x - drag.sx) / 2) * 2;
        const dy = Math.round((w.y - drag.sy) / 2) * 2;
        if (!drag.started && (dx || dy)) { startUndoFrom(drag.snap); drag.started = true; }
        if (drag.started) {
          for (const [id, o] of drag.orig) {
            const c = current().comps.find((x) => x.id === id);
            if (c) { c.x = o.x + dx; c.y = o.y + dy; }
          }
        }
        break;
      }
      case 'marquee': { drag.x1 = w.x; drag.y1 = w.y; break; }
    }
  });

  function startUndoFrom(snap) {
    const st = stackFor(current().id);
    st.undo.push(snap);
    if (st.undo.length > 120) st.undo.shift();
    st.redo.length = 0;
  }

  function endDrag(e) {
    const d = drag; drag = null;
    hint('', false);
    if (!d) return;
    switch (d.kind) {
      case 'rmb': {
        if (!d.moved && d.hit) {
          if (d.hit.kind === 'comp') mutate(() => { C.removeComps(current(), new Set([d.hit.comp.id])); selComps.delete(d.hit.comp.id); refreshPalette(); });
          else if (d.hit.kind === 'wire') mutate(() => { C.removeWires(current(), new Set([d.hit.wire.id])); selWires.delete(d.hit.wire.id); });
          refreshStatus();
        }
        scheduleSave();
        break;
      }
      case 'pan': scheduleSave(); break;
      case 'wire': {
        if (d.valid) {
          const out = d.from.io === 'out' ? d.from : d.valid;
          const inp = d.from.io === 'in' ? d.from : d.valid;
          mutate(() => {
            C.addWire(current(), lib, { c: out.comp.id, p: out.p }, { c: inp.comp.id, p: inp.p });
          });
        }
        break;
      }
      case 'maybe-toggle': {
        mutateToggle(d.comp);
        break;
      }
      case 'hold-button': {
        mutate(() => { C.stOf(statesFor(current().id), d.comp).val = 0; });
        break;
      }
      case 'move': {
        if (d.started) { settleNow(); scheduleSave(); refreshPalette(); }
        break;
      }
      case 'marquee': {
        const r = normRect(d);
        let added = false;
        for (const comp of current().comps) {
          const t = C.typeOf(comp, lib), g = compGeom(t);
          if (comp.x < r.x1 && comp.x + g.w > r.x0 && comp.y < r.y1 && comp.y + g.h > r.y0) { selComps.add(comp.id); added = true; }
        }
        for (const w of current().wires) {
          const ep = wireEndpoints(w);
          if (!ep) continue;
          if (pointInRect(ep.a, r) && pointInRect(ep.b, r)) { selWires.add(w.id); added = true; }
        }
        if (added) refreshStatus();
        break;
      }
    }
  }
  cv.addEventListener('pointerup', endDrag);
  cv.addEventListener('pointercancel', () => { drag = null; hint('', false); });
  cv.addEventListener('pointerleave', () => { mouse.inside = false; hover = null; });

  function mutateToggle(comp) {
    const st = statesFor(current().id);
    const s = C.stOf(st, comp);
    s.val = s.val ? 0 : 1;
    settleNow(); scheduleSave();
  }

  function normRect(d) {
    return { x0: Math.min(d.x0, d.x1), y0: Math.min(d.y0, d.y1), x1: Math.max(d.x0, d.x1), y1: Math.max(d.y0, d.y1) };
  }
  const pointInRect = (p, r) => p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1;

  cv.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = eventPos(e);
    zoomAt(p.x, p.y, e.deltaY < 0 ? 1.12 : 1 / 1.12);
  }, { passive: false });

  cv.addEventListener('dblclick', (e) => {
    const p = eventPos(e);
    const w = s2w(p.x, p.y);
    const hit = hitTest(w.x, w.y);
    if (hit && hit.kind === 'comp') {
      const cmp = hit.comp;
      if (cmp.type === 'chip' && !C.typeOf(cmp, lib).missing) {
        openPath.push(cmp.ref);
        enterCircuit();
      } else if (cmp.type === 'in' || cmp.type === 'out' || cmp.type === 'clock' || cmp.type === 'button') {
        askName('Pin name', cmp.label || '', (v) => {
          mutate(() => { cmp.label = v; });
          refreshPalette();
        });
      }
    } else if (!hit && openPath.length > 1) {
      openPath.pop();
      enterCircuit();
    }
  });

  function enterCircuit() {
    loadCam();
    selComps.clear(); selWires.clear(); hover = null; drag = null;
    updateZoomLabel();
    settleNow();
    refreshChrome();
    scheduleSave();
  }

  /* ---------- clipboard & keyboard ---------- */
  let clipboard = null;
  let pasteCount = 0;

  function copySelection() {
    if (!selComps.size) return;
    const circ = current();
    const comps = circ.comps.filter((c) => selComps.has(c.id)).map((c) => ({ ...c }));
    const wires = circ.wires.filter((w) => selComps.has(w.f.c) && selComps.has(w.t.c)).map((w) => ({ ...w }));
    clipboard = { comps, wires };
    pasteCount = 0;
    toast(`Copied ${comps.length} chip${comps.length === 1 ? '' : 's'}`);
  }
  function pasteClipboard(duplicate) {
    if (!clipboard || !clipboard.comps.length) return;
    pasteCount++;
    const off = 26 * (duplicate ? 1 : pasteCount);
    const idMap = new Map();
    mutate(() => {
      selComps.clear(); selWires.clear();
      for (const c of clipboard.comps) {
        const nc = { ...c, id: C.uid('x'), x: c.x + off, y: c.y + off };
        idMap.set(c.id, nc.id);
        current().comps.push(nc);
        selComps.add(nc.id);
      }
      for (const w of clipboard.wires) {
        current().wires.push({
          id: C.uid('w'),
          f: { c: idMap.get(w.f.c), p: w.f.p },
          t: { c: idMap.get(w.t.c), p: w.t.p },
        });
      }
    });
  }

  function onKey(e) {
    if (!root.isConnected) return;
    if (e.target.closest('input,textarea,select,[contenteditable]')) return;
    if (root.querySelector('.ls-ov')) return;
    /* only handle when this editor has focus (or the pointer is over its canvas
     * and nothing else has focus) — important when embedded in a proton window */
    const ae = document.activeElement;
    const focusInside = ae && root.contains(ae);
    const freeFocus = !ae || ae === document.body;
    if (!focusInside && !(freeFocus && mouse.inside)) return;
    const k = e.key;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && !e.shiftKey && k.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
    if (mod && (k.toLowerCase() === 'y' || (e.shiftKey && k.toLowerCase() === 'z'))) { e.preventDefault(); redo(); return; }
    if (mod && k.toLowerCase() === 'c') { copySelection(); return; }
    if (mod && k.toLowerCase() === 'v') { pasteClipboard(false); return; }
    if (mod && k.toLowerCase() === 'd') {
      e.preventDefault();
      if (!selComps.size) return;
      copySelection(); pasteClipboard(true); return;
    }
    if (mod && k.toLowerCase() === 'a') {
      e.preventDefault();
      selComps = new Set(current().comps.map((c) => c.id));
      selWires = new Set(current().wires.map((w) => w.id));
      refreshStatus(); return;
    }
    if (k === 'Delete' || k === 'Backspace') {
      if (!selComps.size && !selWires.size) return;
      e.preventDefault();
      mutate(() => {
        if (selComps.size) C.removeComps(current(), selComps);
        if (selWires.size) C.removeWires(current(), selWires);
        selComps.clear(); selWires.clear();
        refreshPalette();
      });
      refreshStatus();
      return;
    }
    if (k === ' ') { e.preventDefault(); if (!spaceHeld) setRunning(!running); spaceHeld = true; return; }
    if (k === 'Enter') { e.preventDefault(); doTick(); return; }
    if (k === 'Escape') { selComps.clear(); selWires.clear(); refreshStatus(); }
  }
  function onKeyUp(e) { if (e.key === ' ') spaceHeld = false; }
  document.addEventListener('keydown', onKey);
  document.addEventListener('keyup', onKeyUp);

  /* ---------- drawing ---------- */
  let alive = true;
  function draw() {
    if (!alive) return;
    if (!root.isConnected) { alive = false; return; }  // stop when window/site is closed
    requestAnimationFrame(draw);
    const w = cv.width, h = cv.height;
    if (!w || !h || !cam) return;
    const g2 = ctx2d;
    g2.setTransform(dpr, 0, 0, dpr, 0, 0);
    g2.clearRect(0, 0, w / dpr, h / dpr);
    g2.fillStyle = COL.bg;
    g2.fillRect(0, 0, w / dpr, h / dpr);

    g2.setTransform(dpr * cam.z, 0, 0, dpr * cam.z, dpr * cam.x, dpr * cam.y);
    drawGrid(g2);

    const circ = current();
    const ev = evByCircuit.get(circ.id);

    // wires under chips
    for (const wire of circ.wires) drawWire(g2, wire, ev);
    if (drag && drag.kind === 'wire') drawWireDraft(g2, drag);

    for (const comp of circ.comps) drawComp(g2, comp, ev);

    if (drag && drag.kind === 'marquee') {
      const r = normRect(drag);
      g2.fillStyle = 'rgba(255,255,255,.055)';
      g2.strokeStyle = 'rgba(255,255,255,.65)';
      g2.lineWidth = 1 / cam.z;
      g2.setLineDash([5 / cam.z, 4 / cam.z]);
      g2.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
      g2.strokeRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
      g2.setLineDash([]);
    }

    // empty-circuit hint
    if (!circ.comps.length) {
      g2.fillStyle = COL.faint;
      g2.font = '15px system-ui, sans-serif';
      g2.textAlign = 'center';
      g2.fillText('Drag chips in from the left panel — add IN and OUT pins to make this a reusable chip.', (stage.clientWidth / 2 - cam.x) / cam.z, (stage.clientHeight / 2 - cam.y) / cam.z);
    }
  }

  function drawGrid(g2) {
    const step = 24;
    const x0 = Math.floor((-cam.x / cam.z) / step) * step;
    const y0 = Math.floor((-cam.y / cam.z) / step) * step;
    const x1 = x0 + stage.clientWidth / cam.z + step * 2;
    const y1 = y0 + stage.clientHeight / cam.z + step * 2;
    g2.fillStyle = COL.grid;
    const r = Math.max(0.8, 1.15 / cam.z);
    for (let x = x0; x <= x1; x += step) {
      for (let y = y0; y <= y1; y += step) {
        g2.beginPath();
        g2.arc(x, y, r, 0, 7);
        g2.fill();
      }
    }
  }

  function signalAt(ev, cid, p) {
    const e = ev && ev.get(cid);
    return e && e.outs[p] ? 1 : 0;
  }

  function drawWire(g2, wire, ev) {
    const ep = wireEndpoints(wire);
    if (!ep) return;
    const hi = signalAt(ev, wire.f.c, wire.f.p);
    const sel = selWires.has(wire.id);
    const d = Math.max(30, Math.min(170, Math.abs(ep.b.x - ep.a.x) * 0.55));
    g2.beginPath();
    g2.moveTo(ep.a.x, ep.a.y);
    g2.bezierCurveTo(ep.a.x + d, ep.a.y, ep.b.x - d, ep.b.y, ep.b.x, ep.b.y);
    if (hi) { g2.shadowColor = 'rgba(57,224,108,.55)'; g2.shadowBlur = 7; }
    g2.strokeStyle = sel ? '#ffffff' : hi ? COL.wireHigh : COL.wireLow;
    g2.lineWidth = (hi ? 3.4 : 2.6) + (sel ? 1 : 0);
    g2.lineCap = 'round';
    g2.stroke();
    g2.shadowBlur = 0;
  }

  function drawWireDraft(g2, d) {
    const from = d.from;
    const a = { x: from.x, y: from.y };
    const b = d.valid ? { x: d.valid.x, y: d.valid.y } : { x: d.cx, y: d.cy };
    const dd = Math.max(30, Math.min(170, Math.abs(b.x - a.x) * 0.55));
    g2.beginPath();
    if (from.io === 'out') {
      g2.moveTo(a.x, a.y);
      g2.bezierCurveTo(a.x + dd, a.y, b.x - dd, b.y, b.x, b.y);
    } else {
      g2.moveTo(b.x, b.y);
      g2.bezierCurveTo(b.x + dd, b.y, a.x - dd, a.y, a.x, a.y);
    }
    g2.strokeStyle = d.valid ? '#ffffff' : 'rgba(255,255,255,.4)';
    g2.lineWidth = 2.6;
    g2.setLineDash(d.valid ? [] : [7, 6]);
    g2.stroke();
    g2.setLineDash([]);
  }

  function rrect(g2, x, y, w, h, r) {
    g2.beginPath();
    g2.moveTo(x + r, y);
    g2.arcTo(x + w, y, x + w, y + h, r);
    g2.arcTo(x + w, y + h, x, y + h, r);
    g2.arcTo(x, y + h, x, y, r);
    g2.arcTo(x, y, x + w, y, r);
    g2.closePath();
  }

  function drawComp(g2, comp, ev) {
    const t = C.typeOf(comp, lib);
    const g = compGeom(t);
    const e = ev && ev.get(comp.id);
    const sel = selComps.has(comp.id);
    const hov = hover && hover.kind === 'comp' && hover.comp.id === comp.id;

    g2.save();
    // body
    g2.shadowColor = 'rgba(0,0,0,.45)';
    g2.shadowBlur = 10;
    g2.shadowOffsetY = 3;
    rrect(g2, comp.x, comp.y, g.w, g.h, 8);
    g2.fillStyle = t.missing ? COL.bodyMissing : COL.body;
    g2.fill();
    g2.shadowColor = 'transparent';
    g2.shadowBlur = 0;
    g2.shadowOffsetY = 0;
    g2.lineWidth = 1.4;
    g2.strokeStyle = COL.edge;
    g2.stroke();
    if (sel || hov) {
      g2.lineWidth = sel ? 2.2 : 1.4;
      g2.strokeStyle = sel ? COL.sel : 'rgba(255,255,255,.35)';
      rrect(g2, comp.x - 1.6, comp.y - 1.6, g.w + 3.2, g.h + 3.2, 9);
      g2.stroke();
    }

    const cx = comp.x + g.w / 2;

    // face per type
    switch (t.key) {
      case 'in': case 'button': case 'clock': {
        g2.fillStyle = COL.dim;
        g2.font = '600 10px system-ui, sans-serif';
        g2.textAlign = 'center';
        const lbl = comp.label || t.name;
        g2.fillText(clipText(g2, lbl, g.w - 12), cx, comp.y + 14);
        if (t.key === 'in') {
          const on = e ? e.outs[0] : 0;
          const tw = 34, th = 16, tx = cx - tw / 2, ty = comp.y + g.h - th - 9;
          rrect(g2, tx, ty, tw, th, th / 2);
          g2.fillStyle = on ? COL.wireHigh : '#40454f';
          if (on) { g2.shadowColor = 'rgba(57,224,108,.5)'; g2.shadowBlur = 8; }
          g2.fill();
          g2.shadowBlur = 0;
          g2.beginPath();
          g2.arc(tx + (on ? tw - th / 2 - 1.4 : th / 2 + 1.4), ty + th / 2, th / 2 - 2.6, 0, 7);
          g2.fillStyle = on ? '#0c2415' : '#c9ced8';
          g2.fill();
        } else if (t.key === 'button') {
          const on = e ? e.outs[0] : 0;
          const s = 14, bx = cx - s, by = comp.y + 16 + (on ? 2 : 0);
          rrect(g2, bx, by, s * 2, s * 2, 5);
          g2.fillStyle = on ? COL.wireHigh : '#3a3f49';
          g2.fill();
          g2.lineWidth = 2;
          g2.strokeStyle = '#14161b';
          g2.stroke();
        } else {
          const on = e ? e.outs[0] : 0;
          const bx = cx - 17, by = comp.y + g.h - 27, bw = 34, bh = 15;
          g2.beginPath();
          g2.moveTo(bx + 1, by + bh);
          g2.lineTo(bx + 1, by + (on ? 1 : bh - 6));
          g2.lineTo(bx + bw / 2 - 2, by + (on ? 1 : bh - 6));
          g2.lineTo(bx + bw / 2 + 2, by + (on ? bh - 6 : 1));
          g2.lineTo(bx + bw - 1, by + (on ? bh - 6 : 1));
          g2.lineTo(bx + bw - 1, by + bh);
          g2.lineWidth = 2;
          g2.strokeStyle = on ? COL.wireHigh : COL.dim;
          g2.stroke();
        }
        break;
      }
      case 'out': {
        const v = e ? e.ins[0] : 0;
        if (comp.label) {
          g2.fillStyle = COL.dim;
          g2.font = '600 10px system-ui, sans-serif';
          g2.textAlign = 'center';
          g2.fillText(clipText(g2, comp.label, g.w - 10), cx, comp.y + 13);
        }
        const ry = comp.y + g.h / 2 + (comp.label ? 6 : 1);
        if (v) { g2.shadowColor = 'rgba(57,224,108,.65)'; g2.shadowBlur = 12; }
        g2.beginPath();
        g2.arc(cx - 8, ry, 9.4, 0, 7);
        g2.fillStyle = v ? COL.wireHigh : '#14161b';
        g2.fill();
        g2.shadowBlur = 0;
        g2.lineWidth = 2;
        g2.strokeStyle = v ? '#5df28c' : '#454a55';
        g2.stroke();
        if (v) {
          g2.fillStyle = '#0c2415';
          g2.font = '700 8px system-ui, sans-serif';
          g2.textAlign = 'center';
          g2.fillText('1', cx - 8, ry + 3);
        }
        break;
      }
      case 'seg7': {
        g2.fillStyle = COL.text;
        g2.font = '600 10px system-ui, sans-serif';
        g2.textAlign = 'center';
        g2.fillText('7-SEG', cx - 12, comp.y + 13);
        drawSeg7(g2, comp.x + g.w - 58, comp.y + 16, 44, g.h - 26, e ? e.ins : []);
        break;
      }
      case 'dff': {
        g2.fillStyle = COL.text;
        g2.font = '650 11px system-ui, sans-serif';
        g2.textAlign = 'center';
        g2.fillText(t.name, cx, comp.y + 13);
        // clock triangle
        const cp = pinPos(comp, t, 'in', 1);
        g2.beginPath();
        g2.moveTo(cp.x + 3, cp.y - 5);
        g2.lineTo(cp.x + 11, cp.y);
        g2.lineTo(cp.x + 3, cp.y + 5);
        g2.closePath();
        g2.fillStyle = COL.dim;
        g2.fill();
        // state readout
        const st = statesByCircuit.get(current().id);
        const s = st ? C.stOf(st, comp) : {};
        g2.fillStyle = s.q ? COL.wireHigh : COL.faint;
        g2.font = '600 9px system-ui, sans-serif';
        g2.fillText('Q = ' + (s.q ? 1 : 0), cx, comp.y + g.h - 7);
        break;
      }
      default: {
        g2.fillStyle = COL.text;
        g2.font = '650 12.5px system-ui, sans-serif';
        g2.textAlign = 'center';
        const lbl = t.missing ? '(missing chip)' : t.name;
        g2.fillText(clipText(g2, lbl, g.w - 14), cx, comp.y + g.h / 2 + 4);
        if (t.key === 'chip') {
          g2.fillStyle = 'rgba(255,255,255,.5)';
          g2.fillRect(comp.x + 8, comp.y + 1.6, g.w - 16, 2.2);
        }
      }
    }

    // pin name labels for multi-pin non-IO chips
    if (t.key === 'dff' || t.key === 'chip' || t.key === 'seg7') {
      g2.font = '500 8.6px system-ui, sans-serif';
      for (let p = 0; p < t.ins.length; p++) {
        const pp = pinPos(comp, t, 'in', p);
        g2.fillStyle = COL.dim;
        g2.textAlign = 'left';
        if (!(comp.type === 'chip' && cam.z < 0.55)) g2.fillText(clipText(g2, t.ins[p], 40), pp.x + 7, pp.y + 3);
      }
      for (let p = 0; p < t.outs.length; p++) {
        const pp = pinPos(comp, t, 'out', p);
        g2.fillStyle = COL.dim;
        g2.textAlign = 'right';
        if (!(comp.type === 'chip' && cam.z < 0.55)) g2.fillText(clipText(g2, t.outs[p], 40), pp.x - 7, pp.y + 3);
      }
    }

    // pins
    for (let p = 0; p < t.ins.length; p++) drawPin(g2, comp, t, 'in', p, e);
    for (let p = 0; p < t.outs.length; p++) drawPin(g2, comp, t, 'out', p, e);
    g2.restore();
  }

  function drawPin(g2, comp, t, io, p, e) {
    const pp = pinPos(comp, t, io, p);
    const v = e ? (io === 'in' ? e.ins[p] : e.outs[p]) : 0;
    const hov = hover && hover.kind === 'pin' && hover.comp.id === comp.id && hover.io === io && hover.p === p;
    if (v) { g2.shadowColor = 'rgba(57,224,108,.5)'; g2.shadowBlur = 6; }
    g2.beginPath();
    g2.arc(pp.x, pp.y, PIN_R + (hov ? 1.8 : 0), 0, 7);
    g2.fillStyle = v ? COL.wireHigh : COL.pinLow;
    g2.fill();
    g2.shadowBlur = 0;
    g2.lineWidth = hov ? 2.2 : 1.6;
    g2.strokeStyle = hov ? '#ffffff' : v ? '#5df28c' : COL.pinEdge;
    g2.stroke();
  }

  function drawSeg7(g2, x, y, w, h, ins) {
    const u = (nx, ny) => [x + nx * w, y + ny * h];
    const segs = [
      [u(.16, .04), u(.84, .04)], // a
      [u(.94, .10), u(.94, .44)], // b
      [u(.94, .56), u(.94, .90)], // c
      [u(.16, .96), u(.84, .96)], // d
      [u(.06, .56), u(.06, .90)], // e
      [u(.06, .10), u(.06, .44)], // f
      [u(.16, .50), u(.84, .50)], // g
    ];
    g2.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const on = ins[i] ? 1 : 0;
      if (on) { g2.shadowColor = 'rgba(255,80,66,.6)'; g2.shadowBlur = 8; }
      g2.beginPath();
      g2.moveTo(segs[i][0][0], segs[i][0][1]);
      g2.lineTo(segs[i][1][0], segs[i][1][1]);
      g2.lineWidth = Math.max(4, w * 0.13);
      g2.strokeStyle = on ? '#ff5042' : '#2b2e37';
      g2.stroke();
      g2.shadowBlur = 0;
    }
  }

  function clipText(g2, s, maxW) {
    s = String(s);
    if (g2.measureText(s).width <= maxW) return s;
    let out = s;
    while (out.length > 1 && g2.measureText(out + '…').width > maxW) out = out.slice(0, -1);
    return out + '…';
  }

  /* ---------- context cursor ---------- */
  cv.addEventListener('pointermove', (e) => {
    if (drag && drag.kind === 'wire') { cv.style.cursor = 'crosshair'; return; }
    if (!hover) { cv.style.cursor = spaceHeld ? 'grab' : 'default'; return; }
    cv.style.cursor = hover.kind === 'pin' ? 'crosshair'
      : hover.kind === 'comp' ? (hover.comp.type === 'in' || hover.comp.type === 'button' ? 'pointer' : 'move')
      : 'pointer';
  });

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ---------- boot ---------- */
  loadAll();
  loadCam();
  layout();
  updateZoomLabel();
  settleNow();
  refreshChrome();
  draw();
  if (!seenWelcome) welcomeModal();

  /* public handle */
  return {
    resize: layout,
    unmount() {
      alive = false;
      ro.disconnect();
      clearInterval(runTimer);
      clearTimeout(saveTimer);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', layout);
      saveNow();
    },
  };
}

/* ============================== EXPORTS ================================== */

const api = { Core, mount };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
if (typeof window !== 'undefined') window.LogicSim = api;

})();
