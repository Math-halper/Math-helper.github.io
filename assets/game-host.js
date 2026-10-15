/* proton — streamed arcade game host.
 *
 * The twenty arcade titles in the Games category are NOT stored in this
 * repository. Each one is framed live from Proton Arcade,
 * https://proton-arcade.github.io, which publishes the same builds this
 * desktop's games library was taken from (see CREDITS.md for the provenance of
 * every title, and for what streaming does and does not mean).
 *
 * They stay remote on purpose. Those builds are single self-contained .html
 * files with their whole payload inlined — five of them are 20-56 MB, and the
 * set adds up to about half a gigabyte. Vendoring them would make every clone,
 * every GitHub Pages deploy and every version in git history carry that weight
 * forever, and GitHub refuses single files over 100 MB outright. A streamed
 * game costs this repository one small HTML module instead.
 *
 * Every game app (apps/<game>/app.html) is a thin module that calls
 * PROTON_ARCADE.open(body, ctx, {...}) with its own remote path. This file
 * builds the identical window for all of them: a toolbar carrying the source
 * address plus reload, fullscreen and an "open in a new tab" escape hatch, a
 * loading indicator (these builds are big — first load is a real download), the
 * frame itself, and a footnote that says plainly where the bytes come from.
 *
 * Nothing is proxied, cached or stored here: the player's browser talks to
 * proton-arcade.github.io directly. proton never sees the game's traffic, and
 * the game never sees proton's accounts or localStorage. If the site is
 * unreachable or a title refuses to be framed, the window says so and offers
 * the direct link rather than sitting there blank.
 *
 * Loaded by index.html after assets/core.js (it uses bar(), iconSvg() and MH)
 * and before assets/boot.js, so every game module can rely on PROTON_ARCADE
 * being defined by the time its render() runs.
 */
'use strict';

const PROTON_ARCADE = (function () {
  /* Where the builds live. Paths handed to open() are relative to this,
   * exactly as they are in Proton Arcade's own catalog. */
  const ORIGIN = 'https://proton-arcade.github.io';

  /* Cross-origin framing, so this sandbox cannot be escaped by the game:
   * allow-same-origin hands the build back to ITS OWN origin — proton-arcade
   * .github.io, never this one — which is what lets a title keep its saves in
   * localStorage and run its own workers. The rest are what games actually ask
   * for: pointer lock for first-person and 3D titles, modals for their confirm
   * dialogs, popups and downloads for "share your score" buttons. */
  const SANDBOX = [
    'allow-scripts', 'allow-same-origin', 'allow-forms', 'allow-popups',
    'allow-pointer-lock', 'allow-modals', 'allow-downloads',
  ].join(' ');

  /* Feature policy for the frame: fullscreen (the button below, and the
   * game's own), audio without a second gesture, gamepads, pointer lock and
   * the clipboard ("copy your score" buttons). Matches what Proton Arcade's
   * own player page grants its frame. */
  const ALLOW = 'fullscreen; autoplay; gamepad; pointer-lock; clipboard-read; clipboard-write';

  /* How long to keep saying "still downloading" before suggesting the player
   * open the build in its own tab instead. */
  const SLOW_AFTER = 120000;

  /* Turn a catalog-relative path into the absolute address of the build. */
  function urlFor(src) {
    return ORIGIN + '/' + String(src || '').replace(/^\/+/, '');
  }

  /* The app's own display name lives in the catalog, not in its module, so
   * read it back off the window the shell opened it in (openApp() stamps
   * data-app on the window element and passes it as ctx.winEl). */
  function nameFor(ctx, fallback) {
    const id = ctx && ctx.winEl && ctx.winEl.dataset ? ctx.winEl.dataset.app : '';
    const app = typeof APPS !== 'undefined' ? APPS[id] : null;
    return (app && app.name) || fallback || 'This game';
  }

  /* Build the game window. `game` is:
   *   src    path of the build, relative to ORIGIN (required)
   *   size   human-readable first-load weight, shown while it downloads
   *   note   optional extra line for the footnote (controls, caveats) */
  function open(body, ctx, game) {
    const cfg = game || {};
    if (!cfg.src) {
      body.innerHTML = `<div class="pad"><h3>${iconSvg('alert')} No game source</h3>`
        + '<p class="muted">This app has no <code>src</code> in its module — '
        + 'add one to apps/&lt;game&gt;/app.html.</p></div>';
      return;
    }

    const url = urlFor(cfg.src);
    const name = nameFor(ctx, cfg.name);
    const weight = cfg.size ? ` · about ${MH.esc(cfg.size)} on first load` : '';

    body.style.overflow = 'hidden';
    body.innerHTML = `${bar(name, `<span class="arcade-src muted" title="${MH.esc(url)}">${MH.esc(url)}</span>`
      + `<button class="btn sm" data-w="reload">${iconSvg('refresh')} Reload</button>`
      + `<button class="btn sm" data-w="full">${iconSvg('square')} Fullscreen</button>`
      + `<button class="btn sm primary" data-w="ext">${iconSvg('external')} Open in new tab</button>`)}
      <div class="app-main arcade-main">
        <div class="arcade-stage" data-w="stage">
          <iframe class="arcade-frame" data-w="frame" title="${MH.esc(name)}" src="${MH.esc(url)}"
            sandbox="${SANDBOX}" allow="${ALLOW}" allowfullscreen referrerpolicy="no-referrer"></iframe>
          <div class="arcade-loading" data-w="loading">
            <div class="arcade-spinner"></div>
            <b>${MH.esc(name)}</b>
            <span class="muted">Streaming from proton-arcade.github.io${weight}</span>
            <span class="arcade-elapsed muted" data-w="elapsed"></span>
          </div>
        </div>
        <p class="arcade-foot muted">Streams live from
          <a href="${MH.esc(url)}" target="_blank" rel="noopener">proton-arcade.github.io</a> —
          proton does not store, proxy or upload any of it${weight}.
          ${cfg.note ? MH.esc(cfg.note) : ''}
          Blank or stuck? Use <b>Open in new tab</b>: some builds refuse to be framed.</p>
      </div>`;

    const stage = body.querySelector('[data-w="stage"]');
    const frame = body.querySelector('[data-w="frame"]');
    const loading = body.querySelector('[data-w="loading"]');
    const elapsed = body.querySelector('[data-w="elapsed"]');

    /* A 56 MB build takes a while, so show how long the player has been
     * waiting — a slow first load then reads as downloading, not broken.
     * startTicker() returns a stop function, and stops itself after five
     * minutes so a window closed mid-download cannot leave one running: the
     * interval only ever writes into the (by then detached) loading panel, and
     * the frame's own load handler is what normally ends it. */
    let stopTicker = null;
    function startTicker() {
      const started = Date.now();
      let ticks = 0;
      const id = setInterval(() => {
        ticks += 1;
        const s = Math.round((Date.now() - started) / 1000);
        if (!loading.classList.contains('gone') && s >= 4 && s < SLOW_AFTER / 1000) {
          elapsed.textContent = `${s}s and counting…`;
        }
        if (ticks >= 300) stopTicker();
      }, 1000);
      /* If the build is big and the network is bad, stop promising it is on
       * its way and point at the escape hatch instead. Cleared with the
       * interval, so a reload cannot leave a stale warning hanging around. */
      const slow = setTimeout(() => {
        if (loading.classList.contains('gone')) return;
        loading.classList.add('slow');
        elapsed.textContent = 'Taking a while — try “Open in new tab”, or check your connection.';
      }, SLOW_AFTER);
      stopTicker = () => { clearInterval(id); clearTimeout(slow); stopTicker = null; };
      return stopTicker;
    }

    /* The load event fires for cross-origin frames too (only their contents
     * stay unreadable), so it is a reliable "the bytes arrived" signal.
     *
     * Deliberately NOT a HEAD probe for a missing build, which is how Proton
     * Arcade's own player detects one: that fetch is same-origin for them and
     * cross-origin for us, so a blocked or CORS-less response would be
     * indistinguishable from a real 404 and we would report healthy games as
     * missing. The footnote's "Open in new tab" is the honest fallback — it
     * shows the player whatever the build really does, error page included. */
    frame.addEventListener('load', () => {
      if (stopTicker) stopTicker();
      loading.classList.add('gone');
    });
    startTicker();

    body.querySelector('[data-w="reload"]').onclick = () => {
      loading.classList.remove('gone', 'slow');
      elapsed.textContent = '';
      if (!stopTicker) startTicker();
      frame.src = url;
    };
    body.querySelector('[data-w="ext"]').onclick = () => window.open(url, '_blank', 'noopener');
    /* Fullscreen the stage rather than the frame, so the toolbar goes away and
     * the game gets the whole screen; Esc brings proton back. */
    body.querySelector('[data-w="full"]').onclick = () => {
      /* Both halves are feature-detected: fullscreen is optional in a browser,
       * and the promise rejects when a page asks for it without a gesture the
       * browser counts. Either way the player is pointed at the tab escape
       * hatch rather than left with a button that silently does nothing. */
      const blocked = () => MH.toast('This browser blocked fullscreen — try “Open in new tab”.');
      /* A prefixed/older implementation may return nothing rather than a
       * promise, so only attach the rejection handler when there is one. */
      const guard = (p) => { if (p && typeof p.catch === 'function') p.catch(blocked); };
      if (document.fullscreenElement) {
        if (document.exitFullscreen) guard(document.exitFullscreen());
        return;
      }
      if (stage.requestFullscreen) guard(stage.requestFullscreen());
      else blocked();
    };
    /* No teardown hook is needed on close: closeWin() removes the whole window
     * element, destroying the frame with it, and the browser stops the game
     * (and its audio) on its own. The stage is absolutely positioned, so
     * resizing the window resizes the frame and the build's own resize handler
     * fires — nothing to re-nudge here either. */
  }

  return { ORIGIN, SANDBOX, ALLOW, urlFor, open };
})();
