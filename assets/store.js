/* proton — storage + accounts (browser-only, localStorage).
 *
 * No server exists on a static site, so accounts live on THIS device only.
 * Passwords are never stored in plain text: we keep a per-user random salt
 * and a SHA-256 hash (crypto.subtle). Where subtle crypto is unavailable
 * (non-secure context) we fall back to a salted FNV-1a hash and say so.
 *
 * Data layout:
 *   mhOS.accounts.v1       { [usernameLower]: account }
 *   mhOS.session.v1        usernameLower that stays signed in (or "")
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
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (e) { MH.toast('Storage is full — some changes could not be saved.'); console.warn(e); }
  },

  accounts() { return MH.loadJSON(MH.ACCOUNTS_KEY, {}); },
  saveAccounts(a) { MH.saveJSON(MH.ACCOUNTS_KEY, a); },
  session() { return localStorage.getItem(MH.SESSION_KEY) || ''; },
  setSession(u) { u ? localStorage.setItem(MH.SESSION_KEY, u) : localStorage.removeItem(MH.SESSION_KEY); },

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

  /* ---- seeded state for a brand-new account ---- */
  defaultData(displayName) {
    const today = MH.todayISO();
    return {
      version: 1,
      settings: { wallpaper: 'mint', accent: '#ffffff', pinned: ['files', 'math', 'notes', 'browser', 'terminal'] },
      notes: [{
        id: MH.uid(), title: 'Welcome to proton',
        html: `<p>This desktop is a <b>static clone of Mixt</b> (from <i>proton-arcade/mlp</i>), rebranded and rebuilt to run with <b>no server at all</b>.</p><h2><span style="font-size:19px">Things to try</span></h2><ul><li>Open the <b>Calculator</b> app — calculator, solver and graph plotter</li><li>Everything you type here is <b>saved on this device</b>, under your account</li><li>Drag windows, pin apps to the panel, change the wallpaper in Settings</li></ul><p>Have fun!</p>`,
        updated: Date.now(),
      }],
      events: [{ id: MH.uid(), date: today, time: '09:00', title: 'First day on proton', notes: 'Created my account today.' }],
      contacts: [
        { id: MH.uid(), name: 'Nova (Helper Bot)', email: 'Nova@localhost', phone: '', notes: 'Built-in chat helper. Say hi in Team Chat!' },
        { id: MH.uid(), name: displayName, email: '', phone: '', notes: 'Me' },
      ],
      mail: [{
        id: MH.uid(), folder: 'inbox', from: 'proton', to: displayName, subject: 'Welcome aboard!',
        body: `Hi ${displayName},\n\nYour account lives entirely in this browser — no server, no tracking. Your notes, files, calendar and games are saved on this device and will be here next visit because you stay signed in.\n\nTip: press the proton menu (bottom-left) to see every app.\n\n— proton`, date: Date.now(), read: false,
      }],
      files: [
        { id: MH.uid(), name: 'Welcome.txt', folder: 'Documents', type: 'text', content: 'Welcome to proton!\n\nYour Files app is a virtual drive saved in this browser.\nCreate text files, organise them in folders, download or delete them.\n\nFiles never leave this device.', updated: Date.now() },
        { id: MH.uid(), name: 'Ideas.txt', folder: 'Documents', type: 'text', content: 'Ideas:\n- Practise 20 minutes of maths a day\n- Beat the Sudoku hard mode\n- ', updated: Date.now() },
        { id: MH.uid(), name: 'README.txt', folder: 'Home', type: 'text', content: 'proton — static clone of Mixt (proton-arcade/mlp @ arena/170861f7-mlp), rebranded.\nLicensed AGPL-3.0-only. See CREDITS.md in the project repo.', updated: Date.now() },
      ],
      fileFolders: ['Home', 'Documents', 'Pictures', 'Downloads'],
      sheets: { 'Budget': { 'B1': 'Item', 'C1': 'Cost', 'B2': 'Books', 'C2': '25', 'B3': 'Snacks', 'C3': '8', 'B4': 'Total', 'C4': '=SUM(C2:C3)' } },
      activeSheet: 'Budget',
      slides: [
        { id: MH.uid(), title: 'My First Presentation', body: 'Made on proton — saved on this device.' },
        { id: MH.uid(), title: 'Slide Two', body: 'Use the arrow keys in Present mode.\nEdit any slide on the left.' },
      ],
      boards: [{ id: MH.uid(), name: 'Scribbles', data: '' }],
      chat: {
        general: [{ id: MH.uid(), who: 'Nova', me: false, text: 'Welcome to #general! I live in your browser and remember this conversation on this device.', ts: Date.now() }],
        maths: [{ id: MH.uid(), who: 'Nova', me: false, text: 'Ask me things like “what is 12 × 8?” or “solve x+3=7” right here in chat.', ts: Date.now() }],
        games: [{ id: MH.uid(), who: 'Nova', me: false, text: 'Chess, Checkers, Sudoku, Solitaire and Backgammon are all in the proton menu.', ts: Date.now() }],
      },
      meetings: [{ id: MH.uid(), title: 'Weekly study group', when: today + 'T16:00', agenda: '1. Review homework\n2. Plan next topic\n3. Questions', notes: '' }],
      vault: [{ id: MH.uid(), title: 'Example secret', body: 'The vault asks for your account password again before showing these notes.' }],
      games: {},
      counters: { windowsOpened: 0 },
      /* Apps & websites the user adds themselves (Mixt-style install/remove).
       * customApps: [{id,name,icon,desc,url}] — each becomes a real proton app.
       * websites:   [{id,name,icon,url}]   — saved sites, opened in Browser.
       * hiddenApps: [appId]                — built-ins the user "removed"
       *                                      (hidden from menu, restorable). */
      customApps: [],
      websites: [{ id: 'site-mixt', name: 'Mixt — the original project', icon: 'atom', url: 'https://github.com/proton-arcade/mlp/tree/arena/170861f7-mlp' }],
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
  if (!currentUser) return;
  clearTimeout(saveTimer);
  MH.saveJSON(MH.userKey(currentUser.usernameLower), userData);
}
