/* proton boot — loaded last, after every app/website module. */
'use strict';

function protonBoot() {
  setTimeout(() => {
    MH.$('boot').classList.add('hide');
    setTimeout(() => MH.$('boot').remove(), 450);
    route();
  }, 500);
}
/* With many module <script> tags the DOM may already be parsed by the
 * time this file runs, so handle both cases. */
if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', protonBoot);
else protonBoot();
