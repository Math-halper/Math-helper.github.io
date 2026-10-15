/* ============================================================================
 * Digital Logic Sim — web edition · interaction (js/interaction.js)
 *
 * Camera (pan/zoom/fit), hit testing, wire routing, palette drags, pointer
 * gestures, clipboard and keyboard shortcuts. Translated from upstream:
 *   Assets/Scripts/Game/Interaction/*  → ChipInteractionController, Camera
 *   Assets/Scripts/Game/Interaction/KeyboardShortcuts.cs / UndoController.cs
 * Created by mount() in js/editor.js with the shared context S.
 * ========================================================================== */
(function (global) {
'use strict';

const L = global.LogicSim = global.LogicSim || {};

function createInteraction(S) {
  'use strict';
  const C = S.C;
  const root = S.root, el = S.el, stage = S.stage, cv = S.cv;

  /* ---------- coordinate helpers ---------- */
  const s2w = (px, py) => ({ x: (px - S.cam.x) / S.cam.z, y: (py - S.cam.y) / S.cam.z });
  const w2s = (wx, wy) => ({ x: wx * S.cam.z + S.cam.x, y: wy * S.cam.z + S.cam.y });
  function eventPos(e) {
    const r = cv.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function updateZoomLabel() {
    root.querySelector('.ls-zoomv').textContent = Math.round(S.cam.z * 100) + '%';
  }
  function zoomAt(px, py, factor) {
    const z0 = S.cam.z;
    const z1 = Math.min(2.6, Math.max(0.24, z0 * factor));
    if (z1 === z0) return;
    const w = s2w(px, py);
    S.cam.z = z1;
    S.cam.x = px - w.x * z1;
    S.cam.y = py - w.y * z1;
    updateZoomLabel();
    S.scheduleSave();
  }
  function fitView() {
    const c = S.current();
    if (!c.comps.length) { S.cam.x = stage.clientWidth / 2 - 100; S.cam.y = stage.clientHeight / 2 - 80; S.cam.z = 1; updateZoomLabel(); return; }
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const comp of c.comps) {
      const t = C.typeOf(comp, S.lib), g = S.compGeom(t);
      x0 = Math.min(x0, comp.x); y0 = Math.min(y0, comp.y);
      x1 = Math.max(x1, comp.x + g.w); y1 = Math.max(y1, comp.y + g.h);
    }
    const pad = 70;
    const w = Math.max(80, x1 - x0 + pad * 2), h = Math.max(60, y1 - y0 + pad * 2);
    S.cam.z = Math.min(2, Math.max(0.24, Math.min(stage.clientWidth / w, stage.clientHeight / h)));
    S.cam.x = stage.clientWidth / 2 - ((x0 + x1) / 2) * S.cam.z;
    S.cam.y = stage.clientHeight / 2 - ((y0 + y1) / 2) * S.cam.z;
    updateZoomLabel();
    S.scheduleSave();
  }

  /* ---------- hit testing ---------- */
  function hitTest(wx, wy) {
    const c = S.current();
    const tol = 7 / Math.min(1, S.cam.z) + 2;
    // pins first
    for (let i = c.comps.length - 1; i >= 0; i--) {
      const comp = c.comps[i];
      const t = C.typeOf(comp, S.lib);
      for (let p = 0; p < t.ins.length; p++) {
        const pp = S.pinPos(comp, t, 'in', p);
        if (Math.hypot(wx - pp.x, wy - pp.y) <= tol) return { kind: 'pin', comp, t, io: 'in', p, x: pp.x, y: pp.y };
      }
      for (let p = 0; p < t.outs.length; p++) {
        const pp = S.pinPos(comp, t, 'out', p);
        if (Math.hypot(wx - pp.x, wy - pp.y) <= tol) return { kind: 'pin', comp, t, io: 'out', p, x: pp.x, y: pp.y };
      }
    }
    for (let i = c.comps.length - 1; i >= 0; i--) {
      const comp = c.comps[i];
      const t = C.typeOf(comp, S.lib), g = S.compGeom(t);
      if (wx >= comp.x && wx <= comp.x + g.w && wy >= comp.y && wy <= comp.y + g.h) return { kind: 'comp', comp, t };
    }
    for (const w of c.wires) {
      if (wireDist(w, wx, wy) <= 7 / S.cam.z + 3) return { kind: 'wire', wire: w };
    }
    return null;
  }
  function wireEndpoints(w) {
    const c = S.current();
    const fc = c.comps.find((x) => x.id === w.f.c);
    const tc = c.comps.find((x) => x.id === w.t.c);
    if (!fc || !tc) return null;
    const ft = C.typeOf(fc, S.lib), tt = C.typeOf(tc, S.lib);
    return { a: S.pinPos(fc, ft, 'out', w.f.p), b: S.pinPos(tc, tt, 'in', w.t.p) };
  }
  function wirePoints(a, b) {
    if (b.x > a.x) return [a, b];
    const top = Math.min(a.y, b.y) - 52;
    return [a, { x: a.x + 24, y: a.y }, { x: a.x + 24, y: top },
      { x: b.x - 24, y: top }, { x: b.x - 24, y: b.y }, b];
  }
  function traceWire(g2, a, b) {
    const points = wirePoints(a, b);
    g2.beginPath(); g2.moveTo(a.x, a.y);
    for (const p of points.slice(1)) g2.lineTo(p.x, p.y);
  }
  function wireDist(w, wx, wy) {
    const ep = wireEndpoints(w);
    if (!ep) return 1e9;
    const points = wirePoints(ep.a, ep.b);
    let best = Infinity;
    for (let i = 1; i < points.length; i++) best = Math.min(best, distSeg(points[i - 1], points[i], { x: wx, y: wy }));
    return best;
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
    S.mutate(() => {
      let comp = null;
      if (put.startsWith('chip:')) {
        const ref = put.slice(5);
        if (C.dependsOn(S.lib, ref, S.current().id)) {
          S.toast('That chip already contains this one — nesting would loop forever');
          return;
        }
        comp = C.addComp(S.current(), 'chip', wx, wy, { ref });
      } else {
        comp = C.addComp(S.current(), put, wx, wy);
      }
      S.selComps = new Set([comp.id]); S.selWires.clear();
      S.refreshPalette();
    });
  }

  /* ---------- canvas interaction ---------- */
  cv.style.touchAction = 'none';
  cv.tabIndex = 0;
  cv.addEventListener('contextmenu', (e) => e.preventDefault());

  cv.addEventListener('pointerdown', (e) => {
    cv.focus();
    S.closeModal();
    const p = eventPos(e);
    const w = s2w(p.x, p.y);
    S.mouse = { x: p.x, y: p.y, wx: w.x, wy: w.y, inside: true };
    const hit = hitTest(w.x, w.y);

    if (e.button === 1 || (e.button === 0 && S.spaceHeld)) {
      S.drag = { kind: 'pan', sx: p.x, sy: p.y, ox: S.cam.x, oy: S.cam.y };
      cv.setPointerCapture(e.pointerId);
      return;
    }
    if (e.button === 2) {
      S.drag = { kind: 'rmb', sx: p.x, sy: p.y, ox: S.cam.x, oy: S.cam.y, moved: false, hit };
      cv.setPointerCapture(e.pointerId);
      return;
    }
    if (e.button !== 0) return;

    if (hit && hit.kind === 'pin') {
      S.drag = { kind: 'wire', from: hit, cx: w.x, cy: w.y, valid: null };
      S.hint(hit.io === 'out' ? 'Release on an input pin to connect' : 'Release on an output pin to connect', true);
      cv.setPointerCapture(e.pointerId);
      return;
    }
    if (hit && hit.kind === 'comp') {
      const cmp = hit.comp;
      if (cmp.type === 'in') {
        S.drag = { kind: 'maybe-toggle', comp: cmp, sx: p.x, sy: p.y };
        return;
      }
      if (cmp.type === 'button') {
        S.mutate(() => { C.stOf(S.statesFor(S.current().id), cmp).val = 1; });
        S.drag = { kind: 'hold-button', comp: cmp };
        return;
      }
      const already = S.selComps.has(cmp.id);
      if (e.shiftKey) {
        if (already) S.selComps.delete(cmp.id); else S.selComps.add(cmp.id);
        S.refreshStatus();
        S.drag = { kind: 'nothing' };
        return;
      }
      if (!already) { S.selComps = new Set([cmp.id]); S.selWires.clear(); S.refreshStatus(); }
      S.drag = { kind: 'move', sx: w.x, sy: w.y, started: false, orig: new Map([...S.selComps].map((id) => {
        const c = S.current().comps.find((x) => x.id === id);
        return [id, { x: c.x, y: c.y }];
      })), snap: S.snapshot() };
      cv.setPointerCapture(e.pointerId);
      return;
    }
    if (hit && hit.kind === 'wire') {
      S.selWires = new Set([hit.wire.id]); S.selComps.clear();
      S.refreshStatus();
      S.drag = { kind: 'nothing' };
      return;
    }
    // empty: marquee select
    S.drag = { kind: 'marquee', x0: w.x, y0: w.y, x1: w.x, y1: w.y, additive: e.shiftKey };
    if (!e.shiftKey) { S.selComps.clear(); S.selWires.clear(); S.refreshStatus(); }
    cv.setPointerCapture(e.pointerId);
  });

  cv.addEventListener('pointermove', (e) => {
    const p = eventPos(e);
    const w = s2w(p.x, p.y);
    S.mouse = { x: p.x, y: p.y, wx: w.x, wy: w.y, inside: true };
    if (!S.drag) { S.hover = hitTest(w.x, w.y); return; }
    switch (S.drag.kind) {
      case 'pan': case 'rmb': {
        if (Math.hypot(p.x - S.drag.sx, p.y - S.drag.sy) > 4) S.drag.moved = true;
        if (S.drag.kind === 'pan' || S.drag.moved) {
          S.cam.x = S.drag.ox + (p.x - S.drag.sx);
          S.cam.y = S.drag.oy + (p.y - S.drag.sy);
        }
        break;
      }
      case 'wire': {
        S.drag.cx = w.x; S.drag.cy = w.y;
        const h = hitTest(w.x, w.y);
        S.drag.valid = (h && h.kind === 'pin' && h.io !== S.drag.from.io
          && !(h.comp.id === S.drag.from.comp.id && h.p === S.drag.from.p)) ? h : null;
        break;
      }
      case 'maybe-toggle': {
        if (Math.hypot(p.x - S.drag.sx, p.y - S.drag.sy) > 4) {
          // became a move
          S.selComps = new Set([S.drag.comp.id]); S.selWires.clear();
          const ww = s2w(S.drag.sx, S.drag.sy);
          S.drag = { kind: 'move', sx: ww.x, sy: ww.y, started: false, orig: new Map([[S.drag.comp.id, { x: S.drag.comp.x, y: S.drag.comp.y }]]), snap: S.snapshot() };
        }
        break;
      }
      case 'move': {
        const dx = Math.round((w.x - S.drag.sx) / 2) * 2;
        const dy = Math.round((w.y - S.drag.sy) / 2) * 2;
        if (!S.drag.started && (dx || dy)) { startUndoFrom(S.drag.snap); S.drag.started = true; }
        if (S.drag.started) {
          for (const [id, o] of S.drag.orig) {
            const c = S.current().comps.find((x) => x.id === id);
            if (c) { c.x = o.x + dx; c.y = o.y + dy; }
          }
        }
        break;
      }
      case 'marquee': { S.drag.x1 = w.x; S.drag.y1 = w.y; break; }
    }
  });

  function startUndoFrom(snap) {
    const st = S.stackFor(S.current().id);
    st.undo.push(snap);
    if (st.undo.length > 120) st.undo.shift();
    st.redo.length = 0;
  }

  function endDrag(e) {
    const d = S.drag; S.drag = null;
    S.hint('', false);
    if (!d) return;
    switch (d.kind) {
      case 'rmb': {
        if (!d.moved && d.hit) {
          if (d.hit.kind === 'comp') S.mutate(() => { C.removeComps(S.current(), new Set([d.hit.comp.id])); S.selComps.delete(d.hit.comp.id); S.refreshPalette(); });
          else if (d.hit.kind === 'wire') S.mutate(() => { C.removeWires(S.current(), new Set([d.hit.wire.id])); S.selWires.delete(d.hit.wire.id); });
          S.refreshStatus();
        }
        S.scheduleSave();
        break;
      }
      case 'pan': S.scheduleSave(); break;
      case 'wire': {
        if (d.valid) {
          const out = d.from.io === 'out' ? d.from : d.valid;
          const inp = d.from.io === 'in' ? d.from : d.valid;
          S.mutate(() => {
            C.addWire(S.current(), S.lib, { c: out.comp.id, p: out.p }, { c: inp.comp.id, p: inp.p });
          });
        }
        break;
      }
      case 'maybe-toggle': {
        mutateToggle(d.comp);
        break;
      }
      case 'hold-button': {
        S.mutate(() => { C.stOf(S.statesFor(S.current().id), d.comp).val = 0; });
        break;
      }
      case 'move': {
        if (d.started) { S.settleNow(); S.scheduleSave(); S.refreshPalette(); }
        break;
      }
      case 'marquee': {
        const r = normRect(d);
        let added = false;
        for (const comp of S.current().comps) {
          const t = C.typeOf(comp, S.lib), g = S.compGeom(t);
          if (comp.x < r.x1 && comp.x + g.w > r.x0 && comp.y < r.y1 && comp.y + g.h > r.y0) { S.selComps.add(comp.id); added = true; }
        }
        for (const w of S.current().wires) {
          const ep = wireEndpoints(w);
          if (!ep) continue;
          if (pointInRect(ep.a, r) && pointInRect(ep.b, r)) { S.selWires.add(w.id); added = true; }
        }
        if (added) S.refreshStatus();
        break;
      }
    }
  }
  cv.addEventListener('pointerup', endDrag);
  cv.addEventListener('pointercancel', () => { S.drag = null; S.hint('', false); });
  cv.addEventListener('pointerleave', () => { S.mouse.inside = false; S.hover = null; });

  function mutateToggle(comp) {
    const st = S.statesFor(S.current().id);
    const s = C.stOf(st, comp);
    s.val = s.val ? 0 : 1;
    S.settleNow(); S.scheduleSave();
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
      if (cmp.type === 'chip' && !C.typeOf(cmp, S.lib).missing) {
        S.openPath.push(cmp.ref);
        S.enterCircuit();
      } else if (cmp.type === 'in' || cmp.type === 'out' || cmp.type === 'clock' || cmp.type === 'button') {
        S.askName('Pin name', cmp.label || '', (v) => {
          S.mutate(() => { cmp.label = v; });
          S.refreshPalette();
        });
      }
    } else if (!hit && S.openPath.length > 1) {
      S.openPath.pop();
      S.enterCircuit();
    }
  });

  /* ---------- clipboard & keyboard ---------- */
  let clipboard = null;
  let pasteCount = 0;

  function copySelection() {
    if (!S.selComps.size) return;
    const circ = S.current();
    const comps = circ.comps.filter((c) => S.selComps.has(c.id)).map((c) => ({ ...c }));
    const wires = circ.wires.filter((w) => S.selComps.has(w.f.c) && S.selComps.has(w.t.c)).map((w) => ({ ...w }));
    clipboard = { comps, wires };
    pasteCount = 0;
    S.toast(`Copied ${comps.length} chip${comps.length === 1 ? '' : 's'}`);
  }
  function pasteClipboard(duplicate) {
    if (!clipboard || !clipboard.comps.length) return;
    pasteCount++;
    const off = 26 * (duplicate ? 1 : pasteCount);
    const idMap = new Map();
    S.mutate(() => {
      S.selComps.clear(); S.selWires.clear();
      for (const c of clipboard.comps) {
        const nc = { ...c, id: C.uid('x'), x: c.x + off, y: c.y + off };
        idMap.set(c.id, nc.id);
        S.current().comps.push(nc);
        S.selComps.add(nc.id);
      }
      for (const w of clipboard.wires) {
        S.current().wires.push({
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
    if (!focusInside && !(freeFocus && S.mouse.inside)) return;
    const k = e.key;
    const mod = e.ctrlKey || e.metaKey;
    if (k === 'Escape') {
      S.closeMenu();
    }
    if (mod && ['n', 's', 'l', 'f', 'p'].includes(k.toLowerCase())) {
      e.preventDefault();
      ({ n: S.newChipModal, s: () => { S.saveNow(); S.toast('Chip saved on this device'); }, l: S.libraryModal, f: S.libraryModal, p: S.preferencesModal })[k.toLowerCase()]();
      return;
    }
    if (mod && !e.shiftKey && k.toLowerCase() === 'z') { e.preventDefault(); S.undo(); return; }
    if (mod && (k.toLowerCase() === 'y' || (e.shiftKey && k.toLowerCase() === 'z'))) { e.preventDefault(); S.redo(); return; }
    if (mod && k.toLowerCase() === 'c') { copySelection(); return; }
    if (mod && k.toLowerCase() === 'v') { pasteClipboard(false); return; }
    if (mod && k.toLowerCase() === 'd') {
      e.preventDefault();
      if (!S.selComps.size) return;
      copySelection(); pasteClipboard(true); return;
    }
    if (mod && k.toLowerCase() === 'a') {
      e.preventDefault();
      S.selComps = new Set(S.current().comps.map((c) => c.id));
      S.selWires = new Set(S.current().wires.map((w) => w.id));
      S.refreshStatus(); return;
    }
    if (k === 'Delete' || k === 'Backspace') {
      if (!S.selComps.size && !S.selWires.size) return;
      e.preventDefault();
      S.mutate(() => {
        if (S.selComps.size) C.removeComps(S.current(), S.selComps);
        if (S.selWires.size) C.removeWires(S.current(), S.selWires);
        S.selComps.clear(); S.selWires.clear();
        S.refreshPalette();
      });
      S.refreshStatus();
      return;
    }
    if (k === ' ') { e.preventDefault(); if (!S.spaceHeld) S.setRunning(!S.running); S.spaceHeld = true; return; }
    if (k === 'Enter') { e.preventDefault(); S.doTick(); return; }
    if (k === 'Escape') { S.selComps.clear(); S.selWires.clear(); S.refreshStatus(); }
  }
  function onKeyUp(e) { if (e.key === ' ') S.spaceHeld = false; }
  document.addEventListener('keydown', onKey);
  document.addEventListener('keyup', onKeyUp);

  /* ---------- context cursor ---------- */
  cv.addEventListener('pointermove', (e) => {
    if (S.drag && S.drag.kind === 'wire') { cv.style.cursor = 'crosshair'; return; }
    if (!S.hover) { cv.style.cursor = S.spaceHeld ? 'grab' : 'default'; return; }
    cv.style.cursor = S.hover.kind === 'pin' ? 'crosshair'
      : S.hover.kind === 'comp' ? (S.hover.comp.type === 'in' || S.hover.comp.type === 'button' ? 'pointer' : 'move')
      : 'pointer';
  });


  /* teardown for editor unmount */
  function destroy() {
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('keyup', onKeyUp);
    if (palGhost) { palGhost.remove(); palGhost = null; }
  }

  Object.assign(S, {
    s2w, w2s, eventPos, updateZoomLabel, zoomAt, fitView, hitTest,
    wireEndpoints, wirePoints, traceWire, wireDist, distSeg,
    onPaletteDown, placeFromPalette, normRect, pointInRect,
    copySelection, pasteClipboard, onKey, onKeyUp,
  });
  return { destroy };
}

L.createInteraction = createInteraction;
if (typeof module !== 'undefined' && module.exports) module.exports = createInteraction;
})(typeof window !== 'undefined' ? window : globalThis);
