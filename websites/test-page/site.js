/* proton TEST website: Test Page — a playground for trying the Browser.
 * Edit this file to experiment; copy the folder to make your own site.
 * Loaded by index.html; calls registerSite() (see websites/README.md). */
'use strict';

registerSite({
  id: 'test-page', name: 'Test Page', icon: 'flask', desc: 'TEST SITE: buttons, forms, clock & counter to try the Browser with',
  render(main) {
    let count = 0;
    main.innerHTML = `<div class="pad" style="max-width:720px">
      <h2>Test Page</h2>
      <p class="muted">A built-in test website living in <span class="kbd">websites/test-page/site.js</span>. Everything below is interactive, so you can check the Browser, windows and rendering all work.</p>
      <div class="grid-cards">
        <div class="card"><h3>Counter</h3><p style="font-size:30px;margin:6px 0" id="tp-count">0</p>
          <button class="btn primary" id="tp-inc">Click me</button>
          <button class="btn" id="tp-reset">Reset</button></div>
        <div class="card"><h3>Live clock</h3><p style="font-size:24px;margin:6px 0" id="tp-clock">--:--:--</p>
          <p class="muted">If this ticks every second, timers work.</p></div>
        <div class="card"><h3>Echo form</h3>
          <form id="tp-form"><div class="field"><label>Type something</label><input id="tp-input" maxlength="60" placeholder="Hello proton"></div>
          <button class="btn primary">Echo it</button></form>
          <p id="tp-out" style="min-height:1.4em"></p></div>
        <div class="card"><h3>Colour box</h3>
          <div id="tp-box" style="height:64px;border-radius:8px;background:#68b723;margin-bottom:8px"></div>
          <input type="color" id="tp-color" value="#68b723" style="width:100%;height:38px;padding:2px" aria-label="Pick a colour"></div>
      </div></div>`;
    main.querySelector('#tp-inc').onclick = () => { main.querySelector('#tp-count').textContent = ++count; };
    main.querySelector('#tp-reset').onclick = () => { count = 0; main.querySelector('#tp-count').textContent = '0'; };
    const tick = () => { const el = main.querySelector('#tp-clock'); if (el) el.textContent = new Date().toLocaleTimeString(); };
    tick();
    const timer = setInterval(tick, 1000);
    // stop the clock when the page is navigated away from
    new MutationObserver(() => { if (!main.querySelector('#tp-clock')) { clearInterval(timer); } })
      .observe(main, { childList: true });
    main.querySelector('#tp-form').onsubmit = (e) => {
      e.preventDefault();
      main.querySelector('#tp-out').textContent = 'You typed: ' + main.querySelector('#tp-input').value;
    };
    main.querySelector('#tp-color').oninput = (e) => { main.querySelector('#tp-box').style.background = e.target.value; };
  },
});
