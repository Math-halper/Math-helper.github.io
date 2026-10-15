/* ============================================================================
 * Digital Logic Sim — web edition · UI chrome (js/ui.js)
 *
 * Toolbar, bottom chip bar, breadcrumbs, status line, modals and the MENU.
 * Translated from the upstream Unity project's:
 *   Assets/Scripts/Graphics/UI/Menus/*  → menu, library, prefs, save/export…
 *   Assets/Scripts/Graphics/UI/*        → toasts, hints, modal helpers
 * Created by mount() in js/editor.js with the shared context S.
 * ========================================================================== */
(function (global) {
'use strict';

const L = global.LogicSim = global.LogicSim || {};

function createUi(S) {
  'use strict';
  const C = S.C;
  const { esc, chipColor } = L.theme;
  const root = S.root, el = S.el, stage = S.stage, cv = S.cv,
    palScroll = S.palScroll, crumbsEl = S.crumbsEl, statusEl = S.statusEl,
    hintEl = S.hintEl, speedInput = S.speedInput, speedLabel = S.speedLabel;

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
        html += `<div class="ls-chip" role="button" tabindex="0" data-put="${ty}" title="${t.desc || t.name}">
          <span class="ls-chip-nm">${t.name}</span></div>`;
      }
    }
    const customs = S.lib.circuits.filter((c) => (C.chipPins(c).inputs.length || C.chipPins(c).outputs.length));
    html += `<div class="ls-pal-sec">Your chips <button class="ls-mini" data-palact="new" title="New chip">＋</button></div>`;
    if (!customs.length) html += `<div class="ls-pal-empty">Add IN and OUT pins to a circuit and it appears here as a reusable chip.</div>`;
    for (const c of customs) {
      const p = C.chipPins(c);
      html += `<div class="ls-chip ${c.id === S.current().id ? 'current' : ''}" role="button" tabindex="0" data-put="chip:${c.id}" title="${c.name} — ${p.inputs.length} in / ${p.outputs.length} out">
        <span class="ls-chip-nm">${esc(c.name)}</span>
        <span class="ls-chip-io">${p.inputs.length}·${p.outputs.length}</span>
        ${c.locked ? '' : `<button class="ls-mini ls-ren" data-ren="${c.id}" title="Rename">✎</button><button class="ls-mini ls-del" data-del="${c.id}" title="Delete">✕</button>`}
      </div>`;
    }
    palScroll.innerHTML = html;
    palScroll.querySelectorAll('.ls-chip').forEach((item) => {
      item.addEventListener('pointerdown', S.onPaletteDown);
      item.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault(); e.stopPropagation();
        S.placeFromPalette(item.dataset.put, (stage.clientWidth / 2 - S.cam.x) / S.cam.z - 40, (stage.clientHeight / 2 - S.cam.y) / S.cam.z - 25);
      });
    });
    palScroll.querySelector('[data-palact="new"]').onclick = () => newChipModal();
    palScroll.querySelectorAll('[data-ren]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); renameChipModal(b.dataset.ren); });
    palScroll.querySelectorAll('[data-del]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); deleteChipModal(b.dataset.del); });
  }

  function refreshCrumbs() {
    el('.ls').classList.toggle('ls-nested', S.openPath.length > 1);
    crumbsEl.innerHTML = S.openPath.map((id, i) => {
      const c = S.lib.circuits.find((x) => x.id === id);
      const last = i === S.openPath.length - 1;
      return `<button class="ls-crumb ${last ? 'here' : ''}" data-nav="${i}" title="${last ? 'Editing' : 'Open'} ${esc(c ? c.name : '?')}">${esc(c ? c.name : '?')}</button>${last ? '' : '<span class="ls-crumb-sep">›</span>'}`;
    }).join('') + `<button class="ls-btn ls-newchip" title="New chip"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>`;
    crumbsEl.querySelectorAll('[data-nav]').forEach((b) => b.onclick = () => { S.openPath.length = +b.dataset.nav + 1; S.enterCircuit(); });
    crumbsEl.querySelector('.ls-newchip').onclick = () => newChipModal();
    if (S.openPath.length > 1) {
      const back = document.createElement('button');
      back.className = 'ls-btn ls-back'; back.textContent = 'Back';
      back.onclick = () => { S.openPath.pop(); S.enterCircuit(); };
      crumbsEl.appendChild(back);
    }
  }

  function refreshStatus() {
    const c = S.current();
    const bits = [];
    bits.push(`<b>${S.stableFlag ? (S.running ? 'Running' : 'Paused') : '<span class="ls-warn">Unstable (oscillating)</span>'}</b>`);
    bits.push(`tick ${S.tickCount}`);
    bits.push(`${c.comps.length} chips · ${c.wires.length} wires`);
    if (S.selComps.size || S.selWires.size) bits.push(`${S.selComps.size + S.selWires.size} selected`);
    el('.ls-paused').hidden = S.running;
    statusEl.classList.toggle('unstable', !S.stableFlag);
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
  let modalDismiss = null;
  function openModal(build) {
    closeMenu();
    closeModal();
    const ov = document.createElement('div');
    ov.className = 'ls-ov';
    ov.innerHTML = `<div class="ls-modal" role="dialog" aria-modal="true"><div class="ls-m-title"></div><div class="ls-m-body"></div><div class="ls-m-btns"></div></div>`;
    root.appendChild(ov);
    const m = ov.querySelector('.ls-modal');
    const close = () => { ov.remove(); document.removeEventListener('keydown', onEsc, true); if (modalDismiss === close) modalDismiss = null; };
    modalDismiss = close;
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
  function closeModal() {
    if (modalDismiss) modalDismiss();
    root.querySelectorAll('.ls-ov').forEach((o) => o.remove());
  }

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
      if (S.lib.circuits.some((c) => c.name === name)) return toast('A chip with that name already exists');
      const c = C.addCircuit(S.lib, name);
      c.cam = { x: 48, y: 40, z: 1 };
      S.openPath.push(c.id);
      S.enterCircuit();
      hint('Add IN and OUT pins — when you go back, this circuit becomes a chip.');
    });
  }

  function renameChipModal(cid) {
    const c = S.lib.circuits.find((x) => x.id === cid);
    if (!c || c.locked) return;
    askName('Rename chip', c.name, (name) => {
      if (S.lib.circuits.some((x) => x !== c && x.name === name)) return toast('Name already in use');
      const wasCurrent = S.current().id === cid;
      if (wasCurrent) S.mutate(() => { c.name = name; });
      else { c.name = name; S.scheduleSave(); }
      refreshChrome();
    });
  }

  function deleteChipModal(cid) {
    const c = S.lib.circuits.find((x) => x.id === cid);
    if (!c || c.locked) return;
    const usedIn = S.lib.circuits.filter((x) => x.id !== cid && x.comps.some((cp) => cp.type === 'chip' && cp.ref === cid));
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
          S.forgetChip(cid);
          S.lib.circuits = S.lib.circuits.filter((x) => x.id !== cid);
          S.openPath = S.openPath.filter((id) => id !== cid);
          if (!S.openPath.length) S.openPath = [S.mainId];
          S.enterCircuit(); S.scheduleSave();
        },
      });
    });
  }

  function exportModal() {
    openModal((m) => {
      m.title('Export circuits');
      const json = C.exportLib(S.lib, true);
      m.body.innerHTML = `<p class="ls-p dim">All ${S.lib.circuits.length} chips as JSON — save this file to keep a backup or share it.</p>
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
          const n = C.importLib(ta.value, S.lib);
          S.enterCircuit(); S.scheduleSave();
          toast(`Imported ${n} chip${n === 1 ? '' : 's'}`);
          m.close();
        } catch (e2) { err.textContent = e2.message || 'Could not import that file.'; }
      };
      m.btn('Cancel', {});
      m.btn('Import', { primary: true, onClick: () => { doImport(); return false; }, keepOpen: true });
    });
  }

  function libraryModal() {
    openModal((m) => {
      m.title('CHIP LIBRARY');
      m.body.innerHTML = '<input class="ls-in ls-search" aria-label="Find chip" placeholder="Search chips…"><div class="ls-library-grid"></div>';
      const search = m.body.querySelector('input');
      const grid = m.body.querySelector('.ls-library-grid');
      const render = () => {
        const q = search.value.trim().toLowerCase();
        const items = [
          ...Object.values(C.BUILTINS).map((t) => ({ name: t.name, put: t.key, desc: t.desc, type: t.key })),
          ...S.lib.circuits.map((c) => ({ name: c.name, id: c.id, put: 'chip:' + c.id, desc: c.comps.length + ' chips · ' + c.wires.length + ' wires', type: 'chip' })),
        ].filter((t) => t.name.toLowerCase().includes(q));
        grid.innerHTML = items.length ? items.map((t, i) => `<div class="ls-library-card">
          <div class="ls-library-preview" style="--chip-color:${chipColor(t.type, t.name)}">${esc(t.name)}</div>
          <span class="dim">${esc(t.desc || '')}</span><div class="ls-library-card-actions">
          ${t.id ? `<button class="ls-btn" data-open="${i}">OPEN</button>` : ''}
          <button class="ls-btn" data-place="${i}">PLACE</button></div></div>`).join('') : '<p class="dim">No matching chips.</p>';
        grid.querySelectorAll('[data-open]').forEach((b) => b.onclick = () => {
          const t = items[+b.dataset.open];
          S.openPath = t.id === S.mainId ? [S.mainId] : [S.mainId, t.id];
          m.close(); S.enterCircuit(); S.fitView(); cv.focus();
        });
        grid.querySelectorAll('[data-place]').forEach((b) => b.onclick = () => {
          const t = items[+b.dataset.place]; m.close();
          S.placeFromPalette(t.put, (stage.clientWidth / 2 - S.cam.x) / S.cam.z - 40, (stage.clientHeight / 2 - S.cam.y) / S.cam.z - 25);
          cv.focus();
        });
      };
      search.addEventListener('input', render); render();
      m.btn('NEW CHIP', { onClick: () => { m.close(); newChipModal(); } });
      m.btn('CLOSE', { primary: true });
      search.focus();
    });
  }

  function preferencesModal() {
    openModal((m) => {
      m.title('PREFERENCES');
      m.body.innerHTML = `<label class="ls-check"><input type="checkbox" data-pref="grid" ${S.showGrid ? 'checked' : ''}> Show grid</label>
        <label class="ls-check"><input type="checkbox" data-pref="tools" ${S.showTools ? 'checked' : ''}> Show simulation &amp; zoom toolbar</label>
        <p class="ls-p dim">Space: run / pause · Enter: step · Mouse wheel: zoom<br>Middle or right drag: pan · Ctrl+Z / Y: undo / redo</p>
        <p class="ls-p dim">Your circuits autosave in this browser. Export a backup from MENU.</p>`;
      m.body.querySelector('[data-pref="grid"]').onchange = (e) => { S.showGrid = e.target.checked; S.scheduleSave(); };
      m.body.querySelector('[data-pref="tools"]').onchange = (e) => {
        S.showTools = e.target.checked; el('.ls').classList.toggle('ls-show-tools', S.showTools); S.layout(); S.scheduleSave();
      };
      m.btn(S.running ? 'PAUSE SIMULATION' : 'RUN SIMULATION', { onClick: () => S.setRunning(!S.running) });
      m.btn('DONE', { primary: true });
    });
  }

  function helpModal() {
    openModal((m) => {
      m.title('Controls');
      m.body.innerHTML = `
      <div class="ls-help">
        <div><b>Place a chip</b><span>Drag it from the bottom bar, click a chip to place it, or use LIBRARY</span></div>
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
        <p class="dim">Inspired by <b>Sebastian Lague’s</b> <i>Digital Logic Sim</i> (MIT licence) — <a href="https://github.com/SebLague/Digital-Logic-Sim" target="_blank" rel="noopener">github.com/SebLague/Digital-Logic-Sim</a> — and his video series <i>Exploring How Computers Work</i>. This is an independent re-implementation for the web: the UI follows the original’s layout, theme and JetBrains Mono font; the simulation engine is a separate browser implementation that runs, including inside <b>proton</b> as an app and a built-in website.</p>
        <p class="dim">The starter library (Half Adder, Full Adder, SR Latch, and the blinking Main demo) mirrors the classic teaching examples. Everything you make is stored in localStorage and can be exported as JSON from MENU.</p>
      </div>`;
      m.btn('Close', { primary: true });
    });
  }

  function welcomeModal() {
    openModal((m) => {
      m.title('Welcome to Digital Logic Sim');
      m.body.innerHTML = `
      <div class="ls-about">
        <p>A web edition of Sebastian Lague’s logic simulator, re-created for the browser with the original’s gray workspace, colored chips, and bottom chip bar.</p>
        <p>Try it: press <b>▶ Run</b> — the demo on <b>Main</b> blinks. Then open <b>Full Adder</b> using <b>LIBRARY</b>, step inside its chips with a double-click, and toggle the input switches.</p>
        <p class="dim">Build chips from IN/OUT pins + gates and they appear in the bottom bar and library, ready to nest inside other circuits. Everything autosaves on this device.</p>
      </div>`;
      m.btn('Start building', { primary: true, onClick: () => { S.seenWelcome = true; S.scheduleSave(); } });
    });
  }

  /* ---------- toolbar wiring ---------- */
  const actions = {
    undo: S.undo, redo: S.redo,
    step: () => { S.doTick(); hint('Tick ' + S.tickCount); },
    run: () => S.setRunning(!S.running),
    zin: () => S.zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, 1.2),
    zout: () => S.zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, 1 / 1.2),
    z100: () => { S.cam.z = 1; S.scheduleSave(); S.updateZoomLabel(); },
    fit: S.fitView,
    menu: openMenu, library: libraryModal, prefs: preferencesModal,
  };
  root.querySelectorAll('[data-a]').forEach((b) => {
    b.addEventListener('click', () => { const fn = actions[b.dataset.a]; if (fn) fn(); });
  });
  speedInput.addEventListener('input', () => {
    speedLabel.textContent = speedInput.value + ' tps';
    S.restartTimer();
  });

  let menuDismiss = null;
  function closeMenu() {
    el('.ls-pop')?.remove();
    el('.ls-menu-btn').setAttribute('aria-expanded', 'false');
    if (menuDismiss) document.removeEventListener('pointerdown', menuDismiss, true);
    menuDismiss = null;
  }
  function openMenu() {
    const existing = root.querySelector('.ls-pop');
    if (existing) { closeMenu(); return; }
    const pop = document.createElement('div');
    pop.className = 'ls-pop';
    pop.style.maxHeight = Math.max(80, root.clientHeight - 66) + 'px';
    const cur = S.current();
    pop.innerHTML = `
      <button data-m="new"><b>NEW CHIP</b><span>Ctrl+N</span></button>
      <button data-m="save"><b>SAVE CHIP</b><span>Ctrl+S</span></button>
      <button data-m="library"><b>FIND CHIP / LIBRARY</b><span>Ctrl+L</span></button>
      <button data-m="prefs"><b>PREFS</b><span>Ctrl+P</span></button>
      <hr>
      <button data-m="ren" ${cur.locked ? 'disabled' : ''}><b>RENAME CHIP</b></button>
      <button data-m="del" ${cur.locked ? 'disabled' : ''}><b>DELETE CHIP</b></button>
      <hr>
      <button data-m="export"><b>EXPORT CIRCUITS</b></button>
      <button data-m="import"><b>IMPORT CIRCUITS</b></button>
      <hr>
      <button data-m="help"><b>CONTROLS</b></button>
      <button data-m="about"><b>ABOUT</b></button>`;
    el('.ls-bottom').appendChild(pop);
    el('.ls-menu-btn').setAttribute('aria-expanded', 'true');
    menuDismiss = (e) => {
      if (!pop.contains(e.target) && !e.target.closest('.ls-menu-btn')) closeMenu();
    };
    document.addEventListener('pointerdown', menuDismiss, true);
    const fns = {
      new: () => newChipModal(), ren: () => renameChipModal(S.current().id), del: () => deleteChipModal(S.current().id),
      save: () => { S.saveNow(); toast('Chip saved on this device'); },
      library: libraryModal, prefs: preferencesModal,
      export: exportModal, import: importModal, help: helpModal, about: aboutModal,
    };
    pop.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => { closeMenu(); const f = fns[b.dataset.m]; if (f && !b.disabled) f(); }));
  }


  /* teardown for editor unmount */
  function destroy() {
    closeMenu();
    closeModal();
    clearTimeout(hintTimer);
    clearTimeout(toastTimer);
  }

  Object.assign(S, {
    refreshPalette, refreshCrumbs, refreshStatus, refreshChrome, hint, toast,
    openModal, closeModal, askName, newChipModal, renameChipModal, deleteChipModal,
    exportModal, importModal, libraryModal, preferencesModal, helpModal, aboutModal,
    welcomeModal, closeMenu, openMenu,
  });
  return { destroy };
}

L.createUi = createUi;
if (typeof module !== 'undefined' && module.exports) module.exports = createUi;
})(typeof window !== 'undefined' ? window : globalThis);
