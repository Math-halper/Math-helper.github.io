/* proton — apps part 2: Calculator, Spreadsheet, Presentation,
 * Whiteboard, Terminal, Browser, Media, PDF Viewer, Team Chat, Meetings.
 * Game logic (Sudoku generator/checker) is adapted from the original
 * src/apps/* logic files (AGPL-3.0-only); everything else is a browser-only
 * rewrite of the original apps' behaviour. See games.js.
 */
'use strict';

/* ---------- tiny safe-ish maths evaluator (own input only, this device) --- */
function evalMath(expr, xVal = 0) {
  let e = String(expr).trim().toLowerCase().replace(/\^/g, '**').replace(/,/g, '.');
  if (!e || !/^[0-9a-z+\-*/%(). ]+$/.test(e)) throw new Error('Use numbers, + − × ÷, brackets, x, sin/cos/sqrt/pi');
  e = e.replace(/\bpi\b/g, 'Math.PI').replace(/\be\b/g, 'Math.E')
       .replace(/\b(sin|cos|tan|sqrt|abs|log|exp)\b/g, 'Math.$1');
  // bare x becomes the supplied value; identifiers left must be Math.* only
  e = e.replace(/(?<![\w.])x(?![\w])/g, `(${Number(xVal) || 0})`);
  if (/(?<![\w.])[a-z]+/.test(e.replace(/Math\.[A-Z]+/g, ''))) throw new Error('Unknown name in expression');
  const v = Function('"use strict"; return (' + e + ')')();
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error('No numeric result');
  return v;
}
const fmtNum = (v) => Math.abs(v) >= 1e12 || (Math.abs(v) < 1e-9 && v !== 0) ? v.toExponential(6) : String(Math.round(v * 1e10) / 1e10);

/* ============================ MATH HELPER ============================ */
registerApp({
  id: 'math', name: 'Calculator', icon: '🧮', cat: 'Learn', desc: 'Calculator, equation solver, graph plotter & formulas', w: 880, h: 600,
  render(body) {
    let expr = '';
    body.innerHTML = `${bar('Calculator', `<button class="btn sm" data-tab="calc">Calculator</button><button class="btn sm" data-tab="solve">Solver</button><button class="btn sm" data-tab="graph">Graph</button><button class="btn sm" data-tab="cards">Formulas</button>`)}
    <div class="app-main pad" id="math-main"></div>`;
    const main = body.querySelector('#math-main');
    const tabs = body.querySelectorAll('[data-tab]');
    function show(tab) {
      tabs.forEach((b) => b.classList.toggle('primary', b.dataset.tab === tab));
      if (tab === 'calc') {
        main.innerHTML = `<div style="max-width:430px;margin:auto"><div class="calc-disp" id="c-disp">${MH.esc(expr || '0')}</div>
        <div class="calc-grid">${['C', '⌫', '(', ')', '7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', '%', '+', '√(', 'x²', 'π', '='].map((k) =>
          `<button data-k="${k}" class="${k === '=' ? 'eq' : '+-/*%'.includes(k) || '()√π'.includes(k) ? 'op' : ''}">${k === '*' ? '×' : k === '/' ? '÷' : k}</button>`).join('')}</div>
        <p class="muted" style="text-align:center">Keyboard works too. Try <span class="kbd">(3+4)*5</span>, <span class="kbd">sqrt(144)</span>, <span class="kbd">2^10</span></p></div>`;
        const disp = main.querySelector('#c-disp');
        const upd = () => disp.textContent = expr || '0';
        main.querySelectorAll('[data-k]').forEach((b) => b.onclick = () => {
          const k = b.dataset.k;
          if (k === 'C') expr = '';
          else if (k === '⌫') expr = expr.slice(0, -1);
          else if (k === 'x²') expr += '^2';
          else if (k === 'π') expr += 'pi';
          else if (k === '=') { try { expr = fmtNum(evalMath(expr || '0')); } catch (e) { disp.textContent = '⚠ ' + e.message; return; } }
          else expr += k;
          upd();
        });
        main.tabIndex = 0;
        main.onkeydown = (e) => {
          if (/^[0-9+\-*/%().^a-z]$/i.test(e.key)) { expr += e.key; upd(); }
          else if (e.key === 'Backspace') { expr = expr.slice(0, -1); upd(); }
          else if (e.key === 'Enter') main.querySelector('[data-k="="]').click();
          else if (e.key === 'Escape') { expr = ''; upd(); }
        };
        main.focus();
      }
      if (tab === 'solve') {
        main.innerHTML = `<div class="grid-cards">
        <div class="card"><h3>Linear: a·x + b = c</h3>
          ${['a', 'b', 'c'].map((v) => `<div class="field"><label>${v}</label><input type="number" id="ln-${v}" value="${v === 'a' ? 2 : v === 'b' ? 3 : 11}"></div>`).join('')}
          <button class="btn primary" id="ln-go">Solve</button><p id="ln-out"></p></div>
        <div class="card"><h3>Quadratic: a·x² + b·x + c = 0</h3>
          ${['a', 'b', 'c'].map((v) => `<div class="field"><label>${v}</label><input type="number" id="q-${v}" value="${v === 'a' ? 1 : v === 'b' ? -3 : 2}"></div>`).join('')}
          <button class="btn primary" id="q-go">Solve</button><p id="q-out"></p></div>
        <div class="card"><h3>Percentage</h3>
          <div class="field"><label>What is <input type="number" id="pc-p" value="15" style="width:80px;display:inline"> % of <input type="number" id="pc-n" value="80" style="width:90px;display:inline"> ?</label></div>
          <button class="btn primary" id="pc-go">Calculate</button><p id="pc-out"></p>
          <h3>Pythagoras: a² + b² = c²</h3>
          <div class="field"><label>a <input type="number" id="py-a" value="3" style="width:70px;display:inline"> b <input type="number" id="py-b" value="4" style="width:70px;display:inline"></label></div>
          <button class="btn primary" id="py-go">Find c</button><p id="py-out"></p></div></div>`;
        const num = (id) => parseFloat(main.querySelector(id).value);
        main.querySelector('#ln-go').onclick = () => {
          const a = num('#ln-a'), b = num('#ln-b'), c = num('#ln-c'), out = main.querySelector('#ln-out');
          out.innerHTML = a === 0 ? 'If a = 0 there is no x to solve for.' : `<b>x = ${fmtNum((c - b) / a)}</b><br><span class="muted">Steps: ${a}x = ${c} − ${b} = ${fmtNum(c - b)} → x = ${fmtNum(c - b)} ÷ ${a}</span>`;
        };
        main.querySelector('#q-go').onclick = () => {
          const a = num('#q-a'), b = num('#q-b'), c = num('#q-c'), out = main.querySelector('#q-out');
          if (a === 0) { out.textContent = 'a cannot be 0 for a quadratic.'; return; }
          const d = b * b - 4 * a * c;
          out.innerHTML = d < 0 ? `Discriminant Δ = ${fmtNum(d)} &lt; 0 → <b>no real solutions</b>.`
            : d === 0 ? `Δ = 0 → <b>x = ${fmtNum(-b / (2 * a))}</b> (repeated root)`
            : `Δ = ${fmtNum(d)} → <b>x₁ = ${fmtNum((-b + Math.sqrt(d)) / (2 * a))}</b>, <b>x₂ = ${fmtNum((-b - Math.sqrt(d)) / (2 * a))}</b>`;
        };
        main.querySelector('#pc-go').onclick = () => main.querySelector('#pc-out').innerHTML = `<b>${fmtNum(num('#pc-p') / 100 * num('#pc-n'))}</b>`;
        main.querySelector('#py-go').onclick = () => main.querySelector('#py-out').innerHTML = `<b>c = ${fmtNum(Math.hypot(num('#py-a'), num('#py-b')))}</b>`;
      }
      if (tab === 'graph') {
        main.innerHTML = `<div class="card"><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:end">
          <div class="field" style="flex:1;min-width:220px"><label>f(x) =</label><input id="g-f" value="x^2 - 3*x" style="width:100%;padding:8px"></div>
          <div class="field"><label>from x</label><input id="g-min" type="number" value="-6" style="width:80px;padding:8px"></div>
          <div class="field"><label>to x</label><input id="g-max" type="number" value="6" style="width:80px;padding:8px"></div>
          <button class="btn primary" id="g-go">Plot 📈</button></div>
          <p class="muted" id="g-msg">Examples: <span class="kbd">sin(x)</span> · <span class="kbd">x^3-2*x</span> · <span class="kbd">sqrt(abs(x))</span> · <span class="kbd">2^x</span></p>
          <canvas id="g-cv" width="760" height="380" style="width:100%;background:#fff;border:1px solid var(--line);border-radius:8px"></canvas></div>`;
        const plot = () => {
          const cv = main.querySelector('#g-cv'), ctx = cv.getContext('2d');
          const min = parseFloat(main.querySelector('#g-min').value), max = parseFloat(main.querySelector('#g-max').value);
          const W = cv.width, H = cv.height;
          let vals = [], lo = Infinity, hi = -Infinity;
          for (let i = 0; i <= W; i++) {
            const x = min + (max - min) * i / W;
            try { const y = evalMath(main.querySelector('#g-f').value, x); vals.push(y); if (Math.abs(y) < 1e7) { lo = Math.min(lo, y); hi = Math.max(hi, y); } } catch { vals.push(NaN); }
          }
          if (!Number.isFinite(lo)) { main.querySelector('#g-msg').textContent = '⚠ Could not evaluate that function on this range.'; return; }
          const pad = (hi - lo) * 0.12 || 1; lo -= pad; hi += pad;
          const X = (x) => (x - min) / (max - min) * W, Y = (y) => H - (y - lo) / (hi - lo) * H;
          ctx.clearRect(0, 0, W, H);
          ctx.strokeStyle = '#e3e3e1'; ctx.fillStyle = '#888'; ctx.font = '11px system-ui';
          for (let gx = Math.ceil(min); gx <= max; gx++) { ctx.beginPath(); ctx.moveTo(X(gx), 0); ctx.lineTo(X(gx), H); ctx.stroke(); ctx.fillText(gx, X(gx) + 3, Y(0) - 4 < 12 ? 12 : Y(0) - 4); }
          ctx.strokeStyle = '#999'; ctx.beginPath(); ctx.moveTo(0, Y(0)); ctx.lineTo(W, Y(0)); ctx.moveTo(X(0), 0); ctx.lineTo(X(0), H); ctx.stroke();
          ctx.strokeStyle = '#68b723'; ctx.lineWidth = 2.4; ctx.beginPath(); let pen = false;
          vals.forEach((y, i) => { if (!Number.isFinite(y) || Math.abs(y) > 1e7) { pen = false; return; } const px = i, py = Y(y); pen ? ctx.lineTo(px, py) : ctx.moveTo(px, py); pen = true; });
          ctx.stroke(); ctx.lineWidth = 1;
          main.querySelector('#g-msg').textContent = `Plotted f(x) = ${main.querySelector('#g-f').value} for x ∈ [${min}, ${max}], y ∈ [${fmtNum(lo)}, ${fmtNum(hi)}]`;
        };
        main.querySelector('#g-go').onclick = plot; plot();
      }
      if (tab === 'cards') {
        const F = [
          ['Quadratic formula', 'x = (−b ± √(b² − 4ac)) / 2a', 'For ax² + bx + c = 0. Inside the root (b²−4ac) is the discriminant.'],
          ['Pythagoras', 'a² + b² = c²', 'Right-angled triangles: c is the hypotenuse.'],
          ['Slope', 'm = (y₂ − y₁) / (x₂ − x₁)', 'Steepness of a line through two points.'],
          ['Area of a circle', 'A = πr²', 'Circumference is 2πr.'],
          ['Percent change', '((new − old) / old) × 100%', 'Positive = increase, negative = decrease.'],
          ['Arithmetic sequence', 'aₙ = a₁ + (n − 1)d', 'n-th term with common difference d.'],
          ['Sum 1..n', 'n(n + 1) / 2', 'Gauss: pair 1+n, 2+(n−1), …'],
          ['Powers', 'aᵐ · aⁿ = aᵐ⁺ⁿ · (aᵐ)ⁿ = aᵐⁿ', '(ab)ⁿ = aⁿbⁿ too.'],
          ['Logs', 'log(ab) = log a + log b', 'log(a/b) = log a − log b; log(aⁿ) = n·log a.'],
          ['Sine rule', 'a / sin A = b / sin B = c / sin C', 'Any triangle, side over opposite angle.'],
        ];
        main.innerHTML = `<div class="grid-cards">${F.map(([t, f, n]) => `<div class="card"><h3 style="margin-top:0">${t}</h3><p style="font-size:17px;font-family:Georgia,serif">${f}</p><p class="muted">${n}</p></div>`).join('')}</div>`;
      }
    }
    tabs.forEach((b) => b.onclick = () => show(b.dataset.tab));
    show('calc');
  },
});

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

/* ============================ PRESENTATION ============================ */
registerApp({
  id: 'presentation', name: 'Presentation', icon: '📽️', cat: 'Create', desc: 'Slides with a present mode, saved per account', w: 920, h: 580,
  render(body) {
    let idx = 0, presenting = false;
    body.innerHTML = `${bar('Presentation', `<button class="btn sm primary" id="p-new">＋ Slide</button><button class="btn sm" id="p-del">Delete slide</button><button class="btn sm" id="p-present">▶ Present</button>`)}
    <div class="split"><aside class="side" id="p-list"></aside><div id="p-stage" style="display:flex;flex-direction:column;min-height:0"></div></div>`;
    const stage = body.querySelector('#p-stage');
    function draw() {
      idx = Math.max(0, Math.min(idx, userData.slides.length - 1));
      body.querySelector('#p-list').innerHTML = userData.slides.map((s, i) => `
        <button class="rowitem ${i === idx ? 'sel' : ''}" data-i="${i}"><span><b>${i + 1}. ${MH.esc(s.title || 'Untitled')}</b><br><span class="muted">${MH.esc(s.body.split('\n')[0].slice(0, 44))}</span></span></button>`).join('') || '<div class="pad muted">No slides.</div>';
      body.querySelectorAll('#p-list [data-i]').forEach((b) => b.onclick = () => { idx = +b.dataset.i; draw(); });
      const s = userData.slides[idx];
      if (presenting && s) {
        stage.innerHTML = `<div class="present-stage"><h1>${MH.esc(s.title)}</h1><p style="white-space:pre-wrap;font-size:18px;line-height:1.6">${MH.esc(s.body)}</p>
        <div><button class="btn" id="pp-prev">← Prev</button> <span style="opacity:.7">${idx + 1} / ${userData.slides.length}</span> <button class="btn" id="pp-next">Next →</button> <button class="btn" id="pp-exit">Exit (Esc)</button></div></div>`;
        stage.querySelector('#pp-prev').onclick = () => { idx--; draw(); };
        stage.querySelector('#pp-next').onclick = () => { idx++; draw(); };
        stage.querySelector('#pp-exit').onclick = () => { presenting = false; draw(); };
        stage.querySelector('.present-stage').tabIndex = 0; stage.querySelector('.present-stage').focus();
        stage.querySelector('.present-stage').onkeydown = (e) => { if (e.key === 'ArrowRight') { idx++; draw(); } if (e.key === 'ArrowLeft') { idx--; draw(); } if (e.key === 'Escape') { presenting = false; draw(); } };
      } else {
        stage.innerHTML = s ? `<div class="app-main pad">
          <div class="field"><label>Slide title</label><input id="p-title" style="width:100%;padding:9px;font-size:19px;font-weight:700" value="${MH.esc(s.title)}"></div>
          <div class="field"><label>Body</label><textarea id="p-body" rows="9">${MH.esc(s.body)}</textarea></div>
          <div class="card" style="text-align:center;padding:26px"><h2 style="margin:0 0 8px">${MH.esc(s.title || 'Untitled')}</h2><p style="white-space:pre-wrap">${MH.esc(s.body)}</p></div></div>`
          : '<div class="pad muted">Add a slide to begin.</div>';
        if (s) {
          stage.querySelector('#p-title').addEventListener('input', (e) => { s.title = e.target.value; saveData(); body.querySelectorAll('#p-list .rowitem')[idx].querySelector('b').textContent = `${idx + 1}. ${s.title}`; stage.querySelector('.card h2').textContent = s.title; });
          stage.querySelector('#p-body').addEventListener('input', (e) => { s.body = e.target.value; saveData(); stage.querySelector('.card p').textContent = s.body; });
        }
      }
    }
    body.querySelector('#p-new').onclick = () => { userData.slides.splice(idx + 1, 0, { id: MH.uid(), title: 'New slide', body: '' }); idx++; saveData(); draw(); };
    body.querySelector('#p-del').onclick = () => { if (userData.slides.length && confirmBox('Delete this slide?')) { userData.slides.splice(idx, 1); saveData(); draw(); } };
    body.querySelector('#p-present').onclick = () => { presenting = true; draw(); };
    draw();
  },
});

/* ============================ WHITEBOARD ============================ */
/* Adapted from the original Whiteboard app: pen/shapes/text/eraser boards
 * saved on-device — here each board persists as a PNG snapshot. */
registerApp({
  id: 'whiteboard', name: 'Whiteboard', icon: '🎨', cat: 'Create', desc: 'Draw with pen, shapes & text — boards autosave', w: 940, h: 600,
  render(body, ctx) {
    let board = userData.boards[0], tool = 'pen', drawing = false, start = null, snapshot = null;
    body.innerHTML = `${bar('Whiteboard', `<select id="w-list"></select><button class="btn sm" id="w-new">＋ Board</button><button class="btn sm" id="w-del">Delete</button><button class="btn sm" id="w-png">⬇ PNG</button>`)}
    <div class="appbar" style="background:#fff">${['pen', 'line', 'rect', 'ellipse', 'text', 'eraser'].map((t) => `<button class="btn sm" data-tool="${t}">${{ pen: '✏️ Pen', line: '╱ Line', rect: '▭ Rect', ellipse: '◯ Ellipse', text: 'T Text', eraser: '🧽 Eraser' }[t]}</button>`).join('')}
      <input type="color" id="w-color" value="#1d4f91" style="width:38px;height:30px;padding:0"> <label class="muted">Width <input type="range" id="w-width" min="1" max="24" value="3"></label>
      <button class="btn sm" id="w-undo">Undo</button><button class="btn sm" id="w-clear">Clear</button><span class="muted" id="w-saved" style="margin-left:auto"></span></div>
    <div class="wb-stage"><canvas id="w-cv"></canvas></div>`;
    const cv = body.querySelector('#w-cv'), c2 = cv.getContext('2d'), stage = body.querySelector('.wb-stage');
    const list = body.querySelector('#w-list');
    let history = [];
    function fit(restore = true) {
      const img = restore && board?.data ? board.data : null;
      cv.width = Math.max(1, stage.clientWidth); cv.height = Math.max(1, stage.clientHeight);
      c2.fillStyle = '#fff'; c2.fillRect(0, 0, cv.width, cv.height);
      if (img) { const im = new Image(); im.onload = () => c2.drawImage(im, 0, 0); im.src = img; }
      history = [];
    }
    function persist() {
      if (!board) return;
      board.data = cv.toDataURL('image/png'); board.updated = Date.now(); saveData();
      body.querySelector('#w-saved').textContent = 'Saved ✓';
    }
    function drawList() {
      list.innerHTML = userData.boards.map((b) => `<option value="${b.id}" ${b === board ? 'selected' : ''}>${MH.esc(b.name)}</option>`).join('');
    }
    function pos(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height }; }
    function style() { c2.strokeStyle = tool === 'eraser' ? '#fff' : body.querySelector('#w-color').value; c2.fillStyle = c2.strokeStyle; c2.lineWidth = +body.querySelector('#w-width').value; c2.lineCap = 'round'; c2.lineJoin = 'round'; }
    cv.addEventListener('pointerdown', (e) => {
      if (!board) return;
      const p = pos(e);
      if (tool === 'text') {
        const t = prompt('Text to place:'); if (!t) return;
        history.push(cv.toDataURL()); style(); c2.font = '20px system-ui'; c2.fillText(t, p.x, p.y); persist(); return;
      }
      drawing = true; start = p; snapshot = cv.toDataURL(); history.push(snapshot); if (history.length > 25) history.shift();
      cv.setPointerCapture(e.pointerId);
      if (tool === 'pen' || tool === 'eraser') { style(); c2.beginPath(); c2.moveTo(p.x, p.y); c2.lineTo(p.x + 0.1, p.y + 0.1); c2.stroke(); }
    });
    cv.addEventListener('pointermove', (e) => {
      if (!drawing) return; const p = pos(e); style();
      if (tool === 'pen' || tool === 'eraser') { c2.lineTo(p.x, p.y); c2.stroke(); return; }
      const im = new Image(); im.src = snapshot;
      c2.clearRect(0, 0, cv.width, cv.height); c2.drawImage(im, 0, 0);
      c2.beginPath();
      if (tool === 'line') { c2.moveTo(start.x, start.y); c2.lineTo(p.x, p.y); }
      if (tool === 'rect') c2.rect(Math.min(start.x, p.x), Math.min(start.y, p.y), Math.abs(p.x - start.x), Math.abs(p.y - start.y));
      if (tool === 'ellipse') c2.ellipse((start.x + p.x) / 2, (start.y + p.y) / 2, Math.abs(p.x - start.x) / 2, Math.abs(p.y - start.y) / 2, 0, 0, Math.PI * 2);
      c2.stroke();
    });
    cv.addEventListener('pointerup', () => { if (drawing) { drawing = false; persist(); } });
    body.querySelectorAll('[data-tool]').forEach((b) => b.onclick = () => { tool = b.dataset.tool; body.querySelectorAll('[data-tool]').forEach((x) => x.classList.toggle('primary', x === b)); });
    body.querySelector('[data-tool="pen"]').classList.add('primary');
    list.onchange = () => { board = userData.boards.find((b) => b.id === list.value); fit(); };
    body.querySelector('#w-new').onclick = () => { const b = { id: MH.uid(), name: 'Board ' + (userData.boards.length + 1), data: '' }; userData.boards.push(b); board = b; saveData(); drawList(); fit(); };
    body.querySelector('#w-del').onclick = () => { if (board && confirmBox(`Delete ${board.name}?`)) { userData.boards = userData.boards.filter((b) => b !== board); board = userData.boards[0]; saveData(); drawList(); fit(); } };
    body.querySelector('#w-png').onclick = () => { const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = (board?.name || 'board') + '.png'; a.click(); };
    body.querySelector('#w-undo').onclick = () => { const prev = history.pop(); if (!prev) return; const im = new Image(); im.onload = () => { c2.clearRect(0, 0, cv.width, cv.height); c2.drawImage(im, 0, 0); persist(); }; im.src = prev; };
    body.querySelector('#w-clear').onclick = () => { history.push(cv.toDataURL()); c2.fillStyle = '#fff'; c2.fillRect(0, 0, cv.width, cv.height); persist(); };
    ctx.winEl.addEventListener('win-resize', () => fit());
    drawList();
    requestAnimationFrame(() => fit());
  },
});

/* ============================ TERMINAL ============================ */
registerApp({
  id: 'terminal', name: 'Terminal', icon: '⌨️', cat: 'Learn', desc: 'A friendly fake shell that can drive the desktop', w: 820, h: 520,
  render(body) {
    body.innerHTML = `<div class="term" id="t-out"></div>`;
    const out = body.querySelector('#t-out');
    const print = (s = '') => { out.insertAdjacentHTML('beforeend', MH.esc(s) + '\n'); out.scrollTop = out.scrollHeight; };
    print('proton terminal — type "help" and press Enter.');
    print(`Signed in as ${currentUser.username} on this device. Everything here is a simulation: no real shell, no network.`);
    function prompt() {
      out.insertAdjacentHTML('beforeend', `<span style="color:#8ee08a">${MH.esc(currentUser.username)}@proton</span>:~$ <input id="t-in" autocomplete="off" spellcheck="false">\n`);
      const inp = body.querySelector('#t-in'); inp.focus();
      out.onclick = () => inp.focus();
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const cmd = inp.value; inp.remove(); print(cmd); run(cmd.trim()); } });
      out.scrollTop = out.scrollHeight;
    }
    function run(raw) {
      const [cmd, ...rest] = raw.split(/\s+/), arg = rest.join(' ');
      const done = () => prompt();
      if (!raw) return done();
      switch (cmd.toLowerCase()) {
        case 'help': print('Commands:\n  help                 this list\n  apps                 list every app\n  open <app-id>        open an app (e.g. open notes)\n  whoami / date / echo <text>\n  math <expression>    e.g. math 12*8+sqrt(81)\n  solve a b c          solve a·x+b=c  →  solve 2 3 11\n  wallpaper <name>     mint|ocean|sunset|grape|slate|rose\n  accent <hex>         e.g. accent #3d7fca\n  notes                how many notes you have\n  clear                clear the terminal\n  about                about this OS'); break;
        case 'apps': print(Object.values(APPS).map((a) => `  ${a.id.padEnd(14)} ${a.icon} ${a.name}`).join('\n')); break;
        case 'open': { const a = APPS[arg.toLowerCase()]; a ? (print(`Opening ${a.name}…`), openApp(a.id)) : print(`No app called "${arg}". Try: apps`); break; }
        case 'whoami': print(`${currentUser.username} — ${currentUser.displayName} (account created ${new Date(currentUser.createdAt).toLocaleString()}, stored only in this browser)`); break;
        case 'date': print(new Date().toString()); break;
        case 'echo': print(arg); break;
        case 'math': try { print(`${arg} = ${fmtNum(evalMath(arg))}`); } catch (err) { print('⚠ ' + err.message); } break;
        case 'solve': { const [a, b, c] = rest.map(Number); print(a ? `x = ${fmtNum((c - b) / a)}` : 'a cannot be 0'); break; }
        case 'wallpaper': if (['mint', 'ocean', 'sunset', 'grape', 'slate', 'rose'].includes(arg)) { userData.settings.wallpaper = arg; saveData(); document.querySelector('.wallpaper').className = 'wallpaper wp-' + arg; print('Wallpaper set to ' + arg); } else print('Unknown wallpaper.'); break;
        case 'accent': if (ACCENTS[arg]) { userData.settings.accent = arg; saveData(); applyAccent(); print('Accent set.'); } else print('Try one of: ' + Object.keys(ACCENTS).join(' ')); break;
        case 'notes': print(`You have ${userData.notes.length} note(s), ${userData.files.length} file(s), ${userData.events.length} event(s) — all saved on this device.`); break;
        case 'about': print('proton — static clone/rebrand of Mixt (proton-arcade/mlp @ arena/170861f7-mlp), AGPL-3.0-only.'); break;
        case 'clear': out.innerHTML = ''; break;
        case 'sudo': print('Nice try 😄 — you already own this whole (browser) computer.'); break;
        default: print(`Unknown command "${cmd}" — type "help".`);
      }
      done();
    }
    prompt();
  },
});

/* ============================ BROWSER ============================ */
registerApp({
  id: 'browser', name: 'Browser', icon: '🌐', cat: 'Learn', desc: 'Built-in pages: welcome, guide & world history (from the original /internet)', w: 940, h: 600,
  render(body) {
    body.innerHTML = `${bar('Browser', `<button class="btn sm" data-page="home">⌂ Home</button><button class="btn sm" data-page="guide">📖 Guide</button><button class="btn sm" data-page="history">🏛 World History</button><button class="btn sm" data-page="maths">Σ Maths resources</button>`)}
    <div class="appbar" style="background:#fff"><span>🔒</span><input id="b-url" type="text" value="proton://home" style="flex:1;padding:7px 10px"><button class="btn sm primary" id="b-go">Go</button></div>
    <div class="app-main" id="b-main"></div>`;
    const main = body.querySelector('#b-main');
    const PAGES = {
      home: `<div class="pad"><h2>Welcome to the (tiny) proton web 🌐</h2><p class="muted">This static site has no server, so the Browser ships with built-in pages — like the original project's bundled sites in <span class="kbd">internet/</span>. Real websites can be opened below too, though many refuse to be embedded.</p>
      <div class="grid-cards"><div class="card"><h3>📖 Guide</h3><p>How this desktop works: accounts, saving, windows, backups.</p><button class="btn primary" data-go="guide">Read the guide</button></div>
      <div class="card"><h3>🏛 World History</h3><p>A short interactive timeline, adapted from the original bundled site.</p><button class="btn primary" data-go="history">Open timeline</button></div>
      <div class="card"><h3>Σ Maths resources</h3><p>Formula reminders and practice ideas.</p><button class="btn primary" data-go="maths">Study up</button></div></div></div>`,
      guide: `<div class="pad" style="max-width:720px"><h2>Guide</h2>
      <details class="help" open><summary>Your account</summary><p>Created on first launch, stored only in this browser (salted SHA-256 password hash). You stay signed in until you sign out. Lock hides the desktop behind your password.</p></details>
      <details class="help"><summary>Windows</summary><p>Drag title bars to move, drag the bottom-right corner to resize, double-click a title bar to maximise. The panel (bottom) shows pinned + running apps; the active app gets a green underline — just like Mixt's Mint-Y panel.</p></details>
      <details class="help"><summary>Saving</summary><p>Notes, files, calendar, contacts, mail, slides, boards, chats and game progress autosave per account. Export a backup in <b>Settings → Backup</b> before clearing browser data.</p></details>
      <details class="help"><summary>Going further</summary><p>Open the Terminal and type <span class="kbd">help</span>, or ask Nova in Team Chat things like “what is 12 × 8?”.</p></details></div>`,
      history: `<div class="pad" style="max-width:760px"><h2>🏛 World History — a pocket timeline</h2><p class="muted">Adapted from the original project's bundled <span class="kbd">internet/world-history</span> site.</p>
      ${[['c. 3000 BCE', 'Writing appears', 'Cuneiform in Mesopotamia and hieroglyphs in Egypt let ideas outlive memory. Mathematics follows: counting, calendars, geometry for land and stars.'],
         ['c. 600 BCE', 'Greek mathematics', 'Thales and Pythagoras turn measurement into proof. The theorem a²+b²=c² still bears Pythagoras’ name — try it in the Solver!'],
         ['820 CE', 'Algebra gets a name', 'Al-Khwārizmī writes “al-Kitāb al-Mukhtaṣar fī Ḥisāb al-Jabr” in Baghdad. “Algorithm” comes from his name.'],
         ['1687', 'Newton’s Principia', 'Calculus and universal gravitation arrive in one book, changing physics forever.'],
         ['1969', 'Apollo 11', 'Humans land on the Moon — guided by mathematics computed partly by human “computers” like Katherine Johnson.'],
         ['Today', 'A desktop in a browser', 'You are reading history inside a static clone of a browser operating system. The timeline continues…']]
        .map(([d, t, b]) => `<div class="card" style="margin-bottom:10px"><span class="chip">${d}</span><h3 style="margin:7px 0 4px">${t}</h3><p style="margin:0">${b}</p></div>`).join('')}</div>`,
      maths: `<div class="pad"><h2>Σ Maths resources</h2><div class="grid-cards">
        <div class="card"><h3>Daily practice</h3><p>20 minutes beats 2 hours once a week. Mix topics: arithmetic, algebra, geometry.</p></div>
        <div class="card"><h3>Show your working</h3><p>Write each step. If you get stuck, the step where it breaks is where the learning is.</p></div>
        <div class="card"><h3>Use the Solver</h3><p>Open <b>Calculator → Solver</b>, solve, then read the “Steps” line and re-derive it yourself.</p><button class="btn primary" id="b-openmath">Open Calculator</button></div>
        <div class="card"><h3>Plot it</h3><p>Unsure what x² − 3x looks like? Graph it, then predict sin(x) before plotting.</p></div></div></div>`,
    };
    function show(page, urlText) {
      body.querySelector('#b-url').value = urlText || `proton://${page}`;
      main.innerHTML = PAGES[page] || PAGES.home;
      main.querySelectorAll('[data-go]').forEach((b) => b.onclick = () => show(b.dataset.go));
      main.querySelector('#b-openmath')?.addEventListener('click', () => openApp('math'));
    }
    function go() {
      const raw = body.querySelector('#b-url').value.trim();
      const page = Object.keys(PAGES).find((p) => raw.toLowerCase().includes(p));
      if (raw.startsWith('proton://') || page) { show(page || 'home', raw); return; }
      const url = /^https?:\/\//i.test(raw) ? raw : 'https://' + raw;
      main.innerHTML = `<div style="display:flex;flex-direction:column;height:100%"><div class="pad muted" style="padding-bottom:6px">Loading <b>${MH.esc(url)}</b> — if it stays blank, that site refuses embedding. <a href="${MH.esc(url)}" target="_blank" rel="noopener">Open in a new tab ↗</a></div><iframe src="${MH.esc(url)}" style="flex:1;border:0;width:100%" title="Web page"></iframe></div>`;
    }
    body.querySelectorAll('[data-page]').forEach((b) => b.onclick = () => show(b.dataset.page));
    body.querySelector('#b-go').onclick = go;
    body.querySelector('#b-url').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    show('home');
  },
});

/* ============================ MEDIA ============================ */
/* Ported behaviour of the original Media app: MP4/MP3 playlist with
 * shuffle/repeat — files are played from your computer, never uploaded. */
registerApp({
  id: 'media', name: 'Media', icon: '🎬', cat: 'Chat & Media', desc: 'Play MP4 video & MP3 audio from this computer', w: 900, h: 580,
  render(body) {
    let items = [], cur = -1, shuffle = false, repeat = 0;
    body.innerHTML = `${bar('Media', `<label class="btn sm primary" style="margin:0">＋ Open MP4 / MP3<input id="md-file" type="file" accept=".mp4,.mp3,audio/mpeg,video/mp4" multiple hidden></label><button class="btn sm" id="md-clear">Clear playlist</button>`)}
    <div class="app-main" style="display:grid;grid-template-columns:1fr 230px;min-height:0">
      <div style="padding:14px;display:flex;flex-direction:column;gap:10px;min-width:0">
        <video id="md-video" controls style="width:100%;max-height:300px;background:#000;border-radius:8px" hidden></video>
        <audio id="md-audio" controls style="width:100%" hidden></audio>
        <div id="md-now" class="card" style="text-align:center;padding:22px">🎬<br><b>No media loaded</b><br><span class="muted">Open MP4 or MP3 files — they play locally and are never uploaded. (Unlike notes &amp; files, media can't be stored in the browser, so the playlist lasts for this session.)</span></div>
        <div style="display:flex;gap:7px;justify-content:center;flex-wrap:wrap">
          <button class="btn" id="md-prev">⏮</button><button class="btn" id="md-play">▶ / ⏸</button><button class="btn" id="md-next">⏭</button>
          <button class="btn" id="md-shuffle" aria-pressed="false">⤮ Shuffle</button><button class="btn" id="md-repeat">↻ Repeat: off</button>
          <label class="muted">Speed <select id="md-speed"><option>0.5</option><option selected>1</option><option>1.5</option><option>2</option></select></label>
        </div><p class="muted" id="md-status" style="text-align:center"></p></div>
      <aside style="border-left:1px solid var(--line);background:#fbfbfa;overflow:auto"><h3 style="padding:12px 12px 4px;margin:0">Playlist</h3><div id="md-list"></div></aside></div>`;
    const video = body.querySelector('#md-video'), audio = body.querySelector('#md-audio');
    const el = () => items[cur]?.kind === 'video' ? video : audio;
    function drawList() {
      body.querySelector('#md-list').innerHTML = items.map((it, i) => `<button class="rowitem ${i === cur ? 'sel' : ''}" data-i="${i}">${it.kind === 'video' ? '🎬' : '🎵'} ${MH.esc(it.name)}</button>`).join('') || '<div class="pad muted">Empty playlist.</div>';
      body.querySelectorAll('#md-list [data-i]').forEach((b) => b.onclick = () => play(+b.dataset.i));
    }
    function play(i) {
      if (!items[i]) return;
      cur = i; const it = items[i];
      video.hidden = it.kind !== 'video'; audio.hidden = it.kind !== 'audio';
      const e = el(); e.src = it.url; e.playbackRate = +body.querySelector('#md-speed').value;
      e.play().catch(() => {});
      body.querySelector('#md-now').innerHTML = `${it.kind === 'video' ? '🎬' : '🎵'}<br><b>${MH.esc(it.name)}</b><br><span class="muted">Track ${i + 1} of ${items.length}</span>`;
      drawList();
    }
    function next(auto) {
      if (!items.length) return;
      if (auto && repeat === 2) { el().currentTime = 0; el().play(); return; }
      let n = shuffle ? Math.floor(Math.random() * items.length) : cur + 1;
      if (n >= items.length) { if (auto && repeat === 0) { body.querySelector('#md-status').textContent = 'End of playlist.'; return; } n = 0; }
      play(n);
    }
    [video, audio].forEach((e) => e.addEventListener('ended', () => next(true)));
    body.querySelector('#md-file').onchange = (e) => {
      for (const f of e.target.files) {
        const kind = f.name.toLowerCase().endsWith('.mp4') ? 'video' : f.name.toLowerCase().endsWith('.mp3') ? 'audio' : null;
        if (kind) items.push({ name: f.name, url: URL.createObjectURL(f), kind });
      }
      drawList(); if (cur < 0 && items.length) play(0);
      body.querySelector('#md-status').textContent = items.length ? `${items.length} item(s) in playlist.` : 'Only .mp4 and .mp3 are supported.';
    };
    body.querySelector('#md-play').onclick = () => { const e = el(); if (!e.src) return; e.paused ? e.play() : e.pause(); };
    body.querySelector('#md-prev').onclick = () => play(Math.max(0, cur - 1));
    body.querySelector('#md-next').onclick = () => next(false);
    body.querySelector('#md-shuffle').onclick = (e) => { shuffle = !shuffle; e.target.setAttribute('aria-pressed', shuffle); e.target.classList.toggle('primary', shuffle); };
    body.querySelector('#md-repeat').onclick = (e) => { repeat = (repeat + 1) % 3; e.target.textContent = '↻ Repeat: ' + ['off', 'all', 'one'][repeat]; };
    body.querySelector('#md-speed').onchange = (e) => { if (el().src) el().playbackRate = +e.target.value; };
    body.querySelector('#md-clear').onclick = () => { items.forEach((i) => URL.revokeObjectURL(i.url)); items = []; cur = -1; video.removeAttribute('src'); audio.removeAttribute('src'); drawList(); };
    drawList();
  },
});

/* ============================ PDF VIEWER ============================ */
registerApp({
  id: 'pdf', name: 'PDF Viewer', icon: '📕', cat: 'Productivity', desc: 'Open & read PDFs from this computer (browser viewer)', w: 900, h: 600,
  render(body) {
    body.innerHTML = `${bar('PDF Viewer', `<label class="btn sm primary" style="margin:0">＋ Open PDF<input id="pdf-file" type="file" accept="application/pdf" hidden></label><span class="muted" id="pdf-name"></span>`)}
    <div class="app-main" id="pdf-main"><div class="pad muted" style="text-align:center;padding-top:60px">📕<br><b>No PDF open</b><br>Choose a PDF from this computer. It is displayed by your browser's built-in viewer and never uploaded anywhere.</div></div>`;
    body.querySelector('#pdf-file').onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      body.querySelector('#pdf-name').textContent = f.name;
      body.querySelector('#pdf-main').innerHTML = `<iframe title="PDF" style="width:100%;height:100%;border:0;min-height:420px" src="${URL.createObjectURL(f)}"></iframe>`;
    };
  },
});

/* ============================ TEAM CHAT ============================ */
registerApp({
  id: 'chat', name: 'Team Chat', icon: '💬', cat: 'Chat & Media', desc: 'Channels with helper Nova — saved on this device', w: 880, h: 560,
  render(body) {
    let channel = 'general';
    body.innerHTML = `${bar('Team Chat')}<div class="split" style="grid-template-columns:190px 1fr">
    <aside class="side">${Object.keys(userData.chat).map((c) => `<button class="rowitem" data-ch="${c}"># ${c}</button>`).join('')}
      <div class="pad muted">Nova the helper bot lives in this browser. Ask maths questions here!</div></aside>
    <div style="display:flex;flex-direction:column;min-height:0"><div class="chat-msgs" id="ch-msgs"></div>
      <form id="ch-form" style="display:flex;gap:7px;padding:10px;background:#fff;border-top:1px solid var(--line)">
      <input id="ch-in" style="flex:1;padding:9px 11px" placeholder="Message #general… try: what is 12 × 8?" maxlength="500" autocomplete="off"><button class="btn primary">Send</button></form></div></div>`;
    function draw() {
      body.querySelectorAll('[data-ch]').forEach((b) => b.classList.toggle('sel', b.dataset.ch === channel));
      const box = body.querySelector('#ch-msgs');
      box.innerHTML = userData.chat[channel].map((m) => `<div class="bubble ${m.me ? 'me' : ''}"><small>${m.me ? 'You' : MH.esc(m.who)} · ${new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>${MH.esc(m.text)}</div>`).join('');
      box.scrollTop = box.scrollHeight;
      body.querySelector('#ch-in').placeholder = `Message #${channel}… try: what is 12 × 8?`;
    }
    function botReply(text) {
      const t = text.toLowerCase();
      let reply = null;
      const solve = t.match(/solve\s+(-?[\d.]+)\s*x\s*\+\s*(-?[\d.]+)\s*=\s*(-?[\d.]+)/);
      const calc = t.match(/(?:what is|calculate|how much is)?\s*([-+*/().\d\s^x]+(?:sqrt\([\d.]+\))?[-+*/().\d\s^x]*)/);
      if (solve) { const [, a, b, c] = solve.map(Number); reply = a === 0 ? 'a can\'t be 0 there!' : `x = ${fmtNum((c - b) / a)}. Steps: ${a}x = ${fmtNum(c)} − ${fmtNum(b)} = ${fmtNum(c - b)}, then divide by ${fmtNum(a)}.`; }
      else if (/\b(hi|hello|hey)\b/.test(t)) reply = `Hi ${currentUser.displayName}! Ask me a maths question, or open Calculator for the full solver & graph plotter.`;
      else if (t.includes('thank')) reply = 'Any time! That\'s what I\'m here for. 📚';
      else if (t.includes('sudoku') || t.includes('chess') || t.includes('game')) reply = 'Games live in the proton menu → Games. Sudoku even saves mid-game. Good luck! 🎲';
      else if (calc && /[+\-*/x×÷^]/.test(t)) {
        try { const expr = t.replace(/what is|calculate|how much is|\?/g, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/x(?=\d|\s*\d)/g, '*'); reply = `That's ${fmtNum(evalMath(expr))}. (I worked it out locally — no cloud harmed.)`; } catch { /* fall through */ }
      }
      if (!reply) reply = ['Great question — I\'m only a tiny on-device bot, but the Calculator app can solve and graph it properly!', 'Noted! 📌 (This chat is saved on this device, by the way.)', 'Interesting! Try me with a calculation, like “what is 45 × 6?”'][Math.floor(Math.random() * 3)];
      setTimeout(() => { userData.chat[channel].push({ id: MH.uid(), who: 'Nova', me: false, text: reply, ts: Date.now() }); saveData(); draw(); }, 550);
    }
    body.querySelectorAll('[data-ch]').forEach((b) => b.onclick = () => { channel = b.dataset.ch; draw(); });
    body.querySelector('#ch-form').onsubmit = (e) => {
      e.preventDefault();
      const inp = body.querySelector('#ch-in'), text = inp.value.trim(); if (!text) return;
      userData.chat[channel].push({ id: MH.uid(), who: currentUser.displayName, me: true, text, ts: Date.now() });
      inp.value = ''; saveData(); draw(); botReply(text);
    };
    draw();
  },
});

/* ============================ MEETINGS ============================ */
registerApp({
  id: 'meetings', name: 'Meetings', icon: '📹', cat: 'Chat & Media', desc: 'Plan meetings with agendas & notes (on-device)', w: 860, h: 540,
  render(body) {
    let sel = null;
    body.innerHTML = `${bar('Meetings', `<button class="btn sm primary" id="mt-new">＋ New meeting</button>`)}
    <div class="split"><aside class="side" id="mt-list"></aside><div class="app-main pad" id="mt-detail"></div></div>`;
    function draw() {
      body.querySelector('#mt-list').innerHTML = [...userData.meetings].sort((a, b) => a.when.localeCompare(b.when)).map((m) => {
        const past = new Date(m.when) < new Date();
        return `<button class="rowitem ${m.id === sel ? 'sel' : ''}" data-id="${m.id}"><span><b>${MH.esc(m.title)}</b><br><span class="muted">${new Date(m.when).toLocaleString()} ${past ? '· past' : ''}</span></span></button>`;
      }).join('') || '<div class="pad muted">No meetings planned.</div>';
      body.querySelectorAll('#mt-list [data-id]').forEach((b) => b.onclick = () => { sel = b.dataset.id; draw(); });
      const m = userData.meetings.find((x) => x.id === sel);
      body.querySelector('#mt-detail').innerHTML = m ? `
        <div class="field"><label>Title</label><input id="mt-title" value="${MH.esc(m.title)}" style="padding:8px;width:100%"></div>
        <div class="field"><label>When</label><input id="mt-when" type="datetime-local" value="${MH.esc(m.when)}" style="padding:8px;width:100%"></div>
        <p class="muted" id="mt-count"></p>
        <div class="field"><label>Agenda</label><textarea id="mt-agenda" rows="5">${MH.esc(m.agenda)}</textarea></div>
        <div class="field"><label>Notes</label><textarea id="mt-notes" rows="5">${MH.esc(m.notes)}</textarea></div>
        <button class="btn primary" id="mt-save">Save meeting</button> <button class="btn" id="mt-del">Delete</button>
        <p class="muted">Video calling needs a server, so this static edition keeps the planner: agenda, notes &amp; countdown. For a call, paste your usual meeting link into the agenda.</p>`
        : '<p class="muted">Select a meeting, or create one.</p>';
      if (m) {
        const upd = () => {
          const diff = new Date(m.when) - new Date(), el = body.querySelector('#mt-count');
          if (!el) return;
          el.textContent = diff < 0 ? 'This meeting is in the past.' : `Starts in ${Math.floor(diff / 864e5)}d ${Math.floor(diff / 36e5) % 24}h ${Math.floor(diff / 6e4) % 60}m — also added as an all-day reminder if you copy it to Calendar.`;
        };
        upd();
        body.querySelector('#mt-save').onclick = () => {
          m.title = body.querySelector('#mt-title').value; m.when = body.querySelector('#mt-when').value;
          m.agenda = body.querySelector('#mt-agenda').value; m.notes = body.querySelector('#mt-notes').value;
          saveData(); draw(); MH.toast('Meeting saved.');
        };
        body.querySelector('#mt-del').onclick = () => { if (confirmBox('Delete this meeting?')) { userData.meetings = userData.meetings.filter((x) => x.id !== m.id); sel = null; saveData(); draw(); } };
      }
    }
    body.querySelector('#mt-new').onclick = () => {
      const m = { id: MH.uid(), title: 'New meeting', when: new Date(Date.now() + 36e5).toISOString().slice(0, 16), agenda: '', notes: '' };
      userData.meetings.push(m); sel = m.id; saveData(); draw();
    };
    draw();
  },
});
