/* TEMPLATE — copy this whole _template folder, rename it, edit below,
 * then add ONE line to index.html:
 *   <script src="websites/my-site/site.js"></script>
 * (put it with the other website scripts, before assets/boot.js)
 * It will appear automatically on the Browser home page and in the
 * Browser's “Built-in websites” menu, at proton://my-site
 * Delete this comment when you're done. This file itself is never loaded. */
'use strict';

registerSite({
  id: 'my-site',                 // becomes proton://my-site
  name: 'My Site',               // shown in the Browser
  icon: 'globe',                    // icon name from assets/icons.js (folder, globe, star, ...)
  desc: 'What this site is',     // shown on the Browser home page

  render(main, ctx) {
    // main is the page area. ctx.openApp(id) opens proton apps,
    // ctx.showSite(id) visits another built-in site,
    // ctx.showHome() goes back to the Browser home page.
    main.innerHTML = `<div class="pad">
      <h2>My Site</h2>
      <p>Edit <span class="kbd">websites/my-site/site.js</span> to change me.</p>
      <button class="btn primary" id="my-site-btn">Say hello</button>
    </div>`;
    main.querySelector('#my-site-btn').onclick = () => MH.toast('Hello from my site!');
  },
});
