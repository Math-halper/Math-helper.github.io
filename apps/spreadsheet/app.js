/* proton app module: spreadsheet — edit this file to change this app.
 * Loaded by index.html; calls registerApp() (see apps/README.md). */
'use strict';

/* ============================ SPREADSHEET ============================ */
registerApp({
  id: 'spreadsheet', name: 'Spreadsheet', icon: '📊', cat: 'Productivity', desc: 'Grid with formulas (=SUM, =AVERAGE…), saved per account', w: 960, h: 600,
  render(body) {
    const COLS = 'ABCDEFGHIJ', ROWS = 16;
    body.innerHTML = `${bar('Spreadsheet', `<select id="sh-list"></select><button class="btn sm" id="sh-new">＋ Sheet</button><button class="btn sm" id="sh-csv">⬇ CSV</button><span class="muted" id="sh-fx" style="margin-left:auto"></span>`)}
    <div class="sheet-wrap"><table class="sheet" id="sh-table"></table></div>
    <div class="appbar" style="border-top:1px solid var(--line);border-bottom:0"><span class="muted">Type values, or formulas like <span class="kbd">=A1+B2</span>, <span class="kbd">=SUM(A1:A5)</span>, <span class="kbd">=AVERAGE(B2:B6)</span>. Everything autosaves.</span></div>`;
    const list = body.querySelector('#sh-list'), table = body.querySelector('#sh-table'), fx = body.querySelector('#sh-fx');
    const sheet = () => userData.sheets[userData.activeSheet] || (userData.sheets[userData.activeSheet] = {});
    function value(ref, seen = new Set()) {
      if (seen.has(ref)) return 0; seen.add(ref);
      const raw = sheet()[ref]; if (raw === undefined || raw === '') return 0;
      if (!String(raw).startsWith('=')) { const n = parseFloat(raw); return Number.isFinite(n) ? n : 0; }
      let e = String(raw).slice(1).toUpperCase();
      e = e.replace(/([A-J]\d+):([A-J]\d+)\s*(?=\))/g, (m, a, b) => { // range in function handled below
        return m;
      });
      const fn = e.match(/^(SUM|AVERAGE|MIN|MAX)\(([A-J]\d+):([A-J]\d+)\)$/);
      if (fn) {
        const [, f, a, b] = fn;
        const [c1, r1] = [a[0], +a.slice(1)], [c2, r2] = [b[0], +b.slice(1)];
        const vals = [];
        for (let c = Math.min(c1.charCodeAt(0), c2.charCodeAt(0)); c <= Math.max(c1.charCodeAt(0), c2.charCodeAt(0)); c++)
          for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) vals.push(value(String.fromCharCode(c) + r, seen));
        if (f === 'SUM') return vals.reduce((s, v) => s + v, 0);
        if (f === 'AVERAGE') return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
        if (f === 'MIN') return Math.min(...vals); return Math.max(...vals);
      }
      e = e.replace(/[A-J]\d+/g, (ref) => value(ref, seen));
      try { return evalMath(e); } catch { return 0; }
    }
    const display = (ref) => {
      const raw = sheet()[ref] ?? '';
      if (!String(raw).startsWith('=')) return raw;
      const v = value(ref); return Number.isFinite(v) ? fmtNum(v) : '#ERR';
    };
    function draw() {
      list.innerHTML = Object.keys(userData.sheets).map((n) => `<option ${n === userData.activeSheet ? 'selected' : ''}>${MH.esc(n)}</option>`).join('');
      let h = '<tr><th></th>' + [...COLS].map((c) => `<th>${c}</th>`).join('') + '</tr>';
      for (let r = 1; r <= ROWS; r++) {
        h += `<tr><th>${r}</th>` + [...COLS].map((c) => {
          const ref = c + r;
          return `<td><input data-ref="${ref}" value="${MH.esc(display(ref))}" data-raw="${MH.esc(sheet()[ref] ?? '')}" aria-label="${ref}"></td>`;
        }).join('') + '</tr>';
      }
      table.innerHTML = h;
      table.querySelectorAll('input').forEach((inp) => {
        inp.addEventListener('focus', () => { inp.value = inp.dataset.raw; fx.textContent = `${inp.dataset.ref}: ${inp.dataset.raw || '(empty)'}`; });
        inp.addEventListener('blur', () => { commit(inp); inp.value = display(inp.dataset.ref); });
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.blur(); });
        inp.addEventListener('input', () => { fx.textContent = `${inp.dataset.ref}: ${inp.value}`; });
      });
    }
    function commit(inp) {
      const ref = inp.dataset.ref;
      if (inp.value === inp.dataset.raw) return;
      if (inp.value === '') delete sheet()[ref]; else sheet()[ref] = inp.value;
      inp.dataset.raw = inp.value; saveData();
      // refresh dependent displays
      table.querySelectorAll('input').forEach((o) => { if (o !== inp) o.value = display(o.dataset.ref); });
    }
    list.onchange = () => { userData.activeSheet = list.value; saveData(); draw(); };
    body.querySelector('#sh-new').onclick = () => {
      const n = prompt('Sheet name:', 'Sheet ' + (Object.keys(userData.sheets).length + 1)); if (!n?.trim()) return;
      userData.sheets[n.trim()] = {}; userData.activeSheet = n.trim(); saveData(); draw();
    };
    body.querySelector('#sh-csv').onclick = () => {
      const rows = [];
      for (let r = 1; r <= ROWS; r++) rows.push([...COLS].map((c) => `"${String(display(c + r)).replace(/"/g, '""')}"`).join(','));
      MH.download(userData.activeSheet + '.csv', rows.join('\n'), 'text/csv');
    };
    draw();
  },
});
