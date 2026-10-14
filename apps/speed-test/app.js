/* proton TEST app: Speed Test — reaction timer + a tiny local benchmark.
 * Everything is measured on this device; nothing is uploaded. */
'use strict';

registerApp({
  id: 'speed-test', name: 'Speed Test', icon: 'zap', cat: 'Test', desc: 'TEST APP: reaction timer & device benchmark, best scores saved', w: 620, h: 500,
  render(body) {
    userData.games.speedTest ||= { best: null, runs: [] };
    const state = userData.games.speedTest;
    let phase = 'idle', startedAt = 0, timer = null; // idle | waiting | ready
    body.innerHTML = `${bar('Speed Test')}<div class="app-main pad">
      <div class="card" style="text-align:center">
        <h3 style="margin-top:0">Reaction timer</h3>
        <button id="st-pad" class="btn" style="width:100%;min-height:110px;font-size:19px">Click to start, then wait for the pad to turn white</button>
        <p id="st-result" class="muted">${state.best ? 'Best so far: ' + state.best + ' ms' : 'No attempts yet.'}</p></div>
      <div class="card" style="margin-top:12px;text-align:center">
        <h3 style="margin-top:0">Device benchmark</h3>
        <p class="muted">Runs a million maths operations locally and times them.</p>
        <button class="btn primary" id="st-bench">Run benchmark</button>
        <p id="st-bench-out" style="min-height:1.4em"></p></div>
      <div class="card" style="margin-top:12px"><b>Recent runs</b><div id="st-runs" class="muted"></div></div></div>`;
    const pad = body.querySelector('#st-pad');
    const drawRuns = () => {
      body.querySelector('#st-runs').innerHTML = state.runs.length
        ? state.runs.slice(-6).reverse().map((r) => `${new Date(r.at).toLocaleTimeString()} — reaction ${r.ms} ms${r.bench ? ` · benchmark ${r.bench} ms` : ''}`).join('<br>')
        : 'Nothing yet — try the timer!';
    };
    drawRuns();
    const setPad = (text, bg, fg = '#ffffff') => { pad.textContent = text; pad.style.background = bg; pad.style.color = fg; };
    pad.onclick = () => {
      if (phase === 'idle') {
        phase = 'waiting'; setPad('Wait for it...', '#2b2b2b');
        timer = setTimeout(() => { phase = 'ready'; startedAt = performance.now(); setPad('CLICK!', '#ffffff', '#000000'); }, 900 + Math.random() * 2200);
      } else if (phase === 'waiting') {
        clearTimeout(timer); phase = 'idle'; setPad('Too soon! Click to try again', '#161616');
      } else if (phase === 'ready') {
        const ms = Math.round(performance.now() - startedAt);
        phase = 'idle'; setPad(`${ms} ms — click to try again`, '#161616');
        if (!state.best || ms < state.best) { state.best = ms; MH.toast(`New best: ${ms} ms!`); }
        state.runs.push({ at: Date.now(), ms }); saveData();
        body.querySelector('#st-result').textContent = 'Best so far: ' + state.best + ' ms';
        drawRuns();
      }
    };
    body.querySelector('#st-bench').onclick = () => {
      const out = body.querySelector('#st-bench-out');
      out.textContent = 'Running…';
      setTimeout(() => {
        const t0 = performance.now();
        let acc = 0;
        for (let i = 0; i < 1_000_000; i++) acc += Math.sqrt(i % 997) * Math.sin(i % 89);
        const ms = Math.round(performance.now() - t0);
        out.innerHTML = `1,000,000 operations in <b>${ms} ms</b> <span class="muted">(checksum ${acc.toFixed(2)} — ignore it, it stops the browser cheating)</span>`;
        state.runs.push({ at: Date.now(), ms: state.best ?? 0, bench: ms }); saveData(); drawRuns();
      }, 30);
    };
  },
});
