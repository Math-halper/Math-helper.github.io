/* proton app module: browser — edit this file to change this app.
 * Loaded by index.html; calls registerApp() (see apps/README.md).
 *
 * The Browser renders BUILT-IN WEBSITES from the SITES registry. Every
 * built-in site lives in its own folder: websites/<name>/site.js.
 * Add a site there + one <script> line in index.html and it shows up
 * here automatically. The user's own saved websites live in userData
 * and are managed by apps/websites + apps/app-center.
 */
'use strict';

registerApp({
  id: 'browser', name: 'Browser', icon: '🌐', cat: 'Learn', desc: 'Built-in websites (each in websites/<name>/) + your saved sites', w: 940, h: 600,
  render(body) {
    body.innerHTML = `${bar('Browser', `<button class="btn sm" id="b-home">⌂ Home</button><button class="btn sm" id="b-websites">🌍 Websites</button><select id="b-sites-menu" title="Built-in websites"><option value="">Built-in websites…</option>${Object.values(SITES).map((s) => `<option value="${s.id}">${s.icon} ${MH.esc(s.name)}</option>`).join('')}</select>`)}
    <div class="appbar" style="background:#111"><span>🔒</span><input id="b-url" type="text" value="proton://home" style="flex:1;padding:7px 10px"><button class="btn sm primary" id="b-go">Go</button></div>
    <div class="app-main" id="b-main"></div>`;
    const main = body.querySelector('#b-main');
    const ctx = { openApp, loadExternal, showHome: () => showHome(), showSite };

    function showHome() {
      body.querySelector('#b-url').value = 'proton://home';
      normalizeUserData();
      main.innerHTML = `<div class="pad"><h2>Welcome to the (tiny) proton web 🌐</h2>
      <p class="muted">This static site has no server, so the Browser ships with built-in websites — each one is a separate file in <span class="kbd">websites/&lt;name&gt;/site.js</span>, like the original project's bundled sites in <span class="kbd">internet/</span>. Real websites can be opened from the address bar too, though many refuse to be embedded.</p>
      <h3>📚 Built-in websites</h3><div class="grid-cards">
      ${Object.values(SITES).map((s) => `<div class="card"><div style="font-size:24px">${s.icon}</div><h3 style="margin:5px 0 3px">${MH.esc(s.name)}</h3><p class="muted">${MH.esc(s.desc || '')}</p><button class="btn primary" data-site="${s.id}">Visit</button></div>`).join('')}
      </div>
      <h3 style="margin-top:20px">🌍 Your websites</h3><div class="grid-cards" id="b-sites"></div>
      <div class="card" style="margin-top:12px"><b>＋ Add a website</b>
        <form id="b-site-form" class="add-form" style="margin-top:8px">
          <div class="field"><label>Site name</label><input id="b-site-name" required maxlength="50" placeholder="e.g. Wikipedia"></div>
          <div class="field"><label>Address</label><input id="b-site-url" required placeholder="e.g. wikipedia.org" inputmode="url"></div>
          <button class="btn primary" type="submit">Add website</button>
        </form></div></div>`;
      main.querySelectorAll('[data-site]').forEach((b) => b.onclick = () => showSite(b.dataset.site));
      const sitesBox = main.querySelector('#b-sites');
      sitesBox.innerHTML = userData.websites.length ? userData.websites.map((s) => `
        <div class="card"><div style="font-size:24px">${MH.esc(s.icon || '🌐')}</div><h3 style="margin:5px 0 3px">${MH.esc(s.name)}</h3>
        <p class="muted site-url">${MH.esc(s.url)}</p><button class="btn sm primary" data-open="${s.id}">Open</button>
        <button class="btn sm" data-del="${s.id}">Remove</button></div>`).join('')
        : '<p class="muted">No websites saved yet — add one below, in the Websites app, or in App Center.</p>';
      sitesBox.querySelectorAll('[data-open]').forEach((b) => b.onclick = () => { const s = userData.websites.find((x) => x.id === b.dataset.open); if (s) loadExternal(s.url); });
      sitesBox.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => {
        userData.websites = userData.websites.filter((x) => x.id !== b.dataset.del); saveData(); showHome();
      });
      main.querySelector('#b-site-form').onsubmit = (e) => {
        e.preventDefault();
        const url = normalizeUrl(main.querySelector('#b-site-url').value);
        if (!url) { MH.toast('Please enter a valid address, e.g. example.com'); return; }
        userData.websites.push({ id: 'site-' + MH.uid(), name: main.querySelector('#b-site-name').value.trim(), icon: '🌐', url });
        saveData(); showHome(); MH.toast('Website added.');
      };
    }
    function showSite(id) {
      const site = SITES[id];
      if (!site) { showHome(); return; }
      body.querySelector('#b-url').value = 'proton://' + id;
      main.innerHTML = '';
      try { site.render(main, ctx); }
      catch (err) { main.innerHTML = `<div class="pad"><h3>⚠️ ${MH.esc(site.name)} hit a snag</h3><p class="muted">${MH.esc(err.message)}</p></div>`; console.error(err); }
    }
    function loadExternal(url) {
      body.querySelector('#b-url').value = url;
      main.innerHTML = `<div style="display:flex;flex-direction:column;height:100%"><div class="pad muted" style="padding-bottom:6px">Loading <b>${MH.esc(url)}</b> — if it stays blank, that site refuses embedding. <a href="${MH.esc(url)}" target="_blank" rel="noopener">Open in a new tab ↗</a></div><iframe src="${MH.esc(url)}" style="flex:1;border:0;width:100%" title="Web page"></iframe></div>`;
    }
    function go() {
      const raw = body.querySelector('#b-url').value.trim();
      if (raw === 'proton://home' || raw === 'home') { showHome(); return; }
      const id = raw.replace(/^proton:\/\//i, '').split(/[/?#]/)[0].toLowerCase();
      if (SITES[id]) { showSite(id); return; }
      loadExternal(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw);
    }
    body.querySelector('#b-home').onclick = showHome;
    body.querySelector('#b-go').onclick = go;
    body.querySelector('#b-websites').onclick = () => openApp('websites');
    body.querySelector('#b-sites-menu').onchange = (e) => { if (e.target.value) showSite(e.target.value); e.target.value = ''; };
    body.querySelector('#b-url').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    if (pendingBrowserURL) { const u = pendingBrowserURL; pendingBrowserURL = ''; loadExternal(u); }
    else showHome();
  },
});
