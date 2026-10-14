/* proton app module: about — edit this file to change this app.
 * Loaded by index.html; calls registerApp() (see apps/README.md). */
'use strict';

/* ============================ ABOUT ============================ */
registerApp({
  id: 'about', name: 'About', icon: 'info', cat: 'System', desc: 'What this is, credits and how saving works', w: 720, h: 540,
  render(body) {
    body.innerHTML = `${bar('About proton')}<div class="app-main pad">
      <div style="display:flex;gap:14px;align-items:center"><div class="auth-logo">${iconSvg('atom')}</div><div><h2 style="margin:0">proton</h2><span class="muted">A complete desktop computer in your browser — no server edition</span></div></div>
      <p>This site is a <b>static clone</b> of <b>Mixt</b> from <a href="https://github.com/proton-arcade/mlp/tree/arena/170861f7-mlp" target="_blank" rel="noopener">proton-arcade/mlp @ arena/170861f7-mlp</a> (commit <span class="kbd">c37c6ca</span>), the Mint/Cinnamon-styled browser desktop built on Puter-derived internals. The original needs a Node.js server, SQLite and HTTPS; GitHub Pages can only serve static files, so the desktop, window manager and apps were <b>rebuilt browser-only</b> and rebranded, keeping Mixt's Mint-Y look (green <span class="kbd">#68b723</span>, light title bars, dark bottom panel).</p>
      <h3>Your account</h3>
      <p>On first launch you created an account that lives <b>only in this browser</b> (localStorage). Passwords are salted SHA-256 hashes — never plain text, never sent anywhere. You stay signed in until you sign out; every app saves per-account, automatically.</p>
      <h3>What's inside</h3>
      <p>${Object.values(APPS).map((a) => `${iconFor(a.icon)} ${MH.esc(a.name)}`).join(' · ')}</p>
      <h3>Credits &amp; licence</h3>
      <p class="muted">Mixt / this clone: GNU AGPL-3.0-only. Contains design and app concepts derived from Puter (© Puter Technologies Inc., AGPL-3.0). Not affiliated with Linux Mint, Cinnamon, Puter, or the original authors. Full notes in <span class="kbd">CREDITS.md</span> and <span class="kbd">LICENSE.txt</span> in this repository.</p>
      <button class="btn primary" onclick="window.open('https://github.com/proton-arcade/mlp/tree/arena/170861f7-mlp','_blank')">${iconSvg('external')} View the original project</button>
    </div>`;
  },
});
