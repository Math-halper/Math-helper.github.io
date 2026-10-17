/* proton — storage + accounts (browser-only, localStorage).
 *
 * No server exists on a static site, so accounts live on THIS device only.
 * Passwords are never stored in plain text: we keep a per-user random salt
 * and a SHA-256 hash (crypto.subtle). Where subtle crypto is unavailable
 * (non-secure context) we fall back to a salted FNV-1a hash and say so.
 *
 * Data layout:
 *   mhOS.accounts.v1       { [usernameLower]: account }
 *   mhOS.session.v1        legacy key from persistent sign-in; now cleared
 *                          (sign-in lasts only until the page is refreshed)
 *   mhOS.user.<name>.v1    that account's whole desktop state
 */
'use strict';

const MH = {
  ACCOUNTS_KEY: 'mhOS.accounts.v1',
  SESSION_KEY: 'mhOS.session.v1',
  userKey: (u) => `mhOS.user.${u}.v1`,

  $: (id) => document.getElementById(id),
  esc: (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
  todayISO: () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; },
  fmtBytes: (n) => n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`,

  clone: (v) => JSON.parse(JSON.stringify(v)),
  loadJSON(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : MH.clone(fallback); }
    catch { return MH.clone(fallback); }
  },
  saveJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { MH.toast('Storage is full — some changes could not be saved.'); console.warn(e); return false; }
  },

  accounts() { return MH.loadJSON(MH.ACCOUNTS_KEY, {}); },
  saveAccounts(a) { MH.saveJSON(MH.ACCOUNTS_KEY, a); },
  /* Sign-in is deliberately not persisted: refreshing the page must ask
   * for the password again, exactly like signing out. Any legacy stored
   * session key is cleared so older visits cannot auto-sign-in either. */
  session() { return ''; },
  setSession() { localStorage.removeItem(MH.SESSION_KEY); },

  fnv(str) { // fallback hash (not cryptographic — only used off secure contexts)
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return 'fnv1a:' + h.toString(16);
  },
  async hashPassword(password, salt) {
    const msg = `${salt}:${password}`;
    if (crypto?.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
      return 'sha256:' + [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    return MH.fnv(msg + ':' + msg.length);
  },
  async verifyPassword(password, account) {
    return (await MH.hashPassword(password, account.salt)) === account.hash;
  },

  /* Desktop entries are links, not copies of apps or files. Return fresh
   * objects so accounts can rearrange/remove them independently. proton
   * ships its System apps only, so a new account starts with two shortcuts:
   * Settings and the Browser. (The old Files/Documents links pointed at the
   * Files app, which is no longer part of this build.) */
  defaultDesktopIcons() {
    return [
      { id: 'desktop-settings', kind: 'app', target: 'settings', col: 0, row: 0 },
      { id: 'desktop-browser', kind: 'app', target: 'browser', col: 0, row: 1 },
    ];
  },

  /* ---- seeded state for a brand-new account ---- */
  defaultData(displayName, username) {
    const today = MH.todayISO();
    /* The account's file system home — mirrored by FS.home() in assets/fs.js. */
    const home = '/home/' + String(username || 'user').toLowerCase();
    return {
      version: 1,
      settings: { wallpaper: 'mint', accent: '#ffffff', pinned: ['settings', 'appcenter', 'browser'] },
      desktopIcons: MH.defaultDesktopIcons(),
      notes: [{
        id: MH.uid(), title: 'Welcome to proton',
        html: `<p>This desktop is a <b>static clone of Mixt</b> (from <i>proton-arcade/mlp</i>), rebranded and rebuilt to run with <b>no server at all</b>.</p><h2><span style="font-size:19px">Things to try</span></h2><ul><li>The five core System apps are joined by one sandboxed GitHub Pages embed: Celeste Classic. No game files are copied here.</li><li>Everything you type here is <b>saved on this device</b>, under your account</li><li>Drag windows, pin apps to the panel, change the wallpaper in Settings</li></ul><p>Have fun!</p>`,
        updated: Date.now(),
      }],
      events: [{ id: MH.uid(), date: today, time: '09:00', title: 'First day on proton', notes: 'Created my account today.' }],
      contacts: [
        { id: MH.uid(), name: 'Nova (Helper Bot)', email: 'Nova@localhost', phone: '', notes: 'Built-in helper. It has no app of its own any more.' },
        { id: MH.uid(), name: displayName, email: '', phone: '', notes: 'Me' },
      ],
      /* Real hierarchical file system (assets/fs.js). dirs are the folders
       * under the account's home; files carry full paths. Everything outside
       * /home/<user> is the read-only system tree. */
      dirs: [home + '/Desktop', home + '/Documents', home + '/Pictures', home + '/Downloads'],
      files: [
        { path: home + '/Documents/Welcome.txt', content: 'Welcome to proton!\n\nThe five core System apps are joined by Celeste Classic, embedded from its\nexternal GitHub Pages site. No game files or assets are copied into this\nproject. Your account still has a virtual file system rooted at / :\n- /  holds every single file of the proton system (read-only)\n- /home/<you>  is yours\n\nThe Browser can open any HTML file in it, and Settings exports\nyour whole account as a backup.', updated: Date.now() },
        { path: home + '/Documents/Ideas.txt', content: 'Ideas:\n- Try a new wallpaper in Settings\n- Rename an app in Customize\n- ', updated: Date.now() },
        { path: home + '/README.txt', content: 'proton — static clone of Mixt (proton-arcade/mlp @ arena/170861f7-mlp), rebranded.\nLicensed AGPL-3.0-only. See CREDITS.md in the project repo.', updated: Date.now() },
      ],
      sheets: { 'Budget': { 'B1': 'Item', 'C1': 'Cost', 'B2': 'Books', 'C2': '25', 'B3': 'Snacks', 'C3': '8', 'B4': 'Total', 'C4': '=SUM(C2:C3)' } },
      activeSheet: 'Budget',
      slides: [
        { id: MH.uid(), title: 'My First Presentation', body: 'Made on proton — saved on this device.' },
        { id: MH.uid(), title: 'Slide Two', body: 'Use the arrow keys in Present mode.\nEdit any slide on the left.' },
      ],
      boards: [{ id: MH.uid(), name: 'Scribbles', data: '' }],
      games: {},
      counters: { windowsOpened: 0 },
      /* Apps & websites saved on this account. Adding websites and
       * web-address apps is disabled now, but anything already saved stays
       * openable and removable (Mixt-style install/remove, grandfathered).
       * customApps: [{id,name,icon,desc,url}] — each becomes a real proton app.
       * websites:   [{id,name,icon,url}]   — saved sites, opened in Browser.
       * hiddenApps: [appId]                — built-ins the user "removed"
       *                                      (hidden from menu, restorable). */
      customApps: [],
      websites: [],
      hiddenApps: [],

    };
  },

  toast(msg) {
    const box = MH.$('toasts'); if (!box) return;
    const el = document.createElement('div');
    el.className = 'toast'; el.textContent = msg;
    box.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 320); }, 3400);
  },

  download(filename, text, type = 'text/plain') {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  },
};

/* live session state shared by core.js / apps.js */
let currentUser = null;   // account object
let userData = null;      // per-account data (MH.defaultData shape)
let saveTimer = null;
function saveData() {
  if (!currentUser) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => MH.saveJSON(MH.userKey(currentUser.usernameLower), userData), 150);
}
function saveDataNow() {
  if (!currentUser) return false;
  clearTimeout(saveTimer);
  return MH.saveJSON(MH.userKey(currentUser.usernameLower), userData);
}
