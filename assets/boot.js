/* proton boot — loaded last. Fetches the HTML app/website modules
 * (assets/html-loader.js), then starts the auth/desktop flow.
 *
 * The Math Helper cover page is the first thing a fresh visit sees. Its
 * practice controls are intentionally unavailable; only the button at the
 * bottom enters proton. A page refresh skips the cover and goes straight
 * to sign-in, so the account password must be entered again. */
'use strict';

let protonModulesReady = false;
let protonLoadError = null;
let protonEntryRequested = false;

function isPageReload() {
  try {
    const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    if (nav) return nav.type === 'reload';
  } catch (err) { /* fall through to the legacy API */ }
  return !!(window.performance && performance.navigation && performance.navigation.type === 1);
}

function setCoverStatus(message) {
  const el = MH.$('cover-status');
  if (el) el.textContent = message;
}

function coverUnavailable() {
  setCoverStatus('That part of Math Helper is unavailable right now. Practice could not be loaded (error MH-503).');
}

function enterProton() {
  if (!protonModulesReady) {
    protonEntryRequested = true;
    setCoverStatus(protonLoadError
      ? 'The Math Helper workspace could not be loaded. It must be served over HTTP — try GitHub Pages or a local web server, not a file:// tab.'
      : 'The Math Helper workspace is still loading — one moment…');
    return;
  }
  const cover = MH.$('cover');
  if (cover) cover.remove();
  route();
}

function initCover() {
  const cover = MH.$('cover');
  if (!cover) return;
  if (isPageReload()) { cover.remove(); return; }
  cover.querySelectorAll('.cover-broken').forEach((el) => el.addEventListener('click', coverUnavailable));
  const search = MH.$('cover-search');
  if (search) search.addEventListener('submit', (e) => { e.preventDefault(); coverUnavailable(); });
  const enter = MH.$('cover-enter');
  if (enter) enter.addEventListener('click', enterProton);
}
initCover();

async function protonBoot() {
  const bootEl = MH.$('boot');
  const reload = isPageReload();
  try {
    await loadHtmlModules();
  } catch (err) {
    console.error(err);
    protonLoadError = err;
    if (MH.$('cover')) {
      if (bootEl) bootEl.remove();
      setCoverStatus('The Math Helper workspace could not be loaded. It must be served over HTTP — try GitHub Pages or a local web server, not a file:// tab.');
    } else {
      const sub = document.querySelector('.boot-sub');
      if (sub) {
        sub.innerHTML = 'Could not load the app files.<br>proton must be served over HTTP — ' +
          'try <span class="kbd">python3 -m http.server</span> or GitHub Pages, not a file:// tab.<br>' +
          '<span style="opacity:.75">' + MH.esc(err.message) + '</span>';
      }
    }
    return; // leave whichever front page is visible up with the explanation
  }
  protonModulesReady = true;
  if (!reload) {
    // Fresh visit: stay on the cover. Remove the splash behind it so it
    // cannot flash when the cover is dismissed.
    if (bootEl) bootEl.remove();
    if (protonEntryRequested) enterProton();
    return;
  }
  setTimeout(() => {
    bootEl.classList.add('hide');
    setTimeout(() => bootEl.remove(), 450);
    route();
  }, 400);
}
/* With many module files the DOM may already be parsed by the time this
 * file runs, so handle both cases. */
if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', protonBoot);
else protonBoot();
