/* proton app module: app-center — edit this file to change this app.
 * Loaded by index.html; calls registerApp() (see apps/README.md). */
'use strict';

/* ============================ APP CENTER ============================ */
registerApp({
  id: 'appcenter', name: 'App Center', icon: 'grid', cat: 'System', desc: 'Add & remove apps and websites, like Mixt', w: 980, h: 640,
  render(body) {
    normalizeUserData();
    body.innerHTML = `${bar('App Center', `<input type="search" id="ac-q" placeholder="Search apps & websites">`)}
    <div class="app-main pad">
    <div class="grid-cards" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr));margin-bottom:16px">
      <div class="card"><h3 style="margin-top:0">Add an app</h3>
        <form id="ac-app-form">
          <div class="field"><label>App name</label><input id="ac-app-name" required maxlength="40" placeholder="e.g. Desmos Graphing"></div>
          <div class="field"><label>Web address it opens</label><input id="ac-app-url" required placeholder="e.g. desmos.com/calculator" inputmode="url"></div>
          <div class="auth-row" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div class="field"><label>Icon</label><select id="ac-app-icon">${iconOptions('grid')}</select></div>
            <div class="field"><label>Description (optional)</label><input id="ac-app-desc" maxlength="90" placeholder="What is it for?"></div>
          </div>
          <button class="btn primary" type="submit">Add app</button>
          <p class="muted">It appears in the proton menu, under <b>My Apps</b>, can be pinned to the panel, and opens in its own window. (Some sites refuse to be embedded — those get an “Open in new tab” button.)</p>
        </form></div>
      <div class="card"><h3 style="margin-top:0">Add a website</h3>
        <form id="ac-site-form">
          <div class="field"><label>Site name</label><input id="ac-site-name" required maxlength="50" placeholder="e.g. BBC Bitesize"></div>
          <div class="field"><label>Address</label><input id="ac-site-url" required placeholder="e.g. bbc.co.uk/bitesize" inputmode="url"></div>
          <div class="field"><label>Icon</label><select id="ac-site-icon">${iconOptions('globe')}</select></div>
          <button class="btn primary" type="submit">Add website</button>
          <p class="muted">Websites are bookmarks with superpowers: open them in the Browser, or turn them into apps. Manage them all in the <b>Websites</b> app.</p>
        </form>
        <button class="btn" id="ac-open-websites">${iconSvg('globe')} Open Websites app</button></div>
    </div>

    <h3>${iconSvg('grid')} Your apps <span class="muted" id="ac-custom-count"></span></h3>
    <div class="grid-cards" id="ac-custom"></div>
    <h3>${iconSvg('globe')} Your websites <span class="muted" id="ac-sites-count"></span></h3>
    <div class="grid-cards" id="ac-sites"></div>
    <h3>${iconSvg('layers')} All apps</h3>
    <div class="grid-cards" id="ac-grid"></div></div>`;

    const PROTECTED = ['appcenter', 'settings']; // removing these would lock you out of managing apps
    function draw() {
      const q = body.querySelector('#ac-q').value.trim().toLowerCase();
      const match = (a) => !q || (a.name + ' ' + (a.desc || '') + ' ' + (a.url || '')).toLowerCase().includes(q);

      body.querySelector('#ac-custom-count').textContent = `(${userData.customApps.length})`;
      body.querySelector('#ac-custom').innerHTML = userData.customApps.filter(match).length ? userData.customApps.filter(match).map((a) => `
        <div class="card"><div class="card-ic" style="font-size:30px">${iconFor(a.icon, 'grid')}</div><h3 style="margin:7px 0 3px">${MH.esc(a.name)}</h3>
        <p class="muted site-url" style="min-height:34px">${MH.esc(a.desc || a.url)}</p><span class="chip">My Apps</span>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:11px"><button class="btn sm primary" data-copen="${a.id}">Open</button>
        <button class="btn sm" data-cpin="${a.id}">${(userData.settings.pinned || []).includes(a.id) ? 'Unpin' : iconSvg('pin') + ' Pin'}</button>
        <button class="btn sm" data-cedit="${a.id}">Edit</button>
        <button class="btn sm" data-cdel="${a.id}">Remove</button></div></div>`).join('')
        : '<p class="muted">No custom apps yet — add one with the form above and it lands in the proton menu, under My Apps.</p>';
      body.querySelectorAll('[data-copen]').forEach((b) => b.onclick = () => openApp(b.dataset.copen));
      body.querySelectorAll('[data-cpin]').forEach((b) => b.onclick = () => {
        const id = b.dataset.cpin, p = userData.settings.pinned;
        userData.settings.pinned = p.includes(id) ? p.filter((x) => x !== id) : [...p, id];
        saveData(); renderPanelApps(); draw();
      });
      body.querySelectorAll('[data-cedit]').forEach((b) => b.onclick = () => {
        const a = userData.customApps.find((x) => x.id === b.dataset.cedit); if (!a) return;
        const name = prompt('App name:', a.name); if (name === null) return;
        const url = normalizeUrl(prompt('Web address:', a.url) ?? '');
        if (!url) { MH.toast('That address does not look valid.'); return; }
        const icon = prompt('Icon name (folder, globe, star, dice, music...):', iconNameFrom(a.icon, 'grid'));
        a.name = name.trim() || a.name; a.url = url; if (icon) a.icon = iconNameFrom(icon, 'grid');
        syncCustomApps(); saveData(); refreshChrome(); draw(); MH.toast('App updated.');
      });
      body.querySelectorAll('[data-cdel]').forEach((b) => b.onclick = () => {
        const a = userData.customApps.find((x) => x.id === b.dataset.cdel);
        if (!a || !confirmBox(`Remove the app “${a.name}”? This deletes it from this account.`)) return;
        closeWin(a.id);
        userData.customApps = userData.customApps.filter((x) => x.id !== a.id);
        userData.settings.pinned = (userData.settings.pinned || []).filter((x) => x !== a.id);
        syncCustomApps(); saveData(); refreshChrome(); draw(); MH.toast(`App “${a.name}” removed.`);
      });

      body.querySelector('#ac-sites-count').textContent = `(${userData.websites.length})`;
      body.querySelector('#ac-sites').innerHTML = userData.websites.filter(match).length ? userData.websites.filter(match).map((s) => `
        <div class="card"><div class="card-ic" style="font-size:30px">${iconFor(s.icon, 'globe')}</div><h3 style="margin:7px 0 3px">${MH.esc(s.name)}</h3>
        <p class="muted site-url" style="min-height:34px">${MH.esc(s.url)}</p><span class="chip">Website</span>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:11px"><button class="btn sm primary" data-sopen="${s.id}">Open</button>
        <button class="btn sm" data-sapp="${s.id}">${iconSvg('plus')} App</button>
        <button class="btn sm" data-sdel="${s.id}">Remove</button></div></div>`).join('')
        : '<p class="muted">No websites yet — add one above.</p>';
      body.querySelectorAll('[data-sopen]').forEach((b) => b.onclick = () => { const s = userData.websites.find((x) => x.id === b.dataset.sopen); if (s) openWebsite(s); });
      body.querySelectorAll('[data-sapp]').forEach((b) => b.onclick = () => { const s = userData.websites.find((x) => x.id === b.dataset.sapp); if (s) { websiteAsApp(s); draw(); } });
      body.querySelectorAll('[data-sdel]').forEach((b) => b.onclick = () => {
        const s = userData.websites.find((x) => x.id === b.dataset.sdel);
        if (s && confirmBox(`Remove the website “${s.name}”?`)) { userData.websites = userData.websites.filter((x) => x.id !== s.id); saveData(); draw(); }
      });

      body.querySelector('#ac-grid').innerHTML = Object.values(APPS)
        .filter((a) => a.id !== 'appcenter' && !dynamicAppIds.has(a.id) && match(a))
        .map((a) => {
          const pinned = (userData.settings.pinned || []).includes(a.id);
          const removed = (userData.hiddenApps || []).includes(a.id);
          let buttons;
          if (removed) buttons = `<button class="btn sm primary" data-restore="${a.id}">${iconSvg('plus')} Add back</button>`;
          else {
            buttons = `<button class="btn sm primary" data-open="${a.id}">Open</button><button class="btn sm" data-pin="${a.id}">${pinned ? 'Unpin' : iconSvg('pin') + ' Pin'}</button>`;
            buttons += PROTECTED.includes(a.id)
              ? '<span class="muted" title="This one keeps the desktop manageable">Built-in</span>'
              : `<button class="btn sm" data-remove="${a.id}">Remove</button>`;
          }
          return `<div class="card" ${removed ? 'style="opacity:.62"' : ''}><div class="card-ic" style="font-size:30px">${iconFor(a.icon)}</div><h3 style="margin:7px 0 3px">${MH.esc(a.name)}</h3>
          <p class="muted" style="min-height:34px">${MH.esc(a.desc)}</p><span class="chip">${a.cat}</span>${removed ? ' <span class="chip" style="background:#f8d7d4;color:#8c2b24">Removed</span>' : ''}
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:11px">${buttons}</div></div>`;
        }).join('');
      body.querySelectorAll('[data-open]').forEach((b) => b.onclick = () => openApp(b.dataset.open));
      body.querySelectorAll('[data-pin]').forEach((b) => b.onclick = () => {
        const id = b.dataset.pin, p = userData.settings.pinned;
        userData.settings.pinned = p.includes(id) ? p.filter((x) => x !== id) : [...p, id];
        saveData(); renderPanelApps(); draw();
      });
      body.querySelectorAll('[data-remove]').forEach((b) => b.onclick = () => {
        const a = APPS[b.dataset.remove];
        if (!a || !confirmBox(`Remove “${a.name}” from the proton menu? You can add it back here any time.`)) return;
        closeWin(a.id);
        userData.hiddenApps.push(a.id);
        userData.settings.pinned = (userData.settings.pinned || []).filter((x) => x !== a.id);
        saveData(); refreshChrome(); draw(); MH.toast(`“${a.name}” removed — find it here to add it back.`);
      });
      body.querySelectorAll('[data-restore]').forEach((b) => b.onclick = () => {
        userData.hiddenApps = userData.hiddenApps.filter((x) => x !== b.dataset.restore);
        saveData(); refreshChrome(); draw(); MH.toast('App added back to the proton menu.');
      });
    }

    body.querySelector('#ac-app-form').onsubmit = (e) => {
      e.preventDefault();
      const url = normalizeUrl(body.querySelector('#ac-app-url').value);
      if (!url) { MH.toast('Please enter a valid address, e.g. example.com'); return; }
      const def = { id: 'custom-' + MH.uid(), name: body.querySelector('#ac-app-name').value.trim(), icon: body.querySelector('#ac-app-icon').value.trim() || 'grid', desc: body.querySelector('#ac-app-desc').value.trim(), url };
      userData.customApps.push(def);
      syncCustomApps(); saveData(); refreshChrome();
      e.target.reset(); body.querySelector('#ac-app-icon').value = 'grid';
      draw(); MH.toast(`App “${def.name}” added to My Apps in the proton menu. Opening it...`);
      openApp(def.id);
    };
    body.querySelector('#ac-site-form').onsubmit = (e) => {
      e.preventDefault();
      const url = normalizeUrl(body.querySelector('#ac-site-url').value);
      if (!url) { MH.toast('Please enter a valid address, e.g. example.com'); return; }
      userData.websites.push({ id: 'site-' + MH.uid(), name: body.querySelector('#ac-site-name').value.trim(), icon: body.querySelector('#ac-site-icon').value.trim() || 'globe', url });
      saveData(); e.target.reset(); body.querySelector('#ac-site-icon').value = 'globe';
      draw(); MH.toast('Website added.');
    };
    body.querySelector('#ac-open-websites').onclick = () => openApp('websites');
    body.querySelector('#ac-q').addEventListener('input', draw);
    draw();
  },
});
