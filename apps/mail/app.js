/* proton app module: mail — edit this file to change this app.
 * Loaded by index.html; calls registerApp() (see apps/README.md). */
'use strict';

/* ============================ MAIL ============================ */
registerApp({
  id: 'mail', name: 'Mail', icon: 'mail', cat: 'Chat & Media', desc: 'On-device mailbox — compose, drafts, sent', w: 900, h: 570,
  render(body) {
    let folder = 'inbox', sel = null, draft = null;
    body.innerHTML = `${bar('Mail', `<button class="btn sm primary" id="m-new">${iconSvg('edit')} Compose</button>`)}
    <div class="split"><aside class="side">
      ${['inbox', 'sent', 'drafts'].map((f) => `<button class="rowitem" data-f="${f}">${f === 'inbox' ? iconSvg('inbox') : f === 'sent' ? iconSvg('send') : iconSvg('edit')} ${f[0].toUpperCase() + f.slice(1)} <span class="muted" style="margin-left:auto" data-count="${f}"></span></button>`).join('')}
      <div class="pad muted">Mail is stored only in this browser — it never leaves your device.</div></aside>
      <div style="display:flex;flex-direction:column;min-height:0"><div id="m-list" style="max-height:42%;overflow:auto;border-bottom:1px solid var(--line)"></div><div class="app-main pad" id="m-view"></div></div></div>`;
    function draw() {
      body.querySelectorAll('[data-count]').forEach((s) => s.textContent = userData.mail.filter((m) => m.folder === s.dataset.count).length || '');
      body.querySelectorAll('[data-f]').forEach((b) => b.classList.toggle('sel', b.dataset.f === folder));
      const items = userData.mail.filter((m) => m.folder === folder).sort((a, b) => b.date - a.date);
      body.querySelector('#m-list').innerHTML = items.length ? items.map((m) => `
        <button class="rowitem ${m.id === sel ? 'sel' : ''}" data-id="${m.id}"><span>${m.read || folder !== 'inbox' ? '' : '<span class="pdot" style="background:#3d7fca" title="Unread"></span> '}<b>${MH.esc(folder === 'inbox' ? m.from : m.to)}</b> — ${MH.esc(m.subject)}<br><span class="muted">${new Date(m.date).toLocaleString()} · ${MH.esc(m.body.slice(0, 60))}…</span></span></button>`).join('')
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
        <button class="btn" id="m-reply">${iconSvg('reply')} Reply</button> <button class="btn" id="m-delmail">Delete</button>`
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
