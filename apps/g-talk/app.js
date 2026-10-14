/* proton app module: g-talk — edit this file to change this app.
 * Loaded by index.html; calls registerApp() (see apps/README.md). */
'use strict';

/* ============================ G-TALK ============================ */
registerApp({
  id: 'gtalk', name: 'G-Talk', icon: 'phone', cat: 'Chat & Media', desc: 'Direct chat with Nova (calls are simulated on-device)', w: 760, h: 540,
  render(body) {
    if (!userData.chat.direct) { userData.chat.direct = [{ id: MH.uid(), who: 'Nova', me: false, text: 'This is our direct line. Team Chat has the group channels — here it\'s just us. Ask me maths!', ts: Date.now() }]; saveData(); }
    body.innerHTML = `${bar('G-Talk — Nova', `<span class="chip"><span class="pdot" style="background:#68b723"></span> on this device</span><button class="btn sm" id="gt-call">${iconSvg('video')} Video call</button>`)}
    <div style="display:flex;flex-direction:column;min-height:0;flex:1"><div class="chat-msgs" id="gt-msgs"></div>
    <form id="gt-form" style="display:flex;gap:7px;padding:10px;background:#111;border-top:1px solid var(--line)"><input id="gt-in" style="flex:1;padding:9px 11px" placeholder="Message Nova…" maxlength="500" autocomplete="off"><button class="btn primary">Send</button></form></div>`;
    const box = body.querySelector('#gt-msgs');
    const draw = () => { box.innerHTML = userData.chat.direct.map((m) => `<div class="bubble ${m.me ? 'me' : ''}"><small>${m.me ? 'You' : 'Nova'} · ${new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>${MH.esc(m.text)}</div>`).join(''); box.scrollTop = box.scrollHeight; };
    body.querySelector('#gt-call').onclick = () => MH.toast('Simulated call: real video needs a server, so Nova says hello from this browser instead.');
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
