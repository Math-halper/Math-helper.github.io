/* proton TEST website: proton Daily — a sample fake-news site for tests/demos.
 * Edit this file to experiment; copy the folder to make your own site.
 * Loaded by index.html; calls registerSite() (see websites/README.md). */
'use strict';

registerSite({
  id: 'proton-daily', name: 'proton Daily', icon: 'newspaper', desc: 'TEST SITE: a sample newspaper front page (all stories fictional)',
  render(main, ctx) {
    const STORIES = [
      ['Local desktop learns new tricks', 'Residents report the proton desktop can now add and remove nearly everything, after a round of modular upgrades. “I renamed my Notes app twice before breakfast,” one user said.'],
      ['Calculator solves equation, asks for harder one', 'The solver, fresh from graphing x² − 3x, is reportedly bored. Teachers recommend parabolas.'],
      ['Sudoku shortage averted', 'Generators confirm puzzles remain plentiful at all three difficulties. Hints remain available for emergencies.'],
      ['Weather', 'Black backgrounds with a chance of green accents across the whole region. White text expected to continue.'],
    ];
    main.innerHTML = `<div class="pad" style="max-width:760px">
      <h2 style="font-family:Georgia,serif;font-size:30px;margin-bottom:2px">proton Daily</h2>
      <p class="muted">${new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · All stories fictional · A test website in <span class="kbd">websites/proton-daily/site.js</span></p>
      ${STORIES.map(([h, b]) => `<div class="card" style="margin-bottom:10px"><h3 style="margin:2px 0 5px;font-family:Georgia,serif">${h}</h3><p style="margin:0;line-height:1.6">${b}</p></div>`).join('')}
      <button class="btn" id="pd-guide">Read the Guide instead</button></div>`;
    main.querySelector('#pd-guide').onclick = () => ctx.showSite('guide');
  },
});
