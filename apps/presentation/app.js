/* proton app module: presentation — edit this file to change this app.
 * Loaded by index.html; calls registerApp() (see apps/README.md). */
'use strict';

/* ============================ PRESENTATION ============================ */
registerApp({
  id: 'presentation', name: 'Presentation', icon: 'presentation', cat: 'Create', desc: 'Slides with a present mode, saved per account', w: 920, h: 580,
  render(body) {
    let idx = 0, presenting = false;
    body.innerHTML = `${bar('Presentation', `<button class="btn sm primary" id="p-new">+ Slide</button><button class="btn sm" id="p-del">Delete slide</button><button class="btn sm" id="p-present">${iconSvg('play')} Present</button>`)}
    <div class="split"><aside class="side" id="p-list"></aside><div id="p-stage" style="display:flex;flex-direction:column;min-height:0"></div></div>`;
    const stage = body.querySelector('#p-stage');
    function draw() {
      idx = Math.max(0, Math.min(idx, userData.slides.length - 1));
      body.querySelector('#p-list').innerHTML = userData.slides.map((s, i) => `
        <button class="rowitem ${i === idx ? 'sel' : ''}" data-i="${i}"><span><b>${i + 1}. ${MH.esc(s.title || 'Untitled')}</b><br><span class="muted">${MH.esc(s.body.split('\n')[0].slice(0, 44))}</span></span></button>`).join('') || '<div class="pad muted">No slides.</div>';
      body.querySelectorAll('#p-list [data-i]').forEach((b) => b.onclick = () => { idx = +b.dataset.i; draw(); });
      const s = userData.slides[idx];
      if (presenting && s) {
        stage.innerHTML = `<div class="present-stage"><h1>${MH.esc(s.title)}</h1><p style="white-space:pre-wrap;font-size:18px;line-height:1.6">${MH.esc(s.body)}</p>
        <div><button class="btn" id="pp-prev">${iconSvg('chevron-left')} Prev</button> <span style="opacity:.7">${idx + 1} / ${userData.slides.length}</span> <button class="btn" id="pp-next">Next ${iconSvg('chevron-right')}</button> <button class="btn" id="pp-exit">Exit (Esc)</button></div></div>`;
        stage.querySelector('#pp-prev').onclick = () => { idx--; draw(); };
        stage.querySelector('#pp-next').onclick = () => { idx++; draw(); };
        stage.querySelector('#pp-exit').onclick = () => { presenting = false; draw(); };
        stage.querySelector('.present-stage').tabIndex = 0; stage.querySelector('.present-stage').focus();
        stage.querySelector('.present-stage').onkeydown = (e) => { if (e.key === 'ArrowRight') { idx++; draw(); } if (e.key === 'ArrowLeft') { idx--; draw(); } if (e.key === 'Escape') { presenting = false; draw(); } };
      } else {
        stage.innerHTML = s ? `<div class="app-main pad">
          <div class="field"><label>Slide title</label><input id="p-title" style="width:100%;padding:9px;font-size:19px;font-weight:700" value="${MH.esc(s.title)}"></div>
          <div class="field"><label>Body</label><textarea id="p-body" rows="9">${MH.esc(s.body)}</textarea></div>
          <div class="card" style="text-align:center;padding:26px"><h2 style="margin:0 0 8px">${MH.esc(s.title || 'Untitled')}</h2><p style="white-space:pre-wrap">${MH.esc(s.body)}</p></div></div>`
          : '<div class="pad muted">Add a slide to begin.</div>';
        if (s) {
          stage.querySelector('#p-title').addEventListener('input', (e) => { s.title = e.target.value; saveData(); body.querySelectorAll('#p-list .rowitem')[idx].querySelector('b').textContent = `${idx + 1}. ${s.title}`; stage.querySelector('.card h2').textContent = s.title; });
          stage.querySelector('#p-body').addEventListener('input', (e) => { s.body = e.target.value; saveData(); stage.querySelector('.card p').textContent = s.body; });
        }
      }
    }
    body.querySelector('#p-new').onclick = () => { userData.slides.splice(idx + 1, 0, { id: MH.uid(), title: 'New slide', body: '' }); idx++; saveData(); draw(); };
    body.querySelector('#p-del').onclick = () => { if (userData.slides.length && confirmBox('Delete this slide?')) { userData.slides.splice(idx, 1); saveData(); draw(); } };
    body.querySelector('#p-present').onclick = () => { presenting = true; draw(); };
    draw();
  },
});
