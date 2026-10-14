/* proton app module: admin-vault — edit this file to change this app.
 * Loaded by index.html; calls registerApp() (see apps/README.md). */
'use strict';

/* ============================ VAULT ============================ */
registerApp({
  id: 'vault', name: 'Admin Vault', icon: 'lock', cat: 'System', desc: 'Private notes behind your account password (adapted from Admin Vault)', w: 760, h: 520,
  render(body, ctx) {
    body.innerHTML = `${bar('Admin Vault')}<div class="app-main pad" style="max-width:520px">
      <p>${iconSvg('lock')} The vault re-checks <b>your account password</b> before showing private notes — the static-site version of the original's admin-only vault.</p>
      <form id="v-form"><div class="field"><label>Account password</label><input id="v-pass" type="password" autocomplete="current-password"></div>
      <div class="auth-err" id="v-err"></div><button class="btn primary">Unlock vault</button></form></div>`;
    body.querySelector('#v-form').onsubmit = async (e) => {
      e.preventDefault();
      if (!(await MH.verifyPassword(body.querySelector('#v-pass').value, currentUser))) { body.querySelector('#v-err').textContent = 'Incorrect password.'; return; }
      let sel = null;
      body.innerHTML = `${bar('Admin Vault — unlocked', `<button class="btn sm primary" id="v-new">${iconSvg('plus')} Secret</button><button class="btn sm" id="v-lock">${iconSvg('lock')} Lock</button>`)}
      <div class="split"><aside class="side" id="v-list"></aside><div class="app-main pad" id="v-edit"></div></div>`;
      const draw = () => {
        body.querySelector('#v-list').innerHTML = userData.vault.map((v) => `<button class="rowitem ${v.id === sel ? 'sel' : ''}" data-id="${v.id}">${iconSvg('key')} ${MH.esc(v.title)}</button>`).join('') || '<div class="pad muted">No secrets yet.</div>';
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
