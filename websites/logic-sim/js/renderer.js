/* ============================================================================
 * Digital Logic Sim — web edition · canvas renderer (js/renderer.js)
 *
 * All drawing: workspace, grid, wires, chips, pins, seven-segment display.
 * Translated from upstream:
 *   Assets/Scripts/Graphics/DrawSettings.cs → colours/line conventions
 *   scene drawers / SebVis text+line rendering → chip faces and wires
 * Created by mount() in js/editor.js with the shared context S.
 * ========================================================================== */
(function (global) {
'use strict';

const L = global.LogicSim = global.LogicSim || {};

function createRenderer(S) {
  'use strict';
  const C = S.C;
  const { COL, FONT, PIN_R, chipColor } = L.theme;
  const root = S.root, stage = S.stage, cv = S.cv;
  const ctx2d = cv.getContext('2d');

  /* ---------- drawing ---------- */
  let alive = true;
  function draw() {
    if (!alive) return;
    if (!root.isConnected) { alive = false; return; }  // stop when window/site is closed
    requestAnimationFrame(draw);
    const w = cv.width, h = cv.height;
    if (!w || !h || !S.cam) return;
    const g2 = ctx2d;
    g2.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    g2.clearRect(0, 0, w / S.dpr, h / S.dpr);
    g2.fillStyle = COL.bg;
    g2.fillRect(0, 0, w / S.dpr, h / S.dpr);

    g2.setTransform(S.dpr * S.cam.z, 0, 0, S.dpr * S.cam.z, S.dpr * S.cam.x, S.dpr * S.cam.y);
    if (S.showGrid) drawGrid(g2);

    const circ = S.current();
    const ev = S.evOf(circ.id);

    // wires under chips
    for (const wire of circ.wires) drawWire(g2, wire, ev);
    if (S.drag && S.drag.kind === 'wire') drawWireDraft(g2, S.drag);

    for (const comp of circ.comps) drawComp(g2, comp, ev);

    if (S.drag && S.drag.kind === 'marquee') {
      const r = S.normRect(S.drag);
      g2.fillStyle = 'rgba(255,255,255,.055)';
      g2.strokeStyle = 'rgba(255,255,255,.65)';
      g2.lineWidth = 1 / S.cam.z;
      g2.setLineDash([5 / S.cam.z, 4 / S.cam.z]);
      g2.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
      g2.strokeRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
      g2.setLineDash([]);
    }

    // empty-circuit hint
    if (!circ.comps.length) {
      g2.fillStyle = COL.faint;
      g2.font = '13px ' + FONT;
      g2.textAlign = 'center';
      g2.fillText('Choose a chip from the bottom bar to start building.', (stage.clientWidth / 2 - S.cam.x) / S.cam.z, (stage.clientHeight / 2 - S.cam.y) / S.cam.z);
    }
  }

  function drawGrid(g2) {
    const step = 24;
    const x0 = Math.floor((-S.cam.x / S.cam.z) / step) * step;
    const y0 = Math.floor((-S.cam.y / S.cam.z) / step) * step;
    const x1 = x0 + stage.clientWidth / S.cam.z + step * 2;
    const y1 = y0 + stage.clientHeight / S.cam.z + step * 2;
    g2.strokeStyle = COL.grid;
    g2.lineWidth = 0.7 / S.cam.z;
    g2.beginPath();
    for (let x = x0; x <= x1; x += step) { g2.moveTo(x, y0); g2.lineTo(x, y1); }
    for (let y = y0; y <= y1; y += step) { g2.moveTo(x0, y); g2.lineTo(x1, y); }
    g2.stroke();
  }

  function signalAt(ev, cid, p) {
    const e = ev && ev.get(cid);
    return e && e.outs[p] ? 1 : 0;
  }

  function drawWire(g2, wire, ev) {
    const ep = S.wireEndpoints(wire);
    if (!ep) return;
    const hi = signalAt(ev, wire.f.c, wire.f.p);
    const sel = S.selWires.has(wire.id);
    S.traceWire(g2, ep.a, ep.b);

    g2.strokeStyle = sel ? '#ffffff' : hi ? COL.wireHigh : COL.wireLow;
    g2.lineWidth = 2.5 + (sel ? 1 : 0);
    g2.lineCap = 'round';
    g2.stroke();
    g2.shadowBlur = 0;
  }

  function drawWireDraft(g2, d) {
    const from = d.from;
    const a = { x: from.x, y: from.y };
    const b = d.valid ? { x: d.valid.x, y: d.valid.y } : { x: d.cx, y: d.cy };
    if (from.io === 'out') S.traceWire(g2, a, b);
    else S.traceWire(g2, b, a);
    g2.strokeStyle = d.valid ? '#ffffff' : 'rgba(255,255,255,.4)';
    g2.lineWidth = 2.6;
    g2.setLineDash(d.valid ? [] : [7, 6]);
    g2.stroke();
    g2.setLineDash([]);
  }

  function drawComp(g2, comp, ev) {
    const t = C.typeOf(comp, S.lib);
    const g = S.compGeom(t);
    const e = ev && ev.get(comp.id);
    const sel = S.selComps.has(comp.id);
    const hov = S.hover && S.hover.kind === 'comp' && S.hover.comp.id === comp.id;

    g2.save();
    const cx = comp.x + g.w / 2, cy = comp.y + g.h / 2;
    const isIO = t.key === 'in' || t.key === 'out';
    const color = t.missing ? COL.bodyMissing : chipColor(t.key, t.name);
    if (sel || hov) {
      g2.strokeStyle = sel ? COL.sel : '#b6b6b6';
      g2.lineWidth = 1.5;
      g2.strokeRect(comp.x - 4, comp.y - 4, g.w + 8, g.h + 8);
    }
    if (isIO) {
      const on = e ? (t.key === 'in' ? e.outs[0] : e.ins[0]) : 0;
      const px = t.key === 'in' ? comp.x + g.w - 26 : comp.x + 26;
      const pin = S.pinPos(comp, t, t.key === 'in' ? 'out' : 'in', 0);
      g2.beginPath(); g2.moveTo(px, cy); g2.lineTo(pin.x, pin.y);
      g2.strokeStyle = '#000'; g2.lineWidth = 3; g2.stroke();
      g2.fillStyle = hov ? '#b3b3b3' : '#4f4f4f';
      g2.fillRect(t.key === 'in' ? comp.x + 2 : comp.x + g.w - 11, cy - 12, 9, 24);
      g2.beginPath(); g2.arc(px, cy, 16, 0, Math.PI * 2);
      g2.fillStyle = on ? COL.wireHigh : COL.wireLow; g2.fill();
      g2.strokeStyle = '#120909'; g2.lineWidth = 2; g2.stroke();
      if (comp.label) {
        g2.font = 'bold 11px ' + FONT; g2.textAlign = 'center';
        g2.fillStyle = COL.text; g2.fillText(clipText(g2, comp.label, g.w + 25), cx, comp.y - 9);
      }
    } else {
      g2.fillStyle = color; g2.fillRect(comp.x, comp.y, g.w, g.h);
      g2.strokeStyle = 'rgba(0,0,0,.28)'; g2.lineWidth = 2;
      g2.strokeRect(comp.x, comp.y, g.w, g.h);
      g2.fillStyle = COL.text; g2.font = 'bold 12px ' + FONT; g2.textAlign = 'center';
      if (t.key === 'seg7') {
        drawSeg7(g2, comp.x + g.w - 58, comp.y + 16, 44, g.h - 26, e ? e.ins : []);
      } else if (t.key === 'clock') {
        g2.fillText('CLOCK', cx, comp.y + 17);
        g2.beginPath(); g2.moveTo(cx - 20, cy + 10); g2.lineTo(cx - 20, cy - 3);
        g2.lineTo(cx, cy - 3); g2.lineTo(cx, cy + 10); g2.lineTo(cx + 20, cy + 10);
        g2.strokeStyle = e && e.outs[0] ? COL.wireHigh : '#999'; g2.lineWidth = 2; g2.stroke();
      } else if (t.key === 'button') {
        g2.fillStyle = e && e.outs[0] ? '#ffffff' : '#777777';
        g2.fillRect(cx - 14, cy - 14, 28, 28);
      } else {
        const name = t.missing ? '(missing chip)' : t.name;
        g2.fillText(clipText(g2, name, g.w - 16), cx, cy + 4);
      }
    }
    for (let p = 0; p < t.ins.length; p++) drawPin(g2, comp, t, 'in', p, e);
    for (let p = 0; p < t.outs.length; p++) drawPin(g2, comp, t, 'out', p, e);
    g2.restore();
  }

  function drawPin(g2, comp, t, io, p, e) {
    const pp = S.pinPos(comp, t, io, p);
    const hov = S.hover && S.hover.kind === 'pin' && S.hover.comp.id === comp.id && S.hover.io === io && S.hover.p === p;
    g2.beginPath(); g2.arc(pp.x, pp.y, PIN_R + (hov ? 1 : 0), 0, Math.PI * 2);
    g2.fillStyle = hov ? '#ffffff' : '#000000'; g2.fill();
    if (hov) {
      const label = (io === 'in' ? t.ins : t.outs)[p];
      g2.font = '11px ' + FONT;
      const width = g2.measureText(label).width + 12;
      g2.fillStyle = 'rgba(0,0,0,.7)'; g2.fillRect(pp.x - width / 2, pp.y - 29, width, 18);
      g2.fillStyle = '#ffffff'; g2.textAlign = 'center'; g2.fillText(label, pp.x, pp.y - 16);
    }
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

      g2.beginPath();
      g2.moveTo(segs[i][0][0], segs[i][0][1]);
      g2.lineTo(segs[i][1][0], segs[i][1][1]);
      g2.lineWidth = Math.max(4, w * 0.13);
      g2.strokeStyle = on ? '#ff5247' : '#1a1717';
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


  Object.assign(S, { draw });
  return {
    draw,
    destroy() { alive = false; },
  };
}

L.createRenderer = createRenderer;
if (typeof module !== 'undefined' && module.exports) module.exports = createRenderer;
})(typeof window !== 'undefined' ? window : globalThis);
