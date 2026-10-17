/* proton — HTML module loader.
 *
 * Each app is an apps/inbuilt/<name>/app.html containing a
 * <script data-proton-app> registration block (the Celeste Classic wrapper is
 * the one app outside that folder: apps/celeste-classic/app.html). Metadata
 * lives in data/applications.js, where every app's path is listed; built-in
 * sites are standalone websites/<name>/site.html pages. Nothing needs a build
 * step — the loader only ever fetches the catalog's own paths.
 *
 * Local desktop apps load at boot. A streamed app (streamed=true in the
 * catalog) instead gets a lightweight registered placeholder that fetches
 * its tiny app.html only when it is launched — the way the 87 arcade games
 * this site used to ship were kept out of the boot path. Nothing in the
 * catalog is streamed right now; the loader still supports it.
 */
'use strict';

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300)
      ? resolve(xhr.responseText)
      : reject(new Error(url + ' returned HTTP ' + xhr.status));
    xhr.onerror = () => reject(new Error('Could not load ' + url));
    xhr.send();
  });
}

function executeAppModule(entry, text) {
  const doc = new DOMParser().parseFromString(text, 'text/html');
  const src = doc.querySelector('script[data-proton-app]');
  if (!src) throw new Error(entry.path + ' has no <script data-proton-app> block');
  const before = APPS[entry.id];
  window.__protonPendingApp = entry; // catalog metadata wins in registerApp()
  try {
    const el = document.createElement('script');
    el.textContent = src.textContent;
    el.dataset.protonFrom = entry.path;
    document.body.appendChild(el);
    el.remove();
  } finally {
    window.__protonPendingApp = null;
  }
  if (!APPS[entry.id] || APPS[entry.id] === before) {
    throw new Error(entry.path + ' did not register app id "' + entry.id + '"');
  }
}

function registerLazyGame(entry) {
  let pending = null;
  function render(body, ctx) {
    body.innerHTML = `<div class="pad muted">${iconSvg('refresh')} Opening ${MH.esc(entry.name)}…</div>`;
    if (!pending) pending = fetchText(entry.path).then((text) => {
      executeAppModule(entry, text);
      if (userData) applyModuleOverrides(); // restore this account's name/icon edits
      return APPS[entry.id];
    }).catch((err) => { pending = null; throw err; });
    pending.then((app) => {
      if (wins.get(entry.id)?.body !== body) return; // closed while downloading
      try { app.render(body, ctx); }
      catch (err) {
        console.error(err);
        body.innerHTML = `<div class="pad"><h3>${iconSvg('alert')} Could not open ${MH.esc(app.name)}</h3><p class="muted">${MH.esc(err.message)}</p></div>`;
      }
    }).catch((err) => {
      if (wins.get(entry.id)?.body !== body) return;
      body.innerHTML = `<div class="pad"><h3>${iconSvg('alert')} Could not load ${MH.esc(entry.name)}</h3><p class="muted">${MH.esc(err.message)}</p><button class="btn" id="game-retry">Retry</button></div>`;
      body.querySelector('#game-retry').onclick = () => render(body, ctx);
    });
  }
  window.__protonPendingApp = entry;
  try { registerApp({ render }); }
  finally { window.__protonPendingApp = null; }
}

async function loadHtmlModules() {
  const appEntries = Array.isArray(window.PROTON_APPLICATIONS) ? window.PROTON_APPLICATIONS : [];
  if (!appEntries.length) throw new Error('Application catalog is empty — add [application] blocks to data/applications.js');
  const siteEntries = Array.isArray(window.PROTON_WEBSITES) ? window.PROTON_WEBSITES : [];

  /* Fetch local apps in parallel, then register everything in catalog order. */
  const eager = appEntries.filter((e) => e.streamed !== 'true');
  const texts = await Promise.all(eager.map((e) => fetchText(e.path)));
  const byId = new Map(eager.map((e, i) => [e.id, texts[i]]));
  for (const entry of appEntries) {
    if (entry.streamed === 'true') registerLazyGame(entry);
    else executeAppModule(entry, byId.get(entry.id));
  }

  /* Site pages are loaded by the Browser frame only when visited. */
  siteEntries.forEach((entry) => registerSite({
    id: entry.id, name: entry.name, icon: entry.icon, svgIcon: entry.svgIcon, desc: entry.desc,
    page: new URL(entry.path, document.baseURI).href,
  }));
}
