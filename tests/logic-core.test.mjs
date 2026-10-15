/* Node test for the Digital Logic Sim — web edition simulation core.
 * Run:  node tests/logic-core.test.mjs
 * The engine is shared verbatim by the website and the proton app; this
 * exercises it headless (no DOM involved). */
import LogicSim from '../websites/logic-sim/logic-sim.js';

const C = LogicSim.Core;
if (!C) { console.error('Core export missing'); process.exit(1); }

let passed = 0, failed = 0;
function ok(cond, msg) {
  if (cond) { passed++; }
  else { failed++; console.error('  FAIL:', msg); }
}
function section(name) { console.log('•', name); }

/* helpers -------------------------------------------------------------- */
function build(lib, name, comps, wires) {
  const c = C.addCircuit(lib, name);
  const reg = {};
  for (const [key, type, x, y, extra] of comps) reg[key] = C.addComp(c, type, x, y, extra);
  for (const [f, fp, t, tp] of wires) C.addWire(c, lib, { c: reg[f].id, p: fp }, { c: reg[t].id, p: tp });
  return { c, reg };
}
const setIn = (states, comp, v) => { C.stOf(states, comp).val = v; };
const outVal = (ev, comp) => ev.get(comp.id).ins[0] | 0;   // read an OUT pin comp's input
const pinVal = (ev, comp, p) => ev.get(comp.id).outs[p] | 0;

/* 1. gate truth tables ------------------------------------------------- */
section('built-in gate truth tables');
{
  const lib = C.makeLib();
  const { c, reg } = build(lib, 'gates', [
    ['a', 'in', 0, 0], ['b', 'in', 0, 100],
    ['and', 'and', 200, 0], ['or', 'or', 200, 100], ['xor', 'xor', 200, 200],
    ['nand', 'nand', 200, 300], ['nor', 'nor', 200, 400], ['not', 'not', 200, 500],
    ['oAnd', 'out', 400, 0], ['oOr', 'out', 400, 100], ['oXor', 'out', 400, 200],
    ['oNand', 'out', 400, 300], ['oNor', 'out', 400, 400], ['oNot', 'out', 400, 500],
  ], [
    ['a', 0, 'and', 0], ['b', 0, 'and', 1], ['and', 0, 'oAnd', 0],
    ['a', 0, 'or', 0], ['b', 0, 'or', 1], ['or', 0, 'oOr', 0],
    ['a', 0, 'xor', 0], ['b', 0, 'xor', 1], ['xor', 0, 'oXor', 0],
    ['a', 0, 'nand', 0], ['b', 0, 'nand', 1], ['nand', 0, 'oNand', 0],
    ['a', 0, 'nor', 0], ['b', 0, 'nor', 1], ['nor', 0, 'oNor', 0],
    ['a', 0, 'not', 0], ['not', 0, 'oNot', 0],
  ]);
  const states = C.newStates();
  const AND = [[0, 0, 0], [0, 1, 0], [1, 0, 0], [1, 1, 1]];
  const OR = [[0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 1]];
  const XOR = [[0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 0]];
  let ev = null, allOk = true;
  for (let i = 0; i < 4; i++) {
    setIn(states, reg.a, AND[i][0]); setIn(states, reg.b, AND[i][1]);
    ev = C.settle(c, lib, states, ev).ev;
    allOk = allOk
      && outVal(ev, reg.oAnd) === AND[i][2]
      && outVal(ev, reg.oOr) === OR[i][2]
      && outVal(ev, reg.oXor) === XOR[i][2]
      && outVal(ev, reg.oNand) === (AND[i][2] ? 0 : 1)
      && outVal(ev, reg.oNor) === (OR[i][2] ? 0 : 1)
      && outVal(ev, reg.oNot) === (AND[i][0] ? 0 : 1);
  }
  ok(allOk, 'AND/OR/XOR/NAND/NOR/NOT truth tables');
}

/* 2. half adder + fanout ----------------------------------------------- */
section('half adder (fanout from one output pin)');
{
  const lib = C.makeLib();
  const { c, reg } = build(lib, 'ha', [
    ['a', 'in', 0, 0], ['b', 'in', 0, 100],
    ['x', 'xor', 200, 0], ['n', 'and', 200, 100],
    ['s', 'out', 400, 0, { label: 'SUM' }], ['cy', 'out', 400, 100, { label: 'CARRY' }],
  ], [
    ['a', 0, 'x', 0], ['b', 0, 'x', 1], ['a', 0, 'n', 0], ['b', 0, 'n', 1],
    ['x', 0, 's', 0], ['n', 0, 'cy', 0],
  ]);
  const states = C.newStates();
  const T = [[0, 0, 0, 0], [0, 1, 1, 0], [1, 0, 1, 0], [1, 1, 0, 1]];
  let ev = null, allOk = true;
  for (const [a, b, s, cy] of T) {
    setIn(states, reg.a, a); setIn(states, reg.b, b);
    ev = C.settle(c, lib, states, ev).ev;
    allOk = allOk && outVal(ev, reg.s) === s && outVal(ev, reg.cy) === cy;
  }
  ok(allOk, 'half adder SUM/CARRY for all inputs');
  const pins = C.chipPins(c);
  ok(pins.inputs.length === 2 && pins.outputs.length === 2
    && pins.inputs[0].id === reg.a.id && pins.outputs[0].id === reg.s.id,
    'chipPins orders pins top→bottom');
}

/* 3. nested custom chips (full adder) ---------------------------------- */
section('custom chips nested two levels deep');
{
  const lib = C.makeLib();
  const ha = build(lib, 'Half Adder', [
    ['a', 'in', 0, 0], ['b', 'in', 0, 100],
    ['x', 'xor', 200, 0], ['n', 'and', 200, 100],
    ['s', 'out', 400, 0], ['cy', 'out', 400, 100],
  ], [
    ['a', 0, 'x', 0], ['b', 0, 'x', 1], ['a', 0, 'n', 0], ['b', 0, 'n', 1],
    ['x', 0, 's', 0], ['n', 0, 'cy', 0],
  ]);
  const fa = build(lib, 'Full Adder', [
    ['a', 'in', 0, 0], ['b', 'in', 0, 100], ['ci', 'in', 0, 200],
    ['h1', 'chip', 200, 50, { ref: ha.c.id }], ['h2', 'chip', 400, 150, { ref: ha.c.id }],
    ['or', 'or', 400, 300],
    ['s', 'out', 600, 150], ['co', 'out', 600, 300],
  ], [
    ['a', 0, 'h1', 0], ['b', 0, 'h1', 1],
    ['h1', 0, 'h2', 0], ['ci', 0, 'h2', 1],
    ['h1', 1, 'or', 0], ['h2', 1, 'or', 1],
    ['h2', 0, 's', 0], ['or', 0, 'co', 0],
  ]);
  const states = C.newStates();
  let ev = null, allOk = true;
  for (let i = 0; i < 8; i++) {
    const a = (i >> 2) & 1, b = (i >> 1) & 1, ci = i & 1;
    setIn(states, fa.reg.a, a); setIn(states, fa.reg.b, b); setIn(states, fa.reg.ci, ci);
    ev = C.settle(fa.c, lib, states, ev).ev;
    const sum = a ^ b ^ ci, carry = (a & b) | (ci & (a ^ b));
    allOk = allOk && outVal(ev, fa.reg.s) === sum && outVal(ev, fa.reg.co) === carry;
  }
  ok(allOk, 'full adder (2×Half Adder chips + OR) for all 8 inputs');
}

/* 4. SR latch feedback with memory ------------------------------------- */
section('SR latch (combinational feedback)');
{
  const lib = C.makeLib();
  const { c, reg } = build(lib, 'sr', [
    ['s', 'in', 0, 0, { label: 'SET' }], ['r', 'in', 0, 200, { label: 'RESET' }],
    ['n1', 'nor', 200, 0], ['n2', 'nor', 200, 200],
    ['q', 'out', 400, 0], ['qb', 'out', 400, 200],
  ], [
    ['r', 0, 'n1', 0], ['n2', 0, 'n1', 1],   // Q gate:  Q = NOR(R, Q̅)
    ['s', 0, 'n2', 0], ['n1', 0, 'n2', 1],   // Q̅ gate: Q̅ = NOR(S, Q)
    ['n1', 0, 'q', 0], ['n2', 0, 'qb', 0],
  ]);
  const states = C.newStates();
  setIn(states, reg.s, 1); setIn(states, reg.r, 0);
  let r1 = C.settle(c, lib, states, null);
  ok(r1.stable && outVal(r1.ev, reg.q) === 1 && outVal(r1.ev, reg.qb) === 0, 'SET drives Q=1');
  setIn(states, reg.s, 0);
  r1 = C.settle(c, lib, states, r1.ev);   // hold — seeded from previous state
  ok(r1.stable && outVal(r1.ev, reg.q) === 1 && outVal(r1.ev, reg.qb) === 0, 'Q holds after SET released');
  setIn(states, reg.r, 1);
  r1 = C.settle(c, lib, states, r1.ev);
  ok(r1.stable && outVal(r1.ev, reg.q) === 0 && outVal(r1.ev, reg.qb) === 1, 'RESET drives Q=0');
}

/* 5. D flip-flop + clock ticks ----------------------------------------- */
section('D flip-flop across simulation ticks');
{
  const lib = C.makeLib();
  const { c, reg } = build(lib, 'ff', [
    ['d', 'in', 0, 0, { label: 'D' }], ['clk', 'clock', 0, 100],
    ['ff', 'dff', 200, 40],
    ['q', 'out', 450, 20], ['qb', 'out', 450, 90],
  ], [
    ['d', 0, 'ff', 0], ['clk', 0, 'ff', 1],
    ['ff', 0, 'q', 0], ['ff', 1, 'qb', 0],
  ]);
  const states = C.newStates();
  // clock starts low; D=1 before first rising edge
  setIn(states, reg.d, 1);
  let ev = C.settle(c, lib, states, null).ev;
  ok(outVal(ev, reg.q) === 0, 'Q starts 0 before any edge');
  ev = C.tick(c, lib, states, ev).ev;      // tick 1: clk rises
  ok(outVal(ev, reg.q) === 1 && outVal(ev, reg.qb) === 0, 'Q latches D=1 on rising edge');
  setIn(states, reg.d, 0);
  ev = C.settle(c, lib, states, ev).ev;
  ok(outVal(ev, reg.q) === 1, 'Q holds while D changes with clock steady');
  ev = C.tick(c, lib, states, ev).ev;      // tick 2: clk falls
  ok(outVal(ev, reg.q) === 1, 'falling edge does nothing');
  ev = C.tick(c, lib, states, ev).ev;      // tick 3: clk rises again
  ok(outVal(ev, reg.q) === 0, 'Q latches D=0 on next rising edge');
}

/* 6. toggle flip-flop (Q̅ fed back to D) -------------------------------- */
section('toggle flip-flop (free-running divider)');
{
  const lib = C.makeLib();
  const { c, reg } = build(lib, 'toggle', [
    ['clk', 'clock', 0, 100], ['ff', 'dff', 200, 40], ['q', 'out', 450, 20],
  ], [['clk', 0, 'ff', 1], ['ff', 1, 'ff', 0], ['ff', 0, 'q', 0]]);
  const states = C.newStates();
  let ev = C.settle(c, lib, states, null).ev;
  const seq = [];
  for (let i = 0; i < 6; i++) { ev = C.tick(c, lib, states, ev).ev; seq.push(outVal(ev, reg.q)); }
  ok(seq.join(',') === '1,1,0,0,1,1', 'Q toggles every other tick, got ' + seq.join(','));
}

/* 7. cycle guard + wire rules ------------------------------------------ */
section('structural rules');
{
  const lib = C.makeLib();
  const a = C.addCircuit(lib, 'A');
  const b = C.addCircuit(lib, 'B');
  const io = C.addComp(b, 'in', 0, 0);
  const oo = C.addComp(b, 'out', 200, 0);
  ok(C.dependsOn(lib, b.id, b.id), 'a chip cannot contain itself');
  C.addComp(a, 'chip', 0, 0, { ref: b.id });
  // placing chip A inside circuit B must be refused, because A's dependency
  // closure already contains B (A holds a B instance)
  ok(C.dependsOn(lib, a.id, b.id), 'cycle detected transitively (A holds B, so B cannot hold A)');
  ok(!C.dependsOn(lib, b.id, a.id), '…but unrelated direction stays allowed');
  const w1 = C.addWire(b, lib, { c: io.id, p: 0 }, { c: oo.id, p: 0 });
  const w2 = C.addWire(b, lib, { c: io.id, p: 0 }, { c: oo.id, p: 0 });
  ok(w1 && w2 && b.wires.length === 1, 'second wire into same input pin replaces the first');
  const bad = C.addWire(b, lib, { c: oo.id, p: 0 }, { c: io.id, p: 0 });
  ok(!bad, 'cannot wire an input pin from another input pin (direction enforced)');
}

/* 8. export / import round-trip ---------------------------------------- */
section('export → import round-trip');
{
  const lib = C.makeLib();
  C.installExamples(lib);
  const lib2 = C.makeLib();
  const n = C.importLib(C.exportLib(lib), lib2);
  ok(n === lib.circuits.length, 'all circuits imported (' + n + ')');
  const fa = lib2.circuits.find((c) => c.name === 'Full Adder');
  ok(!!fa, 'Full Adder present after import');
  const states = C.newStates();
  const pins = C.chipPins(fa);
  let ev = null, allOk = true;
  for (let i = 0; i < 8; i++) {
    const a = (i >> 2) & 1, b = (i >> 1) & 1, ci = i & 1;
    C.stOf(states, pins.inputs[0]).val = a;
    C.stOf(states, pins.inputs[1]).val = b;
    C.stOf(states, pins.inputs[2]).val = ci;
    ev = C.settle(fa, lib2, states, ev).ev;
    const sum = a ^ b ^ ci, carry = (a & b) | (ci & (a ^ b));
    allOk = allOk
      && (ev.get(pins.outputs[0].id).ins[0] | 0) === sum
      && (ev.get(pins.outputs[1].id).ins[0] | 0) === carry;
  }
  ok(allOk, 'imported Full Adder still computes correctly');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
