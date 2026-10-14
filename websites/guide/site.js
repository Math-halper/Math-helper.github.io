/* proton built-in website: Guide — edit this file to change this site.
 * Loaded by index.html; calls registerSite() (see websites/README.md). */
'use strict';

registerSite({
  id: 'guide', name: 'Guide', icon: '📖', desc: 'How this desktop works: accounts, saving, windows, backups',
  render(main) {
    main.innerHTML = `<div class="pad" style="max-width:720px"><h2>Guide</h2>
      <details class="help" open><summary>Your account</summary><p>Created on first launch, stored only in this browser (salted SHA-256 password hash). You stay signed in until you sign out. Lock hides the desktop behind your password.</p></details>
      <details class="help"><summary>Windows</summary><p>Drag title bars to move, drag the bottom-right corner to resize, double-click a title bar to maximise. The panel (bottom) shows pinned + running apps; the active app gets a green underline — just like Mixt's Mint-Y panel.</p></details>
      <details class="help"><summary>Saving</summary><p>Notes, files, calendar, contacts, mail, slides, boards, chats and game progress autosave per account. Export a backup in <b>Settings → Backup</b> before clearing browser data.</p></details>
      <details class="help"><summary>Adding & removing things</summary><p>Use <b>App Center</b> to add your own apps and websites, and <b>Customize</b> to rename, re-icon, reorder, theme or hide almost anything.</p></details>
      <details class="help"><summary>Going further</summary><p>Open the Terminal and type <span class="kbd">help</span>, or ask Nova in Team Chat things like “what is 12 × 8?”.</p></details></div>`;
  },
});
