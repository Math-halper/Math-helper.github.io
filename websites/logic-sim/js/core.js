/* ============================================================================
 * Digital Logic Sim — web edition · simulation core (js/core.js)
 *
 * Pure logic, no DOM. Translated from the upstream Unity project's:
 *   Assets/Scripts/Simulation/*        → settle/tick, clocks, flip-flops
 *   Assets/Scripts/Description/*       → circuit/chip/wire data model
 *   Assets/Scripts/Game/Project/*      → chip library, builtins, examples
 *   Description/Serialization/*        → export/import JSON
 * ========================================================================== */
(function (global) {
'use strict';

const L = global.LogicSim = global.LogicSim || {};

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

L.Core = Core;
if (typeof module !== 'undefined' && module.exports) module.exports = Core;
})(typeof window !== 'undefined' ? window : globalThis);
