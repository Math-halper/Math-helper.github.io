/* proton TEST app: Hello Test — the smallest possible proton app.
 * Copy this folder as a starting point for your own apps (apps/README.md).
 * It proves: rendering, buttons, toasts, and per-account saving all work. */
'use strict';

registerApp({
  id: 'hello-test', name: 'Hello Test', icon: '👋', cat: 'Test', desc: 'TEST APP: click counter that saves — the template for new apps', w: 560, h: 430,
  render(body) {
    userData.games.helloTest ||= { clicks: 0, last: '' };
    const state = userData.games.helloTest;
    body.innerHTML = `${bar('👋 Hello Test')}<div class="app-main pad" style="text-align:center">
      <p style="font-size:44px;margin:10px 0" id="ht-count">${state.clicks}</p>
      <p class="muted">clicks so far (saved under your account)</p>
      <button class="btn primary" id="ht-click" style="font-size:16px;padding:12px 22px">Click me</button>
      <button class="btn" id="ht-reset">Reset</button>
      <p id="ht-last" class="muted">${state.last ? 'Last clicked: ' + MH.esc(state.last) : ''}</p>
      <div class="card" style="text-align:left;margin-top:14px"><b>What this tests</b>
      <p class="muted" style="margin-bottom:0">Rendering a window, handling clicks, showing a toast, and saving per-account data that survives sign-out and reload. This whole app is one file: <span class="kbd">apps/hello-test/app.js</span>.</p></div></div>`;
    body.querySelector('#ht-click').onclick = () => {
      state.clicks++; state.last = new Date().toLocaleTimeString(); saveData();
      body.querySelector('#ht-count').textContent = state.clicks;
      body.querySelector('#ht-last').textContent = 'Last clicked: ' + state.last;
      if (state.clicks % 10 === 0) MH.toast(`🎉 ${state.clicks} clicks! Saving works.`);
    };
    body.querySelector('#ht-reset').onclick = () => {
      state.clicks = 0; state.last = ''; saveData();
      body.querySelector('#ht-count').textContent = '0';
      body.querySelector('#ht-last').textContent = '';
    };
  },
});
