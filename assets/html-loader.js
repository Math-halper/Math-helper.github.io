/* proton — HTML module loader.
 *
 * Apps and built-in websites are HTML files:
 *   apps/<name>/app.html       contains a <script data-proton-app> block
 *                              that calls registerApp({...}) — just the
 *                              render() code; metadata (name, icon, cat,
 *                              desc, window size) comes from the catalog.
 *   websites/<name>/site.html  is a standalone HTML page, described by a
 *                              <script type="application/json" data-proton-site>
 *                              metadata block in its <head>.
 *
 * The app catalog lives in ONE file: data/applications.js (INI-style
 * [application] blocks with id, name, path, icon, cat, desc, w, h).
 * assets/config-loader.js parses it into window.PROTON_APPLICATIONS, and
 * loadHtmlModules() (called at boot by assets/boot.js) fetches each entry's
 * path, then:
 *   - hands the catalog entry to registerApp() (see assets/core.js), so the
 *     catalog is the single source of truth for app metadata, and
 *   - executes each app's registration script in catalog order (the catalog
 *     order is the proton menu order), and
 *   - registers each website's metadata + page URL in the SITES registry,
 *     so the Browser app can load the page in a frame at proton://<id>.
 * Built-in websites are still listed with <link rel="proton-site"> tags in
 * index.html.
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
  const siteLinks = [...document.querySelectorAll('link[rel="proton-site"]')];

  /* Fetch everything in parallel, but execute/register in catalog order. */
  const [appTexts, siteTexts] = await Promise.all([
    Promise.all(appEntries.map((e) => fetchText(e.path))),
    Promise.all(siteLinks.map((l) => fetchText(l.getAttribute('href')))),
  ]);

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

  siteTexts.forEach((text, i) => {
    const href = siteLinks[i].getAttribute('href');
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const metaEl = doc.querySelector('script[data-proton-site]');
    if (!metaEl) throw new Error(href + ' has no <script data-proton-site> metadata');
    const meta = JSON.parse(metaEl.textContent);
    if (!meta.id) throw new Error(href + ' site metadata has no id');
    registerSite({ ...meta, page: new URL(href, document.baseURI).href });
  });
}
