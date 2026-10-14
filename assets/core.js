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
      id: def.id, name: def.name, icon: def.icon || '🧩', cat: 'My Apps',
      desc: def.desc || def.url, w: 980, h: 620,
      render(body) {
        body.innerHTML = `${bar(def.name, `<span class="muted" style="max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${MH.esc(def.url)}</span><button class="btn sm" data-w="reload">↻ Reload</button><button class="btn sm primary" data-w="ext">Open in new tab ↗</button>`)}
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
  userData.customApps.push({ id: 'custom-' + MH.uid(), name: site.name, icon: site.icon || '🌐', desc: 'Website app — ' + site.url, url: site.url });
  syncCustomApps(); saveData(); refreshChrome();
  MH.toast(`“${site.name}” added as an app — find it in the proton menu → My Apps.`);
  return true;
}

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
      <span class="wic">${app.icon}</span><span class="wt">${MH.esc(app.name)}</span>
      <button class="wbtn" data-act="min" title="Minimise">—</button>
      <button class="wbtn" data-act="max" title="Maximise">▢</button>
      <button class="wbtn close" data-act="close" title="Close">✕</button>
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
  catch (err) { body.innerHTML = `<div class="pad"><h3>⚠️ ${MH.esc(app.name)} hit a snag</h3><p class="muted">${MH.esc(err.message)}</p></div>`; console.error(err); }
  renderPanelApps();
}

/* ---------------- desktop ---------------- */
/* No shortcut icons on the desktop itself: apps open from the proton menu
 * or the panel. (Older saved settings may still carry desktopApps — ignored.) */

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
      <button class="menu-btn" id="menubtn"><span class="lg">⚛</span> proton</button>
      <div class="panel-apps" id="panelapps"></div>
      <div class="tray">
        <button class="tbtn" id="tray-lock" title="Lock">🔒</button>
        <button class="tbtn" id="tray-user" title="Account & settings"><span id="tray-avt"></span></button>
        <div class="clock" id="clockbox"><b id="clock-time">--:--</b><span id="clock-date"></span></div>
      </div>
    </footer>`;
  MH.$('tray-avt').textContent = currentUser.avatar || '😀';
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
    return `<button class="pitem ${run ? 'running' : ''} ${act ? 'active' : ''}" data-app="${id}" title="${MH.esc(a.name)}${run ? ' (open)' : ''}"><span>${a.icon}</span>${(pinned.includes(id) && !(userData.settings.components || {}).panelLabels) ? '' : `<span class="pl">${MH.esc(a.name)}</span>`}</button>`;
  }).join('');
  box.querySelectorAll('.pitem').forEach((b) => b.onclick = () => {
    const id = b.dataset.app;
    wins.has(id) ? (activeApp === id ? toggleMin(id) : focusWin(id)) : openApp(id);
  });
}
const CATS = ['Productivity', 'Learn', 'Create', 'Games', 'Chat & Media', 'My Apps', 'System'];
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
    html += `<div class="sm-cat">${cat}</div>` + inCat.map((a) => `<button class="sm-item" data-app="${a.id}"><span class="ic">${a.icon}</span>${MH.esc(a.name)}</button>`).join('');
  }
  if (!list.length) html += `<p style="grid-column:1/-1;opacity:.7;padding:10px 4px">No apps match “${MH.esc(query)}”.</p>`;
  html += `</div>
    <div class="sm-foot">
      <button class="sm-user" id="sm-user"><span class="avt" style="background:${MH.esc(currentUser.color)}">${currentUser.avatar}</span><span><b>${MH.esc(currentUser.displayName)}</b><span>@${MH.esc(currentUser.username)} · signed in on this device</span></span></button>
      <button class="btn sm" id="sm-lock">🔒 Lock</button>
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
    <div class="auth-head"><div class="auth-logo">⚛</div><div><h1>${title}</h1><p>${sub}</p></div></div>
    <div class="auth-body">${bodyHTML}</div></div>`;
}
function renderSetup(backToLogin) {
  document.title = 'Create your account — proton';
  authShell('Create your account', 'First launch setup · proton', `
    <p class="auth-note" style="margin-top:0">👋 Welcome! This static website has <b>no server</b>, so your account is created and stored <b>only in this browser</b>. You'll stay signed in on this device until you sign out.</p>
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
      <button class="btn primary block" type="submit">Create account &amp; enter desktop →</button>
    </form>
    ${backToLogin ? '<p class="auth-switch">Already have an account on this device? <a id="su-back">Sign in instead</a></p>' : ''}
    <p class="auth-note">🔒 Your password is stored only as a salted SHA-256 hash. App data (notes, files, games…) is saved per-account in this browser. Clearing browser data deletes it — export a backup from Settings any time.</p>`);
  const avatar = '😀'; // no picker on sign-up — every new account starts with the default avatar
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
    MH.toast(`Account created — welcome, ${currentUser.displayName}! 🎉`);
  };
}
function renderLogin() {
  document.title = 'Sign in — proton';
  const accounts = Object.values(MH.accounts());
  authShell('Welcome back', 'Sign in to proton on this device', `
    <form id="login-form">
      <label>Username
        <select id="li-user">${accounts.map((a) => `<option value="${MH.esc(a.usernameLower)}">${MH.esc(a.avatar)} ${MH.esc(a.username)} — ${MH.esc(a.displayName)}</option>`).join('')}</select>
      </label>
      <label>Password<input id="li-pass" type="password" required autocomplete="current-password" placeholder="Your password"></label>
      <div class="auth-err" id="li-err"></div>
      <button class="btn primary block" type="submit">Sign in &amp; stay signed in →</button>
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
    <div style="text-align:center"><div class="lock-avatar" style="background:${MH.esc(currentUser.color)}">${currentUser.avatar}</div>
    <b>${MH.esc(currentUser.displayName)}</b><div class="muted">@${MH.esc(currentUser.username)}</div></div>
    <form id="lock-form">
      <label>Password<input id="lk-pass" type="password" required autocomplete="current-password" autofocus></label>
      <div class="auth-err" id="lk-err"></div>
      <button class="btn primary block" type="submit">Unlock →</button>
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

/* ============================ FILES ============================ */
registerApp({
  id: 'files', name: 'Files', icon: '🗂️', cat: 'Productivity', desc: 'Virtual drive: folders & text files saved per account', w: 880, h: 560,
  render(body) {
    let folder = 'Home', selected = null;
    body.innerHTML = `${bar('Files', `<button class="btn sm" id="f-new">＋ Text file</button><button class="btn sm" id="f-folder">＋ Folder</button><label class="btn sm" style="margin:0">⬆ Import .txt<input id="f-import" type="file" accept=".txt,.md,.csv" hidden></label><button class="btn sm" id="f-del">🗑 Delete</button>`)}
    <div class="split"><aside class="side" id="f-folders"></aside><div style="display:flex;flex-direction:column;min-height:0">
      <div class="app-main" id="f-main"></div><div id="f-editor"></div></div></div>`;
    const main = body.querySelector('#f-main'), ed = body.querySelector('#f-editor');
    function draw() {
      body.querySelector('#f-folders').innerHTML = userData.fileFolders.map((f) =>
        `<button class="rowitem ${f === folder ? 'sel' : ''}" data-f="${MH.esc(f)}">📁 ${MH.esc(f)} <span class="muted" style="margin-left:auto">${userData.files.filter((x) => x.folder === f).length}</span></button>`).join('') +
        `<div class="pad muted" style="padding-top:8px">${MH.fmtBytes(JSON.stringify(userData.files).length)} of text stored<br>on this device.</div>`;
      body.querySelectorAll('[data-f]').forEach((b) => b.onclick = () => { folder = b.dataset.f; selected = null; draw(); });
      const items = userData.files.filter((x) => x.folder === folder);
      main.innerHTML = items.length ? `<div class="file-grid">${items.map((f) => `
        <button class="file-item ${f.id === selected ? 'sel' : ''}" data-id="${f.id}"><span class="ic">📄</span>${MH.esc(f.name)}<span class="muted">${MH.fmtBytes(f.content.length)}</span></button>`).join('')}</div>`
        : `<div class="pad muted">This folder is empty. Create a text file to get started.</div>`;
      main.querySelectorAll('.file-item').forEach((b) => {
        b.onclick = () => { selected = b.dataset.id; draw(); };
        b.ondblclick = () => { selected = b.dataset.id; draw(); edit(); };
      });
      const f = userData.files.find((x) => x.id === selected);
      ed.innerHTML = f ? `<div style="border-top:1px solid var(--line);background:#111">
          <div class="appbar"><strong style="margin-right:auto">📄 ${MH.esc(f.name)}</strong>
          <button class="btn sm" id="fe-rename">Rename</button><button class="btn sm" id="fe-dl">⬇ Download</button><button class="btn sm primary" id="fe-save">Save</button></div>
          <textarea id="fe-text" rows="9" style="border:0;border-radius:0;resize:vertical">${MH.esc(f.content)}</textarea></div>` : '';
      if (f) {
        const ta = ed.querySelector('#fe-text');
        ed.querySelector('#fe-save').onclick = () => { f.content = ta.value; f.updated = Date.now(); saveData(); draw(); MH.toast('File saved.'); };
        ta.addEventListener('input', () => { f.content = ta.value; f.updated = Date.now(); saveData(); });
        ed.querySelector('#fe-dl').onclick = () => MH.download(f.name, f.content);
        ed.querySelector('#fe-rename').onclick = () => { const n = prompt('File name:', f.name); if (n?.trim()) { f.name = n.trim(); saveData(); draw(); } };
      }
    }
    function edit() { const f = userData.files.find((x) => x.id === selected); if (f) ed.querySelector('#fe-text')?.focus(); }
    body.querySelector('#f-new').onclick = () => {
      const name = prompt('File name:', 'Untitled.txt'); if (!name?.trim()) return;
      const f = { id: MH.uid(), name: name.trim(), folder, type: 'text', content: '', updated: Date.now() };
      userData.files.push(f); selected = f.id; saveData(); draw(); edit();
    };
    body.querySelector('#f-folder').onclick = () => {
      const name = prompt('Folder name:'); if (!name?.trim()) return;
      if (!userData.fileFolders.includes(name.trim())) userData.fileFolders.push(name.trim());
      folder = name.trim(); saveData(); draw();
    };
    body.querySelector('#f-del').onclick = () => {
      const f = userData.files.find((x) => x.id === selected);
      if (!f) { MH.toast('Select a file first.'); return; }
      if (confirmBox(`Delete ${f.name}?`)) { userData.files = userData.files.filter((x) => x.id !== f.id); selected = null; saveData(); draw(); }
    };
    body.querySelector('#f-import').onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      userData.files.push({ id: MH.uid(), name: file.name, folder, type: 'text', content: await file.text(), updated: Date.now() });
      saveData(); draw(); MH.toast(`Imported ${file.name}`);
    };
    draw();
  },
});

/* ============================ NOTES ============================ */
/* Adapted from the original Mixt Notes app (src/apps/notes): list + search +
 * rich-text editor, autosaved — here to per-account localStorage. */
registerApp({
  id: 'notes', name: 'Notes', icon: '📝', cat: 'Productivity', desc: 'Rich-text notes, autosaved on this device', w: 900, h: 570,
  render(body) {
    let current = userData.notes[0]?.id || null;
    body.innerHTML = `${bar('Notes', `<button class="btn sm primary" id="n-new">＋ New note</button><button class="btn sm" id="n-del">Delete</button>`)}
    <div class="split"><aside class="side">
      <div style="padding:10px"><input id="n-q" type="search" placeholder="Search notes" style="width:100%;padding:7px 9px"></div>
      <div id="n-list"></div></aside>
      <div style="display:flex;flex-direction:column;min-height:0;background:#050505">
        <div class="appbar" id="n-tools" style="background:#111">
          <button class="btn sm" data-cmd="bold"><b>B</b></button><button class="btn sm" data-cmd="italic"><i>I</i></button><button class="btn sm" data-cmd="underline"><u>U</u></button>
          <button class="btn sm" data-cmd="insertUnorderedList">• List</button><button class="btn sm" data-cmd="removeFormat">Clear</button>
          <button class="btn sm" id="n-export">Export .txt</button><span class="muted" id="n-saved" style="margin-left:auto"></span></div>
        <input class="note-title" id="n-title" placeholder="Title" maxlength="200">
        <div class="note-body" id="n-body" contenteditable="true"></div>
      </div></div>`;
    const list = body.querySelector('#n-list'), title = body.querySelector('#n-title'), editor = body.querySelector('#n-body');
    const plain = (html) => { const d = document.createElement('div'); d.innerHTML = html; return (d.textContent || '').replace(/\s+/g, ' ').trim(); };
    function drawList() {
      const q = body.querySelector('#n-q').value.trim().toLowerCase();
      const shown = [...userData.notes].sort((a, b) => b.updated - a.updated)
        .filter((n) => !q || (n.title + ' ' + plain(n.html)).toLowerCase().includes(q));
      list.innerHTML = shown.length ? shown.map((n) => `
        <button class="rowitem ${n.id === current ? 'sel' : ''}" data-id="${n.id}"><span><b>${MH.esc(n.title || 'Untitled')}</b><br><span class="muted">${MH.esc(plain(n.html).slice(0, 60)) || ' '}</span></span></button>`).join('')
        : '<div class="pad muted">No notes.</div>';
      list.querySelectorAll('[data-id]').forEach((b) => b.onclick = () => { current = b.dataset.id; open(); });
    }
    function open() {
      const n = userData.notes.find((x) => x.id === current);
      title.value = n?.title || ''; editor.innerHTML = n?.html || '';
      body.querySelector('#n-saved').textContent = n ? '' : 'Create a note to start writing';
      drawList();
    }
    function persist() {
      const n = userData.notes.find((x) => x.id === current); if (!n) return;
      n.title = title.value; n.html = editor.innerHTML; n.updated = Date.now();
      body.querySelector('#n-saved').textContent = 'Saved ✓'; saveData(); drawList();
    }
    title.addEventListener('input', persist); editor.addEventListener('input', persist);
    body.querySelectorAll('[data-cmd]').forEach((b) => b.onclick = () => { document.execCommand(b.dataset.cmd); editor.focus(); persist(); });
    body.querySelector('#n-q').addEventListener('input', drawList);
    body.querySelector('#n-new').onclick = () => {
      const n = { id: MH.uid(), title: '', html: '', updated: Date.now() };
      userData.notes.unshift(n); current = n.id; saveData(); open(); title.focus();
    };
    body.querySelector('#n-del').onclick = () => {
      if (!current || !confirmBox('Delete this note?')) return;
      userData.notes = userData.notes.filter((x) => x.id !== current);
      current = userData.notes[0]?.id || null; saveData(); open();
    };
    body.querySelector('#n-export').onclick = () => {
      const n = userData.notes.find((x) => x.id === current); if (!n) return;
      MH.download((n.title || 'note') + '.txt', `${n.title}\n\n${plain(n.html)}`);
    };
    open();
  },
});

/* ============================ CALENDAR ============================ */
registerApp({
  id: 'calendar', name: 'Calendar', icon: '📅', cat: 'Productivity', desc: 'Month view with events saved per account', w: 920, h: 580,
  render(body) {
    let cursor = new Date(); cursor.setDate(1);
    let sel = MH.todayISO();
    body.innerHTML = `${bar('Calendar', `<button class="btn sm" id="c-prev">←</button><button class="btn sm" id="c-today">Today</button><button class="btn sm" id="c-next">→</button>`)}
    <div class="split" style="grid-template-columns:1fr 300px"><div class="app-main" style="padding:12px 14px"><h3 id="c-head" style="margin:2px 0 10px"></h3><div class="cal-grid" id="c-grid"></div></div>
    <aside class="side" style="border-right:0;border-left:1px solid var(--line);padding:14px;background:#111">
      <h3 id="c-day" style="margin-top:0"></h3><div id="c-events"></div>
      <form id="c-form"><div class="field"><label>Event title</label><input id="c-title" required maxlength="90"></div>
      <div class="field"><label>Time</label><input id="c-time" type="time" value="09:00"></div>
      <div class="field"><label>Notes</label><textarea id="c-notes" rows="2"></textarea></div>
      <button class="btn primary" style="width:100%">Add event</button></form></aside></div>`;
    function draw() {
      const y = cursor.getFullYear(), m = cursor.getMonth();
      body.querySelector('#c-head').textContent = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      const first = new Date(y, m, 1), startDay = (first.getDay() + 6) % 7; // Monday start
      const days = new Date(y, m + 1, 0).getDate(), prevDays = new Date(y, m, 0).getDate();
      let cells = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => `<div class="cal-dow">${d}</div>`).join('');
      for (let i = 0; i < 42; i++) {
        let dayNum, dateObj, other = false;
        if (i < startDay) { dayNum = prevDays - startDay + 1 + i; dateObj = new Date(y, m - 1, dayNum); other = true; }
        else if (i >= startDay + days) { dayNum = i - startDay - days + 1; dateObj = new Date(y, m + 1, dayNum); other = true; }
        else { dayNum = i - startDay + 1; dateObj = new Date(y, m, dayNum); }
        const iso = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
        const evs = userData.events.filter((e) => e.date === iso);
        cells += `<div class="cal-day ${other ? 'other' : ''} ${iso === MH.todayISO() ? 'today' : ''} ${iso === sel ? 'sel' : ''}" data-iso="${iso}"><span class="n">${dayNum}</span>${evs.slice(0, 3).map((e) => `<div class="cal-ev">${MH.esc(e.time)} ${MH.esc(e.title)}</div>`).join('')}</div>`;
      }
      body.querySelector('#c-grid').innerHTML = cells;
      body.querySelectorAll('.cal-day').forEach((c) => c.onclick = () => { sel = c.dataset.iso; draw(); });
      body.querySelector('#c-day').textContent = new Date(sel + 'T12:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
      const evs = userData.events.filter((e) => e.date === sel).sort((a, b) => a.time.localeCompare(b.time));
      body.querySelector('#c-events').innerHTML = evs.length ? evs.map((e) => `
        <div class="card" style="padding:9px 11px;margin-bottom:7px"><b>${MH.esc(e.time)}</b> ${MH.esc(e.title)}
        ${e.notes ? `<div class="muted">${MH.esc(e.notes)}</div>` : ''}<button class="btn sm" data-del="${e.id}" style="float:right">✕</button></div>`).join('')
        : '<p class="muted">No events this day.</p>';
      body.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => {
        userData.events = userData.events.filter((e) => e.id !== b.dataset.del); saveData(); draw();
      });
    }
    body.querySelector('#c-prev').onclick = () => { cursor.setMonth(cursor.getMonth() - 1); draw(); };
    body.querySelector('#c-next').onclick = () => { cursor.setMonth(cursor.getMonth() + 1); draw(); };
    body.querySelector('#c-today').onclick = () => { cursor = new Date(); cursor.setDate(1); sel = MH.todayISO(); draw(); };
    body.querySelector('#c-form').onsubmit = (e) => {
      e.preventDefault();
      userData.events.push({ id: MH.uid(), date: sel, time: body.querySelector('#c-time').value || '09:00', title: body.querySelector('#c-title').value.trim(), notes: body.querySelector('#c-notes').value.trim() });
      e.target.reset(); body.querySelector('#c-time').value = '09:00'; saveData(); draw();
    };
    draw();
  },
});

/* ============================ CONTACTS ============================ */
registerApp({
  id: 'contacts', name: 'Contacts', icon: '👥', cat: 'Productivity', desc: 'Address book saved on this device', w: 820, h: 520,
  render(body) {
    let sel = null;
    body.innerHTML = `${bar('Contacts', `<input type="search" id="ct-q" placeholder="Search contacts"><button class="btn sm primary" id="ct-new">＋ New</button>`)}
    <div class="split"><aside class="side" id="ct-list"></aside><div class="app-main pad" id="ct-detail"></div></div>`;
    function draw() {
      const q = body.querySelector('#ct-q').value.trim().toLowerCase();
      const list = userData.contacts.filter((c) => !q || (c.name + c.email).toLowerCase().includes(q));
      body.querySelector('#ct-list').innerHTML = list.length ? list.map((c) => `
        <button class="rowitem ${c.id === sel ? 'sel' : ''}" data-id="${c.id}"><span class="lock-avatar" style="width:36px;height:36px;font-size:16px;margin:0;background:${MH.esc(currentUser.color)}">${MH.esc((c.name[0] || '?').toUpperCase())}</span><span><b>${MH.esc(c.name)}</b><br><span class="muted">${MH.esc(c.email)}</span></span></button>`).join('') : '<div class="pad muted">No contacts.</div>';
      body.querySelectorAll('#ct-list [data-id]').forEach((b) => b.onclick = () => { sel = b.dataset.id; draw(); });
      const c = userData.contacts.find((x) => x.id === sel);
      body.querySelector('#ct-detail').innerHTML = c ? `
        <h3 style="margin-top:0">Edit contact</h3>
        <div class="field"><label>Name</label><input id="ct-name" value="${MH.esc(c.name)}"></div>
        <div class="field"><label>Email</label><input id="ct-email" type="email" value="${MH.esc(c.email)}"></div>
        <div class="field"><label>Phone</label><input id="ct-phone" value="${MH.esc(c.phone)}"></div>
        <div class="field"><label>Notes</label><textarea id="ct-notes" rows="3">${MH.esc(c.notes)}</textarea></div>
        <button class="btn primary" id="ct-save">Save contact</button> <button class="btn" id="ct-del">Delete</button>`
        : '<p class="muted">Select a contact, or create a new one.</p>';
      if (c) {
        body.querySelector('#ct-save').onclick = () => {
          Object.assign(c, { name: body.querySelector('#ct-name').value.trim() || c.name, email: body.querySelector('#ct-email').value.trim(), phone: body.querySelector('#ct-phone').value.trim(), notes: body.querySelector('#ct-notes').value });
          saveData(); draw(); MH.toast('Contact saved.');
        };
        body.querySelector('#ct-del').onclick = () => { if (confirmBox(`Delete ${c.name}?`)) { userData.contacts = userData.contacts.filter((x) => x.id !== c.id); sel = null; saveData(); draw(); } };
      }
    }
    body.querySelector('#ct-q').addEventListener('input', draw);
    body.querySelector('#ct-new').onclick = () => {
      const c = { id: MH.uid(), name: 'New contact', email: '', phone: '', notes: '' };
      userData.contacts.push(c); sel = c.id; saveData(); draw();
    };
    draw();
  },
});

/* ============================ MAIL ============================ */
registerApp({
  id: 'mail', name: 'Mail', icon: '✉️', cat: 'Chat & Media', desc: 'On-device mailbox — compose, drafts, sent', w: 900, h: 570,
  render(body) {
    let folder = 'inbox', sel = null, draft = null;
    body.innerHTML = `${bar('Mail', `<button class="btn sm primary" id="m-new">✎ Compose</button>`)}
    <div class="split"><aside class="side">
      ${['inbox', 'sent', 'drafts'].map((f) => `<button class="rowitem" data-f="${f}">${f === 'inbox' ? '📥' : f === 'sent' ? '📤' : '📝'} ${f[0].toUpperCase() + f.slice(1)} <span class="muted" style="margin-left:auto" data-count="${f}"></span></button>`).join('')}
      <div class="pad muted">Mail is stored only in this browser — it never leaves your device.</div></aside>
      <div style="display:flex;flex-direction:column;min-height:0"><div id="m-list" style="max-height:42%;overflow:auto;border-bottom:1px solid var(--line)"></div><div class="app-main pad" id="m-view"></div></div></div>`;
    function draw() {
      body.querySelectorAll('[data-count]').forEach((s) => s.textContent = userData.mail.filter((m) => m.folder === s.dataset.count).length || '');
      body.querySelectorAll('[data-f]').forEach((b) => b.classList.toggle('sel', b.dataset.f === folder));
      const items = userData.mail.filter((m) => m.folder === folder).sort((a, b) => b.date - a.date);
      body.querySelector('#m-list').innerHTML = items.length ? items.map((m) => `
        <button class="rowitem ${m.id === sel ? 'sel' : ''}" data-id="${m.id}"><span>${m.read || folder !== 'inbox' ? '' : '🔵 '}<b>${MH.esc(folder === 'inbox' ? m.from : m.to)}</b> — ${MH.esc(m.subject)}<br><span class="muted">${new Date(m.date).toLocaleString()} · ${MH.esc(m.body.slice(0, 60))}…</span></span></button>`).join('')
        : '<div class="pad muted">Nothing here yet.</div>';
      body.querySelectorAll('#m-list [data-id]').forEach((b) => b.onclick = () => {
        sel = b.dataset.id; const m = userData.mail.find((x) => x.id === sel);
        if (m && folder === 'inbox') { m.read = true; saveData(); }
        draw();
      });
      const view = body.querySelector('#m-view');
      if (draft) {
        view.innerHTML = `<h3 style="margin-top:0">Compose</h3>
          <div class="field"><label>To</label><input id="mc-to" value="${MH.esc(draft.to)}"></div>
          <div class="field"><label>Subject</label><input id="mc-sub" value="${MH.esc(draft.subject)}"></div>
          <div class="field"><label>Message</label><textarea id="mc-body" rows="8">${MH.esc(draft.body)}</textarea></div>
          <button class="btn primary" id="mc-send">Send (saves to Sent)</button> <button class="btn" id="mc-draft">Save draft</button> <button class="btn" id="mc-cancel">Discard</button>`;
        const read = () => ({ to: body.querySelector('#mc-to').value, subject: body.querySelector('#mc-sub').value, body: body.querySelector('#mc-body').value });
        view.querySelector('#mc-send').onclick = () => {
          const v = read(); if (draft.id) userData.mail = userData.mail.filter((m) => m.id !== draft.id);
          userData.mail.push({ id: MH.uid(), folder: 'sent', from: currentUser.displayName, ...v, date: Date.now(), read: true });
          draft = null; folder = 'sent'; saveData(); draw(); MH.toast('Saved to Sent. (On-device mail — nothing was transmitted.)');
        };
        view.querySelector('#mc-draft').onclick = () => {
          const v = read();
          if (draft.id) Object.assign(userData.mail.find((m) => m.id === draft.id), v, { date: Date.now() });
          else userData.mail.push({ id: MH.uid(), folder: 'drafts', from: currentUser.displayName, ...v, date: Date.now(), read: true });
          draft = null; folder = 'drafts'; saveData(); draw();
        };
        view.querySelector('#mc-cancel').onclick = () => { draft = null; draw(); };
        return;
      }
      const m = userData.mail.find((x) => x.id === sel && x.folder === folder);
      view.innerHTML = m ? `<h3 style="margin:2px 0">${MH.esc(m.subject)}</h3>
        <p class="muted">${folder === 'inbox' ? 'From' : 'To'}: ${MH.esc(folder === 'inbox' ? m.from : m.to)} · ${new Date(m.date).toLocaleString()}</p>
        <p style="white-space:pre-wrap;line-height:1.6">${MH.esc(m.body)}</p>
        <button class="btn" id="m-reply">↩ Reply</button> <button class="btn" id="m-delmail">Delete</button>`
        : '<p class="muted">Select a message to read it.</p>';
      if (m) {
        view.querySelector('#m-delmail').onclick = () => { userData.mail = userData.mail.filter((x) => x.id !== m.id); sel = null; saveData(); draw(); };
        view.querySelector('#m-reply').onclick = () => { draft = { to: m.from, subject: 'Re: ' + m.subject, body: `\n\n— On ${new Date(m.date).toLocaleString()}, ${m.from} wrote:\n> ` + m.body.replace(/\n/g, '\n> ') }; draw(); };
      }
    }
    body.querySelectorAll('[data-f]').forEach((b) => b.onclick = () => { folder = b.dataset.f; sel = null; draft = null; draw(); });
    body.querySelector('#m-new').onclick = () => { draft = { to: '', subject: '', body: '' }; draw(); };
    draw();
  },
});

/* ============================ VAULT ============================ */
registerApp({
  id: 'vault', name: 'Admin Vault', icon: '🔐', cat: 'System', desc: 'Private notes behind your account password (adapted from Admin Vault)', w: 760, h: 520,
  render(body, ctx) {
    body.innerHTML = `${bar('Admin Vault')}<div class="app-main pad" style="max-width:520px">
      <p>🔐 The vault re-checks <b>your account password</b> before showing private notes — the static-site version of the original's admin-only vault.</p>
      <form id="v-form"><div class="field"><label>Account password</label><input id="v-pass" type="password" autocomplete="current-password"></div>
      <div class="auth-err" id="v-err"></div><button class="btn primary">Unlock vault</button></form></div>`;
    body.querySelector('#v-form').onsubmit = async (e) => {
      e.preventDefault();
      if (!(await MH.verifyPassword(body.querySelector('#v-pass').value, currentUser))) { body.querySelector('#v-err').textContent = 'Incorrect password.'; return; }
      let sel = null;
      body.innerHTML = `${bar('Admin Vault — unlocked', `<button class="btn sm primary" id="v-new">＋ Secret</button><button class="btn sm" id="v-lock">🔒 Lock</button>`)}
      <div class="split"><aside class="side" id="v-list"></aside><div class="app-main pad" id="v-edit"></div></div>`;
      const draw = () => {
        body.querySelector('#v-list').innerHTML = userData.vault.map((v) => `<button class="rowitem ${v.id === sel ? 'sel' : ''}" data-id="${v.id}">🔑 ${MH.esc(v.title)}</button>`).join('') || '<div class="pad muted">No secrets yet.</div>';
        body.querySelectorAll('#v-list [data-id]').forEach((b) => b.onclick = () => { sel = b.dataset.id; draw(); });
        const v = userData.vault.find((x) => x.id === sel);
        body.querySelector('#v-edit').innerHTML = v ? `<div class="field"><label>Title</label><input id="ve-t" value="${MH.esc(v.title)}"></div>
          <div class="field"><label>Secret</label><textarea id="ve-b" rows="9">${MH.esc(v.body)}</textarea></div>
          <button class="btn primary" id="ve-save">Save</button> <button class="btn" id="ve-del">Delete</button>` : '<p class="muted">Select or create a secret.</p>';
        if (v) {
          body.querySelector('#ve-save').onclick = () => { v.title = body.querySelector('#ve-t').value; v.body = body.querySelector('#ve-b').value; saveData(); draw(); };
          body.querySelector('#ve-del').onclick = () => { if (confirmBox('Delete this secret?')) { userData.vault = userData.vault.filter((x) => x.id !== v.id); sel = null; saveData(); draw(); } };
        }
      };
      body.querySelector('#v-new').onclick = () => { const v = { id: MH.uid(), title: 'New secret', body: '' }; userData.vault.push(v); sel = v.id; saveData(); draw(); };
      body.querySelector('#v-lock').onclick = () => ctx.close() || openApp('vault');
      draw();
    };
  },
});

/* ============================ WEBSITES ============================ */
registerApp({
  id: 'websites', name: 'Websites', icon: '🌍', cat: 'Productivity', desc: 'Your saved websites — add, open, turn into apps, remove', w: 900, h: 580,
  render(body) {
    body.innerHTML = `${bar('Websites')}<div class="app-main pad">
    <div class="card"><h3 style="margin-top:0">＋ Add a website</h3>
      <form id="ws-form" class="add-form">
        <div class="field"><label>Site name</label><input id="ws-name" required maxlength="50" placeholder="e.g. Khan Academy"></div>
        <div class="field"><label>Address</label><input id="ws-url" required placeholder="e.g. khanacademy.org" inputmode="url"></div>
        <div class="field"><label>Icon (emoji)</label><input id="ws-icon" maxlength="4" value="🌐"></div>
        <button class="btn primary" type="submit">Add website</button>
      </form>
      <p class="muted">Saved websites live here and on the Browser home page. “＋ App” turns a site into its own windowed app in the proton menu. Everything is saved on this device, per account.</p></div>
    <h3>Your websites <span class="muted" id="ws-count"></span></h3>
    <div class="grid-cards" id="ws-list"></div></div>`;
    function draw() {
      body.querySelector('#ws-count').textContent = `(${userData.websites.length})`;
      body.querySelector('#ws-list').innerHTML = userData.websites.length ? userData.websites.map((s) => `
        <div class="card"><div style="font-size:28px">${MH.esc(s.icon || '🌐')}</div>
        <h3 style="margin:6px 0 3px">${MH.esc(s.name)}</h3>
        <p class="muted site-url" style="min-height:32px">${MH.esc(s.url)}</p>
        <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm primary" data-open="${s.id}">Open</button>
        <button class="btn sm" data-app="${s.id}">＋ App</button>
        <button class="btn sm" data-edit="${s.id}">Edit</button>
        <button class="btn sm" data-remove="${s.id}">Remove</button></div></div>`).join('')
        : '<p class="muted">No websites yet — add your first one above.</p>';
      body.querySelectorAll('[data-open]').forEach((b) => b.onclick = () => { const s = userData.websites.find((x) => x.id === b.dataset.open); if (s) openWebsite(s); });
      body.querySelectorAll('[data-app]').forEach((b) => b.onclick = () => { const s = userData.websites.find((x) => x.id === b.dataset.app); if (s) websiteAsApp(s); });
      body.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => {
        const s = userData.websites.find((x) => x.id === b.dataset.edit); if (!s) return;
        const name = prompt('Site name:', s.name); if (name === null) return;
        const url = normalizeUrl(prompt('Address:', s.url) ?? '');
        if (!url) { MH.toast('That address does not look valid.'); return; }
        s.name = name.trim() || s.name; s.url = url; saveData(); draw();
      });
      body.querySelectorAll('[data-remove]').forEach((b) => b.onclick = () => {
        const s = userData.websites.find((x) => x.id === b.dataset.remove);
        if (s && confirmBox(`Remove the website “${s.name}”? (Any app made from it stays.)`)) {
          userData.websites = userData.websites.filter((x) => x.id !== s.id); saveData(); draw(); MH.toast('Website removed.');
        }
      });
    }
    body.querySelector('#ws-form').onsubmit = (e) => {
      e.preventDefault();
      const url = normalizeUrl(body.querySelector('#ws-url').value);
      if (!url) { MH.toast('Please enter a valid address, e.g. example.com'); return; }
      userData.websites.push({ id: 'site-' + MH.uid(), name: body.querySelector('#ws-name').value.trim(), icon: body.querySelector('#ws-icon').value.trim() || '🌐', url });
      saveData(); e.target.reset(); body.querySelector('#ws-icon').value = '🌐'; draw();
      MH.toast('Website added — open it here or from the Browser home page.');
    };
    draw();
  },
});

/* ============================ APP CENTER ============================ */
registerApp({
  id: 'appcenter', name: 'App Center', icon: '🧩', cat: 'System', desc: 'Add & remove apps and websites, like Mixt', w: 980, h: 640,
  render(body) {
    normalizeUserData();
    body.innerHTML = `${bar('App Center', `<input type="search" id="ac-q" placeholder="Search apps & websites">`)}
    <div class="app-main pad">
    <div class="grid-cards" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr));margin-bottom:16px">
      <div class="card"><h3 style="margin-top:0">＋ Add an app</h3>
        <form id="ac-app-form">
          <div class="field"><label>App name</label><input id="ac-app-name" required maxlength="40" placeholder="e.g. Desmos Graphing"></div>
          <div class="field"><label>Web address it opens</label><input id="ac-app-url" required placeholder="e.g. desmos.com/calculator" inputmode="url"></div>
          <div class="auth-row" style="display:grid;grid-template-columns:90px 1fr;gap:10px">
            <div class="field"><label>Icon</label><input id="ac-app-icon" maxlength="4" value="🧩"></div>
            <div class="field"><label>Description (optional)</label><input id="ac-app-desc" maxlength="90" placeholder="What is it for?"></div>
          </div>
          <button class="btn primary" type="submit">Add app</button>
          <p class="muted">It appears in the proton menu → <b>My Apps</b>, can be pinned to the panel, and opens in its own window. (Some sites refuse to be embedded — those get an “Open in new tab” button.)</p>
        </form></div>
      <div class="card"><h3 style="margin-top:0">＋ Add a website</h3>
        <form id="ac-site-form">
          <div class="field"><label>Site name</label><input id="ac-site-name" required maxlength="50" placeholder="e.g. BBC Bitesize"></div>
          <div class="field"><label>Address</label><input id="ac-site-url" required placeholder="e.g. bbc.co.uk/bitesize" inputmode="url"></div>
          <div class="field"><label>Icon (emoji)</label><input id="ac-site-icon" maxlength="4" value="🌐"></div>
          <button class="btn primary" type="submit">Add website</button>
          <p class="muted">Websites are bookmarks with superpowers: open them in the Browser, or turn them into apps. Manage them all in the <b>Websites</b> app.</p>
        </form>
        <button class="btn" id="ac-open-websites">🌍 Open Websites app</button></div>
    </div>

    <h3>🧩 Your apps <span class="muted" id="ac-custom-count"></span></h3>
    <div class="grid-cards" id="ac-custom"></div>
    <h3>🌍 Your websites <span class="muted" id="ac-sites-count"></span></h3>
    <div class="grid-cards" id="ac-sites"></div>
    <h3>📦 All apps</h3>
    <div class="grid-cards" id="ac-grid"></div></div>`;

    const PROTECTED = ['appcenter', 'settings']; // removing these would lock you out of managing apps
    function draw() {
      const q = body.querySelector('#ac-q').value.trim().toLowerCase();
      const match = (a) => !q || (a.name + ' ' + (a.desc || '') + ' ' + (a.url || '')).toLowerCase().includes(q);

      body.querySelector('#ac-custom-count').textContent = `(${userData.customApps.length})`;
      body.querySelector('#ac-custom').innerHTML = userData.customApps.filter(match).length ? userData.customApps.filter(match).map((a) => `
        <div class="card"><div style="font-size:30px">${MH.esc(a.icon || '🧩')}</div><h3 style="margin:7px 0 3px">${MH.esc(a.name)}</h3>
        <p class="muted site-url" style="min-height:34px">${MH.esc(a.desc || a.url)}</p><span class="chip">My Apps</span>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:11px"><button class="btn sm primary" data-copen="${a.id}">Open</button>
        <button class="btn sm" data-cpin="${a.id}">${(userData.settings.pinned || []).includes(a.id) ? 'Unpin' : '📌 Pin'}</button>
        <button class="btn sm" data-cedit="${a.id}">Edit</button>
        <button class="btn sm" data-cdel="${a.id}">Remove</button></div></div>`).join('')
        : '<p class="muted">No custom apps yet — add one with the form above and it lands in the proton menu → My Apps.</p>';
      body.querySelectorAll('[data-copen]').forEach((b) => b.onclick = () => openApp(b.dataset.copen));
      body.querySelectorAll('[data-cpin]').forEach((b) => b.onclick = () => {
        const id = b.dataset.cpin, p = userData.settings.pinned;
        userData.settings.pinned = p.includes(id) ? p.filter((x) => x !== id) : [...p, id];
        saveData(); renderPanelApps(); draw();
      });
      body.querySelectorAll('[data-cedit]').forEach((b) => b.onclick = () => {
        const a = userData.customApps.find((x) => x.id === b.dataset.cedit); if (!a) return;
        const name = prompt('App name:', a.name); if (name === null) return;
        const url = normalizeUrl(prompt('Web address:', a.url) ?? '');
        if (!url) { MH.toast('That address does not look valid.'); return; }
        const icon = prompt('Icon (emoji):', a.icon || '🧩');
        a.name = name.trim() || a.name; a.url = url; if (icon) a.icon = icon.trim() || a.icon;
        syncCustomApps(); saveData(); refreshChrome(); draw(); MH.toast('App updated.');
      });
      body.querySelectorAll('[data-cdel]').forEach((b) => b.onclick = () => {
        const a = userData.customApps.find((x) => x.id === b.dataset.cdel);
        if (!a || !confirmBox(`Remove the app “${a.name}”? This deletes it from this account.`)) return;
        closeWin(a.id);
        userData.customApps = userData.customApps.filter((x) => x.id !== a.id);
        userData.settings.pinned = (userData.settings.pinned || []).filter((x) => x !== a.id);
        syncCustomApps(); saveData(); refreshChrome(); draw(); MH.toast(`App “${a.name}” removed.`);
      });

      body.querySelector('#ac-sites-count').textContent = `(${userData.websites.length})`;
      body.querySelector('#ac-sites').innerHTML = userData.websites.filter(match).length ? userData.websites.filter(match).map((s) => `
        <div class="card"><div style="font-size:30px">${MH.esc(s.icon || '🌐')}</div><h3 style="margin:7px 0 3px">${MH.esc(s.name)}</h3>
        <p class="muted site-url" style="min-height:34px">${MH.esc(s.url)}</p><span class="chip">Website</span>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:11px"><button class="btn sm primary" data-sopen="${s.id}">Open</button>
        <button class="btn sm" data-sapp="${s.id}">＋ App</button>
        <button class="btn sm" data-sdel="${s.id}">Remove</button></div></div>`).join('')
        : '<p class="muted">No websites yet — add one above.</p>';
      body.querySelectorAll('[data-sopen]').forEach((b) => b.onclick = () => { const s = userData.websites.find((x) => x.id === b.dataset.sopen); if (s) openWebsite(s); });
      body.querySelectorAll('[data-sapp]').forEach((b) => b.onclick = () => { const s = userData.websites.find((x) => x.id === b.dataset.sapp); if (s) { websiteAsApp(s); draw(); } });
      body.querySelectorAll('[data-sdel]').forEach((b) => b.onclick = () => {
        const s = userData.websites.find((x) => x.id === b.dataset.sdel);
        if (s && confirmBox(`Remove the website “${s.name}”?`)) { userData.websites = userData.websites.filter((x) => x.id !== s.id); saveData(); draw(); }
      });

      body.querySelector('#ac-grid').innerHTML = Object.values(APPS)
        .filter((a) => a.id !== 'appcenter' && !dynamicAppIds.has(a.id) && match(a))
        .map((a) => {
          const pinned = (userData.settings.pinned || []).includes(a.id);
          const removed = (userData.hiddenApps || []).includes(a.id);
          let buttons;
          if (removed) buttons = `<button class="btn sm primary" data-restore="${a.id}">＋ Add back</button>`;
          else {
            buttons = `<button class="btn sm primary" data-open="${a.id}">Open</button><button class="btn sm" data-pin="${a.id}">${pinned ? 'Unpin' : '📌 Pin'}</button>`;
            buttons += PROTECTED.includes(a.id)
              ? '<span class="muted" title="This one keeps the desktop manageable">Built-in</span>'
              : `<button class="btn sm" data-remove="${a.id}">Remove</button>`;
          }
          return `<div class="card" ${removed ? 'style="opacity:.62"' : ''}><div style="font-size:30px">${a.icon}</div><h3 style="margin:7px 0 3px">${MH.esc(a.name)}</h3>
          <p class="muted" style="min-height:34px">${MH.esc(a.desc)}</p><span class="chip">${a.cat}</span>${removed ? ' <span class="chip" style="background:#f8d7d4;color:#8c2b24">Removed</span>' : ''}
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:11px">${buttons}</div></div>`;
        }).join('');
      body.querySelectorAll('[data-open]').forEach((b) => b.onclick = () => openApp(b.dataset.open));
      body.querySelectorAll('[data-pin]').forEach((b) => b.onclick = () => {
        const id = b.dataset.pin, p = userData.settings.pinned;
        userData.settings.pinned = p.includes(id) ? p.filter((x) => x !== id) : [...p, id];
        saveData(); renderPanelApps(); draw();
      });
      body.querySelectorAll('[data-remove]').forEach((b) => b.onclick = () => {
        const a = APPS[b.dataset.remove];
        if (!a || !confirmBox(`Remove “${a.name}” from the proton menu? You can add it back here any time.`)) return;
        closeWin(a.id);
        userData.hiddenApps.push(a.id);
        userData.settings.pinned = (userData.settings.pinned || []).filter((x) => x !== a.id);
        saveData(); refreshChrome(); draw(); MH.toast(`“${a.name}” removed — find it here to add it back.`);
      });
      body.querySelectorAll('[data-restore]').forEach((b) => b.onclick = () => {
        userData.hiddenApps = userData.hiddenApps.filter((x) => x !== b.dataset.restore);
        saveData(); refreshChrome(); draw(); MH.toast('App added back to the proton menu.');
      });
    }

    body.querySelector('#ac-app-form').onsubmit = (e) => {
      e.preventDefault();
      const url = normalizeUrl(body.querySelector('#ac-app-url').value);
      if (!url) { MH.toast('Please enter a valid address, e.g. example.com'); return; }
      const def = { id: 'custom-' + MH.uid(), name: body.querySelector('#ac-app-name').value.trim(), icon: body.querySelector('#ac-app-icon').value.trim() || '🧩', desc: body.querySelector('#ac-app-desc').value.trim(), url };
      userData.customApps.push(def);
      syncCustomApps(); saveData(); refreshChrome();
      e.target.reset(); body.querySelector('#ac-app-icon').value = '🧩';
      draw(); MH.toast(`App “${def.name}” added — proton menu → My Apps. Opening it…`);
      openApp(def.id);
    };
    body.querySelector('#ac-site-form').onsubmit = (e) => {
      e.preventDefault();
      const url = normalizeUrl(body.querySelector('#ac-site-url').value);
      if (!url) { MH.toast('Please enter a valid address, e.g. example.com'); return; }
      userData.websites.push({ id: 'site-' + MH.uid(), name: body.querySelector('#ac-site-name').value.trim(), icon: body.querySelector('#ac-site-icon').value.trim() || '🌐', url });
      saveData(); e.target.reset(); body.querySelector('#ac-site-icon').value = '🌐';
      draw(); MH.toast('Website added.');
    };
    body.querySelector('#ac-open-websites').onclick = () => openApp('websites');
    body.querySelector('#ac-q').addEventListener('input', draw);
    draw();
  },
});

/* ============================ CUSTOMIZE (modular everything) ============================ */
registerApp({
  id: 'customize', name: 'Customize', icon: '🎛️', cat: 'System', desc: 'Add, remove & edit apps, themes, wallpapers and desktop parts', w: 1020, h: 660,
  render(body) {
    normalizeUserData(); applyModuleOverrides();
    const PROTECTED = ['appcenter', 'settings', 'customize'];
    const WP_BUILTINS = [['mint', 'Mint'], ['ocean', 'Ocean'], ['sunset', 'Sunset'], ['grape', 'Grape'], ['slate', 'Slate'], ['rose', 'Rose']];
    body.innerHTML = `${bar('Customize — everything is a module')}
    <div class="app-main pad">
    <p class="muted" style="margin-top:0">Rename apps, change their icons, move them between categories, reorder them, hide or restore them — then invent your own themes and wallpapers. Everything here is saved per account, and <b>Reset customisations</b> at the bottom undoes it all without touching your notes, files or other content.</p>
    <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:6px">
      <a class="btn sm" href="#cust-apps" data-jump="cust-apps">🧩 Apps</a><a class="btn sm" href="#cust-themes" data-jump="cust-themes">🎨 Themes</a><a class="btn sm" href="#cust-walls" data-jump="cust-walls">🖼 Wallpapers</a><a class="btn sm" href="#cust-desktop" data-jump="cust-desktop">🖥 Desktop parts</a>
      <button class="btn sm" id="cust-goto-appcenter">＋ Add apps & websites (App Center)</button>
    </div>

    <h3 id="cust-apps">🧩 App modules</h3>
    <div class="field"><label>Search modules</label><input id="cust-q" type="search" placeholder="Search by name, category or id…" style="padding:8px 10px"></div>
    <datalist id="cust-cats">${[...new Set([...CATS, ...Object.values(APPS).map((a) => a.cat)])].map((c) => `<option value="${MH.esc(c)}">`).join('')}</datalist>
    <div id="cust-modlist"></div>

    <h3 id="cust-themes">🎨 Themes</h3>
    <div class="grid-cards" id="cust-themelist"></div>
    <div class="card" style="margin-top:12px"><b>＋ Add a theme</b>
      <form id="cust-theme-form" class="add-form" style="margin-top:8px">
        <div class="field"><label>Theme name</label><input id="ct-name" required maxlength="36" placeholder="e.g. Midnight Forest"></div>
        <div class="field"><label>Accent colour</label><input id="ct-accent" type="color" value="#68b723" style="height:38px;padding:2px"></div>
        <div class="field"><label>Wallpaper</label><select id="ct-wallpaper"></select></div>
        <button class="btn primary" type="submit">Add & apply theme</button>
      </form></div>

    <h3 id="cust-walls">🖼 Wallpapers</h3>
    <div class="grid-cards" id="cust-walllist"></div>
    <div class="card" style="margin-top:12px"><b>＋ Add a wallpaper</b>
      <form id="cust-wall-form" class="add-form" style="margin-top:8px">
        <div class="field"><label>Wallpaper name</label><input id="cw-name" required maxlength="36" placeholder="e.g. Deep Space"></div>
        <div class="field"><label>Colour 1</label><input id="cw-from" type="color" value="#0b1026" style="height:38px;padding:2px"></div>
        <div class="field"><label>Colour 2</label><input id="cw-to" type="color" value="#000000" style="height:38px;padding:2px"></div>
        <button class="btn primary" type="submit">Add & apply wallpaper</button>
      </form></div>

    <h3 id="cust-desktop">🖥 Desktop parts</h3>
    <div class="card" id="cust-components"></div>

    <h3>↩ Start over</h3>
    <div class="card"><p class="muted" style="margin-top:0">Reset every customisation (app renames/icons/categories/order, hidden apps, pins, themes, wallpapers, desktop parts) back to proton defaults. Your content — notes, files, calendar, chats, custom apps and websites — is <b>not</b> deleted.</p>
    <button class="btn danger" id="cust-reset">Reset customisations</button></div>
    </div>`;

    const wpOptions = (selected) => [...WP_BUILTINS.map(([id, n]) => `<option value="${id}" ${selected === id ? 'selected' : ''}>${n} (built-in)</option>`),
      ...userData.customWallpapers.map((w) => `<option value="${w.id}" ${selected === w.id ? 'selected' : ''}>${MH.esc(w.name)} (mine)</option>`)].join('');

    function drawModules() {
      const q = body.querySelector('#cust-q').value.trim().toLowerCase();
      const builtins = Object.values(APPS).filter((a) => !dynamicAppIds.has(a.id))
        .filter((a) => !q || (a.name + ' ' + a.cat + ' ' + a.id + ' ' + a.desc).toLowerCase().includes(q))
        .sort((x, y) => (x.sortOrder ?? x.baseIndex ?? 999) - (y.sortOrder ?? y.baseIndex ?? 999));
      const customs = userData.customApps.filter((a) => !q || (a.name + ' ' + a.url).toLowerCase().includes(q));
      body.querySelector('#cust-modlist').innerHTML =
        builtins.map((a) => {
          const removed = userData.hiddenApps.includes(a.id), edited = !!userData.moduleOverrides[a.id];
          return `<div class="card" style="margin-bottom:9px;${removed ? 'opacity:.62' : ''}">
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <span style="font-size:23px">${a.icon}</span><b>${MH.esc(a.name)}</b>
            <span class="chip">${MH.esc(a.cat)}</span><span class="muted">${a.id}</span>
            ${edited ? '<span class="chip">Edited</span>' : ''}${removed ? '<span class="chip" style="background:#4a1713;color:#ffb4ab">Removed</span>' : ''}
            <span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap">
              ${removed ? `<button class="btn sm primary" data-mrestore="${a.id}">＋ Add back</button>` : `<button class="btn sm primary" data-mopen="${a.id}">Open</button><button class="btn sm" data-mpin="${a.id}">${userData.settings.pinned.includes(a.id) ? 'Unpin' : '📌 Pin'}</button>${PROTECTED.includes(a.id) ? '' : `<button class="btn sm" data-mhide="${a.id}">Remove</button>`}`}
              ${edited ? `<button class="btn sm" data-mreset="${a.id}">Reset</button>` : ''}
            </span></div>
          <div class="add-form" style="margin-top:9px;grid-template-columns:64px 1.5fr 1.2fr 70px 2fr">
            <div class="field"><label>Icon</label><input data-micon="${a.id}" value="${MH.esc(a.icon)}" maxlength="4"></div>
            <div class="field"><label>Name</label><input data-mname="${a.id}" value="${MH.esc(a.name)}" maxlength="40"></div>
            <div class="field"><label>Category</label><input data-mcat="${a.id}" value="${MH.esc(a.cat)}" list="cust-cats" maxlength="24"></div>
            <div class="field"><label>Order</label><input data-morder="${a.id}" type="number" value="${userData.moduleOverrides[a.id]?.order ?? ''}" placeholder="auto"></div>
            <div class="field"><label>Description</label><input data-mdesc="${a.id}" value="${MH.esc(a.desc)}" maxlength="110"></div>
          </div>
          <button class="btn sm" data-msave="${a.id}" style="margin-top:8px">Save changes</button>
          <span class="muted">Tip: give several apps the same new category name to create your own menu section.</span></div>`;
        }).join('') +
        (customs.length ? customs.map((a) => `<div class="card" style="margin-bottom:9px"><span style="font-size:23px">${MH.esc(a.icon || '🧩')}</span> <b>${MH.esc(a.name)}</b> <span class="chip">My Apps</span> <span class="muted site-url">${MH.esc(a.url)}</span>
          <span style="margin-left:8px"></span><button class="btn sm primary" data-copen="${a.id}">Open</button> <button class="btn sm" data-cmanage="${a.id}">Edit / remove in App Center</button></div>`).join('') : '');
      body.querySelectorAll('[data-mopen]').forEach((b) => b.onclick = () => openApp(b.dataset.mopen));
      body.querySelectorAll('[data-copen]').forEach((b) => b.onclick = () => openApp(b.dataset.copen));
      body.querySelectorAll('[data-cmanage]').forEach((b) => b.onclick = () => openApp('appcenter'));
      body.querySelectorAll('[data-mpin]').forEach((b) => b.onclick = () => {
        const id = b.dataset.mpin, p = userData.settings.pinned;
        userData.settings.pinned = p.includes(id) ? p.filter((x) => x !== id) : [...p, id];
        saveData(); renderPanelApps(); drawModules();
      });
      body.querySelectorAll('[data-mhide]').forEach((b) => b.onclick = () => {
        const a = APPS[b.dataset.mhide];
        if (a && confirmBox(`Remove “${a.name}” from the proton menu? You can add it back here or in App Center.`)) {
          closeWin(a.id); userData.hiddenApps.push(a.id);
          userData.settings.pinned = userData.settings.pinned.filter((x) => x !== a.id);
          saveData(); refreshChrome(); drawModules();
        }
      });
      body.querySelectorAll('[data-mrestore]').forEach((b) => b.onclick = () => {
        userData.hiddenApps = userData.hiddenApps.filter((x) => x !== b.dataset.mrestore);
        saveData(); refreshChrome(); drawModules();
      });
      body.querySelectorAll('[data-mreset]').forEach((b) => b.onclick = () => {
        delete userData.moduleOverrides[b.dataset.mreset];
        applyModuleOverrides(); saveData(); refreshChrome(); drawModules(); MH.toast('Module reset to its defaults.');
      });
      body.querySelectorAll('[data-msave]').forEach((b) => b.onclick = () => {
        const id = b.dataset.msave, base = BASE_MODULES[id], a = APPS[id]; if (!base || !a) return;
        const val = (attr) => body.querySelector(`[data-${attr}="${id}"]`).value.trim();
        const o = {};
        if (val('mname') && val('mname') !== base.name) o.name = val('mname');
        if (val('micon') && val('micon') !== base.icon) o.icon = val('micon');
        if (val('mcat') && val('mcat') !== base.cat) o.cat = val('mcat');
        if (val('mdesc') !== base.desc) o.desc = val('mdesc');
        const ord = body.querySelector(`[data-morder="${id}"]`).value;
        if (ord !== '') o.order = Number(ord);
        if (Object.keys(o).length) userData.moduleOverrides[id] = o; else delete userData.moduleOverrides[id];
        applyModuleOverrides(); saveData(); refreshChrome(); drawModules();
        MH.toast(`“${APPS[id].name}” updated — see it in the proton menu.`);
      });
    }

    function drawThemes() {
      const active = userData.settings.activeThemeId;
      body.querySelector('#cust-themelist').innerHTML = `
        <div class="card" ${active === 'proton-dark' ? 'style="outline:2px solid var(--accent)"' : ''}><div style="font-size:26px">🌑</div>
          <h3 style="margin:6px 0 3px">proton Dark ${active === 'proton-dark' ? '<span class="chip">Active</span>' : ''}</h3>
          <p class="muted">The built-in theme: black backgrounds, white text, your chosen accent.</p>
          <div class="field"><label>Accent</label><select data-builtin-accent>${Object.entries(ACCENTS).map(([hex, a]) => `<option value="${hex}" ${userData.settings.accent === hex && active === 'proton-dark' ? 'selected' : ''}>${a.name}</option>`).join('')}</select></div>
          ${active === 'proton-dark' ? '' : '<button class="btn sm primary" data-theme-builtin="1">Apply</button>'}</div>` +
        userData.customThemes.map((th) => `
        <div class="card" ${active === th.id ? 'style="outline:2px solid var(--accent)"' : ''}><div style="font-size:26px">🎨</div>
          ${active === th.id ? '<span class="chip">Active</span>' : ''}
          <div class="field"><label>Theme name</label><input data-thname="${th.id}" value="${MH.esc(th.name)}" maxlength="36"></div>
          <div class="field"><label>Accent colour</label><input data-thaccent="${th.id}" type="color" value="${MH.esc(th.accent)}" style="height:36px;padding:2px;width:100%"></div>
          <div class="field"><label>Wallpaper</label><select data-thwall="${th.id}">${wpOptions(th.wallpaper)}</select></div>
          <button class="btn sm" data-thsave="${th.id}">Save</button>
          ${active === th.id ? '' : `<button class="btn sm primary" data-thapply="${th.id}">Apply</button>`}
          <button class="btn sm" data-thdel="${th.id}">Delete</button></div>`).join('');
      body.querySelector('[data-builtin-accent]').onchange = (e) => {
        userData.settings.accent = e.target.value; userData.settings.activeThemeId = 'proton-dark';
        saveData(); applyAccent(); drawThemes();
      };
      body.querySelector('[data-theme-builtin]')?.addEventListener('click', () => {
        userData.settings.activeThemeId = 'proton-dark'; saveData(); applyAccent(); drawThemes();
      });
      body.querySelectorAll('[data-thsave]').forEach((b) => b.onclick = () => {
        const th = userData.customThemes.find((x) => x.id === b.dataset.thsave); if (!th) return;
        th.name = body.querySelector(`[data-thname="${th.id}"]`).value.trim() || th.name;
        th.accent = body.querySelector(`[data-thaccent="${th.id}"]`).value;
        th.wallpaper = body.querySelector(`[data-thwall="${th.id}"]`).value;
        saveData(); if (activeCustomTheme()?.id === th.id) { applyAccent(); applyWallpaper(); }
        drawThemes(); MH.toast('Theme saved.');
      });
      body.querySelectorAll('[data-thapply]').forEach((b) => b.onclick = () => {
        const th = userData.customThemes.find((x) => x.id === b.dataset.thapply); if (!th) return;
        userData.settings.activeThemeId = th.id; userData.settings.accent = th.accent;
        if (th.wallpaper) userData.settings.wallpaper = th.wallpaper;
        saveData(); applyAccent(); applyWallpaper(); drawThemes(); MH.toast(`Theme “${th.name}” applied.`);
      });
      body.querySelectorAll('[data-thdel]').forEach((b) => b.onclick = () => {
        const th = userData.customThemes.find((x) => x.id === b.dataset.thdel);
        if (!th || !confirmBox(`Delete the theme “${th.name}”?`)) return;
        userData.customThemes = userData.customThemes.filter((x) => x.id !== th.id);
        if (userData.settings.activeThemeId === th.id) { userData.settings.activeThemeId = 'proton-dark'; applyAccent(); }
        saveData(); drawThemes();
      });
      const sel = body.querySelector('#ct-wallpaper');
      if (sel) sel.innerHTML = wpOptions(userData.settings.wallpaper);
    }

    function drawWalls() {
      body.querySelector('#cust-walllist').innerHTML =
        WP_BUILTINS.map(([id, n]) => `<div class="card"><div style="height:44px;border-radius:6px" class="wp-${id}"></div><h3 style="margin:7px 0 3px">${n}</h3><p class="muted">Built-in wallpaper</p>${userData.settings.wallpaper === id ? '<span class="chip">Active</span>' : `<button class="btn sm primary" data-wapply="${id}">Apply</button>`}</div>`).join('') +
        userData.customWallpapers.map((w) => `<div class="card">
          <div style="height:44px;border-radius:6px;background:linear-gradient(150deg, ${MH.esc(w.from)}, ${MH.esc(w.to)})"></div>
          ${userData.settings.wallpaper === w.id ? '<span class="chip" style="margin-top:7px">Active</span>' : ''}
          <div class="field"><label>Name</label><input data-wname="${w.id}" value="${MH.esc(w.name)}" maxlength="36"></div>
          <div style="display:flex;gap:8px"><div class="field" style="flex:1"><label>Colour 1</label><input data-wfrom="${w.id}" type="color" value="${MH.esc(w.from)}" style="height:34px;padding:2px;width:100%"></div>
          <div class="field" style="flex:1"><label>Colour 2</label><input data-wto="${w.id}" type="color" value="${MH.esc(w.to)}" style="height:34px;padding:2px;width:100%"></div></div>
          <button class="btn sm" data-wsave="${w.id}">Save</button>
          ${userData.settings.wallpaper === w.id ? '' : `<button class="btn sm primary" data-wapply="${w.id}">Apply</button>`}
          <button class="btn sm" data-wdel="${w.id}">Delete</button></div>`).join('');
      body.querySelectorAll('[data-wapply]').forEach((b) => b.onclick = () => { setWallpaper(b.dataset.wapply); drawWalls(); drawThemes(); });
      body.querySelectorAll('[data-wsave]').forEach((b) => b.onclick = () => {
        const w = userData.customWallpapers.find((x) => x.id === b.dataset.wsave); if (!w) return;
        w.name = body.querySelector(`[data-wname="${w.id}"]`).value.trim() || w.name;
        w.from = body.querySelector(`[data-wfrom="${w.id}"]`).value;
        w.to = body.querySelector(`[data-wto="${w.id}"]`).value;
        saveData(); applyWallpaper(); drawWalls(); MH.toast('Wallpaper saved.');
      });
      body.querySelectorAll('[data-wdel]').forEach((b) => b.onclick = () => {
        const w = userData.customWallpapers.find((x) => x.id === b.dataset.wdel);
        if (!w || !confirmBox(`Delete the wallpaper “${w.name}”?`)) return;
        userData.customWallpapers = userData.customWallpapers.filter((x) => x.id !== w.id);
        if (userData.settings.wallpaper === w.id) setWallpaper('mint');
        saveData(); drawWalls(); drawThemes();
      });
    }

    function drawComponents() {
      const c = userData.settings.components;
      const items = [
        ['clock', '🕐 Clock in the panel'],
        ['desktopHint', '📅 Date & hint on the desktop'],
        ['lockButton', '🔒 Lock button in the panel'],
        ['userButton', '👤 Account button in the panel'],
        ['startSearch', '🔎 Search box in the proton menu'],
        ['panelLabels', '🏷 Names next to pinned panel icons'],
      ];
      body.querySelector('#cust-components').innerHTML = items.map(([key, label]) =>
        `<label style="display:flex;gap:9px;align-items:center;padding:7px 0;font-weight:600"><input type="checkbox" data-comp="${key}" ${c[key] ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--accent)"> ${label}</label>`).join('') +
        '<p class="muted">Parts switch instantly — nothing reloads and no windows close.</p>';
      body.querySelectorAll('[data-comp]').forEach((box) => box.onchange = () => {
        userData.settings.components[box.dataset.comp] = box.checked;
        saveData(); applyComponents(); renderPanelApps();
      });
    }

    body.querySelector('#cust-q').addEventListener('input', drawModules);
    body.querySelector('#cust-goto-appcenter').onclick = () => openApp('appcenter');
    body.querySelectorAll('[data-jump]').forEach((a) => a.onclick = (e) => {
      e.preventDefault();
      body.querySelector('#' + a.dataset.jump)?.scrollIntoView({ behavior: 'smooth' });
    });
    body.querySelector('#cust-theme-form').onsubmit = (e) => {
      e.preventDefault();
      const th = { id: 'theme-' + MH.uid(), name: body.querySelector('#ct-name').value.trim(), accent: body.querySelector('#ct-accent').value, wallpaper: body.querySelector('#ct-wallpaper').value };
      userData.customThemes.push(th);
      userData.settings.activeThemeId = th.id; userData.settings.accent = th.accent;
      if (th.wallpaper) userData.settings.wallpaper = th.wallpaper;
      saveData(); applyAccent(); applyWallpaper();
      e.target.reset(); body.querySelector('#ct-accent').value = '#68b723';
      drawThemes(); MH.toast(`Theme “${th.name}” added and applied.`);
    };
    body.querySelector('#cust-wall-form').onsubmit = (e) => {
      e.preventDefault();
      const w = { id: 'wall-' + MH.uid(), name: body.querySelector('#cw-name').value.trim(), from: body.querySelector('#cw-from').value, to: body.querySelector('#cw-to').value };
      userData.customWallpapers.push(w);
      saveData(); setWallpaper(w.id);
      e.target.reset(); body.querySelector('#cw-from').value = '#0b1026'; body.querySelector('#cw-to').value = '#000000';
      drawWalls(); drawThemes(); MH.toast(`Wallpaper “${w.name}” added and applied.`);
    };
    body.querySelector('#cust-reset').onclick = () => {
      if (!confirmBox('Reset ALL customisations to proton defaults? Your notes, files, custom apps, websites and other content stay untouched.')) return;
      userData.moduleOverrides = {}; userData.hiddenApps = [];
      userData.settings.pinned = ['files', 'math', 'notes', 'browser', 'terminal'];
      userData.customThemes = []; userData.customWallpapers = [];
      userData.settings.activeThemeId = 'proton-dark';
      userData.settings.accent = '#68b723'; userData.settings.wallpaper = 'mint';
      userData.settings.components = { clock: true, desktopHint: true, lockButton: true, userButton: true, startSearch: true, panelLabels: false };
      applyModuleOverrides(); saveData(); applyAccent(); applyWallpaper(); applyComponents(); refreshChrome();
      drawModules(); drawThemes(); drawWalls(); drawComponents();
      MH.toast('Customisations reset to defaults.');
    };

    drawModules(); drawThemes(); drawWalls(); drawComponents();
  },
});

/* ============================ SETTINGS ============================ */
registerApp({
  id: 'settings', name: 'Settings', icon: '⚙️', cat: 'System', desc: 'Account, wallpaper, backups and this device', w: 880, h: 600,
  render(body) {
    const used = JSON.stringify(userData).length;
    body.innerHTML = `${bar('Settings')}<div class="app-main pad">
    <div class="stat-grid">
      <div class="stat"><b>${currentUser.avatar} ${MH.esc(currentUser.displayName)}</b><span class="muted">@${MH.esc(currentUser.username)} · joined ${new Date(currentUser.createdAt).toLocaleDateString()}</span></div>
      <div class="stat"><b>${MH.fmtBytes(used)}</b><span class="muted">saved for this account on this device</span></div>
      <div class="stat"><b>${userData.notes.length + userData.files.length + userData.events.length}</b><span class="muted">notes, files &amp; events</span></div>
      <div class="stat"><b>${userData.counters.windowsOpened || 0}</b><span class="muted">windows opened, all time</span></div>
    </div>

    <h3>🎨 Wallpaper</h3><div class="wall-pick">
      ${[['mint', 'Mint'], ['ocean', 'Ocean'], ['sunset', 'Sunset'], ['grape', 'Grape'], ['slate', 'Slate'], ['rose', 'Rose']].map(([id, n]) =>
        `<button data-wp="${id}" class="wp-${id} ${userData.settings.wallpaper === id ? 'sel' : ''}">${n}</button>`).join('')}
      ${(userData.customWallpapers || []).map((w) =>
        `<button data-wp="${w.id}" style="background:linear-gradient(150deg, ${MH.esc(w.from)}, ${MH.esc(w.to)})" class="${userData.settings.wallpaper === w.id ? 'sel' : ''}">${MH.esc(w.name)}</button>`).join('')}
    </div>
    <p class="muted">Want more? Add, edit and remove your own wallpapers, themes, apps and desktop parts in the <b>Customize</b> app. <button class="btn sm" id="s-open-customize">🎛️ Open Customize</button></p>
    <h3>🌈 Accent colour</h3><div style="display:flex;gap:8px;flex-wrap:wrap">
      ${Object.entries(ACCENTS).map(([hex, a]) => `<button class="btn sm" data-accent="${hex}" style="${userData.settings.accent === hex ? 'outline:3px solid ' + hex : ''}"><span style="display:inline-block;width:13px;height:13px;border-radius:50%;background:${hex};vertical-align:-2px"></span> ${a.name}</button>`).join('')}
    </div>

    <h3>👤 Profile</h3>
    <div class="field"><label>Display name</label><input id="s-name" value="${MH.esc(currentUser.displayName)}"></div>
    <div class="field"><label>Email (optional, stays on this device)</label><input id="s-email" type="email" value="${MH.esc(currentUser.email || '')}"></div>
    <button class="btn primary" id="s-saveprofile">Save profile</button>

    <h3>🔑 Change password</h3>
    <div class="field"><label>Current password</label><input id="s-cur" type="password" autocomplete="current-password"></div>
    <div class="auth-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="field"><label>New password (6+ characters)</label><input id="s-new" type="password" autocomplete="new-password"></div>
      <div class="field"><label>Confirm new password</label><input id="s-new2" type="password" autocomplete="new-password"></div></div>
    <div class="auth-err" id="s-passerr"></div>
    <button class="btn" id="s-changepass">Change password</button>

    <h3>💾 Backup (export / import everything for this account)</h3>
    <p class="muted">Your data only exists in this browser. Export a backup before clearing browser data or changing devices.</p>
    <button class="btn" id="s-export">⬇ Export backup (.json)</button>
    <label class="btn">⬆ Import backup<input id="s-import" type="file" accept=".json" hidden></label>

    <h3>👥 Accounts on this device</h3>
    <p>${Object.values(MH.accounts()).map((a) => `${a.avatar} <b>${MH.esc(a.username)}</b> (${MH.esc(a.displayName)})${a.usernameLower === currentUser.usernameLower ? ' — you' : ''}`).join('<br>')}</p>
    <button class="btn" id="s-addacct">＋ Create another account</button>
    <button class="btn" id="s-lock">🔒 Lock desktop</button>
    <button class="btn" id="s-signout">Sign out</button>

    <h3 style="color:var(--danger)">Danger zone</h3>
    <button class="btn danger" id="s-delete">Delete my account &amp; all its data</button>
    <p class="auth-note">proton is a static clone of Mixt (<i>proton-arcade/mlp</i>, branch <span class="kbd">arena/170861f7-mlp</span>, commit <span class="kbd">c37c6ca</span>), rebranded and rebuilt to run with no server. AGPL-3.0-only — see CREDITS.md / LICENSE.txt in the repository. Open <b>About</b> from App Center for details.</p>
    </div>`;
    body.querySelectorAll('[data-wp]').forEach((b) => b.onclick = () => {
      setWallpaper(b.dataset.wp);
      body.querySelectorAll('[data-wp]').forEach((x) => x.classList.toggle('sel', x === b));
    });
    body.querySelectorAll('[data-accent]').forEach((b) => b.onclick = () => { userData.settings.accent = b.dataset.accent; userData.settings.activeThemeId = 'proton-dark'; saveData(); applyAccent(); openAppRefresh('settings'); });
    function openAppRefresh(id) { closeWin(id); openApp(id); }
    body.querySelector('#s-open-customize')?.addEventListener('click', () => openApp('customize'));
    body.querySelector('#s-saveprofile').onclick = () => {
      const accounts = MH.accounts();
      accounts[currentUser.usernameLower].displayName = body.querySelector('#s-name').value.trim() || currentUser.displayName;
      accounts[currentUser.usernameLower].email = body.querySelector('#s-email').value.trim();
      MH.saveAccounts(accounts); currentUser = accounts[currentUser.usernameLower];
      MH.toast('Profile saved.'); renderStartMenu('');
    };
    body.querySelector('#s-changepass').onclick = async () => {
      const err = body.querySelector('#s-passerr');
      if (!(await MH.verifyPassword(body.querySelector('#s-cur').value, currentUser))) { err.textContent = 'Current password is incorrect.'; return; }
      const n = body.querySelector('#s-new').value;
      if (n.length < 6) { err.textContent = 'New password needs at least 6 characters.'; return; }
      if (n !== body.querySelector('#s-new2').value) { err.textContent = 'New passwords do not match.'; return; }
      const accounts = MH.accounts(), salt = MH.uid() + MH.uid();
      accounts[currentUser.usernameLower].salt = salt;
      accounts[currentUser.usernameLower].hash = await MH.hashPassword(n, salt);
      MH.saveAccounts(accounts); currentUser = accounts[currentUser.usernameLower];
      err.textContent = ''; MH.toast('Password changed. Use it next time you sign in or unlock.');
    };
    body.querySelector('#s-export').onclick = () => MH.download(`proton-backup-${currentUser.username}.json`, JSON.stringify({ account: { username: currentUser.username, displayName: currentUser.displayName }, exportedAt: new Date().toISOString(), data: userData }, null, 2), 'application/json');
    body.querySelector('#s-import').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const parsed = JSON.parse(await f.text());
        if (!parsed.data?.settings) throw new Error('bad file');
        userData = parsed.data; normalizeUserData(); syncCustomApps(); saveDataNow(); refreshChrome();
        applyWallpaper();
        applyAccent(); renderPanelApps(); applyComponents();
        MH.toast('Backup imported — your desktop was restored.');
      } catch { MH.toast('That file is not a proton backup.'); }
    };
    body.querySelector('#s-addacct').onclick = () => { saveDataNow(); MH.$('desktop').hidden = true; wins.clear(); renderSetup(true); };
    body.querySelector('#s-lock').onclick = lockDesktop;
    body.querySelector('#s-signout').onclick = signOut;
    body.querySelector('#s-delete').onclick = () => {
      if (!confirmBox(`Delete @${currentUser.username} and ALL its data on this device? This cannot be undone.`)) return;
      const accounts = MH.accounts(); delete accounts[currentUser.usernameLower];
      MH.saveAccounts(accounts); localStorage.removeItem(MH.userKey(currentUser.usernameLower));
      signOut();
    };
  },
});

/* ============================ ABOUT ============================ */
registerApp({
  id: 'about', name: 'About', icon: 'ℹ️', cat: 'System', desc: 'What this is, credits and how saving works', w: 720, h: 540,
  render(body) {
    body.innerHTML = `${bar('About proton')}<div class="app-main pad">
      <div style="display:flex;gap:14px;align-items:center"><div class="auth-logo">⚛</div><div><h2 style="margin:0">proton</h2><span class="muted">A complete desktop computer in your browser — no server edition</span></div></div>
      <p>This site is a <b>static clone</b> of <b>Mixt</b> from <a href="https://github.com/proton-arcade/mlp/tree/arena/170861f7-mlp" target="_blank" rel="noopener">proton-arcade/mlp @ arena/170861f7-mlp</a> (commit <span class="kbd">c37c6ca</span>), the Mint/Cinnamon-styled browser desktop built on Puter-derived internals. The original needs a Node.js server, SQLite and HTTPS; GitHub Pages can only serve static files, so the desktop, window manager and apps were <b>rebuilt browser-only</b> and rebranded, keeping Mixt's Mint-Y look (green <span class="kbd">#68b723</span>, light title bars, dark bottom panel).</p>
      <h3>Your account</h3>
      <p>On first launch you created an account that lives <b>only in this browser</b> (localStorage). Passwords are salted SHA-256 hashes — never plain text, never sent anywhere. You stay signed in until you sign out; every app saves per-account, automatically.</p>
      <h3>What's inside</h3>
      <p>${Object.values(APPS).map((a) => `${a.icon} ${MH.esc(a.name)}`).join(' · ')}</p>
      <h3>Credits &amp; licence</h3>
      <p class="muted">Mixt / this clone: GNU AGPL-3.0-only. Contains design and app concepts derived from Puter (© Puter Technologies Inc., AGPL-3.0). Not affiliated with Linux Mint, Cinnamon, Puter, or the original authors. Full notes in <span class="kbd">CREDITS.md</span> and <span class="kbd">LICENSE.txt</span> in this repository.</p>
      <button class="btn primary" onclick="window.open('https://github.com/proton-arcade/mlp/tree/arena/170861f7-mlp','_blank')">View the original project ↗</button>
    </div>`;
  },
});
