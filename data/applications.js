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
desc=Virtual drive: folders & text files saved per account
w=880
h=560

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
desc=Address book saved on this device
w=820
h=520

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
id=math
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
desc=A friendly fake shell that can drive the desktop
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
cat=Chat & Media
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
desc=TEST APP: click counter that saves — the template for new apps
w=560
h=430

[application]
id=speed-test
name=Speed Test
path=apps/speed-test/app.html
icon=zap
cat=Test
desc=TEST APP: reaction timer & device benchmark, best scores saved
w=620
h=500

[application]
id=storage-test
name=Storage Test
path=apps/storage-test/app.html
icon=database
cat=Test
desc=TEST APP: verify saving works & see this account’s storage use
w=620
h=480

`;
