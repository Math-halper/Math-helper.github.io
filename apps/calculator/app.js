/* proton app module: calculator — edit this file to change this app.
 * Loaded by index.html; calls registerApp() (see apps/README.md). */
'use strict';

/* ============================ MATH HELPER ============================ */
registerApp({
  id: 'math', name: 'Calculator', icon: 'calculator', cat: 'Learn', desc: 'Calculator, equation solver, graph plotter & formulas', w: 880, h: 600,
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
        <div class="calc-grid">${['C', 'Del', '(', ')', '7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', '%', '+', '√(', 'x²', 'π', '='].map((k) =>
          `<button data-k="${k}" class="${k === '=' ? 'eq' : '+-/*%'.includes(k) || '()√π'.includes(k) ? 'op' : ''}">${k === '*' ? '×' : k === '/' ? '÷' : k}</button>`).join('')}</div>
        <p class="muted" style="text-align:center">Keyboard works too. Try <span class="kbd">(3+4)*5</span>, <span class="kbd">sqrt(144)</span>, <span class="kbd">2^10</span></p></div>`;
        const disp = main.querySelector('#c-disp');
        const upd = () => disp.textContent = expr || '0';
        main.querySelectorAll('[data-k]').forEach((b) => b.onclick = () => {
          const k = b.dataset.k;
          if (k === 'C') expr = '';
          else if (k === 'Del') expr = expr.slice(0, -1);
          else if (k === 'x²') expr += '^2';
          else if (k === 'π') expr += 'pi';
          else if (k === '=') { try { expr = fmtNum(evalMath(expr || '0')); } catch (e) { disp.textContent = 'Error: ' + e.message; return; } }
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
          <button class="btn primary" id="g-go">${iconSvg('chart')} Plot</button></div>
          <p class="muted" id="g-msg">Examples: <span class="kbd">sin(x)</span> · <span class="kbd">x^3-2*x</span> · <span class="kbd">sqrt(abs(x))</span> · <span class="kbd">2^x</span></p>
          <canvas id="g-cv" width="760" height="380" style="width:100%;background:#111;border:1px solid var(--line);border-radius:8px"></canvas></div>`;
        const plot = () => {
          const cv = main.querySelector('#g-cv'), ctx = cv.getContext('2d');
          const min = parseFloat(main.querySelector('#g-min').value), max = parseFloat(main.querySelector('#g-max').value);
          const W = cv.width, H = cv.height;
          let vals = [], lo = Infinity, hi = -Infinity;
          for (let i = 0; i <= W; i++) {
            const x = min + (max - min) * i / W;
            try { const y = evalMath(main.querySelector('#g-f').value, x); vals.push(y); if (Math.abs(y) < 1e7) { lo = Math.min(lo, y); hi = Math.max(hi, y); } } catch { vals.push(NaN); }
          }
          if (!Number.isFinite(lo)) { main.querySelector('#g-msg').textContent = 'Could not evaluate that function on this range.'; return; }
          const pad = (hi - lo) * 0.12 || 1; lo -= pad; hi += pad;
          const X = (x) => (x - min) / (max - min) * W, Y = (y) => H - (y - lo) / (hi - lo) * H;
          ctx.clearRect(0, 0, W, H);
          ctx.strokeStyle = '#2b2b2b'; ctx.fillStyle = '#aaa'; ctx.font = '11px system-ui';
          for (let gx = Math.ceil(min); gx <= max; gx++) { ctx.beginPath(); ctx.moveTo(X(gx), 0); ctx.lineTo(X(gx), H); ctx.stroke(); ctx.fillText(gx, X(gx) + 3, Y(0) - 4 < 12 ? 12 : Y(0) - 4); }
          ctx.strokeStyle = '#555'; ctx.beginPath(); ctx.moveTo(0, Y(0)); ctx.lineTo(W, Y(0)); ctx.moveTo(X(0), 0); ctx.lineTo(X(0), H); ctx.stroke();
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
