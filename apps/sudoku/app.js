/* proton app module: sudoku — edit this file to change this app.
 * Loaded by index.html; calls registerApp() (see apps/README.md). */
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
