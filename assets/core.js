/* proton — auth screens, desktop, panel, start menu, window manager,
 * and the productivity apps (Files, Notes, Calendar, Contacts, Mail,
 * Vault, App Center, Settings). Games & media live in apps.js.
 * Window chrome/panel styling follows Mixt's Mint-Y theme (mixt.css).
 */
'use strict';

/* ---------------- app registry + window manager ---------------- */
const APPS = {};
function registerApp(def) { APPS[def.id] = def; }


/* ---------- user-added apps & websites (Mixt-style add/remove) ---------- */
const dynamicAppIds = new Set();
let pendingBrowserURL = '';

function normalizeUserData() {
  if (!userData) return;
  userData.customApps ||= [];
  userData.websites ||= [];
  userData.hiddenApps ||= [];
  userData.settings.pinned ||= [];
  /* --- modular customisation state --- */
  userData.moduleOverrides ||= {};   // appId -> {name, icon, cat, desc, order}
  userData.customThemes ||= [];      // {id, name, accent, wallpaper}
  userData.customWallpapers ||= [];  // {id, name, from, to}
  if (!userData.settings.activeThemeId) userData.settings.activeThemeId = 'proton-dark';
  userData.settings.components = {
    clock: true, desktopHint: true, lockButton: true, userButton: true,
    startSearch: true, panelLabels: false,
    ...(userData.settings.components || {}),
  };
}
/* Turn "example.com" / "example.com/x" into a safe http(s) URL, or null. */
function normalizeUrl(raw) {
  let s = String(raw || '').trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  try {
    const u = new URL(s);
    return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : null;
  } catch { return null; }
}
function clearDynamicApps() {
  for (const id of dynamicAppIds) delete APPS[id];
  dynamicAppIds.clear();
  pendingBrowserURL = '';
}
/* (Re)register this account's custom apps so they behave exactly like
 * built-ins: proton menu, pinning, windows, search. */
function syncCustomApps() {
  clearDynamicApps();
  if (!userData) return;
  normalizeUserData();
  applyModuleOverrides();
  for (const def of userData.customApps) {
    APPS[def.id] = {
      id: def.id, name: def.name, icon: def.icon || 'grid', cat: 'My Apps',
      desc: def.desc || def.url, w: 980, h: 620,
      render(body) {
        body.innerHTML = `${bar(def.name, `<span class="muted" style="max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${MH.esc(def.url)}</span><button class="btn sm" data-w="reload">${iconSvg('refresh')} Reload</button><button class="btn sm primary" data-w="ext">${iconSvg('external')} Open in new tab</button>`)}
        <div class="app-main"><iframe title="${MH.esc(def.name)}" src="${MH.esc(def.url)}" style="width:100%;height:100%;min-height:420px;border:0" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
        <p class="muted" style="padding:8px 14px">If this stays blank, ${MH.esc(def.name)} refuses to be embedded — use “Open in new tab”. proton never uploads or proxies it; your browser loads it directly.</p></div>`;
        body.querySelector('[data-w="ext"]').onclick = () => window.open(def.url, '_blank', 'noopener');
        body.querySelector('[data-w="reload"]').onclick = () => { const f = body.querySelector('iframe'); f.src = def.url; };
      },
    };
    dynamicAppIds.add(def.id);
  }
  applyModuleOverrides();
}
function refreshChrome() { renderStartMenu(''); renderPanelApps(); }

/* Every built-in module's factory metadata, captured once, so user edits
 * (rename, re-icon, re-categorise, reorder) can always be reset. */
const BASE_MODULES = {};
function snapshotModules() {
  Object.values(APPS).forEach((a, i) => {
    if (dynamicAppIds.has(a.id) || BASE_MODULES[a.id]) return;
    BASE_MODULES[a.id] = { name: a.name, icon: a.icon, cat: a.cat, desc: a.desc, index: i };
  });
}
function applyModuleOverrides() {
  if (!userData) return;
  normalizeUserData(); snapshotModules();
  for (const a of Object.values(APPS)) {
    if (dynamicAppIds.has(a.id)) continue;
    const base = BASE_MODULES[a.id]; if (!base) continue;
    a.name = base.name; a.icon = base.icon; a.cat = base.cat; a.desc = base.desc;
    a.baseIndex = base.index; delete a.sortOrder;
    const o = userData.moduleOverrides[a.id];
    if (o) {
      if (o.name) a.name = o.name;
      if (o.icon) a.icon = o.icon;
      if (o.cat) a.cat = o.cat;
      if (o.desc !== undefined) a.desc = o.desc;
      if (o.order !== undefined && o.order !== '') a.sortOrder = Number(o.order);
    }
  }
}
/* Wallpaper + theme application (built-ins are CSS classes; customs inline). */
function customWallpaper() {
  normalizeUserData();
  return userData.customWallpapers.find((w) => w.id === userData.settings.wallpaper) || null;
}
function applyWallpaper() {
  const el = document.querySelector('.wallpaper'); if (!el) return;
  const w = customWallpaper();
  if (w) {
    el.className = 'wallpaper'; el.removeAttribute('data-wp');
    el.style.backgroundColor = w.to;
    el.style.backgroundImage = `radial-gradient(900px 500px at 75% 12%, rgba(255,255,255,.14), transparent 55%), linear-gradient(150deg, ${w.from}, ${w.to})`;
  } else {
    el.style.background = ''; el.style.backgroundColor = ''; el.style.backgroundImage = '';
    el.className = 'wallpaper wp-' + (userData.settings.wallpaper || 'mint');
  }
}
function setWallpaper(id) { userData.settings.wallpaper = id; saveData(); applyWallpaper(); }
function activeCustomTheme() {
  normalizeUserData();
  return userData.customThemes.find((th) => th.id === userData.settings.activeThemeId) || null;
}
function applyComponents() {
  if (!userData) return;
  const c = userData.settings.components || {};
  const set = (id, show) => { const el = MH.$(id); if (el) el.style.display = show ? '' : 'none'; };
  set('desktop-hint', c.desktopHint !== false);
  set('tray-lock', c.lockButton !== false);
  set('tray-user', c.userButton !== false);
  set('clockbox', c.clock !== false);
  const search = document.querySelector('.sm-search');
  if (search) search.style.display = c.startSearch !== false ? '' : 'none';
}
/* Open a saved website in the Browser app (fresh window so it navigates). */
function openWebsite(site) {
  pendingBrowserURL = site.url;
  if (wins.has('browser')) closeWin('browser');
  openApp('browser');
}
/* Turn a saved website into its own windowed app. Returns true if created. */
function websiteAsApp(site) {
  normalizeUserData();
  if (userData.customApps.some((a) => a.url === site.url)) { MH.toast('That website is already one of your apps.'); return false; }
  userData.customApps.push({ id: 'custom-' + MH.uid(), name: site.name, icon: site.icon || 'globe', desc: 'Website app — ' + site.url, url: site.url });
  syncCustomApps(); saveData(); refreshChrome();
  MH.toast(`“${site.name}” added as an app — find it in the proton menu, under My Apps.`);
  return true;
}

/* ---------------- built-in websites registry ----------------
 * Each built-in website lives in websites/<name>/site.js and calls
 * registerSite({ id, name, icon, desc, render(main, ctx) }).
 * The Browser app (apps/browser/app.js) renders whatever is registered. */
const SITES = {};
function registerSite(def) { SITES[def.id] = def; }

/* ---------- tiny safe-ish maths evaluator (own input only, this device) --- */
function evalMath(expr, xVal = 0) {
  let e = String(expr).trim().toLowerCase().replace(/\^/g, '**').replace(/,/g, '.');
  if (!e || !/^[0-9a-z+\-*/%(). ]+$/.test(e)) throw new Error('Use numbers, + − × ÷, brackets, x, sin/cos/sqrt/pi');
  e = e.replace(/\bpi\b/g, 'Math.PI').replace(/\be\b/g, 'Math.E')
       .replace(/\b(sin|cos|tan|sqrt|abs|log|exp)\b/g, 'Math.$1');
  // bare x becomes the supplied value; identifiers left must be Math.* only
  e = e.replace(/(?<![\w.])x(?![\w])/g, `(${Number(xVal) || 0})`);
  if (/(?<![\w.])[a-z]+/.test(e.replace(/Math\.[A-Z]+/g, ''))) throw new Error('Unknown name in expression');
  const v = Function('"use strict"; return (' + e + ')')();
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error('No numeric result');
  return v;
}
const fmtNum = (v) => Math.abs(v) >= 1e12 || (Math.abs(v) < 1e-9 && v !== 0) ? v.toExponential(6) : String(Math.round(v * 1e10) / 1e10);

const ACCENTS = {
  '#68b723': { dim: '#8ed081', soft: '#1e3512', name: 'Mint green' },
  '#3d7fca': { dim: '#7db3e8', soft: '#12283f', name: 'Blue' },
  '#8e5ec9': { dim: '#c39af0', soft: '#2a183f', name: 'Purple' },
  '#e67e22': { dim: '#f5a65b', soft: '#3a2410', name: 'Orange' },
  '#d64570': { dim: '#f28bb4', soft: '#3a1626', name: 'Pink' },
};
function applyAccent() {
  const theme = activeCustomTheme();
  if (theme) {
    document.documentElement.style.setProperty('--accent', theme.accent);
    document.documentElement.style.setProperty('--accent-dim', theme.accent);
    document.documentElement.style.setProperty('--accent-soft', `color-mix(in srgb, ${theme.accent} 26%, black)`);
    return;
  }
  const a = ACCENTS[userData.settings.accent] || ACCENTS['#68b723'];
  document.documentElement.style.setProperty('--accent', userData.settings.accent);
  document.documentElement.style.setProperty('--accent-dim', a.dim);
  document.documentElement.style.setProperty('--accent-soft', a.soft);
}

const wins = new Map(); // appId -> {el, body, title}
let zTop = 20, activeApp = null, clockTimer = null, locked = false;

function focusWin(id) {
  const w = wins.get(id); if (!w) return;
  w.el.style.zIndex = ++zTop;
  w.el.classList.remove('min');
  activeApp = id;
  document.querySelectorAll('.win').forEach((e) => e.classList.toggle('active', e === w.el));
  renderPanelApps();
}
function closeWin(id) {
  const w = wins.get(id); if (!w) return;
  w.el.remove(); wins.delete(id);
  if (activeApp === id) activeApp = null;
  renderPanelApps();
}
function toggleMin(id) {
  const w = wins.get(id); if (!w) return;
  if (activeApp === id && !w.el.classList.contains('min')) { w.el.classList.add('min'); activeApp = null; }
  else focusWin(id);
  renderPanelApps();
}

function openApp(id) {
  const app = APPS[id]; if (!app) return;
  MH.$('startmenu')?.setAttribute('hidden', '');
  document.querySelector('.menu-btn')?.classList.remove('open');
  if (wins.has(id)) { focusWin(id); return; }
  userData.counters.windowsOpened = (userData.counters.windowsOpened || 0) + 1; saveData();

  const el = document.createElement('section');
  el.className = 'win'; el.dataset.app = id;
  const mobile = innerWidth < 760;
  const wpx = Math.min(app.w || 860, innerWidth - 16), hpx = Math.min(app.h || 560, innerHeight - 70);
  const off = (wins.size % 6) * 26;
  el.style.cssText = `width:${wpx}px;height:${hpx}px;left:${Math.max(4, (innerWidth - wpx) / 2 + off - 40)}px;top:${Math.max(4, (innerHeight - 44 - hpx) / 2 + off - 20)}px;z-index:${++zTop}`;
  if (mobile) el.classList.add('max');
  el.innerHTML = `
    <header class="win-head">
      <span class="wic">${iconFor(app.icon)}</span><span class="wt">${MH.esc(app.name)}</span>
      <button class="wbtn" data-act="min" title="Minimise">—</button>
      <button class="wbtn" data-act="max" title="Maximise">${iconSvg('square')}</button>
      <button class="wbtn close" data-act="close" title="Close">${iconSvg('x')}</button>
    </header>
    <div class="win-body"></div><div class="win-resize"></div>`;
  MH.$('windows').appendChild(el);
  const body = el.querySelector('.win-body');
  wins.set(id, { el, body });
  activeApp = id;
  document.querySelectorAll('.win').forEach((e) => e.classList.toggle('active', e === el));

  el.addEventListener('pointerdown', () => focusWin(id));
  el.querySelector('[data-act="close"]').onclick = (e) => { e.stopPropagation(); closeWin(id); };
  el.querySelector('[data-act="min"]').onclick = (e) => { e.stopPropagation(); toggleMin(id); };
  el.querySelector('[data-act="max"]').onclick = (e) => { e.stopPropagation(); el.classList.toggle('max'); focusWin(id); };

  // drag by title bar
  const head = el.querySelector('.win-head');
  head.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.wbtn') || el.classList.contains('max')) return;
    const sx = e.clientX - el.offsetLeft, sy = e.clientY - el.offsetTop;
    const move = (ev) => {
      el.style.left = Math.min(innerWidth - 90, Math.max(-el.offsetWidth + 130, ev.clientX - sx)) + 'px';
      el.style.top = Math.min(innerHeight - 90, Math.max(0, ev.clientY - sy)) + 'px';
    };
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  });
  head.addEventListener('dblclick', (e) => { if (!e.target.closest('.wbtn')) el.classList.toggle('max'); });
  // resize
  el.querySelector('.win-resize').addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation();
    const sw = el.offsetWidth, sh = el.offsetHeight, sx = e.clientX, sy = e.clientY;
    const move = (ev) => {
      el.style.width = Math.max(300, sw + ev.clientX - sx) + 'px';
      el.style.height = Math.max(200, sh + ev.clientY - sy) + 'px';
      el.dispatchEvent(new CustomEvent('win-resize'));
    };
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  });

  try { app.render(body, { openApp, close: () => closeWin(id), winEl: el }); }
  catch (err) { body.innerHTML = `<div class="pad"><h3>${iconSvg('alert')} ${MH.esc(app.name)} hit a snag</h3><p class="muted">${MH.esc(err.message)}</p></div>`; console.error(err); }
  renderPanelApps();
}

/* ---------------- desktop ---------------- */
/* No shortcut icons on the desktop itself: apps open from the proton menu
 * or the panel. (Older saved settings may still carry desktopApps — ignored.) */

/* Avatar = initials from the account name (no emoji avatars). */
function userInitials(u) {
  const src = String((u && (u.displayName || u.username)) || 'proton').trim();
  const parts = src.split(/\s+/).filter(Boolean);
  return MH.esc(((parts[0] || 'P')[0] || 'P') + ((parts[1] || '')[0] || '')).toUpperCase();
}

function enterDesktop() {
  normalizeUserData(); syncCustomApps();
  locked = false;
  MH.$('auth').hidden = true;
  const d = MH.$('desktop'); d.hidden = false;
  applyAccent();
  document.title = `proton — ${currentUser.displayName}`;
  d.innerHTML = `
    <div class="wallpaper wp-${MH.esc(userData.settings.wallpaper)}"></div>
    <div class="desktop-hint" id="desktop-hint">${MH.esc(new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }))}<br>Press the proton menu to open apps</div>
    <div class="windows-layer" id="windows"></div>
    <div class="startmenu" id="startmenu" hidden></div>
    <footer class="panel">
      <button class="menu-btn" id="menubtn"><span class="lg">${iconSvg('atom')}</span> proton</button>
      <div class="panel-apps" id="panelapps"></div>
      <div class="tray">
        <button class="tbtn" id="tray-lock" title="Lock">${iconSvg('lock')}</button>
        <button class="tbtn" id="tray-user" title="Account & settings"><span id="tray-avt"></span></button>
        <div class="clock" id="clockbox"><b id="clock-time">--:--</b><span id="clock-date"></span></div>
      </div>
    </footer>`;
  MH.$('tray-avt').textContent = userInitials(currentUser);
  renderPanelApps(); renderStartMenu(''); applyWallpaper(); applyComponents();
  MH.$('menubtn').onclick = () => {
    const sm = MH.$('startmenu'), open = sm.hidden;
    sm.hidden = !open; MH.$('menubtn').classList.toggle('open', open);
    if (open) MH.$('sm-search-input')?.focus();
  };
  MH.$('tray-user').onclick = () => openApp('settings');
  MH.$('tray-lock').onclick = lockDesktop;
  tickClock(); clearInterval(clockTimer); clockTimer = setInterval(tickClock, 15000);
  if (!sessionStorage.getItem('mhOS.welcomed.' + currentUser.usernameLower)) {
    sessionStorage.setItem('mhOS.welcomed.' + currentUser.usernameLower, '1');
    setTimeout(() => MH.toast(`Welcome${userData.counters.windowsOpened ? ' back' : ''}, ${currentUser.displayName}! Everything is saved on this device.`), 650);
  }
}
function tickClock() {
  const t = MH.$('clock-time'), d = MH.$('clock-date'); if (!t) return;
  const now = new Date();
  t.textContent = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  d.textContent = now.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
function renderPanelApps() {
  const box = MH.$('panelapps'); if (!box || !currentUser) return;
  const pinned = userData.settings.pinned || [];
  const ids = [...new Set([...pinned, ...wins.keys()])].filter((id) => !(userData.hiddenApps || []).includes(id));
  box.innerHTML = ids.filter((id) => APPS[id]).map((id) => {
    const a = APPS[id], run = wins.has(id), act = activeApp === id;
    return `<button class="pitem ${run ? 'running' : ''} ${act ? 'active' : ''}" data-app="${id}" title="${MH.esc(a.name)}${run ? ' (open)' : ''}"><span>${iconFor(a.icon)}</span>${(pinned.includes(id) && !(userData.settings.components || {}).panelLabels) ? '' : `<span class="pl">${MH.esc(a.name)}</span>`}</button>`;
  }).join('');
  box.querySelectorAll('.pitem').forEach((b) => b.onclick = () => {
    const id = b.dataset.app;
    wins.has(id) ? (activeApp === id ? toggleMin(id) : focusWin(id)) : openApp(id);
  });
}
const CATS = ['Productivity', 'Learn', 'Create', 'Games', 'Chat & Media', 'My Apps', 'Test', 'System'];
function renderStartMenu(q) {
  const sm = MH.$('startmenu'); if (!sm) return;
  const query = (q ?? MH.$('sm-search-input')?.value ?? '').trim().toLowerCase();
  const list = Object.values(APPS).filter((a) => !(userData.hiddenApps || []).includes(a.id)).filter((a) => !query || (a.name + ' ' + a.desc).toLowerCase().includes(query));
  let html = `<div class="sm-search"><input id="sm-search-input" type="search" placeholder="Search apps…" value="${MH.esc(query)}" aria-label="Search apps"></div><div class="sm-grid">`;
  const cats = [...CATS, ...new Set(list.map((a) => a.cat).filter((c) => !CATS.includes(c)))];
  for (const cat of cats) {
    const inCat = list.filter((a) => a.cat === cat)
      .sort((x, y) => (x.sortOrder ?? x.baseIndex ?? 999) - (y.sortOrder ?? y.baseIndex ?? 999));
    if (!inCat.length) continue;
    html += `<div class="sm-cat">${cat}</div>` + inCat.map((a) => `<button class="sm-item" data-app="${a.id}"><span class="ic">${iconFor(a.icon)}</span>${MH.esc(a.name)}</button>`).join('');
  }
  if (!list.length) html += `<p style="grid-column:1/-1;opacity:.7;padding:10px 4px">No apps match “${MH.esc(query)}”.</p>`;
  html += `</div>
    <div class="sm-foot">
      <button class="sm-user" id="sm-user"><span class="avt" style="background:${MH.esc(currentUser.color)}">${MH.esc(userInitials(currentUser))}</span><span><b>${MH.esc(currentUser.displayName)}</b><span>@${MH.esc(currentUser.username)} · signed in on this device</span></span></button>
      <button class="btn sm" id="sm-lock">${iconSvg('lock')} Lock</button>
      <button class="btn sm" id="sm-out">Sign out</button>
    </div>`;
  sm.innerHTML = html;
  const input = MH.$('sm-search-input');
  input.oninput = () => { const v = input.value, pos = input.selectionStart; renderStartMenu(v); const n = MH.$('sm-search-input'); n.focus(); n.setSelectionRange(pos, pos); };
  sm.querySelectorAll('.sm-item').forEach((b) => b.onclick = () => openApp(b.dataset.app));
  applyComponents();
  MH.$('sm-user').onclick = () => openApp('settings');
  MH.$('sm-lock').onclick = lockDesktop;
  MH.$('sm-out').onclick = signOut;
}
document.addEventListener('pointerdown', (e) => {
  const sm = MH.$('startmenu');
  if (sm && !sm.hidden && !e.target.closest('#startmenu,#menubtn')) { sm.hidden = true; MH.$('menubtn')?.classList.remove('open'); }
});
function signOut() {
  saveDataNow(); clearDynamicApps(); MH.setSession('');
  wins.clear(); currentUser = null; userData = null; locked = false;
  MH.$('desktop').hidden = true; MH.$('desktop').innerHTML = '';
  route();
}
function lockDesktop() {
  locked = true; saveDataNow();
  MH.$('desktop').hidden = true;
  renderLock();
}

/* ---------------- auth screens ---------------- */
const COLORS = ['#68b723', '#3d7fca', '#8e5ec9', '#e67e22', '#d64570', '#2aa198'];

function authShell(title, sub, bodyHTML) {
  const a = MH.$('auth'); a.hidden = false;
  a.innerHTML = `<div class="auth-card">
    <div class="auth-head"><div class="auth-logo">${iconSvg('atom')}</div><div><h1>${title}</h1><p>${sub}</p></div></div>
    <div class="auth-body">${bodyHTML}</div></div>`;
}
function renderSetup(backToLogin) {
  document.title = 'Create your account — proton';
  authShell('Create your account', 'First launch setup · proton', `
    <p class="auth-note" style="margin-top:0">Welcome! This static website has <b>no server</b>, so your account is created and stored <b>only in this browser</b>. You'll stay signed in on this device until you sign out.</p>
    <form id="setup-form">
      <label>Display name<input id="su-name" required maxlength="40" placeholder="e.g. Alex Morgan" autocomplete="name"></label>
      <div class="auth-row">
        <label>Username<small>Letters, numbers, _ · 3–20 characters</small><input id="su-user" required pattern="[A-Za-z0-9_]{3,20}" placeholder="e.g. alex_m" autocomplete="username"></label>
        <label>Email <small>(optional, never sent anywhere)</small><input id="su-email" type="email" placeholder="you@example.com" autocomplete="email"></label>
      </div>
      <div class="auth-row">
        <label>Password<small>At least 6 characters</small><input id="su-pass" type="password" required minlength="6" autocomplete="new-password"></label>
        <label>Confirm password<small>Repeat it exactly</small><input id="su-pass2" type="password" required minlength="6" autocomplete="new-password"></label>
      </div>
      <div class="auth-err" id="su-err"></div>
      <button class="btn primary block" type="submit">Create account &amp; enter desktop</button>
    </form>
    ${backToLogin ? '<p class="auth-switch">Already have an account on this device? <a id="su-back">Sign in instead</a></p>' : ''}
    <p class="auth-note">${iconSvg('lock')} Your password is stored only as a salted SHA-256 hash. App data (notes, files, games…) is saved per-account in this browser. Clearing browser data deletes it — export a backup from Settings any time.</p>`);
  const avatar = ''; // no picker on sign-up — avatars are the account's initials, drawn by userInitials()
  if (backToLogin) MH.$('su-back').onclick = renderLogin;
  MH.$('setup-form').onsubmit = async (e) => {
    e.preventDefault();
    const err = MH.$('su-err');
    const username = MH.$('su-user').value.trim(), key = username.toLowerCase();
    const pass = MH.$('su-pass').value;
    if (pass !== MH.$('su-pass2').value) { err.textContent = 'The two passwords do not match.'; return; }
    const accounts = MH.accounts();
    if (accounts[key]) { err.textContent = `“${username}” is already taken on this device — pick another username.`; return; }
    const salt = MH.uid() + MH.uid();
    accounts[key] = {
      username, usernameLower: key, displayName: MH.$('su-name').value.trim(),
      email: MH.$('su-email').value.trim(), avatar, color: COLORS[Math.floor(Math.random() * COLORS.length)],
      salt, hash: await MH.hashPassword(pass, salt), createdAt: Date.now(),
    };
    MH.saveAccounts(accounts);
    currentUser = accounts[key];
    userData = MH.defaultData(currentUser.displayName);
    MH.saveJSON(MH.userKey(key), userData);
    MH.setSession(key);
    MH.$('auth').hidden = true;
    enterDesktop();
    MH.toast(`Account created — welcome, ${currentUser.displayName}!`);
  };
}
function renderLogin() {
  document.title = 'Sign in — proton';
  const accounts = Object.values(MH.accounts());
  authShell('Welcome back', 'Sign in to proton on this device', `
    <form id="login-form">
      <label>Username
        <select id="li-user">${accounts.map((a) => `<option value="${MH.esc(a.usernameLower)}">${MH.esc(a.username)} — ${MH.esc(a.displayName)}</option>`).join('')}</select>
      </label>
      <label>Password<input id="li-pass" type="password" required autocomplete="current-password" placeholder="Your password"></label>
      <div class="auth-err" id="li-err"></div>
      <button class="btn primary block" type="submit">Sign in &amp; stay signed in</button>
    </form>
    <p class="auth-switch">New to this device? <a id="li-new">Create an account</a></p>
    <p class="auth-note">You stay signed in on this device until you choose <b>Sign out</b> in the proton menu. Use <b>Lock</b> to hide the desktop without signing out.</p>`);
  MH.$('li-new').onclick = () => renderSetup(true);
  MH.$('login-form').onsubmit = async (e) => {
    e.preventDefault();
    const key = MH.$('li-user').value, acc = MH.accounts()[key];
    if (!acc || !(await MH.verifyPassword(MH.$('li-pass').value, acc))) {
      MH.$('li-err').textContent = 'That password is not right for this account. Passwords are case-sensitive.';
      return;
    }
    currentUser = acc;
    userData = MH.loadJSON(MH.userKey(key), MH.defaultData(acc.displayName));
    MH.setSession(key);
    enterDesktop();
  };
}
function renderLock() {
  document.title = 'Locked — proton';
  authShell('Desktop locked', 'Your work is exactly as you left it', `
    <div style="text-align:center"><div class="lock-avatar" style="background:${MH.esc(currentUser.color)}">${MH.esc(userInitials(currentUser))}</div>
    <b>${MH.esc(currentUser.displayName)}</b><div class="muted">@${MH.esc(currentUser.username)}</div></div>
    <form id="lock-form">
      <label>Password<input id="lk-pass" type="password" required autocomplete="current-password" autofocus></label>
      <div class="auth-err" id="lk-err"></div>
      <button class="btn primary block" type="submit">Unlock</button>
    </form>
    <p class="auth-switch"><a id="lk-out">Sign out instead</a></p>`);
  const a = MH.$('auth'); a.hidden = false;
  MH.$('lk-out').onclick = signOut;
  MH.$('lock-form').onsubmit = async (e) => {
    e.preventDefault();
    if (!(await MH.verifyPassword(MH.$('lk-pass').value, currentUser))) { MH.$('lk-err').textContent = 'Incorrect password — try again.'; return; }
    locked = false; a.hidden = true; MH.$('desktop').hidden = false;
  };
}
function route() {
  const accounts = MH.accounts();
  if (!Object.keys(accounts).length) { renderSetup(false); return; }
  const key = MH.session(), acc = accounts[key];
  if (acc) {
    currentUser = acc;
    userData = MH.loadJSON(MH.userKey(key), MH.defaultData(acc.displayName));
    enterDesktop();
  } else renderLogin();
}

/* small shared builders for apps */
function bar(title, extra = '') {
  return `<div class="appbar"><h2>${MH.esc(title)}</h2>${extra}</div>`;
}
function confirmBox(msg) { return confirm(msg); }


/* App modules live in apps/<app-name>/app.js — see apps/README.md. */
