/* Math Helper OS — games: Sudoku, Chess, Checkers, Klondike, Backgammon,
 * plus G-Talk (direct chat). Sudoku generation/checking is adapted from the
 * original src/apps/sudoku/logic.js; checker/chess/solitaire/backgammon
 * movement follows the original apps' rules in browser-only form.
 * Ends with the boot sequence. AGPL-3.0-only.
 */
'use strict';

/* ============================ SUDOKU ============================ */
/* Adapted from proton-arcade/mlp src/apps/sudoku/logic.js (pure functions). */
const SudokuLogic = (() => {
  const shuffled = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const canPlace = (g, r, c, n) => {
    for (let i = 0; i < 9; i++) if (g[r][i] === n || g[i][c] === n) return false;
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (g[br + i][bc + j] === n) return false;
    return true;
  };
  function solve(g) {
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      if (g[r][c]) continue;
      for (const n of shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9])) if (canPlace(g, r, c, n)) { g[r][c] = n; if (solve(g)) return true; g[r][c] = 0; }
      return false;
    }
    return true;
  }
  function generate(diff = 'medium') {
    const solution = Array.from({ length: 9 }, () => Array(9).fill(0)); solve(solution);
    const puzzle = solution.map((r) => r.slice());
    let remove = { easy: 36, medium: 46, hard: 54 }[diff] ?? 46;
    for (const idx of shuffled([...Array(81).keys()])) { if (!remove) break; puzzle[Math.floor(idx / 9)][idx % 9] = 0; remove--; }
    return { puzzle, solution };
  }
  function conflicts(g) {
    const bad = new Set();
    const mark = (cells) => { const seen = new Map(); for (const [r, c] of cells) { const v = g[r][c]; if (!v) continue; if (seen.has(v)) { bad.add(r + ',' + c); bad.add(seen.get(v)); } else seen.set(v, r + ',' + c); } };
    for (let i = 0; i < 9; i++) {
      mark([...Array(9).keys()].map((c) => [i, c])); mark([...Array(9).keys()].map((r) => [r, i]));
      const br = Math.floor(i / 3) * 3, bc = (i % 3) * 3;
      mark([...Array(9).keys()].map((k) => [br + Math.floor(k / 3), bc + (k % 3)]));
    }
    return bad;
  }
  return { generate, conflicts };
})();

registerApp({
  id: 'sudoku', name: 'Sudoku', icon: '🔢', cat: 'Games', desc: 'Generated puzzles, 3 difficulties, progress saved', w: 620, h: 660,
  render(body) {
    let g = userData.games.sudoku;
    if (!g) { const { puzzle, solution } = SudokuLogic.generate('medium'); g = userData.games.sudoku = { puzzle, solution, grid: puzzle.map((r) => r.slice()), diff: 'medium' }; saveData(); }
    body.innerHTML = `${bar('Sudoku', `<select id="s-diff"><option>easy</option><option>medium</option><option>hard</option></select><button class="btn sm primary" id="s-new">New game</button><button class="btn sm" id="s-check">Check</button><button class="btn sm" id="s-hint">Hint</button><button class="btn sm" id="s-solve">Solve</button>`)}
    <div class="app-main"><div class="sudoku" id="s-grid"></div><p class="muted" id="s-msg" style="text-align:center;padding:0 16px 14px"></p></div>`;
    body.querySelector('#s-diff').value = g.diff;
    function draw(msg = '') {
      const bad = SudokuLogic.conflicts(g.grid);
      body.querySelector('#s-grid').innerHTML = g.grid.map((row, r) => row.map((v, c) =>
        `<input data-r="${r}" data-c="${c}" inputmode="numeric" maxlength="1" value="${v || ''}" ${g.puzzle[r][c] ? 'disabled class="given"' : ''} class="${g.puzzle[r][c] ? 'given' : bad.has(r + ',' + c) ? 'bad' : ''}" aria-label="Row ${r + 1} column ${c + 1}">`).join('')).join('');
      body.querySelectorAll('#s-grid input:not([disabled])').forEach((inp) => inp.addEventListener('input', () => {
        const v = inp.value.replace(/[^1-9]/g, '');
        inp.value = v; g.grid[+inp.dataset.r][+inp.dataset.c] = v ? +v : 0; saveData();
        if (g.grid.every((row, r) => row.every((x, c) => x === g.solution[r][c]))) body.querySelector('#s-msg').textContent = '🎉 Solved — brilliant! Start a new game for another.';
        else drawSoft();
      }));
      body.querySelector('#s-msg').textContent = msg;
    }
    function drawSoft() { // refresh conflict colours without stealing focus
      const bad = SudokuLogic.conflicts(g.grid), active = document.activeElement;
      body.querySelectorAll('#s-grid input').forEach((inp) => { if (inp !== active) inp.classList.toggle('bad', bad.has(inp.dataset.r + ',' + inp.dataset.c)); });
    }
    body.querySelector('#s-new').onclick = () => {
      const diff = body.querySelector('#s-diff').value, { puzzle, solution } = SudokuLogic.generate(diff);
      g = userData.games.sudoku = { puzzle, solution, grid: puzzle.map((r) => r.slice()), diff }; saveData(); draw('New ' + diff + ' puzzle. Good luck!');
    };
    body.querySelector('#s-check').onclick = () => {
      const bad = SudokuLogic.conflicts(g.grid);
      draw(bad.size ? `⚠ ${bad.size} cell(s) clash with another number (highlighted).` : 'No clashes so far — keep going!');
    };
    body.querySelector('#s-hint').onclick = () => {
      const empty = []; g.grid.forEach((row, r) => row.forEach((v, c) => { if (v !== g.solution[r][c]) empty.push([r, c]); }));
      if (!empty.length) return;
      const [r, c] = empty[Math.floor(Math.random() * empty.length)];
      g.grid[r][c] = g.solution[r][c]; saveData(); draw(`Hint placed at row ${r + 1}, column ${c + 1}.`);
    };
    body.querySelector('#s-solve').onclick = () => { g.grid = g.solution.map((r) => r.slice()); saveData(); draw('Solved for you — try a fresh puzzle!'); };
    draw('Your game autosaves. Dark cells are the givens.');
  },
});

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

/* ============================ KLONDIKE ============================ */
registerApp({
  id: 'klondike', name: 'Klondike', icon: '🃏', cat: 'Games', desc: 'Classic solitaire — click to select & move cards', w: 960, h: 620,
  render(body) {
    const SUITS = [['♠', 0], ['♥', 1], ['♦', 1], ['♣', 0]]; // [glyph, isRed]
    const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    let stock, waste, foundations, tableau, selected = null, moves = 0;
    function fresh() {
      const deck = [];
      SUITS.forEach(([s, red], si) => RANKS.forEach((r, ri) => deck.push({ s, red: !!red, r: ri + 1, label: r + s, up: false })));
      for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
      tableau = Array.from({ length: 7 }, (_, col) => deck.splice(0, col + 1).map((card, i, arr) => ({ ...card, up: i === arr.length - 1 })));
      stock = deck; waste = []; foundations = [[], [], [], []]; selected = null; moves = 0;
    }
    fresh();
    body.innerHTML = `${bar('Klondike Solitaire', `<button class="btn sm primary" id="k-new">New game</button><button class="btn sm" id="k-auto">Auto → foundations</button><span class="muted" id="k-info" style="margin-left:auto"></span>`)}
    <div class="app-main pad"><div class="cards-row" id="k-top"></div><h3>Tableau</h3><div class="cards-row" id="k-tab" style="align-items:flex-start"></div>
    <p class="muted">Click the stock to draw. Click a card (or stack) to select it, then click where it should go. Double-click a top card to send it to a foundation. Build foundations A→K by suit; tableau builds down in alternating colours; only Kings fill empty columns.</p></div>`;
    const cardHTML = (card, selFlag, attrs = '') => card.up
      ? `<div class="playcard ${card.red ? 'red' : ''} ${selFlag ? 'sel' : ''}" ${attrs}>${card.label}</div>`
      : `<div class="playcard back" ${attrs}>🂠</div>`;
    function pileCards(selTest) {
      // selection test: ({type, pile, idx}) => bool
      return '';
    }
    function draw(msg = '') {
      body.querySelector('#k-info').textContent = `Moves: ${moves} · In foundations: ${foundations.flat().length}/52 ${foundations.flat().length === 52 ? '🎉 YOU WIN!' : ''} ${msg}`;
      const top = body.querySelector('#k-top');
      top.innerHTML = `
        <div><div class="muted" style="text-align:center">Stock</div><div class="pile" id="k-stock">${stock.length ? cardHTML({ ...stock[stock.length - 1], up: false }) : '<div style="padding:38px 8px;text-align:center">↺</div>'}</div></div>
        <div><div class="muted" style="text-align:center">Waste</div><div class="pile" id="k-waste">${waste.length ? cardHTML(waste[waste.length - 1], selected?.type === 'waste') : ''}</div></div>
        ${foundations.map((f, i) => `<div><div class="muted" style="text-align:center">${SUITS[i][0]} Foundation</div><div class="pile" data-found="${i}">${f.length ? cardHTML(f[f.length - 1], selected?.type === 'found' && selected.pile === i) : `<div style="padding:38px 8px;text-align:center;color:#999">${SUITS[i][0]} A→K</div>`}</div></div>`).join('')}`;
      body.querySelector('#k-tab').innerHTML = tableau.map((pile, pi) => `
        <div><div class="muted" style="text-align:center">Column ${pi + 1}</div><div class="pile" data-tab="${pi}" style="min-height:${106 + Math.max(0, pile.length - 1) * 26}px">
        ${pile.map((card, ci) => cardHTML(card, selected?.type === 'tab' && selected.pile === pi && ci >= selected.idx, `data-tabcard="${pi}:${ci}"`)).join('') || '<div style="padding:38px 4px;text-align:center;color:#999">K only</div>'}</div></div>`).join('');
      top.querySelector('#k-stock').onclick = () => {
        if (stock.length) { const c = stock.pop(); c.up = true; waste.push(c); }
        else { stock = waste.reverse().map((c) => ({ ...c, up: false })); waste = []; }
        selected = null; draw();
      };
      top.querySelector('#k-waste').onclick = () => trySelectOrPlace({ type: 'waste' });
      top.querySelectorAll('[data-found]').forEach((el) => el.onclick = () => trySelectOrPlace({ type: 'found', pile: +el.dataset.found }));
      body.querySelectorAll('[data-tab]').forEach((el) => {
        el.onclick = (e) => {
          const cardEl = e.target.closest('[data-tabcard]');
          if (cardEl) { const [pi, ci] = cardEl.dataset.tabcard.split(':').map(Number); if (tableau[pi][ci].up) { trySelectOrPlace({ type: 'tab', pile: pi, idx: ci }); return; } }
          trySelectOrPlace({ type: 'tab', pile: +el.dataset.tab, idx: tableau[+el.dataset.tab].length });
        };
      });
      body.querySelectorAll('[data-tabcard]').forEach((el) => el.ondblclick = () => { const [pi, ci] = el.dataset.tabcard.split(':').map(Number); autoOne({ type: 'tab', pile: pi, idx: ci }); });
      top.querySelector('#k-waste').ondblclick = () => autoOne({ type: 'waste' });
    }
    function getCards(sel) {
      if (!sel) return [];
      if (sel.type === 'waste') return waste.length ? [waste[waste.length - 1]] : [];
      if (sel.type === 'found') { const f = foundations[sel.pile]; return f.length ? [f[f.length - 1]] : []; }
      return tableau[sel.pile].slice(sel.idx);
    }
    function removeCards(sel) {
      if (sel.type === 'waste') waste.pop();
      else if (sel.type === 'found') foundations[sel.pile].pop();
      else { tableau[sel.pile].splice(sel.idx); const pile = tableau[sel.pile]; if (pile.length) pile[pile.length - 1].up = true; }
    }
    function canPlace(cards, dest) {
      if (!cards.length) return false;
      const first = cards[0];
      if (dest.type === 'found') {
        if (cards.length !== 1) return false;
        const f = foundations[dest.pile];
        const suitIdx = SUITS.findIndex(([s]) => s === first.s);
        if (dest.pile !== suitIdx) return false;
        return f.length === 0 ? first.r === 1 : f[f.length - 1].r === first.r - 1;
      }
      if (dest.type === 'tab') {
        const pile = tableau[dest.pile];
        if (!pile.length) return first.r === 13;
        const topCard = pile[pile.length - 1];
        return topCard.up && topCard.red !== first.red && topCard.r === first.r + 1;
      }
      return false;
    }
    function trySelectOrPlace(dest) {
      if (!selected) {
        if (dest.type === 'waste' && waste.length) selected = { type: 'waste' };
        else if (dest.type === 'found' && foundations[dest.pile].length) selected = { type: 'found', pile: dest.pile };
        else if (dest.type === 'tab' && dest.idx < tableau[dest.pile].length) selected = dest;
        draw(); return;
      }
      if (selected.type === dest.type && selected.pile === dest.pile) { selected = null; draw(); return; }
      const cards = getCards(selected);
      if (canPlace(cards, dest)) {
        removeCards(selected);
        if (dest.type === 'found') foundations[dest.pile].push(...cards); else tableau[dest.pile].push(...cards);
        moves++; selected = null; draw(foundations.flat().length === 52 ? '🎉' : '');
      } else { // reselect instead
        selected = (dest.type === 'tab' && dest.idx < tableau[dest.pile].length) ? dest : (dest.type === 'waste' ? { type: 'waste' } : selected);
        draw('That card can\'t go there.');
      }
    }
    function autoOne(sel) {
      const cards = getCards(sel); if (cards.length !== 1) return;
      const si = SUITS.findIndex(([s]) => s === cards[0].s);
      if (canPlace(cards, { type: 'found', pile: si })) { removeCards(sel); foundations[si].push(cards[0]); moves++; selected = null; draw(); }
    }
    body.querySelector('#k-new').onclick = () => { fresh(); draw('Shuffled. Good luck!'); };
    body.querySelector('#k-auto').onclick = () => {
      let moved = true, guard = 0;
      while (moved && guard++ < 60) {
        moved = false;
        if (waste.length) { const before = foundations.flat().length; autoOne({ type: 'waste' }); if (foundations.flat().length > before) moved = true; }
        tableau.forEach((pile, pi) => { if (pile.length) { const before = foundations.flat().length; autoOne({ type: 'tab', pile: pi, idx: pile.length - 1 }); if (foundations.flat().length > before) moved = true; } });
      }
      draw();
    };
    draw('Click the stock to draw a card.');
  },
});

/* ============================ BACKGAMMON (practice board) ============================ */
registerApp({
  id: 'backgammon', name: 'Backgammon', icon: '🎲', cat: 'Games', desc: 'Practice board: dice, moves, hits & bearing off', w: 940, h: 640,
  render(body) {
    let pts, dice, used, turn, onBar, off;
    function fresh() {
      pts = Array.from({ length: 24 }, () => ({ c: '', n: 0 }));
      const set = (i, c, n) => pts[i] = { c, n };
      set(0, 'w', 2); set(11, 'w', 5); set(16, 'w', 3); set(18, 'w', 5);
      set(23, 'b', 2); set(12, 'b', 5); set(7, 'b', 3); set(5, 'b', 5);
      dice = []; used = []; turn = 'w'; onBar = { w: 0, b: 0 }; off = { w: 0, b: 0 };
    }
    fresh();
    let sel = null;
    body.innerHTML = `${bar('Backgammon — practice', `<button class="btn sm primary" id="bg-roll">🎲 Roll dice</button><button class="btn sm" id="bg-new">New game</button><span class="muted" id="bg-dice" style="margin-left:auto"></span>`)}
    <div class="app-main pad"><div id="bg-board"></div><p id="bg-status" style="font-weight:600"></p>
    <p class="muted">White (●) moves 0 → 23, Black (●) moves 23 → 0. Roll, click one of your points, then click a highlighted destination. Landing on a single opponent checker hits it to the bar; points with 2+ opponents are blocked. Bear off from your home quarter (White 18–23, Black 0–5) once all your checkers are home. This is a relaxed practice board — doubles give two moves here.</p></div>`;
    const home = (c) => c === 'w' ? pts.slice(18).reduce((s, p) => s + (p.c === 'w' ? p.n : 0), 0) + off.w === 15 && onBar.w === 0 : pts.slice(0, 6).reduce((s, p) => s + (p.c === 'b' ? p.n : 0), 0) + off.b === 15 && onBar.b === 0;
    function dests(from) {
      if (onBar[turn] > 0 && from !== -1) return [];
      const remaining = dice.filter((d, i) => !used.includes(i));
      const out = [];
      for (const d of remaining) {
        const to = from === -1 ? (turn === 'w' ? d - 1 : 24 - d) : from + (turn === 'w' ? d : -d);
        if (to > 23 || to < 0) { if (from >= 0 && home(turn)) out.push({ to: 99, die: d }); continue; }
        const p = pts[to];
        if (!p.n || p.c === turn || p.n === 1) out.push({ to, die: d });
      }
      return out;
    }
    function draw(msg = '') {
      const renderPt = (i) => {
        const p = pts[i], ds = sel !== null ? dests(sel) : [];
        const isDest = ds.some((d) => d.to === i);
        return `<button data-pt="${i}" style="min-height:74px;border:1px solid var(--line);border-radius:6px;background:${i % 2 ? '#e8dcc3' : '#f5efe0'};${isDest ? 'outline:3px solid var(--accent);' : ''}${sel === i ? 'outline:3px solid #3d7fca;' : ''}padding:4px">
          <small style="color:#888">${i}</small><br><span style="font-size:19px;color:${p.c === 'w' ? '#fff' : '#222'};text-shadow:0 0 3px #000">${p.n ? '●'.repeat(Math.min(p.n, 5)) : ''}</span>${p.n > 5 ? `<br><small>×${p.n}</small>` : ''}</button>`;
      };
      body.querySelector('#bg-board').innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(12,1fr);gap:4px">${[11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map(renderPt).join('')}</div>
        <div style="display:flex;justify-content:space-between;padding:7px 2px" class="muted"><span>⚪ Bar: ${onBar.w} · Borne off: ${off.w}/15</span><span>${turn === 'w' ? '⚪ White' : '⚫ Black'} to move</span><span>⚫ Bar: ${onBar.b} · Borne off: ${off.b}/15</span></div>
        <div style="display:grid;grid-template-columns:repeat(12,1fr);gap:4px">${[12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].map(renderPt).join('')}</div>
        ${onBar[turn] > 0 ? '<button class="btn primary" id="bg-bar" style="margin-top:9px">Enter from bar (select, then click destination)</button>' : ''}
        ${sel !== null && dests(sel).some((d) => d.to === 99) ? '<button class="btn primary" id="bg-off" style="margin-top:9px;margin-left:7px">Bear off selected checker</button>' : ''}`;
      body.querySelector('#bg-dice').textContent = dice.length ? `Dice: ${dice.map((d, i) => used.includes(i) ? `(${d} used)` : d).join(' · ')}` : 'Roll to start';
      body.querySelector('#bg-status').textContent = off.w === 15 ? '⚪ White wins! 🎉' : off.b === 15 ? '⚫ Black wins! 🎉' : msg || (dice.length && used.length >= dice.length ? 'Out of moves — roll for the next player.' : '');
      body.querySelectorAll('[data-pt]').forEach((el) => el.onclick = () => clickPt(+el.dataset.pt));
      body.querySelector('#bg-bar')?.addEventListener('click', () => { sel = -1; draw('Choose where to enter from the bar.'); });
      body.querySelector('#bg-off')?.addEventListener('click', () => {
        const d = dests(sel).find((x) => x.to === 99); if (!d) return;
        pts[sel].n--; if (!pts[sel].n) pts[sel].c = '';
        off[turn]++; used.push(dice.indexOf(d.die)); sel = null; afterMove();
      });
    }
    function afterMove() {
      draw();
      if (dice.length && used.length >= dice.length) { turn = turn === 'w' ? 'b' : 'w'; dice = []; used = []; sel = null; setTimeout(() => draw(`Now ${turn === 'w' ? '⚪ White' : '⚫ Black'} — roll the dice.`), 350); }
    }
    function clickPt(i) {
      if (!dice.length) { draw('Roll the dice first.'); return; }
      if (sel !== null) {
        const d = dests(sel).find((x) => x.to === i);
        if (d) {
          if (sel === -1) onBar[turn]--; else { pts[sel].n--; if (!pts[sel].n) pts[sel].c = ''; }
          const p = pts[i];
          if (p.n === 1 && p.c !== turn) { onBar[p.c]++; pts[i] = { c: turn, n: 1 }; }
          else if (p.n && p.c === turn) p.n++;
          else pts[i] = { c: turn, n: 1 };
          used.push(dice.indexOf(d.die)); sel = null; afterMove(); return;
        }
      }
      if (onBar[turn] > 0) { draw('You have a checker on the bar — enter it first.'); return; }
      sel = pts[i].c === turn ? i : null; draw();
    }
    body.querySelector('#bg-roll').onclick = () => {
      if (dice.length && used.length < dice.length) { draw('Use your current dice first.'); return; }
      dice = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]; used = []; sel = onBar[turn] > 0 ? -1 : null;
      draw(`Rolled ${dice.join(' + ')}. ${onBar[turn] ? 'Enter from the bar first.' : 'Pick a point to move.'}`);
    };
    body.querySelector('#bg-new').onclick = () => { fresh(); sel = null; draw('New game — White rolls first.'); };
    draw('White rolls first.');
  },
});

/* ============================ G-TALK ============================ */
registerApp({
  id: 'gtalk', name: 'G-Talk', icon: '📞', cat: 'Chat & Media', desc: 'Direct chat with Nova (calls are simulated on-device)', w: 760, h: 540,
  render(body) {
    if (!userData.chat.direct) { userData.chat.direct = [{ id: MH.uid(), who: 'Nova', me: false, text: 'This is our direct line. Team Chat has the group channels — here it\'s just us. Ask me maths!', ts: Date.now() }]; saveData(); }
    body.innerHTML = `${bar('G-Talk — Nova', `<span class="chip">● on this device</span><button class="btn sm" id="gt-call">📹 Video call</button>`)}
    <div style="display:flex;flex-direction:column;min-height:0;flex:1"><div class="chat-msgs" id="gt-msgs"></div>
    <form id="gt-form" style="display:flex;gap:7px;padding:10px;background:#fff;border-top:1px solid var(--line)"><input id="gt-in" style="flex:1;padding:9px 11px" placeholder="Message Nova…" maxlength="500" autocomplete="off"><button class="btn primary">Send</button></form></div>`;
    const box = body.querySelector('#gt-msgs');
    const draw = () => { box.innerHTML = userData.chat.direct.map((m) => `<div class="bubble ${m.me ? 'me' : ''}"><small>${m.me ? 'You' : 'Nova'} · ${new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>${MH.esc(m.text)}</div>`).join(''); box.scrollTop = box.scrollHeight; };
    body.querySelector('#gt-call').onclick = () => MH.toast('📹 Simulated call: real video needs a server, so Nova waves at you from this browser instead. 👋');
    body.querySelector('#gt-form').onsubmit = (e) => {
      e.preventDefault();
      const inp = body.querySelector('#gt-in'), text = inp.value.trim(); if (!text) return;
      userData.chat.direct.push({ id: MH.uid(), who: currentUser.displayName, me: true, text, ts: Date.now() }); inp.value = ''; saveData(); draw();
      setTimeout(() => {
        let r = 'Tell me more! Or feed me an expression like 12*8 and I\'ll crunch it.';
        const m = text.toLowerCase().match(/[-+*/().\d\s^x]+/);
        if (/^(hi|hello|hey)\b/i.test(text)) r = `Hello ${currentUser.displayName}! Lovely to chat one-to-one.`;
        else if (m && /[+\-*/x×]/.test(text)) { try { r = `That's ${fmtNum(evalMath(text.toLowerCase().replace(/×/g, '*')))}.`; } catch { /* keep default */ } }
        userData.chat.direct.push({ id: MH.uid(), who: 'Nova', me: false, text: r, ts: Date.now() }); saveData(); draw();
      }, 500);
    };
    draw();
  },
});

/* ============================ BOOT ============================ */
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    MH.$('boot').classList.add('hide');
    setTimeout(() => MH.$('boot').remove(), 450);
    route();
  }, 500);
});
