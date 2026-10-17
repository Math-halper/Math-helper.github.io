/* proton — per-account desktop shortcuts. An icon is a link to an app or a
 * VFS path, never another copy of (or ownership of) its target. The desktop
 * grid is laid out at render time, so a narrower window cannot overlap icons
 * or overwrite the positions saved for a larger screen.
 *
 * proton ships no Files app, so shortcuts to files and folders can no longer
 * be created here; the ones an older account saved still render (and report
 * that nothing can open them) until they are removed. */
'use strict';

const DesktopIcons = (() => {
  const WIDTH = 94, HEIGHT = 98, PAD_X = 14, PAD_Y = 12, LIMIT = 200;
  let selected = null, suppressClick = null, unwatch = null, stopDrag = null;
  let returnFocus = null;
  const area = () => MH.$('desktop-icons');
  const list = () => MH.$('desktop-icon-list');
  const context = () => MH.$('desktop-context');
  const picker = () => MH.$('desktop-picker');
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const key = (col, row) => `${col}:${row}`;

  function grid(count = visibleEntries().length) {
    const width = area()?.clientWidth || window.innerWidth;
    const height = area()?.clientHeight || Math.max(HEIGHT, window.innerHeight - 44);
    const cols = Math.max(1, Math.floor((width - PAD_X * 2) / WIDTH));
    const visibleRows = Math.max(1, Math.floor((height - PAD_Y * 2) / HEIGHT));
    // If there are more icons than fit on the screen, the desktop scrolls.
    // Include those rows in hit-testing too, so they can still be rearranged.
    return { width, height, cols, rows: Math.max(visibleRows, Math.ceil(count / cols)) };
  }
  function freeCell(preferred, occupied, g) {
    if (!preferred) {
      for (let col = 0; col < g.cols; col++) for (let row = 0; row < g.rows; row++) {
        if (!occupied.has(key(col, row))) return { col, row };
      }
    } else {
      const col = clamp(preferred.col, 0, g.cols - 1), row = clamp(preferred.row, 0, g.rows - 1);
      if (!occupied.has(key(col, row))) return { col, row };
      let best = null, distance = Infinity;
      for (let c = 0; c < g.cols; c++) for (let r = 0; r < g.rows; r++) {
        if (occupied.has(key(c, r))) continue;
        const d = Math.abs(c - col) + Math.abs(r - row);
        if (d < distance) { best = { col: c, row: r }; distance = d; }
      }
      if (best) return best;
    }
    // A very full desktop scrolls instead of silently hiding extra entries.
    for (let row = g.rows; ; row++) for (let col = 0; col < g.cols; col++) {
      if (!occupied.has(key(col, row))) return { col, row };
    }
  }
  function visibleEntries() {
    if (!userData || !currentUser) return [];
    return userData.desktopIcons.filter((entry) => entry.kind === 'path'
      || (APPS[entry.target] && !userData.hiddenApps.includes(entry.target)));
  }
  function placements() {
    const visible = visibleEntries(), g = grid(visible.length), occupied = new Set();
    const entries = visible.map((entry) => {
      const cell = freeCell({ col: entry.col, row: entry.row }, occupied, g);
      occupied.add(key(cell.col, cell.row));
      return { entry, ...cell };
    });
    return { g, entries, occupied };
  }
  function info(entry) {
    if (entry.kind === 'app') {
      const app = APPS[entry.target];
      return { name: app.name, icon: app.icon, detail: 'Application', missing: false };
    }
    const st = FS.stat(entry.target);
    const icon = !st ? 'alert' : st.type === 'dir' ? 'folder'
      : FS.appFor(st.path) === 'browser' ? 'globe' : 'file';
    return { name: st && st.path === FS.home() ? 'Home' : st?.name || FS.basename(entry.target), icon,
      detail: (st ? st.path : 'Missing: ' + entry.target), missing: !st };
  }
  function highlight() {
    list()?.querySelectorAll('.desktop-icon').forEach((button) => {
      const active = button.dataset.shortcut === selected;
      button.classList.toggle('selected', active);
      button.setAttribute('aria-selected', String(active));
    });
    const openButton = MH.$('desktop-open'), removeButton = MH.$('desktop-remove');
    if (openButton) openButton.hidden = !selected;
    if (removeButton) removeButton.hidden = !selected;
  }
  function focusIcon(id) {
    const button = [...(list()?.querySelectorAll('.desktop-icon') || [])]
      .find((el) => el.dataset.shortcut === id);
    button?.focus({ preventScroll: true });
  }
  function render() {
    const host = list(); if (!host || !currentUser || !userData) return;
    if (stopDrag) stopDrag();
    const focused = document.activeElement?.closest?.('.desktop-icon')?.dataset.shortcut;
    const { g, entries } = placements();
    host.style.height = Math.max(g.height, (Math.max(-1, ...entries.map((x) => x.row)) + 1) * HEIGHT + PAD_Y * 2) + 'px';
    host.innerHTML = entries.map(({ entry, col, row }) => {
      const { name, icon, detail, missing } = info(entry);
      return `<button type="button" class="desktop-icon${missing ? ' missing' : ''}" data-shortcut="${MH.esc(entry.id)}" data-col="${col}" data-row="${row}" aria-label="${MH.esc(name)}${missing ? ', missing' : ''}, desktop shortcut" aria-selected="false" title="${MH.esc(name + ' — ' + detail)}" style="left:${PAD_X + col * WIDTH}px;top:${PAD_Y + row * HEIGHT}px"><span class="desktop-icon-glyph">${iconFor(icon)}<span class="desktop-shortcut-mark">${iconSvg('external')}</span></span><span class="desktop-icon-label">${MH.esc(name)}</span></button>`;
    }).join('');
    if (selected && !entries.some(({ entry }) => entry.id === selected)) selected = null;
    highlight();
    if (focused) focusIcon(focused);
  }
  function commit(next, focusId = null) {
    if (!currentUser || !userData) return false;
    const before = userData.desktopIcons;
    userData.desktopIcons = next;
    if (!saveDataNow()) { userData.desktopIcons = before; render(); return false; }
    render();
    if (focusId) { selected = focusId; highlight(); focusIcon(focusId); }
    window.dispatchEvent(new Event('proton-desktop-icons-changed'));
    return true;
  }
  function addApp(id, preferred = null) {
    if (!currentUser || !APPS[id] || userData.hiddenApps.includes(id)) return false;
    const existing = userData.desktopIcons.find((x) => x.kind === 'app' && x.target === id);
    if (existing) { selected = existing.id; highlight(); focusIcon(existing.id); MH.toast('That app is already on your desktop.'); return false; }
    if (userData.desktopIcons.length >= LIMIT) { MH.toast('Your desktop has reached its shortcut limit.'); return false; }
    const { g, occupied } = placements(), { col, row } = freeCell(preferred, occupied, g);
    const entry = { id: 'desktop-' + MH.uid(), kind: 'app', target: id, col, row };
    if (commit([...userData.desktopIcons, entry], entry.id)) { MH.toast(`${APPS[id].name} added to the desktop.`); return true; }
    return false;
  }
  function remove(id) {
    if (!userData?.desktopIcons.some((x) => x.id === id)) return false;
    const before = userData.desktopIcons;
    if (!commit(before.filter((x) => x.id !== id))) return false;
    selected = null; highlight();
    MH.toast('Shortcut removed. The app or file was not deleted.');
    return true;
  }
  function move(id, preferred) {
    const icon = [...(list()?.querySelectorAll('.desktop-icon') || [])].find((x) => x.dataset.shortcut === id);
    const entry = userData?.desktopIcons.find((x) => x.id === id);
    if (!icon || !entry) return false;
    const { g, entries } = placements();
    const oldCell = { col: +icon.dataset.col, row: +icon.dataset.row };
    const cell = { col: clamp(preferred.col, 0, g.cols - 1), row: clamp(preferred.row, 0, g.rows - 1) };
    if (cell.col === oldCell.col && cell.row === oldCell.row) { render(); return true; }
    // Dropping onto another shortcut swaps the two, instead of appearing to
    // bounce back to the original spot or stacking them on top of each other.
    const other = entries.find((x) => x.entry.id !== id && x.col === cell.col && x.row === cell.row)?.entry;
    return commit(userData.desktopIcons.map((x) => x.id === id ? { ...x, ...cell }
      : x.id === other?.id ? { ...x, ...oldCell } : x), id);
  }
  function arrange() {
    const g = grid(), occupied = new Set();
    const next = userData.desktopIcons.map((entry) => {
      // Hidden apps keep their link but take no space on the visible desktop.
      if (entry.kind === 'app' && (!APPS[entry.target] || userData.hiddenApps.includes(entry.target))) return entry;
      const cell = freeCell(null, occupied, g);
      occupied.add(key(cell.col, cell.row));
      return { ...entry, ...cell };
    });
    if (commit(next)) MH.toast('Desktop icons arranged.');
  }
  function activate(id) {
    const entry = userData?.desktopIcons.find((x) => x.id === id);
    if (!entry) return;
    if (entry.kind === 'app') {
      if (APPS[entry.target] && !userData.hiddenApps.includes(entry.target)) openApp(entry.target);
    } else openFSItem(entry.target);
  }
  function closeMenu() {
    const host = context(); if (!host) return;
    const hadFocus = host.contains(document.activeElement);
    host.hidden = true; host.innerHTML = '';
    if (hadFocus && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
  }
  function menu(e, { shortcutId = null, appId = null } = {}) {
    const host = context(); if (!host || !currentUser) return;
    e?.preventDefault?.(); closeMenu(); closePicker();
    const entry = userData.desktopIcons.find((x) => x.id === shortcutId);
    const actions = [];
    const add = (label, run) => actions.push({ label, run });
    if (entry) {
      selected = entry.id; highlight();
      add('Open', () => activate(entry.id));
      actions.push(null);
      add('Remove shortcut (keep original)', () => remove(entry.id));
    } else if (appId && APPS[appId]) {
      add('Open ' + APPS[appId].name, () => openApp(appId));
      const existing = userData.desktopIcons.find((x) => x.kind === 'app' && x.target === appId);
      add(existing ? 'Remove from desktop' : 'Add to desktop', () => existing ? remove(existing.id) : addApp(appId));
    } else {
      add('Add application…', showPicker);
      actions.push(null);
      add('Arrange icons', arrange);
    }
    returnFocus = document.activeElement;
    host.innerHTML = actions.map((action, i) => action
      ? `<button type="button" role="menuitem" data-action="${i}">${MH.esc(action.label)}</button>`
      : '<div class="desktop-context-rule" role="separator"></div>').join('');
    host.querySelectorAll('[data-action]').forEach((button) => button.onclick = () => {
      const run = actions[+button.dataset.action].run;
      closeMenu(); run();
    });
    host.hidden = false;
    host.style.left = `${clamp(e?.clientX || 16, 8, window.innerWidth - host.offsetWidth - 8)}px`;
    host.style.top = `${clamp(e?.clientY || 16, 8, window.innerHeight - host.offsetHeight - 50)}px`;
    host.querySelector('button')?.focus({ preventScroll: true });
  }
  function closePicker() {
    const host = picker(); if (!host || host.hidden) return;
    const hadFocus = host.contains(document.activeElement);
    host.hidden = true; host.innerHTML = '';
    if (hadFocus) (returnFocus?.isConnected ? returnFocus : area()?.querySelector('#desktop-add'))?.focus({ preventScroll: true });
    returnFocus = null;
  }
  function showPicker() {
    closeMenu();
    const host = picker(); if (!host) return;
    returnFocus = document.activeElement;
    host.innerHTML = `<div class="desktop-picker-dialog" role="dialog" aria-modal="true" aria-label="Add application shortcut">
      <div class="desktop-picker-head"><div><strong>Add application</strong><small>Choose an app to put on your desktop</small></div><button type="button" class="desktop-picker-close" aria-label="Close">${iconSvg('x')}</button></div>
      <input type="search" class="desktop-picker-search" placeholder="Search applications…" aria-label="Search applications">
      <div class="desktop-picker-list"></div>
      <p class="desktop-picker-help">A shortcut is a link: removing it never deletes the app.</p>
    </div>`;
    const results = host.querySelector('.desktop-picker-list');
    function draw(query = '') {
      const apps = Object.values(APPS).filter((app) => !userData.hiddenApps.includes(app.id)
        && (app.name + ' ' + app.cat + ' ' + app.desc).toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));
      results.innerHTML = apps.length ? apps.map((app) => {
        const present = userData.desktopIcons.some((x) => x.kind === 'app' && x.target === app.id);
        return `<button type="button" class="desktop-picker-item" data-app="${MH.esc(app.id)}"><span class="desktop-picker-glyph">${iconFor(app.icon)}</span><span><b>${MH.esc(app.name)}</b><small>${MH.esc(app.cat)}</small></span>${present ? '<em>On desktop</em>' : iconSvg('plus')}</button>`;
      }).join('') : '<p class="desktop-picker-empty">No matching apps.</p>';
      results.querySelectorAll('[data-app]').forEach((button) => button.onclick = () => {
        const id = button.dataset.app;
        closePicker(); addApp(id);
      });
    }
    host.querySelector('.desktop-picker-search').oninput = (e) => draw(e.target.value);
    host.querySelector('.desktop-picker-close').onclick = closePicker;
    host.onclick = (e) => { if (e.target === host) closePicker(); };
    host.hidden = false;
    draw();
    host.querySelector('.desktop-picker-search').focus();
  }
  function cellFromPointer(e) {
    const rect = area().getBoundingClientRect(), g = grid();
    return { col: clamp(Math.round((e.clientX - rect.left + area().scrollLeft - PAD_X - WIDTH / 2) / WIDTH), 0, g.cols - 1),
      row: clamp(Math.round((e.clientY - rect.top + area().scrollTop - PAD_Y - HEIGHT / 2) / HEIGHT), 0, g.rows - 1) };
  }
  function pointerDown(e) {
    if (e.button !== 0) return;
    const button = e.target.closest('.desktop-icon');
    if (e.target.closest('.desktop-tools')) return;
    if (!button || !list().contains(button)) { selected = null; highlight(); return; }
    closeMenu(); suppressClick = null;
    const id = button.dataset.shortcut;
    selected = id; highlight(); button.focus({ preventScroll: true });
    const startX = e.clientX, startY = e.clientY;
    const left = parseFloat(button.style.left), top = parseFloat(button.style.top);
    let dragging = false;
    function cleanup() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('blur', onCancel);
      button.classList.remove('dragging'); stopDrag = null;
    }
    function onMove(ev) {
      if (e.pointerId !== undefined && ev.pointerId !== e.pointerId) return;
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (!dragging && Math.hypot(dx, dy) < 6) return;
      dragging = true; ev.preventDefault();
      button.classList.add('dragging');
      const g = grid();
      button.style.left = `${clamp(left + dx, 0, Math.max(0, g.width - WIDTH))}px`;
      button.style.top = `${clamp(top + dy, 0, Math.max(0, (list().offsetHeight || parseFloat(list().style.height)) - HEIGHT))}px`;
    }
    function onUp(ev) {
      if (e.pointerId !== undefined && ev.pointerId !== e.pointerId) return;
      cleanup();
      if (!dragging) return;
      suppressClick = id; // pointerup may synthesize a click; it must not open anything
      const g = grid();
      move(id, {
        col: clamp(Math.round((parseFloat(button.style.left) - PAD_X) / WIDTH), 0, g.cols - 1),
        row: clamp(Math.round((parseFloat(button.style.top) - PAD_Y) / HEIGHT), 0, g.rows - 1),
      });
    }
    function onCancel() { cleanup(); if (dragging) render(); }
    stopDrag = cleanup;
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('blur', onCancel);
  }
  function onFSChange(paths) {
    if (!userData || !currentUser) return;
    const [from, to] = paths;
    if (from && to && from !== to) {
      let updated = false;
      const next = userData.desktopIcons.map((entry) => {
        if (entry.kind !== 'path' || (entry.target !== from && !entry.target.startsWith(from + '/'))) return entry;
        updated = true;
        return { ...entry, target: to + entry.target.slice(from.length) };
      });
      if (updated) { commit(next); return; }
    }
    if (paths.some((p) => userData.desktopIcons.some((entry) => entry.kind === 'path'
      && (entry.target === p || entry.target.startsWith(p + '/') || p.startsWith(entry.target + '/'))))) render();
  }
  function mount() {
    const host = area(); if (!host) return;
    render();
    host.addEventListener('pointerdown', pointerDown);
    host.addEventListener('click', (e) => {
      if (e.target.closest('.desktop-tools')) return;
      const button = e.target.closest('.desktop-icon');
      if (button && suppressClick === button.dataset.shortcut) { suppressClick = null; e.preventDefault(); return; }
      selected = button?.dataset.shortcut || null; highlight();
    });
    host.addEventListener('dblclick', (e) => {
      const button = e.target.closest('.desktop-icon');
      if (button && !suppressClick) activate(button.dataset.shortcut);
    });
    host.addEventListener('contextmenu', (e) => {
      const button = e.target.closest('.desktop-icon');
      menu(e, { shortcutId: button?.dataset.shortcut });
    });
    host.addEventListener('keydown', (e) => {
      const button = e.target.closest('.desktop-icon'); if (!button) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(button.dataset.shortcut); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(button.dataset.shortcut); }
      else if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) { e.preventDefault(); menu(e, { shortcutId: button.dataset.shortcut }); }
      else if (e.altKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        move(button.dataset.shortcut, { col: +button.dataset.col + (e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0),
          row: +button.dataset.row + (e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0) });
      }
    });
    host.addEventListener('dragover', (e) => {
      if (!Array.from(e.dataTransfer?.types || []).includes('application/x-proton-app')) return;
      e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; host.classList.add('desktop-drop');
    });
    host.addEventListener('dragleave', (e) => { if (!e.relatedTarget || !host.contains(e.relatedTarget)) host.classList.remove('desktop-drop'); });
    host.addEventListener('drop', (e) => {
      host.classList.remove('desktop-drop');
      if (!Array.from(e.dataTransfer?.types || []).includes('application/x-proton-app')) return;
      e.preventDefault(); addApp(e.dataTransfer.getData('application/x-proton-app'), cellFromPointer(e));
    });
    MH.$('desktop-add').onclick = showPicker;
    MH.$('desktop-open').onclick = () => { if (selected) activate(selected); };
    MH.$('desktop-remove').onclick = () => { if (selected) remove(selected); };
    const dismiss = (e) => { if (!context()?.hidden && !context().contains(e.target)) closeMenu(); };
    const keys = (e) => {
      if (e.key !== 'Escape') return;
      if (!picker()?.hidden) { e.preventDefault(); closePicker(); }
      else if (!context()?.hidden) { e.preventDefault(); closeMenu(); }
    };
    const resize = () => render();
    document.addEventListener('pointerdown', dismiss, true);
    document.addEventListener('keydown', keys);
    window.addEventListener('resize', resize);
    unwatch = FS.watch(onFSChange);
    mount.cleanup = () => {
      stopDrag?.(); stopDrag = null;
      document.removeEventListener('pointerdown', dismiss, true);
      document.removeEventListener('keydown', keys);
      window.removeEventListener('resize', resize);
    };
  }
  function unmount() {
    mount.cleanup?.(); mount.cleanup = null;
    unwatch?.(); unwatch = null;
    closeMenu(); closePicker();
    selected = null; suppressClick = null;
  }
  return { mount, unmount, render, addApp, remove, move, arrange, menu, showPicker };
})();
