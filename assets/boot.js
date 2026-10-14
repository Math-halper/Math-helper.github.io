/* proton boot — loaded last. Fetches the HTML app/website modules
 * (assets/html-loader.js), then starts the auth/desktop flow. */
'use strict';

async function protonBoot() {
  const bootEl = MH.$('boot');
  try {
    await loadHtmlModules();
  } catch (err) {
    console.error(err);
    const sub = document.querySelector('.boot-sub');
    if (sub) {
      sub.innerHTML = 'Could not load the app files.<br>proton must be served over HTTP — ' +
        'try <span class="kbd">python3 -m http.server</span> or GitHub Pages, not a file:// tab.<br>' +
        '<span style="opacity:.75">' + MH.esc(err.message) + '</span>';
    }
    return; // leave the splash up with the explanation
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
