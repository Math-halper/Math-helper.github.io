/* proton app module: checkers — edit this file to change this app.
 * Loaded by index.html; calls registerApp() (see apps/README.md). */
'use strict';

/* ============================ CHECKERS ============================ */
registerApp({
  id: 'checkers', name: 'Checkers', icon: '🔴', cat: 'Games', desc: 'Red vs Black — jump to capture, reach the end to king', w: 620, h: 680,
  render(body) {
    let b, turn, sel = null;
    function fresh() {
      b = Array(64).fill('');
      for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2) b[r * 8 + c] = 'b';
      for (let r = 5; r < 8; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2) b[r * 8 + c] = 'r';
      turn = 'r'; sel = null;
    }
    fresh();
    body.innerHTML = `${bar('Checkers', `<label class="muted"><input type="checkbox" id="ck-ai" checked> Play vs computer (you are Red)</label><button class="btn sm primary" id="ck-new">New game</button>`)}
    <div class="app-main"><div class="board8" id="ck-board"></div><p id="ck-status" style="text-align:center;font-weight:600"></p>
    <p class="muted" style="text-align:center;padding:0 18px 14px">Click your piece, then a highlighted square. Jumps capture the piece in between; reach the far row to become a ♛ king (moves both ways).</p></div>`;
    const at = (r, c) => (r < 0 || r > 7 || c < 0 || c > 7) ? 'x' : b[r * 8 + c];
    const isKing = (p) => p === 'R' || p === 'B';
    const colOf = (p) => p.toLowerCase();
    function movesFor(i) {
      const p = b[i]; if (!p) return { steps: [], jumps: [] };
      const r = Math.floor(i / 8), c = i % 8, col = colOf(p);
      const dirs = isKing(p) ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : col === 'r' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
      const steps = [], jumps = [];
      for (const [dr, dc] of dirs) {
        if (!at(r + dr, c + dc)) steps.push((r + dr) * 8 + (c + dc));
        const mid = at(r + dr, c + dc);
        if (mid && mid !== 'x' && colOf(mid) !== col && !at(r + 2 * dr, c + 2 * dc)) jumps.push({ to: (r + 2 * dr) * 8 + (c + 2 * dc), over: (r + dr) * 8 + (c + dc) });
      }
      return { steps, jumps };
    }
    const allMoves = (col) => {
      const out = [];
      b.forEach((p, i) => { if (p && colOf(p) === col) { const m = movesFor(i); m.jumps.forEach((j) => out.push({ from: i, ...j, jump: true })); m.steps.forEach((t) => out.push({ from: i, to: t })); } });
      return out.some((m) => m.jump) ? out.filter((m) => m.jump) : out; // captures are compulsory
    };
    function draw(msg) {
      const mine = sel !== null ? movesFor(sel) : { steps: [], jumps: [] };
      body.querySelector('#ck-board').innerHTML = b.map((p, i) => {
        const r = Math.floor(i / 8), c = i % 8, dark = (r + c) % 2 === 1;
        const target = mine.steps.includes(i) || mine.jumps.some((j) => j.to === i);
        return `<div class="sq ${dark ? 'ckr-d' : 'ckr-l'} ${i === sel ? 'sel' : target ? 'hint' : ''}" data-i="${i}" style="${dark ? 'background:#a05248' : ''}"><span class="${p ? (colOf(p) === 'r' ? 'piece-r' : 'piece-b') : ''}" style="font-size:30px">${p ? (isKing(p) ? '♛' : '●') : ''}</span></div>`;
      }).join('');
      body.querySelectorAll('#ck-board .sq').forEach((s) => s.onclick = () => clickSq(+s.dataset.i));
      const left = { r: b.filter((p) => p && colOf(p) === 'r').length, b: b.filter((p) => p && colOf(p) === 'b').length };
      body.querySelector('#ck-status').textContent = msg || (left.r === 0 ? '⚫ Black wins!' : left.b === 0 ? '🔴 Red wins!' : `${turn === 'r' ? '🔴 Red' : '⚫ Black'} to move · Red ${left.r} — Black ${left.b}`);
    }
    function doMove(m) {
      let p = b[m.from];
      if (m.jump) b[m.over] = '';
      b[m.to] = p; b[m.from] = '';
      const r = Math.floor(m.to / 8);
      if (p === 'r' && r === 0) b[m.to] = 'R';
      if (p === 'b' && r === 7) b[m.to] = 'B';
      turn = turn === 'r' ? 'b' : 'r'; sel = null; draw();
      if (body.querySelector('#ck-ai').checked && turn === 'b') setTimeout(() => { const opts = allMoves('b'); if (opts.length) { const pick = opts.find((o) => o.jump) || opts[Math.floor(Math.random() * opts.length)]; /* apply without recursing */ let p2 = b[pick.from]; if (pick.jump) b[pick.over] = ''; b[pick.to] = p2; b[pick.from] = ''; if (p2 === 'b' && Math.floor(pick.to / 8) === 7) b[pick.to] = 'B'; turn = 'r'; draw(); } }, 450);
    }
    function clickSq(i) {
      if (body.querySelector('#ck-ai').checked && turn === 'b') return;
      if (sel !== null) {
        const m = movesFor(sel), jump = m.jumps.find((j) => j.to === i);
        const forced = allMoves(turn).some((x) => x.jump);
        if (jump) return doMove({ from: sel, ...jump, jump: true });
        if (!forced && m.steps.includes(i)) return doMove({ from: sel, to: i });
      }
      sel = b[i] && colOf(b[i]) === turn ? i : null; draw(allMoves(turn).some((x) => x.jump) && b[i] && colOf(b[i]) === turn ? 'A capture is available — jumps are compulsory.' : undefined);
    }
    body.querySelector('#ck-new').onclick = () => { fresh(); draw('New game — Red to move.'); };
    draw();
  },
});
