/* TEMPLATE — copy this whole _template folder, rename it, edit below,
 * then add ONE line to index.html:
 *   <script src="apps/my-app/app.js"></script>
 * (put it with the other app scripts, before assets/boot.js)
 * Delete this comment when you're done. This file itself is never loaded. */
'use strict';

registerApp({
  id: 'my-app',                 // unique id, lowercase-with-dashes
  name: 'My App',                // shown in the proton menu
  icon: 'grid',                    // icon name from assets/icons.js (folder, globe, star, ...)
  cat: 'Productivity',           // menu category (invent your own if you like)
  desc: 'What this app does',    // shown in App Center / Customize
  w: 720, h: 480,                // starting window size

  render(body) {
    // body is your window. userData is the signed-in account's saved data.
    body.innerHTML = `${bar('My App')}<div class="app-main pad">
      <p>Hello from my app!</p>
      <button class="btn primary" id="my-btn">Click me</button>
    </div>`;
    body.querySelector('#my-btn').onclick = () => {
      MH.toast('It works!');
      // saveData(); // after changing userData
    };
  },
});
