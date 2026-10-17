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
  - icon= is either a named SVG icon or a local raster path under data/icons/.
  - svg-icon=true means icon= is a named inline SVG; use false for an image path.
  - The page itself still lives in websites/<folder>/site.html; it is an
    ordinary standalone HTML page that the Browser loads in a frame at
    proton://<id>.
  - Re-run python3 tools/gen-fs-manifest.py after adding or removing a page.

This build ships its System apps only, so the built-in websites were removed
with them; **Test Page** is the one site left, and it is the built-in smoke
test for the Browser (proton://test-page). An empty catalog is fine — the
Browser's home page then says there are no built-in sites. Guide:
websites/README.md.

Template:
[website]
id=
name=
path=websites/my-site/site.html
icon=globe
svg-icon=true
desc=
enabled=true
*/

window.PROTON_WEBSITES_TEXT = `

[website]
id=test-page
name=Test Page
path=websites/test-page/site.html
icon=flask
svg-icon=true
desc=TEST SITE: automated checks plus buttons, forms, clock, counter, canvas and storage to try the Browser with

/* TEMPLATE — a site that is only an embedded page. Copy websites/_embed/,
   rename it, change the EMBED_URL constant in its index.html, then
   uncomment a block like this one (and delete these lines):

[website]
id=my-embed
name=My Embed
path=websites/my-embed/index.html
icon=globe
svg-icon=true
desc=Frames https://example.com

*/

`;
