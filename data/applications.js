/*
Application catalog — this ONE file controls which apps proton has.
Copy the template below for each application, in the order you want them
in the proton menu. Nothing else needs editing: name, location (path),
icon, category, description and default window size all live here.

  - Add an app:    copy the template block below (and the app's folder).
  - Remove an app: delete its block (or set enabled=false to keep the
                   block but hide the app).
  - icon= is either a named SVG icon, or a local raster path such as
    data/icons/my-app.png. Place path-based icons under data/icons/.
  - svg-icon=true means icon= is a named inline SVG icon; use
    svg-icon=false when icon= is a local image path. Known icon names are
    auto-detected for compatibility with older catalog blocks.
  - cat= is the menu category (invent your own if you like).
  - w= / h= are the starting window size in pixels.
  - streamed=true loads a remote app's tiny module on first launch instead
    of fetching it during desktop boot (assets/html-loader.js).
  - The app itself still lives in apps/<folder>/app.html; its render()
    code runs from there (apps/_template is the starting point).

proton ships the five core System apps plus one embedded game page:
Celeste Classic. Its app folder contains only an iframe wrapper for the
existing GitHub Pages site; no game files or assets are copied into this
repository.

Template (named SVG; for an image use `icon=data/icons/my-app.png` and
`svg-icon=false` instead):
[application]
id=
name=
path=apps/my-app/app.html
icon=grid
svg-icon=true
cat=Productivity
desc=
w=720
h=480
enabled=true
*/

window.PROTON_APPLICATIONS_TEXT = `

[application]
id=appcenter
name=App Center
path=apps/app-center/app.html
icon=grid
svg-icon=true
cat=System
desc=Manage the built-in apps and any saved apps or websites on this account
w=980
h=640

[application]
id=customize
name=Customize
path=apps/customize/app.html
icon=sliders
svg-icon=true
cat=System
desc=Remove & edit apps, themes, wallpapers and desktop parts
w=1020
h=660

[application]
id=settings
name=Settings
path=apps/settings/app.html
icon=settings
svg-icon=true
cat=System
desc=Account, wallpaper, backups and this device
w=880
h=600

[application]
id=about
name=About
path=apps/about/app.html
icon=info
svg-icon=true
cat=System
desc=What this is, credits and how saving works
w=720
h=540

[application]
id=browser
name=Browser
path=apps/browser/app.html
icon=globe
svg-icon=true
cat=System
desc=Visit web addresses and any built-in websites from data/websites.js
w=940
h=600

[application]
id=celeste-classic
name=Celeste Classic
path=apps/celeste-classic/app.html
icon=play
svg-icon=true
cat=System
desc=Play Celeste Classic from Math-halper's GitHub Pages site
w=980
h=640

/* TEMPLATE — an app that is only an embedded page. Copy apps/_embed/,
   rename it, change the EMBED_URL constant in its app.html, then
   uncomment a block like this one (and delete these lines):

[application]
id=my-embed
name=My Embed
path=apps/my-embed/app.html
icon=globe
svg-icon=true
cat=System
desc=Frames https://example.com in a window
w=980
h=640

*/

`;
