/* proton app module: media — edit this file to change this app.
 * Loaded by index.html; calls registerApp() (see apps/README.md). */
'use strict';

/* ============================ MEDIA ============================ */
/* Ported behaviour of the original Media app: MP4/MP3 playlist with
 * shuffle/repeat — files are played from your computer, never uploaded. */
registerApp({
  id: 'media', name: 'Media', icon: 'film', cat: 'Chat & Media', desc: 'Play MP4 video & MP3 audio from this computer', w: 900, h: 580,
  render(body) {
    let items = [], cur = -1, shuffle = false, repeat = 0;
    body.innerHTML = `${bar('Media', `<label class="btn sm primary" style="margin:0">+ Open MP4 / MP3<input id="md-file" type="file" accept=".mp4,.mp3,audio/mpeg,video/mp4" multiple hidden></label><button class="btn sm" id="md-clear">Clear playlist</button>`)}
    <div class="app-main" style="display:grid;grid-template-columns:1fr 230px;min-height:0">
      <div style="padding:14px;display:flex;flex-direction:column;gap:10px;min-width:0">
        <video id="md-video" controls style="width:100%;max-height:300px;background:#000;border-radius:8px" hidden></video>
        <audio id="md-audio" controls style="width:100%" hidden></audio>
        <div id="md-now" class="card" style="text-align:center;padding:22px"><span class="card-ic" style="font-size:34px">${iconSvg('film')}</span><br><b>No media loaded</b><br><span class="muted">Open MP4 or MP3 files — they play locally and are never uploaded. (Unlike notes &amp; files, media can't be stored in the browser, so the playlist lasts for this session.)</span></div>
        <div style="display:flex;gap:7px;justify-content:center;flex-wrap:wrap">
          <button class="btn" id="md-prev" title="Previous">${iconSvg('skip-back')}</button><button class="btn" id="md-play" title="Play / pause">${iconSvg('play')} ${iconSvg('pause')}</button><button class="btn" id="md-next" title="Next">${iconSvg('skip-forward')}</button>
          <button class="btn" id="md-shuffle" aria-pressed="false">${iconSvg('shuffle')} Shuffle</button><button class="btn" id="md-repeat">${iconSvg('repeat')} Repeat: off</button>
          <label class="muted">Speed <select id="md-speed"><option>0.5</option><option selected>1</option><option>1.5</option><option>2</option></select></label>
        </div><p class="muted" id="md-status" style="text-align:center"></p></div>
      <aside style="border-left:1px solid var(--line);background:#050505;overflow:auto"><h3 style="padding:12px 12px 4px;margin:0">Playlist</h3><div id="md-list"></div></aside></div>`;
    const video = body.querySelector('#md-video'), audio = body.querySelector('#md-audio');
    const el = () => items[cur]?.kind === 'video' ? video : audio;
    function drawList() {
      body.querySelector('#md-list').innerHTML = items.map((it, i) => `<button class="rowitem ${i === cur ? 'sel' : ''}" data-i="${i}">${it.kind === 'video' ? iconSvg('film') : iconSvg('music')} ${MH.esc(it.name)}</button>`).join('') || '<div class="pad muted">Empty playlist.</div>';
      body.querySelectorAll('#md-list [data-i]').forEach((b) => b.onclick = () => play(+b.dataset.i));
    }
    function play(i) {
      if (!items[i]) return;
      cur = i; const it = items[i];
      video.hidden = it.kind !== 'video'; audio.hidden = it.kind !== 'audio';
      const e = el(); e.src = it.url; e.playbackRate = +body.querySelector('#md-speed').value;
      e.play().catch(() => {});
      body.querySelector('#md-now').innerHTML = `<span class="card-ic" style="font-size:30px">${it.kind === 'video' ? iconSvg('film') : iconSvg('music')}</span><br><b>${MH.esc(it.name)}</b><br><span class="muted">Track ${i + 1} of ${items.length}</span>`;
      drawList();
    }
    function next(auto) {
      if (!items.length) return;
      if (auto && repeat === 2) { el().currentTime = 0; el().play(); return; }
      let n = shuffle ? Math.floor(Math.random() * items.length) : cur + 1;
      if (n >= items.length) { if (auto && repeat === 0) { body.querySelector('#md-status').textContent = 'End of playlist.'; return; } n = 0; }
      play(n);
    }
    [video, audio].forEach((e) => e.addEventListener('ended', () => next(true)));
    body.querySelector('#md-file').onchange = (e) => {
      for (const f of e.target.files) {
        const kind = f.name.toLowerCase().endsWith('.mp4') ? 'video' : f.name.toLowerCase().endsWith('.mp3') ? 'audio' : null;
        if (kind) items.push({ name: f.name, url: URL.createObjectURL(f), kind });
      }
      drawList(); if (cur < 0 && items.length) play(0);
      body.querySelector('#md-status').textContent = items.length ? `${items.length} item(s) in playlist.` : 'Only .mp4 and .mp3 are supported.';
    };
    body.querySelector('#md-play').onclick = () => { const e = el(); if (!e.src) return; e.paused ? e.play() : e.pause(); };
    body.querySelector('#md-prev').onclick = () => play(Math.max(0, cur - 1));
    body.querySelector('#md-next').onclick = () => next(false);
    body.querySelector('#md-shuffle').onclick = (e) => { shuffle = !shuffle; e.target.setAttribute('aria-pressed', shuffle); e.target.classList.toggle('primary', shuffle); };
    body.querySelector('#md-repeat').onclick = (e) => { repeat = (repeat + 1) % 3; e.currentTarget.innerHTML = iconSvg('repeat') + ' Repeat: ' + ['off', 'all', 'one'][repeat]; };
    body.querySelector('#md-speed').onchange = (e) => { if (el().src) el().playbackRate = +e.target.value; };
    body.querySelector('#md-clear').onclick = () => { items.forEach((i) => URL.revokeObjectURL(i.url)); items = []; cur = -1; video.removeAttribute('src'); audio.removeAttribute('src'); drawList(); };
    drawList();
  },
});
