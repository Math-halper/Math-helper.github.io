/* proton app module: meetings — edit this file to change this app.
 * Loaded by index.html; calls registerApp() (see apps/README.md). */
'use strict';

/* ============================ MEETINGS ============================ */
registerApp({
  id: 'meetings', name: 'Meetings', icon: 'video', cat: 'Chat & Media', desc: 'Plan meetings with agendas & notes (on-device)', w: 860, h: 540,
  render(body) {
    let sel = null;
    body.innerHTML = `${bar('Meetings', `<button class="btn sm primary" id="mt-new">+ New meeting</button>`)}
    <div class="split"><aside class="side" id="mt-list"></aside><div class="app-main pad" id="mt-detail"></div></div>`;
    function draw() {
      body.querySelector('#mt-list').innerHTML = [...userData.meetings].sort((a, b) => a.when.localeCompare(b.when)).map((m) => {
        const past = new Date(m.when) < new Date();
        return `<button class="rowitem ${m.id === sel ? 'sel' : ''}" data-id="${m.id}"><span><b>${MH.esc(m.title)}</b><br><span class="muted">${new Date(m.when).toLocaleString()} ${past ? '· past' : ''}</span></span></button>`;
      }).join('') || '<div class="pad muted">No meetings planned.</div>';
      body.querySelectorAll('#mt-list [data-id]').forEach((b) => b.onclick = () => { sel = b.dataset.id; draw(); });
      const m = userData.meetings.find((x) => x.id === sel);
      body.querySelector('#mt-detail').innerHTML = m ? `
        <div class="field"><label>Title</label><input id="mt-title" value="${MH.esc(m.title)}" style="padding:8px;width:100%"></div>
        <div class="field"><label>When</label><input id="mt-when" type="datetime-local" value="${MH.esc(m.when)}" style="padding:8px;width:100%"></div>
        <p class="muted" id="mt-count"></p>
        <div class="field"><label>Agenda</label><textarea id="mt-agenda" rows="5">${MH.esc(m.agenda)}</textarea></div>
        <div class="field"><label>Notes</label><textarea id="mt-notes" rows="5">${MH.esc(m.notes)}</textarea></div>
        <button class="btn primary" id="mt-save">Save meeting</button> <button class="btn" id="mt-del">Delete</button>
        <p class="muted">Video calling needs a server, so this static edition keeps the planner: agenda, notes &amp; countdown. For a call, paste your usual meeting link into the agenda.</p>`
        : '<p class="muted">Select a meeting, or create one.</p>';
      if (m) {
        const upd = () => {
          const diff = new Date(m.when) - new Date(), el = body.querySelector('#mt-count');
          if (!el) return;
          el.textContent = diff < 0 ? 'This meeting is in the past.' : `Starts in ${Math.floor(diff / 864e5)}d ${Math.floor(diff / 36e5) % 24}h ${Math.floor(diff / 6e4) % 60}m — also added as an all-day reminder if you copy it to Calendar.`;
        };
        upd();
        body.querySelector('#mt-save').onclick = () => {
          m.title = body.querySelector('#mt-title').value; m.when = body.querySelector('#mt-when').value;
          m.agenda = body.querySelector('#mt-agenda').value; m.notes = body.querySelector('#mt-notes').value;
          saveData(); draw(); MH.toast('Meeting saved.');
        };
        body.querySelector('#mt-del').onclick = () => { if (confirmBox('Delete this meeting?')) { userData.meetings = userData.meetings.filter((x) => x.id !== m.id); sel = null; saveData(); draw(); } };
      }
    }
    body.querySelector('#mt-new').onclick = () => {
      const m = { id: MH.uid(), title: 'New meeting', when: new Date(Date.now() + 36e5).toISOString().slice(0, 16), agenda: '', notes: '' };
      userData.meetings.push(m); sel = m.id; saveData(); draw();
    };
    draw();
  },
});
