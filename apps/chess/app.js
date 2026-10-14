/* proton app module: chess — edit this file to change this app.
 * Loaded by index.html; calls registerApp() (see apps/README.md). */
'use strict';

/* ============================ CHESS ============================ */
registerApp({
  id: 'chess', name: 'Chess', icon: '♞', cat: 'Games', desc: 'Play vs the computer or a friend on this device', w: 640, h: 700,
  render(body) {
    const GLYPH = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' };
    const VAL = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 100 };
    let b, turn, captured, sel = null, gameOver = false;
    function fresh() {
      const back = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
      b = Array(64).fill('');
      back.forEach((p, i) => { b[i] = 'b' + p; b[56 + i] = 'w' + p; b[8 + i] = 'bP'; b[48 + i] = 'wP'; });
      turn = 'w'; captured = { w: [], b: [] }; sel = null; gameOver = false;
    }
    if (userData.games.chess?.b?.length === 64) ({ b, turn, captured } = userData.games.chess); else fresh();
    body.innerHTML = `${bar('Chess', `<label class="muted"><input type="checkbox" id="ch-ai" checked> Play vs computer (you are White)</label><button class="btn sm primary" id="ch-new">New game</button>`)}
    <div class="app-main"><div class="board8" id="ch-board"></div>
    <p id="ch-status" style="text-align:center;font-weight:600"></p>
    <p class="muted" style="text-align:center" id="ch-cap"></p>
    <p class="muted" style="text-align:center;padding:0 18px 14px">Click a piece, then a highlighted square. Pawns promote to queens automatically. Castling &amp; en passant aren't supported in this static edition.</p></div>`;
    const at = (r, c) => b[r * 8 + c];
    const inB = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
    function moves(i, forAttack = false) {
      const p = b[i]; if (!p) return [];
      const col = p[0], kind = p[1], r = Math.floor(i / 8), c = i % 8, out = [];
      const push = (rr, cc) => { if (!inB(rr, cc)) return false; const t = at(rr, cc); if (!t) { out.push(rr * 8 + cc); return true; } if (t[0] !== col) out.push(rr * 8 + cc); return false; };
      if (kind === 'P') {
        const dir = col === 'w' ? -1 : 1, startRow = col === 'w' ? 6 : 1;
        if (!forAttack) {
          if (inB(r + dir, c) && !at(r + dir, c)) { out.push((r + dir) * 8 + c); if (r === startRow && !at(r + 2 * dir, c)) out.push((r + 2 * dir) * 8 + c); }
        }
        for (const dc of [-1, 1]) if (inB(r + dir, c + dc)) { const t = at(r + dir, c + dc); if (forAttack || (t && t[0] !== col)) out.push((r + dir) * 8 + c + dc); }
      } else if (kind === 'N') { for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) push(r + dr, c + dc); }
      else if (kind === 'K') { for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (dr || dc) push(r + dr, c + dc); }
      else {
        const dirs = kind === 'B' ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : kind === 'R' ? [[-1, 0], [1, 0], [0, -1], [0, 1]] : [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of dirs) { let rr = r + dr, cc = c + dc; while (inB(rr, cc)) { if (!push(rr, cc)) break; rr += dr; cc += dc; } }
      }
      return out.filter((t) => b[t]?.[1] !== 'K'); // never capture a king (b[t] is '' on empty squares)
    }
    const kingAttacked = (col) => {
      const k = b.indexOf(col + 'K'), opp = col === 'w' ? 'b' : 'w';
      return b.some((p, i) => p && p[0] === opp && moves(i, true).includes(k));
    };
    function persist() { userData.games.chess = { b, turn, captured }; saveData(); }
    function draw(msg) {
      const legal = sel !== null ? moves(sel) : [];
      body.querySelector('#ch-board').innerHTML = b.map((p, i) => {
        const r = Math.floor(i / 8), c = i % 8;
        return `<div class="sq ${(r + c) % 2 ? 'd' : 'l'} ${i === sel ? 'sel' : legal.includes(i) ? 'hint' : ''}" data-i="${i}"><span class="${p && p[0] === 'w' ? '' : ''}" style="color:${p?.[0] === 'w' ? '#fff' : '#222'};text-shadow:0 0 3px ${p?.[0] === 'w' ? '#000' : '#fff'},0 2px 3px rgba(0,0,0,.45)">${p ? GLYPH[p[1]] : ''}</span></div>`;
      }).join('');
      body.querySelectorAll('#ch-board .sq').forEach((s) => s.onclick = () => clickSq(+s.dataset.i));
      const check = kingAttacked(turn);
      body.querySelector('#ch-status').textContent = msg || (gameOver ? 'Game over' : `${turn === 'w' ? '⚪ White' : '⚫ Black'} to move${check ? ' — check!' : ''}`);
      body.querySelector('#ch-cap').textContent = `Captured by White: ${captured.w.map((p) => GLYPH[p]).join(' ') || '—'} · by Black: ${captured.b.map((p) => GLYPH[p]).join(' ') || '—'}`;
    }
    function doMove(from, to) {
      const p = b[from], victim = b[to];
      if (victim) captured[p[0]].push(victim[1]);
      b[to] = p; b[from] = '';
      if (p[1] === 'P' && (Math.floor(to / 8) === 0 || Math.floor(to / 8) === 7)) b[to] = p[0] + 'Q';
      turn = turn === 'w' ? 'b' : 'w'; sel = null;
      if (kingAttacked(turn) && !b.some((x, i) => x && x[0] === turn && moves(i).length)) { /* stalemate-ish guard */ }
      persist(); draw();
      const aiOn = body.querySelector('#ch-ai').checked;
      if (aiOn && turn === 'b' && !gameOver) setTimeout(aiMove, 420);
    }
    function aiMove() {
      const options = [];
      b.forEach((p, i) => { if (p?.[0] === 'b') for (const t of moves(i)) options.push({ from: i, to: t, score: (b[t] ? VAL[b[t][1]] * 10 : 0) + Math.random() * 4 - (VAL[p[1]] < 3 && b[t] ? 0 : 0) }); });
      if (!options.length) { gameOver = true; draw('No legal moves for Black — game over.'); return; }
      options.sort((a, z) => z.score - a.score);
      const pick = options[Math.floor(Math.random() * Math.min(3, options.length))];
      doMove(pick.from, pick.to);
      if (kingAttacked('w')) draw('Black moved — your king is in check!');
    }
    function clickSq(i) {
      if (gameOver) return;
      const aiOn = body.querySelector('#ch-ai').checked;
      if (aiOn && turn === 'b') return;
      if (sel !== null && moves(sel).includes(i)) { doMove(sel, i); return; }
      sel = b[i] && b[i][0] === turn ? i : null; draw();
    }
    body.querySelector('#ch-new').onclick = () => { fresh(); persist(); draw('New game — White to move.'); };
    draw();
  },
});
