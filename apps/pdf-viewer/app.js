/* proton app module: pdf-viewer — edit this file to change this app.
 * Loaded by index.html; calls registerApp() (see apps/README.md). */
'use strict';

/* ============================ PDF VIEWER ============================ */
registerApp({
  id: 'pdf', name: 'PDF Viewer', icon: 'file-text', cat: 'Productivity', desc: 'Open & read PDFs from this computer (browser viewer)', w: 900, h: 600,
  render(body) {
    body.innerHTML = `${bar('PDF Viewer', `<label class="btn sm primary" style="margin:0">+ Open PDF<input id="pdf-file" type="file" accept="application/pdf" hidden></label><span class="muted" id="pdf-name"></span>`)}
    <div class="app-main" id="pdf-main"><div class="pad muted" style="text-align:center;padding-top:60px"><span class="card-ic" style="font-size:34px">${iconSvg('file-text')}</span><br><b>No PDF open</b><br>Choose a PDF from this computer. It is displayed by your browser's built-in viewer and never uploaded anywhere.</div></div>`;
    body.querySelector('#pdf-file').onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      body.querySelector('#pdf-name').textContent = f.name;
      body.querySelector('#pdf-main').innerHTML = `<iframe title="PDF" style="width:100%;height:100%;border:0;min-height:420px" src="${URL.createObjectURL(f)}"></iframe>`;
    };
  },
});
