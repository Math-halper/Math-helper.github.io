/* proton app module: terminal — edit this file to change this app.
 * Loaded by index.html; calls registerApp() (see apps/README.md). */
'use strict';

/* ============================ TERMINAL ============================ */
registerApp({
  id: 'terminal', name: 'Terminal', icon: 'terminal', cat: 'Learn', desc: 'A friendly fake shell that can drive the desktop', w: 820, h: 520,
  render(body) {
    body.innerHTML = `<div class="term" id="t-out"></div>`;
    const out = body.querySelector('#t-out');
    const print = (s = '') => { out.insertAdjacentHTML('beforeend', MH.esc(s) + '\n'); out.scrollTop = out.scrollHeight; };
    print('proton terminal — type "help" and press Enter.');
    print(`Signed in as ${currentUser.username} on this device. Everything here is a simulation: no real shell, no network.`);
    function prompt() {
      out.insertAdjacentHTML('beforeend', `<span style="color:#ffffff">${MH.esc(currentUser.username)}@proton</span>:~$ <input id="t-in" autocomplete="off" spellcheck="false">\n`);
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
        case 'help': print('Commands:\n  help                 this list\n  apps                 list every app\n  open <app-id>        open an app (e.g. open notes)\n  whoami / date / echo <text>\n  math <expression>    e.g. math 12*8+sqrt(81)\n  solve a b c          solve a·x+b=c  →  solve 2 3 11\n  wallpaper <name>     mint|ocean|sunset|grape|slate|rose\n  accent <hex>         e.g. accent #ffffff\n  notes                how many notes you have\n  clear                clear the terminal\n  about                about this OS'); break;
        case 'apps': print(Object.values(APPS).map((a) => `  ${a.id.padEnd(14)} ${iconNameFrom(a.icon)} - ${a.name}`).join('\n')); break;
        case 'open': { const a = APPS[arg.toLowerCase()]; a ? (print(`Opening ${a.name}…`), openApp(a.id)) : print(`No app called "${arg}". Try: apps`); break; }
        case 'whoami': print(`${currentUser.username} — ${currentUser.displayName} (account created ${new Date(currentUser.createdAt).toLocaleString()}, stored only in this browser)`); break;
        case 'date': print(new Date().toString()); break;
        case 'echo': print(arg); break;
        case 'math': try { print(`${arg} = ${fmtNum(evalMath(arg))}`); } catch (err) { print('Error: ' + err.message); } break;
        case 'solve': { const [a, b, c] = rest.map(Number); print(a ? `x = ${fmtNum((c - b) / a)}` : 'a cannot be 0'); break; }
        case 'wallpaper': if (['mint', 'ocean', 'sunset', 'grape', 'slate', 'rose'].includes(arg)) { userData.settings.wallpaper = arg; saveData(); document.querySelector('.wallpaper').className = 'wallpaper wp-' + arg; print('Wallpaper set to ' + arg); } else print('Unknown wallpaper.'); break;
        case 'accent': if (ACCENTS[arg]) { userData.settings.accent = arg; saveData(); applyAccent(); print('Accent set.'); } else print('Try one of: ' + Object.keys(ACCENTS).join(' ')); break;
        case 'notes': print(`You have ${userData.notes.length} note(s), ${userData.files.length} file(s), ${userData.events.length} event(s) — all saved on this device.`); break;
        case 'about': print('proton — static clone/rebrand of Mixt (proton-arcade/mlp @ arena/170861f7-mlp), AGPL-3.0-only.'); break;
        case 'clear': out.innerHTML = ''; break;
        case 'sudo': print('Nice try - you already own this whole (browser) computer.'); break;
        default: print(`Unknown command "${cmd}" — type "help".`);
      }
      done();
    }
    prompt();
  },
});
