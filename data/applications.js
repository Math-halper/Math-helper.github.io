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
  - streamed=true loads a remote game's tiny module on first launch instead
    of fetching it during desktop boot (use only for streamed-game modules).
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
id=text-editor
name=Text Editor
path=apps/text-editor/app.html
icon=file-text
cat=Productivity
desc=Edit text files from Files or the Terminal; system files open read-only
w=900
h=620

[application]
id=image-viewer
name=Image Viewer
path=apps/image-viewer/app.html
icon=image
cat=Media
desc=View images stored in Files, including SVG and photos
w=900
h=620

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
icon=game-sudoku
cat=Games
desc=Generated puzzles, 3 difficulties, progress saved
w=620
h=660

[application]
id=chess
name=Chess
path=apps/chess/app.html
icon=game-chess
cat=Games
desc=Play vs the computer or a friend on this device
w=640
h=700

[application]
id=checkers
name=Checkers
path=apps/checkers/app.html
icon=game-checkers
cat=Games
desc=Red vs Black — jump to capture, reach the end to king
w=620
h=680

[application]
id=klondike
name=Klondike
path=apps/klondike/app.html
icon=game-klondike
cat=Games
desc=Classic solitaire — click to select & move cards
w=960
h=620

[application]
id=backgammon
name=Backgammon
path=apps/backgammon/app.html
icon=game-backgammon
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
icon=game-ampler-launcher
cat=Games
streamed=true
desc=Browser Minecraft launcher — pick a version and play
w=1280
h=800

[application]
id=fnaf-1
name=FNAF
path=apps/fnaf-1/app.html
icon=game-fnaf-1
cat=Games
streamed=true
desc=Survive five nights on the cameras at Freddy Fazbear's Pizza
w=1180
h=740

[application]
id=fnaf-2
name=FNAF 2
path=apps/fnaf-2/app.html
icon=game-fnaf-2
cat=Games
streamed=true
desc=Night shift again — more animatronics, and no doors
w=1180
h=740

[application]
id=fnaf-3
name=FNAF 3
path=apps/fnaf-3/app.html
icon=game-fnaf-3
cat=Games
streamed=true
desc=Thirty years later, at Fazbear's Fright horror attraction
w=1180
h=740

[application]
id=fnaf-4
name=FNAF 4
path=apps/fnaf-4/app.html
icon=game-fnaf-4
cat=Games
streamed=true
desc=The last chapter — hold your room until 6 AM
w=1180
h=740

[application]
id=fnaf-sister-location
name=FNAF: Sister Location
path=apps/fnaf-sister-location/app.html
icon=game-fnaf-sister-location
cat=Games
streamed=true
desc=Late-night technician at Circus Baby's Pizza World
w=1180
h=740

[application]
id=spacebar-clicker
name=Spacebar Clicker
path=apps/spacebar-clicker/app.html
icon=game-spacebar-clicker
cat=Games
streamed=true
desc=Hit the spacebar, buy upgrades, let it click itself
w=900
h=660

[application]
id=baldis-basics
name=Baldi's Basics
path=apps/baldis-basics/app.html
icon=game-baldis-basics
cat=Games
streamed=true
desc=Placeholder — Proton Arcade has no build for it yet
w=1000
h=700

[application]
id=kart-bros
name=Kart Bros
path=apps/kart-bros/app.html
icon=game-kart-bros
cat=Games
streamed=true
desc=Kart racing — drift the tight corners to take first
w=1180
h=740

[application]
id=retro-bowl
name=Retro Bowl
path=apps/retro-bowl/app.html
icon=game-retro-bowl
cat=Games
streamed=true
desc=Retro football management: passes, plays and roster
w=1100
h=720

[application]
id=pac-man
name=Pac-Man
path=apps/pac-man/app.html
icon=game-pac-man
cat=Games
streamed=true
desc=Eat every dot, dodge Blinky, Pinky, Inky and Clyde
w=900
h=720

[application]
id=football-bros
name=Football Bros
path=apps/football-bros/app.html
icon=game-football-bros
cat=Games
streamed=true
desc=Physics football — grab, run and dive for the end zone
w=1180
h=740

[application]
id=geometry-dash-lite
name=Geometry Dash Lite
path=apps/geometry-dash-lite/app.html
icon=game-geometry-dash-lite
cat=Games
streamed=true
desc=Rhythm platformer — jump and fly your way to the beat
w=1180
h=740

[application]
id=backrooms
name=Backrooms
path=apps/backrooms/app.html
icon=game-backrooms
cat=Games
streamed=true
desc=Wander the endless yellow rooms and find a way out
w=1200
h=760

[application]
id=flappy-bird
name=Flappy Bird
path=apps/flappy-bird/app.html
icon=game-flappy-bird
cat=Games
streamed=true
desc=One button: flap through an endless run of pipes
w=820
h=700

[application]
id=drift-boss
name=Drift Boss
path=apps/drift-boss/app.html
icon=game-drift-boss
cat=Games
streamed=true
desc=One-button drifting — keep the car on the road
w=1000
h=720

[application]
id=bloxorz
name=Bloxorz
path=apps/bloxorz/app.html
icon=game-bloxorz
cat=Games
streamed=true
desc=Roll the block into the goal hole without falling off
w=1000
h=720

[application]
id=minesweeper
name=Minesweeper
path=apps/minesweeper/app.html
icon=game-minesweeper
cat=Games
streamed=true
desc=Clear the field — the numbers say where the mines are
w=820
h=680

[application]
id=granny
name=Granny
path=apps/granny/app.html
icon=game-granny
cat=Games
streamed=true
desc=Escape the house before Granny finds you
w=1200
h=760


/*
Gams Offline games: cataloged from Gams-Offline/Gams (main @ b75cc91).
These 68 titles are NOT vendored: their modules frame the public GitHub Pages
builds live. Spacebar Clicker, Bloxorz and Pac-Man were already here.
Tools (Code Editor / Ruffle / Web Retro) and About are not games. See CREDITS.md.
*/

[application]
id=gams-stickman-hook
name=Stickman Hook
path=apps/gams-stickman-hook/app.html
icon=game-gams-stickman-hook
cat=Games
streamed=true
desc=Browser game from Gams Offline (streams live; internet required)
w=1000
h=720

[application]
id=gams-drive-mad
name=Drive Mad
path=apps/gams-drive-mad/app.html
icon=game-gams-drive-mad
cat=Games
streamed=true
desc=Browser game from Gams Offline (streams live; internet required)
w=1000
h=720

[application]
id=gams-2048
name=2048
path=apps/gams-2048/app.html
icon=game-gams-2048
cat=Games
streamed=true
desc=Browser game from Gams Offline (streams live; internet required)
w=790
h=720

[application]
id=gams-cookie-clicker
name=Cookie Clicker
path=apps/gams-cookie-clicker/app.html
icon=game-gams-cookie-clicker
cat=Games
streamed=true
desc=Browser game from Gams Offline (streams live; internet required)
w=1000
h=720

[application]
id=gams-cube-field
name=Cube Field
path=apps/gams-cube-field/app.html
icon=game-gams-cube-field
cat=Games
streamed=true
desc=Browser game from Gams Offline (streams live; internet required)
w=1000
h=720

[application]
id=gams-offline-paradise
name=Offline Paradise
path=apps/gams-offline-paradise/app.html
icon=game-gams-offline-paradise
cat=Games
streamed=true
desc=Browser game from Gams Offline (streams live; internet required)
w=1000
h=720

[application]
id=gams-sand-game
name=Sand Game
path=apps/gams-sand-game/app.html
icon=game-gams-sand-game
cat=Games
streamed=true
desc=Browser game from Gams Offline (streams live; internet required)
w=1000
h=720

[application]
id=gams-agario-lite
name=Agar.io Lite
path=apps/gams-agario-lite/app.html
icon=game-gams-agario-lite
cat=Games
streamed=true
desc=Browser game from Gams Offline (streams live; internet required)
w=1000
h=720

[application]
id=gams-evil-glitch
name=Evil Glitch
path=apps/gams-evil-glitch/app.html
icon=game-gams-evil-glitch
cat=Games
streamed=true
desc=Browser game from Gams Offline (streams live; internet required)
w=1000
h=720

[application]
id=gams-its-raining-boxes
name=It's Raining Boxes
path=apps/gams-its-raining-boxes/app.html
icon=game-gams-its-raining-boxes
cat=Games
streamed=true
desc=Browser game from Gams Offline (streams live; internet required)
w=1000
h=720

[application]
id=gams-t-rex
name=T-Rex
path=apps/gams-t-rex/app.html
icon=game-gams-t-rex
cat=Games
streamed=true
desc=Browser game from Gams Offline (streams live; internet required)
w=1000
h=720

[application]
id=gams-stack
name=Stack
path=apps/gams-stack/app.html
icon=game-gams-stack
cat=Games
streamed=true
desc=Browser game from Gams Offline (streams live; internet required)
w=1000
h=720

[application]
id=gams-rolling-forests
name=Rolling Forests
path=apps/gams-rolling-forests/app.html
icon=game-gams-rolling-forests
cat=Games
streamed=true
desc=Browser game from Gams Offline (streams live; internet required)
w=1000
h=720

[application]
id=gams-radius-raid
name=Radius Raid
path=apps/gams-radius-raid/app.html
icon=game-gams-radius-raid
cat=Games
streamed=true
desc=Browser game from Gams Offline (streams live; internet required)
w=1000
h=720

[application]
id=gams-mountain-maze
name=Mountain Maze
path=apps/gams-mountain-maze/app.html
icon=game-gams-mountain-maze
cat=Games
streamed=true
desc=Browser game from Gams Offline (streams live; internet required)
w=1000
h=720

[application]
id=gams-fluid-simulator
name=Fluid Simulator
path=apps/gams-fluid-simulator/app.html
icon=game-gams-fluid-simulator
cat=Games
streamed=true
desc=Browser game from Gams Offline (streams live; internet required)
w=1000
h=720

[application]
id=gams-edge-not-found
name=Edge Not Found
path=apps/gams-edge-not-found/app.html
icon=game-gams-edge-not-found
cat=Games
streamed=true
desc=Browser game from Gams Offline (streams live; internet required)
w=1000
h=720

[application]
id=gams-ninja-vs-evilcorp
name=Ninja vs EVILCORP
path=apps/gams-ninja-vs-evilcorp/app.html
icon=game-gams-ninja-vs-evilcorp
cat=Games
streamed=true
desc=Browser game from Gams Offline (streams live; internet required)
w=1000
h=720

[application]
id=gams-geometry-dash
name=Geometry Dash
path=apps/gams-geometry-dash/app.html
icon=game-gams-geometry-dash
cat=Games
streamed=true
desc=Browser game from Gams Offline (streams live; internet required)
w=1000
h=720

[application]
id=gams-wordle
name=Wordle
path=apps/gams-wordle/app.html
icon=game-gams-wordle
cat=Games
streamed=true
desc=Browser game from Gams Offline (streams live; internet required)
w=790
h=720

[application]
id=gams-paper-io-2
name=Paper.io 2
path=apps/gams-paper-io-2/app.html
icon=game-gams-paper-io-2
cat=Games
streamed=true
desc=Browser game from Gams Offline (streams live; internet required)
w=1000
h=720

[application]
id=gams-slope
name=Slope
path=apps/gams-slope/app.html
icon=game-gams-slope
cat=Games
streamed=true
desc=3D/Unity game from Gams Offline (streams live; internet required)
w=1200
h=760

[application]
id=gams-burrito-bison
name=Burrito Bison
path=apps/gams-burrito-bison/app.html
icon=game-gams-burrito-bison
cat=Games
streamed=true
desc=3D/Unity game from Gams Offline (streams live; internet required)
w=1200
h=760

[application]
id=gams-tube-jumpers
name=Tube Jumpers
path=apps/gams-tube-jumpers/app.html
icon=game-gams-tube-jumpers
cat=Games
streamed=true
desc=3D/Unity game from Gams Offline (streams live; internet required)
w=1200
h=760

[application]
id=gams-hole-io
name=Hole.io
path=apps/gams-hole-io/app.html
icon=game-gams-hole-io
cat=Games
streamed=true
desc=3D/Unity game from Gams Offline (streams live; internet required)
w=1200
h=760

[application]
id=gams-madalin-stunt-cars
name=Madalin Stunt Cars
path=apps/gams-madalin-stunt-cars/app.html
icon=game-gams-madalin-stunt-cars
cat=Games
streamed=true
desc=3D/Unity game from Gams Offline (streams live; internet required)
w=1200
h=760

[application]
id=gams-glass-city
name=Glass City
path=apps/gams-glass-city/app.html
icon=game-gams-glass-city
cat=Games
streamed=true
desc=3D/Unity game from Gams Offline (streams live; internet required)
w=1200
h=760

[application]
id=gams-tunnel-rush
name=Tunnel Rush
path=apps/gams-tunnel-rush/app.html
icon=game-gams-tunnel-rush
cat=Games
streamed=true
desc=3D/Unity game from Gams Offline (streams live; internet required)
w=1200
h=760

[application]
id=gams-tanuki-sunset
name=Tanuki Sunset
path=apps/gams-tanuki-sunset/app.html
icon=game-gams-tanuki-sunset
cat=Games
streamed=true
desc=3D/Unity game from Gams Offline (streams live; internet required)
w=1200
h=760

[application]
id=gams-a-dance-of-fire-and-ice
name=A Dance of Fire and Ice
path=apps/gams-a-dance-of-fire-and-ice/app.html
icon=game-gams-a-dance-of-fire-and-ice
cat=Games
streamed=true
desc=3D/Unity game from Gams Offline (streams live; internet required)
w=1200
h=760

[application]
id=gams-game-inside-a-game
name=Game Inside a Game
path=apps/gams-game-inside-a-game/app.html
icon=game-gams-game-inside-a-game
cat=Games
streamed=true
desc=3D/Unity game from Gams Offline (streams live; internet required)
w=1200
h=760

[application]
id=gams-cell-machine
name=Cell Machine
path=apps/gams-cell-machine/app.html
icon=game-gams-cell-machine
cat=Games
streamed=true
desc=3D/Unity game from Gams Offline (streams live; internet required)
w=1200
h=760

[application]
id=gams-slope-2
name=Slope 2
path=apps/gams-slope-2/app.html
icon=game-gams-slope-2
cat=Games
streamed=true
desc=3D/Unity game from Gams Offline (streams live; internet required)
w=1200
h=760

[application]
id=gams-ai-creatures
name=Ai Creatures
path=apps/gams-ai-creatures/app.html
icon=game-gams-ai-creatures
cat=Games
streamed=true
desc=3D/Unity game from Gams Offline (streams live; internet required)
w=1200
h=760

[application]
id=gams-grey-box-testing
name=Grey Box Testing
path=apps/gams-grey-box-testing/app.html
icon=game-gams-grey-box-testing
cat=Games
streamed=true
desc=3D/Unity game from Gams Offline (streams live; internet required)
w=1200
h=760

[application]
id=gams-super-mario-64
name=Super Mario 64
path=apps/gams-super-mario-64/app.html
icon=game-gams-super-mario-64
cat=Games
streamed=true
desc=Retro game from Gams Offline (streams live; internet required)
w=1060
h=740

[application]
id=gams-celeste
name=Celeste
path=apps/gams-celeste/app.html
icon=game-gams-celeste
cat=Games
streamed=true
desc=Retro game from Gams Offline (streams live; internet required)
w=1060
h=740

[application]
id=gams-just-one-boss
name=Just One Boss
path=apps/gams-just-one-boss/app.html
icon=game-gams-just-one-boss
cat=Games
streamed=true
desc=Retro game from Gams Offline (streams live; internet required)
w=1060
h=740

[application]
id=gams-super-mario-rpg
name=Super Mario RPG
path=apps/gams-super-mario-rpg/app.html
icon=game-gams-super-mario-rpg
cat=Games
streamed=true
desc=Retro game from Gams Offline (streams live; internet required)
w=1060
h=740

[application]
id=gams-breaking-the-bank
name=Breaking The Bank
path=apps/gams-breaking-the-bank/app.html
icon=game-gams-breaking-the-bank
cat=Games
streamed=true
desc=Henry Stickmin Flash adventure via Gams Offline (internet required)
w=1100
h=740

[application]
id=gams-escaping-the-prison
name=Escaping The Prison
path=apps/gams-escaping-the-prison/app.html
icon=game-gams-escaping-the-prison
cat=Games
streamed=true
desc=Henry Stickmin Flash adventure via Gams Offline (internet required)
w=1100
h=740

[application]
id=gams-stealing-the-diamond
name=Stealing The Diamond
path=apps/gams-stealing-the-diamond/app.html
icon=game-gams-stealing-the-diamond
cat=Games
streamed=true
desc=Henry Stickmin Flash adventure via Gams Offline (internet required)
w=1100
h=740

[application]
id=gams-infiltrating-the-airship
name=Infiltrating The Airship
path=apps/gams-infiltrating-the-airship/app.html
icon=game-gams-infiltrating-the-airship
cat=Games
streamed=true
desc=Henry Stickmin Flash adventure via Gams Offline (internet required)
w=1100
h=740

[application]
id=gams-fleeing-the-complex
name=Fleeing The Complex
path=apps/gams-fleeing-the-complex/app.html
icon=game-gams-fleeing-the-complex
cat=Games
streamed=true
desc=Henry Stickmin Flash adventure via Gams Offline (internet required)
w=1100
h=740

[application]
id=gams-tetris
name=Tetris
path=apps/gams-tetris/app.html
icon=game-gams-tetris
cat=Games
streamed=true
desc=Flash game via Gams Offline and Ruffle (internet required)
w=1080
h=720

[application]
id=gams-flood-runner-4
name=Flood Runner 4
path=apps/gams-flood-runner-4/app.html
icon=game-gams-flood-runner-4
cat=Games
streamed=true
desc=Flash game via Gams Offline and Ruffle (internet required)
w=1080
h=720

[application]
id=gams-raft-wars
name=Raft Wars
path=apps/gams-raft-wars/app.html
icon=game-gams-raft-wars
cat=Games
streamed=true
desc=Flash game via Gams Offline and Ruffle (internet required)
w=1080
h=720

[application]
id=gams-raft-wars-2
name=Raft Wars 2
path=apps/gams-raft-wars-2/app.html
icon=game-gams-raft-wars-2
cat=Games
streamed=true
desc=Flash game via Gams Offline and Ruffle (internet required)
w=1080
h=720

[application]
id=gams-worlds-hardest-game
name=World's Hardest Game
path=apps/gams-worlds-hardest-game/app.html
icon=game-gams-worlds-hardest-game
cat=Games
streamed=true
desc=Flash game via Gams Offline and Ruffle (internet required)
w=1080
h=720

[application]
id=gams-the-impossible-quiz
name=The Impossible Quiz
path=apps/gams-the-impossible-quiz/app.html
icon=game-gams-the-impossible-quiz
cat=Games
streamed=true
desc=Flash game via Gams Offline and Ruffle (internet required)
w=1080
h=720

[application]
id=gams-learn-to-fly-idle
name=Learn To Fly Idle
path=apps/gams-learn-to-fly-idle/app.html
icon=game-gams-learn-to-fly-idle
cat=Games
streamed=true
desc=Flash game via Gams Offline and Ruffle (internet required)
w=1080
h=720

[application]
id=gams-learn-to-fly-1
name=Learn To Fly 1
path=apps/gams-learn-to-fly-1/app.html
icon=game-gams-learn-to-fly-1
cat=Games
streamed=true
desc=Flash game via Gams Offline and Ruffle (internet required)
w=1080
h=720

[application]
id=gams-learn-to-fly-2
name=Learn To Fly 2
path=apps/gams-learn-to-fly-2/app.html
icon=game-gams-learn-to-fly-2
cat=Games
streamed=true
desc=Flash game via Gams Offline and Ruffle (internet required)
w=1080
h=720

[application]
id=gams-learn-to-fly-3
name=Learn To Fly 3
path=apps/gams-learn-to-fly-3/app.html
icon=game-gams-learn-to-fly-3
cat=Games
streamed=true
desc=Flash game via Gams Offline and Ruffle (internet required)
w=1080
h=720

[application]
id=gams-bloons-tower-defense-1
name=Bloons Tower Defense 1
path=apps/gams-bloons-tower-defense-1/app.html
icon=game-gams-bloons-tower-defense-1
cat=Games
streamed=true
desc=Flash game via Gams Offline and Ruffle (internet required)
w=1080
h=720

[application]
id=gams-bloons-tower-defense-2
name=Bloons Tower Defense 2
path=apps/gams-bloons-tower-defense-2/app.html
icon=game-gams-bloons-tower-defense-2
cat=Games
streamed=true
desc=Flash game via Gams Offline and Ruffle (internet required)
w=1080
h=720

[application]
id=gams-bloons-tower-defense-5
name=Bloons Tower Defense 5
path=apps/gams-bloons-tower-defense-5/app.html
icon=game-gams-bloons-tower-defense-5
cat=Games
streamed=true
desc=Flash game via Gams Offline and Ruffle (internet required)
w=1080
h=720

[application]
id=gams-cat-ninja
name=Cat Ninja
path=apps/gams-cat-ninja/app.html
icon=game-gams-cat-ninja
cat=Games
streamed=true
desc=Flash game via Gams Offline and Ruffle (internet required)
w=1080
h=720

[application]
id=gams-1-on-1-soccer
name=1 on 1 Soccer
path=apps/gams-1-on-1-soccer/app.html
icon=game-gams-1-on-1-soccer
cat=Games
streamed=true
desc=Flash game via Gams Offline and Ruffle (internet required)
w=1080
h=720

[application]
id=gams-qwop
name=QWOP
path=apps/gams-qwop/app.html
icon=game-gams-qwop
cat=Games
streamed=true
desc=Flash game via Gams Offline and Ruffle (internet required)
w=1080
h=720

[application]
id=gams-use-boxmen
name=Use Boxmen
path=apps/gams-use-boxmen/app.html
icon=game-gams-use-boxmen
cat=Games
streamed=true
desc=Flash game via Gams Offline and Ruffle (internet required)
w=1080
h=720

[application]
id=gams-40x-escape
name=40x Escape
path=apps/gams-40x-escape/app.html
icon=game-gams-40x-escape
cat=Games
streamed=true
desc=Flash game via Gams Offline and Ruffle (internet required)
w=1080
h=720

[application]
id=gams-stickman-life
name=Stickman Life
path=apps/gams-stickman-life/app.html
icon=game-gams-stickman-life
cat=Games
streamed=true
desc=Flash game via Gams Offline and Ruffle (internet required)
w=1080
h=720

[application]
id=gams-duck-life-1
name=Duck Life 1
path=apps/gams-duck-life-1/app.html
icon=game-gams-duck-life-1
cat=Games
streamed=true
desc=Flash game via Gams Offline and Ruffle (internet required)
w=1080
h=720

[application]
id=gams-duck-life-2
name=Duck Life 2
path=apps/gams-duck-life-2/app.html
icon=game-gams-duck-life-2
cat=Games
streamed=true
desc=Flash game via Gams Offline and Ruffle (internet required)
w=1080
h=720

[application]
id=gams-duck-life-3
name=Duck Life 3
path=apps/gams-duck-life-3/app.html
icon=game-gams-duck-life-3
cat=Games
streamed=true
desc=Flash game via Gams Offline and Ruffle (internet required)
w=1080
h=720

[application]
id=gams-duck-life-4
name=Duck Life 4
path=apps/gams-duck-life-4/app.html
icon=game-gams-duck-life-4
cat=Games
streamed=true
desc=Flash game via Gams Offline and Ruffle (internet required)
w=1080
h=720

[application]
id=gams-duck-life-5
name=Duck Life 5
path=apps/gams-duck-life-5/app.html
icon=game-gams-duck-life-5
cat=Games
streamed=true
desc=Flash game via Gams Offline and Ruffle (internet required)
w=1080
h=720

`;
