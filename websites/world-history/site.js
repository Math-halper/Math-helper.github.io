/* proton built-in website: World History — edit this file to change this site.
 * Loaded by index.html; calls registerSite() (see websites/README.md).
 * Adapted from the original project's bundled internet/world-history site. */
'use strict';

registerSite({
  id: 'world-history', name: 'World History', icon: '🏛', desc: 'A short interactive timeline, adapted from the original bundled site',
  render(main) {
    const EVENTS = [
      ['c. 3000 BCE', 'Writing appears', 'Cuneiform in Mesopotamia and hieroglyphs in Egypt let ideas outlive memory. Mathematics follows: counting, calendars, geometry for land and stars.'],
      ['c. 600 BCE', 'Greek mathematics', 'Thales and Pythagoras turn measurement into proof. The theorem a²+b²=c² still bears Pythagoras’ name — try it in the Solver!'],
      ['820 CE', 'Algebra gets a name', 'Al-Khwārizmī writes “al-Kitāb al-Mukhtaṣar fī Ḥisāb al-Jabr” in Baghdad. “Algorithm” comes from his name.'],
      ['1687', 'Newton’s Principia', 'Calculus and universal gravitation arrive in one book, changing physics forever.'],
      ['1969', 'Apollo 11', 'Humans land on the Moon — guided by mathematics computed partly by human “computers” like Katherine Johnson.'],
      ['Today', 'A desktop in a browser', 'You are reading history inside a static clone of a browser operating system. The timeline continues…'],
    ];
    main.innerHTML = `<div class="pad" style="max-width:760px"><h2>🏛 World History — a pocket timeline</h2>
      <p class="muted">Adapted from the original project's bundled <span class="kbd">internet/world-history</span> site. This page lives in <span class="kbd">websites/world-history/site.js</span>.</p>
      ${EVENTS.map(([d, t, b]) => `<div class="card" style="margin-bottom:10px"><span class="chip">${d}</span><h3 style="margin:7px 0 4px">${t}</h3><p style="margin:0">${b}</p></div>`).join('')}</div>`;
  },
});
