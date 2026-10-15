/* proton — HTML module loader.
 *
 * Apps and built-in websites are HTML files:
 *   apps/<name>/app.html       contains a <script data-proton-app> block
 *                              that calls registerApp({...}) — just the
 *                              render() code; metadata (name, icon, cat,
 *                              desc, window size) comes from the catalog.
 *   websites/<name>/site.html  is a standalone HTML page the Browser app
 *                              loads in a frame at proton://<id>.
 *
 * Apps and websites use the SAME catalog system — one INI-style file each:
 *   data/applications.js  [application] blocks: id, name, path, icon, cat,
 *                         desc, w, h
 *   data/websites.js      [website] blocks: id, name, path, icon, desc
 * assets/config-loader.js parses them into window.PROTON_APPLICATIONS and
 * window.PROTON_WEBSITES, and loadHtmlModules() (called at boot by
 * assets/boot.js) then:
 *   - fetches each app's file and executes its registration script in
 *     catalog order (the catalog order is the proton menu order), handing
 *     the catalog entry to registerApp() (see assets/core.js), so the
 *     catalog is the single source of truth for app metadata, and
 *   - registers each website's catalog entry + page URL in the SITES
 *     registry, so the Browser app can load the page in a frame at
 *     proton://<id> (site pages are fetched lazily by the frame itself —
 *     nothing to download at boot).
 *
 * Because the modules are loaded over HTTP, proton must be served over HTTP(S) — GitHub
 * Pages or a local server such as `python3 -m http.server`. Opening
 * index.html straight from the file system will not load the modules.
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

async function loadHtmlModules() {
  const appEntries = Array.isArray(window.PROTON_APPLICATIONS) ? window.PROTON_APPLICATIONS : [];
  if (!appEntries.length) {
    throw new Error('Application catalog is empty — add [application] blocks to data/applications.js');
  }
  const siteEntries = Array.isArray(window.PROTON_WEBSITES) ? window.PROTON_WEBSITES : [];

  /* Fetch all app modules in parallel, but execute/register in catalog order. */
  const appTexts = await Promise.all(appEntries.map((e) => fetchText(e.path)));

  appTexts.forEach((text, i) => {
    const entry = appEntries[i];
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const src = doc.querySelector('script[data-proton-app]');
    if (!src) throw new Error(entry.path + ' has no <script data-proton-app> block');
    window.__protonPendingApp = entry; // catalog metadata; merged by registerApp()
    try {
      const el = document.createElement('script');
      el.textContent = src.textContent;
      el.dataset.protonFrom = entry.path;
      document.body.appendChild(el);
      el.remove();
    } finally {
      window.__protonPendingApp = null;
    }
    if (!APPS[entry.id]) throw new Error(entry.path + ' did not register app id "' + entry.id + '"');
  });

  /* Websites need no boot-time fetch: the catalog entry IS the metadata,
   * and the Browser's frame loads the page itself when it is visited. */
  siteEntries.forEach((entry) => {
    registerSite({
      id: entry.id, name: entry.name, icon: entry.icon, desc: entry.desc,
      page: new URL(entry.path, document.baseURI).href,
    });
  });
}
