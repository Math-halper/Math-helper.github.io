/* proton built-in website: Maths Resources — edit this file to change this site.
 * Loaded by index.html; calls registerSite() (see websites/README.md). */
'use strict';

registerSite({
  id: 'maths-resources', name: 'Maths Resources', icon: 'sigma', desc: 'Formula reminders and practice ideas',
  render(main, ctx) {
    main.innerHTML = `<div class="pad"><h2>Σ Maths resources</h2><div class="grid-cards">
      <div class="card"><h3>Daily practice</h3><p>20 minutes beats 2 hours once a week. Mix topics: arithmetic, algebra, geometry.</p></div>
      <div class="card"><h3>Show your working</h3><p>Write each step. If you get stuck, the step where it breaks is where the learning is.</p></div>
      <div class="card"><h3>Use the Solver</h3><p>Open <b>Calculator, then Solver</b>, solve, then read the “Steps” line and re-derive it yourself.</p><button class="btn primary" id="site-open-calc">Open Calculator</button></div>
      <div class="card"><h3>Plot it</h3><p>Unsure what x² − 3x looks like? Graph it, then predict sin(x) before plotting.</p></div></div></div>`;
    main.querySelector('#site-open-calc').onclick = () => ctx.openApp('math');
  },
});
