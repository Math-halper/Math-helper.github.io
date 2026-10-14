/* proton — HTML module loader.
 *
 * Apps and built-in websites are HTML files:
 *   apps/<name>/app.html       contains a <script data-proton-app> block
 *                              that calls registerApp({...}) as before.
 *   websites/<name>/site.html  is a standalone HTML page, described by a
 *                              <script type="application/json" data-proton-site>
 *                              metadata block in its <head>.
 *
 * index.html lists them with <link rel="proton-app"> / <link rel="proton-site">
 * tags. At boot (assets/boot.js) loadHtmlModules() fetches each file, then:
 *   - executes each app's registration script in order (same order as the
 *     <link> tags, which is the proton menu order), and
 *   - registers each website's metadata + page URL in the SITES registry,
 *     so the Browser app can load the page in a frame at proton://<id>.
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
  const appLinks = [...document.querySelectorAll('link[rel="proton-app"]')];
  const siteLinks = [...document.querySelectorAll('link[rel="proton-site"]')];

  /* Fetch everything in parallel, but execute/register in <link> order. */
  const [appTexts, siteTexts] = await Promise.all([
    Promise.all(appLinks.map((l) => fetchText(l.getAttribute('href')))),
    Promise.all(siteLinks.map((l) => fetchText(l.getAttribute('href')))),
  ]);

  appTexts.forEach((text, i) => {
    const href = appLinks[i].getAttribute('href');
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const src = doc.querySelector('script[data-proton-app]');
    if (!src) throw new Error(href + ' has no <script data-proton-app> block');
    const el = document.createElement('script');
    el.textContent = src.textContent;
    el.dataset.protonFrom = href;
    document.body.appendChild(el);
    el.remove();
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
