/*
Application catalog — this ONE file controls which apps proton has.
Copy the template below for each application, in the order you want them
in the proton menu. Nothing else needs editing: name, location (path),
icon, category, description and default window size all live here.

  - Add an app:    copy the template block below (and the app's folder).
  - Remove an app: delete its block (or set enabled=false to keep the
                   block but hide the app).
  - icon= is a name from assets/icons.js (folder, globe, star, zap, …).
  - cat= is the menu category (invent your own if you like).
  - w= / h= are the starting window size in pixels.
  - The app itself still lives in apps/<folder>/app.html; its render()
    code runs from there (apps/_template is the starting point).

Template:
[application]
id=
name=
path=apps/my-app/app.html
icon=grid
cat=Productivity
desc=
w=720
h=480
enabled=true
*/

window.PROTON_APPLICATIONS_TEXT = `

[application]
id=files
name=Files
path=apps/files/app.html
icon=folder
cat=Productivity
desc=Real file system: browse / and every file, edit yours under /home
w=920
h=600

[application]
id=notes
name=Notes
path=apps/notes/app.html
icon=file-text
cat=Productivity
desc=Rich-text notes, autosaved on this device
w=900
h=570

[application]
id=calendar
name=Calendar
path=apps/calendar/app.html
icon=calendar
cat=Productivity
desc=Month view with events saved per account
w=920
h=580

[application]
id=contacts
name=Contacts
path=apps/contacts/app.html
icon=users
cat=Productivity
desc=Address book saved per account
w=880
h=560

[application]
id=appcenter
name=App Center
path=apps/app-center/app.html
icon=grid
cat=System
desc=Manage the built-in apps and any saved apps or websites on this account
w=980
h=640

[application]
id=customize
name=Customize
path=apps/customize/app.html
icon=sliders
cat=System
desc=Remove & edit apps, themes, wallpapers and desktop parts
w=1020
h=660

[application]
id=settings
name=Settings
path=apps/settings/app.html
icon=settings
cat=System
desc=Account, wallpaper, backups and this device
w=880
h=600

[application]
id=about
name=About
path=apps/about/app.html
icon=info
cat=System
desc=What this is, credits and how saving works
w=720
h=540

[application]
id=calculator
name=Calculator
path=apps/calculator/app.html
icon=calculator
cat=Learn
desc=Calculator, equation solver, graph plotter & formulas
w=880
h=600

[application]
id=spreadsheet
name=Spreadsheet
path=apps/spreadsheet/app.html
icon=table
cat=Productivity
desc=Grid with formulas (=SUM, =AVERAGE…), saved per account
w=960
h=600

[application]
id=presentation
name=Presentation
path=apps/presentation/app.html
icon=presentation
cat=Create
desc=Slides with a present mode, saved per account
w=920
h=580

[application]
id=whiteboard
name=Whiteboard
path=apps/whiteboard/app.html
icon=palette
cat=Create
desc=Draw with pen, shapes & text — boards autosave
w=940
h=600

[application]
id=logic-sim
name=Logic Sim
path=apps/logic-sim/app.html
icon=zap
cat=Create
desc=Design & simulate digital logic circuits — a web edition of Digital Logic Sim
w=1080
h=680

[application]
id=terminal
name=Terminal
path=apps/terminal/app.html
icon=terminal
cat=Learn
desc=Real shell over the / file system: ls, cd, cat, tree, grep and more
w=820
h=520

[application]
id=browser
name=Browser
path=apps/browser/app.html
icon=globe
cat=Learn
desc=Built-in websites (each in websites/<name>/site.html) + your saved sites
w=940
h=600

[application]
id=media
name=Media
path=apps/media/app.html
icon=film
cat=Media
desc=Play MP4 video & MP3 audio from this computer
w=900
h=580

[application]
id=pdf
name=PDF Viewer
path=apps/pdf-viewer/app.html
icon=file-text
cat=Productivity
desc=Open & read PDFs from this computer (browser viewer)
w=900
h=600

[application]
id=sudoku
name=Sudoku
path=apps/sudoku/app.html
icon=hash
cat=Games
desc=Generated puzzles, 3 difficulties, progress saved
w=620
h=660

[application]
id=chess
name=Chess
path=apps/chess/app.html
icon=knight
cat=Games
desc=Play vs the computer or a friend on this device
w=640
h=700

[application]
id=checkers
name=Checkers
path=apps/checkers/app.html
icon=disc
cat=Games
desc=Red vs Black — jump to capture, reach the end to king
w=620
h=680

[application]
id=klondike
name=Klondike
path=apps/klondike/app.html
icon=layers
cat=Games
desc=Classic solitaire — click to select & move cards
w=960
h=620

[application]
id=backgammon
name=Backgammon
path=apps/backgammon/app.html
icon=dice
cat=Games
desc=Practice board: dice, moves, hits & bearing off
w=940
h=640

[application]
id=hello-test
name=Hello Test
path=apps/hello-test/app.html
icon=smile
cat=Test
desc=TEST APP: the smallest possible proton app — copy it to make your own
w=560
h=480

[application]
id=speed-test
name=Speed Test
path=apps/speed-test/app.html
icon=zap
cat=Test
desc=TEST APP: reaction timer & a tiny local device benchmark
w=760
h=560

[application]
id=storage-test
name=Storage Test
path=apps/storage-test/app.html
icon=database
cat=Test
desc=TEST APP: check saving works & see how much space this account uses
w=820
h=580

/*
Streamed arcade games.

These nineteen apps are the one place proton runs something that is not in this
repository. Each apps/<id>/app.html is a thin module that asks the shared host
(assets/game-host.js) to frame that title's build live from Proton Arcade,
https://proton-arcade.github.io — nothing is downloaded, proxied, cached or
stored here, and no game bytes are ever committed to this repo.

They are remote because the builds are enormous: each is a single
self-contained .html file with its whole payload inlined, five of them run
20-56 MB, and the set totals roughly half a gigabyte. Vendoring them would put
that weight in every clone, every Pages deploy and every version in git
history forever — and GitHub rejects single files over 100 MB outright.

Adding one: drop an apps/<id>/app.html that calls PROTON_ARCADE.open() with
the build's path, and add a block here. Provenance for every title, and what
streaming does and does not mean for them, is in CREDITS.md.
*/

[application]
id=ampler-launcher
name=Ampler Launcher
path=apps/ampler-launcher/app.html
icon=grid3
cat=Games
desc=Browser Minecraft launcher — pick a version and play
w=1280
h=800

[application]
id=fnaf-1
name=FNAF
path=apps/fnaf-1/app.html
icon=moon
cat=Games
desc=Survive five nights on the cameras at Freddy Fazbear's Pizza
w=1180
h=740

[application]
id=fnaf-2
name=FNAF 2
path=apps/fnaf-2/app.html
icon=monitor
cat=Games
desc=Night shift again — more animatronics, and no doors
w=1180
h=740

[application]
id=fnaf-3
name=FNAF 3
path=apps/fnaf-3/app.html
icon=video
cat=Games
desc=Thirty years later, at Fazbear's Fright horror attraction
w=1180
h=740

[application]
id=fnaf-4
name=FNAF 4
path=apps/fnaf-4/app.html
icon=lock
cat=Games
desc=The last chapter — hold your room until 6 AM
w=1180
h=740

[application]
id=fnaf-sister-location
name=FNAF: Sister Location
path=apps/fnaf-sister-location/app.html
icon=key
cat=Games
desc=Late-night technician at Circus Baby's Pizza World
w=1180
h=740

[application]
id=spacebar-clicker
name=Spacebar Clicker
path=apps/spacebar-clicker/app.html
icon=chart
cat=Games
desc=Hit the spacebar, buy upgrades, let it click itself
w=900
h=660

[application]
id=baldis-basics
name=Baldi's Basics
path=apps/baldis-basics/app.html
icon=book
cat=Games
desc=Placeholder — Proton Arcade has no build for it yet
w=1000
h=700

[application]
id=kart-bros
name=Kart Bros
path=apps/kart-bros/app.html
icon=compass
cat=Games
desc=Kart racing — drift the tight corners to take first
w=1180
h=740

[application]
id=retro-bowl
name=Retro Bowl
path=apps/retro-bowl/app.html
icon=trophy
cat=Games
desc=Retro football management: passes, plays and roster
w=1100
h=720

[application]
id=pac-man
name=Pac-Man
path=apps/pac-man/app.html
icon=atom
cat=Games
desc=Eat every dot, dodge Blinky, Pinky, Inky and Clyde
w=900
h=720

[application]
id=football-bros
name=Football Bros
path=apps/football-bros/app.html
icon=shield
cat=Games
desc=Physics football — grab, run and dive for the end zone
w=1180
h=740

[application]
id=geometry-dash-lite
name=Geometry Dash Lite
path=apps/geometry-dash-lite/app.html
icon=music
cat=Games
desc=Rhythm platformer — jump and fly your way to the beat
w=1180
h=740

[application]
id=backrooms
name=Backrooms
path=apps/backrooms/app.html
icon=search
cat=Games
desc=Wander the endless yellow rooms and find a way out
w=1200
h=760

[application]
id=flappy-bird
name=Flappy Bird
path=apps/flappy-bird/app.html
icon=star
cat=Games
desc=One button: flap through an endless run of pipes
w=820
h=700

[application]
id=drift-boss
name=Drift Boss
path=apps/drift-boss/app.html
icon=pin
cat=Games
desc=One-button drifting — keep the car on the road
w=1000
h=720

[application]
id=bloxorz
name=Bloxorz
path=apps/bloxorz/app.html
icon=landmark
cat=Games
desc=Roll the block into the goal hole without falling off
w=1000
h=720

[application]
id=minesweeper
name=Minesweeper
path=apps/minesweeper/app.html
icon=sigma
cat=Games
desc=Clear the field — the numbers say where the mines are
w=820
h=680

[application]
id=granny
name=Granny
path=apps/granny/app.html
icon=home
cat=Games
desc=Escape the house before Granny finds you
w=1200
h=760

`;
