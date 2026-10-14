/* proton app module: contacts — edit this file to change this app.
 * Loaded by index.html; calls registerApp() (see apps/README.md). */
'use strict';

/* ============================ CONTACTS ============================ */
registerApp({
  id: 'contacts', name: 'Contacts', icon: 'users', cat: 'Productivity', desc: 'Address book saved on this device', w: 820, h: 520,
  render(body) {
    let sel = null;
    body.innerHTML = `${bar('Contacts', `<input type="search" id="ct-q" placeholder="Search contacts"><button class="btn sm primary" id="ct-new">+ New</button>`)}
    <div class="split"><aside class="side" id="ct-list"></aside><div class="app-main pad" id="ct-detail"></div></div>`;
    function draw() {
      const q = body.querySelector('#ct-q').value.trim().toLowerCase();
      const list = userData.contacts.filter((c) => !q || (c.name + c.email).toLowerCase().includes(q));
      body.querySelector('#ct-list').innerHTML = list.length ? list.map((c) => `
        <button class="rowitem ${c.id === sel ? 'sel' : ''}" data-id="${c.id}"><span class="lock-avatar" style="width:36px;height:36px;font-size:16px;margin:0;background:${avatarBg(currentUser)}">${MH.esc((c.name[0] || '?').toUpperCase())}</span><span><b>${MH.esc(c.name)}</b><br><span class="muted">${MH.esc(c.email)}</span></span></button>`).join('') : '<div class="pad muted">No contacts.</div>';
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
