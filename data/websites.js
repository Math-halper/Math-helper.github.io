/*
Website catalog — this ONE file controls which built-in websites proton has,
exactly like data/applications.js controls the apps. Copy the template below
for each website, in the order you want them on the Browser home page and in
the Browser's "Built-in websites…" menu. Nothing else needs editing: name,
location (path), icon and description all live here.

  - Add a site:    copy the template block below (and the site's folder,
                   e.g. websites/my-site/site.html).
  - Remove a site: delete its block (or set enabled=false to keep the
                   block but hide the site).
  - icon= is a name from assets/icons.js (globe, book, flask, …).
  - The page itself lives in websites/<folder>/site.html; it is an ordinary
    standalone HTML page that the Browser loads in a frame at proton://<id>.
    From its script the desktop is reachable as window.parent.__protonSiteCtx
    (.openApp / .showSite / .showHome / .loadExternal).

This catalog is currently EMPTY: every built-in website was removed together
with the non-system apps. The Browser still works — it visits any address
typed into its bar and opens HTML files from the virtual file system — its
home page just has no built-in sites to list. Add one [website] block below
(and the page it points at) to bring a built-in site back.

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

`;
