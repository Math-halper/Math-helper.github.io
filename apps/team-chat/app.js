/* proton app module: team-chat — edit this file to change this app.
 * Loaded by index.html; calls registerApp() (see apps/README.md). */
'use strict';

/* ============================ TEAM CHAT ============================ */
registerApp({
  id: 'chat', name: 'Team Chat', icon: '💬', cat: 'Chat & Media', desc: 'Channels with helper Nova — saved on this device', w: 880, h: 560,
  render(body) {
    let channel = 'general';
    body.innerHTML = `${bar('Team Chat')}<div class="split" style="grid-template-columns:190px 1fr">
    <aside class="side">${Object.keys(userData.chat).map((c) => `<button class="rowitem" data-ch="${c}"># ${c}</button>`).join('')}
      <div class="pad muted">Nova the helper bot lives in this browser. Ask maths questions here!</div></aside>
    <div style="display:flex;flex-direction:column;min-height:0"><div class="chat-msgs" id="ch-msgs"></div>
      <form id="ch-form" style="display:flex;gap:7px;padding:10px;background:#111;border-top:1px solid var(--line)">
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
