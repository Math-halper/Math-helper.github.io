/*
Website catalog — this ONE file controls which built-in websites proton has,
exactly like data/applications.js controls the apps. Copy the template below
for each website, in the order you want them on the Browser home page and in
the Browser's "Built-in websites…" menu. Nothing else needs editing: name,
location (path), icon and description all live here.

  - Add a site:    copy the template block below (and the site's folder,
                   starting from websites/_template/).
  - Remove a site: delete its block (or set enabled=false to keep the
                   block but hide the site).
  - icon= is a name from assets/icons.js (globe, book, flask, …).
  - The page itself still lives in websites/<folder>/site.html; it is an
    ordinary standalone HTML page that the Browser loads in a frame at
    proton://<id>.

Template:
[website]
id=
name=
path=websites/my-site/site.html
icon=globe
desc=
enabled=true
*/

window.PROTON_WEBSITES_TEXT = `

[website]
id=guide
name=Guide
path=websites/guide/site.html
icon=book
desc=How this desktop works: accounts, saving, windows, backups

[website]
id=world-history
name=World History
path=websites/world-history/site.html
icon=landmark
desc=A short interactive timeline, adapted from the original bundled site

[website]
id=maths-resources
name=Maths Resources
path=websites/maths-resources/site.html
icon=sigma
desc=Formula reminders and practice ideas

[website]
id=test-page
name=Test Page
path=websites/test-page/site.html
icon=flask
desc=TEST SITE: buttons, forms, clock & counter to try the Browser with

[website]
id=proton-daily
name=proton Daily
path=websites/proton-daily/site.html
icon=newspaper
desc=TEST SITE: a sample newspaper front page (all stories fictional)

[website]
id=logic-sim
name=Digital Logic Sim
path=websites/logic-sim/site.html
icon=zap
desc=Design & simulate logic circuits, nest chips inside chips — a web edition of Sebastian Lague's Digital Logic Sim

`;
