/* proton app module: calendar — edit this file to change this app.
 * Loaded by index.html; calls registerApp() (see apps/README.md). */
'use strict';

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
